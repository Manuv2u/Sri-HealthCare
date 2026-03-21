"""BookingRepository — atomic booking operations."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking, BookingItem, BookingSlotCount, BookingStatusHistory
from app.models.payment import Payment
from app.models.service import TimeSlot


# Valid state machine transitions
_VALID_TRANSITIONS: dict[str, str] = {
    "booked": "collected",
    "collected": "processing",
    "processing": "completed",
}

# Timestamp field to set per transition
_TRANSITION_TIMESTAMPS: dict[str, str] = {
    "collected": "collected_at",
    "processing": "processing_started_at",
    "completed": "completed_at",
    "cancelled": "cancelled_at",
}


class BookingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── helpers ──────────────────────────────────────────────────────────────

    async def _get_booking_with_items(self, booking_id: uuid.UUID) -> Booking | None:
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.items))
            .where(Booking.id == booking_id)
        )
        return result.scalar_one_or_none()

    async def _get_slot(self, time_slot_id: uuid.UUID) -> TimeSlot | None:
        result = await self.db.execute(
            select(TimeSlot).where(TimeSlot.id == time_slot_id)
        )
        return result.scalar_one_or_none()

    async def _check_cancellation_window(
        self, booking: Booking, slot: TimeSlot
    ) -> None:
        """Raise 422 if the booking is within 2 hours of the slot start."""
        slot_dt = datetime.combine(booking.booking_date, slot.start_time).replace(
            tzinfo=timezone.utc
        )
        if datetime.now(timezone.utc) + timedelta(hours=2) >= slot_dt:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "CANCELLATION_WINDOW_EXPIRED",
                    "message": "Cancellation/reschedule must be at least 2 hours before the slot",
                },
            )

    # ── create ────────────────────────────────────────────────────────────────

    async def create_booking_atomic(
        self,
        user_id: uuid.UUID,
        patient_id: uuid.UUID | None,
        collection_type: str,
        time_slot_id: uuid.UUID,
        booking_date: date,
        lab_branch_id: uuid.UUID | None,
        pincode: str | None,
        items: list[dict],
        gst_rate: float = 0.18,
    ) -> Booking:
        """
        Atomically create a booking with slot capacity enforcement.
        Uses SELECT FOR UPDATE on booking_slot_counts.
        """
        # Lock the slot count row (or create it)
        result = await self.db.execute(
            text(
                "SELECT confirmed_count FROM booking_slot_counts "
                "WHERE time_slot_id = :ts_id AND booking_date = :bd "
                "FOR UPDATE"
            ),
            {"ts_id": str(time_slot_id), "bd": booking_date},
        )
        row = result.fetchone()

        if row is None:
            # Insert with count=0 then re-lock
            await self.db.execute(
                text(
                    "INSERT INTO booking_slot_counts (time_slot_id, booking_date, confirmed_count) "
                    "VALUES (:ts_id, :bd, 0) "
                    "ON CONFLICT (time_slot_id, booking_date) DO NOTHING"
                ),
                {"ts_id": str(time_slot_id), "bd": booking_date},
            )
            result = await self.db.execute(
                text(
                    "SELECT confirmed_count FROM booking_slot_counts "
                    "WHERE time_slot_id = :ts_id AND booking_date = :bd "
                    "FOR UPDATE"
                ),
                {"ts_id": str(time_slot_id), "bd": booking_date},
            )
            row = result.fetchone()

        confirmed_count = row[0]

        # Check capacity
        slot_result = await self.db.execute(
            select(TimeSlot).where(TimeSlot.id == time_slot_id)
        )
        slot = slot_result.scalar_one_or_none()
        if slot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "SLOT_NOT_FOUND", "message": "Time slot not found"},
            )

        if confirmed_count >= slot.slot_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "SLOT_CAPACITY_EXCEEDED",
                    "message": "No available capacity for the selected time slot",
                },
            )

        # Increment slot count
        await self.db.execute(
            text(
                "UPDATE booking_slot_counts SET confirmed_count = confirmed_count + 1 "
                "WHERE time_slot_id = :ts_id AND booking_date = :bd"
            ),
            {"ts_id": str(time_slot_id), "bd": booking_date},
        )

        # Generate reference number
        ref_result = await self.db.execute(
            text(
                "SELECT 'SRI-' || EXTRACT(YEAR FROM NOW())::text || '-' || "
                "LPAD(nextval('booking_reference_seq')::text, 6, '0')"
            )
        )
        reference_number: str = ref_result.scalar_one()

        # Insert booking
        booking_id = uuid.uuid4()
        booking = Booking(
            id=booking_id,
            reference_number=reference_number,
            user_id=user_id,
            patient_id=patient_id,
            collection_type=collection_type,
            time_slot_id=time_slot_id,
            booking_date=booking_date,
            lab_branch_id=lab_branch_id,
            pincode=pincode,
            status="booked",
            payment_status="pending",
        )
        self.db.add(booking)
        await self.db.flush()

        # Insert booking items
        total_amount = 0.0
        for item in items:
            bi = BookingItem(
                id=uuid.uuid4(),
                booking_id=booking_id,
                item_type=item["item_type"],
                test_id=item.get("test_id"),
                package_id=item.get("package_id"),
                unit_price=item["unit_price"],
            )
            self.db.add(bi)
            total_amount += float(item["unit_price"])

        await self.db.flush()

        # Insert payment
        gst_amount = round(total_amount * gst_rate, 2)
        payment = Payment(
            id=uuid.uuid4(),
            booking_id=booking_id,
            method="pending",
            status="pending",
            amount=total_amount,
            gst_amount=gst_amount,
        )
        self.db.add(payment)

        # Insert status history
        history = BookingStatusHistory(
            id=uuid.uuid4(),
            booking_id=booking_id,
            from_status=None,
            to_status="booked",
            changed_by=user_id,
            changed_at=datetime.now(timezone.utc),
        )
        self.db.add(history)

        await self.db.flush()
        await self.db.refresh(booking)

        # Load items relationship
        return await self._get_booking_with_items(booking_id)  # type: ignore[return-value]

    # ── read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, booking_id: uuid.UUID) -> Booking | None:
        return await self._get_booking_with_items(booking_id)

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Booking], int]:
        count_result = await self.db.execute(
            select(func.count()).where(Booking.user_id == user_id)
        )
        total = count_result.scalar_one()

        offset = (page - 1) * page_size
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.items))
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return list(result.scalars().all()), total

    async def list_all(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Booking], int]:
        count_result = await self.db.execute(select(func.count()).select_from(Booking))
        total = count_result.scalar_one()

        offset = (page - 1) * page_size
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.items))
            .order_by(Booking.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return list(result.scalars().all()), total

    # ── cancel ────────────────────────────────────────────────────────────────

    async def cancel_booking(
        self, booking_id: uuid.UUID, cancelled_by: uuid.UUID
    ) -> Booking:
        booking = await self._get_booking_with_items(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )
        if booking.status != "booked":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "INVALID_STATUS_TRANSITION",
                    "message": f"Cannot cancel a booking with status '{booking.status}'",
                },
            )

        slot = await self._get_slot(booking.time_slot_id)
        if slot:
            await self._check_cancellation_window(booking, slot)

        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(Booking)
            .where(Booking.id == booking_id)
            .values(status="cancelled", cancelled_at=now)
        )

        # Decrement slot count
        await self.db.execute(
            text(
                "UPDATE booking_slot_counts SET confirmed_count = GREATEST(confirmed_count - 1, 0) "
                "WHERE time_slot_id = :ts_id AND booking_date = :bd"
            ),
            {"ts_id": str(booking.time_slot_id), "bd": booking.booking_date},
        )

        # Status history
        self.db.add(
            BookingStatusHistory(
                id=uuid.uuid4(),
                booking_id=booking_id,
                from_status="booked",
                to_status="cancelled",
                changed_by=cancelled_by,
                changed_at=now,
            )
        )
        await self.db.flush()
        return await self._get_booking_with_items(booking_id)  # type: ignore[return-value]

    # ── reschedule ────────────────────────────────────────────────────────────

    async def reschedule_booking(
        self,
        booking_id: uuid.UUID,
        new_time_slot_id: uuid.UUID,
        new_booking_date: date,
        rescheduled_by: uuid.UUID,
    ) -> Booking:
        booking = await self._get_booking_with_items(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )
        if booking.status != "booked":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "INVALID_STATUS_TRANSITION",
                    "message": f"Cannot reschedule a booking with status '{booking.status}'",
                },
            )

        old_slot = await self._get_slot(booking.time_slot_id)
        if old_slot:
            await self._check_cancellation_window(booking, old_slot)

        # Lock new slot count
        result = await self.db.execute(
            text(
                "SELECT confirmed_count FROM booking_slot_counts "
                "WHERE time_slot_id = :ts_id AND booking_date = :bd FOR UPDATE"
            ),
            {"ts_id": str(new_time_slot_id), "bd": new_booking_date},
        )
        row = result.fetchone()

        if row is None:
            await self.db.execute(
                text(
                    "INSERT INTO booking_slot_counts (time_slot_id, booking_date, confirmed_count) "
                    "VALUES (:ts_id, :bd, 0) ON CONFLICT (time_slot_id, booking_date) DO NOTHING"
                ),
                {"ts_id": str(new_time_slot_id), "bd": new_booking_date},
            )
            result = await self.db.execute(
                text(
                    "SELECT confirmed_count FROM booking_slot_counts "
                    "WHERE time_slot_id = :ts_id AND booking_date = :bd FOR UPDATE"
                ),
                {"ts_id": str(new_time_slot_id), "bd": new_booking_date},
            )
            row = result.fetchone()

        new_slot_result = await self.db.execute(
            select(TimeSlot).where(TimeSlot.id == new_time_slot_id)
        )
        new_slot = new_slot_result.scalar_one_or_none()
        if new_slot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "SLOT_NOT_FOUND", "message": "New time slot not found"},
            )

        if row[0] >= new_slot.slot_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "SLOT_CAPACITY_EXCEEDED",
                    "message": "No available capacity for the new time slot",
                },
            )

        # Decrement old slot count
        await self.db.execute(
            text(
                "UPDATE booking_slot_counts SET confirmed_count = GREATEST(confirmed_count - 1, 0) "
                "WHERE time_slot_id = :ts_id AND booking_date = :bd"
            ),
            {"ts_id": str(booking.time_slot_id), "bd": booking.booking_date},
        )

        # Increment new slot count
        await self.db.execute(
            text(
                "UPDATE booking_slot_counts SET confirmed_count = confirmed_count + 1 "
                "WHERE time_slot_id = :ts_id AND booking_date = :bd"
            ),
            {"ts_id": str(new_time_slot_id), "bd": new_booking_date},
        )

        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(Booking)
            .where(Booking.id == booking_id)
            .values(
                time_slot_id=new_time_slot_id,
                booking_date=new_booking_date,
                status="booked",
            )
        )

        self.db.add(
            BookingStatusHistory(
                id=uuid.uuid4(),
                booking_id=booking_id,
                from_status="booked",
                to_status="booked",
                changed_by=rescheduled_by,
                changed_at=now,
            )
        )
        await self.db.flush()
        return await self._get_booking_with_items(booking_id)  # type: ignore[return-value]

    # ── update status ─────────────────────────────────────────────────────────

    async def update_status(
        self,
        booking_id: uuid.UUID,
        new_status: str,
        changed_by: uuid.UUID,
    ) -> Booking:
        booking = await self._get_booking_with_items(booking_id)
        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "BOOKING_NOT_FOUND", "message": "Booking not found"},
            )

        expected_from = _VALID_TRANSITIONS.get(booking.status)
        if expected_from != new_status:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error_code": "INVALID_STATUS_TRANSITION",
                    "message": (
                        f"Cannot transition from '{booking.status}' to '{new_status}'. "
                        f"Valid next status: '{expected_from}'"
                    ),
                },
            )

        now = datetime.now(timezone.utc)
        update_values: dict = {"status": new_status}
        ts_field = _TRANSITION_TIMESTAMPS.get(new_status)
        if ts_field:
            update_values[ts_field] = now

        await self.db.execute(
            update(Booking).where(Booking.id == booking_id).values(**update_values)
        )

        self.db.add(
            BookingStatusHistory(
                id=uuid.uuid4(),
                booking_id=booking_id,
                from_status=booking.status,
                to_status=new_status,
                changed_by=changed_by,
                changed_at=now,
            )
        )
        await self.db.flush()
        return await self._get_booking_with_items(booking_id)  # type: ignore[return-value]
