"""Bookings router."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.middleware.auth import get_current_user, require_roles
from sqlalchemy import select, update

from app.models.booking import Booking
from app.models.service import Technician, TechnicianAssignment
from app.schemas.bookings import (
    AddRemarksRequest,
    BookingListResponse,
    BookingOut,
    CancelBookingRequest,
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


@router.get("/my-assigned", response_model=BookingListResponse)
async def get_my_assigned_bookings(
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    current_user: dict = Depends(require_roles("technician")),
    db: AsyncSession = Depends(get_db_session),
) -> BookingListResponse:
    """Return bookings assigned to the current technician."""
    from app.models.service import TechnicianAssignment
    from sqlalchemy import func

    user_id = uuid.UUID(current_user["user_id"])
    result = await db.execute(select(Technician).where(Technician.user_id == user_id))
    tech = result.scalar_one_or_none()
    if not tech:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "NOT_FOUND", "message": "Technician profile not found for this user"},
        )

    subq = select(TechnicianAssignment.booking_id).where(TechnicianAssignment.technician_id == tech.id)

    count_q = select(func.count()).select_from(Booking).where(Booking.id.in_(subq))
    if status:
        count_q = count_q.where(Booking.status == status)
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    q = (
        select(Booking)
        .options(selectinload(Booking.items))
        .where(Booking.id.in_(subq))
        .order_by(Booking.booking_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if status:
        q = q.where(Booking.status == status)
    rows = await db.execute(q)
    bookings = list(rows.scalars().all())
    from app.services.booking_service import _booking_to_dict
    return BookingListResponse(
        items=[BookingOut.model_validate(_booking_to_dict(b)) for b in bookings],
        total=total,
        page=page,
        page_size=page_size,
    )


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
    body: CancelBookingRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    svc = BookingService(db)
    result = await svc.cancel_booking(
        booking_id=booking_id,
        user_id=uuid.UUID(current_user["user_id"]),
        role=current_user["role"],
        reason=body.reason,
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
        reason=body.reason,
    )
    return BookingOut.model_validate(result)


@router.post("/{booking_id}/remarks", response_model=BookingOut)
async def add_booking_remarks(
    booking_id: uuid.UUID,
    body: AddRemarksRequest,
    current_user: dict = Depends(require_roles("admin", "technician")),
    db: AsyncSession = Depends(get_db_session),
) -> BookingOut:
    """Technician or admin adds notes/remarks to a booking."""
    result = await db.execute(
        select(Booking).options(selectinload(Booking.items)).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail={"error_code": "NOT_FOUND", "message": "Booking not found"})

    if current_user["role"] == "technician":
        assignment_result = await db.execute(
            select(TechnicianAssignment)
            .join(Technician, Technician.id == TechnicianAssignment.technician_id)
            .where(
                TechnicianAssignment.booking_id == booking_id,
                Technician.user_id == uuid.UUID(current_user["user_id"]),
            )
        )
        if assignment_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=403,
                detail={"error_code": "FORBIDDEN", "message": "You are not assigned to this booking"},
            )

    await db.execute(
        update(Booking).where(Booking.id == booking_id).values(technician_notes=body.notes)
    )
    await db.flush()
    await db.refresh(booking)
    from app.services.booking_service import _booking_to_dict
    return BookingOut.model_validate(_booking_to_dict(booking))


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
