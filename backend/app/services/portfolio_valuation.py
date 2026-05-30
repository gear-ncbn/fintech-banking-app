"""Canonical investment-portfolio valuation.

This module is the single source of truth for how a user's investment
portfolio is valued. Historically the value was computed in several places with
different definitions, so the same user saw different "total portfolio value"
numbers on different pages:

* ``investment_manager.get_portfolio_summary`` reported
  ``sum(positions) + crypto wallet`` for ``total_value`` but computed
  ``total_return``/``cost basis`` from positions only, and built the
  asset-allocation donut over ``positions + crypto + cash``. So the header
  total, its own return %, the performance-history starting value and the donut
  all used different bases.
* ``analytics_engine.calculate_investment_performance`` and the
  ``/api/investments/accounts`` list reported ``sum(positions)`` only.

Everything now funnels through :func:`compute_portfolio_valuation` so the
headline total, the return $/%, the cost basis, the performance history and the
asset-allocation breakdown are always derived from one definition and reconcile
to the cent.

Definition (applied everywhere)
-------------------------------
"Total portfolio value" is the **total value of the user's investment
account(s)**:

    total_value = invested positions (stocks + ETFs + crypto positions)
                + crypto wallet holdings (single source: crypto_manager)
                + cash / buying power

Only the invested positions have a tracked cost basis, so unrealised
gain/loss ("total return") comes entirely from positions. Cash and crypto-wallet
holdings are treated as held at break-even (cost basis == current value),
contributing $0 to the return. This keeps the return $ equal to the true
investment P/L while making the return % a coherent fraction of the same total
the header shows, and the donut segments sum to exactly that total.
"""
from collections import defaultdict
from typing import Any

from app.repositories.crypto_manager import compute_user_crypto_holdings

# Map a raw position ``asset_type`` to one of the canonical allocation buckets.
_STOCK_BUCKET = "stocks"
_ETF_BUCKET = "etfs"
_CRYPTO_BUCKET = "crypto"
_CASH_BUCKET = "cash"


def _position_bucket(asset_type: Any) -> str:
    at = (asset_type or "stock").lower()
    if at == "etf":
        return _ETF_BUCKET
    if at == "crypto":
        return _CRYPTO_BUCKET
    return _STOCK_BUCKET


def _user_positions(data_manager: Any, user_id: int) -> list[dict[str, Any]]:
    """Return every investment position belonging to ``user_id``'s accounts."""
    account_ids = {
        acc["id"]
        for acc in getattr(data_manager, "investment_accounts", [])
        if acc.get("user_id") == user_id
    }
    portfolio_ids = {
        p["id"]
        for p in getattr(data_manager, "investment_portfolios", [])
        if p.get("account_id") in account_ids
    }
    return [
        pos
        for pos in getattr(data_manager, "investment_positions", [])
        if pos.get("portfolio_id") in portfolio_ids
    ]


def compute_portfolio_valuation(data_manager: Any, user_id: int) -> dict[str, Any]:
    """Compute the canonical valuation of ``user_id``'s investment portfolio.

    Returns a dict with the headline ``total_value``; the invested-only
    ``positions_value``/``positions_cost_basis``; the separate ``crypto_value``
    and ``cash_value`` components; the unrealised ``total_return``/
    ``total_return_percent`` and ``total_cost_basis`` that reconcile with
    ``total_value``; and an ``allocation`` breakdown (both percentages and
    dollar values) whose segments sum to ``total_value``.
    """
    positions = _user_positions(data_manager, user_id)

    positions_value = 0.0
    positions_cost_basis = 0.0
    bucket_value: dict[str, float] = defaultdict(float)
    for pos in positions:
        current_value = float(pos.get("current_value") or 0.0)
        cost_basis = float(pos.get("cost_basis") or 0.0)
        positions_value += current_value
        positions_cost_basis += cost_basis
        bucket_value[_position_bucket(pos.get("asset_type"))] += current_value

    crypto_value, _ = compute_user_crypto_holdings(data_manager, user_id)

    cash_value = sum(
        float(acc.get("buying_power") or 0.0)
        for acc in getattr(data_manager, "investment_accounts", [])
        if acc.get("user_id") == user_id
    )

    # The crypto wallet adds to the crypto allocation bucket; cash is its own.
    bucket_value[_CRYPTO_BUCKET] += crypto_value
    bucket_value[_CASH_BUCKET] += cash_value

    total_value = positions_value + crypto_value + cash_value

    # Only positions carry unrealised gain/loss; cash and the crypto wallet are
    # held at break-even, so the total cost basis is everything-but-positions at
    # current value plus the positions' real cost basis.
    total_cost_basis = positions_cost_basis + crypto_value + cash_value
    total_return = total_value - total_cost_basis
    total_return_percent = (
        (total_return / total_cost_basis * 100) if total_cost_basis > 0 else 0.0
    )

    allocation_percent: dict[str, float] = {
        _STOCK_BUCKET: 0.0,
        _ETF_BUCKET: 0.0,
        _CRYPTO_BUCKET: 0.0,
        _CASH_BUCKET: 0.0,
    }
    allocation_value: dict[str, float] = {
        k: round(bucket_value.get(k, 0.0), 2) for k in allocation_percent
    }
    if total_value > 0:
        allocation_percent = {
            k: round(bucket_value.get(k, 0.0) / total_value * 100, 2)
            for k in allocation_percent
        }

    return {
        "total_value": round(total_value, 2),
        "positions_value": round(positions_value, 2),
        "positions_cost_basis": round(positions_cost_basis, 2),
        "crypto_value": round(crypto_value, 2),
        "cash_value": round(cash_value, 2),
        "total_cost_basis": round(total_cost_basis, 2),
        "total_return": round(total_return, 2),
        "total_return_percent": round(total_return_percent, 2),
        "allocation": allocation_percent,
        "allocation_value": allocation_value,
    }
