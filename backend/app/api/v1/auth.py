"""Auth router: register, verify-otp, login, logout, refresh, sessions."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.middleware.auth import get_current_user
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginOTPRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionOut,
    TokenResponse,
    VerifyOTPRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_info(request: Request) -> tuple[str | None, str | None]:
    device = request.headers.get("User-Agent")
    ip = request.client.host if request.client else None
    return device, ip


@router.post("/register", response_model=MessageResponse)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    svc = AuthService(db)
    result = await svc.register(phone=body.phone, name=body.name)
    return MessageResponse(**result)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    body: VerifyOTPRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    device, ip = _get_client_info(request)
    svc = AuthService(db)
    tokens = await svc.verify_otp(
        phone=body.phone,
        otp=body.otp,
        name=body.name,
        device_identifier=device,
        ip_address=ip,
    )
    return TokenResponse(**tokens)


@router.post("/login-otp", response_model=MessageResponse)
async def login_otp(
    body: LoginOTPRequest,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Send OTP to an existing user (any role) for passwordless login."""
    svc = AuthService(db)
    result = await svc.login_otp(phone=body.phone)
    return MessageResponse(**result)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    device, ip = _get_client_info(request)
    svc = AuthService(db)
    tokens = await svc.login(
        phone_or_email=body.phone_or_email,
        password=body.password,
        device_identifier=device,
        ip_address=ip,
    )
    return TokenResponse(**tokens)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    # session_id is stored in request state by auth middleware if available
    # For simplicity, revoke all sessions matching the current user's active session
    # The session_id should be passed or we revoke by user — here we use a header
    session_id_header = request.headers.get("X-Session-Id")
    svc = AuthService(db)
    if session_id_header:
        try:
            await svc.logout(uuid.UUID(session_id_header))
        except ValueError:
            pass
    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db_session),
) -> AccessTokenResponse:
    svc = AuthService(db)
    result = await svc.refresh(refresh_token=body.refresh_token)
    return AccessTokenResponse(**result)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> list[SessionOut]:
    from app.repositories.user_repository import SessionRepository
    repo = SessionRepository(db)
    sessions = await repo.list_user_sessions(uuid.UUID(current_user["user_id"]))
    return [SessionOut.model_validate(s) for s in sessions]


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    svc = AuthService(db)
    await svc.logout(session_id)
    return MessageResponse(message="Session revoked")


@router.delete("/sessions", response_model=MessageResponse)
async def revoke_all_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    svc = AuthService(db)
    await svc.logout_all(uuid.UUID(current_user["user_id"]))
    return MessageResponse(message="All sessions revoked")


# TODO(TEMP_PASSWORD_AUTH): Remove these three endpoints when replacing password-based auth
@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Send password reset token (logged to console in dev; email when SMTP configured)."""
    from app.services.password_reset_service import PasswordResetService
    svc = PasswordResetService(db)
    result = await svc.forgot_password(body.phone_or_email)
    return MessageResponse(**result)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Validate reset token and update password."""
    from app.services.password_reset_service import PasswordResetService
    svc = PasswordResetService(db)
    result = await svc.reset_password(body.token, body.new_password)
    return MessageResponse(**result)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Change password for the currently authenticated user."""
    svc = AuthService(db)
    await svc.change_password(
        uuid.UUID(current_user["user_id"]),
        body.current_password,
        body.new_password,
    )
    return MessageResponse(message="Password changed successfully")
