"""Sliding-window rate limiting middleware for auth endpoints."""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

# Relax limits in local/dev so testing isn't blocked. This split was previously
# computed but never actually applied — _MAX_ATTEMPTS was a flat constant, so
# production ran with the same generous dev limit.
_IS_LOCAL = settings.env_profile in ("local", "dev")
_WINDOW_MINUTES = 15
_MAX_ATTEMPTS = 200 if _IS_LOCAL else 20
_AUTH_PREFIX = "/api/v1/auth/"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter over /api/v1/auth/: 200 req/IP/15min in local/dev, 20 elsewhere."""

    def __init__(self, app, **kwargs):  # type: ignore[override]
        super().__init__(app, **kwargs)
        self._counters: dict[str, list[datetime]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        if not request.url.path.startswith(_AUTH_PREFIX):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=_WINDOW_MINUTES)

        # Clean up expired entries
        self._counters[ip] = [ts for ts in self._counters[ip] if ts > window_start]

        if len(self._counters[ip]) >= _MAX_ATTEMPTS:
            oldest = self._counters[ip][0]
            retry_after = math.ceil((oldest + timedelta(minutes=_WINDOW_MINUTES) - now).total_seconds())
            return JSONResponse(
                status_code=429,
                content={
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                },
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        self._counters[ip].append(now)
        return await call_next(request)
