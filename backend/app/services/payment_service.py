"""PaymentService — initiate, webhook, refund, invoice."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.booking_repository import BookingRepository
from app.repositories.payment_repository import PaymentRepository, RefundRepository
from app.services.gateway_client import get_gateway_client
from app.services.invoice_service import InvoiceService

logger = logging.getLogger("sri.payment")

_INVOICE_PREFIX = "INV"


def _invoice_number() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{_INVOICE_PREFIX}-{ts}-{uuid.uuid4().hex[:6].upper()}"


class PaymentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = PaymentRepository(db)
        self.refund_repo = RefundRepository(db)
        self.booking_repo = BookingRepository(db)
        self.gateway = get_gateway_client()

    async def initiate_payment(
        self,
        booking_id: uuid.UUID,
        method: str,
    ) -> dict:
        booking = await self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )

        # Check if payment already exists
        existing = await self.repo.get_by_booking_id(booking_id)
        if existing and existing.status == "paid":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "ALREADY_PAID", "message": "Booking is already paid"},
            )

        # Calculate amounts from booking items
        subtotal = sum(float(item.unit_price) for item in booking.items)
        gst = round(subtotal * settings.gst_rate, 2)
        total = round(subtotal + gst, 2)
        amount_paise = int(total * 100)

        # Create gateway order
        order = await self.gateway.create_order(
            amount_paise=amount_paise,
            receipt=str(booking_id),
        )

        # Create or update payment record
        if existing is None:
            payment = await self.repo.create(
                booking_id=booking_id,
                method=method,
                amount=total,
                gst_amount=gst,
            )
        else:
            payment = existing
            # Update method and recalculated amounts
            from sqlalchemy import update as sa_update
            from app.models.payment import Payment as PaymentModel
            await self.db.execute(
                sa_update(PaymentModel)
                .where(PaymentModel.id == payment.id)
                .values(method=method, amount=total, gst_amount=gst)
            )

        await self.repo.update_status(
            payment.id,
            status="pending",
            gateway_order_id=order["order_id"],
        )

        return {
            "payment_id": payment.id,
            "order_id": order["order_id"],
            "payment_url": order["payment_url"],
            "amount": total,
            "gst_amount": gst,
        }

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        # Verify HMAC signature
        if not self.gateway.verify_webhook_signature(payload, signature):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_SIGNATURE", "message": "Webhook signature mismatch"},
            )

        import json
        data = json.loads(payload)
        gateway_payment_id = data.get("payment_id") or data.get("razorpay_payment_id", "")
        gateway_order_id = data.get("order_id") or data.get("razorpay_order_id", "")

        # Idempotency: check if already processed
        existing = await self.repo.get_by_gateway_payment_id(gateway_payment_id)
        if existing and existing.status == "paid":
            logger.info("webhook_idempotent: gateway_payment_id=%s", gateway_payment_id)
            return {"status": "already_processed"}

        # Find payment by order_id
        from sqlalchemy import select
        from app.models.payment import Payment
        result = await self.db.execute(
            select(Payment).where(Payment.gateway_order_id == gateway_order_id)
        )
        payment = result.scalar_one_or_none()
        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PAYMENT_NOT_FOUND", "message": "Payment not found"},
            )

        invoice_num = _invoice_number()
        await self.repo.update_status(
            payment.id,
            status="paid",
            gateway_payment_id=gateway_payment_id,
            invoice_number=invoice_num,
            paid_at=datetime.now(timezone.utc),
        )

        # Update booking status
        await self.booking_repo.update_status(payment.booking_id, "confirmed", changed_by=None)

        # Generate invoice PDF (fire-and-forget; errors logged but not raised)
        try:
            invoice_svc = InvoiceService(self.db)
            await invoice_svc.generate_pdf(payment.id)
        except Exception as exc:
            logger.error("invoice_generation_failed: payment_id=%s error=%s", payment.id, exc)

        logger.info("payment_confirmed: payment_id=%s booking_id=%s", payment.id, payment.booking_id)
        return {"status": "ok", "invoice_number": invoice_num}

    async def initiate_refund(
        self,
        payment_id: uuid.UUID,
        amount: float,
        reason: str,
        initiated_by: uuid.UUID,
    ) -> dict:
        payment = await self.repo.get_by_id(payment_id)
        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PAYMENT_NOT_FOUND", "message": "Payment not found"},
            )
        if payment.status != "paid":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error_code": "PAYMENT_NOT_PAID", "message": "Only paid payments can be refunded"},
            )

        refund = await self.refund_repo.create_refund(
            payment_id=payment_id,
            amount=amount,
            reason=reason,
            initiated_by=initiated_by,
        )

        try:
            result = await self.gateway.initiate_refund(
                gateway_payment_id=payment.gateway_payment_id or "",
                amount_paise=int(amount * 100),
            )
            await self.refund_repo.update_refund_status(
                refund.id,
                status="processing",
                gateway_refund_id=result["refund_id"],
            )
        except Exception as exc:
            logger.error("refund_gateway_failed: payment_id=%s error=%s", payment_id, exc)
            await self.refund_repo.update_refund_status(refund.id, status="failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"error_code": "GATEWAY_ERROR", "message": f"Refund gateway error: {exc}"},
            )

        logger.info("refund_initiated: payment_id=%s refund_id=%s", payment_id, refund.id)
        return {
            "refund_id": refund.id,
            "payment_id": payment_id,
            "amount": amount,
            "status": "processing",
        }

    async def get_invoice(self, payment_id: uuid.UUID) -> bytes:
        payment = await self.repo.get_by_id(payment_id)
        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PAYMENT_NOT_FOUND", "message": "Payment not found"},
            )
        invoice_svc = InvoiceService(self.db)
        return await invoice_svc.generate_pdf(payment_id)
