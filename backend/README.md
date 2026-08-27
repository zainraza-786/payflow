# Vasuli AI — Backend (Phase 14 Final Checkpoint)

## What this project does

This is Phase 14 (Final Phase) of the Vasuli AI backend (Razorpay Buildathon 2026, Track 3: AI Revenue Recovery). It provides a deterministic, production-hardened revenue recovery system:

- **FastAPI Core API Application**:
  - `GET /health`
  - `POST /webhooks/razorpay`
  - `POST /recovery/workflow/{payment_id}`
  - `POST /recovery/approval/{payment_id}`
  - `POST /recovery/approval/{approval_id}/approve`
  - `POST /recovery/approval/{approval_id}/reject`
  - `POST /recovery/approval/{approval_id}/execute`
- **SQLAlchemy Hardened Models**: `Payment`, `RecoveryAttempt`, `AuditLog`, `RecoveryApproval` with strict `Decimal` money safety, explicit UTC timestamps, and foreign key enforcement.
- **Phase 2 Isolated Razorpay Service Layer** (`app/services/razorpay`).
- **Phase 3 Production-Minded Webhook Ingestion Pipeline** (`POST /webhooks/razorpay`).
- **Phase 4 Revenue-at-Risk Detector & Failure Diagnostician** (`app/services/agent`).
- **Phase 5 Recovery Strategy Selector** (`app/services/agent/strategy.py`).
- **Phase 6 Guardrail Engine** (`app/services/agent/guardrails.py`).
- **Phase 7 Bounded Razorpay Payment Link Executor** (`app/services/agent/executor.py`).
- **Phase 8 Payment Observer & Recovery Attribution** (`app/services/agent/observer.py`).
- **Phase 9 Audit & Database Hardening** (`app/services/agent/audit.py` & `app/models/`).
- **Phase 10 Recovery Workflow Orchestrator** (`app/services/agent/orchestrator.py`).
- **Phase 11 Controlled Recovery Workflow API** (`POST /recovery/workflow/{payment_id}`).
- **Phase 12 Event-Driven Payment Failure Workflow Integration** (`app/services/agent/event_workflow.py`).
- **Phase 13 Human Approval Gate for Recovery Execution** (`app/services/agent/approval.py`).
- **Phase 14 Final Integration & Production-Readiness Hardening** (`tests/test_phase14_integration.py`):
  - End-to-end flow verified (`payment.failed` webhook -> HMAC verification -> risk detection -> diagnosis -> strategy -> guardrails -> `HUMAN_APPROVAL` pending -> explicit approve -> fresh guardrail re-evaluation -> bounded `PAYMENT_LINK` execution -> `payment.captured` webhook -> recovery attribution -> `revenue.recovered` audit log).
  - Absolute execution boundaries: zero external API calls occur without explicit approval and fresh guardrail `ALLOW` verdict.

> [!IMPORTANT]
> **System Classification**: This project is a deterministic revenue recovery backend. It is **NOT** an autonomous AI system. All external API calls are strictly guarded and mocked during automated testing (no live Razorpay credentials required for test suite).

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

## Running tests

Automated test suite (mocked, no external network dependencies):

```bash
pytest -v
```

Bytecode compilation check:

```bash
python -m compileall app tests
```

## Scope & Limitations

- Backend API and deterministic recovery engine only.
- No batch simulator/analytics or dashboard.
- No customer messaging (SMS/WhatsApp/email).
- No frontend or LLM/LangGraph integration.
