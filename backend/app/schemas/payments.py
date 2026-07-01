"""Pydantic schemas for payments."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PaymentInitiateRequest(BaseModel):
    booking_id: uuid.UUID
    method: str  # "upi" | "card" | "cash" | "online"


class PaymentInitiateResponse(BaseModel):
    payment_id: uuid.UUID
    order_id: str
    payment_url: Optional[str] = None  # None for cash — there's no gateway redirect
    amount: float
    gst_amount: float


class RefundRequest(BaseModel):
    amount: float
    reason: str


class RefundResponse(BaseModel):
    refund_id: uuid.UUID
    payment_id: uuid.UUID
    amount: float
    status: str
