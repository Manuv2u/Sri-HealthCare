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
from app.repositories.settings_repository import SettingsRepository
from app.repositories.technician_repository import TechnicianRepository
from app.repositories.test_repository import TestRepository
from app.repositories.user_repository import FamilyMemberRepository

logger = logging.getLogger("sri.booking")


def _item_to_dict(item: object) -> dict:
    from app.models.booking import BookingItem
    i: BookingItem = item  # type: ignore[assignment]
    name = ""
    test_obj = getattr(i, "test", None)
    pkg_obj = getattr(i, "package", None)
    if test_obj is not None:
        name = getattr(test_obj, "name", "")
    elif pkg_obj is not None:
        name = getattr(pkg_obj, "name", "")
    return {
        "id": i.id,
        "booking_id": i.booking_id,
        "item_type": i.item_type,
        "item_name": name,
        "test_id": i.test_id,
        "package_id": i.package_id,
        "unit_price": float(i.unit_price),
    }


def _booking_to_dict(booking: Booking) -> dict:
    items = list(booking.items or [])
    total_amount = float(sum(float(i.unit_price) for i in items))
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
        "cancellation_reason": booking.cancellation_reason,
        "cancelled_by": booking.cancelled_by,
        "cancellation_fee": float(booking.cancellation_fee) if booking.cancellation_fee is not None else None,
        "cancellation_fee_type": booking.cancellation_fee_type,
        "technician_notes": booking.technician_notes,
        "total_amount": total_amount,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
        "items": [_item_to_dict(i) for i in items],
    }


class BookingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BookingRepository(db)
        self.test_repo = TestRepository(db)
        self.package_repo = PackageRepository(db)
        self.service_area_repo = ServiceAreaRepository(db)
        self.family_member_repo = FamilyMemberRepository(db)
        self.settings_repo = SettingsRepository(db)
        self.technician_repo = TechnicianRepository(db)

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
        data = _booking_to_dict(booking)
        await self._enrich_detail(data, booking)
        return data

    async def _enrich_detail(self, data: dict, booking: Booking) -> None:
        """Augment a booking dict with patient, contact, address, slot, lab, payment,
        assigned technician and full status-history timeline for the detail view."""
        from sqlalchemy import select
        from app.models.user import User, FamilyMember, UserAddress
        from app.models.service import TimeSlot, LabBranch, Technician, TechnicianAssignment
        from app.models.payment import Payment
        from app.models.booking import BookingStatusHistory

        # ── Booking owner (contact) ──
        owner = (await self.db.execute(select(User).where(User.id == booking.user_id))).scalar_one_or_none()
        if owner is not None:
            data["contact_name"] = owner.name
            data["contact_phone"] = owner.phone
            data["contact_email"] = owner.email

        # ── Patient (family member, or the account holder when no patient_id) ──
        if booking.patient_id is not None:
            member = (await self.db.execute(select(FamilyMember).where(FamilyMember.id == booking.patient_id))).scalar_one_or_none()
            if member is not None:
                data["patient_name"] = member.name
                data["patient_gender"] = member.gender
                data["patient_relationship"] = member.relationship_type
        elif owner is not None:
            data["patient_name"] = owner.name
            data["patient_gender"] = owner.gender
            data["patient_relationship"] = "Self"

        # ── Address (default address for home collection) ──
        if booking.collection_type == "home":
            addr_q = (
                select(UserAddress)
                .where(UserAddress.user_id == booking.user_id, UserAddress.deleted_at.is_(None))
                .order_by(UserAddress.is_default.desc(), UserAddress.created_at.desc())
            )
            addr = (await self.db.execute(addr_q)).scalars().first()
            if addr is not None:
                data["address"] = {
                    "label": addr.label,
                    "address_line1": addr.address_line1,
                    "address_line2": addr.address_line2,
                    "city": addr.city,
                    "state": addr.state,
                    "pincode": addr.pincode,
                }

        # ── Time slot ──
        slot = (await self.db.execute(select(TimeSlot).where(TimeSlot.id == booking.time_slot_id))).scalar_one_or_none()
        if slot is not None:
            data["time_slot"] = {
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
                "collection_type": slot.collection_type,
            }

        # ── Lab branch ──
        if booking.lab_branch_id is not None:
            branch = (await self.db.execute(select(LabBranch).where(LabBranch.id == booking.lab_branch_id))).scalar_one_or_none()
            if branch is not None:
                data["lab_branch"] = {
                    "name": branch.name,
                    "address": branch.address,
                    "city": branch.city,
                    "pincode": branch.pincode,
                    "phone": branch.phone,
                }

        # ── Payment ──
        payment = (await self.db.execute(select(Payment).where(Payment.booking_id == booking.id))).scalar_one_or_none()
        if payment is not None:
            data["payment"] = {
                "method": payment.method,
                "status": payment.status,
                "amount": float(payment.amount),
                "gst_amount": float(payment.gst_amount),
                "invoice_number": payment.invoice_number,
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            }

        # ── Assigned technician ──
        assignment = (
            await self.db.execute(
                select(TechnicianAssignment).where(TechnicianAssignment.booking_id == booking.id)
            )
        ).scalar_one_or_none()
        if assignment is not None:
            tech = (await self.db.execute(select(Technician).where(Technician.id == assignment.technician_id))).scalar_one_or_none()
            data["assigned_technician"] = {
                "id": str(assignment.technician_id),
                "name": tech.name if tech else None,
                "phone": tech.phone if tech else None,
                "assignment_status": assignment.status,
                "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
            }

        # ── Status history timeline ──
        history_q = (
            select(BookingStatusHistory)
            .where(BookingStatusHistory.booking_id == booking.id)
            .order_by(BookingStatusHistory.changed_at.asc())
        )
        history = (await self.db.execute(history_q)).scalars().all()
        data["status_history"] = [
            {
                "from_status": h.from_status,
                "to_status": h.to_status,
                "reason": h.reason,
                "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            }
            for h in history
        ]

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
        reason: str,
    ) -> dict:
        # Technicians cannot cancel bookings
        if role == "technician":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "FORBIDDEN", "message": "Technicians cannot cancel bookings"},
            )

        # Verify ownership unless admin
        if role != "admin":
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

        # Calculate cancellation charge if a setting is active
        charge = 0.0
        fee_type: str | None = None
        setting = await self.settings_repo.get_active_cancellation_setting()
        if setting:
            booking = await self.repo.get_by_id(booking_id)
            if booking:
                from sqlalchemy import select
                from app.models.payment import Payment
                payment_result = await self.db.execute(
                    select(Payment).where(Payment.booking_id == booking_id)
                )
                payment = payment_result.scalar_one_or_none()
                if payment and payment.status == "paid":
                    total_paid = float(payment.amount) + float(payment.gst_amount)
                    if str(setting.charge_type) == "percentage":
                        charge = round(total_paid * float(setting.charge_value) / 100, 2)
                        fee_type = "percentage"
                    else:
                        charge = float(setting.charge_value)
                        fee_type = "fixed"

        booking = await self.repo.cancel_booking(
            booking_id=booking_id,
            cancelled_by=user_id,
            cancellation_reason=reason,
            cancellation_charge=charge,
            cancellation_fee_type=fee_type,
            is_admin=(role == "admin"),
        )
        logger.info(
            "booking_cancelled: booking_id=%s by user_id=%s role=%s charge=%.2f",
            booking_id, user_id, role, charge,
        )
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
        reason: str | None = None,
    ) -> dict:
        if role not in ("admin", "technician"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "FORBIDDEN", "message": "Access denied"},
            )
        if role == "technician":
            technician = await self.technician_repo.get_by_user_id(changed_by_id)
            assignment = (
                await self.technician_repo.get_assignment_by_booking(booking_id)
                if technician is not None
                else None
            )
            if technician is None or assignment is None or assignment.technician_id != technician.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error_code": "FORBIDDEN",
                        "message": "You are not assigned to this booking",
                    },
                )
        booking = await self.repo.update_status(
            booking_id=booking_id,
            new_status=new_status,
            changed_by=changed_by_id,
            is_admin=(role == "admin"),
            reason=reason,
        )
        return _booking_to_dict(booking)
