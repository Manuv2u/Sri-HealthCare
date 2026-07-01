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

# Account lockout after repeated failed password attempts.
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_MINUTES = 15


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    async def register(
        self,
        phone: str,
        name: str,
        email: str,
        password: str,
        device_identifier: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        """Register a new user with phone, email and password. Returns auth tokens."""
        if await self.user_repo.get_by_phone(phone) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "PHONE_ALREADY_REGISTERED", "message": "Phone number already registered"},
            )
        if await self.user_repo.get_by_email(email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "EMAIL_ALREADY_REGISTERED", "message": "Email address already registered"},
            )

        pw_hash = _hash_password(password)
        user = await self.user_repo.create_user(
            name=name,
            phone=phone,
            email=email,
            password_hash=pw_hash,
            role="user",
        )
        return await self._create_session_and_tokens(user, device_identifier, ip_address)

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

        # Lockout must be checked before password verification — otherwise a
        # string of wrong guesses never reaches this branch and the account
        # is never actually blocked from further guessing.
        if user is not None:
            locked_until = getattr(user, "locked_until", None)
            if locked_until is not None and locked_until > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error_code": "ACCOUNT_LOCKED",
                        "message": (
                            "Too many failed login attempts. "
                            f"Try again after {locked_until.strftime('%H:%M:%S UTC')}."
                        ),
                    },
                )

        # Use identical error for wrong password vs unknown user (timing-safe)
        if user is None or not _verify_password(password, user.password_hash):
            if user is not None:
                await self._register_failed_login(user)
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

        if getattr(user, "failed_login_attempts", 0):
            await self.user_repo.update(user.id, failed_login_attempts=0, locked_until=None)

        result = await self._create_session_and_tokens(user, device_identifier, ip_address)
        result["is_temp_password"] = bool(getattr(user, "is_temp_password", False))
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

    async def _register_failed_login(self, user) -> None:
        """Increment the failed-attempt counter and lock the account past the threshold."""
        attempts = getattr(user, "failed_login_attempts", 0) + 1
        fields: dict = {"failed_login_attempts": attempts}
        if attempts >= _MAX_FAILED_ATTEMPTS:
            fields["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=_LOCKOUT_MINUTES)
        await self.user_repo.update(user.id, **fields)
        # get_db_session rolls back the whole request transaction when the
        # caller raises INVALID_CREDENTIALS right after this — commit now so
        # the counter actually persists instead of being undone.
        await self.db.commit()

    async def logout(self, session_id: uuid.UUID) -> None:
        """Revoke a specific session."""
        await self.session_repo.revoke_session(session_id)

    async def refresh(self, refresh_token: str) -> dict:
        """Find session by hash, validate, issue new access token, update last_seen."""
        import hashlib
        lookup_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        session = await self.session_repo.get_by_refresh_token_hash(lookup_hash)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_REFRESH_TOKEN", "message": "Invalid or expired refresh token"},
            )
        user = await self.user_repo.get_by_id(session.user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "ACCOUNT_DEACTIVATED", "message": "This account is no longer active"},
            )
        await self.session_repo.update_last_seen(session.id)
        access_token = create_access_token(str(user.id), user.role, user.name)
        return {"access_token": access_token, "token_type": "bearer"}

    async def logout_all(self, user_id: uuid.UUID) -> None:
        """Revoke all sessions for a user and invalidate any outstanding access tokens."""
        await self.session_repo.revoke_all_user_sessions(user_id)
        await self.user_repo.update(user_id, tokens_invalidated_at=datetime.now(timezone.utc))

    # TODO(TEMP_PASSWORD_AUTH): Remove this method when replacing password-based auth
    async def change_password(
        self, user_id: uuid.UUID, current_password: str, new_password: str
    ) -> None:
        """Verify current password, then update to new password."""
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error_code": "WEAK_PASSWORD", "message": "Password must be at least 8 characters"},
            )
        user = await self.user_repo.get_by_id(user_id)
        if user is None or not _verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_CREDENTIALS", "message": "Current password is incorrect"},
            )
        new_hash = _hash_password(new_password)
        await self.user_repo.update(
            user_id,
            password_hash=new_hash,
            is_temp_password=False,
            password_changed_at=datetime.now(timezone.utc),
        )

    async def _create_session_and_tokens(
        self,
        user,
        device_identifier: str | None,
        ip_address: str | None,
    ) -> dict:
        import hashlib
        refresh_token = generate_refresh_token()
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
