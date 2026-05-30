"""
Investment-related models for ETF, stock, and crypto trading.
"""
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


# Investment-specific enums
class InvestmentAccountType(StrEnum):
    INDIVIDUAL = "individual"
    IRA = "ira"
    ROTH_IRA = "roth_ira"
    SEP_IRA = "sep_ira"
    SIMPLE_IRA = "simple_ira"
    TRADITIONAL_401K = "401k"
    ROTH_401K = "roth_401k"
    BROKERAGE = "brokerage"
    MARGIN = "margin"
    CRYPTO = "crypto"

class AssetType(StrEnum):
    ETF = "etf"
    STOCK = "stock"
    CRYPTO = "crypto"
    MUTUAL_FUND = "mutual_fund"
    BOND = "bond"
    OPTION = "option"
    COMMODITY = "commodity"

class OrderType(StrEnum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"

class OrderSide(StrEnum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(StrEnum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"

class PortfolioRiskLevel(StrEnum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"
    VERY_AGGRESSIVE = "very_aggressive"

class TradingSession(StrEnum):
    PRE_MARKET = "pre_market"
    REGULAR = "regular"
    AFTER_HOURS = "after_hours"
    EXTENDED = "extended"

# Request/Response Models
class InvestmentAccountCreate(BaseModel):
    account_type: InvestmentAccountType
    account_name: str
    initial_deposit: float = 0
    is_retirement: bool = False
    risk_tolerance: PortfolioRiskLevel = PortfolioRiskLevel.MODERATE

class InvestmentAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    account_type: InvestmentAccountType
    account_number: str
    account_name: str
    balance: Decimal
    cash_balance: Decimal | None = None  # Alias for balance
    buying_power: Decimal
    portfolio_value: Decimal
    total_return: Decimal
    total_return_percent: Decimal
    is_retirement: bool
    risk_tolerance: PortfolioRiskLevel
    created_at: datetime
    updated_at: datetime

    def model_post_init(self, __context: Any) -> None:
        """Set cash_balance to balance if not set."""
        if self.cash_balance is None:
            self.cash_balance = self.balance

class PortfolioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    name: str
    total_value: Decimal
    total_cost_basis: Decimal
    total_gain_loss: Decimal
    total_gain_loss_percent: Decimal
    positions_count: int
    asset_allocation: dict[str, float]
    risk_score: float
    performance_1d: Decimal | None = None
    performance_1w: Decimal | None = None
    performance_1m: Decimal | None = None
    performance_ytd: Decimal | None = None
    performance_1y: Decimal | None = None

class AssetResponse(BaseModel):
    """Base asset information"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    name: str
    asset_type: AssetType
    current_price: Decimal
    price_change: Decimal
    price_change_percent: Decimal
    volume: int
    market_cap: Decimal | None = None
    pe_ratio: float | None = None
    dividend_yield: float | None = None
    week_52_high: Decimal | None = None
    week_52_low: Decimal | None = None

class ETFDetailResponse(AssetResponse):
    """ETF specific details"""
    expense_ratio: float
    net_assets: Decimal
    category: str
    holdings_count: int
    top_holdings: list[dict[str, Any]]
    sector_allocation: dict[str, float]

class StockDetailResponse(AssetResponse):
    """Stock specific details"""
    sector: str
    industry: str
    earnings_date: date | None = None
    beta: float | None = None
    forward_pe: float | None = None
    profit_margin: float | None = None
    analyst_rating: str | None = None
    analyst_target_price: Decimal | None = None

class PositionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    portfolio_id: int
    asset_type: AssetType
    symbol: str
    name: str
    quantity: Decimal
    average_cost: Decimal
    current_price: Decimal
    current_value: Decimal
    cost_basis: Decimal
    unrealized_gain_loss: Decimal
    unrealized_gain_loss_percent: Decimal
    realized_gain_loss: Decimal
    percentage_of_portfolio: float
    first_purchase_date: date

class TradeOrderCreate(BaseModel):
    account_id: int
    symbol: str
    asset_type: AssetType
    order_type: OrderType
    order_side: OrderSide
    quantity: float
    limit_price: float | None = None
    stop_price: float | None = None
    time_in_force: str = "day"  # day, gtc (good till cancelled), ioc (immediate or cancel)
    extended_hours: bool = False

class TradeOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    order_number: str
    symbol: str
    asset_type: AssetType
    order_type: OrderType
    order_side: OrderSide
    quantity: Decimal
    filled_quantity: Decimal
    limit_price: Decimal | None = None
    stop_price: Decimal | None = None
    average_fill_price: Decimal | None = None
    status: OrderStatus
    time_in_force: str
    extended_hours: bool
    commission: Decimal
    submitted_at: datetime
    filled_at: datetime | None = None
    cancelled_at: datetime | None = None

class TradeHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    order_id: int
    trade_number: str
    symbol: str
    asset_type: AssetType
    side: OrderSide
    quantity: Decimal
    price: Decimal
    total_amount: Decimal
    commission: Decimal
    fees: Decimal
    executed_at: datetime
    settlement_date: date

class WatchlistCreate(BaseModel):
    name: str
    description: str | None = None
    symbols: list[str] = []

class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    description: str | None = None
    symbols: list[str]
    assets: list[dict] | None = None  # Asset details
    created_at: datetime
    updated_at: datetime

    def model_post_init(self, __context: Any) -> None:
        """Set assets from symbols if not set."""
        if self.assets is None:
            self.assets = [{"symbol": symbol} for symbol in self.symbols]

class MarketDataResponse(BaseModel):
    """Real-time market data"""
    symbol: str
    bid_price: Decimal
    ask_price: Decimal
    last_price: Decimal
    volume: int
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    close_price: Decimal
    timestamp: datetime

class PortfolioAnalysisResponse(BaseModel):
    """Portfolio analysis and recommendations"""
    portfolio_id: int
    risk_score: float
    diversification_score: float
    performance_score: float
    recommendations: list[dict[str, Any]]
    rebalancing_suggestions: list[dict[str, Any]]
    tax_loss_harvesting_opportunities: list[dict[str, Any]]

class InvestmentSummaryResponse(BaseModel):
    """Overall investment summary"""
    total_accounts: int
    total_portfolio_value: Decimal
    total_buying_power: Decimal
    total_gain_loss: Decimal
    total_gain_loss_percent: Decimal
    accounts_by_type: dict[str, int]
    asset_allocation: dict[str, float]
    top_performers: list[dict[str, Any]]
    worst_performers: list[dict[str, Any]]
    recent_trades: list[dict[str, Any]]

class ResearchReportResponse(BaseModel):
    """Investment research report"""
    symbol: str
    report_type: str  # fundamental, technical, analyst
    rating: str
    target_price: Decimal | None = None
    summary: str
    key_metrics: dict[str, Any]
    pros: list[str]
    cons: list[str]
    generated_at: datetime

class TaxDocumentResponse(BaseModel):
    """Tax-related investment documents"""
    document_type: str  # 1099-B, 1099-DIV, 1099-INT
    tax_year: int
    account_id: int
    total_proceeds: Decimal
    total_cost_basis: Decimal
    total_gain_loss: Decimal
    short_term_gain_loss: Decimal
    long_term_gain_loss: Decimal
    total_dividends: Decimal | None = None
    qualified_dividends: Decimal | None = None
    document_url: str
    generated_at: datetime
