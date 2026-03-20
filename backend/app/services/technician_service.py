"""TechnicianService — business logic for technician management."""
from __future__ import annotations

import logging
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Technician, TechnicianAssignment
from app.repositories.booking_repository import BookingRepository
from app.repositories.service_repository import ServiceAreaRepository
from app.repositories.technician_repository import TechnicianRepository

logger = logging.getLogger("sri.technician")

_MAX_DAILY_BOOKINGS = 20


def _tech_to_dict(tech: Technician) -> dict:
    return {
        "id": tech.id,
        "user_id": tech.user_id,
        "name": tech.name,
        "phone": tech.phone,
        "email": tech.email,
        "is_active": tech.is_active,
        "created_at": tech.created_at,
    }


def _assignment_to_dict(assignment: TechnicianAssignment) -> dict:
    return {
        "id": assignment.id,
        "booking_id": assignment.booking_id,
        "technician_id": assignment.technician_id,
        "assigned_at": assignment.assigned_at,
        "assigned_by": assignment.assigned_by,
    }


class TechnicianService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TechnicianRepository(db)
        self.booking_repo = BookingRepository(db)
        self.service_area_repo = ServiceAreaRepository(db)

    async def create_technician(
        self,
        user_id: uuid.UUID | None,
        name: str,
        phone: str,
        email: str,
    ) -> dict:
        tech = await self.repo.create(user_id=user_id, name=name, phone=phone, email=email)
        return _tech_to_dict(tech)

    async def get_technician(self, technician_id: uuid.UUID) -> dict:
        tech = await self.repo.get_by_id(technician_id)
        if tech is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "TECHNICIAN_NOT_FOUND", "message": "Technician not found"},
            )
        return _tech_to_dict(tech)

    async def list_technicians(self, page: int, page_size: int) -> dict:
        items, total = await self.repo.list(page=page, page_size=page_size)
        return {
            "items": [_tech_to_dict(t) for t in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def update_technician(self, technician_id: uuid.UUID, **fields: object) -> dict:
        tech = await self.repo.update(technician_id, **fields)
        if tech is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "TECHNICIAN_NOT_FOUND", "message": "Technician not found"},
            )
        return _tech_to_dict(tech)

    async def delete_technician(self, technician_id: uuid.UUID) -> None:
        tech = await self.repo.get_by_id(technician_id)
        if tech is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "TECHNICIAN_NOT_FOUND", "message": "Technician not found"},
            )
        await self.repo.soft_delete(technician_id)

    async def assign_to_booking(
        self,
        technician_id: uuid.UUID,
        booking_id: uuid.UUID,
        assigned_by_id: uuid.UUID,
    ) -> dict:
        # Validate technician exists and is active
        tech = await self.repo.get_by_id(technician_id)
        if tech is None or not tech.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "TECHNICIAN_INACTIVE",
                    "message": "Technician not found or is not active",
                },
            )

        # Validate booking exists
        booking = await self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )

        # Check daily booking limit
        count = await self.repo.get_daily_booking_count(technician_id, booking.booking_date)
        if count >= _MAX_DAILY_BOOKINGS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "TECHNICIAN_OVERLOADED",
                    "message": f"Technician already has {_MAX_DAILY_BOOKINGS} bookings on this date",
                },
            )

        assignment = await self.repo.create_assignment(
            booking_id=booking_id,
            technician_id=technician_id,
            assigned_by=assigned_by_id,
        )

        logger.info(
            "technician_assigned: technician_id=%s booking_id=%s assigned_by=%s",
            technician_id,
            booking_id,
            assigned_by_id,
        )

        return _assignment_to_dict(assignment)

    async def auto_assign_to_booking(
        self,
        booking_id: uuid.UUID,
        assigned_by_id: uuid.UUID,
    ) -> dict:
        booking = await self.booking_repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )

        # Resolve service area from pincode or lab_branch
        service_area = None
        if booking.pincode:
            service_area = await self.service_area_repo.get_by_pincode(booking.pincode)
        elif booking.lab_branch_id:
            # For lab bookings, find service area by lab branch pincode
            from app.repositories.lab_branch_repository import LabBranchRepository
            branch_repo = LabBranchRepository(self.db)
            branch = await branch_repo.get_by_id(booking.lab_branch_id)
            if branch:
                service_area = await self.service_area_repo.get_by_pincode(branch.pincode)

        if service_area is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "SERVICE_AREA_NOT_FOUND",
                    "message": "Cannot determine service area for this booking",
                },
            )

        tech = await self.repo.auto_assign(
            service_area_id=service_area.id,
            booking_date=booking.booking_date,
        )
        if tech is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "NO_TECHNICIAN_AVAILABLE",
                    "message": "No available technician for this service area and date",
                },
            )

        assignment = await self.repo.create_assignment(
            booking_id=booking_id,
            technician_id=tech.id,
            assigned_by=assigned_by_id,
        )

        logger.info(
            "technician_auto_assigned: technician_id=%s booking_id=%s assigned_by=%s",
            tech.id,
            booking_id,
            assigned_by_id,
        )

        return _assignment_to_dict(assignment)

    async def get_workload(self, booking_date: date) -> list[dict]:
        return await self.repo.get_workload_summary(booking_date)
