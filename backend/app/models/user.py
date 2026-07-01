import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

# TODO(TEMP_PASSWORD_AUTH): Remove PasswordResetToken class when replacing password auth


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    is_temp_password: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Access tokens issued before this timestamp are rejected (deactivation / logout-all revocation)
    tokens_invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user")
    family_members: Mapped[list["FamilyMember"]] = relationship(
        "FamilyMember", back_populates="user"
    )
    addresses: Mapped[list["UserAddress"]] = relationship("UserAddress", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    device_identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    relationship_type: Mapped[str] = mapped_column("relationship", String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="family_members")


class UserAddress(Base):
    __tablename__ = "user_addresses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="addresses")


class PasswordResetToken(Base):  # TODO(TEMP_PASSWORD_AUTH)
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
