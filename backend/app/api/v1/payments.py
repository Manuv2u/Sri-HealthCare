"""Payments router."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import Response
from pydantic import BaseModel
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


class MarkCashReceivedRequest(BaseModel):
    method: str
    amount: float
    received_at: datetime
    notes: Optional[str] = None


class MarkCashReceivedResponse(BaseModel):
    payment_id: uuid.UUID
    method: str
    status: str
    amount: float
    paid_at: datetime
    notes: Optional[str] = None
    invoice_number: str


class RefundStatusUpdateRequest(BaseModel):
    status: Literal["approved", "completed", "failed"]
    remarks: Optional[str] = None
    transaction_reference: Optional[str] = None


class RefundStatusUpdateResponse(BaseModel):
    refund_id: uuid.UUID
    status: str
    remarks: Optional[str] = None
    transaction_reference: Optional[str] = None
    completed_at: Optional[datetime] = None


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
        user_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
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
    pdf_bytes = await svc.get_invoice(
        payment_id,
        user_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{payment_id}.pdf"},
    )


@router.post("/{payment_id}/mark-paid", response_model=MarkCashReceivedResponse)
async def mark_cash_received(
    payment_id: uuid.UUID,
    body: MarkCashReceivedRequest,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> MarkCashReceivedResponse:
    """Admin records a cash/card/UPI payment collected at the lab for a
    Lab Visit booking (the only booking type allowed to defer payment)."""
    svc = PaymentService(db)
    result = await svc.mark_cash_received(
        payment_id=payment_id,
        method=body.method,
        amount=body.amount,
        received_at=body.received_at,
        notes=body.notes,
        admin_user_id=uuid.UUID(current_user["user_id"]),
    )
    return MarkCashReceivedResponse.model_validate(result)


@router.put("/refunds/{refund_id}/status", response_model=RefundStatusUpdateResponse)
async def update_refund_status(
    refund_id: uuid.UUID,
    body: RefundStatusUpdateRequest,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> RefundStatusUpdateResponse:
    """Admin walks a refund forward through initiated -> approved -> completed,
    or marks it failed."""
    svc = PaymentService(db)
    result = await svc.update_refund_status(
        refund_id=refund_id,
        new_status=body.status,
        remarks=body.remarks,
        transaction_reference=body.transaction_reference,
        admin_user_id=uuid.UUID(current_user["user_id"]),
    )
    return RefundStatusUpdateResponse.model_validate(result)
