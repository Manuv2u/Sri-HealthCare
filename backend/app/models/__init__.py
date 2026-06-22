# Models package — import all models here so Alembic can detect them
from app.models.base import Base, TimestampMixin
from app.models.user import FamilyMember, PasswordResetToken, Session, User  # TODO(TEMP_PASSWORD_AUTH): remove PasswordResetToken
from app.models.test import Package, PackageTest, Test
from app.models.service import (
    LabBranch,
    ServiceArea,
    ServiceRequest,
    Technician,
    TechnicianAssignment,
    TechnicianServiceArea,
    TimeSlot,
)
from app.models.booking import Booking, BookingItem, BookingSlotCount, BookingStatusHistory
from app.models.payment import Payment, Refund
from app.models.report import Report
from app.models.notification import Notification
from app.models.audit import AuditLog, FeatureFlag
from app.models.archive import BookingArchive, PaymentArchive
from app.models.settings import CancellationSetting

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "Session",
    "FamilyMember",
    "PasswordResetToken",
    "Test",
    "Package",
    "PackageTest",
    "ServiceArea",
    "ServiceRequest",
    "LabBranch",
    "TimeSlot",
    "Technician",
    "TechnicianServiceArea",
    "TechnicianAssignment",
    "Booking",
    "BookingItem",
    "BookingSlotCount",
    "BookingStatusHistory",
    "Payment",
    "Refund",
    "Report",
    "Notification",
    "AuditLog",
    "FeatureFlag",
    "BookingArchive",
    "PaymentArchive",
    "CancellationSetting",
]
