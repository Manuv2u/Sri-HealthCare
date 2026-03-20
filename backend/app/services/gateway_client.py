"""Payment gateway client — abstract interface with Razorpay implementation."""
from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from typing import Protocol

from app.config import settings

logger = logging.getLogger("sri.gateway")


class GatewayClientProtocol(Protocol):
    async def create_order(self, amount_paise: int, receipt: str) -> dict:
        """Create a payment order; return dict with order_id and payment_url."""
        ...

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Return True if HMAC-SHA256 signature matches."""
        ...

    async def initiate_refund(self, gateway_payment_id: str, amount_paise: int) -> dict:
        """Initiate refund; return dict with refund_id."""
        ...


class RazorpayGatewayClient:
    """Razorpay gateway implementation."""

    def __init__(self) -> None:
        self._secret = settings.payment_webhook_secret

    async def create_order(self, amount_paise: int, receipt: str) -> dict:
        # In production, call Razorpay Orders API
        # For MVP, return a mock order structure
        order_id = f"order_{uuid.uuid4().hex[:16]}"
        logger.info("gateway_create_order: receipt=%s order_id=%s", receipt, order_id)
        return {
            "order_id": order_id,
            "payment_url": f"https://checkout.razorpay.com/v1/checkout.js?order_id={order_id}",
            "amount_paise": amount_paise,
        }

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        expected = hmac.new(
            self._secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def initiate_refund(self, gateway_payment_id: str, amount_paise: int) -> dict:
        refund_id = f"rfnd_{uuid.uuid4().hex[:16]}"
        logger.info(
            "gateway_initiate_refund: payment_id=%s refund_id=%s",
            gateway_payment_id,
            refund_id,
        )
        return {"refund_id": refund_id, "status": "pending"}


class MockGatewayClient:
    """No-op gateway for local/test environments."""

    async def create_order(self, amount_paise: int, receipt: str) -> dict:
        order_id = f"mock_order_{uuid.uuid4().hex[:8]}"
        return {
            "order_id": order_id,
            "payment_url": f"/mock-payment?order_id={order_id}",
            "amount_paise": amount_paise,
        }

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        return True  # Accept all in mock mode

    async def initiate_refund(self, gateway_payment_id: str, amount_paise: int) -> dict:
        return {"refund_id": f"mock_rfnd_{uuid.uuid4().hex[:8]}", "status": "pending"}


def get_gateway_client() -> RazorpayGatewayClient | MockGatewayClient:
    if settings.env_profile in ("local", "test"):
        return MockGatewayClient()
    return RazorpayGatewayClient()
