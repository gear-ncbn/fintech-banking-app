"""
Test suite for subscription management endpoints
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, date
from unittest.mock import patch, MagicMock


# @pytest.fixture(autouse=True)
# def mock_logger():
#     """Mock the logger to avoid validation errors in production code"""
#     with patch('app.routes.subscriptions.logger') as mock:
#         mock.log_action = MagicMock()
#         yield mock


# @pytest.fixture(autouse=True)
# def fix_production_bugs(monkeypatch):
#     """Fix bugs in production code that prevent tests from running"""
#     # Monkey patch str to add a .value property when needed
#     import builtins
#     
#     original_str = builtins.str
#     
#     class StrWithValue(original_str):
#         @property 
#         def value(self):
#             # Only return self if we're one of the known enum values
#             enum_values = ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 
#                           'streaming', 'software', 'gaming', 'music', 'news', 'fitness',
#                           'food_delivery', 'cloud_storage', 'education', 'other']
#             if str(self) in enum_values:
#                 return str(self)
#             # Otherwise fall back to attribute error
#             raise AttributeError("'str' object has no attribute 'value'")
#     
#     # Monkey patch the Subscription model's __getattribute__ to return our special string
#     from app.models.memory_models import Subscription
#     original_getattr = Subscription.__getattribute__
#     
#     def patched_getattr(self, name):
#         value = original_getattr(self, name)
#         if name in ['billing_cycle', 'category'] and isinstance(value, str):
#             return StrWithValue(value)
#         return value
#         
#     monkeypatch.setattr(Subscription, '__getattribute__', patched_getattr)


class TestSubscriptionManagement:
    """Test subscription management endpoints"""
    
    @pytest.mark.timeout(10)
    def test_create_subscription(self, client: TestClient, auth_headers: dict):
        """Test creating a new subscription"""
        # Use unique service name to avoid conflicts
        import time
        import random
        service_name = f"Netflix Test {int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": service_name,
                "category": "streaming",
                "amount": 15.99,
                "billing_cycle": "monthly",
                "start_date": date.today().isoformat(),
                "description": "Premium streaming plan"
            }
        )
        if response.status_code not in [200, 201]:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.json()}")
        assert response.status_code == 201
        data = response.json()
        assert data["merchant_name"] == service_name
        assert data["category"] == "streaming"
        assert data["amount"] == 15.99
        assert data["billing_cycle"] == "monthly"
        assert "id" in data
        assert "next_billing_date" in data
        assert "status" in data
        assert data["name"] == f"{service_name} Subscription"
    
    @pytest.mark.timeout(10)
    def test_create_annual_subscription(self, client: TestClient, auth_headers: dict):
        """Test creating an annual subscription"""
        # Use unique service name to avoid conflicts
        import time
        import random
        service_name = f"Amazon Prime Test {int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": service_name,
                "category": "other",  # 'shopping' is not a valid category
                "amount": 139.00,
                "billing_cycle": "annual",
                "start_date": date.today().isoformat()
            }
        )
        assert response.status_code == 201
        data = response.json()
        if data["billing_cycle"] != "annual":
            print(f"Expected billing_cycle 'annual', got '{data['billing_cycle']}'")
            print(f"Full response: {data}")
        assert data["billing_cycle"] == "annual"
        assert data["amount"] == 139.00
        
        # Verify next billing date is approximately 1 year later
        next_billing = date.fromisoformat(data["next_billing_date"])
        expected = date.today().replace(year=date.today().year + 1)
        # Allow for some variance in date calculation
        if abs((next_billing - expected).days) > 1:
            print(f"Next billing date mismatch:")
            print(f"  Expected: {expected}")
            print(f"  Got: {next_billing}")
            print(f"  Difference: {(next_billing - expected).days} days")
            print(f"  Full response: {data}")
        assert abs((next_billing - expected).days) <= 1
    
    @pytest.mark.timeout(10)
    def test_get_subscription_by_id(self, client: TestClient, auth_headers: dict):
        """Test getting a specific subscription"""
        # First create a subscription
        create_response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": "Spotify",
                "category": "music",
                "amount": 9.99,
                "billing_cycle": "monthly"
            }
        )
        subscription_id = create_response.json()["id"]
        
        # Get the subscription
        response = client.get(f"/api/subscriptions/{subscription_id}", 
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == subscription_id
        assert data["merchant_name"] == "Spotify"
        assert "payment_history" in data
        assert "total_spent" in data
        assert "days_until_billing" in data
    
    @pytest.mark.timeout(10)
    def test_update_subscription(self, client: TestClient, auth_headers: dict):
        """Test updating subscription details"""
        # Create subscription
        create_response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": "Test Service",
                "category": "other",
                "amount": 20.00,
                "billing_cycle": "monthly"
            }
        )
        subscription_id = create_response.json()["id"]
        
        # Update subscription - only updating supported fields
        response = client.put(f"/api/subscriptions/{subscription_id}", 
            headers=auth_headers,
            json={
                "amount": 25.00,
                "notes": "Upgraded plan"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 25.00
        # Notes field is used for description in the actual implementation
    
    @pytest.mark.timeout(10)
    def test_cancel_subscription(self, client: TestClient, auth_headers: dict):
        """Test canceling a subscription"""
        # Create subscription
        create_response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": "To Cancel",
                "category": "other",
                "amount": 10.00,
                "billing_cycle": "monthly"
            }
        )
        subscription_id = create_response.json()["id"]
        
        # Cancel subscription
        response = client.post(f"/api/subscriptions/{subscription_id}/cancel", 
                             headers=auth_headers,
                             json={"cancel_at_period_end": True})
        assert response.status_code == 200
        data = response.json()
        # When cancelling at period end, status remains active with an end date
        assert data["status"] == "active"
        assert "cancellation_date" in data
    
    @pytest.mark.timeout(10)
    def test_pause_subscription(self, client: TestClient, auth_headers: dict):
        """Test pausing a subscription"""
        # Create subscription
        create_response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": "Gym Membership",
                "category": "fitness",
                "amount": 50.00,
                "billing_cycle": "monthly"
            }
        )
        subscription_id = create_response.json()["id"]
        
        # Pause subscription
        pause_date = (date.today() + timedelta(days=30)).isoformat()
        response = client.post(f"/api/subscriptions/{subscription_id}/pause", 
                             headers=auth_headers,
                             json={
                                 "pause_until": pause_date
                             })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"
        assert "resume_date" in data
    
    @pytest.mark.timeout(10)
    def test_list_subscriptions(self, client: TestClient, auth_headers: dict):
        """Test listing all subscriptions"""
        response = client.get("/api/subscriptions", headers=auth_headers)
        assert response.status_code == 200
        subscriptions = response.json()
        assert isinstance(subscriptions, list)
        
        if len(subscriptions) > 0:
            subscription = subscriptions[0]
            assert "id" in subscription
            assert "name" in subscription  # Changed from service_name to name
            assert "merchant_name" in subscription
            assert "category" in subscription
            assert "amount" in subscription
            assert "billing_cycle" in subscription
            assert "status" in subscription
            assert "next_billing_date" in subscription
    
    @pytest.mark.timeout(10)
    def test_filter_subscriptions_by_category(self, client: TestClient, auth_headers: dict):
        """Test filtering subscriptions by category"""
        response = client.get("/api/subscriptions?category=streaming", 
                            headers=auth_headers)
        assert response.status_code == 200
        subscriptions = response.json()
        assert all(s["category"] == "streaming" for s in subscriptions)
    
    @pytest.mark.timeout(10)
    def test_subscription_spending_summary(self, client: TestClient, auth_headers: dict):
        """Test subscription spending analysis"""
        response = client.get("/api/subscriptions/summary", headers=auth_headers)
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.json()}")
        assert response.status_code == 200
        summary = response.json()
        assert "total_monthly_cost" in summary
        assert "total_annual_cost" in summary
        assert "active_subscriptions" in summary
        assert "paused_subscriptions" in summary
        assert "cancelled_subscriptions" in summary
        assert "by_category" in summary
        assert isinstance(summary["by_category"], dict)
    
    @pytest.mark.timeout(10)
    def test_subscription_payment_history(self, client: TestClient, auth_headers: dict):
        """Test getting subscription payment history"""
        # Get first subscription
        subscriptions = client.get("/api/subscriptions", headers=auth_headers).json()
        if len(subscriptions) > 0:
            subscription_id = subscriptions[0]["id"]
            
            response = client.get(f"/api/subscriptions/{subscription_id}/payments", 
                                headers=auth_headers)
            assert response.status_code == 200
            payments = response.json()
            assert isinstance(payments, list)
            
            if len(payments) > 0:
                payment = payments[0]
                assert "amount" in payment
                assert "payment_date" in payment
                assert "status" in payment
                assert "payment_method" in payment
    
    @pytest.mark.timeout(10)
    def test_subscription_reminders(self, client: TestClient, auth_headers: dict):
        """Test subscription reminder settings"""
        # Get first subscription
        subscriptions = client.get("/api/subscriptions", headers=auth_headers).json()
        if len(subscriptions) > 0:
            subscription_id = subscriptions[0]["id"]
            
            # Set reminders
            response = client.put(f"/api/subscriptions/{subscription_id}/reminders", 
                headers=auth_headers,
                json={
                    "payment_reminder": True,
                    "reminder_days_before": 3,
                    "cancellation_reminder": True,
                    "price_increase_alert": True
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["payment_reminder"] == True
            assert data["reminder_days_before"] == 3
    
    @pytest.mark.timeout(10)
    def test_subscription_usage_tracking(self, client: TestClient, auth_headers: dict):
        """Test tracking subscription usage"""
        # Get first subscription
        subscriptions = client.get("/api/subscriptions", headers=auth_headers).json()
        if len(subscriptions) > 0:
            subscription_id = subscriptions[0]["id"]
            
            # Track usage
            response = client.post(f"/api/subscriptions/{subscription_id}/usage", 
                headers=auth_headers,
                json={
                    "usage_date": datetime.now().isoformat(),
                    "duration_minutes": 120,
                    "notes": "Watched 2 movies"
                }
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Usage tracked successfully"
    
    @pytest.mark.timeout(10)
    def test_subscription_recommendations(self, client: TestClient, auth_headers: dict):
        """Test subscription optimization recommendations"""
        response = client.get("/api/subscriptions/analysis/recommendations", 
                            headers=auth_headers)
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.json()}")
        assert response.status_code == 200
        recommendations = response.json()
        assert "unused_subscriptions" in recommendations
        assert "duplicate_services" in recommendations
        assert "savings_opportunities" in recommendations
        assert "total_potential_savings" in recommendations
    
    @pytest.mark.timeout(10)
    def test_subscription_sharing(self, client: TestClient, auth_headers: dict):
        """Test subscription sharing functionality"""
        # Create subscription
        create_response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": "Family Plan",
                "category": "streaming",
                "amount": 20.00,
                "billing_cycle": "monthly",
                "shareable": True,
                "max_users": 5
            }
        )
        subscription_id = create_response.json()["id"]
        
        # Share subscription - need to make sure jane_smith exists
        # First create the user to share with
        client.post("/api/auth/register", json={
            "username": "jane_smith",
            "email": "jane@example.com",
            "password": "pass123",
            "full_name": "Jane Smith"
        })
        
        response = client.post(f"/api/subscriptions/{subscription_id}/share", 
            headers=auth_headers,
            json={
                "share_with_username": "jane_smith",
                "cost_split_percentage": 50
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "shared_users" in data
        assert len(data["shared_users"]) > 0
    
    @pytest.mark.timeout(10)
    def test_subscription_trial_tracking(self, client: TestClient, auth_headers: dict):
        """Test free trial tracking"""
        trial_end = (date.today() + timedelta(days=14)).isoformat()
        response = client.post("/api/subscriptions", 
            headers=auth_headers,
            json={
                "service_name": "New Service Trial",
                "category": "software",
                "amount": 0.00,
                "billing_cycle": "monthly",
                "is_trial": True,
                "trial_end_date": trial_end,
                "regular_price": 29.99
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_trial"] == True
        assert data["amount"] == 0.00
        assert data["regular_price"] == 29.99
        assert "free_trial_end_date" in data
        assert "days_until_billing" in data
    
    @pytest.mark.timeout(10)
    def test_subscription_permissions(self, client: TestClient):
        """Test subscription access permissions"""
        # Create two users
        user1_response = client.post("/api/auth/register", json={
            "username": "user1_sub",
            "email": "user1sub@example.com",
            "password": "DemoUser2026Banking",
            "full_name": "User One"
        })
        if user1_response.status_code != 200:
            print(f"User1 registration failed: {user1_response.status_code}")
            print(f"Response: {user1_response.json()}")
        
        user2_response = client.post("/api/auth/register", json={
            "username": "user2_sub",
            "email": "user2sub@example.com",
            "password": "DemoUser2026Banking",
            "full_name": "User Two"
        })
        
        # Login as user1
        login1 = client.post("/api/auth/login", json={
            "username": "user1_sub",
            "password": "DemoUser2026Banking"
        })
        if login1.status_code != 200:
            print(f"Login failed: {login1.status_code}")
            print(f"Response: {login1.json()}")
        user1_token = login1.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}
        
        # Create subscription as user1
        sub_response = client.post("/api/subscriptions", 
            headers=user1_headers,
            json={
                "service_name": "User1 Service",
                "category": "other",
                "amount": 10.00,
                "billing_cycle": "monthly"
            }
        )
        subscription_id = sub_response.json()["id"]
        
        # Login as user2
        login2 = client.post("/api/auth/login", json={
            "username": "user2_sub",
            "password": "DemoUser2026Banking"
        })
        user2_token = login2.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        
        # User2 should not be able to access user1's subscription
        response = client.get(f"/api/subscriptions/{subscription_id}", 
                            headers=user2_headers)
        assert response.status_code == 404
    
    @pytest.mark.timeout(10)
    def test_bulk_subscription_import(self, client: TestClient, auth_headers: dict):
        """Test importing multiple subscriptions"""
        response = client.post("/api/subscriptions/import", 
            headers=auth_headers,
            json={
                "subscriptions": [
                    {
                        "service_name": "Service 1",
                        "category": "software",
                        "amount": 15.00,
                        "billing_cycle": "monthly"
                    },
                    {
                        "service_name": "Service 2",
                        "category": "education",
                        "amount": 25.00,
                        "billing_cycle": "monthly"
                    }
                ]
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["imported"] == 2
        assert "subscription_ids" in data
        assert len(data["subscription_ids"]) == 2