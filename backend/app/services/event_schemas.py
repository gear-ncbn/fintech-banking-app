"""
Comprehensive event schemas for analytics and data intelligence.
Supports 25+ event types across all platform features.
"""
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_serializer


class EventType(StrEnum):
    """Comprehensive event types across the platform."""
    # Transaction events
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_UPDATED = "transaction.updated"
    TRANSACTION_DELETED = "transaction.deleted"
    TRANSFER_INITIATED = "transfer.initiated"
    TRANSFER_COMPLETED = "transfer.completed"
    DEPOSIT_MADE = "deposit.made"
    WITHDRAWAL_MADE = "withdrawal.made"

    # Investment events
    INVESTMENT_TRADE_EXECUTED = "investment.trade.executed"
    INVESTMENT_POSITION_OPENED = "investment.position.opened"
    INVESTMENT_POSITION_CLOSED = "investment.position.closed"
    PORTFOLIO_REBALANCED = "portfolio.rebalanced"

    # Crypto events
    CRYPTO_SWAP_EXECUTED = "crypto.swap.executed"
    CRYPTO_TRANSFER = "crypto.transfer"
    CRYPTO_WALLET_CREATED = "crypto.wallet.created"

    # Loan events
    LOAN_APPLIED = "loan.applied"
    LOAN_APPROVED = "loan.approved"
    LOAN_PAYMENT_MADE = "loan.payment.made"
    LOAN_PAYMENT_MISSED = "loan.payment.missed"

    # Subscription events
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_RENEWED = "subscription.renewed"
    SUBSCRIPTION_CANCELLED = "subscription.cancelled"
    SUBSCRIPTION_PAYMENT_FAILED = "subscription.payment.failed"

    # Account events
    ACCOUNT_CREATED = "account.created"
    ACCOUNT_UPDATED = "account.updated"
    ACCOUNT_CLOSED = "account.closed"

    # Budget and goal events
    BUDGET_CREATED = "budget.created"
    BUDGET_EXCEEDED = "budget.exceeded"
    GOAL_CREATED = "goal.created"
    GOAL_CONTRIBUTION_MADE = "goal.contribution.made"
    GOAL_COMPLETED = "goal.completed"

    # Card events
    CARD_CREATED = "card.created"
    CARD_TRANSACTION = "card.transaction"
    CARD_FROZEN = "card.frozen"
    CARD_LIMIT_CHANGED = "card.limit.changed"

    # Currency conversion events
    CURRENCY_CONVERTED = "currency.converted"

    # Business events
    INVOICE_CREATED = "invoice.created"
    INVOICE_PAID = "invoice.paid"
    EXPENSE_SUBMITTED = "expense.submitted"

    # Security events
    SECURITY_ANOMALY_DETECTED = "security.anomaly.detected"
    LOGIN_ATTEMPT = "security.login"
    TWO_FACTOR_ENABLED = "security.2fa.enabled"

    # Feature usage events
    FEATURE_ACCESSED = "feature.accessed"
    EXPORT_GENERATED = "export.generated"
    REPORT_VIEWED = "report.viewed"


class BaseEvent(BaseModel):
    """Base event model with common fields."""
    event_id: str = Field(..., description="Unique event identifier")
    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    user_id: int
    session_id: str | None = None
    device_id: str | None = None
    ip_address: str | None = None
    sequence_number: int | None = Field(None, description="For ordering events")
    correlation_id: str | None = Field(None, description="For grouping related events")
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_serializer('timestamp')
    def serialize_datetime(self, v: datetime) -> str:
        return v.isoformat()


class TransactionEvent(BaseEvent):
    """Transaction-related events."""
    transaction_id: int
    account_id: int
    amount: float
    currency: str = "USD"
    category_id: int | None = None
    merchant_name: str | None = None
    transaction_type: str  # debit, credit
    balance_after: float | None = None


class InvestmentTradeEvent(BaseEvent):
    """Investment trade events."""
    trade_id: int | None = None
    asset_type: str  # stock, etf, crypto
    symbol: str
    quantity: float
    price_per_unit: float
    total_value: float
    trade_type: str  # buy, sell
    portfolio_value_after: float | None = None


class CryptoSwapEvent(BaseEvent):
    """Cryptocurrency swap events."""
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee: float
    slippage: float | None = None


class LoanEvent(BaseEvent):
    """Loan-related events."""
    loan_id: int
    loan_type: str
    amount: float | None = None
    interest_rate: float | None = None
    principal_remaining: float | None = None
    payment_amount: float | None = None
    payment_status: str | None = None  # on_time, late, missed
    days_overdue: int | None = None


class SubscriptionEvent(BaseEvent):
    """Subscription-related events."""
    subscription_id: int
    service_name: str
    amount: float
    billing_cycle: str  # monthly, annual
    category: str | None = None
    renewal_date: datetime | None = None
    failure_reason: str | None = None


