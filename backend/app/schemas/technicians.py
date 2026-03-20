"""Pydantic schemas for technician endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TechnicianCreate(BaseModel):
    user_id: uuid.UUID | None = None
    name: str
    phone: str
    email: str


class TechnicianUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class TechnicianOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    name: str
    phone: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TechnicianListResponse(BaseModel):
    items: list[TechnicianOut]
    total: int
    page: int
    page_size: int


class AssignRequest(BaseModel):
    booking_id: uuid.UUID


class WorkloadItem(BaseModel):
    technician_id: uuid.UUID
    name: str
    booking_count: int
