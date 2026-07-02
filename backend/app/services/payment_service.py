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

# Home-collection bookings must be paid online before they're serviced — this
# is a whitelist (not a "cash" blacklist) so any future gateway method name is
# still allowed without a code change, while anything else is rejected.
_GATEWAY_METHODS = {"online", "card", "upi", "netbanking"}

# Forward-only refund status progression an admin can drive manually.
_REFUND_TRANSITIONS: dict[str, list[str]] = {
    "initiated": ["approved", "failed"],
    "approved": ["completed", "failed"],
    "completed": [],
    "failed": [],
}


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
        user_id: uuid.UUID,
        role: str,
    ) -> dict:
        booking = await self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )
        if role != "admin" and booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "FORBIDDEN", "message": "Access denied"},
            )

        if booking.collection_type == "home" and method not in _GATEWAY_METHODS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "ONLINE_PAYMENT_REQUIRED",
                    "message": "Home collection bookings require online payment",
                },
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

        # Cash payments skip the gateway — confirm immediately
        if method == "cash":
            if existing is None:
                payment = await self.repo.create(
                    booking_id=booking_id,
                    method=method,
                    amount=total,
                    gst_amount=gst,
                )
            else:
                payment = existing
                from sqlalchemy import update as sa_update
                from app.models.payment import Payment as PaymentModel
                await self.db.execute(
                    sa_update(PaymentModel)
                    .where(PaymentModel.id == payment.id)
                    .values(method=method, amount=total, gst_amount=gst)
                )
            invoice_num = _invoice_number()
            await self.repo.update_status(
                payment.id,
                status="paid",
                gateway_order_id=f"cash_{payment.id.hex[:12]}",
                gateway_payment_id=f"cash_{payment.id.hex[:12]}",
                invoice_number=invoice_num,
                paid_at=datetime.now(timezone.utc),
            )
            await self.booking_repo.sync_payment_status(booking_id, "paid")
            try:
                invoice_svc = InvoiceService(self.db)
                await invoice_svc.generate_pdf(payment.id)
            except Exception as exc:
                logger.error("cash_invoice_failed: payment_id=%s error=%s", payment.id, exc)
            return {
                "payment_id": payment.id,
                "order_id": f"cash_{payment.id.hex[:12]}",
                "payment_url": None,
                "amount": total,
                "gst_amount": gst,
            }

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

        # Sync the booking's payment_status — this used to call
        # booking_repo.update_status(..., "confirmed", ...), but "confirmed" was
        # never a valid booking status, so this 422'd on every real webhook call.
        await self.booking_repo.sync_payment_status(payment.booking_id, "paid")

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

        total_paid = float(payment.amount) + float(payment.gst_amount)
        if amount > total_paid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "REFUND_EXCEEDS_PAYMENT",
                    "message": f"Refund amount cannot exceed the paid amount (₹{total_paid:.2f})",
                },
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
            # "approved" here means the gateway has accepted and is processing the
            # refund — an admin marks it "completed" once the money has actually
            # landed, via update_refund_status(). Kept on the same
            # initiated/approved/completed/failed vocabulary as the
            # cancellation-triggered refund flow (see booking_repository.cancel_booking).
            await self.refund_repo.update_refund_status(
                refund.id,
                status="approved",
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
            "status": "approved",
        }

    async def get_invoice(self, payment_id: uuid.UUID, user_id: uuid.UUID, role: str) -> bytes:
        payment = await self.repo.get_by_id(payment_id)
        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PAYMENT_NOT_FOUND", "message": "Payment not found"},
            )
        if role != "admin":
            booking = await self.booking_repo.get_by_id(payment.booking_id)
            if booking is None or booking.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error_code": "FORBIDDEN", "message": "Access denied"},
                )
        invoice_svc = InvoiceService(self.db)
        return await invoice_svc.generate_pdf(payment_id)

    async def mark_cash_received(
        self,
        payment_id: uuid.UUID,
        method: str,
        amount: float,
        received_at: datetime,
        notes: str | None,
        admin_user_id: uuid.UUID,
    ) -> dict:
        """Admin manually records a payment as received — for Lab Visit bookings
        this covers cash/card/UPI collected at the lab; for Home Collection
        bookings this is the admin's way to satisfy the "must be paid before a
        technician can be assigned" rule when there's no live payment gateway
        to exercise (e.g. in this environment)."""
        payment = await self.repo.get_by_id(payment_id)
        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "PAYMENT_NOT_FOUND", "message": "Payment not found"},
            )
        booking = await self.booking_repo.get_by_id(payment.booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )
        if payment.status == "paid":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "ALREADY_PAID", "message": "This booking is already paid"},
            )

        expected_total = float(payment.amount) + float(payment.gst_amount)
        if abs(amount - expected_total) > 0.01:
            logger.warning(
                "cash_amount_mismatch: payment_id=%s expected=%.2f received=%.2f",
                payment_id, expected_total, amount,
            )

        invoice_num = _invoice_number()
        from sqlalchemy import update as sa_update
        from app.models.payment import Payment as PaymentModel
        await self.db.execute(
            sa_update(PaymentModel)
            .where(PaymentModel.id == payment_id)
            .values(
                method=method,
                status="paid",
                amount=amount,
                paid_at=received_at,
                notes=notes,
                invoice_number=invoice_num,
            )
        )
        await self.db.flush()
        await self.booking_repo.sync_payment_status(booking.id, "paid")

        try:
            invoice_svc = InvoiceService(self.db)
            await invoice_svc.generate_pdf(payment_id)
        except Exception as exc:
            logger.error("cash_invoice_failed: payment_id=%s error=%s", payment_id, exc)

        logger.info(
            "cash_payment_recorded: payment_id=%s booking_id=%s by=%s",
            payment_id, booking.id, admin_user_id,
        )
        return {
            "payment_id": payment_id,
            "method": method,
            "status": "paid",
            "amount": amount,
            "paid_at": received_at,
            "notes": notes,
            "invoice_number": invoice_num,
        }

    async def update_refund_status(
        self,
        refund_id: uuid.UUID,
        new_status: str,
        remarks: str | None,
        transaction_reference: str | None,
        admin_user_id: uuid.UUID,
    ) -> dict:
        refund = await self.refund_repo.get_by_id(refund_id)
        if refund is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "REFUND_NOT_FOUND", "message": "Refund not found"},
            )

        valid_next = _REFUND_TRANSITIONS.get(refund.status, [])
        if new_status not in valid_next:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "INVALID_REFUND_TRANSITION",
                    "message": f"Cannot move refund from '{refund.status}' to '{new_status}'. Valid next: {valid_next}",
                },
            )

        completed_at = datetime.now(timezone.utc) if new_status == "completed" else None
        await self.refund_repo.update_refund_status(
            refund_id,
            status=new_status,
            completed_at=completed_at,
            remarks=remarks,
            transaction_reference=transaction_reference,
        )

        logger.info(
            "refund_status_updated: refund_id=%s new_status=%s by=%s",
            refund_id, new_status, admin_user_id,
        )
        return {
            "refund_id": refund_id,
            "status": new_status,
            "remarks": remarks,
            "transaction_reference": transaction_reference,
            "completed_at": completed_at,
        }
