"""AuthService: registration, OTP verification, login, logout, token refresh."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.user_repository import SessionRepository, UserRepository
from app.services.otp_service import otp_service
from app.utils.jwt import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_refresh_token,
)

# passlib + bcrypt>=4.0 incompatibility: use bcrypt directly
def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode()[:72], _bcrypt.gensalt(rounds=12)).decode()

def _verify_password(password: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except Exception:
        return False

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"error_code": "INVALID_CREDENTIALS", "message": "Invalid credentials"},
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    async def register(self, phone: str, name: str) -> dict:
        """Check phone not already registered, generate OTP, return message."""
        existing = await self.user_repo.get_by_phone(phone)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "PHONE_ALREADY_REGISTERED", "message": "Phone already registered"},
            )
        otp = otp_service.generate_otp(phone)
        # In production: send OTP via SMS provider
        # For now, log it (dev only)
        import logging
        logging.getLogger("sri.auth").info("OTP for %s: %s", phone, otp)
        return {"message": "OTP sent"}

    async def login_otp(self, phone: str) -> dict:
        """Send OTP to any existing user (user/admin/technician) for login."""
        user = await self.user_repo.get_by_phone(phone)
        if user is None or not user.is_active:
            # Return same message to avoid phone enumeration
            return {"message": "OTP sent if account exists"}
        otp = otp_service.generate_otp(phone)
        import logging
        logging.getLogger("sri.auth").info("Login OTP for %s: %s", phone, otp)
        return {"message": "OTP sent"}

    async def verify_otp(
        self,
        phone: str,
        otp: str,
        name: str | None,
        device_identifier: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        """Verify OTP, create user + session, return tokens."""
        if not otp_service.verify_otp(phone, otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_OTP", "message": "Invalid or expired OTP"},
            )
        # User may already exist (re-verify flow) or be new
        user = await self.user_repo.get_by_phone(phone)
        if user is None:
            resolved_name = name or "User"
            empty_pw_hash = _hash_password("")
            user = await self.user_repo.create_user(
                name=resolved_name,
                phone=phone,
                email=None,
                password_hash=empty_pw_hash,
                role="user",
            )
        return await self._create_session_and_tokens(user, device_identifier, ip_address)

    async def login(
        self,
        phone_or_email: str,
        password: str,
        device_identifier: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        """Find user by phone or email, verify password, return tokens."""
        from app.utils.audit import audit

        user = await self.user_repo.get_by_phone(phone_or_email)
        if user is None:
            user = await self.user_repo.get_by_email(phone_or_email)
        # Use identical error for wrong password vs unknown user (timing-safe)
        if user is None or not _verify_password(password, user.password_hash):
            await audit(
                self.db,
                action_type="USER_LOGIN_FAILURE",
                entity_type="user",
                entity_id=phone_or_email,
                outcome="failure",
                source_ip=ip_address,
            )
            raise _INVALID_CREDENTIALS
        if not user.is_active:
            raise _INVALID_CREDENTIALS

        result = await self._create_session_and_tokens(user, device_identifier, ip_address)
        await audit(
            self.db,
            action_type="USER_LOGIN_SUCCESS",
            entity_type="user",
            entity_id=str(user.id),
            outcome="success",
            actor_id=user.id,
            actor_role=user.role,
            source_ip=ip_address,
        )
        return result

    async def logout(self, session_id: uuid.UUID) -> None:
        """Revoke a specific session."""
        await self.session_repo.revoke_session(session_id)

    async def refresh(self, refresh_token: str) -> dict:
        """Find session by hash, validate, issue new access token, update last_seen."""
        token_hash = hash_refresh_token(refresh_token)
        # We need to find by verifying against stored hashes (bcrypt is not deterministic)
        # Instead, store a SHA-256 lookup hash alongside bcrypt for fast lookup
        # Per design: store bcrypt hash — so we must scan or use a secondary index.
        # The design says get_by_refresh_token_hash(token_hash) — we store bcrypt hash
        # and the token itself is the lookup key. We need a fast lookup.
        # Solution: store SHA-256 of token as the lookup key, bcrypt for verification.
        # But the design says "stored as bcrypt hash" — we'll use SHA-256 for lookup.
        import hashlib
        lookup_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        session = await self.session_repo.get_by_refresh_token_hash(lookup_hash)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_REFRESH_TOKEN", "message": "Invalid or expired refresh token"},
            )
        user = await self.user_repo.get_by_id(session.user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "USER_NOT_FOUND", "message": "User not found"},
            )
        await self.session_repo.update_last_seen(session.id)
        access_token = create_access_token(str(user.id), user.role, user.name)
        return {"access_token": access_token, "token_type": "bearer"}

    async def logout_all(self, user_id: uuid.UUID) -> None:
        """Revoke all sessions for a user."""
        await self.session_repo.revoke_all_user_sessions(user_id)

    async def _create_session_and_tokens(
        self,
        user,
        device_identifier: str | None,
        ip_address: str | None,
    ) -> dict:
        import hashlib
        refresh_token = generate_refresh_token()
        # Use SHA-256 for fast lookup (stored in refresh_token_hash column)
        lookup_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
        await self.session_repo.create_session(
            user_id=user.id,
            refresh_token_hash=lookup_hash,
            device_identifier=device_identifier,
            ip_address=ip_address,
            expires_at=expires_at,
        )
        access_token = create_access_token(str(user.id), user.role, user.name)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
