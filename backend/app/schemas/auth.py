"""Pydantic v2 schemas for auth endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    phone: str
    name: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    name: str | None = None


class LoginRequest(BaseModel):
    phone_or_email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class SessionOut(BaseModel):
    id: uuid.UUID
    device_identifier: str | None
    ip_address: str | None
    last_seen_at: datetime
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
