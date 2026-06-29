# TODO(TEMP_PASSWORD_AUTH): Remove this entire file when replacing password-based auth.
"""Password reset service: forgot-password and reset-password flows."""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import PasswordResetTokenRepository, UserRepository

logger = logging.getLogger("sri.auth")

_RESET_TOKEN_EXPIRE_MINUTES = 15


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode()[:72], _bcrypt.gensalt(rounds=12)).decode()


class PasswordResetService:  # TODO(TEMP_PASSWORD_AUTH)
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = PasswordResetTokenRepository(db)

    async def forgot_password(self, phone_or_email: str) -> dict:
        """Generate a reset token. Always returns success to prevent enumeration."""
        user = await self.user_repo.get_by_phone(phone_or_email)
        if user is None:
            user = await self.user_repo.get_by_email(phone_or_email)

        if user is None or not user.is_active:
            # Don't reveal whether the account exists
            return {"message": "If that account exists, a reset link has been sent."}

        # Invalidate any existing tokens for this user
        await self.token_repo.invalidate_user_tokens(user.id)

        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_EXPIRE_MINUTES)
        await self.token_repo.create(user.id, token_hash, expires_at)

        # TODO(TEMP_PASSWORD_AUTH): Replace with real email/SMS when SMTP is configured.
        reset_url = f"/auth/reset-password?token={raw_token}"
        logger.warning("🔑 Password reset token for %s → %s  (reset URL: %s)", phone_or_email, raw_token, reset_url)

        return {"message": "If that account exists, a reset link has been sent."}

    async def reset_password(self, raw_token: str, new_password: str) -> dict:
        """Validate token and set new password."""
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error_code": "WEAK_PASSWORD", "message": "Password must be at least 8 characters"},
            )

        token_hash = _hash_token(raw_token)
        token = await self.token_repo.get_valid_by_hash(token_hash)
        if token is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_RESET_TOKEN", "message": "Reset token is invalid or expired"},
            )

        new_hash = _hash_password(new_password)
        await self.user_repo.update(token.user_id, password_hash=new_hash, is_temp_password=False)
        await self.token_repo.mark_used(token.id)
        return {"message": "Password updated successfully"}
