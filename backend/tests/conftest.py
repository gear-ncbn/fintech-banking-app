"""
Test configuration and fixtures for banking application tests
"""

import pytest
from fastapi.testclient import TestClient
import httpx
from typing import Dict, Any, Generator
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the main app and memory-based data manager
from app.main_banking import app
from app.repositories.data_manager import data_manager
from app.storage import db
from app.middleware.rate_limiter import rate_limiter

@pytest.fixture(scope="function", autouse=True)
def reset_rate_limiter():
    """Reset rate limiter state before each test to prevent 429 errors"""
    rate_limiter.requests.clear()
    rate_limiter.failed_attempts.clear()
    yield
    # Clean up after test
    rate_limiter.requests.clear()
    rate_limiter.failed_attempts.clear()

@pytest.fixture(scope="session")
def _test_client() -> Generator[TestClient, None, None]:
    """Create a test client for the FastAPI app (session-scoped for speed)"""
    test_client = TestClient(app)
    yield test_client
    test_client.close()

@pytest.fixture(scope="session", autouse=True)
def _setup_test_data():
    """Generate test data once for entire test session"""
    # Generate complete test data once (currency, investments, etc.)
    data_manager.reset(seed=42, demo_mode=True)
    yield

@pytest.fixture(scope="function")
def client(_test_client: TestClient) -> TestClient:
    """Get test client without resetting data (data persists across tests for speed)"""
    # Note: Data is NOT reset between tests for speed
    # Tests should be written to be independent and not rely on clean state
    # Or use unique identifiers to avoid conflicts

    # Clear cookies to prevent state pollution between tests
    _test_client.cookies.clear()

    return _test_client


# Cache the password hash to avoid expensive bcrypt operations
_PASSWORD_HASH_CACHE = {}

@pytest.fixture(scope="function")
def auth_headers(client: TestClient) -> Dict[str, str]:
    """Get authentication headers for a regular user"""
    # Reset john_doe password in case previous tests changed it
    from app.repositories.data_manager import data_manager
    from app.utils.auth import auth_handler

    # Use cached hash to avoid expensive bcrypt operations (2.5s saved per test!)
    if 'DemoUser2026Banking' not in _PASSWORD_HASH_CACHE:
        _PASSWORD_HASH_CACHE['DemoUser2026Banking'] = auth_handler.get_password_hash('DemoUser2026Banking')

    john = next((u for u in data_manager.users if u['username'] == 'john_doe'), None)
    if john:
        john['password_hash'] = _PASSWORD_HASH_CACHE['DemoUser2026Banking']

    response = client.post("/api/auth/login", json={
        "username": "john_doe",
        "password": "DemoUser2026Banking"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_headers(client: TestClient) -> Dict[str, str]:
    """Get authentication headers for an admin user"""
    # Reset admin password using cached hash
    from app.repositories.data_manager import data_manager
    from app.utils.auth import auth_handler

    if 'AdminUser2026Banking' not in _PASSWORD_HASH_CACHE:
        _PASSWORD_HASH_CACHE['AdminUser2026Banking'] = auth_handler.get_password_hash('AdminUser2026Banking')

    admin = next((u for u in data_manager.users if u['username'] == 'admin'), None)
    if admin:
        admin['password_hash'] = _PASSWORD_HASH_CACHE['AdminUser2026Banking']

    response = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "AdminUser2026Banking"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def test_user_data() -> Dict[str, Any]:
    """Sample user data for testing"""
    return {
        "username": "test_user",
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User"
    }


@pytest.fixture(scope="function")
def test_transaction_data() -> Dict[str, Any]:
    """Sample transaction data for testing"""
    return {
        "amount": 50.00,
        "description": "Test transaction",
        "category_id": 1,
        "merchant": "Test Store",
        "transaction_type": "expense"
    }


@pytest.fixture(scope="function")
def test_account_data() -> Dict[str, Any]:
    """Sample account data for testing"""
    return {
        "account_name": "Test Checking",
        "account_type": "checking",
        "balance": 1000.00,
        "currency": "USD",
        "is_active": True
    }


@pytest.fixture(scope="function")
def test_budget_data() -> Dict[str, Any]:
    """Sample budget data for testing"""
    return {
        "category_id": 1,
        "amount": 500.00,
        "period": "monthly",
        "start_date": "2025-06-01",
        "end_date": "2025-06-30"
    }


@pytest.fixture(scope="function")
def test_card_data() -> Dict[str, Any]:
    """Sample card data for testing"""
    return {
        "card_number": "4111111111111111",
        "card_type": "credit",
        "card_name": "Test Card",
        "credit_limit": 5000.00,
        "current_balance": 1000.00,
        "billing_cycle_day": 15
    }