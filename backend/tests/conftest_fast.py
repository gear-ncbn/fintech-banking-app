"""
Fast test configuration with memory-based data and minimal data
"""

import pytest
from fastapi.testclient import TestClient
from typing import Dict, Any, Generator
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main_banking import app
from app.repositories.data_manager import data_manager
from app.utils.auth import get_password_hash


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """Create a test client for the FastAPI app"""
    # Reset to minimal test data
    create_minimal_test_data()
    
    test_client = TestClient(app)
    yield test_client
    test_client.close()
    
    # Clean up
    data_manager.reset()


def create_minimal_test_data():
    """Create only essential test data for speed"""
    # Reset all data
    data_manager.reset(seed=42, demo_mode=False)
    
    # Create test users
    data_manager.users = [
        {
            "id": 1,
            "username": "john_doe",
            "email": "john@example.com",
            "password_hash": get_password_hash("DemoUser2026Banking"),
            "first_name": "John",
            "last_name": "Doe",
            "role": "user",
            "is_active": True,
            "created_at": "2025-06-22T00:00:00",
            "updated_at": "2025-06-22T00:00:00"
        },
        {
            "id": 2,
            "username": "admin",
            "email": "admin@example.com",
            "password_hash": get_password_hash("AdminUser2026Banking"),
            "first_name": "Admin",
            "last_name": "User",
            "role": "admin",
            "is_active": True,
            "created_at": "2025-06-22T00:00:00",
            "updated_at": "2025-06-22T00:00:00"
        }
    ]
    
    # Create basic categories
    data_manager.categories = [
        {
            "id": 1,
            "name": "Food & Dining",
            "is_income": False,
            "is_system": True,
            "created_at": "2025-06-22T00:00:00"
        },
        {
            "id": 2,
            "name": "Salary",
            "is_income": True,
            "is_system": True,
            "created_at": "2025-06-22T00:00:00"
        }
    ]
    
    # Create one account for john_doe
    data_manager.accounts = [
        {
            "id": 1,
            "user_id": 1,
            "name": "Checking",
            "account_type": "CHECKING",
            "balance": 1000.00,
            "is_active": True,
            "created_at": "2025-06-22T00:00:00",
            "updated_at": "2025-06-22T00:00:00"
        }
    ]


@pytest.fixture(scope="function")
def auth_headers(client: TestClient) -> Dict[str, str]:
    """Get authentication headers for a regular user"""
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
    response = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "AdminUser2026Banking"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}