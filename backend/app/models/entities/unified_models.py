from datetime import date, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


# Unified system enums
class AssetClass(StrEnum):
    FIAT = "fiat"
    CRYPTO = "crypto"
    NFT = "nft"
    CREDIT = "credit"
    LOAN = "loan"
    INSURANCE = "insurance"
    INVESTMENT = "investment"

class ConversionType(StrEnum):
    FIAT_TO_CRYPTO = "fiat_to_crypto"
    CRYPTO_TO_FIAT = "crypto_to_fiat"
    CRYPTO_TO_CRYPTO = "crypto_to_crypto"
    CREDIT_TO_FIAT = "credit_to_fiat"
    COLLATERAL_SWAP = "collateral_swap"

class TransferStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Request/Response Models
class UnifiedBalanceResponse(BaseModel):
    """Aggregated balance across all asset types"""
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    total_net_worth_usd: float

    # Traditional assets
    fiat_assets: dict[str, float]  # currency -> amount
    total_fiat_usd: float

    # Digital assets
    crypto_assets: dict[str, dict[str, Any]]  # symbol -> {amount, usd_value}
    nft_collection_value: float
    total_crypto_usd: float

    # Credit available
    total_credit_available: float
    credit_utilization: float

    # Liabilities
    total_loans: float
    total_monthly_obligations: float

    # Insurance
    total_coverage_amount: float
    insurance_types_covered: list[str]

    # DeFi positions
    defi_positions_value: float
    defi_yield_annual: float

    # Calculated metrics
    debt_to_asset_ratio: float
    liquid_assets: float
    illiquid_assets: float

    last_updated: datetime

class AssetBridgeRequest(BaseModel):
    """Request to bridge/convert between different asset types"""
    from_asset_class: AssetClass
    from_asset_id: str  # Could be account_id, wallet_id, etc.
    from_amount: float | str  # String for crypto precision
    to_asset_class: AssetClass
    to_asset_id: str | None = None
    to_asset_type: str | None = None  # e.g., "USDC", "USD"
    notes: str | None = None

class AssetBridgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    bridge_type: ConversionType
    from_asset_class: AssetClass
    from_asset_id: str
    from_amount: str
    from_asset_name: str
    to_asset_class: AssetClass
    to_asset_id: str
    to_amount: str
    to_asset_name: str
    exchange_rate: float
    fees: dict[str, float]  # fee_type -> amount
    total_fees_usd: float
    status: TransferStatus
    initiated_at: datetime
    completed_at: datetime | None = None
    transaction_hash: str | None = None
    error_message: str | None = None

class UnifiedTransferRequest(BaseModel):
    """Smart transfer that finds optimal route"""
    recipient_identifier: str  # username, email, wallet address, etc.
    amount_usd: float
    preferred_method: str | None = None  # Let system choose if None
    preferred_currency: str | None = "USD"
    notes: str | None = None

class UnifiedTransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    recipient_id: int | None = None
    recipient_identifier: str
    amount_requested_usd: float

    # Route details
    route_taken: list[dict[str, Any]]  # Steps in the transfer
    source_assets: list[dict[str, Any]]  # Assets used

    # Final amounts
    amount_sent: str
    amount_sent_currency: str
    amount_received: str
    amount_received_currency: str

    # Fees and timing
    total_fees_usd: float
    exchange_rate: float | None = None
    estimated_arrival: datetime

    status: TransferStatus
    initiated_at: datetime
    completed_at: datetime | None = None

class CollateralPositionResponse(BaseModel):
    """Cross-asset collateral positions"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    position_type: str  # loan, credit_line, etc.

    # Collateral details
    collateral_assets: list[dict[str, Any]]  # Multiple assets as collateral
    total_collateral_value_usd: float

    # Borrowed/utilized
    amount_borrowed: float
    currency_borrowed: str

    # Risk metrics
    loan_to_value: float  # Current LTV
    liquidation_ltv: float  # LTV at which liquidation occurs
    health_factor: float  # How close to liquidation

    # Terms
    interest_rate: float
    interest_type: str  # fixed, variable

    created_at: datetime
    last_updated: datetime

class CrossAssetOpportunity(BaseModel):
    """Opportunities identified across different asset classes"""
    opportunity_type: str  # arbitrage, yield, refinance, etc.
    description: str
    potential_gain_usd: float
    risk_level: str  # low, medium, high

    # Required actions
    actions_required: list[dict[str, Any]]

    # Assets involved
    assets_involved: list[dict[str, Any]]

    # Time sensitivity
    expires_at: datetime | None = None
    optimal_execution_time: datetime | None = None

    # Requirements
    minimum_capital: float | None = None
    prerequisites: list[str]

class PortfolioOptimizationRequest(BaseModel):
    optimization_goal: str  # maximize_yield, minimize_risk, balance
    risk_tolerance: str  # conservative, moderate, aggressive
    time_horizon_days: int
    constraints: dict[str, Any] | None = None  # e.g., keep_minimum_checking

class PortfolioOptimizationResponse(BaseModel):
    current_allocation: dict[str, float]  # asset_class -> percentage
    recommended_allocation: dict[str, float]

    # Specific moves
    recommended_actions: list[dict[str, Any]]

    # Expected outcomes
    expected_return_annual: float
    risk_score: float  # 1-10

    # Benefits
    estimated_additional_yield: float
    risk_reduction: float

    # Execution plan
    execution_steps: list[dict[str, Any]]
    estimated_fees: float

class UnifiedSearchRequest(BaseModel):
    query: str
    asset_classes: list[AssetClass] | None = None
    date_from: date | None = None
    date_to: date | None = None
    min_amount: float | None = None
    max_amount: float | None = None

class UnifiedSearchResponse(BaseModel):
    results: list[dict[str, Any]]  # Transactions across all systems
    total_results: int
    grouping: dict[str, list[dict[str, Any]]]  # By asset class
    aggregations: dict[str, float]  # Sum by type, etc.
