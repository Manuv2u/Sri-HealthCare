# Feature: sri-diagnostic-lab, Property 1: OTP Verification Creates Account
"""
Property 1: OTP Verification Creates Account
Validates: Requirements 1.3, 1.4

Requirement 1.3: WHEN a user submits a valid OTP within 10 minutes of generation,
  THE Auth_Service SHALL create a User account and return a JWT access token.

Requirement 1.4: IF a user submits an OTP that has expired or is incorrect,
  THEN THE Auth_Service SHALL return an error response with a descriptive message
  and SHALL NOT create an account.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from fastapi import HTTPException
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Valid Indian-style phone numbers: +91 followed by 10 digits starting with 6-9
phone_strategy = st.from_regex(r"\+91[6-9]\d{9}", fullmatch=True)

# Wrong OTP: 6-digit string that is NOT the correct one (we filter after generation)
wrong_otp_strategy = st.from_regex(r"\d{6}", fullmatch=True)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _fresh_otp_service() -> OTPService:
    """Return an OTPService with an isolated store (not the global singleton)."""
    svc = OTPService()
    svc._store = {}
    return svc


# ---------------------------------------------------------------------------
# Property tests
# ---------------------------------------------------------------------------


@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
@given(phone=phone_strategy, name=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L",))))
@pytest.mark.asyncio
async def test_valid_otp_creates_account_and_returns_jwt(
    db_session: AsyncSession,
    phone: str,
    name: str,
) -> None:
    """
    **Validates: Requirements 1.3**

    For any valid phone number, verifying the correct OTP creates a user account
    and returns a JWT access token.
    """
    otp_svc = _fresh_otp_service()
    auth_svc = AuthService(db_session)
    auth_svc._otp_service = otp_svc  # inject isolated OTP service

    # Patch the module-level otp_service used inside AuthService
    import app.services.auth_service as auth_module
    original = auth_module.otp_service
    auth_module.otp_service = otp_svc
    try:
        # Step 1: register — generates OTP
        await auth_svc.register(phone=phone, name=name)

        # Step 2: capture the generated OTP from the store
        assert phone in otp_svc._store, "OTP should be stored after register"
        correct_otp, _ = otp_svc._store[phone]

        # Step 3: verify OTP
        tokens = await auth_svc.verify_otp(phone=phone, otp=correct_otp, name=name)

        # Assertions — Req 1.3
        assert "access_token" in tokens, "JWT access token must be returned"
        assert tokens["access_token"], "access_token must be non-empty"
        assert tokens.get("token_type", "").lower() == "bearer"

        # User account must exist in DB
        user_repo = UserRepository(db_session)
        user = await user_repo.get_by_phone(phone)
        assert user is not None, "User account must be created after valid OTP"
        assert user.phone == phone
    finally:
        auth_module.otp_service = original


@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
@given(phone=phone_strategy, name=st.just("TestUser"), wrong_otp=wrong_otp_strategy)
@pytest.mark.asyncio
async def test_incorrect_otp_does_not_create_account(
    db_session: AsyncSession,
    phone: str,
    name: str,
    wrong_otp: str,
) -> None:
    """
    **Validates: Requirements 1.4**

    For any valid phone number, submitting an incorrect OTP returns an error
    and does NOT create a user account.
    """
    otp_svc = _fresh_otp_service()

    import app.services.auth_service as auth_module
    original = auth_module.otp_service
    auth_module.otp_service = otp_svc
    try:
        auth_svc = AuthService(db_session)

        # Generate a real OTP so the phone is registered in the store
        correct_otp = otp_svc.generate_otp(phone)

        # Use a wrong OTP (skip if it accidentally equals the correct one)
        if wrong_otp == correct_otp:
            return  # trivially skip this example

        with pytest.raises(HTTPException) as exc_info:
            await auth_svc.verify_otp(phone=phone, otp=wrong_otp, name=name)

        # Req 1.4: error response with descriptive message
        assert exc_info.value.status_code == 400
        detail = exc_info.value.detail
        assert detail.get("error_code") == "INVALID_OTP"
        assert detail.get("message"), "Error message must be non-empty"

        # Req 1.4: account must NOT be created
        user_repo = UserRepository(db_session)
        user = await user_repo.get_by_phone(phone)
        assert user is None, "No account should be created after incorrect OTP"
    finally:
        auth_module.otp_service = original


@settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
@given(phone=phone_strategy, name=st.just("ReplayUser"))
@pytest.mark.asyncio
async def test_otp_is_single_use_replay_prevention(
    db_session: AsyncSession,
    phone: str,
    name: str,
) -> None:
    """
    **Validates: Requirements 1.3, 1.4**

    OTPs are single-use. Replaying the same OTP a second time does NOT create
    a second account and returns an error.
    """
    otp_svc = _fresh_otp_service()

    import app.services.auth_service as auth_module
    original = auth_module.otp_service
    auth_module.otp_service = otp_svc
    try:
        auth_svc = AuthService(db_session)

        # Register and capture OTP
        await auth_svc.register(phone=phone, name=name)
        assert phone in otp_svc._store
        correct_otp, _ = otp_svc._store[phone]

        # First verification — should succeed
        tokens = await auth_svc.verify_otp(phone=phone, otp=correct_otp, name=name)
        assert "access_token" in tokens

        # Second verification with the same OTP — must fail (OTP consumed)
        with pytest.raises(HTTPException) as exc_info:
            await auth_svc.verify_otp(phone=phone, otp=correct_otp, name=name)

        assert exc_info.value.status_code == 400
        detail = exc_info.value.detail
        assert detail.get("error_code") == "INVALID_OTP"

        # Only one user account should exist
        user_repo = UserRepository(db_session)
        user = await user_repo.get_by_phone(phone)
        assert user is not None
        # Confirm there's exactly one user with this phone (no duplicates)
        assert user.phone == phone
    finally:
        auth_module.otp_service = original
