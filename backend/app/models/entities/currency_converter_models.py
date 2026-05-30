"""
Virtual currency converter models (Airtm-like system).
"""
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, field_serializer


# Currency converter specific enums
class CurrencyType(StrEnum):
    FIAT = "fiat"
    CRYPTO = "crypto"
    VIRTUAL = "virtual"

class TransferMethod(StrEnum):
    BANK_TRANSFER = "bank_transfer"
    WIRE_TRANSFER = "wire_transfer"
    CRYPTO_WALLET = "crypto_wallet"
    PAYPAL = "paypal"
    SKRILL = "skrill"
    PAYONEER = "payoneer"
    WISE = "wise"
    ZELLE = "zelle"
    CASH_PICKUP = "cash_pickup"

class TransferStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"
    DISPUTED = "disputed"
    REFUNDED = "refunded"

class PeerStatus(StrEnum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    SUSPENDED = "suspended"

class VerificationLevel(StrEnum):
    UNVERIFIED = "unverified"
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    PREMIUM = "premium"

class FeeType(StrEnum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    TIERED = "tiered"

# Request/Response Models
class CurrencyPair(BaseModel):
    from_currency: str
    to_currency: str
    from_type: CurrencyType
    to_type: CurrencyType

class ExchangeRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    from_currency: str
    to_currency: str
    rate: Decimal
    bid: Decimal
    ask: Decimal
    spread_percentage: Decimal
    spread: Decimal = Decimal('0')
    effective_rate: Decimal | None = None
    timestamp: datetime
    source: str = "market"

    @field_serializer('rate', 'bid', 'ask', 'spread_percentage', 'spread', 'effective_rate')
    def serialize_decimal(self, v: Decimal | None) -> float | None:
        return float(v) if v is not None else None

class ConversionQuoteRequest(BaseModel):
    from_currency: str
    to_currency: str
    amount: float
    transfer_method: TransferMethod | None = None
    conversion_type: str | None = None

class ConversionQuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    quote_id: str
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee_amount: float
    fee_percentage: float
    total_cost: float
    you_receive: float
    transfer_method: TransferMethod | None
    estimated_completion: str
    expires_at: datetime
    breakdown: dict[str, Any]

class ConversionOrderCreate(BaseModel):
    quote_id: str
    recipient_details: dict[str, Any]  # Bank account, wallet address, etc.
    purpose: str | None = None
    reference: str | None = None

class ConversionOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    user_id: int
    status: TransferStatus
    from_currency: str
    to_currency: str
    from_amount: Decimal
    to_amount: Decimal
    exchange_rate: Decimal
    fee_amount: Decimal
    transfer_method: TransferMethod
    recipient_details: dict[str, Any]
    purpose: str | None
    reference: str | None
    peer_id: int | None  # If P2P transfer
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    tracking_updates: list[dict[str, Any]]

class PeerOfferCreate(BaseModel):
    currency: str
    currency_type: CurrencyType
    amount_available: float
    rate_adjustment: float  # Percentage above/below market rate
    transfer_methods: list[TransferMethod]
    min_transaction: float
    max_transaction: float
    availability_hours: dict[str, str]  # {"monday": "9:00-17:00", ...}

class PeerOfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    peer_id: int
    peer_username: str
    peer_rating: float
    peer_completed_trades: int
    peer_verification_level: VerificationLevel
    currency: str | None = None
    currency_type: CurrencyType | None = None
    amount_available: Decimal | None = None
    amount_remaining: Decimal | None = None
    rate: Decimal | None = None
    transfer_methods: list[TransferMethod] | None = None
    min_transaction: Decimal | None = None
    max_transaction: Decimal | None = None
    response_time_minutes: int | None = None
    is_online: bool | None = None
    last_seen: datetime | None = None
    created_at: datetime | None = None
    # Alternative test format fields
    offer_type: str | None = None
    from_currency: str | None = None
    to_currency: str | None = None
    amount: float | None = None
    exchange_rate: float | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    payment_methods: list[str] | None = None
    status: str | None = None
    expires_at: datetime | None = None

class P2PTradeRequest(BaseModel):
    offer_id: int
    amount: float
    payment_method: str | None = None  # Accept string payment method
    transfer_method: TransferMethod | None = None
    payment_details: dict[str, Any] | None = None

class P2PTradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trade_number: str
    buyer_id: int
    seller_id: int
    offer_id: int
    status: TransferStatus
    amount: Decimal
    currency: str
    rate: Decimal
    total_cost: Decimal
    fee_amount: Decimal
    transfer_method: TransferMethod
    payment_details: dict[str, Any]
    chat_enabled: bool
    escrow_released: bool
    dispute_id: int | None
    created_at: datetime
    expires_at: datetime
    completed_at: datetime | None

class CurrencyBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    currency: str
    currency_type: CurrencyType
    balance: Decimal
    available_balance: Decimal
    locked_balance: Decimal  # Amount locked in pending trades/orders
    pending_balance: Decimal  # Same as locked_balance, for compatibility
    total_converted: Decimal
    last_activity: datetime | None

class ConversionHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_conversions: int
    total_volume: Decimal
    currencies_used: list[str]
    favorite_pairs: list[CurrencyPair]
    average_fee_percentage: Decimal
    total_fees_paid: Decimal
    member_since: date
    verification_level: VerificationLevel

class CurrencySupportedResponse(BaseModel):
    code: str
    name: str
    type: CurrencyType
    symbol: str
    decimal_places: int
    min_amount: Decimal
    max_amount: Decimal
    is_active: bool
    is_crypto: bool | None = None  # Computed from type
    is_supported: bool | None = None  # Alias for is_active
    supported_methods: list[TransferMethod]
    countries: list[str]

    def model_post_init(self, __context) -> None:
        """Set computed fields."""
        if self.is_crypto is None:
            self.is_crypto = self.type == CurrencyType.CRYPTO
        if self.is_supported is None:
            self.is_supported = self.is_active

class TransferLimitResponse(BaseModel):
    verification_level: VerificationLevel
    daily_limit: Decimal
    monthly_limit: Decimal
    per_transaction_limit: Decimal
    daily_remaining: Decimal
    monthly_remaining: Decimal
    next_limit_reset: datetime
    upgrade_available: bool

class ComplianceCheckResponse(BaseModel):
    transaction_allowed: bool
    requires_additional_info: bool
    required_documents: list[str]
    aml_score: float
    risk_level: str
    notes: str | None
