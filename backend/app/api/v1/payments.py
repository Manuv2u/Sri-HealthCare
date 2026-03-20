"""Payments router."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.middleware.auth import require_roles
from app.schemas.payments import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    RefundRequest,
    RefundResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    body: PaymentInitiateRequest,
    current_user: dict = Depends(require_roles("admin", "user")),
    db: AsyncSession = Depends(get_db_session),
) -> PaymentInitiateResponse:
    svc = PaymentService(db)
    result = await svc.initiate_payment(
        booking_id=body.booking_id,
        method=body.method,
    )
    return PaymentInitiateResponse.model_validate(result)


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    x_razorpay_signature: str = Header(default=""),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    payload = await request.body()
    svc = PaymentService(db)
    return await svc.handle_webhook(payload=payload, signature=x_razorpay_signature)


@router.post("/{payment_id}/refund", response_model=RefundResponse)
async def initiate_refund(
    payment_id: uuid.UUID,
    body: RefundRequest,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> RefundResponse:
    svc = PaymentService(db)
    result = await svc.initiate_refund(
        payment_id=payment_id,
        amount=body.amount,
        reason=body.reason,
        initiated_by=uuid.UUID(current_user["user_id"]),
    )
    return RefundResponse.model_validate(result)


@router.get("/{payment_id}/invoice")
async def get_invoice(
    payment_id: uuid.UUID,
    current_user: dict = Depends(require_roles("admin", "user")),
    db: AsyncSession = Depends(get_db_session),
) -> Response:
    svc = PaymentService(db)
    pdf_bytes = await svc.get_invoice(payment_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{payment_id}.pdf"},
    )
