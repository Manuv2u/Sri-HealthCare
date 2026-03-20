"""Bookings router."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.middleware.auth import get_current_user, require_roles
from app.schemas.bookings import (
    BookingListResponse,
    BookingOut,
    CreateBookingRequest,
    RescheduleRequest,
    UpdateStatusRequest,
)
from app.services.booking_service import BookingService
from app.services.technician_service import TechnicianService

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    body: CreateBookingRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    svc = BookingService(db)
    result = await svc.create_booking(
        user_id=uuid.UUID(current_user["user_id"]),
        patient_id=body.patient_id,
        collection_type=body.collection_type,
        time_slot_id=body.time_slot_id,
        booking_date=body.booking_date,
        lab_branch_id=body.lab_branch_id,
        pincode=body.pincode,
        test_ids=body.test_ids,
        package_ids=body.package_ids,
    )
    return BookingOut.model_validate(result)


@router.get("", response_model=BookingListResponse)
async def list_bookings(
    page: int = 1,
    page_size: int = 20,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> BookingListResponse:
    svc = BookingService(db)
    result = await svc.list_bookings(
        user_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
        page=page,
        page_size=page_size,
    )
    return BookingListResponse.model_validate(result)


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    svc = BookingService(db)
    result = await svc.get_booking(
        booking_id=booking_id,
        requester_user_id=uuid.UUID(current_user["user_id"]),
        requester_role=current_user["role"],
    )
    return BookingOut.model_validate(result)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    svc = BookingService(db)
    result = await svc.cancel_booking(
        booking_id=booking_id,
        user_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
    )
    return BookingOut.model_validate(result)


@router.post("/{booking_id}/reschedule", response_model=BookingOut)
async def reschedule_booking(
    booking_id: uuid.UUID,
    body: RescheduleRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    svc = BookingService(db)
    result = await svc.reschedule_booking(
        booking_id=booking_id,
        new_time_slot_id=body.new_time_slot_id,
        new_booking_date=body.new_booking_date,
        user_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
    )
    return BookingOut.model_validate(result)


@router.put("/{booking_id}/status", response_model=BookingOut)
async def update_booking_status(
    booking_id: uuid.UUID,
    body: UpdateStatusRequest,
    current_user: dict = Depends(require_roles("admin", "technician")),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    svc = BookingService(db)
    result = await svc.update_booking_status(
        booking_id=booking_id,
        new_status=body.status,
        changed_by_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
    )
    return BookingOut.model_validate(result)


@router.post("/{booking_id}/auto-assign", status_code=201)
async def auto_assign_technician(
    booking_id: uuid.UUID,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    svc = TechnicianService(db)
    return await svc.auto_assign_to_booking(
        booking_id=booking_id,
        assigned_by_id=uuid.UUID(current_user["user_id"]),
    )
