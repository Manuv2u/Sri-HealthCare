"""Pydantic schemas for packages."""
from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.tests import TestOut


class PackageCreate(BaseModel):
    name: str
    description: str | None = None
    original_price: Decimal
    discounted_price: Decimal
    test_ids: list[uuid.UUID] = []


class PackageUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    original_price: Decimal | None = None
    discounted_price: Decimal | None = None
    is_active: bool | None = None


class PackageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    original_price: Decimal
    discounted_price: Decimal
    is_active: bool
    tests: list[TestOut] = []


class PackageListResponse(BaseModel):
    items: list[PackageOut]
    total: int
    page: int
    page_size: int
