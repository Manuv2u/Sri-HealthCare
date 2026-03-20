"""BookingService — business logic for booking management."""
from __future__ import annotations

import logging
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.booking import Booking
from app.repositories.booking_repository import BookingRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.service_repository import ServiceAreaRepository
from app.repositories.test_repository import TestRepository
from app.repositories.user_repository import FamilyMemberRepository

logger = logging.getLogger("sri.booking")


def _item_to_dict(item: object) -> dict:
    from app.models.booking import BookingItem
    i: BookingItem = item  # type: ignore[assignment]
    return {
        "id": i.id,
        "booking_id": i.booking_id,
        "item_type": i.item_type,
        "test_id": i.test_id,
        "package_id": i.package_id,
        "unit_price": float(i.unit_price),
    }


def _booking_to_dict(booking: Booking) -> dict:
    return {
        "id": booking.id,
        "reference_number": booking.reference_number,
        "user_id": booking.user_id,
        "patient_id": booking.patient_id,
        "collection_type": booking.collection_type,
        "time_slot_id": booking.time_slot_id,
        "booking_date": booking.booking_date,
        "lab_branch_id": booking.lab_branch_id,
        "pincode": booking.pincode,
        "status": booking.status,
        "payment_status": booking.payment_status,
        "collected_at": booking.collected_at,
        "processing_started_at": booking.processing_started_at,
        "completed_at": booking.completed_at,
        "cancelled_at": booking.cancelled_at,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
        "items": [_item_to_dict(i) for i in (booking.items or [])],
    }


class BookingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BookingRepository(db)
        self.test_repo = TestRepository(db)
        self.package_repo = PackageRepository(db)
        self.service_area_repo = ServiceAreaRepository(db)
        self.family_member_repo = FamilyMemberRepository(db)

    async def create_booking(
        self,
        user_id: uuid.UUID,
        patient_id: uuid.UUID | None,
        collection_type: str,
        time_slot_id: uuid.UUID,
        booking_date: date,
        lab_branch_id: uuid.UUID | None,
        pincode: str | None,
        test_ids: list[uuid.UUID],
        package_ids: list[uuid.UUID],
    ) -> dict:
        # Validate patient belongs to user
        if patient_id is not None:
            member = await self.family_member_repo.get_by_id(patient_id)
            if member is None or member.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error_code": "PATIENT_NOT_FOUND",
                        "message": "Patient not found or does not belong to this user",
                    },
                )

        # Validate at least one test or package
        if not test_ids and not package_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "NO_ITEMS",
                    "message": "At least one test or package is required",
                },
            )

        # Build items list
        items: list[dict] = []

        for test_id in test_ids:
            test = await self.test_repo.get_by_id(test_id)
            if test is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error_code": "TEST_NOT_FOUND",
                        "message": f"Test {test_id} not found or has been deleted",
                    },
                )
            effective_price = float(test.price) * (1 - float(test.discount_percentage) / 100)
            items.append(
                {
                    "item_type": "test",
                    "test_id": test_id,
                    "package_id": None,
                    "unit_price": round(effective_price, 2),
                }
            )

        for package_id in package_ids:
            pkg = await self.package_repo.get_by_id(package_id)
            if pkg is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error_code": "PACKAGE_NOT_FOUND",
                        "message": f"Package {package_id} not found or has been deleted",
                    },
                )
            items.append(
                {
                    "item_type": "package",
                    "test_id": None,
                    "package_id": package_id,
                    "unit_price": float(pkg.discounted_price),
                }
            )

        # Validate home collection
        if collection_type == "home":
            if not pincode:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error_code": "PINCODE_REQUIRED",
                        "message": "Pincode is required for home collection",
                    },
                )
            service_area = await self.service_area_repo.get_by_pincode(pincode)
            if service_area is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error_code": "SERVICE_AREA_NOT_FOUND",
                        "message": f"Home collection is not available for pincode {pincode}",
                    },
                )

        # Create booking atomically
        booking = await self.repo.create_booking_atomic(
            user_id=user_id,
            patient_id=patient_id,
            collection_type=collection_type,
            time_slot_id=time_slot_id,
            booking_date=booking_date,
            lab_branch_id=lab_branch_id,
            pincode=pincode,
            items=items,
            gst_rate=settings.gst_rate,
        )

        # Enqueue notification (log for now — notification service comes later)
        logger.info(
            "booking_confirmed: booking_id=%s reference=%s user_id=%s",
            booking.id,
            booking.reference_number,
            user_id,
        )

        return _booking_to_dict(booking)

    async def get_booking(
        self,
        booking_id: uuid.UUID,
        requester_user_id: uuid.UUID,
        requester_role: str,
    ) -> dict:
        booking = await self.repo.get_by_id(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )
        if requester_role not in ("admin", "technician") and booking.user_id != requester_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "FORBIDDEN", "message": "Access denied"},
            )
        return _booking_to_dict(booking)

    async def list_bookings(
        self,
        user_id: uuid.UUID,
        role: str,
        page: int,
        page_size: int,
    ) -> dict:
        if role == "admin":
            items, total = await self.repo.list_all(page=page, page_size=page_size)
        else:
            items, total = await self.repo.list_by_user(
                user_id=user_id, page=page, page_size=page_size
            )
        return {
            "items": [_booking_to_dict(b) for b in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def cancel_booking(
        self,
        booking_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str,
    ) -> dict:
        # Verify ownership unless admin
        if role not in ("admin",):
            booking = await self.repo.get_by_id(booking_id)
            if booking is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
                )
            if booking.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error_code": "FORBIDDEN", "message": "Access denied"},
                )

        booking = await self.repo.cancel_booking(booking_id=booking_id, cancelled_by=user_id)
        logger.info("booking_cancelled: booking_id=%s by user_id=%s", booking_id, user_id)
        return _booking_to_dict(booking)

    async def reschedule_booking(
        self,
        booking_id: uuid.UUID,
        new_time_slot_id: uuid.UUID,
        new_booking_date: date,
        user_id: uuid.UUID,
        role: str,
    ) -> dict:
        if role not in ("admin",):
            booking = await self.repo.get_by_id(booking_id)
            if booking is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
                )
            if booking.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error_code": "FORBIDDEN", "message": "Access denied"},
                )

        booking = await self.repo.reschedule_booking(
            booking_id=booking_id,
            new_time_slot_id=new_time_slot_id,
            new_booking_date=new_booking_date,
            rescheduled_by=user_id,
        )
        logger.info("booking_rescheduled: booking_id=%s by user_id=%s", booking_id, user_id)
        return _booking_to_dict(booking)

    async def update_booking_status(
        self,
        booking_id: uuid.UUID,
        new_status: str,
        changed_by_id: uuid.UUID,
        role: str,
    ) -> dict:
        if role not in ("admin", "technician"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "FORBIDDEN", "message": "Access denied"},
            )
        booking = await self.repo.update_status(
            booking_id=booking_id,
            new_status=new_status,
            changed_by=changed_by_id,
        )
        return _booking_to_dict(booking)
