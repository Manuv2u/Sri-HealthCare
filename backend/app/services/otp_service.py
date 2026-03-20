"""OTP service with in-process dict storage."""
from __future__ import annotations

import logging
import random
import string
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class OTPService:
    """Generates and verifies 6-digit OTPs with a 10-minute TTL."""

    _store: dict[str, tuple[str, datetime]] = {}

    def generate_otp(self, phone: str) -> str:
        """Generate a 6-digit OTP, store with 10-minute TTL, and return it."""
        otp = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        self._store[phone] = (otp, expires_at)
        # ── DEV: print OTP to logs so local testing doesn't need SMS ──
        logger.warning("🔑 OTP for %s → %s (expires in 10 min)", phone, otp)
        return otp

    def verify_otp(self, phone: str, otp: str) -> bool:
        """Verify OTP — single-use. Returns False if not found, expired, or wrong."""
        entry = self._store.get(phone)
        if entry is None:
            return False
        stored_otp, expires_at = entry
        if datetime.now(timezone.utc) > expires_at:
            del self._store[phone]
            return False
        if stored_otp != otp:
            return False
        del self._store[phone]
        return True


otp_service = OTPService()
