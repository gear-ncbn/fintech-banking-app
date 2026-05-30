"""Position Models - Trading position and P&L models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class AssetClass(StrEnum):
    EQUITY = "equity"
    FIXED_INCOME = "fixed_income"
    FX = "fx"
    COMMODITIES = "commodities"
    DERIVATIVES = "derivatives"
    ALTERNATIVES = "alternatives"


class PositionStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    PENDING = "pending"


class TradingPosition(BaseModel):
    position_id: UUID = Field(default_factory=uuid4)
    position_reference: str
    asset_class: AssetClass
    instrument_id: str
    instrument_name: str
    portfolio_id: UUID
    book_id: str
    trader_id: str
    quantity: float
    direction: str
    entry_date: date
    entry_price: float
    current_price: float
    market_value: float
    cost_basis: float
    unrealized_pnl: float
    realized_pnl: float = 0.0
    total_pnl: float
    currency: str
    status: PositionStatus = PositionStatus.OPEN
    risk_weight: float = 1.0
    var_contribution: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DailyPnL(BaseModel):
    pnl_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    pnl_date: date
    opening_value: float
    closing_value: float
    net_flows: float
    total_pnl: float
    trading_pnl: float
    carry_pnl: float
    fx_pnl: float
    other_pnl: float
    mtm_pnl: float
    new_trade_pnl: float
    fees_and_costs: float = 0.0
    pnl_attribution: dict[str, float] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PnLAttribution(BaseModel):
    attribution_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    attribution_date: date
    total_pnl: float
    market_pnl: float
    delta_pnl: float
    gamma_pnl: float
    vega_pnl: float
    theta_pnl: float
    rho_pnl: float
    fx_translation_pnl: float
    carry_pnl: float
    roll_pnl: float
    trade_pnl: float
    unexplained_pnl: float
    by_asset_class: dict[str, float] = {}
    by_risk_factor: dict[str, float] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PortfolioValuation(BaseModel):
    valuation_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    valuation_date: date
    total_market_value: float
    total_cost_basis: float
    total_unrealized_pnl: float
    total_realized_pnl: float
    cash_balance: float
    collateral_value: float
    net_asset_value: float
    by_asset_class: dict[str, float] = {}
    by_currency: dict[str, float] = {}
    by_sector: dict[str, float] = {}
    concentration_metrics: dict[str, float] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TradingBook(BaseModel):
    book_id: UUID = Field(default_factory=uuid4)
    book_code: str
    book_name: str
    book_type: str  # trading, banking, hedging
    trader_id: str
    desk: str
    entity: str
    base_currency: str
    var_limit: float
    pnl_limit: float
    gross_limit: float
    net_limit: float
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PositionStatistics(BaseModel):
    total_positions: int = 0
    total_market_value: float = 0.0
    total_unrealized_pnl: float = 0.0
    total_realized_pnl: float = 0.0
    by_asset_class: dict[str, int] = {}
    by_status: dict[str, int] = {}
