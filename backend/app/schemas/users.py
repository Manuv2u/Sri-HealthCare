"""Pydantic v2 schemas for user and family member endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator
from typing import Any


class UserProfileOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    date_of_birth: date | None
    gender: str | None
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None


class FamilyMemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    relationship: str
    date_of_birth: date | None
    gender: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def map_relationship_type(cls, data: Any) -> Any:
        # SQLAlchemy model uses `relationship_type` as Python attr (column is `relationship`)
        if hasattr(data, "relationship_type") and not hasattr(data, "relationship"):
            # Build a dict proxy
            return {
                "id": data.id,
                "user_id": data.user_id,
                "name": data.name,
                "relationship": data.relationship_type,
                "date_of_birth": data.date_of_birth,
                "gender": data.gender,
                "is_active": data.is_active,
                "created_at": data.created_at,
            }
        return data


class AddFamilyMemberRequest(BaseModel):
    name: str
    relationship: str
    date_of_birth: date | None = None
    gender: str | None = None


class UpdateFamilyMemberRequest(BaseModel):
    name: str | None = None
    relationship: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None


class UserAddressOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    label: str
    address_line1: str
    address_line2: str | None
    city: str
    state: str
    pincode: str
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateAddressRequest(BaseModel):
    label: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    is_default: bool = False


class UpdateAddressRequest(BaseModel):
    label: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    is_default: bool | None = None


class UserAddressListResponse(BaseModel):
    items: list[UserAddressOut]
    total: int
    page: int
    page_size: int
