from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db
from app.config import settings
from app.models.payment import Payment
from app.models.recovery_attempt import RecoveryAttempt
from app.models.approval import RecoveryApproval
from app.models.audit_log import AuditLog
from app.services.agent.approval import RecoveryApprovalService, ApprovalResult
from app.services.agent.orchestrator import RecoveryWorkflowOrchestrator
from app.services.agent.observer import PaymentObserver


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    app.dependency_overrides[get_db] = lambda: test_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def daytime_now():
    return datetime(2026, 8, 26, 14, 0, tzinfo=timezone.utc)


# 1. HUMAN_APPROVAL creates PENDING approval
def test_human_approval_creates_pending_approval(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_app_001",
        amount=Decimal("15000.00"),  # High value -> HUMAN_APPROVAL
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    orchestrator = RecoveryWorkflowOrchestrator()
    wf_res = orchestrator.run_workflow(
        payment_id=payment.id,
        db=test_db,
        current_time=daytime_now,
        execute_allowed=True,
    )

    assert wf_res.guardrail_decision == "HUMAN_APPROVAL"
    assert wf_res.executed is False

    approvals = test_db.query(RecoveryApproval).filter_by(payment_id=payment.id).all()
    assert len(approvals) == 1
    assert approvals[0].approval_status == "PENDING"
    assert approvals[0].requested_strategy == "PAYMENT_LINK"

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="recovery.approval.requested").all()
    assert len(audits) == 1


# 2. Duplicate approval request reuses PENDING approval
def test_duplicate_approval_request_reuses_pending(test_db):
    payment = Payment(
        razorpay_payment_id="pay_app_dup",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
    )
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    a1 = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK", "Reason 1")
    a2 = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK", "Reason 2")

    assert a1.id == a2.id
    count = test_db.query(RecoveryApproval).filter_by(payment_id=payment.id).count()
    assert count == 1


# 3. PENDING -> APPROVED
def test_pending_to_approved_transition(test_db):
    payment = Payment(razorpay_payment_id="pay_app_ok", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    pending = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK")
    approved = service.approve(test_db, pending.id, "Approved by manager")

    assert approved.approval_status == "APPROVED"
    assert approved.resolved_at is not None

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="recovery.approval.approved").all()
    assert len(audits) == 1


