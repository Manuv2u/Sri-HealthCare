"""SettingsRepository — CRUD for admin-configurable settings."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import CancellationSetting


class SettingsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_active_cancellation_setting(self) -> CancellationSetting | None:
        result = await self.db.execute(
            select(CancellationSetting)
            .where(CancellationSetting.is_active.is_(True))
            .order_by(CancellationSetting.updated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def upsert_cancellation_setting(
        self,
        charge_type: str,
        charge_value: float,
        updated_by: uuid.UUID,
    ) -> CancellationSetting:
        # Deactivate all existing active settings
        await self.db.execute(
            update(CancellationSetting)
            .where(CancellationSetting.is_active.is_(True))
            .values(is_active=False)
        )
        now = datetime.now(timezone.utc)
        setting = CancellationSetting(
            id=uuid.uuid4(),
            charge_type=charge_type,
            charge_value=charge_value,
            is_active=True,
            updated_by=updated_by,
            created_at=now,
            updated_at=now,
        )
        self.db.add(setting)
        await self.db.flush()
        await self.db.refresh(setting)
        return setting

    async def disable_cancellation_charges(self) -> None:
        await self.db.execute(
            update(CancellationSetting)
            .where(CancellationSetting.is_active.is_(True))
            .values(is_active=False)
        )
        await self.db.flush()
