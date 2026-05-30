"""Smoke tests for route and memory-adapter compatibility."""

import pytest
from fastapi.testclient import TestClient


class TestEndpointSmoke:
    """Cover endpoints that are easy to shadow or break in the memory store."""

    def test_savings_static_routes_are_not_shadowed(
        self, client: TestClient, auth_headers: dict
    ):
        rules = client.get("/api/savings/rules", headers=auth_headers)
        assert rules.status_code == 200
        assert isinstance(rules.json(), list)

        challenges = client.get("/api/savings/challenges", headers=auth_headers)
        assert challenges.status_code == 200
        assert isinstance(challenges.json(), list)

    def test_notification_mark_all_read_route_is_not_shadowed(
        self, client: TestClient, auth_headers: dict
    ):
        created = client.post(
            "/api/notifications/test/budget_warning", headers=auth_headers
        )
        assert created.status_code == 200

        response = client.put("/api/notifications/mark-all-read", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["message"].startswith("Marked ")

    def test_goal_contributions_serialize_memory_models(
        self, client: TestClient, auth_headers: dict
    ):
        created = client.post(
            "/api/goals",
            headers=auth_headers,
            json={
                "name": "Smoke Goal",
                "target_amount": 1000.0,
                "current_amount": 100.0,
            },
        )
        assert created.status_code == 201

        response = client.get(
            f"/api/goals/{created.json()['id']}/contributions",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["contributions"] == []

    def test_credit_history_and_report_accept_memory_store_strings(
        self, client: TestClient, auth_headers: dict
    ):
        history = client.get("/api/credit/history", headers=auth_headers)
        assert history.status_code == 200
        assert "scores" in history.json()

        report = client.get("/api/credit/report", headers=auth_headers)
        assert report.status_code == 200
        assert "accounts" in report.json()

    def test_card_transactions_accept_memory_store_strings(
        self, client: TestClient, auth_headers: dict
    ):
        cards = client.get("/api/cards", headers=auth_headers).json()
        if not cards:
            pytest.skip("No cards available for smoke test")

        response = client.get(
            f"/api/cards/{cards[0]['id']}/transactions",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
