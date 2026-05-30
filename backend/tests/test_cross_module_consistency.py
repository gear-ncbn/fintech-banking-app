"""Cross-module spending consistency tests.

These tests pin down the bug this change set fixes: the SAME spending figure
used to disagree across the Dashboard, Analytics, Transactions and Budget
modules because each computed it from a different window / aggregation path.

Everything now flows through ``app.services.spending_aggregator`` over a single
calendar-month window, so for the seeded demo user (``john_doe``) all of these
must reconcile to the cent:

* Transactions  -> ``/api/transactions/stats`` ``total_expenses``
* Analytics     -> ``/api/analytics/intelligence/dashboard-summary`` ``cash_flow.money_out``
* Budget        -> ``/api/budgets/summary`` ``total_spent``

and each module's per-category breakdown must sum back to that same headline.
"""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.repositories.data_manager import data_manager

# Figures are rounded to 2dp across the app; allow sub-cent float noise.
TOLERANCE = 0.01


@pytest.fixture(autouse=True)
def _canonical_seed():
    """Re-seed the shared in-memory store to the canonical dataset.

    The test suite is session-scoped and never resets ``data_manager`` between
    tests (see ``conftest.py``), so earlier tests mutate budgets/transactions.
    These consistency tests assert properties of the *seeded* canonical data, so
    restore it (seed=42) before each test. This also leaves the store in its
    canonical starting state for any later tests.
    """
    data_manager.reset(seed=42, demo_mode=True)
    yield


def _current_month_window() -> tuple[str, str]:
    now = datetime.now(UTC)
    start = now.replace(day=1).date().isoformat()
    end = now.date().isoformat()
    return start, end


