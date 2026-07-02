"""Pydantic v2 schemas for the quick-help callback-request lead form."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class CallbackRequestCreate(BaseModel):
    name: str | None = None
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be exactly 10 digits")
        return v


class CallbackRequestOut(BaseModel):
    id: uuid.UUID
    name: str | None
    phone: str
    status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CallbackRequestListResponse(BaseModel):
    items: list[CallbackRequestOut]
    total: int
    page: int
    page_size: int


class UpdateCallbackRequestStatus(BaseModel):
    status: Literal["new", "contacted", "closed"]
    notes: str | None = None
