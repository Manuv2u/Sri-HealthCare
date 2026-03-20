"""Pydantic v2 schemas for user and family member endpoints."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel


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
    created_at: datetime

    model_config = {"from_attributes": True}


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
