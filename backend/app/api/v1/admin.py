"""Admin router — service requests and other admin-only aggregates."""
from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.middleware.auth import require_roles
from app.models.service import ServiceRequest
from app.schemas.service_areas import ServiceRequestOut

router = APIRouter(prefix="/admin", tags=["admin"])


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


# ── Analytics endpoints ───────────────────────────────────────────────────────

from datetime import date as _date
from fastapi.responses import Response as _Response


@router.get("/dashboard")
async def admin_dashboard(
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    from app.services.analytics_service import AnalyticsService
    svc = AnalyticsService(db)
    return await svc.get_dashboard_summary()


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
    svc = AnalyticsService(db)
    return await svc.get_analytics(
        date_from=date_from,
        date_to=date_to,
        service_area_id=service_area_id,
        category=category,
    )


@router.get("/analytics/export")
async def export_analytics_csv(
    date_from: Optional[_date] = None,
    date_to: Optional[_date] = None,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db_session),
) -> _Response:
    from app.services.analytics_service import AnalyticsService
    svc = AnalyticsService(db)
    csv_bytes = await svc.export_csv(date_from=date_from, date_to=date_to)
    return _Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics.csv"},
    )
