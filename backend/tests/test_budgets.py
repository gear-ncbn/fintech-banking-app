"""
Test suite for budget management endpoints
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta


@pytest.fixture(scope="function", autouse=True)
def reset_budgets_for_test():
    """Reset budget data before each budget test to ensure clean state"""
    from app.repositories.data_manager import data_manager

    # Save existing budgets
    existing_budgets = data_manager.budgets.copy()

    # Clear all budgets before test starts
    data_manager.budgets.clear()

    yield

    # Restore original budgets after test
    data_manager.budgets.clear()
    data_manager.budgets.extend(existing_budgets)


class TestBudgetManagement:
    """Test budget management endpoints"""
    
    @pytest.mark.timeout(10)
    def test_create_budget(self, client: TestClient, auth_headers: dict):
        """Test creating a new budget"""
        # First get existing budgets to find an unused category
        budgets_response = client.get("/api/budgets?active_only=false", headers=auth_headers)
        existing_budgets = budgets_response.json()
        used_category_ids = {b["category_id"] for b in existing_budgets if b.get("period") == "monthly"}
        
        # Get a valid category ID that doesn't have a monthly budget
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = None
        for c in categories:
            if not c.get("is_income", False) and c["id"] not in used_category_ids:
                category = c
                break
        
        if category is None:
            pytest.skip("No available category for monthly budget creation")
        category_id = category["id"]
        
        response = client.post("/api/budgets", 
            headers=auth_headers,
            json={
                "category_id": category_id,
                "amount": 500.00,
                "period": "monthly",
                "start_date": (date.today() + relativedelta(months=1)).replace(day=1).isoformat(),
                "end_date": ((date.today() + relativedelta(months=2)).replace(day=1) - timedelta(days=1)).isoformat(),
                "alert_threshold": 0.8
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["category_id"] == category_id
        assert data["amount"] == 500.00
        assert data["period"] == "monthly"
        assert data["alert_threshold"] == 0.8
        assert data["is_active"] == True
        assert "id" in data
        assert "created_at" in data
        assert "spent_amount" in data
        assert "remaining_amount" in data
        assert "percentage_used" in data
    
    @pytest.mark.timeout(10)
    def test_cannot_create_budget_for_income_category(self, client: TestClient, auth_headers: dict):
        """Test that budgets cannot be created for income categories"""
        # Get an income category
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        income_category = next((c for c in categories if c.get("is_income", True)), None)
        
        if income_category:
            response = client.post("/api/budgets", 
                headers=auth_headers,
                json={
                    "category_id": income_category["id"],
                    "amount": 1000.00,
                    "period": "monthly",
                    "start_date": (date.today() + timedelta(days=1)).isoformat()
                }
            )
            assert response.status_code == 400
            assert "expense categories" in response.json()["detail"]
    
    @pytest.mark.timeout(10)
    def test_cannot_create_duplicate_active_budget(self, client: TestClient, auth_headers: dict):
        """Test that duplicate active budgets for same category/period are not allowed"""
        # First get existing budgets to find an unused category
        budgets_response = client.get("/api/budgets", headers=auth_headers)
        existing_budgets = budgets_response.json()
        used_category_ids = {b["category_id"] for b in existing_budgets if b.get("period") == "monthly"}
        
        # Get a valid category ID that doesn't have a monthly budget
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = None
        for c in categories:
            if not c.get("is_income", False) and c["id"] not in used_category_ids:
                category = c
                break
        
        assert category is not None, "No available category for duplicate budget test"
        category_id = category["id"]
        
        budget_data = {
            "category_id": category_id,
            "amount": 300.00,
            "period": "monthly",
            "start_date": (date.today() + timedelta(days=1)).isoformat()
        }
        
        # Create first budget
        response1 = client.post("/api/budgets", headers=auth_headers, json=budget_data)
        assert response1.status_code == 201
        
        # Try to create duplicate
        response2 = client.post("/api/budgets", headers=auth_headers, json=budget_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
    
    @pytest.mark.timeout(10)
    def test_get_budget_by_id(self, client: TestClient, auth_headers: dict):
        """Test getting a specific budget"""
        # First get existing budgets to find an unused category
        budgets_response = client.get("/api/budgets", headers=auth_headers)
        existing_budgets = budgets_response.json()
        used_category_ids = {b["category_id"] for b in existing_budgets if b.get("period") == "monthly"}
        
        # Get a valid category ID that doesn't have a monthly budget
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = None
        for c in categories:
            if not c.get("is_income", False) and c["id"] not in used_category_ids:
                category = c
                break
        
        assert category is not None, "No available category for budget creation"
        category_id = category["id"]
        
        # First create a budget
        create_response = client.post("/api/budgets", 
            headers=auth_headers,
            json={
                "category_id": category_id,
                "amount": 300.00,
                "period": "monthly",
                "start_date": (date.today() + timedelta(days=1)).isoformat()
            }
        )
        if create_response.status_code != 201:
            print(f"Create response status: {create_response.status_code}")
            print(f"Create response: {create_response.json()}")
        assert create_response.status_code == 201
        budget_id = create_response.json()["id"]
        
        # Get the budget
        response = client.get(f"/api/budgets/{budget_id}", 
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == budget_id
        assert data["category_id"] == category_id
        assert data["amount"] == 300.00
        assert "spent_amount" in data
        assert "remaining_amount" in data
        assert "percentage_used" in data
    
    @pytest.mark.timeout(10)
    def test_update_budget(self, client: TestClient, auth_headers: dict):
        """Test updating a budget"""
        # First get existing budgets to find an unused category
        budgets_response = client.get("/api/budgets", headers=auth_headers)
        existing_budgets = budgets_response.json()
        used_category_ids = {b["category_id"] for b in existing_budgets if b.get("period") == "monthly"}
        
        # Get a valid category ID that doesn't have a monthly budget
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = None
        for c in categories:
            if not c.get("is_income", False) and c["id"] not in used_category_ids:
                category = c
                break
        
        assert category is not None, "No available category for budget creation"
        category_id = category["id"]
        
        # Create budget
        create_response = client.post("/api/budgets", 
            headers=auth_headers,
            json={
                "category_id": category_id,
                "amount": 200.00,
                "period": "monthly",
                "start_date": (date.today() + timedelta(days=1)).isoformat()
            }
        )
        assert create_response.status_code == 201
        budget_id = create_response.json()["id"]
        
        # Update budget - only amount, alert_threshold, and is_active can be updated
        response = client.put(f"/api/budgets/{budget_id}", 
            headers=auth_headers,
            json={
                "amount": 250.00,
                "alert_threshold": 0.9
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 250.00
        assert data["alert_threshold"] == 0.9
        assert data["category_id"] == category_id  # Unchanged
    
    @pytest.mark.timeout(10)
    def test_deactivate_budget(self, client: TestClient, auth_headers: dict):
        """Test deactivating a budget"""
        # First get ALL existing budgets to find an unused category
        budgets_response = client.get("/api/budgets?active_only=false", headers=auth_headers)
        existing_budgets = budgets_response.json()
        used_category_ids = {b["category_id"] for b in existing_budgets}
        
        # Get a valid category ID that doesn't have any budget
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = None
        for c in categories:
            if not c.get("is_income", False) and c["id"] not in used_category_ids:
                category = c
                break
        
        if category is None:
            # If all categories have budgets, use an existing budget to test deactivation
            active_budget = next((b for b in existing_budgets if b.get("is_active", True)), None)
            if active_budget is None:
                pytest.skip("No active budgets available for deactivation test")
            budget_id = active_budget["id"]
        else:
            category_id = category["id"]
            
            # Create budget
            create_response = client.post("/api/budgets", 
                headers=auth_headers,
                json={
                    "category_id": category_id,
                    "amount": 150.00,
                    "period": "monthly",
                    "start_date": (date.today() + timedelta(days=1)).isoformat()
                }
            )
            assert create_response.status_code == 201
            budget_id = create_response.json()["id"]
        
        # Delete (deactivate) budget
        response = client.delete(f"/api/budgets/{budget_id}", 
                               headers=auth_headers)
        assert response.status_code == 200
        assert "deactivated successfully" in response.json()["message"]
        
        # Verify it's deactivated (not deleted) - should still be accessible but is_active = False
        get_response = client.get(f"/api/budgets/{budget_id}", 
                                headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] == False
    
    @pytest.mark.timeout(10)
    def test_list_user_budgets(self, client: TestClient, auth_headers: dict):
        """Test listing all user budgets"""
        response = client.get("/api/budgets", headers=auth_headers)
        assert response.status_code == 200
        budgets = response.json()
        assert isinstance(budgets, list)
        
        # By default, only active budgets are returned
        for budget in budgets:
            assert budget["is_active"] == True
        
        if len(budgets) > 0:
            budget = budgets[0]
            assert "id" in budget
            assert "user_id" in budget
            assert "category_id" in budget
            assert "amount" in budget
            assert "period" in budget
            assert "spent_amount" in budget
            assert "remaining_amount" in budget
            assert "percentage_used" in budget
            assert "is_active" in budget
            assert "alert_threshold" in budget
    
    @pytest.mark.timeout(10)
    def test_list_all_budgets_including_inactive(self, client: TestClient, auth_headers: dict):
        """Test listing all budgets including inactive ones"""
        response = client.get("/api/budgets?active_only=false", headers=auth_headers)
        assert response.status_code == 200
        budgets = response.json()
        assert isinstance(budgets, list)
        # May contain both active and inactive budgets
    
    @pytest.mark.timeout(10)
    def test_list_budgets_by_period(self, client: TestClient, auth_headers: dict):
        """Test filtering budgets by period"""
        response = client.get("/api/budgets?period=monthly", headers=auth_headers)
        assert response.status_code == 200
        budgets = response.json()
        assert all(b["period"] == "monthly" for b in budgets)
    
    @pytest.mark.timeout(10)
    def test_budget_summary(self, client: TestClient, auth_headers: dict):
        """Test budget summary endpoint"""
        response = client.get("/api/budgets/summary", headers=auth_headers)
        assert response.status_code == 200
        summary = response.json()
        assert "total_budget" in summary  # Note: not total_budgeted
        assert "total_spent" in summary
        assert "total_remaining" in summary
        assert "budgets" in summary
        assert isinstance(summary["budgets"], list)
        
        # Each budget in summary should have usage data
        for budget in summary["budgets"]:
            assert "spent_amount" in budget
            assert "remaining_amount" in budget
            assert "percentage_used" in budget
    
    @pytest.mark.timeout(10)
    def test_budget_summary_by_period(self, client: TestClient, auth_headers: dict):
        """Test budget summary filtered by period"""
        response = client.get("/api/budgets/summary?period=monthly", headers=auth_headers)
        assert response.status_code == 200
        summary = response.json()
        assert all(b["period"] == "monthly" for b in summary["budgets"])
    
    @pytest.mark.timeout(10)
    def test_check_budget_alerts(self, client: TestClient, auth_headers: dict):
        """Test checking for budget alerts"""
        response = client.get("/api/budgets/alerts/check", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "has_alerts" in data
        assert "alerts" in data
        assert isinstance(data["alerts"], list)
        
        if len(data["alerts"]) > 0:
            alert = data["alerts"][0]
            assert "budget_id" in alert
            assert "category_name" in alert
            assert "period" in alert
            assert "budget_amount" in alert
            assert "spent_amount" in alert
            assert "percentage_used" in alert
            assert "alert_threshold" in alert
            assert "message" in alert
    
    @pytest.mark.timeout(10)
    def test_budget_permissions(self, client: TestClient):
        """Test budget access permissions"""
        # Create two users with unique usernames
        import time
        from app.middleware.rate_limiter import rate_limiter

        timestamp = str(int(time.time()))

        # Clear rate limiter to avoid 429 errors
        rate_limiter.requests.clear()
        rate_limiter.failed_attempts.clear()

        user1_response = client.post("/api/auth/register", json={
            "username": f"user1_budget_{timestamp}",
            "email": f"user1budget_{timestamp}@example.com",
            "password": "DemoUser2026Banking",
            "full_name": "User One"
        })

        user2_response = client.post("/api/auth/register", json={
            "username": f"user2_budget_{timestamp}",
            "email": f"user2budget_{timestamp}@example.com",
            "password": "DemoUser2026Banking",
            "full_name": "User Two"
        })

        # Clear rate limiter again before logins
        rate_limiter.requests.clear()
        rate_limiter.failed_attempts.clear()

        # Login as user1
        login1 = client.post("/api/auth/login", json={
            "username": f"user1_budget_{timestamp}",
            "password": "DemoUser2026Banking"
        })
        user1_token = login1.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        # Get a valid category ID for user1
        categories_response = client.get("/api/categories", headers=user1_headers)
        categories = categories_response.json()
        category = next((c for c in categories if not c.get("is_income", False)), categories[0])
        category_id = category["id"]

        # Create budget as user1
        budget_response = client.post("/api/budgets",
            headers=user1_headers,
            json={
                "category_id": category_id,
                "amount": 300.00,
                "period": "monthly",
                "start_date": (date.today() + timedelta(days=1)).isoformat()
            }
        )
        budget_id = budget_response.json()["id"]

        # Clear rate limiter before second login
        rate_limiter.requests.clear()
        rate_limiter.failed_attempts.clear()

        # Login as user2
        login2 = client.post("/api/auth/login", json={
            "username": f"user2_budget_{timestamp}",
            "password": "DemoUser2026Banking"
        })
        user2_token = login2.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # User2 should not be able to access user1's budget
        response = client.get(f"/api/budgets/{budget_id}",
                            headers=user2_headers)
        assert response.status_code == 404  # Not found for other users
    
    @pytest.mark.timeout(10) 
    def test_update_budget_validation(self, client: TestClient, auth_headers: dict):
        """Test budget update validation"""
        # First get existing budgets to find an unused category
        budgets_response = client.get("/api/budgets?active_only=false", headers=auth_headers)
        existing_budgets = budgets_response.json()
        used_category_ids = {b["category_id"] for b in existing_budgets if b.get("period") == "monthly"}
        
        # Get a valid category ID that doesn't have a monthly budget
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = None
        for c in categories:
            if not c.get("is_income", False) and c["id"] not in used_category_ids:
                category = c
                break
        
        if category is None:
            # If all categories have budgets, use an existing budget
            existing_budget = next((b for b in existing_budgets if b.get("period") == "monthly"), None)
            if existing_budget is None:
                pytest.skip("No budgets available for validation test")
            budget_id = existing_budget["id"]
        else:
            category_id = category["id"]
            
            # Create budget
            create_response = client.post("/api/budgets", 
                headers=auth_headers,
                json={
                    "category_id": category_id,
                    "amount": 400.00,
                    "period": "monthly",
                    "start_date": (date.today() + timedelta(days=1)).isoformat()
                }
            )
            assert create_response.status_code == 201, f"Failed to create budget: {create_response.json()}"
            budget_id = create_response.json()["id"]
        
        # Test invalid amount
        response = client.put(f"/api/budgets/{budget_id}", 
            headers=auth_headers,
            json={"amount": -100.00}
        )
        assert response.status_code == 400
        
        # Test invalid alert threshold
        response = client.put(f"/api/budgets/{budget_id}", 
            headers=auth_headers,
            json={"alert_threshold": 1.5}
        )
        assert response.status_code == 400
    
    @pytest.mark.timeout(10)
    def test_budget_with_transactions(self, client: TestClient, auth_headers: dict):
        """Test budget calculations with actual transactions"""
        # Get a valid expense category
        categories_response = client.get("/api/categories", headers=auth_headers)
        categories = categories_response.json()
        category = next((c for c in categories if not c.get("is_income", False)), categories[0])
        category_id = category["id"]
        
        # Get an account
        accounts_response = client.get("/api/accounts", headers=auth_headers)
        accounts = accounts_response.json()
        if len(accounts) == 0:
            # Create an account
            create_account = client.post("/api/accounts", 
                headers=auth_headers,
                json={
                    "account_name": "Test Checking",
                    "account_type": "checking",
                    "balance": 1000.00,
                    "currency": "USD"
                }
            )
            account_id = create_account.json()["id"]
        else:
            account_id = accounts[0]["id"]
        
        # Create a budget for current month
        today = date.today()
        start_date = today.replace(day=1)
        
        budget_response = client.post("/api/budgets", 
            headers=auth_headers,
            json={
                "category_id": category_id,
                "amount": 500.00,
                "period": "monthly",
                "start_date": start_date.isoformat()
            }
        )
        budget_id = budget_response.json()["id"]
        
        # Create a transaction in the budget category
        transaction_response = client.post("/api/transactions", 
            headers=auth_headers,
            json={
                "account_id": account_id,
                "category_id": category_id,
                "amount": 150.00,
                "transaction_type": "debit",
                "description": "Test expense",
                "transaction_date": datetime.now().isoformat()
            }
        )
        
        # Check budget usage
        budget_check = client.get(f"/api/budgets/{budget_id}", headers=auth_headers)
        budget_data = budget_check.json()
        # Check that the spent amount includes the transaction
        assert budget_data["spent_amount"] >= 150.00  # May include other transactions
        assert budget_data["remaining_amount"] <= 350.00
        assert budget_data["percentage_used"] >= 30.0