"""Lab-local time helpers.

Booking dates and time-slot start/end times are stored as naive
date/time values representing the lab's local wall-clock time (India),
not UTC. Everything else in this codebase uses ``datetime.now(timezone.utc)``.
Comparing the two directly without going through these helpers is the
source of at least two prior bugs (past-slot selection, the cancellation
window check) — always convert through here instead of re-deriving the
conversion inline.
"""
from __future__ import annotations

from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

from app.config import settings

LAB_TZ = ZoneInfo(settings.lab_timezone)


def local_now() -> datetime:
    """Current time in the lab's local timezone."""
    return datetime.now(LAB_TZ)


def to_utc(local_date: date, local_time: time) -> datetime:
    """Combine a naive local date/time (lab wall-clock) into a UTC-aware datetime."""
    return datetime.combine(local_date, local_time, tzinfo=LAB_TZ).astimezone(timezone.utc)
