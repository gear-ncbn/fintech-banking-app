"""
Shared enums used across the application for all models.
These enums ensure consistency between memory storage models and API models.
"""
from enum import StrEnum


# User and Authentication Enums
class UserRole(StrEnum):
    USER = "user"
    ADMIN = "admin"

# Account Related Enums
class AccountType(StrEnum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    LOAN = "loan"
    BUSINESS_CHECKING = "business_checking"
    BUSINESS_SAVINGS = "business_savings"

# Transaction Related Enums
class TransactionType(StrEnum):
    DEBIT = "debit"
    CREDIT = "credit"
    TRANSFER = "transfer"
    P2P_TRANSFER = "p2p_transfer"

class TransactionStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Budget Related Enums
class BudgetPeriod(StrEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

# Goal Related Enums
class GoalStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

# Notification Related Enums
class NotificationType(StrEnum):
    BUDGET_WARNING = "budget_warning"
    GOAL_MILESTONE = "goal_milestone"
    TRANSACTION_ALERT = "transaction_alert"
    ACCOUNT_UPDATE = "account_update"
    NEW_MESSAGE = "new_message"
    CONTACT_REQUEST = "contact_request"

# Social/Contact Related Enums
class ContactStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    BLOCKED = "blocked"

class MessageStatus(StrEnum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

# Card Related Enums
class CardStatus(StrEnum):
    ACTIVE = "active"
    FROZEN = "frozen"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class CardType(StrEnum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"

class SpendingLimitPeriod(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    PER_TRANSACTION = "per_transaction"

# Credit Score Related Enums
class CreditScoreProvider(StrEnum):
    EQUIFAX = "equifax"
    EXPERIAN = "experian"
    TRANSUNION = "transunion"
    VANTAGE = "vantage"

class CreditScoreRange(StrEnum):
    EXCELLENT = "excellent"  # 800-850
    VERY_GOOD = "very_good"  # 740-799
    GOOD = "good"  # 670-739
    FAIR = "fair"  # 580-669
    POOR = "poor"  # 300-579

class CreditFactorType(StrEnum):
    PAYMENT_HISTORY = "payment_history"
    CREDIT_UTILIZATION = "credit_utilization"
    CREDIT_AGE = "credit_age"
    CREDIT_MIX = "credit_mix"
    NEW_CREDIT = "new_credit"

# Savings Related Enums
class RoundUpStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class SavingsRuleType(StrEnum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    ROUND_UP = "round_up"
    SPARE_CHANGE = "spare_change"
    GOAL_BASED = "goal_based"

class SavingsRuleFrequency(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    PER_TRANSACTION = "per_transaction"

class ChallengeStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    UPCOMING = "upcoming"

class ChallengeType(StrEnum):
    WEEKLY_SAVINGS = "weekly_savings"
    NO_SPEND = "no_spend"
    CATEGORY_LIMIT = "category_limit"
    SAVINGS_STREAK = "savings_streak"
    ROUND_UP_BOOST = "round_up_boost"

# Business Related Enums
class InvoiceStatus(StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentTerms(StrEnum):
    NET_15 = "net_15"
    NET_30 = "net_30"
    NET_45 = "net_45"
    NET_60 = "net_60"
    DUE_ON_RECEIPT = "due_on_receipt"
    CUSTOM = "custom"

class TaxCategory(StrEnum):
    ADVERTISING = "advertising"
    TRAVEL = "travel"
    MEALS_ENTERTAINMENT = "meals_entertainment"
    OFFICE_SUPPLIES = "office_supplies"
    UTILITIES = "utilities"
    RENT = "rent"
    PROFESSIONAL_SERVICES = "professional_services"
    EQUIPMENT = "equipment"
    VEHICLE = "vehicle"
    INSURANCE = "insurance"
    TAXES_LICENSES = "taxes_licenses"
    OTHER = "other"

class ExpenseReportStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"

# Subscription Related Enums
class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    EXPIRED = "expired"
    TRIAL = "trial"

class BillingCycle(StrEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"

class SubscriptionCategory(StrEnum):
    STREAMING = "streaming"
    SOFTWARE = "software"
    GAMING = "gaming"
    MUSIC = "music"
    NEWS = "news"
    FITNESS = "fitness"
    FOOD_DELIVERY = "food_delivery"
    CLOUD_STORAGE = "cloud_storage"
    EDUCATION = "education"
    OTHER = "other"

class OptimizationSuggestionType(StrEnum):
    CHEAPER_ALTERNATIVE = "cheaper_alternative"
    BUNDLE_OPPORTUNITY = "bundle_opportunity"
    USAGE_LOW = "usage_low"
    DUPLICATE_SERVICE = "duplicate_service"
    FREE_ALTERNATIVE = "free_alternative"
    CANCEL_RECOMMENDATION = "cancel_recommendation"

# Security Related Enums
class SecurityEventType(StrEnum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    TWO_FACTOR_ENABLED = "2fa_enabled"
    TWO_FACTOR_DISABLED = "2fa_disabled"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ACCOUNT_LOCKED = "account_locked"

# Payment Method Related Enums
class PaymentMethodType(StrEnum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_ACCOUNT = "bank_account"
    DIGITAL_WALLET = "digital_wallet"

class PaymentMethodStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

# Two Factor Authentication Enums
class TwoFactorMethod(StrEnum):
    SMS = "sms"
    EMAIL = "email"
    TOTP = "totp"
    # Authenticator apps use TOTP; keep an explicit alias the routes reference.
    AUTHENTICATOR = "totp"
    PUSH = "push"
    BACKUP_CODES = "backup_codes"

# Banking Integration Enums
class BankLinkStatus(StrEnum):
    ACTIVE = "active"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"

# Export Related Enums
class ExportFormat(StrEnum):
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"
    JSON = "json"
    QIF = "qif"
    OFX = "ofx"

# Credit Card Application Related Enums
class CardCategory(StrEnum):
    REWARDS = "rewards"
    CASH_BACK = "cash_back"
    TRAVEL = "travel"
    BUSINESS = "business"
    STUDENT = "student"
    SECURED = "secured"
    LOW_INTEREST = "low_interest"
    BALANCE_TRANSFER = "balance_transfer"

class ApplicationStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"
    WITHDRAWN = "withdrawn"

class EmploymentType(StrEnum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    SELF_EMPLOYED = "self_employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"
    STUDENT = "student"

# Currency Converter Related Enums
class TradeStatus(StrEnum):
    PENDING = "pending"
    IN_ESCROW = "in_escrow"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class OfferStatus(StrEnum):
    ACTIVE = "active"
    MATCHED = "matched"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PaymentMethod(StrEnum):
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    CASH = "cash"

# Synthetic Data Related Enums (for testing)
