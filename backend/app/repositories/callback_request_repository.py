"""CallbackRequest repository: quick-help lead capture."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.callback_request import CallbackRequest


class CallbackRequestRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, name: str | None, phone: str) -> CallbackRequest:
        req = CallbackRequest(id=uuid.uuid4(), name=name, phone=phone)
        self.db.add(req)
        await self.db.flush()
        await self.db.refresh(req)
        return req

    async def get_by_id(self, request_id: uuid.UUID) -> CallbackRequest | None:
        result = await self.db.execute(
            select(CallbackRequest).where(CallbackRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CallbackRequest], int]:
        base_query = select(CallbackRequest)
        count_query = select(func.count()).select_from(CallbackRequest)

        if status:
            base_query = base_query.where(CallbackRequest.status == status)
            count_query = count_query.where(CallbackRequest.status == status)

        base_query = base_query.order_by(CallbackRequest.created_at.desc())
        offset = (page - 1) * page_size
        base_query = base_query.limit(page_size).offset(offset)

        items_result = await self.db.execute(base_query)
        count_result = await self.db.execute(count_query)
        return list(items_result.scalars().all()), count_result.scalar_one()

    async def update_status(
        self, request_id: uuid.UUID, status: str, notes: str | None
    ) -> CallbackRequest | None:
        req = await self.get_by_id(request_id)
        if req is None:
            return None
        req.status = status
        if notes is not None:
            req.notes = notes
        await self.db.flush()
        await self.db.refresh(req)
        return req
