"""InvoiceService — generates PDF invoices using reportlab."""
from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger("sri.invoice")


class InvoiceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def generate_pdf(self, payment_id: uuid.UUID) -> bytes:
        """Generate invoice PDF; return raw bytes."""
        from sqlalchemy import select

        from app.models.booking import Booking, BookingItem
        from app.models.payment import Payment
        from app.models.user import User

        # Fetch payment + booking + user
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()
        if payment is None:
            raise ValueError(f"Payment {payment_id} not found")

        result = await self.db.execute(select(Booking).where(Booking.id == payment.booking_id))
        booking = result.scalar_one_or_none()

        result = await self.db.execute(select(User).where(User.id == booking.user_id))
        user = result.scalar_one_or_none()

        result = await self.db.execute(
            select(BookingItem).where(BookingItem.booking_id == booking.id)
        )
        items = list(result.scalars().all())

        return _build_pdf(payment, booking, user, items)


def _build_pdf(payment, booking, user, items) -> bytes:  # type: ignore[no-untyped-def]
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError:
        logger.warning("reportlab not installed; returning placeholder PDF")
        return _placeholder_pdf(payment, booking, user, items)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm,
                             topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("SRI Diagnostic Laboratory & Health Care", styles["Title"]))
    story.append(Paragraph(f"Invoice #{payment.invoice_number or str(payment.id)[:8].upper()}", styles["Heading2"]))
    story.append(Spacer(1, 6 * mm))

    meta = [
        ["Booking Reference:", booking.reference_number],
        ["Patient Name:", user.name if user else "N/A"],
        ["Booking Date:", str(booking.booking_date)],
        ["Payment Method:", payment.method.upper()],
        ["Invoice Date:", datetime.now(timezone.utc).strftime("%Y-%m-%d")],
    ]
    story.append(Table(meta, colWidths=[60 * mm, 100 * mm]))
    story.append(Spacer(1, 6 * mm))

    # Line items
    table_data = [["Description", "Unit Price (₹)"]]
    for item in items:
        if item.test is not None:
            label = item.test.name
        elif item.package is not None:
            label = item.package.name
        else:
            label = f"Item {item.id}"
        table_data.append([label, f"{item.unit_price:.2f}"])

    subtotal = float(payment.amount) - float(payment.gst_amount)
    table_data.append(["Subtotal", f"{subtotal:.2f}"])
    table_data.append([f"GST ({settings.gst_rate * 100:.0f}%)", f"{float(payment.gst_amount):.2f}"])
    table_data.append(["Total", f"{float(payment.amount):.2f}"])

    t = Table(table_data, colWidths=[120 * mm, 40 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    story.append(t)

    doc.build(story)
    return buf.getvalue()


def _placeholder_pdf(payment, booking, user, items) -> bytes:  # type: ignore[no-untyped-def]
    """Minimal PDF without reportlab (for environments where it's not installed)."""
    lines = [
        "%PDF-1.4",
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
        f"3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<<>>>>endobj",
        f"4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Invoice {payment.invoice_number}) Tj ET\nendstream\nendobj",
        "xref\n0 5",
        "trailer<</Size 5/Root 1 0 R>>",
        "startxref\n0",
        "%%EOF",
    ]
    return "\n".join(lines).encode()
