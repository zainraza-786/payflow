from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from razorpay.errors import BadRequestError, GatewayError, ServerError
import requests

from app.services.razorpay.client import get_razorpay_client
from app.services.razorpay.payments import fetch_payment
from app.services.razorpay.payment_links import create_payment_link, amount_to_smallest_unit
from app.services.razorpay.exceptions import (
    RazorpayAuthError,
    RazorpayNotFoundError,
    RazorpayAPIError,
    RazorpayNetworkError,
)


@pytest.fixture
def mock_razorpay_client():
    client = MagicMock()
    client.auth = ("rzp_test_mockkey", "mock_secret_xyz123")
    return client


def test_client_missing_credentials(monkeypatch):
    monkeypatch.setattr("app.config.settings.razorpay_key_id", None)
    monkeypatch.setattr("app.config.settings.razorpay_key_secret", None)
    with pytest.raises(RazorpayAuthError) as excinfo:
        get_razorpay_client()
    assert "credentials missing" in str(excinfo.value)


def test_amount_to_smallest_unit():
    assert amount_to_smallest_unit(Decimal("100.50")) == 10050
    assert amount_to_smallest_unit(100) == 10000
    assert amount_to_smallest_unit(Decimal("0.99")) == 99

    with pytest.raises(ValueError):
        amount_to_smallest_unit(Decimal("-10.00"))

    with pytest.raises(ValueError):
        amount_to_smallest_unit(Decimal("NaN"))


def test_fetch_payment_success(mock_razorpay_client):
    mock_response = {
        "id": "pay_test123",
        "entity": "payment",
        "amount": 10000,
        "currency": "INR",
        "status": "captured",
        "method": "card",
    }
    mock_razorpay_client.payment.fetch.return_value = mock_response

    res = fetch_payment("pay_test123", client=mock_razorpay_client)
    assert res["id"] == "pay_test123"
    assert res["amount"] == 10000
    assert res["status"] == "captured"
    mock_razorpay_client.payment.fetch.assert_called_once_with("pay_test123")


def test_fetch_payment_not_found(mock_razorpay_client):
    mock_razorpay_client.payment.fetch.side_effect = BadRequestError("BAD_REQUEST_ERROR: Payment not found")

    with pytest.raises(RazorpayNotFoundError) as excinfo:
        fetch_payment("pay_nonexistent", client=mock_razorpay_client)
    assert "not found" in str(excinfo.value)


def test_fetch_payment_authentication_failure(mock_razorpay_client):
    mock_razorpay_client.payment.fetch.side_effect = BadRequestError("Invalid key or auth secret provided")

    with pytest.raises(RazorpayAuthError) as excinfo:
        fetch_payment("pay_test123", client=mock_razorpay_client)
    assert "authentication failed" in str(excinfo.value)


def test_fetch_payment_network_error(mock_razorpay_client):
    mock_razorpay_client.payment.fetch.side_effect = requests.exceptions.Timeout("Connection timed out")

    with pytest.raises(RazorpayNetworkError) as excinfo:
        fetch_payment("pay_test123", client=mock_razorpay_client)
    assert "Network error" in str(excinfo.value)


def test_create_payment_link_success(mock_razorpay_client):
    mock_response = {
        "id": "plink_test123",
        "entity": "payment_link",
        "amount": 15050,
        "currency": "INR",
        "status": "created",
        "short_url": "https://rzp.io/i/test123",
        "reference_id": "ref_order_001",
    }
    mock_razorpay_client.payment_link.create.return_value = mock_response

    res = create_payment_link(
        amount=Decimal("150.50"),
        description="Recovery Payment Link",
        reference_id="ref_order_001",
        currency="INR",
        client=mock_razorpay_client,
    )

    assert res["id"] == "plink_test123"
    assert res["short_url"] == "https://rzp.io/i/test123"
    assert res["amount"] == 15050

    mock_razorpay_client.payment_link.create.assert_called_once_with({
        "amount": 15050,
        "currency": "INR",
        "accept_partial": False,
        "reference_id": "ref_order_001",
        "description": "Recovery Payment Link",
        "notify": {"sms": False, "email": False},
    })


def test_create_payment_link_failure(mock_razorpay_client):
    mock_razorpay_client.payment_link.create.side_effect = BadRequestError("Invalid payload parameters")

    with pytest.raises(RazorpayAPIError) as excinfo:
        create_payment_link(
            amount=Decimal("100.00"),
            description="Test",
            reference_id="ref_1",
            client=mock_razorpay_client,
        )
    assert "Payment Link creation failed" in str(excinfo.value)


def test_unexpected_non_dict_response(mock_razorpay_client):
    mock_razorpay_client.payment.fetch.return_value = "invalid_string_response"

    with pytest.raises(RazorpayAPIError) as excinfo:
        fetch_payment("pay_test123", client=mock_razorpay_client)
    assert "Unexpected non-dict response" in str(excinfo.value)


def test_secret_is_not_exposed_in_exception(mock_razorpay_client):
    secret_key = "super_secret_razorpay_key_999"
    mock_razorpay_client.auth = ("rzp_test_123", secret_key)
    # Simulate an error message containing the secret key
    mock_razorpay_client.payment.fetch.side_effect = BadRequestError(f"Auth failed with key secret {secret_key}")

    with pytest.raises(RazorpayAuthError) as excinfo:
        fetch_payment("pay_test123", client=mock_razorpay_client)

    error_message = str(excinfo.value)
    assert secret_key not in error_message
    assert "[REDACTED]" in error_message
