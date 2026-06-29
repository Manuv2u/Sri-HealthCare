"""Shared fixtures for property-based tests.

We inject lightweight test-only model stubs into sys.modules BEFORE any app
module is imported, so that app.repositories and app.services use the test
models backed by an in-memory SQLite database.

Hypothesis settings:
  - Default profile: max_examples=100  (use `@settings(max_examples=100)`)
  - Concurrency profile: max_examples=200  (use `@settings(max_examples=200)` for P13)
"""
from __future__ import annotations

import sys
import types
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from hypothesis import HealthCheck, settings
from httpx import ASGITransport, AsyncClient
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# ---------------------------------------------------------------------------
# Hypothesis settings profiles
# ---------------------------------------------------------------------------
# Default: 100 examples for most property tests
settings.register_profile("default", max_examples=100, suppress_health_check=[HealthCheck.too_slow])
# Concurrency: 200 examples for P13 (Slot Capacity Invariant) and similar
settings.register_profile("concurrency", max_examples=200, suppress_health_check=[HealthCheck.too_slow])
settings.load_profile("default")


# ---------------------------------------------------------------------------
# Minimal standalone models (avoids broken app/models/__init__.py)
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_temp_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    device_identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    relationship_type: Mapped[str] = mapped_column("relationship", String(50), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(255), nullable=False)
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    extra_metadata: Mapped[str | None] = mapped_column("metadata", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Inject test models into sys.modules BEFORE any app module is imported
# ---------------------------------------------------------------------------

_base_module = types.ModuleType("app.models.base")
_base_module.Base = Base
_base_module.TimestampMixin = object  # stub
sys.modules["app.models.base"] = _base_module

_user_module = types.ModuleType("app.models.user")
_user_module.User = User
_user_module.Session = Session
_user_module.FamilyMember = FamilyMember
_user_module.PasswordResetToken = PasswordResetToken
sys.modules["app.models.user"] = _user_module

_audit_module = types.ModuleType("app.models.audit")
_audit_module.AuditLog = AuditLog
sys.modules["app.models.audit"] = _audit_module

_models_module = types.ModuleType("app.models")
_models_module.User = User
_models_module.Session = Session
_models_module.FamilyMember = FamilyMember
_models_module.PasswordResetToken = PasswordResetToken
_models_module.AuditLog = AuditLog
_models_module.Base = Base
sys.modules["app.models"] = _models_module


@pytest_asyncio.fixture
async def db_session():
    """Provide a fresh in-memory SQLite async session for each test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an httpx AsyncClient wired to a minimal FastAPI app backed by the
    in-memory SQLite test session.  No PostgreSQL or APScheduler required.

    Usage in property tests::

        async def test_something(async_client: AsyncClient) -> None:
            response = await async_client.get("/api/v1/health")
            assert response.status_code == 200
    """
    # Build a minimal app that skips the production lifespan (no APScheduler,
    # no PostgreSQL seed) but registers the same API routers.
    @asynccontextmanager
    async def _test_lifespan(app: FastAPI):  # type: ignore[type-arg]
        yield

    test_app = FastAPI(
        title="SRI Diagnostic Lab — Test",
        version="0.0.0",
        lifespan=_test_lifespan,
    )

    # Override the DB dependency so every request uses the test session.
    from app.database import get_db_session  # noqa: PLC0415

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    test_app.dependency_overrides[get_db_session] = _override_get_db

    # Register API routers (import lazily to avoid triggering production startup).
    from fastapi import APIRouter  # noqa: PLC0415
    from app.api.v1.health import router as health_router  # noqa: PLC0415
    from app.api.v1.auth import router as auth_router  # noqa: PLC0415
    from app.api.v1.users import router as users_router  # noqa: PLC0415
    from app.api.v1.tests import router as tests_router  # noqa: PLC0415
    from app.api.v1.packages import router as packages_router  # noqa: PLC0415

    api_v1 = APIRouter(prefix="/api/v1")
    api_v1.include_router(health_router)
    api_v1.include_router(auth_router)
    api_v1.include_router(users_router)
    api_v1.include_router(tests_router)
    api_v1.include_router(packages_router)
    test_app.include_router(api_v1)

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        yield client