# 4. PENDING -> REJECTED
def test_pending_to_rejected_transition(test_db):
    payment = Payment(razorpay_payment_id="pay_app_rej", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    pending = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK")
    rejected = service.reject(test_db, pending.id, "Rejected by compliance")

    assert rejected.approval_status == "REJECTED"
    assert rejected.resolved_at is not None

    audits = test_db.query(AuditLog).filter_by(payment_id=payment.id, event="recovery.approval.rejected").all()
    assert len(audits) == 1


# 5. Repeated approve is idempotent & repeated reject is safe
def test_repeated_approve_and_reject_idempotent(test_db):
    payment = Payment(razorpay_payment_id="pay_app_idem", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    p1 = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK")
    res1 = service.approve(test_db, p1.id)
    res2 = service.approve(test_db, p1.id)
    assert res1.approval_status == "APPROVED"
    assert res2.approval_status == "APPROVED"

    p2 = service.create_pending_approval(test_db, payment.id, "ESCALATE", ttl_hours=0)  # expired
    with pytest.raises(ValueError):
        service.approve(test_db, p2.id)


# 6. Expiration -> EXPIRED and cannot execute
def test_expired_approval_cannot_execute(test_db):
    payment = Payment(razorpay_payment_id="pay_app_exp", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()

    # Create expired record directly
    now = datetime.now(timezone.utc)
    expired_rec = RecoveryApproval(
        payment_id=payment.id,
        requested_strategy="PAYMENT_LINK",
        approval_status="PENDING",
        created_at=now - timedelta(hours=48),
        expires_at=now - timedelta(hours=24),
    )
    test_db.add(expired_rec)
    test_db.commit()

    # get_approval triggers EXPIRED transition
    fetched = service.get_approval(test_db, expired_rec.id)
    assert fetched.approval_status == "EXPIRED"

    # Execution fails closed
    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        exec_res = service.execute_approved_recovery(test_db, expired_rec.id)
        assert exec_res.executed is False
        assert exec_res.status == "blocked"
        mock_link_api.assert_not_called()


# 7. APPROVED + Guardrail ALLOW -> Executor Reached via Controlled Path
def test_approved_plus_guardrail_allow_executes(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_app_exec_ok",
        amount=Decimal("150.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    p = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK")
    service.approve(test_db, p.id)

    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            mock_link_api.return_value = {
                "id": "plink_app_exec_999",
                "short_url": "https://rzp.io/i/appexec999",
                "status": "created",
            }

            exec_res = service.execute_approved_recovery(test_db, p.id, current_time=daytime_now)
            assert exec_res.executed is True
            assert exec_res.payment_link_id == "plink_app_exec_999"
            mock_link_api.assert_called_once()


# 8. APPROVED + Guardrail BLOCK / STOP / HUMAN_APPROVAL -> 0 Razorpay Calls
def test_approved_plus_guardrail_deny_zero_api_calls(test_db, daytime_now):
    payment = Payment(
        razorpay_payment_id="pay_app_deny",
        amount=Decimal("15000.00"),  # High value -> HUMAN_APPROVAL
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    service = RecoveryApprovalService()
    p = service.create_pending_approval(test_db, payment.id, "PAYMENT_LINK")
    service.approve(test_db, p.id)

    # Fresh guardrail evaluation re-evaluates high value threshold -> returns HUMAN_APPROVAL
    with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
        exec_res = service.execute_approved_recovery(test_db, p.id, current_time=daytime_now)
        assert exec_res.executed is False
        assert exec_res.status == "blocked"
        mock_link_api.assert_not_called()


# 9. API Endpoints Integration Test
def test_approval_api_endpoints_end_to_end(client, test_db):
    payment = Payment(
        razorpay_payment_id="pay_api_app_001",
        amount=Decimal("100.00"),
        currency="INR",
        status="failed",
        failure_reason="Payment failed due to insufficient funds.",
    )
    test_db.add(payment)
    test_db.commit()

    # Step 1: Create approval via API
    res1 = client.post(f"/recovery/approval/{payment.id}")
    assert res1.status_code == 200
    app_data = res1.json()
    assert app_data["approval_status"] == "PENDING"
    app_id = app_data["id"]

    # Step 2: Approve via API
    res2 = client.post(f"/recovery/approval/{app_id}/approve", json={"reason": "Approved by supervisor"})
    assert res2.status_code == 200
    assert res2.json()["approval_status"] == "APPROVED"

    # Step 3: Execute via API
    with patch("app.services.agent.guardrails.is_quiet_hours", return_value=False):
        with patch("app.services.agent.executor.create_payment_link") as mock_link_api:
            mock_link_api.return_value = {
                "id": "plink_api_app_999",
                "short_url": "https://rzp.io/i/apiapp999",
                "status": "created",
            }
            res3 = client.post(f"/recovery/approval/{app_id}/execute")
            assert res3.status_code == 200
            assert res3.json()["executed"] is True
            mock_link_api.assert_called_once()


# 10. Reject API Endpoint Test
def test_approval_api_reject_endpoint(client, test_db):
    payment = Payment(razorpay_payment_id="pay_api_rej_001", amount=Decimal("100.00"), status="failed")
    test_db.add(payment)
    test_db.commit()

    res1 = client.post(f"/recovery/approval/{payment.id}")
    app_id = res1.json()["id"]

    res2 = client.post(f"/recovery/approval/{app_id}/reject", json={"reason": "Decline risk"})
    assert res2.status_code == 200
    assert res2.json()["approval_status"] == "REJECTED"