def _get_stats(client: TestClient, headers: dict) -> dict:
    start, end = _current_month_window()
    resp = client.get(
        "/api/transactions/stats",
        params={"start_date": start, "end_date": end},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _get_budget_summary(client: TestClient, headers: dict) -> dict:
    resp = client.get("/api/budgets/summary", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _get_analytics_summary(client: TestClient, headers: dict) -> dict:
    resp = client.get(
        "/api/analytics/intelligence/dashboard-summary", headers=headers
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_monthly_spending_reconciles_across_modules(client, auth_headers):
    """Dashboard/Transactions == Analytics == Budget for the current month."""
    stats = _get_stats(client, auth_headers)
    budget_summary = _get_budget_summary(client, auth_headers)
    analytics = _get_analytics_summary(client, auth_headers)

    stats_expenses = stats["total_expenses"]
    money_out = analytics["cash_flow"]["money_out"]
    budget_spent = budget_summary["total_spent"]

    assert abs(stats_expenses - money_out) < TOLERANCE, (
        f"transactions/stats expenses ({stats_expenses}) != "
        f"analytics money_out ({money_out})"
    )
    assert abs(stats_expenses - budget_spent) < TOLERANCE, (
        f"transactions/stats expenses ({stats_expenses}) != "
        f"budget total_spent ({budget_spent})"
    )


def test_category_breakdowns_sum_to_headline(client, auth_headers):
    """Each module's category breakdown must sum to its headline total."""
    stats = _get_stats(client, auth_headers)
    analytics = _get_analytics_summary(client, auth_headers)
    budget_summary = _get_budget_summary(client, auth_headers)

    stats_cat_sum = sum(c["total_amount"] for c in stats["categories_breakdown"])
    assert abs(stats_cat_sum - stats["total_expenses"]) < TOLERANCE, (
        f"stats category breakdown ({stats_cat_sum}) != "
        f"total_expenses ({stats['total_expenses']})"
    )

    analytics_expense_sum = sum(
        c["amount"]
        for c in analytics["cash_flow"]["categories"]
        if c["type"] == "expense"
    )
    assert abs(analytics_expense_sum - analytics["cash_flow"]["money_out"]) < TOLERANCE, (
        f"analytics expense categories ({analytics_expense_sum}) != "
        f"money_out ({analytics['cash_flow']['money_out']})"
    )

    per_budget_sum = sum(b["spent_amount"] for b in budget_summary["budgets"])
    assert abs(per_budget_sum - budget_summary["total_spent"]) < TOLERANCE, (
        f"per-budget spent ({per_budget_sum}) != "
        f"total_spent ({budget_summary['total_spent']})"
    )


def _get_portfolio_summary(client: TestClient, headers: dict) -> dict:
    resp = client.get("/api/investments/portfolio-summary", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _get_account_summary(client: TestClient, headers: dict) -> dict:
    resp = client.get("/api/accounts/summary", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _get_net_worth_history(client: TestClient, headers: dict) -> dict:
    resp = client.get(
        "/api/analytics/net-worth/history", params={"months_back": 12}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_portfolio_value_reconciles_across_modules(client, auth_headers):
    """The Investments page and the Analytics page must report the same total
    investment value (single source of truth: services.portfolio_valuation)."""
    portfolio = _get_portfolio_summary(client, auth_headers)
    analytics = _get_analytics_summary(client, auth_headers)
    inv_perf = analytics["investment_performance"]

    assert abs(portfolio["total_value"] - inv_perf["total_value"]) < TOLERANCE, (
        f"investments portfolio-summary total_value ({portfolio['total_value']}) != "
        f"analytics investment_performance total_value ({inv_perf['total_value']})"
    )


def test_portfolio_allocation_sums_to_headline(client, auth_headers):
    """The asset-allocation donut must sum to the headline total: the percentage
    breakdown sums to 100% and the dollar breakdown sums to total_value."""
    portfolio = _get_portfolio_summary(client, auth_headers)
    pct_sum = sum(portfolio["asset_allocation"].values())
    assert abs(pct_sum - 100.0) < 0.5, (
        f"asset allocation percentages must sum to ~100 (got {pct_sum})"
    )

    analytics = _get_analytics_summary(client, auth_headers)
    inv_perf = analytics["investment_performance"]
    value_sum = sum(a["value"] for a in inv_perf["asset_allocation"])
    assert abs(value_sum - inv_perf["total_value"]) < TOLERANCE, (
        f"asset allocation dollar breakdown ({value_sum}) != "
        f"total_value ({inv_perf['total_value']})"
    )


def test_investment_return_is_internally_consistent(client, auth_headers):
    """Return $/% and cost basis must be consistent with total_value, and the
    Investments and Analytics pages must agree on the return %."""
    portfolio = _get_portfolio_summary(client, auth_headers)
    analytics = _get_analytics_summary(client, auth_headers)
    inv_perf = analytics["investment_performance"]

    # gain/loss == value - cost basis, and % == gain/loss / cost basis.
    # value, cost basis and gain/loss are each independently rounded to 2dp, so
    # the derived difference can carry up to a cent of rounding from each input.
    rounding_tol = 0.02
    expected_gl = inv_perf["total_value"] - inv_perf["total_cost_basis"]
    assert abs(inv_perf["total_gain_loss"] - expected_gl) < rounding_tol, (
        f"total_gain_loss ({inv_perf['total_gain_loss']}) != "
        f"total_value - total_cost_basis ({expected_gl})"
    )
    if inv_perf["total_cost_basis"] > 0:
        expected_pct = expected_gl / inv_perf["total_cost_basis"] * 100
        assert abs(inv_perf["total_gain_loss_percentage"] - expected_pct) < rounding_tol, (
            f"return % ({inv_perf['total_gain_loss_percentage']}) inconsistent with "
            f"gain/loss over cost basis ({expected_pct})"
        )

    # Investments page (year_change/percent) agrees with Analytics.
    assert abs(portfolio["year_change"] - inv_perf["total_gain_loss"]) < TOLERANCE, (
        f"portfolio year_change ({portfolio['year_change']}) != "
        f"analytics total_gain_loss ({inv_perf['total_gain_loss']})"
    )
    assert (
        abs(portfolio["year_change_percent"] - inv_perf["total_gain_loss_percentage"])
        < TOLERANCE
    ), (
        f"portfolio year_change_percent ({portfolio['year_change_percent']}) != "
        f"analytics total_gain_loss_percentage ({inv_perf['total_gain_loss_percentage']})"
    )


def test_portfolio_performance_history_matches_current_value(client, auth_headers):
    """The performance history must end at the current headline total_value so
    the trend line and the header can never disagree."""
    portfolio = _get_portfolio_summary(client, auth_headers)
    history = portfolio["performance_history"]
    assert history, "expected a seeded performance history"
    assert abs(history[-1]["value"] - portfolio["total_value"]) < TOLERANCE, (
        f"performance history end ({history[-1]['value']}) != "
        f"total_value ({portfolio['total_value']})"
    )


def test_net_worth_reconciles_across_modules(client, auth_headers):
    """Net worth must be internally consistent (assets - liabilities) and match
    between the Accounts summary and the Analytics net-worth history."""
    summary = _get_account_summary(client, auth_headers)
    expected = summary["total_assets"] - summary["total_liabilities"]
    assert abs(summary["net_worth"] - expected) < TOLERANCE, (
        f"net_worth ({summary['net_worth']}) != "
        f"total_assets - total_liabilities ({expected})"
    )

    history = _get_net_worth_history(client, auth_headers)
    assert abs(history["current_net_worth"] - summary["net_worth"]) < TOLERANCE, (
        f"net-worth history current ({history['current_net_worth']}) != "
        f"accounts summary net_worth ({summary['net_worth']})"
    )


def test_seeded_budgets_are_monthly_per_spending_category(client, auth_headers):
    """Budgets are seeded deterministically: one monthly budget per category
    the user actually spends in, which is what makes the totals reconcile."""
    stats = _get_stats(client, auth_headers)
    budget_summary = _get_budget_summary(client, auth_headers)

    assert budget_summary["budgets"], "expected seeded budgets for demo user"
    assert all(b["period"] == "monthly" for b in budget_summary["budgets"]), (
        "all seeded budgets should be monthly so they share the canonical window"
    )

    spending_category_ids = {
        c["category_id"]
        for c in stats["categories_breakdown"]
        if c.get("category_id") is not None
    }
    budget_category_ids = {b["category_id"] for b in budget_summary["budgets"]}
    # Every category the user spends in this month must have a budget. (Budgets
    # are seeded from all-time spend, so the budget set may be a superset; any
    # extra budget simply contributes 0 spend this month and still reconciles.)
    assert spending_category_ids <= budget_category_ids, (
        "every spending category should have a budget: "
        f"spending={spending_category_ids} budgets={budget_category_ids}"
    )
    # Each category appears at most once (one budget per category).
    budget_cat_list = [b["category_id"] for b in budget_summary["budgets"]]
    assert len(budget_cat_list) == len(set(budget_cat_list)), (
        "expected exactly one budget per category"
    )
