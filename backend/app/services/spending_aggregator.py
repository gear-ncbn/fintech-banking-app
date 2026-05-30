"""Canonical spending aggregation.

This module is the single source of truth for how spending, income and
per-category breakdowns are computed from the canonical transaction store
(``data_manager.transactions``).

Historically every module (dashboard, analytics, transactions, budget) rolled
its own aggregation logic with different date windows, sign conventions and
category coverage, so the same "spending" number disagreed across pages. All of
those modules now funnel through :func:`aggregate_spending` so a given user and
window always yield identical totals, counts and category breakdowns.

Conventions (applied everywhere):
* A transaction is *income* when ``transaction_type == 'credit'`` and an
  *expense* when ``transaction_type == 'debit'``.
* "Spending" / "money out" / "total spent" all mean the sum of expense amounts.
* The canonical reporting window for the headline "this month" figures is the
  current calendar month (see :func:`current_month_window`).
"""
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta

INCOME_TYPE = "credit"
EXPENSE_TYPE = "debit"


def current_month_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    """Return the (start, end) datetimes for the current calendar month in UTC.

    ``start`` is midnight on the 1st of the month; ``end`` is the last
    microsecond of the month so the range is fully inclusive.
    """
    now = now or datetime.now(UTC)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = start + relativedelta(months=1)
    end = next_month - timedelta(microseconds=1)
    return start, end


def _to_datetime(value: Any) -> datetime | None:
    """Normalise a stored transaction date to a timezone-aware UTC datetime."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value)
        except ValueError:
            return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    return None


def aggregate_spending(
    data_manager: Any,
    user_id: Any,
    start: datetime,
    end: datetime,
    category_id: Any | None = None,
) -> dict[str, Any]:
    """Aggregate a user's transactions within ``[start, end]`` (inclusive).

    Returns a dict with income/expense totals, transaction count, average
    transaction amount and a per-category expense breakdown. Every consumer in
    the app builds its figures from this single result so they always
    reconcile.
    """
    start = _to_datetime(start)
    end = _to_datetime(end)

    account_ids = {
        acc["id"]
        for acc in data_manager.accounts
        if acc.get("user_id") == user_id
    }

    category_names = {
        cat["id"]: cat.get("name", "Unknown")
        for cat in data_manager.categories
    }

    total_income = 0.0
    total_expenses = 0.0
    transaction_count = 0
    amount_sum = 0.0
    by_category: dict[Any, dict[str, float]] = defaultdict(
        lambda: {"amount": 0.0, "count": 0}
    )

    for tx in data_manager.transactions:
        if tx.get("account_id") not in account_ids:
            continue

        tx_date = _to_datetime(tx.get("transaction_date") or tx.get("created_at"))
        if tx_date is None:
            continue
        if start is not None and tx_date < start:
            continue
        if end is not None and tx_date > end:
            continue

        if category_id is not None and tx.get("category_id") != category_id:
            continue

        amount = float(tx.get("amount") or 0.0)
        transaction_count += 1
        amount_sum += amount

        if tx.get("transaction_type") == INCOME_TYPE:
            total_income += amount
        else:
            total_expenses += amount
            cid = tx.get("category_id")
            by_category[cid]["amount"] += amount
            by_category[cid]["count"] += 1

    categories_breakdown = [
        {
            "category_id": cid,
            "category_name": category_names.get(cid, "Unknown"),
            "total_amount": round(values["amount"], 2),
            "transaction_count": int(values["count"]),
        }
        for cid, values in by_category.items()
    ]
    categories_breakdown.sort(key=lambda c: c["total_amount"], reverse=True)

    average_transaction = amount_sum / transaction_count if transaction_count else 0.0

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_flow": round(total_income - total_expenses, 2),
        "transaction_count": transaction_count,
        "average_transaction": round(average_transaction, 2),
        "categories_breakdown": categories_breakdown,
    }


def category_spending(
    data_manager: Any,
    user_id: Any,
    category_id: Any,
    start: datetime,
    end: datetime,
) -> float:
    """Convenience helper returning total expense for a single category."""
    result = aggregate_spending(data_manager, user_id, start, end, category_id=category_id)
    return result["total_expenses"]
