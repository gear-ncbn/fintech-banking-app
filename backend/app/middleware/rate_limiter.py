"""
Simple, config-driven rate limiting middleware.

A token-bucket limiter keyed per client (authenticated user when available,
otherwise IP). Each client gets one bucket; capacity and refill rate are derived
from application settings (`rate_limit_requests` over `rate_limit_period`) so the
limit can be tuned or disabled per environment.

When the bucket is empty the request is rejected with HTTP 429 and a
``Retry-After`` header. There is intentionally no escalating lockout: a client
that trips the limit simply waits for the bucket to refill (a few seconds),
rather than being locked out for minutes/hours. Brute-force protection for auth
endpoints is handled separately in the security layer.
"""
import time
from threading import Lock

from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings


class RateLimiter:
    """Token-bucket rate limiter with a single, config-driven limit per client."""

    def __init__(self):
        # {identifier: {"tokens": float, "updated": float}}
        self.requests: dict[str, dict[str, float]] = {}
        # Retained for backwards compatibility with tooling/tests that clear it.
        self.failed_attempts: dict[str, dict[str, float]] = {}
        self._lock = Lock()

    @staticmethod
    def _get_identifier(request: Request) -> str:
        """Identify the client, preferring forwarded IPs behind a proxy."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return f"ip_{forwarded_for.split(',')[0].strip()}"

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return f"ip_{real_ip}"

        client = request.client
        return f"ip_{client.host}" if client else "ip_unknown"

    def check(self, request: Request) -> tuple[bool, int]:
        """Consume a token for this request.

        Returns ``(allowed, retry_after_seconds)``. ``retry_after_seconds`` is 0
        when the request is allowed.
        """
        settings = get_settings()
        capacity = max(1, settings.rate_limit_requests)
        period = max(1, settings.rate_limit_period)
        refill_rate = capacity / period  # tokens per second

        identifier = self._get_identifier(request)
        now = time.monotonic()

        with self._lock:
            bucket = self.requests.get(identifier)
            if bucket is None:
                bucket = {"tokens": float(capacity), "updated": now}
                self.requests[identifier] = bucket

            # Refill based on elapsed time, capped at capacity.
            elapsed = now - bucket["updated"]
            bucket["tokens"] = min(capacity, bucket["tokens"] + elapsed * refill_rate)
            bucket["updated"] = now

            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                return True, 0

            retry_after = int((1 - bucket["tokens"]) / refill_rate) + 1
            return False, retry_after


# Global rate limiter instance
rate_limiter = RateLimiter()

# Paths that should never be rate limited.
_SKIP_PATHS = ("/docs", "/redoc", "/openapi.json", "/health")


async def rate_limit_middleware(request: Request, call_next):
    """Apply the configured rate limit to incoming requests."""
    settings = get_settings()
    path = str(request.url.path)

    if not settings.rate_limit_enabled or any(skip in path for skip in _SKIP_PATHS):
        return await call_next(request)

    try:
        allowed, retry_after = rate_limiter.check(request)
    except Exception:
        # Fail open: a limiter error must never take down the API.
        return await call_next(request)

    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": f"Rate limit exceeded. Try again in {retry_after} seconds."},
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(settings.rate_limit_requests),
                "X-RateLimit-Remaining": "0",
            },
        )

    return await call_next(request)
