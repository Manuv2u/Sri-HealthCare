"""Pydantic v2 schemas for auth endpoints."""
from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be exactly 10 digits")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        special = set("!@#$%^&*()_+-=[]{}|;:,.<>?/")
        if not any(c in special for c in v):
            raise ValueError("Password must contain at least one special character (!@#$%^&* etc.)")
        return v


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    name: str | None = None


class LoginRequest(BaseModel):
    phone_or_email: str
    password: str


class LoginOTPRequest(BaseModel):
    phone: str


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


# TODO(TEMP_PASSWORD_AUTH): Remove these schemas when replacing password-based auth
class ForgotPasswordRequest(BaseModel):
    phone_or_email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
