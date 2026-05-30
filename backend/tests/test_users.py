"""
Test suite for user management endpoints
"""

import pytest
from fastapi.testclient import TestClient

class TestUserManagement:
    """Test user profile and management functionality"""
    
    @pytest.mark.timeout(10)
    def test_get_current_user(self, client: TestClient, auth_headers: dict):
        """Test getting current user profile"""
        response = client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "username" in data
        assert "email" in data
        assert "password" not in data  # Should not expose password
    
    @pytest.mark.timeout(10)
    def test_update_profile(self, client: TestClient, auth_headers: dict):
        """Test updating user profile"""
        update_data = {
            "first_name": "John Updated",
            "last_name": "Doe Updated",
            "phone": "+1234567890"
        }
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify update
        profile = client.get("/api/users/me", headers=auth_headers).json()
        assert profile["first_name"] == "John Updated"
        assert profile["last_name"] == "Doe Updated"
        assert profile["phone"] == "+1234567890"
    
    @pytest.mark.timeout(10)
    def test_change_password(self, client: TestClient, auth_headers: dict):
        """Test changing password"""
        # Production endpoint expects query parameters
        response = client.post("/api/users/me/change-password?current_password=DemoUser2026Banking&new_password=newpassword123",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully"

        # Change password back to original for other tests
        response = client.post("/api/users/me/change-password?current_password=newpassword123&new_password=DemoUser2026Banking",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    @pytest.mark.timeout(10)
    def test_user_preferences(self, client: TestClient, auth_headers: dict):
        """Test user preferences management"""
        # Get preferences
        response = client.get("/api/users/preferences", headers=auth_headers)
        assert response.status_code == 200
        prefs = response.json()
        assert isinstance(prefs, dict)
        assert "currency" in prefs
        assert "timezone" in prefs
        assert "notifications" in prefs
        assert "privacy" in prefs
        assert "security" in prefs
        
        # Update preferences
        new_prefs = {
            "currency": "EUR",
            "timezone": "America/New_York"
        }
        response = client.put("/api/users/preferences", 
                            json=new_prefs, 
                            headers=auth_headers)
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Preferences updated successfully"
        assert result["currency"] == "EUR"
        assert result["timezone"] == "America/New_York"
    
    @pytest.mark.timeout(10)
    def test_user_stats(self, client: TestClient, auth_headers: dict):
        """Test getting user statistics"""
        response = client.get("/api/users/me/stats", headers=auth_headers)
        assert response.status_code == 200
        stats = response.json()
        
        # Check expected fields based on actual API response
        assert "accounts" in stats
        assert "total" in stats["accounts"]
        assert "active" in stats["accounts"]
        
        assert "transactions" in stats
        assert "total" in stats["transactions"]
        assert "this_month" in stats["transactions"]
        
        assert "budgets" in stats
        assert "active" in stats["budgets"]
        
        assert "goals" in stats
        assert "active" in stats["goals"]
        assert "completed" in stats["goals"]
        
        assert "contacts" in stats
        assert "member_since" in stats
        assert "days_active" in stats
    
    @pytest.mark.timeout(10)
    def test_delete_account(self, client: TestClient):
        """Test user account deletion"""
        # Create a test user
        reg_response = client.post("/api/auth/register", json={
            "username": "delete_test",
            "email": "delete@test.com",
            "password": "DemoUser2026Banking",
            "full_name": "Delete Test"
        })
        assert reg_response.status_code == 201
        
        # Login
        login_response = client.post("/api/auth/login", json={
            "username": "delete_test",
            "password": "DemoUser2026Banking"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Delete account - production endpoint expects query parameter
        response = client.delete("/api/users/me?password=DemoUser2026Banking", headers=headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Account deactivated successfully"
        
        # Verify cannot login again
        login_response = client.post("/api/auth/login", json={
            "username": "delete_test",
            "password": "DemoUser2026Banking"
        })
        # Account is deactivated, so it should return 401 or 403
        assert login_response.status_code in [401, 403]
    
    @pytest.mark.timeout(10)
    def test_search_users(self, client: TestClient, auth_headers: dict):
        """Test searching for users"""
        # Search for users
        response = client.get("/api/users/search?query=john&limit=5", headers=auth_headers)
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        # Results may be empty or contain matching users
        for user in results:
            assert "id" in user
            assert "username" in user
            assert "full_name" in user
            assert "email" in user
    
    @pytest.mark.timeout(10)
    def test_search_users_short_query(self, client: TestClient, auth_headers: dict):
        """Test searching for users with short query"""
        # Query less than 2 characters should return empty list
        response = client.get("/api/users/search?query=j", headers=auth_headers)
        assert response.status_code == 200
        results = response.json()
        assert results == []
    
    @pytest.mark.timeout(10)
    def test_update_email_already_exists(self, client: TestClient, auth_headers: dict):
        """Test updating email to one that already exists"""
        # First create another user
        reg_response = client.post("/api/auth/register", json={
            "username": "another_user",
            "email": "another@test.com",
            "password": "DemoUser2026Banking",
            "full_name": "Another User"
        })
        assert reg_response.status_code == 201

        # Try to update current user's email to the existing one
        update_data = {
            "email": "another@test.com"
        }
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)
        # Should fail with validation error (ValidationError returns 400)
        assert response.status_code == 400
        response_data = response.json()
        # Check for error message in various possible locations
        error_msg = ""
        if "detail" in response_data:
            error_msg = response_data["detail"]
        elif "message" in response_data:
            error_msg = response_data["message"]
        elif "error" in response_data and isinstance(response_data["error"], dict):
            error_msg = response_data["error"].get("message", "")
        assert "Email already in use" in error_msg or "already" in error_msg.lower()
    
    @pytest.mark.timeout(10)
    def test_change_password_wrong_current(self, client: TestClient, auth_headers: dict):
        """Test changing password with wrong current password"""
        response = client.post("/api/users/me/change-password?current_password=wrongpassword&new_password=newpassword123",
            headers=auth_headers
        )
        assert response.status_code == 400
        response_data = response.json()
        # Check for error message in various possible locations
        error_msg = ""
        if "detail" in response_data:
            error_msg = response_data["detail"]
        elif "message" in response_data:
            error_msg = response_data["message"]
        elif "error" in response_data and isinstance(response_data["error"], dict):
            error_msg = response_data["error"].get("message", "")
        assert "Current password is incorrect" in error_msg or "incorrect" in error_msg.lower()
    
    @pytest.mark.timeout(10)
    def test_change_password_too_short(self, client: TestClient, auth_headers: dict):
        """Test changing password with too short new password"""
        response = client.post("/api/users/me/change-password?current_password=DemoUser2026Banking&new_password=short",
            headers=auth_headers
        )
        assert response.status_code == 400
        response_data = response.json()
        # Check for error message in various possible locations
        error_msg = ""
        if "detail" in response_data:
            error_msg = response_data["detail"]
        elif "message" in response_data:
            error_msg = response_data["message"]
        elif "error" in response_data and isinstance(response_data["error"], dict):
            error_msg = response_data["error"].get("message", "")
        assert "Password must be at least 8 characters" in error_msg or "8 characters" in error_msg