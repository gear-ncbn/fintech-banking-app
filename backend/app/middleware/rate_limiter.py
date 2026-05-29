"""
Rate limiting middleware with exponential backoff for API protection.
Implements per-IP and per-user rate limits with different tiers for different endpoints.
"""
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class RateLimiter:
    """Advanced rate limiter with exponential backoff and different rate limits per endpoint type."""

    def __init__(self):
        # Store: {identifier: {"count": int, "window_start": float, "failures": int}}
        self.requests: dict[str, dict[str, float]] = defaultdict(dict)
        self.failed_attempts: dict[str, dict[str, float]] = defaultdict(dict)

        # Rate limits per endpoint type (requests per minute)
        self.rate_limits = {
            "auth": 20,      # Login/register
            "financial": 120,  # Transactions/accounts
            "api": 200,      # Standard for most endpoints
            "public": 300    # Public endpoints
        }

        # Exponential backoff parameters
        self.base_lockout = 60  # Base lockout time in seconds
        self.max_lockout = 3600  # Max lockout time (1 hour)

    def _get_identifier(self, request: Request, current_user: dict | None = None) -> str:
        """Get unique identifier for rate limiting (user_id if authenticated, else IP)."""
        if current_user and current_user.get('user_id'):
            return f"user_{current_user['user_id']}"

        # Try to get real IP from headers (for reverse proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return f"ip_{forwarded_for.split(',')[0].strip()}"

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return f"ip_{real_ip}"

        # Fallback to client IP
        return f"ip_{request.client.host}"

    def _get_endpoint_type(self, path: str, method: str) -> str:
        """Determine the endpoint type for rate limiting."""
        if any(auth_path in path for auth_path in ['/auth/', '/login', '/register', '/logout']):
            return "auth"
        if any(fin_path in path for fin_path in ['/transactions/', '/transfers/', '/accounts/', '/payments/']):
            return "financial"
        if path in ['/health', '/', '/docs', '/redoc']:
            return "public"
        return "api"

    def _is_locked_out(self, identifier: str) -> tuple[bool, int | None]:
        """Check if identifier is currently locked out due to excessive failures."""
        if identifier not in self.failed_attempts:
            return False, None

        failure_data = self.failed_attempts[identifier]
        failures = failure_data.get("failures", 0)
        last_failure = failure_data.get("last_failure", 0)

        if failures == 0:
            return False, None

        # Calculate lockout time with exponential backoff
        lockout_duration = min(self.base_lockout * (2 ** (failures - 1)), self.max_lockout)
        lockout_end = last_failure + lockout_duration

        if time.time() < lockout_end:
            return True, int(lockout_end - time.time())
        # Lockout expired, reset failure count
        self.failed_attempts[identifier] = {"failures": 0, "last_failure": 0}
        return False, None

    def _record_failure(self, identifier: str):
        """Record a failed attempt for exponential backoff."""
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = {"failures": 0, "last_failure": 0}

        self.failed_attempts[identifier]["failures"] += 1
        self.failed_attempts[identifier]["last_failure"] = time.time()

    def _reset_failures(self, identifier: str):
        """Reset failure count on successful request."""
        if identifier in self.failed_attempts:
            self.failed_attempts[identifier] = {"failures": 0, "last_failure": 0}

    async def check_rate_limit(self, request: Request, current_user: dict | None = None) -> bool:
        """Check if request should be rate limited."""
        identifier = self._get_identifier(request, current_user)
        endpoint_type = self._get_endpoint_type(str(request.url.path), request.method)
        limit = self.rate_limits[endpoint_type]

        # Check for lockout first
        is_locked, lockout_remaining = self._is_locked_out(identifier)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked due to excessive failures. Try again in {lockout_remaining} seconds.",
                headers={
                    "Retry-After": str(lockout_remaining),
                    "X-RateLimit-Lockout": "true"
                }
            )

        current_time = time.time()
        window_duration = 60  # 1 minute window

        rate_key = f"{identifier}:{endpoint_type}"

        if rate_key not in self.requests:
            self.requests[rate_key] = {"count": 0, "window_start": current_time}

        request_data = self.requests[rate_key]

        # Reset window if it's expired
        if current_time - request_data["window_start"] >= window_duration:
            request_data = {"count": 0, "window_start": current_time}
            self.requests[rate_key] = request_data

        # Check if limit exceeded
        if request_data["count"] >= limit:
            self._record_failure(rate_key)

            # Calculate time until window resets
            window_reset = int(window_duration - (current_time - request_data["window_start"]))

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Limit: {limit} requests per minute. Try again in {window_reset} seconds.",
                headers={
                    "Retry-After": str(window_reset),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(request_data["window_start"] + window_duration))
                }
            )

        # Increment counter and reset failures on successful request
        request_data["count"] += 1
        self._reset_failures(rate_key)

        return True


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, call_next):
    """Middleware to apply rate limiting to all requests."""
    try:
        # Skip rate limiting for certain paths
        skip_paths = ["/docs", "/redoc", "/openapi.json", "/health"]
        if any(skip_path in str(request.url.path) for skip_path in skip_paths):
            return await call_next(request)

        # For authenticated endpoints, we'll get the user in the actual endpoint
        # For now, just check based on IP/session
        await rate_limiter.check_rate_limit(request)

        return await call_next(request)

    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"error": e.detail},
            headers=e.headers or {}
        )
    except Exception:
        # Log error but don't break the request
        return await call_next(request)
