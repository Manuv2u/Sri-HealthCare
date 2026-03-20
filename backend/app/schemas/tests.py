"""Pydantic schemas for tests."""
from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TestCreate(BaseModel):
    name: str
    category: str
    description: str | None = None
    price: Decimal
    discount_percentage: Decimal = Decimal("0")
    turnaround_hours: int


class TestUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    price: Decimal | None = None
    discount_percentage: Decimal | None = None
    turnaround_hours: int | None = None
    is_active: bool | None = None


class TestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    description: str | None
    price: Decimal
    discount_percentage: Decimal
    turnaround_hours: int
    is_active: bool
    effective_price: float


class TestListResponse(BaseModel):
    items: list[TestOut]
    total: int
    page: int
    page_size: int
