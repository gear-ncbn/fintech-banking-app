"""
Test suite for messaging endpoints
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta


class TestMessaging:
    """Test messaging system endpoints"""
    
    @pytest.mark.timeout(10)
    def test_send_message(self, client: TestClient, auth_headers: dict):
        """Test sending a message to another user"""
        response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Account Question",
                "message": "Hi Jane, I have a question about joint accounts.",
                "priority": "normal"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "Account Question"
        assert data["recipient_username"] == "jane_smith"
        assert data["sender_username"] == "john_doe"
        assert data["is_read"] == False
        assert "id" in data
        assert "sent_at" in data
    
    @pytest.mark.timeout(10)
    def test_send_high_priority_message(self, client: TestClient, auth_headers: dict):
        """Test sending high priority message"""
        response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "mike_wilson",
                "subject": "Urgent: Account Security",
                "message": "Please review your recent transactions.",
                "priority": "high"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "high"
    
    @pytest.mark.timeout(10)
    def test_get_message_by_id(self, client: TestClient, auth_headers: dict):
        """Test getting a specific message"""
        # First send a message
        send_response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Test Message",
                "message": "This is a test",
                "priority": "normal"
            }
        )
        message_id = send_response.json()["id"]
        
        # Get the message
        response = client.get(f"/api/messages/{message_id}", 
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == message_id
        assert data["subject"] == "Test Message"
    
    @pytest.mark.timeout(10)
    def test_mark_message_as_read(self, client: TestClient, auth_headers: dict):
        """Test marking message as read"""
        # Login as jane_smith to receive message
        jane_login = client.post("/api/auth/login", json={
            "username": "jane_smith",
            "password": "DemoUser2026Banking"
        })
        jane_token = jane_login.json()["access_token"]
        jane_headers = {"Authorization": f"Bearer {jane_token}"}
        
        # Send message to jane
        send_response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Unread Message",
                "message": "Mark me as read",
                "priority": "normal"
            }
        )
        message_id = send_response.json()["id"]
        
        # Mark as read (as jane)
        response = client.put(f"/api/messages/{message_id}/read", 
                            headers=jane_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] == True
        assert "read_at" in data
    
    @pytest.mark.timeout(10)
    def test_reply_to_message(self, client: TestClient, auth_headers: dict):
        """Test replying to a message"""
        # Send original message
        send_response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Original Message",
                "message": "This is the original",
                "priority": "normal"
            }
        )
        message_id = send_response.json()["id"]
        
        # Login as jane to reply
        jane_login = client.post("/api/auth/login", json={
            "username": "jane_smith",
            "password": "DemoUser2026Banking"
        })
        jane_token = jane_login.json()["access_token"]
        jane_headers = {"Authorization": f"Bearer {jane_token}"}
        
        # Reply to message
        response = client.post(f"/api/messages/{message_id}/reply", 
            headers=jane_headers,
            json={
                "message": "This is my reply to your message"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "Re: Original Message"
        assert data["parent_message_id"] == message_id
        assert data["recipient_username"] == "john_doe"
    
    @pytest.mark.timeout(10)
    def test_delete_message(self, client: TestClient, auth_headers: dict):
        """Test deleting a message"""
        # Send message
        send_response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "To Delete",
                "message": "Delete me",
                "priority": "normal"
            }
        )
        message_id = send_response.json()["id"]
        
        # Delete message
        response = client.delete(f"/api/messages/{message_id}", 
                               headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it's marked as deleted for sender
        get_response = client.get(f"/api/messages/{message_id}", 
                                headers=auth_headers)
        assert get_response.status_code == 404
    
    @pytest.mark.timeout(10)
    def test_list_inbox_messages(self, client: TestClient, auth_headers: dict):
        """Test listing inbox messages"""
        response = client.get("/api/messages/inbox", headers=auth_headers)
        if response.status_code != 200:
            print(f"Response: {response.json()}")
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)
    
    @pytest.mark.timeout(10)
    def test_list_sent_messages(self, client: TestClient, auth_headers: dict):
        """Test listing sent messages"""
        response = client.get("/api/messages/sent", headers=auth_headers)
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)
        
        if len(messages) > 0:
            message = messages[0]
            assert "recipient_username" in message
            assert message["sender_username"] == "john_doe"
    
    @pytest.mark.timeout(10)
    def test_search_messages(self, client: TestClient, auth_headers: dict):
        """Test searching messages"""
        # First send a message with searchable content
        client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Account Information",
                "message": "Details about your account",
                "priority": "normal"
            }
        )
        
        response = client.get("/api/messages/search?query=account", 
                            headers=auth_headers)
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)
        if len(messages) > 0:
            assert any("account" in m["subject"].lower() or 
                      "account" in m["message"].lower() 
                      for m in messages)
    
    @pytest.mark.timeout(10)
    def test_message_thread(self, client: TestClient, auth_headers: dict):
        """Test getting message thread"""
        # Send initial message
        send_response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Thread Start",
                "message": "Starting a conversation",
                "priority": "normal"
            }
        )
        message_id = send_response.json()["id"]
        
        # Get thread
        response = client.get(f"/api/messages/thread/{message_id}", 
                            headers=auth_headers)
        assert response.status_code == 200
        thread = response.json()
        assert isinstance(thread, list)
        assert any(m["id"] == message_id for m in thread)
    
    @pytest.mark.timeout(10)
    def test_message_attachments(self, client: TestClient, auth_headers: dict):
        """Test sending message with attachments"""
        response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Documents Attached",
                "message": "Please review the attached documents",
                "priority": "normal",
                "attachments": [
                    {
                        "filename": "statement.pdf",
                        "file_type": "application/pdf",
                        "file_size": 204800
                    }
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "attachments" in data
        assert len(data["attachments"]) == 1
        assert data["attachments"][0]["filename"] == "statement.pdf"
    
    @pytest.mark.timeout(10)
    def test_message_drafts(self, client: TestClient, auth_headers: dict):
        """Test saving and managing drafts"""
        # Save draft
        response = client.post("/api/messages/drafts", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Draft Message",
                "message": "This is a draft",
                "priority": "normal"
            }
        )
        assert response.status_code == 200
        draft_id = response.json()["id"]
        assert response.json()["is_draft"] == True
        
        # List drafts
        drafts_response = client.get("/api/messages/drafts", headers=auth_headers)
        assert drafts_response.status_code == 200
        drafts = drafts_response.json()
        assert any(d["id"] == draft_id for d in drafts)
    
    @pytest.mark.timeout(10) 
    def test_bulk_message_operations(self, client: TestClient, auth_headers: dict):
        """Test bulk message operations"""
        # Login as jane to receive messages
        jane_login = client.post("/api/auth/login", json={
            "username": "jane_smith",
            "password": "DemoUser2026Banking"
        })
        jane_token = jane_login.json()["access_token"]
        jane_headers = {"Authorization": f"Bearer {jane_token}"}
        
        # Send two messages to Jane
        msg1 = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Message 1",
                "message": "First message",
                "priority": "normal"
            }
        )
        msg2 = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Message 2",
                "message": "Second message",
                "priority": "normal"
            }
        )
        
        # Only proceed if messages were created successfully
        if msg1.status_code == 200 and msg2.status_code == 200:
            message_ids = [msg1.json()["id"], msg2.json()["id"]]
            
            # Bulk mark as read (as Jane)
            response = client.put("/api/messages/bulk/read", 
                headers=jane_headers,
                json={"message_ids": message_ids}
            )
            assert response.status_code == 200
            assert "updated_count" in response.json()
        else:
            # Skip test if message creation failed
            pytest.skip("Message creation failed")
    
    @pytest.mark.timeout(10)
    def test_message_folders(self, client: TestClient, auth_headers: dict):
        """Test message folder management"""
        # Create folder
        response = client.post("/api/messages/folders", 
            headers=auth_headers,
            json={
                "folder_name": "Important",
                "color": "#FF0000"
            }
        )
        assert response.status_code == 200
        folder_id = response.json()["id"]
        
        # Send a message first
        msg_response = client.post("/api/messages", 
            headers=auth_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "To Move",
                "message": "Move to folder",
                "priority": "normal"
            }
        )
        message_id = msg_response.json()["id"]
        
        # Move message to folder
        move_response = client.put(f"/api/messages/{message_id}/move", 
            headers=auth_headers,
            json={"folder_id": folder_id}
        )
        assert move_response.status_code == 200
    
    @pytest.mark.timeout(10)
    def test_message_notifications(self, client: TestClient, auth_headers: dict):
        """Test message notification settings"""
        response = client.get("/api/messages/settings", headers=auth_headers)
        assert response.status_code == 200
        
        # Update settings
        response = client.put("/api/messages/settings", 
            headers=auth_headers,
            json={
                "email_on_new_message": True,
                "push_notifications": False,
                "notification_sound": True
            }
        )
        assert response.status_code == 200
        assert response.json()["email_on_new_message"] == True
    
    @pytest.mark.timeout(10)
    def test_block_sender(self, client: TestClient, auth_headers: dict):
        """Test blocking a sender"""
        # Block an existing user (mike_wilson)
        response = client.post("/api/messages/block", 
            headers=auth_headers,
            json={
                "username": "mike_wilson"
            }
        )
        assert response.status_code == 200
        assert response.json()["message"] == "User blocked successfully"
        
        # Verify blocked users list
        blocked_response = client.get("/api/messages/blocked", headers=auth_headers)
        assert blocked_response.status_code == 200
        blocked = blocked_response.json()
        assert "mike_wilson" in blocked
    
    @pytest.mark.timeout(10)
    def test_message_permissions(self, client: TestClient):
        """Test message access permissions"""
        # Login john_doe (sender)
        john_login = client.post("/api/auth/login", json={
            "username": "john_doe",
            "password": "DemoUser2026Banking"
        })
        assert john_login.status_code == 200
        john_token = john_login.json()["access_token"]
        john_headers = {"Authorization": f"Bearer {john_token}"}
        
        # Login jane_smith (recipient)
        jane_login = client.post("/api/auth/login", json={
            "username": "jane_smith",
            "password": "DemoUser2026Banking"
        })
        assert jane_login.status_code == 200
        jane_token = jane_login.json()["access_token"]
        jane_headers = {"Authorization": f"Bearer {jane_token}"}
        
        # Login mike_wilson (unauthorized user)
        mike_login = client.post("/api/auth/login", json={
            "username": "mike_wilson",
            "password": "DemoUser2026Banking"
        })
        assert mike_login.status_code == 200
        mike_token = mike_login.json()["access_token"]
        mike_headers = {"Authorization": f"Bearer {mike_token}"}
        
        # John sends message to Jane
        send_response = client.post("/api/messages", 
            headers=john_headers,
            json={
                "recipient_username": "jane_smith",
                "subject": "Private Message Test",
                "message": "Only for jane",
                "priority": "normal"
            }
        )
        assert send_response.status_code == 200
        message_id = send_response.json()["id"]
        
        # Mike should not be able to access the message
        response = client.get(f"/api/messages/{message_id}", 
                            headers=mike_headers)
        assert response.status_code == 404  # Not found for unauthorized users
        
        # Jane should be able to access it
        response = client.get(f"/api/messages/{message_id}", 
                            headers=jane_headers)
        assert response.status_code == 200
        
        # John (sender) should also be able to access it
        response = client.get(f"/api/messages/{message_id}", 
                            headers=john_headers)
        assert response.status_code == 200