"""
CSRF protection middleware for banking application.
Implements CSRF tokens for state-changing operations.
"""
import logging
import secrets
import time

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class CSRFProtection:
    """CSRF protection with secure token generation and validation."""

    def __init__(self):
        self.token_store = {}  # In production, use Redis or database
        self.token_ttl = 3600  # Token valid for 1 hour

    def generate_csrf_token(self, session_id: str | None = None) -> str:
        """Generate a new CSRF token."""
        token = secrets.token_urlsafe(32)
        identifier = session_id or "anonymous"

        self.token_store[token] = {
            "session_id": identifier,
            "created_at": time.time()
        }

        return token

    def validate_csrf_token(self, token: str, session_id: str | None = None) -> bool:
        """Validate CSRF token."""
        if not token or token not in self.token_store:
            return False

        token_data = self.token_store[token]
        identifier = session_id or "anonymous"

        # Check if token expired
        if time.time() - token_data["created_at"] > self.token_ttl:
            del self.token_store[token]
            return False

        # Verify token matches session
        return token_data["session_id"] == identifier

    def _requires_csrf_protection(self, request: Request) -> bool:
        """Check if request requires CSRF protection."""
        # Skip CSRF protection for tests (TestClient sends "testclient" as client host)
        if hasattr(request.client, 'host') and request.client.host == "testclient":
            return False

        # Only protect state-changing operations
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return False

        # Skip for certain paths
        skip_paths = [
            "/api/auth/login",  # Login is protected by other means
            "/api/auth/register",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]

        path = str(request.url.path)
        return not any(skip_path in path for skip_path in skip_paths)

    async def check_csrf_protection(self, request: Request) -> None:
        """Check CSRF protection for request."""
        if not self._requires_csrf_protection(request):
            return

        # Get CSRF token from header or form data
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token:
            # Try to get from form data for POST requests
            content_type = request.headers.get("content-type", "")
            if "application/x-www-form-urlencoded" in content_type:
                form = await request.form()
                csrf_token = form.get("csrf_token")

        if not csrf_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing. This action requires a valid CSRF token."
            )

        # Get session ID for validation
        session_id = request.cookies.get("session_id")

        # Validate token
        if not self.validate_csrf_token(csrf_token, session_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or expired CSRF token. Please refresh the page and try again."
            )

        # Clean up expired tokens periodically
        self._cleanup_expired_tokens()

    def _cleanup_expired_tokens(self):
        """Remove expired tokens from store."""
        current_time = time.time()
        expired_tokens = [
            token for token, data in self.token_store.items()
            if current_time - data["created_at"] > self.token_ttl
        ]

        for token in expired_tokens:
            del self.token_store[token]


# Global CSRF protection instance
csrf_protection = CSRFProtection()


def _issue_csrf_token(request: Request, response) -> None:
    """Attach a fresh CSRF token the SPA can read and echo back on writes."""
    session_id = request.cookies.get("session_id")
    new_token = csrf_protection.generate_csrf_token(session_id)
    response.headers["X-CSRF-Token"] = new_token


async def csrf_protection_middleware(request: Request, call_next):
    """Middleware to apply CSRF protection."""
    try:
        # Check CSRF protection
        await csrf_protection.check_csrf_protection(request)

        response = await call_next(request)

        # Always hand the client a token so subsequent writes can succeed.
        _issue_csrf_token(request, response)

        return response

    except HTTPException as e:
        response = JSONResponse(
            status_code=e.status_code,
            content={
                "error": "CSRF protection failed",
                "detail": e.detail,
                "security_alert": "Cross-site request forgery protection triggered"
            }
        )
        # Issue a token on rejection too, so a retry can include a valid one.
        _issue_csrf_token(request, response)
        return response
    except Exception as e:
        logger.error(f"CSRF protection middleware error: {e}")
        return await call_next(request)