class AccountEvent(BaseEvent):
    """Account management events."""
    account_id: int
    account_type: str
    balance: float | None = None
    change_type: str | None = None  # created, updated, closed
    previous_balance: float | None = None


class BudgetEvent(BaseEvent):
    """Budget-related events."""
    budget_id: int
    category_id: int
    amount: float
    spent_amount: float | None = None
    percentage_used: float | None = None
    period: str  # weekly, monthly, yearly


class GoalEvent(BaseEvent):
    """Goal-related events."""
    goal_id: int
    goal_name: str
    target_amount: float
    current_amount: float | None = None
    contribution_amount: float | None = None
    progress_percentage: float | None = None


class CardEvent(BaseEvent):
    """Card-related events."""
    card_id: int
    card_type: str  # physical, virtual
    card_last_four: str | None = None
    transaction_amount: float | None = None
    merchant: str | None = None
    spending_limit: float | None = None
    new_limit: float | None = None


class CurrencyConversionEvent(BaseEvent):
    """Currency conversion events."""
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee: float
    markup_percentage: float


class BusinessEvent(BaseEvent):
    """Business operation events."""
    business_id: int | None = None
    entity_type: str  # invoice, expense
    entity_id: int
    amount: float
    status: str | None = None
    client_name: str | None = None


class SecurityEvent(BaseEvent):
    """Security-related events."""
    event_subtype: str  # anomaly, login, config_change
    severity: str  # low, medium, high, critical
    risk_score: float | None = None
    anomaly_type: str | None = None
    location: str | None = None
    success: bool = True
    failure_reason: str | None = None


class FeatureUsageEvent(BaseEvent):
    """Feature usage tracking events."""
    feature_name: str
    feature_category: str  # analytics, transactions, investments, etc.
    action: str  # viewed, clicked, exported
    duration_seconds: float | None = None
    result: str | None = None  # success, error


# Event type to schema mapping
EVENT_SCHEMA_MAP = {
    EventType.TRANSACTION_CREATED: TransactionEvent,
    EventType.TRANSACTION_UPDATED: TransactionEvent,
    EventType.TRANSACTION_DELETED: TransactionEvent,
    EventType.TRANSFER_INITIATED: TransactionEvent,
    EventType.TRANSFER_COMPLETED: TransactionEvent,
    EventType.DEPOSIT_MADE: TransactionEvent,
    EventType.WITHDRAWAL_MADE: TransactionEvent,

    EventType.INVESTMENT_TRADE_EXECUTED: InvestmentTradeEvent,
    EventType.INVESTMENT_POSITION_OPENED: InvestmentTradeEvent,
    EventType.INVESTMENT_POSITION_CLOSED: InvestmentTradeEvent,
    EventType.PORTFOLIO_REBALANCED: InvestmentTradeEvent,

    EventType.CRYPTO_SWAP_EXECUTED: CryptoSwapEvent,
    EventType.CRYPTO_TRANSFER: CryptoSwapEvent,

    EventType.LOAN_APPLIED: LoanEvent,
    EventType.LOAN_APPROVED: LoanEvent,
    EventType.LOAN_PAYMENT_MADE: LoanEvent,
    EventType.LOAN_PAYMENT_MISSED: LoanEvent,

    EventType.SUBSCRIPTION_CREATED: SubscriptionEvent,
    EventType.SUBSCRIPTION_RENEWED: SubscriptionEvent,
    EventType.SUBSCRIPTION_CANCELLED: SubscriptionEvent,
    EventType.SUBSCRIPTION_PAYMENT_FAILED: SubscriptionEvent,

    EventType.ACCOUNT_CREATED: AccountEvent,
    EventType.ACCOUNT_UPDATED: AccountEvent,
    EventType.ACCOUNT_CLOSED: AccountEvent,

    EventType.BUDGET_CREATED: BudgetEvent,
    EventType.BUDGET_EXCEEDED: BudgetEvent,

    EventType.GOAL_CREATED: GoalEvent,
    EventType.GOAL_CONTRIBUTION_MADE: GoalEvent,
    EventType.GOAL_COMPLETED: GoalEvent,

    EventType.CARD_CREATED: CardEvent,
    EventType.CARD_TRANSACTION: CardEvent,
    EventType.CARD_FROZEN: CardEvent,
    EventType.CARD_LIMIT_CHANGED: CardEvent,

    EventType.CURRENCY_CONVERTED: CurrencyConversionEvent,

    EventType.INVOICE_CREATED: BusinessEvent,
    EventType.INVOICE_PAID: BusinessEvent,
    EventType.EXPENSE_SUBMITTED: BusinessEvent,

    EventType.SECURITY_ANOMALY_DETECTED: SecurityEvent,
    EventType.LOGIN_ATTEMPT: SecurityEvent,
    EventType.TWO_FACTOR_ENABLED: SecurityEvent,

    EventType.FEATURE_ACCESSED: FeatureUsageEvent,
    EventType.EXPORT_GENERATED: FeatureUsageEvent,
    EventType.REPORT_VIEWED: FeatureUsageEvent,
}
