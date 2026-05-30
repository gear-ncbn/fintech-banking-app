"""Canonical net-worth valuation.

This module is the single source of truth for how a user's net worth is
computed. Historically several endpoints (the Accounts summary, the Analytics
dashboard summary, the net-worth history and the PDF/CSV exports) each summed
``checking + savings + investment`` account balances minus
``credit_card + loan`` balances. That definition silently excluded the user's
entire investment portfolio (positions + buying power) and their crypto wallet,
so the headline "Net Worth" was wildly understated and disagreed with the
Investments and Crypto pages.

Everything now funnels through :func:`compute_net_worth` so the figure is
consistent everywhere and reconciles with the Investments/Crypto pages to the
cent.

Definition (applied everywhere)
-------------------------------
    total_assets = liquid bank assets (checking + savings)
                 + investment portfolio total value
                   (positions + buying-power cash + crypto wallet, valued via
                    services.portfolio_valuation)
    total_liabilities = credit-card balances + loan balances
    net_worth = total_assets - total_liabilities

Investment and crypto holdings are stored in their own data stores
(``investment_accounts`` / ``crypto_wallets``), never as rows in
``data_manager.accounts``, so folding in the canonical portfolio valuation does
not double count any bank balance.
"""
from typing import Any

from app.services.portfolio_valuation import compute_portfolio_valuation

# Liquid bank assets held directly as rows in ``data_manager.accounts``.
_CASH_ASSET_TYPES = {"checking", "savings"}
_LIABILITY_TYPES = {"credit_card", "loan"}


def _user_bank_accounts(data_manager: Any, user_id: int) -> list[dict[str, Any]]:
    """Return the user's active bank accounts, including joint accounts."""
    return [
        acc
        for acc in getattr(data_manager, "accounts", [])
        if (acc.get("user_id") == user_id or acc.get("joint_owner_id") == user_id)
        and acc.get("is_active", True)
    ]


def compute_net_worth(data_manager: Any, user_id: int) -> dict[str, float]:
    """Compute the canonical net worth for ``user_id``.

    Returns a dict with ``net_worth``, ``total_assets``, ``total_liabilities``
    and the ``cash_assets`` / ``investment_value`` components that make up the
    asset total.
    """
    accounts = _user_bank_accounts(data_manager, user_id)

    cash_assets = sum(
        float(acc.get("balance") or 0.0)
        for acc in accounts
        if acc.get("account_type") in _CASH_ASSET_TYPES
    )
    total_liabilities = sum(
        abs(float(acc.get("balance") or 0.0))
        for acc in accounts
        if acc.get("account_type") in _LIABILITY_TYPES
    )

    investment_value = compute_portfolio_valuation(data_manager, user_id)["total_value"]

    total_assets = cash_assets + investment_value
    net_worth = total_assets - total_liabilities

    return {
        "net_worth": round(net_worth, 2),
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "cash_assets": round(cash_assets, 2),
        "investment_value": round(investment_value, 2),
    }
