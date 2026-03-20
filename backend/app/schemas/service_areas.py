"""Pydantic v2 schemas for service areas and service requests."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ServiceAreaCreate(BaseModel):
    district: str
    city: str
    pincode: str


class ServiceAreaUpdate(BaseModel):
    district: str | None = None
    city: str | None = None
    pincode: str | None = None
    is_active: bool | None = None


class ServiceAreaOut(BaseModel):
    id: uuid.UUID
    district: str
    city: str
    pincode: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ServiceAreaListResponse(BaseModel):
    items: list[ServiceAreaOut]
    total: int
    page: int
    page_size: int


class NotifyMeRequest(BaseModel):
    pincode: str


class ServiceRequestOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    pincode: str
    created_at: datetime

    model_config = {"from_attributes": True}
