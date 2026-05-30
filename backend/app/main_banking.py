import logging
import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.logging import setup_logging
from .middleware.csrf_protection import csrf_protection_middleware
from .middleware.error_handler import error_handler_middleware, register_exception_handlers
from .middleware.input_sanitizer import input_sanitization_middleware
from .middleware.rate_limiter import rate_limit_middleware
from .middleware.request_id import request_id_middleware
from .middleware.security_headers import security_headers_middleware
from .routes import (
    accounts,
    analytics,
    analytics_export,
    analytics_intelligence,
    analytics_websocket,
    auth,
    banking,
    budgets,
    business,
    cards,
    categories,
    contacts,
    conversations,
    credit,
    credit_cards,
    crypto,
    currency_converter,
    exports,
    goals,
    health,
    insurance,
    investments,
    loans,
    messages,
    notes,
    notifications,
    p2p,
    payment_methods,
    recurring,
    savings,
    search,
    security,
    subscriptions,
    transactions,
    transfers,
    unified,
    uploads,
    users,
)
from .storage.memory_adapter import db

# Setup logging
setup_logging(
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    log_format=os.getenv("LOG_FORMAT", "json"),
    log_file=os.getenv("LOG_FILE"),
    app_name="bankflow"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.create_database()
    # Populate with initial data using memory-based system
    db.populate_database(seed=42)

    # Initialize event streaming service
    from .services.event_streaming import event_streaming_service
    await event_streaming_service.start_background_tasks()
    logger.info("Event streaming service initialized")

    yield

    # Shutdown
    logger.info("Application shutdown")

app = FastAPI(
    title="Banking & Finance Application API",
    version="1.0.0",
    description="Comprehensive banking, budgeting, and finance management API",
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url="/docs" if os.getenv("ENABLE_SWAGGER_UI", "true").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_REDOC", "false").lower() == "true" else None
)

# Register exception handlers
register_exception_handlers(app)

# Add middleware (order matters - first added = last executed)
# Security middleware chain - order is important
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    return await security_headers_middleware(request, call_next)

@app.middleware("http")
async def add_error_handling(request: Request, call_next):
    return await error_handler_middleware(request, call_next)

@app.middleware("http")
async def add_csrf_protection(request: Request, call_next):
    return await csrf_protection_middleware(request, call_next)

@app.middleware("http")
async def add_input_sanitization(request: Request, call_next):
    return await input_sanitization_middleware(request, call_next)

@app.middleware("http")
async def add_rate_limiting(request: Request, call_next):
    return await rate_limit_middleware(request, call_next)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    return await request_id_middleware(request, call_next)

# Configure CORS from environment variables
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
cors_origins = [origin.strip() for origin in cors_origins]

# Add CORS middleware with production-ready configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Specific origins from environment
    allow_credentials=True,  # Enable credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],  # Specific methods
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID", "X-CSRF-Token"],  # Specific headers
    expose_headers=["X-CSRF-Token"],  # Let the SPA read the CSRF token from responses
    max_age=86400,  # Cache preflight requests for 24 hours
)


# Core Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])

# Financial Planning
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(recurring.router, prefix="/api/recurring", tags=["Recurring Transactions"])

# Transfers and Payments
app.include_router(transfers.router, prefix="/api/transfers", tags=["Transfers & Payments"])
app.include_router(p2p.router, prefix="/api/p2p", tags=["P2P Payments"])

# Social & Messaging
app.include_router(contacts.router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messaging"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])

# Analytics & Insights
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(analytics_export.router, prefix="/api/analytics", tags=["Analytics Export"])
app.include_router(analytics_intelligence.router, prefix="/api/analytics", tags=["Analytics Intelligence"])
app.include_router(analytics_websocket.router, prefix="/api/analytics", tags=["Analytics WebSocket"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])

# User Management
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])

# Payment & Security
app.include_router(payment_methods.router, prefix="/api/payment-methods", tags=["Payment Methods"])
app.include_router(security.router, prefix="/api/security", tags=["Security"])

# External Integrations
app.include_router(exports.router, prefix="/api/exports", tags=["Import/Export"])
app.include_router(banking.router, prefix="/api/banking", tags=["Banking Integration"])

# File Uploads
app.include_router(uploads.router, prefix="/api/uploads", tags=["File Uploads"])

# New Feature Routes
app.include_router(cards.router, prefix="/api/cards", tags=["Card Management"])
app.include_router(credit.router, prefix="/api/credit", tags=["Credit Management"])
app.include_router(savings.router, prefix="/api/savings", tags=["Smart Savings"])
app.include_router(business.router, prefix="/api/business", tags=["Business Banking"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscription Management"])
app.include_router(crypto.router, prefix="/api/crypto", tags=["Digital Assets"])
app.include_router(insurance.router, prefix="/api/insurance", tags=["Insurance Management"])
app.include_router(loans.router, prefix="/api/loans", tags=["Loan Management"])
app.include_router(unified.router, prefix="/api/unified", tags=["Unified Financial System"])
app.include_router(investments.router, prefix="/api/investments", tags=["Investment Management"])
app.include_router(currency_converter.router, prefix="/api/currency-converter", tags=["Currency Converter"])
app.include_router(credit_cards.router, prefix="/api/credit-cards", tags=["Credit Cards"])

# Health check endpoints (no prefix for standard health check paths)
app.include_router(health.router, tags=["Health"])

# Mount static files for uploads
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
def read_root():
    return {
        "message": "Banking & Finance API is running",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "accounts": "/api/accounts",
            "transactions": "/api/transactions",
            "budgets": "/api/budgets",
            "goals": "/api/goals",
            "contacts": "/api/contacts",
            "messages": "/api/messages",
            "notes": "/api/notes",
            "analytics": "/api/analytics",
            "cards": "/api/cards",
            "credit": "/api/credit",
            "savings": "/api/savings",
            "business": "/api/business",
            "subscriptions": "/api/subscriptions",
            "crypto": "/api/crypto",
            "insurance": "/api/insurance",
            "loans": "/api/loans",
            "unified": "/api/unified",
            "investments": "/api/investments",
            "currency_converter": "/api/currency-converter",
            "docs": "/docs",
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "timestamp": datetime.now(UTC).isoformat()
    }
