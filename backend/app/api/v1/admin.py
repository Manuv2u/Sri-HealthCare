"""Admin router — service requests, user management, and analytics."""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.middleware.auth import require_roles
from app.models.service import ServiceRequest
from app.models.user import User
from app.schemas.service_areas import ServiceRequestOut
from app.schemas.users import ChangeUserRoleRequest

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UserAdminOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str]
    email: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[UserAdminOut]


class AuditLogOut(BaseModel):
    id: uuid.UUID
    actor_id: Optional[uuid.UUID]
    actor_role: Optional[str]
    action_type: str
    entity_type: str
    entity_id: str
    outcome: str
    source_ip: Optional[str]
    metadata: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AuditLogOut]


# ── User management ───────────────────────────────────────────────────────────

@router.get("/users", response_model=UserListResponse)
async def list_users(
    role: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None, description="Search by name/phone/email"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> UserListResponse:
    """List all users with optional filters. Admin only."""
    stmt = select(User).where(User.deleted_at.is_(None))
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if q:
        like = f"%{q}%"
        from sqlalchemy import or_
        stmt = stmt.where(
            or_(User.name.ilike(like), User.phone.ilike(like), User.email.ilike(like))
        )

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar_one()

    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    users = result.scalars().all()

    return UserListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[UserAdminOut.model_validate(u) for u in users],
    )


@router.get("/users/stats")
async def user_stats(
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Quick stats: total users, active, inactive, by role."""
    base = select(User).where(User.deleted_at.is_(None))

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    active = (await db.execute(
        select(func.count()).select_from(base.where(User.is_active == True).subquery())
    )).scalar_one()
    by_role_rows = await db.execute(
        select(User.role, func.count()).select_from(base.subquery()).group_by(User.role)
    )
    by_role = {row[0]: row[1] for row in by_role_rows}

    return {"total": total, "active": active, "inactive": total - active, "by_role": by_role}


@router.get("/users/{user_id}", response_model=UserAdminOut)
async def get_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> UserAdminOut:
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if user is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserAdminOut.model_validate(user)


@router.patch("/users/{user_id}/activate")
async def activate_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = True
    await db.flush()
    return {"message": "User activated"}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: uuid.UUID,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    # Cut off any already-issued access tokens immediately rather than
    # waiting out their remaining TTL.
    user.tokens_invalidated_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "User deactivated"}


@router.patch("/users/{user_id}/change-role")
async def change_user_role(
    user_id: uuid.UUID,
    body: ChangeUserRoleRequest,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Toggle a user's role between "user" (patient) and "technician".

    Converting to technician creates (or reactivates a previously
    soft-deleted) Technician profile linked to this user, reusing the same
    User+Technician linkage as POST /technicians/create-account. Converting
    back to "user" soft-deletes that profile so they drop out of assignment
    pools (auto-assign, technician list) immediately.
    """
    from fastapi import HTTPException, status as http_status
    from app.models.service import Technician
    from app.repositories.technician_repository import TechnicianRepository

    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == body.new_role:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "ROLE_UNCHANGED", "message": f"User already has role '{body.new_role}'"},
        )
    if user.role not in ("user", "technician"):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": "UNSUPPORTED_ROLE_CHANGE", "message": "Only user/technician roles can be toggled here"},
        )

    tech_repo = TechnicianRepository(db)

    if body.new_role == "technician":
        # Look up any existing Technician profile for this user, including a
        # soft-deleted one from a prior user->technician->user round trip.
        existing_result = await db.execute(select(Technician).where(Technician.user_id == user_id))
        existing = existing_result.scalar_one_or_none()
        if existing is not None:
            existing.is_active = True
            existing.deleted_at = None
        else:
            await tech_repo.create(user_id=user.id, name=user.name, phone=user.phone or "", email=user.email or "")
        user.role = "technician"
    else:
        tech = await tech_repo.get_by_user_id(user_id)
        if tech is not None:
            await tech_repo.soft_delete(tech.id)
        user.role = "user"

    await db.commit()
    return {"message": f"User role changed to '{body.new_role}'"}


# ── Service requests ──────────────────────────────────────────────────────────

@router.get("/service-requests")
async def list_pending_service_requests(
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    result = await db.execute(
        select(ServiceRequest).where(ServiceRequest.notified_at.is_(None))
    )
    requests = result.scalars().all()
    grouped: dict[str, list] = defaultdict(list)
    for req in requests:
        grouped[req.pincode].append(ServiceRequestOut.model_validate(req))
    return [{"pincode": p, "count": len(r), "requests": r} for p, r in grouped.items()]


# ── Audit logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    actor_id: Optional[uuid.UUID] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    outcome: Optional[str] = None,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> AuditLogListResponse:
    from app.repositories.audit_repository import AuditLogRepository
    repo = AuditLogRepository(db)
    items, total = await repo.query(
        actor_id=actor_id, action_type=action_type, entity_type=entity_type,
        outcome=outcome, from_dt=from_dt, to_dt=to_dt, limit=limit, offset=offset,
    )
    return AuditLogListResponse(
        total=total, limit=limit, offset=offset,
        items=[AuditLogOut.model_validate(i) for i in items],
    )


# ── Analytics ─────────────────────────────────────────────────────────────────

from datetime import date as _date
from fastapi.responses import Response as _Response


@router.get("/dashboard")
async def admin_dashboard(
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    from app.services.analytics_service import AnalyticsService
    return await AnalyticsService(db).get_dashboard_summary()


@router.get("/analytics")
async def admin_analytics(
    date_from: Optional[_date] = None,
    date_to: Optional[_date] = None,
    service_area_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    from app.services.analytics_service import AnalyticsService
    return await AnalyticsService(db).get_analytics(
        date_from=date_from, date_to=date_to,
        service_area_id=service_area_id, category=category,
    )


@router.get("/analytics/export")
async def export_analytics_csv(
    date_from: Optional[_date] = None,
    date_to: Optional[_date] = None,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> _Response:
    from app.services.analytics_service import AnalyticsService
    csv_bytes = await AnalyticsService(db).export_csv(date_from=date_from, date_to=date_to)
    return _Response(content=csv_bytes, media_type="text/csv",
                     headers={"Content-Disposition": "attachment; filename=analytics.csv"})



@router.get("/service-requests")
async def list_pending_service_requests(
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    """Return pending service requests grouped by pincode."""
    result = await db.execute(
        select(ServiceRequest).where(ServiceRequest.notified_at.is_(None))
    )
    requests = result.scalars().all()

    grouped: dict[str, list] = defaultdict(list)
    for req in requests:
        grouped[req.pincode].append(ServiceRequestOut.model_validate(req))

    return [
        {
            "pincode": pincode,
            "count": len(reqs),
            "requests": reqs,
        }
        for pincode, reqs in grouped.items()
    ]


import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: uuid.UUID
    actor_id: Optional[uuid.UUID]
    actor_role: Optional[str]
    action_type: str
    entity_type: str
    entity_id: str
    outcome: str
    source_ip: Optional[str]
    metadata: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AuditLogOut]


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    actor_id: Optional[uuid.UUID] = None,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    outcome: Optional[str] = None,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> AuditLogListResponse:
    from app.repositories.audit_repository import AuditLogRepository

    repo = AuditLogRepository(db)
    items, total = await repo.query(
        actor_id=actor_id,
        action_type=action_type,
        entity_type=entity_type,
        outcome=outcome,
        from_dt=from_dt,
        to_dt=to_dt,
        limit=limit,
        offset=offset,
    )
    return AuditLogListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[AuditLogOut.model_validate(item) for item in items],
    )
