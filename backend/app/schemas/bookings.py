"""Pydantic v2 schemas for bookings."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class BookingItemIn(BaseModel):
    item_type: str
    test_id: uuid.UUID | None = None
    package_id: uuid.UUID | None = None


class CreateBookingRequest(BaseModel):
    patient_id: uuid.UUID | None = None
    collection_type: str
    time_slot_id: uuid.UUID
    booking_date: date
    lab_branch_id: uuid.UUID | None = None
    pincode: str | None = None
    test_ids: list[uuid.UUID] = []
    package_ids: list[uuid.UUID] = []


class RescheduleRequest(BaseModel):
    new_time_slot_id: uuid.UUID
    new_booking_date: date


class UpdateStatusRequest(BaseModel):
    status: str


class BookingItemOut(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    item_type: str
    test_id: uuid.UUID | None
    package_id: uuid.UUID | None
    unit_price: Decimal

    model_config = {"from_attributes": True}


class BookingOut(BaseModel):
    id: uuid.UUID
    reference_number: str
    user_id: uuid.UUID
    patient_id: uuid.UUID | None
    collection_type: str
    time_slot_id: uuid.UUID
    booking_date: date
    lab_branch_id: uuid.UUID | None
    pincode: str | None
    status: str
    payment_status: str
    collected_at: datetime | None
    processing_started_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[BookingItemOut] = []

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    items: list[BookingOut]
    total: int
    page: int
    page_size: int
