"""AnalyticsService — dashboard summary, analytics, CSV export."""
from __future__ import annotations

import csv
import io
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.payment import Payment
from app.models.user import User


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_dashboard_summary(self) -> dict:
        now = datetime.now(timezone.utc)
        today = now.date()
        month_start = today.replace(day=1)

        # Total users
        total_users_result = await self.db.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None))
        )
        total_users = total_users_result.scalar_one()

        # Bookings today
        bookings_today_result = await self.db.execute(
            select(func.count(Booking.id)).where(Booking.booking_date == today)
        )
        bookings_today = bookings_today_result.scalar_one()

        # Bookings this month
        bookings_month_result = await self.db.execute(
            select(func.count(Booking.id)).where(Booking.booking_date >= month_start)
        )
        bookings_month = bookings_month_result.scalar_one()

        # Revenue today (paid payments)
        rev_today_result = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .join(Booking, Booking.id == Payment.booking_id)
            .where(Payment.status == "paid", Booking.booking_date == today)
        )
        revenue_today = float(rev_today_result.scalar_one())

        # Revenue this month
        rev_month_result = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .join(Booking, Booking.id == Payment.booking_id)
            .where(Payment.status == "paid", Booking.booking_date >= month_start)
        )
        revenue_month = float(rev_month_result.scalar_one())

        # Pending bookings
        pending_result = await self.db.execute(
            select(func.count(Booking.id)).where(Booking.status == "pending")
        )
        pending_count = pending_result.scalar_one()

        return {
            "total_users": total_users,
            "bookings_today": bookings_today,
            "bookings_month": bookings_month,
            "revenue_today": revenue_today,
            "revenue_month": revenue_month,
            "pending_bookings": pending_count,
        }

    async def get_analytics(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
        service_area_id: uuid.UUID | None = None,
        category: str | None = None,
    ) -> dict:
        # Bookings by status
        status_query = select(
            Booking.status, func.count(Booking.id).label("count")
        )
        if date_from:
            status_query = status_query.where(Booking.booking_date >= date_from)
        if date_to:
            status_query = status_query.where(Booking.booking_date <= date_to)
        status_query = status_query.group_by(Booking.status)

        status_result = await self.db.execute(status_query)
        bookings_by_status = {row.status: row.count for row in status_result.all()}

        # Revenue by payment method
        rev_query = select(
            Payment.method,
            func.coalesce(func.sum(Payment.amount), 0).label("total"),
        ).where(Payment.status == "paid")
        if date_from or date_to:
            rev_query = rev_query.join(Booking, Booking.id == Payment.booking_id)
            if date_from:
                rev_query = rev_query.where(Booking.booking_date >= date_from)
            if date_to:
                rev_query = rev_query.where(Booking.booking_date <= date_to)
        rev_query = rev_query.group_by(Payment.method)

        rev_result = await self.db.execute(rev_query)
        revenue_by_method = {row.method: float(row.total) for row in rev_result.all()}

        return {
            "bookings_by_status": bookings_by_status,
            "revenue_by_method": revenue_by_method,
        }

    async def export_csv(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> bytes:
        """Stream CSV of booking + payment records."""
        from app.models.booking import BookingItem

        query = (
            select(
                Booking.reference_number,
                Booking.booking_date,
                Booking.status,
                Booking.collection_type,
                Booking.total_amount,
                Payment.method,
                Payment.status.label("payment_status"),
                Payment.amount.label("payment_amount"),
                Payment.invoice_number,
            )
            .outerjoin(Payment, Payment.booking_id == Booking.id)
        )
        if date_from:
            query = query.where(Booking.booking_date >= date_from)
        if date_to:
            query = query.where(Booking.booking_date <= date_to)
        query = query.order_by(Booking.booking_date.desc())

        result = await self.db.execute(query)
        rows = result.all()

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "reference_number", "booking_date", "status", "collection_type",
            "total_amount", "payment_method", "payment_status",
            "payment_amount", "invoice_number",
        ])
        for row in rows:
            writer.writerow([
                row.reference_number,
                row.booking_date,
                row.status,
                row.collection_type,
                row.total_amount,
                row.method,
                row.payment_status,
                row.payment_amount,
                row.invoice_number,
            ])

        return buf.getvalue().encode("utf-8")
