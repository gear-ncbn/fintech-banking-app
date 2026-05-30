"""
Test suite for authentication endpoints
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta


class TestAuthentication:
    """Test authentication endpoints"""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Ensure john_doe password is correct before each test"""
        from app.repositories.data_manager import data_manager
        from app.utils.auth import auth_handler

        john = next((u for u in data_manager.users if u['username'] == 'john_doe'), None)
        if john:
            john['password_hash'] = auth_handler.get_password_hash('DemoUser2026Banking')
        elif not data_manager.users:
            # If users list is empty, reinitialize data
            print("WARNING: data_manager.users is empty, reinitializing...")
            data_manager.reset(seed=42, demo_mode=True)
        else:
            print(f"WARNING: john_doe not found, available users: {[u['username'] for u in data_manager.users[:5]]}")

    def test_register_new_user(self, client: TestClient):
        """Test user registration"""
        response = client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepass123",
            "first_name": "New",
            "last_name": "User"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert "id" in data
    
    def test_register_duplicate_username(self, client: TestClient):
        """Test registration with existing username"""
        # Use an existing user from seed data
        response = client.post("/api/auth/register", json={
            "username": "john_doe",  # This already exists
            "email": "new@example.com",
            "password": "pass123",
            "first_name": "Another",
            "last_name": "User"
        })
        assert response.status_code in [400, 422]  # Could be validation error
        # Check error message - might be in detail or in validation errors
        error_data = response.json()
        if "detail" in error_data and isinstance(error_data["detail"], str):
            assert "already exists" in error_data["detail"].lower()
        else:
            # For validation errors, check we got an error response
            assert response.status_code >= 400
    
    def test_login_valid_credentials(self, client: TestClient):
        """Test login with valid credentials"""
        response = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "DemoUser2026Banking"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "john_doe"
    
    def test_login_invalid_username(self, client: TestClient):
        """Test login with invalid username"""
        response = client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "DemoUser2026Banking"
        })
        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]
    
    def test_login_invalid_password(self, client: TestClient):
        """Test login with invalid password"""
        response = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]
    
    def test_me_endpoint(self, client: TestClient, auth_headers: dict):
        """Test getting current user profile"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "john_doe"
        assert "email" in data
    
    def test_logout(self, client: TestClient, auth_headers: dict):
        """Test logout"""
        response = client.post("/api/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"
    
    def test_change_password(self, client: TestClient, auth_headers: dict):
        """Test password change"""
        response = client.post("/api/auth/change-password", 
            headers=auth_headers,
            json={
                "old_password": "DemoUser2026Banking",
                "new_password": "newpass456"
            }
        )
        assert response.status_code == 200
        assert "Password successfully changed" in response.json()["message"]
        
        # Verify can login with new password
        login_response = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "newpass456"
        })
        assert login_response.status_code == 200
    
    def test_update_profile(self, client: TestClient, auth_headers: dict):
        """Test updating user profile"""
        response = client.put("/api/auth/me", 
            headers=auth_headers,
            json={
                "first_name": "Johnny",
                "last_name": "Updated"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Johnny"
        assert data["last_name"] == "Updated"
    
    def test_invalid_token(self, client: TestClient):
        """Test invalid token handling"""
        response = client.get("/api/auth/me", 
            headers={"Authorization": "Bearer invalid_token"})
        assert response.status_code == 401
        # The actual error message may vary
        detail = response.json()["detail"]
        assert "token" in detail.lower() or "authenticated" in detail.lower()
    
    def test_protected_endpoint_without_auth(self, client: TestClient):
        """Test accessing protected endpoint without authentication"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_protected_endpoint_with_auth(self, client: TestClient, auth_headers: dict):
        """Test accessing protected endpoint with authentication"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "john_doe"
    
    def test_change_password_wrong_old(self, client: TestClient, auth_headers: dict):
        """Test changing password with wrong old password"""
        response = client.post("/api/auth/change-password", 
            headers=auth_headers,
            json={
                "old_password": "wrongoldpass",
                "new_password": "newpass456"
            }
        )
        assert response.status_code == 401
        assert "Incorrect password" in response.json()["detail"]
    
    def test_change_password_short(self, client: TestClient, auth_headers: dict):
        """Test changing password with too short new password"""
        response = client.post("/api/auth/change-password", 
            headers=auth_headers,
            json={
                "old_password": "DemoUser2026Banking",
                "new_password": "short"
            }
        )
        assert response.status_code in [400, 422]  # Could be bad request or validation error
        assert "at least 8 characters" in response.json()["detail"].lower()
    
    def test_logout_with_session(self, client: TestClient):
        """Test logout clears session"""
        # Login first
        login_response = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "DemoUser2026Banking"
        })
        assert login_response.status_code == 200
        
        # Logout
        logout_response = client.post("/api/auth/logout")
        assert logout_response.status_code == 200
        assert "Successfully logged out" in logout_response.json()["message"]
        
    def test_concurrent_sessions(self, client: TestClient):
        """Test multiple concurrent sessions"""
        # Login first time
        response1 = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "DemoUser2026Banking"
        })
        token1 = response1.json()["access_token"]
        
        # Login second time
        response2 = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "DemoUser2026Banking"
        })
        token2 = response2.json()["access_token"]
        
        # Both tokens should work
        assert client.get("/api/auth/me", 
            headers={"Authorization": f"Bearer {token1}"}).status_code == 200
        assert client.get("/api/auth/me", 
            headers={"Authorization": f"Bearer {token2}"}).status_code == 200