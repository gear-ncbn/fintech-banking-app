"""
Shared enums used across the application for all models.
These enums ensure consistency between memory storage models and API models.
"""
from enum import Enum


# User and Authentication Enums
class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

# Account Related Enums
class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    LOAN = "loan"
    BUSINESS_CHECKING = "business_checking"
    BUSINESS_SAVINGS = "business_savings"

# Transaction Related Enums
class TransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"
    TRANSFER = "transfer"
    P2P_TRANSFER = "p2p_transfer"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Budget Related Enums
class BudgetPeriod(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

# Goal Related Enums
class GoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

# Notification Related Enums
class NotificationType(str, Enum):
    BUDGET_WARNING = "budget_warning"
    GOAL_MILESTONE = "goal_milestone"
    TRANSACTION_ALERT = "transaction_alert"
    ACCOUNT_UPDATE = "account_update"
    NEW_MESSAGE = "new_message"
    CONTACT_REQUEST = "contact_request"

# Social/Contact Related Enums
class ContactStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    BLOCKED = "blocked"

class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

# Card Related Enums
class CardStatus(str, Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class CardType(str, Enum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"

class SpendingLimitPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    PER_TRANSACTION = "per_transaction"

# Credit Score Related Enums
class CreditScoreProvider(str, Enum):
    EQUIFAX = "equifax"
    EXPERIAN = "experian"
    TRANSUNION = "transunion"
    VANTAGE = "vantage"

class CreditScoreRange(str, Enum):
    EXCELLENT = "excellent"  # 800-850
    VERY_GOOD = "very_good"  # 740-799
    GOOD = "good"  # 670-739
    FAIR = "fair"  # 580-669
    POOR = "poor"  # 300-579

class CreditFactorType(str, Enum):
    PAYMENT_HISTORY = "payment_history"
    CREDIT_UTILIZATION = "credit_utilization"
    CREDIT_AGE = "credit_age"
    CREDIT_MIX = "credit_mix"
    NEW_CREDIT = "new_credit"

# Savings Related Enums
class RoundUpStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class SavingsRuleType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    ROUND_UP = "round_up"
    SPARE_CHANGE = "spare_change"
    GOAL_BASED = "goal_based"

class SavingsRuleFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    PER_TRANSACTION = "per_transaction"

class ChallengeStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    UPCOMING = "upcoming"

class ChallengeType(str, Enum):
    WEEKLY_SAVINGS = "weekly_savings"
    NO_SPEND = "no_spend"
    CATEGORY_LIMIT = "category_limit"
    SAVINGS_STREAK = "savings_streak"
    ROUND_UP_BOOST = "round_up_boost"

# Business Related Enums
class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentTerms(str, Enum):
    NET_15 = "net_15"
    NET_30 = "net_30"
    NET_45 = "net_45"
    NET_60 = "net_60"
    DUE_ON_RECEIPT = "due_on_receipt"
    CUSTOM = "custom"

class TaxCategory(str, Enum):
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

class ExpenseReportStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"

# Subscription Related Enums
class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    EXPIRED = "expired"
    TRIAL = "trial"

class BillingCycle(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"

class SubscriptionCategory(str, Enum):
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

class OptimizationSuggestionType(str, Enum):
    CHEAPER_ALTERNATIVE = "cheaper_alternative"
    BUNDLE_OPPORTUNITY = "bundle_opportunity"
    USAGE_LOW = "usage_low"
    DUPLICATE_SERVICE = "duplicate_service"
    FREE_ALTERNATIVE = "free_alternative"
    CANCEL_RECOMMENDATION = "cancel_recommendation"

# Security Related Enums
class SecurityEventType(str, Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    TWO_FACTOR_ENABLED = "2fa_enabled"
    TWO_FACTOR_DISABLED = "2fa_disabled"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ACCOUNT_LOCKED = "account_locked"

# Payment Method Related Enums
class PaymentMethodType(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_ACCOUNT = "bank_account"
    DIGITAL_WALLET = "digital_wallet"

class PaymentMethodStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

# Two Factor Authentication Enums
class TwoFactorMethod(str, Enum):
    SMS = "sms"
    EMAIL = "email"
    TOTP = "totp"
    # Authenticator apps use TOTP; keep an explicit alias the routes reference.
    AUTHENTICATOR = "totp"
    PUSH = "push"
    BACKUP_CODES = "backup_codes"

# Banking Integration Enums
class BankLinkStatus(str, Enum):
    ACTIVE = "active"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"

# Export Related Enums
class ExportFormat(str, Enum):
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"
    JSON = "json"
    QIF = "qif"
    OFX = "ofx"

# Credit Card Application Related Enums
class CardCategory(str, Enum):
    REWARDS = "rewards"
    CASH_BACK = "cash_back"
    TRAVEL = "travel"
    BUSINESS = "business"
    STUDENT = "student"
    SECURED = "secured"
    LOW_INTEREST = "low_interest"
    BALANCE_TRANSFER = "balance_transfer"

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"
    WITHDRAWN = "withdrawn"

class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    SELF_EMPLOYED = "self_employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"
    STUDENT = "student"

# Currency Converter Related Enums
class TradeStatus(str, Enum):
    PENDING = "pending"
    IN_ESCROW = "in_escrow"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class OfferStatus(str, Enum):
    ACTIVE = "active"
    MATCHED = "matched"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    CASH = "cash"

# Synthetic Data Related Enums (for testing)
