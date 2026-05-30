"""
Memory-based model classes that provide SQLAlchemy-compatible interface.
These classes wrap dictionary data with attribute access.
"""
from datetime import UTC, datetime, timedelta
from typing import Any


class ModelAttribute:
    """Represents a model attribute for SQLAlchemy-style comparisons."""
    def __init__(self, key):
        self.key = key

    def __eq__(self, other):
        return ComparisonClause(self, other, '__eq__')

    def __ne__(self, other):
        return ComparisonClause(self, other, '__ne__')

    def __lt__(self, other):
        return ComparisonClause(self, other, '__lt__')

    def __le__(self, other):
        return ComparisonClause(self, other, '__le__')

    def __gt__(self, other):
        return ComparisonClause(self, other, '__gt__')

    def __ge__(self, other):
        return ComparisonClause(self, other, '__ge__')

    def asc(self):
        """Return a descriptor for ascending order."""
        return AscOrder(self)

    def desc(self):
        """Return a descriptor for descending order."""
        return DescOrder(self)

    def in_(self, values):
        """Create an IN clause for filtering."""
        return InClause(self, values)

    def ilike(self, pattern):
        """Create an ILIKE clause for case-insensitive pattern matching."""
        return ComparisonClause(self, pattern, 'ilike')

    def like(self, pattern):
        """Create a LIKE clause for SQLAlchemy-compatible pattern matching."""
        return ComparisonClause(self, pattern, 'like')


class AscOrder:
    """Represents an ascending order descriptor."""
    def __init__(self, element):
        self.element = element
        self.modifier = 'asc'


class DescOrder:
    """Represents a descending order descriptor."""
    def __init__(self, element):
        self.element = element
        self.modifier = 'desc'


class InClause:
    """Represents an IN clause for filtering."""
    def __init__(self, left, right):
        self.left = left
        self.right = right
        self.op = 'in_'  # Store the operator properly
        # Don't modify the class name - this is dangerous!
        # self.__class__.__name__ = 'in_'


class ComparisonClause:
    """Represents a comparison clause."""
    def __init__(self, left, right, op):
        self.left = left
        self.right = right
        self.op = op  # Store the operator properly
        # Don't modify the class name - this is dangerous!
        # self.__class__.__name__ = op

    def __or__(self, other):
        """Handle OR operations."""
        return BooleanClauseList('or', [self, other])


class BooleanClauseList:
    """Represents a list of boolean clauses."""
    def __init__(self, operator, clauses):
        self.operator = operator
        self.clauses = clauses
        self.__class__.__name__ = 'BooleanClauseList'

    def __or__(self, other):
        """Handle chained OR operations."""
        if isinstance(other, BooleanClauseList) and other.operator == 'or':
            self.clauses.extend(other.clauses)
        else:
            self.clauses.append(other)
        return self


class ModelMeta(type):
    """Metaclass to handle class-level attribute access for SQLAlchemy-style queries."""
    def __getattr__(cls, name):
        # Return a ModelAttribute that can be used in comparisons
        return ModelAttribute(name)


class BaseMemoryModel(metaclass=ModelMeta):
    """Base class for memory models that provides attribute access to dictionary data."""

    _id_counter = {}  # Class variable to track ID counters per model
    _initialized = False  # Track if counters have been initialized

    def __init__(self, **kwargs):
        self._data = kwargs

        # Initialize counters from existing data on first use
        if not BaseMemoryModel._initialized:
            BaseMemoryModel._initialize_counters()
            BaseMemoryModel._initialized = True

        # Set defaults
        if 'id' not in self._data:
            # Generate auto-incrementing integer ID per model class
            class_name = self.__class__.__name__
            if class_name not in BaseMemoryModel._id_counter:
                BaseMemoryModel._id_counter[class_name] = 1
            self._data['id'] = BaseMemoryModel._id_counter[class_name]
            BaseMemoryModel._id_counter[class_name] += 1
        if 'created_at' not in self._data:
            self._data['created_at'] = datetime.now(UTC)

    @classmethod
    def _initialize_counters(cls):
        """Initialize ID counters based on existing data in data_manager."""
        try:
            from app.repositories.data_manager import data_manager

            # Map model names to their data stores
            store_map = {
                'Goal': data_manager.goals,
                'User': data_manager.users,
                'Account': data_manager.accounts,
                'Transaction': data_manager.transactions,
                'Budget': data_manager.budgets,
                'Category': data_manager.categories,
                'Notification': data_manager.notifications,
                'Subscription': data_manager.subscriptions,
                'Card': data_manager.cards,
                'CardSpendingLimit': data_manager.spending_limits,
                'Contact': data_manager.contacts,
                'CryptoWallet': data_manager.crypto_wallets,
                'CryptoAsset': data_manager.crypto_assets,
                'NFTAsset': data_manager.nft_assets,
                'CryptoTransaction': data_manager.crypto_transactions,
                'DeFiPosition': data_manager.defi_positions,
                'CreditScore': data_manager.credit_scores,
                'CreditSimulation': data_manager.credit_simulations,
                'CreditAlert': data_manager.credit_alerts,
                'CreditDispute': data_manager.credit_disputes,
                'CreditBuilderAccount': data_manager.credit_builder_accounts,
                'UnifiedBalance': data_manager.unified_balances,
                'AssetBridge': data_manager.asset_bridges,
                'ConversionRate': data_manager.conversion_rates,
                'CollateralPosition': data_manager.collateral_positions,
                'UnifiedTransaction': data_manager.unified_transactions,
                # Security models
                'AuditLog': data_manager.audit_logs,
                'LoginAttempt': data_manager.login_attempts,
                'TransactionAnomaly': data_manager.transaction_anomalies,
                'SecurityIncident': data_manager.security_incidents,
                'AccountLockout': data_manager.account_lockouts,
                'TrustedDevice': data_manager.trusted_devices,
                # Business models
                'Invoice': data_manager.invoices,
                'ExpenseReport': data_manager.expense_reports,
                'Receipt': data_manager.receipts,
                # Add more as needed
            }

            # Initialize counters based on existing data
            for model_name, store in store_map.items():
                if store:
                    max_id = max([item.get('id', 0) for item in store if isinstance(item.get('id'), int)], default=0)
                    cls._id_counter[model_name] = max_id + 1
        except ImportError:
            # If data_manager is not available yet, start from 1
            pass

    def __getattr__(self, name):
        """Get attribute from internal data dictionary."""
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        return self._data.get(name)

    def __setattr__(self, name, value):
        """Set attribute in internal data dictionary."""
        if name.startswith('_'):
            object.__setattr__(self, name, value)
        else:
            if '_data' not in self.__dict__:
                object.__setattr__(self, '_data', {})
            # Convert enum values to their string representation
            if hasattr(value, 'value'):
                value = value.value
            self._data[name] = value

            # Mark object as dirty in session if tracked
            if hasattr(self, '_session') and self._session and hasattr(self._session, 'pending_updates'):
                if self not in self._session.pending_updates:
                    self._session.pending_updates.append(self)

    def to_dict(self):
        """Convert model to dictionary."""
        return self._data.copy()

    @classmethod
    def from_dict(cls, data: dict[str, Any]):
        """Create model instance from dictionary."""
        return cls(**data)


# User Models
class User(BaseMemoryModel):
    """User model compatible with SQLAlchemy interface."""
    __tablename__ = "users"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set defaults
        self._data.setdefault('role', 'user')
        self._data.setdefault('is_active', True)
        self._data.setdefault('two_factor_enabled', False)
        self._data.setdefault('currency', 'USD')
        self._data.setdefault('timezone', 'UTC')
        self._data.setdefault('last_login', None)
        self._data.setdefault('privacy_settings', {
            'searchable': True,
            'show_profile_stats': True,
            'show_email': False,
            'show_full_name': True
        })
        self._data.setdefault('profile_stats', {})

    @property
    def full_name(self):
        """Compute full name from first and last names."""
        first_name = self._data.get('first_name', '')
        last_name = self._data.get('last_name', '')
        if first_name and last_name:
            return f"{first_name} {last_name}"
        if first_name:
            return first_name
        if last_name:
            return last_name
        # Fallback to stored full_name or username
        return self._data.get('full_name', self._data.get('username', ''))


class UserRole:
    """User role enum."""
    USER = "user"
    ADMIN = "admin"
    MANAGER = "manager"


# Account Models
class Account(BaseMemoryModel):
    """Account model."""
    __tablename__ = "accounts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('balance', 0.0)
        self._data.setdefault('available_balance', 0.0)
        self._data.setdefault('credit_limit', 0.0)

        # Format all money fields
        self._data['balance'] = format_money(self._data.get('balance', 0.0))
        self._data['available_balance'] = format_money(self._data.get('available_balance', 0.0))
        self._data['credit_limit'] = format_money(self._data.get('credit_limit', 0.0))

        self._data.setdefault('is_active', True)
        self._data.setdefault('currency', 'USD')


class AccountType:
    """Account type enum."""
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"


# Transaction Models
class Transaction(BaseMemoryModel):
    """Transaction model."""
    __tablename__ = "transactions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('amount', 0.0)
        self._data['amount'] = format_money(self._data.get('amount', 0.0))

        self._data.setdefault('status', 'completed')
        if 'transaction_date' not in self._data:
            self._data['transaction_date'] = datetime.now(UTC)

        # Ensure user_id is set if not provided
        if 'user_id' not in self._data and 'account_id' in self._data:
            # Try to get user_id from account
            from app.repositories.data_manager import data_manager
            for acc in data_manager.accounts:
                if acc.get('id') == self._data.get('account_id'):
                    self._data['user_id'] = acc.get('user_id')
                    break

    @property
    def category(self):
        """Get the related category."""
        if self._data.get('category_id'):
            from app.repositories.data_manager import data_manager
            for cat in data_manager.categories:
                if cat.get('id') == self._data['category_id']:
                    return Category.from_dict(cat)
        return None


class TransactionType:
    """Transaction type enum."""
    DEBIT = "debit"
    CREDIT = "credit"
    TRANSFER = "transfer"


class TransactionStatus:
    """Transaction status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Category Models
class Category(BaseMemoryModel):
    """Category model."""
    __tablename__ = "categories"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_income', False)
        self._data.setdefault('is_system', False)
        self._data.setdefault('icon', '📁')
        self._data.setdefault('color', '#6B7280')


# Budget Models
class Budget(BaseMemoryModel):
    """Budget model."""
    __tablename__ = "budgets"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('amount', 0.0)
        self._data.setdefault('spent_amount', 0.0)

        # Format money fields
        self._data['amount'] = format_money(self._data.get('amount', 0.0))
        self._data['spent_amount'] = format_money(self._data.get('spent_amount', 0.0))

        self._data.setdefault('is_active', True)
        self._data.setdefault('alert_threshold', 0.8)
        self._data.setdefault('alert_enabled', True)


class BudgetPeriod:
    """Budget period enum."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


# Goal Models
class Goal(BaseMemoryModel):
    """Goal model."""
    __tablename__ = "goals"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        # Format all money fields to 2 decimal places
        self._data.setdefault('current_amount', 0.0)
        self._data.setdefault('target_amount', 0.0)
        self._data['current_amount'] = format_money(self._data.get('current_amount', 0.0))
        self._data['target_amount'] = format_money(self._data.get('target_amount', 0.0))

        self._data.setdefault('status', 'active')
        self._data.setdefault('auto_transfer_enabled', False)
        self._data.setdefault('category', 'other')
        self._data.setdefault('priority', 'medium')

        # Automatic allocation fields
        self._data.setdefault('auto_allocate_percentage', 0.0)
        self._data.setdefault('auto_allocate_fixed_amount', 0.0)
        self._data['auto_allocate_fixed_amount'] = format_money(self._data.get('auto_allocate_fixed_amount', 0.0))
        self._data.setdefault('allocation_priority', 1)
        self._data.setdefault('allocation_source_types', ['income', 'deposit'])  # Which transaction types trigger allocation

    def __setattr__(self, name, value):
        """Override to ensure money fields are always formatted."""
        if name == '_data':
            super().__setattr__(name, value)
        else:
            from ..utils.money import format_money
            if name in ['current_amount', 'target_amount', 'auto_allocate_fixed_amount']:
                value = format_money(value)
            super().__setattr__(name, value)


class GoalStatus:
    """Goal status enum."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class GoalContribution(BaseMemoryModel):
    """Goal contribution model."""
    __tablename__ = "goal_contributions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        if 'contribution_date' not in self._data:
            self._data['contribution_date'] = datetime.now(UTC)
        self._data.setdefault('is_automatic', False)
        self._data.setdefault('source_transaction_id', None)

        # Format money fields
        self._data.setdefault('amount', 0.0)
        self._data['amount'] = format_money(self._data.get('amount', 0.0))


# Notification Models
class Notification(BaseMemoryModel):
    """Notification model."""
    __tablename__ = "notifications"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_read', False)


class NotificationType:
    """Notification type enum."""
    BUDGET_WARNING = "budget_warning"
    GOAL_MILESTONE = "goal_milestone"
    TRANSACTION_ALERT = "transaction_alert"
    ACCOUNT_UPDATE = "account_update"
    SECURITY_ALERT = "security_alert"
    PAYMENT_REMINDER = "payment_reminder"
    NEW_MESSAGE = "new_message"
    SYSTEM_UPDATE = "system_update"


# Contact Models
class Contact(BaseMemoryModel):
    """Contact model."""
    __tablename__ = "contacts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('status', 'pending')
        self._data.setdefault('is_favorite', False)
        self._data.setdefault('blocked', False)


class ContactStatus:
    """Contact status enum."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    BLOCKED = "blocked"


# Message Models
class Conversation(BaseMemoryModel):
    """Conversation model."""
    __tablename__ = "conversations"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_group', False)


class ConversationParticipant(BaseMemoryModel):
    """Conversation participant model."""
    __tablename__ = "conversation_participants"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_admin', False)
        self._data.setdefault('notification_enabled', True)
        if 'joined_at' not in self._data:
            self._data['joined_at'] = datetime.now(UTC)


class Message(BaseMemoryModel):
    """Message model."""
    __tablename__ = "messages"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('message_type', 'text')
        self._data.setdefault('status', 'sent')


class MessageStatus:
    """Message status enum."""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class MessageReadReceipt(BaseMemoryModel):
    """Message read receipt model."""
    __tablename__ = "message_read_receipts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if 'read_at' not in self._data:
            self._data['read_at'] = datetime.now(UTC)


# Recurring Transaction Models
class RecurringRule(BaseMemoryModel):
    """Recurring rule model."""
    __tablename__ = "recurring_rules"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_active', True)


# Merchant Model
class Merchant(BaseMemoryModel):
    """Merchant model."""
    __tablename__ = "merchants"


# Note Model
class Note(BaseMemoryModel):
    """Note model."""
    __tablename__ = "notes"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_encrypted', False)


# Card Models
class Card(BaseMemoryModel):
    """Card model."""
    __tablename__ = "cards"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('status', 'active')
        self._data.setdefault('is_contactless_enabled', True)
        self._data.setdefault('is_online_enabled', True)
        self._data.setdefault('is_international_enabled', True)


class CardType:
    """Card type enum."""
    DEBIT = "debit"
    CREDIT = "credit"
    PREPAID = "prepaid"
    VIRTUAL = "virtual"


class CardStatus:
    """Card status enum."""
    ACTIVE = "active"
    FROZEN = "frozen"
    BLOCKED = "blocked"
    EXPIRED = "expired"
    LOST = "lost"
    CANCELLED = "cancelled"


class CardSpendingLimit(BaseMemoryModel):
    """Card spending limit model."""
    __tablename__ = "card_spending_limits"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('limit_amount', 0.0)
        self._data.setdefault('current_usage', 0.0)
        self._data['limit_amount'] = format_money(self._data.get('limit_amount', 0.0))
        self._data['current_usage'] = format_money(self._data.get('current_usage', 0.0))

        self._data.setdefault('is_active', True)
        self._data.setdefault('limit_period', 'daily')

        if 'period_start' not in self._data:
            self._data['period_start'] = datetime.now(UTC)
        if 'period_end' not in self._data:
            self._data['period_end'] = datetime.now(UTC) + timedelta(days=1)


class SpendingLimitPeriod:
    """Spending limit period enum."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RoundUpConfig(BaseMemoryModel):
    """Round-up savings configuration model."""
    __tablename__ = "round_up_configs"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('status', 'active')
        self._data.setdefault('multiplier', 1.0)
        self._data.setdefault('max_round_up_amount', 10.0)
        self._data.setdefault('enabled_categories', None)
        self._data.setdefault('total_saved', 0.0)
        self._data.setdefault('transaction_count', 0)
        self._data.setdefault('last_round_up_at', None)


class RoundUpTransaction(BaseMemoryModel):
    """Round-up transaction model."""
    __tablename__ = "round_up_transactions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('original_amount', 0.0)
        self._data.setdefault('round_up_amount', 0.0)
        self._data.setdefault('multiplied_amount', 0.0)


class SavingsRule(BaseMemoryModel):
    """Automated savings rule model."""
    __tablename__ = "savings_rules"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_active', True)
        self._data.setdefault('total_saved', 0.0)
        self._data.setdefault('execution_count', 0)
        self._data.setdefault('last_executed_at', None)
        self._data.setdefault('trigger_conditions', None)


class SavingsChallenge(BaseMemoryModel):
    """Savings challenge model."""
    __tablename__ = "savings_challenges"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('description', '')
        self._data.setdefault('challenge_type', 'individual')
        self._data.setdefault('status', 'active')
        self._data.setdefault('target_amount', 0.0)
        self._data.setdefault('reward_description', None)
        self._data.setdefault('rules', [])
        if 'start_date' not in self._data:
            self._data['start_date'] = datetime.now(UTC)
        if 'end_date' not in self._data:
            self._data['end_date'] = datetime.now(UTC) + timedelta(days=30)


class ChallengeParticipant(BaseMemoryModel):
    """Savings challenge participant model."""
    __tablename__ = "challenge_participants"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('current_amount', 0.0)
        if 'joined_at' not in self._data:
            self._data['joined_at'] = datetime.now(UTC)


# Subscription Models
class Subscription(BaseMemoryModel):
    """Subscription model."""
    __tablename__ = "subscriptions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('status', 'active')
        self._data.setdefault('detected_automatically', False)


class SubscriptionStatus:
    """Subscription status enum."""
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class BillingCycle:
    """Billing cycle enum."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubscriptionCategory:
    """Subscription category enum."""
    ENTERTAINMENT = "entertainment"
    PRODUCTIVITY = "productivity"
    UTILITIES = "utilities"
    HEALTH_FITNESS = "health_fitness"
    EDUCATION = "education"
    CLOUD_STORAGE = "cloud_storage"
    FOOD_DELIVERY = "food_delivery"
    SHOPPING = "shopping"
    NEWS_MEDIA = "news_media"
    OTHER = "other"


# Security Models
class SecurityEvent(BaseMemoryModel):
    """Security event model."""
    __tablename__ = "security_events"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('success', True)


class SecurityEventType:
    """Security event type enum."""
    LOGIN_ATTEMPT = "login_attempt"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    TWO_FACTOR_ENABLED = "two_factor_enabled"
    TWO_FACTOR_DISABLED = "two_factor_disabled"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


# Payment Method Models
class PaymentMethod(BaseMemoryModel):
    """Payment method model."""
    __tablename__ = "payment_methods"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('status', 'active')
        self._data.setdefault('is_default', False)


class PaymentMethodType:
    """Payment method type enum."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_ACCOUNT = "bank_account"
    DIGITAL_WALLET = "digital_wallet"


class PaymentMethodStatus:
    """Payment method status enum."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    SUSPENDED = "suspended"


class TwoFactorAuth(BaseMemoryModel):
    """Two-factor authentication model."""
    __tablename__ = "two_factor_auth"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_enabled', False)
        self._data.setdefault('is_primary', False)
        self._data.setdefault('method', 'totp')
        self._data.setdefault('created_at', datetime.now(UTC).isoformat())


class UserDevice(BaseMemoryModel):
    """User device model for security tracking."""
    __tablename__ = "user_devices"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_trusted', False)
        self._data.setdefault('first_seen', datetime.now(UTC).isoformat())
        self._data.setdefault('last_seen', datetime.now(UTC).isoformat())


class SecurityAuditLog(BaseMemoryModel):
    """Security audit log model."""
    __tablename__ = "security_audit_logs"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('event_type', 'unknown')
        self._data.setdefault('timestamp', datetime.now(UTC).isoformat())
        self._data.setdefault('ip_address', '127.0.0.1')


# Log Model (for analytics)
class Log(BaseMemoryModel):
    """Log model for analytics."""
    __tablename__ = "logs"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if 'timestamp' not in self._data:
            self._data['timestamp'] = datetime.now(UTC)


# DirectMessage Model (for messages system)
class DirectMessage(BaseMemoryModel):
    """Direct message model."""
    __tablename__ = "direct_messages"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_read', False)
        self._data.setdefault('deleted_by_sender', False)
        self._data.setdefault('deleted_by_recipient', False)
        self._data.setdefault('message_type', 'text')  # text, transaction, payment_request
        self._data.setdefault('metadata', {})  # For transaction details, etc.
        if 'sent_at' not in self._data:
            self._data['sent_at'] = datetime.now(UTC)


class Conversation(BaseMemoryModel):
    """Conversation model to group messages between users."""
    __tablename__ = "conversations"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('participant_ids', [])
        self._data.setdefault('last_message_at', None)
        self._data.setdefault('unread_count', {})  # {user_id: count}
        self._data.setdefault('is_active', True)


# Crypto Models
class CryptoWallet(BaseMemoryModel):
    """Crypto wallet model."""
    __tablename__ = "crypto_wallets"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('is_primary', False)
        self._data.setdefault('is_active', True)
        if 'address' not in self._data:
            # Generate a mock wallet address
            import hashlib
            import uuid
            wallet_id = str(uuid.uuid4())
            self._data['address'] = '0x' + hashlib.sha256(wallet_id.encode()).hexdigest()[:40]


class CryptoAsset(BaseMemoryModel):
    """Crypto asset model."""
    __tablename__ = "crypto_assets"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('balance', '0.0')
        self._data.setdefault('usd_value', 0.0)
        self._data.setdefault('price_usd', 0.0)
        self._data.setdefault('change_24h', 0.0)

        # Format USD values
        self._data['usd_value'] = format_money(self._data.get('usd_value', 0.0))
        self._data['price_usd'] = format_money(self._data.get('price_usd', 0.0))

        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)


class NFTAsset(BaseMemoryModel):
    """NFT asset model."""
    __tablename__ = "nft_assets"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('metadata', {})
        self._data.setdefault('floor_price_usd', None)
        self._data.setdefault('estimated_value_usd', None)

        # Format USD values if present
        if self._data.get('floor_price_usd') is not None:
            self._data['floor_price_usd'] = format_money(self._data['floor_price_usd'])
        if self._data.get('estimated_value_usd') is not None:
            self._data['estimated_value_usd'] = format_money(self._data['estimated_value_usd'])

        if 'acquired_at' not in self._data:
            self._data['acquired_at'] = datetime.now(UTC)
        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)


class CryptoTransaction(BaseMemoryModel):
    """Crypto transaction model."""
    __tablename__ = "crypto_transactions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('status', 'pending')
        self._data.setdefault('confirmations', 0)
        self._data.setdefault('usd_value_at_time', 0.0)
        self._data.setdefault('gas_fee_usd', None)

        # Format USD values
        self._data['usd_value_at_time'] = format_money(self._data.get('usd_value_at_time', 0.0))
        if self._data.get('gas_fee_usd') is not None:
            self._data['gas_fee_usd'] = format_money(self._data['gas_fee_usd'])

        # Generate mock transaction hash if not provided
        if 'transaction_hash' not in self._data:
            import hashlib
            import uuid
            tx_id = str(uuid.uuid4())
            self._data['transaction_hash'] = '0x' + hashlib.sha256(tx_id.encode()).hexdigest()


class DeFiPosition(BaseMemoryModel):
    """DeFi position model."""
    __tablename__ = "defi_positions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('amount', '0.0')
        self._data.setdefault('usd_value', 0.0)
        self._data.setdefault('apy', 0.0)
        self._data.setdefault('rewards_earned', '0.0')
        self._data.setdefault('rewards_usd', 0.0)

        # Format USD values
        self._data['usd_value'] = format_money(self._data.get('usd_value', 0.0))
        self._data['rewards_usd'] = format_money(self._data.get('rewards_usd', 0.0))

        if 'started_at' not in self._data:
            self._data['started_at'] = datetime.now(UTC)
        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)


# Crypto-related enums
class CryptoAssetType:
    """Crypto asset type enum."""
    NATIVE = "native"
    TOKEN = "token"
    STABLECOIN = "stablecoin"
    NFT = "nft"


class BlockchainNetwork:
    """Blockchain network enum."""
    ETHEREUM = "ethereum"
    BITCOIN = "bitcoin"
    POLYGON = "polygon"
    SOLANA = "solana"
    ARBITRUM = "arbitrum"


class CryptoTransactionStatus:
    """Crypto transaction status enum."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class TransactionDirection:
    """Transaction direction enum."""
    SEND = "send"
    RECEIVE = "receive"
    SWAP = "swap"
    MINT = "mint"
    BURN = "burn"


class DeFiProtocolType:
    """DeFi protocol type enum."""
    LENDING = "lending"
    STAKING = "staking"
    LIQUIDITY = "liquidity"
    YIELD_FARMING = "yield_farming"


# Credit Models
class CreditScore(BaseMemoryModel):
    """Credit score model."""
    __tablename__ = "credit_scores"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('score', 650)
        self._data.setdefault('provider', 'equifax')
        self._data.setdefault('score_range', 'good')
        self._data.setdefault('factors', [])
        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)
        if 'next_update' not in self._data:
            # Next update in 30 days
            self._data['next_update'] = datetime.now(UTC)


class CreditSimulation(BaseMemoryModel):
    """Credit simulation model."""
    __tablename__ = "credit_simulations"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('current_score', 650)
        self._data.setdefault('projected_score', 650)
        self._data.setdefault('score_change', 0)
        self._data.setdefault('time_to_change_months', 0)
        self._data.setdefault('simulation_type', 'pay_off_debt')
        self._data.setdefault('simulation_details', {})
        self._data.setdefault('impact_factors', [])
        self._data.setdefault('recommendations', [])
        if 'simulation_date' not in self._data:
            self._data['simulation_date'] = datetime.now(UTC)


class CreditAlert(BaseMemoryModel):
    """Credit alert model for monitoring credit changes."""
    __tablename__ = "credit_alerts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('alert_type', 'score_change')  # score_change, inquiry, new_account, etc.
        self._data.setdefault('severity', 'info')  # info, warning, critical
        self._data.setdefault('title', '')
        self._data.setdefault('description', '')
        self._data.setdefault('is_read', False)
        self._data.setdefault('is_dismissed', False)
        self._data.setdefault('action_required', False)
        self._data.setdefault('action_url', None)
        self._data.setdefault('metadata', {})  # Additional alert-specific data
        if 'alert_date' not in self._data:
            self._data['alert_date'] = datetime.now(UTC)


class CreditDispute(BaseMemoryModel):
    """Credit dispute model for managing credit report disputes."""
    __tablename__ = "credit_disputes"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('dispute_type', 'incorrect_info')  # incorrect_info, fraud, identity_theft, etc.
        self._data.setdefault('status', 'pending')  # pending, in_progress, resolved, rejected
        self._data.setdefault('bureau', 'equifax')  # equifax, experian, transunion
        self._data.setdefault('account_name', '')
        self._data.setdefault('dispute_reason', '')
        self._data.setdefault('dispute_details', '')
        self._data.setdefault('supporting_documents', [])  # List of document IDs/URLs
        self._data.setdefault('bureau_response', None)
        self._data.setdefault('resolution_date', None)
        self._data.setdefault('outcome', None)  # removed, corrected, verified, no_change
        if 'filed_date' not in self._data:
            self._data['filed_date'] = datetime.now(UTC)
        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)


class CreditBuilderAccount(BaseMemoryModel):
    """Credit builder account model for secured credit building products."""
    __tablename__ = "credit_builder_accounts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('account_type', 'secured_card')  # secured_card, credit_builder_loan, etc.
        self._data.setdefault('status', 'active')  # active, graduated, closed
        self._data.setdefault('secured_amount', 0.0)
        self._data.setdefault('credit_limit', 0.0)
        self._data.setdefault('current_balance', 0.0)
        self._data.setdefault('payment_history', [])  # List of payment records
        self._data.setdefault('graduation_eligible', False)
        self._data.setdefault('graduation_date', None)
        self._data.setdefault('reports_to_bureaus', ['equifax', 'experian', 'transunion'])
        self._data.setdefault('auto_pay_enabled', False)
        self._data.setdefault('monthly_fee', 0.0)

        # Format money fields
        self._data['secured_amount'] = format_money(self._data.get('secured_amount', 0.0))
        self._data['credit_limit'] = format_money(self._data.get('credit_limit', 0.0))
        self._data['current_balance'] = format_money(self._data.get('current_balance', 0.0))
        self._data['monthly_fee'] = format_money(self._data.get('monthly_fee', 0.0))

        if 'opened_date' not in self._data:
            self._data['opened_date'] = datetime.now(UTC)
        if 'last_payment_date' not in self._data:
            self._data['last_payment_date'] = None


# Credit-related enums
class CreditAlertType:
    """Credit alert type enum."""
    SCORE_CHANGE = "score_change"
    NEW_INQUIRY = "new_inquiry"
    NEW_ACCOUNT = "new_account"
    PAYMENT_REPORTED = "payment_reported"
    DISPUTE_UPDATE = "dispute_update"
    FRAUD_ALERT = "fraud_alert"
    CREDIT_FREEZE = "credit_freeze"


class CreditAlertSeverity:
    """Credit alert severity enum."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class CreditDisputeType:
    """Credit dispute type enum."""
    INCORRECT_INFO = "incorrect_info"
    NOT_MINE = "not_mine"
    FRAUD = "fraud"
    IDENTITY_THEFT = "identity_theft"
    DUPLICATE = "duplicate"
    OUTDATED = "outdated"


class CreditDisputeStatus:
    """Credit dispute status enum."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class CreditBuilderType:
    """Credit builder account type enum."""
    SECURED_CARD = "secured_card"
    CREDIT_BUILDER_LOAN = "credit_builder_loan"
    AUTHORIZED_USER = "authorized_user"
    RENT_REPORTING = "rent_reporting"
    UTILITY_REPORTING = "utility_reporting"


# Unified Connection Layer Models
class UnifiedBalance(BaseMemoryModel):
    """Unified balance model for aggregating assets across all systems."""
    __tablename__ = "unified_balances"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('total_net_worth_usd', 0.0)
        self._data.setdefault('fiat_assets', {})
        self._data.setdefault('total_fiat_usd', 0.0)
        self._data.setdefault('crypto_assets', {})
        self._data.setdefault('nft_collection_value', 0.0)
        self._data.setdefault('total_crypto_usd', 0.0)
        self._data.setdefault('total_credit_available', 0.0)
        self._data.setdefault('credit_utilization', 0.0)
        self._data.setdefault('total_loans', 0.0)
        self._data.setdefault('total_monthly_obligations', 0.0)
        self._data.setdefault('total_coverage_amount', 0.0)
        self._data.setdefault('insurance_types_covered', [])
        self._data.setdefault('defi_positions_value', 0.0)
        self._data.setdefault('defi_yield_annual', 0.0)
        self._data.setdefault('debt_to_asset_ratio', 0.0)
        self._data.setdefault('liquid_assets', 0.0)
        self._data.setdefault('illiquid_assets', 0.0)

        # Format money fields
        money_fields = [
            'total_net_worth_usd', 'total_fiat_usd', 'nft_collection_value',
            'total_crypto_usd', 'total_credit_available', 'total_loans',
            'total_monthly_obligations', 'total_coverage_amount',
            'defi_positions_value', 'defi_yield_annual', 'liquid_assets',
            'illiquid_assets'
        ]
        for field in money_fields:
            self._data[field] = format_money(self._data.get(field, 0.0))

        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)


class AssetBridge(BaseMemoryModel):
    """Asset bridge model for tracking cross-asset conversions and transfers."""
    __tablename__ = "asset_bridges"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('bridge_type', 'fiat_to_crypto')
        self._data.setdefault('from_asset_class', 'fiat')
        self._data.setdefault('to_asset_class', 'crypto')
        self._data.setdefault('from_amount', '0.0')
        self._data.setdefault('to_amount', '0.0')
        self._data.setdefault('exchange_rate', 1.0)
        self._data.setdefault('fees', {})
        self._data.setdefault('total_fees_usd', 0.0)
        self._data.setdefault('status', 'pending')
        self._data.setdefault('transaction_hash', None)
        self._data.setdefault('error_message', None)

        # Format fee
        self._data['total_fees_usd'] = format_money(self._data.get('total_fees_usd', 0.0))

        if 'initiated_at' not in self._data:
            self._data['initiated_at'] = datetime.now(UTC)
        self._data.setdefault('completed_at', None)


class ConversionRate(BaseMemoryModel):
    """Conversion rate model for tracking exchange rates between assets."""
    __tablename__ = "conversion_rates"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self._data.setdefault('from_asset', 'USD')
        self._data.setdefault('to_asset', 'EUR')
        self._data.setdefault('rate', 1.0)
        self._data.setdefault('inverse_rate', 1.0)
        self._data.setdefault('source', 'market')  # market, fixed, custom
        self._data.setdefault('is_active', True)

        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)
        if 'valid_until' not in self._data:
            # Default validity of 1 hour
            self._data['valid_until'] = datetime.now(UTC) + timedelta(hours=1)


class CollateralPosition(BaseMemoryModel):
    """Collateral position model for cross-asset collateralized lending."""
    __tablename__ = "collateral_positions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('position_type', 'loan')
        self._data.setdefault('collateral_assets', [])
        self._data.setdefault('total_collateral_value_usd', 0.0)
        self._data.setdefault('amount_borrowed', 0.0)
        self._data.setdefault('currency_borrowed', 'USD')
        self._data.setdefault('loan_to_value', 0.0)
        self._data.setdefault('liquidation_ltv', 0.8)
        self._data.setdefault('health_factor', 1.0)
        self._data.setdefault('interest_rate', 0.0)
        self._data.setdefault('interest_type', 'variable')
        self._data.setdefault('is_active', True)

        # Format money fields
        self._data['total_collateral_value_usd'] = format_money(
            self._data.get('total_collateral_value_usd', 0.0)
        )
        self._data['amount_borrowed'] = format_money(self._data.get('amount_borrowed', 0.0))

        if 'last_updated' not in self._data:
            self._data['last_updated'] = datetime.now(UTC)


class UnifiedTransaction(BaseMemoryModel):
    """Unified transaction model for tracking cross-system transfers."""
    __tablename__ = "unified_transactions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('transaction_type', 'transfer')
        self._data.setdefault('source_system', 'fiat')
        self._data.setdefault('destination_system', 'crypto')
        self._data.setdefault('amount_usd', 0.0)
        self._data.setdefault('source_amount', '0.0')
        self._data.setdefault('source_currency', 'USD')
        self._data.setdefault('destination_amount', '0.0')
        self._data.setdefault('destination_currency', 'USDC')
        self._data.setdefault('route_taken', [])
        self._data.setdefault('total_fees_usd', 0.0)
        self._data.setdefault('status', 'pending')
        self._data.setdefault('reference_ids', {})  # System-specific IDs

        # Format money fields
        self._data['amount_usd'] = format_money(self._data.get('amount_usd', 0.0))
        self._data['total_fees_usd'] = format_money(self._data.get('total_fees_usd', 0.0))

        if 'initiated_at' not in self._data:
            self._data['initiated_at'] = datetime.now(UTC)
        self._data.setdefault('completed_at', None)


# Unified system enums
class AssetClass:
    """Asset class enum."""
    FIAT = "fiat"
    CRYPTO = "crypto"
    NFT = "nft"
    CREDIT = "credit"
    LOAN = "loan"
    INSURANCE = "insurance"
    INVESTMENT = "investment"


class ConversionType:
    """Conversion type enum."""
    FIAT_TO_CRYPTO = "fiat_to_crypto"
    CRYPTO_TO_FIAT = "crypto_to_fiat"
    CRYPTO_TO_CRYPTO = "crypto_to_crypto"
    CREDIT_TO_FIAT = "credit_to_fiat"
    COLLATERAL_SWAP = "collateral_swap"


class UnifiedTransferStatus:
    """Unified transfer status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LinkedAccount(BaseMemoryModel):
    """Represents a linked bank account from external sources (Plaid, etc)."""
    __key__ = 'id'
    __attributes__ = [
        'id',
        'bank_link_id',
        'plaid_account_id',
        'name',
        'type',
        'subtype',
        'mask',
        'official_name',
        'current_balance',
        'available_balance',
        'iso_currency_code',
        'created_at',
        'last_synced_at',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class CurrencyConversion(BaseMemoryModel):
    """Represents a currency conversion transaction."""
    __key__ = 'id'
    __attributes__ = [
        'id',
        'from_currency',
        'to_currency',
        'from_amount',
        'to_amount',
        'exchange_rate',
        'markup_percentage',
        'fee',
        'total_fee',
        'conversion_date',
        'status',
        'user_id',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class CurrencyInfoMemory(BaseMemoryModel):
    """Represents information about a currency (memory model)."""
    __key__ = 'code'
    __attributes__ = [
        'code',
        'name',
        'symbol',
        'is_crypto',
        'exchange_rate_to_usd',
        'precision',
        'supported_for_conversion',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


# Backwards compatibility alias
CurrencyInfo = CurrencyInfoMemory


# Additional models as needed...


class MessageAttachment(BaseMemoryModel):
    """Message attachment model."""
    __tablename__ = "message_attachments"
    __key__ = 'id'
    __attributes__ = [
        'id',
        'message_id',
        'filename',
        'file_type',
        'file_size',
        'file_url',
        'uploaded_at',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if 'uploaded_at' not in self._data:
            self._data['uploaded_at'] = datetime.now(UTC)


class MessageFolder(BaseMemoryModel):
    """Message folder model."""
    __tablename__ = "message_folders"
    __key__ = 'id'
    __attributes__ = [
        'id',
        'user_id',
        'folder_name',
        'color',
        'created_at',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if 'created_at' not in self._data:
            self._data['created_at'] = datetime.now(UTC)


class BlockedUser(BaseMemoryModel):
    """Blocked user model."""
    __tablename__ = "blocked_users"
    __key__ = 'id'
    __attributes__ = [
        'id',
        'user_id',
        'blocked_user_id',
        'reason',
        'blocked_at',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if 'blocked_at' not in self._data:
            self._data['blocked_at'] = datetime.now(UTC)


class MessageSettings(BaseMemoryModel):
    """Message settings model."""
    __tablename__ = "message_settings"
    __key__ = 'id'
    __attributes__ = [
        'id',
        'user_id',
        'email_on_new_message',
        'push_notifications',
        'notification_sound',
        'auto_mark_read',
        'created_at',
        'updated_at',
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if 'created_at' not in self._data:
            self._data['created_at'] = datetime.now(UTC)
        if 'updated_at' not in self._data:
            self._data['updated_at'] = datetime.now(UTC)


# Security Models
class AuditLog(BaseMemoryModel):
    """Audit log model for tamper-resistant logging."""
    __tablename__ = "audit_logs"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('event_type', 'action')
        self._data.setdefault('status', 'success')
        self._data.setdefault('timestamp', datetime.now(UTC))
        self._data.setdefault('encrypted', 1)


class LoginAttempt(BaseMemoryModel):
    """Login attempt model for anomaly detection."""
    __tablename__ = "login_attempts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('timestamp', datetime.now(UTC))
        self._data.setdefault('success', False)


class TransactionAnomaly(BaseMemoryModel):
    """Transaction anomaly model for security monitoring."""
    __tablename__ = "transaction_anomalies"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('detected_at', datetime.now(UTC))
        self._data.setdefault('risk_score', 0.0)


class SecurityIncident(BaseMemoryModel):
    """Security incident model."""
    __tablename__ = "security_incidents"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('created_at', datetime.now(UTC))
        self._data.setdefault('severity', 'medium')
        self._data.setdefault('status', 'open')


class AccountLockout(BaseMemoryModel):
    """Account lockout model."""
    __tablename__ = "account_lockouts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('locked_at', datetime.now(UTC))
        self._data.setdefault('is_active', True)


class TrustedDevice(BaseMemoryModel):
    """Trusted device model."""
    __tablename__ = "trusted_devices"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._data.setdefault('first_seen', datetime.now(UTC))
        self._data.setdefault('last_seen', datetime.now(UTC))
        self._data.setdefault('is_trusted', False)


# Business Models
class Invoice(BaseMemoryModel):
    """Invoice model."""
    __tablename__ = "invoices"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('status', 'draft')
        self._data.setdefault('amount_paid', 0.0)
        self._data.setdefault('subtotal', 0.0)
        self._data.setdefault('tax_amount', 0.0)
        self._data.setdefault('discount_amount', 0.0)
        self._data.setdefault('total_amount', 0.0)
        self._data.setdefault('line_items', [])
        self._data.setdefault('extra_data', {})

        # Format money fields
        money_fields = ['amount_paid', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount']
        for field in money_fields:
            self._data[field] = format_money(self._data.get(field, 0.0))

        self._data.setdefault('sent_at', None)
        self._data.setdefault('paid_at', None)


class ExpenseReport(BaseMemoryModel):
    """Expense report model."""
    __tablename__ = "expense_reports"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('status', 'draft')
        self._data.setdefault('total_amount', 0.0)
        self._data.setdefault('reimbursable_amount', 0.0)
        self._data.setdefault('expense_items', [])

        # Format money fields
        self._data['total_amount'] = format_money(self._data.get('total_amount', 0.0))
        self._data['reimbursable_amount'] = format_money(self._data.get('reimbursable_amount', 0.0))

        self._data.setdefault('submitted_at', None)
        self._data.setdefault('approved_at', None)


class Receipt(BaseMemoryModel):
    """Receipt model."""
    __tablename__ = "receipts"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from ..utils.money import format_money

        self._data.setdefault('amount', 0.0)
        self._data['amount'] = format_money(self._data.get('amount', 0.0))

        self._data.setdefault('tax_deductible', False)
        self._data.setdefault('category', 'other')

        if 'receipt_date' not in self._data:
            self._data['receipt_date'] = datetime.now(UTC)


# Export all models and enums
__all__ = [
    'Account',
    'AccountLockout',
    'AccountType',
    'AssetBridge',
    'AssetClass',
    'AuditLog',
    'BaseMemoryModel',
    'BillingCycle',
    'BlockchainNetwork',
    'BlockedUser',
    'Budget',
    'BudgetPeriod',
    'Card',
    'CardSpendingLimit',
    'CardStatus',
    'CardType',
    'Category',
    'CollateralPosition',
    'Contact',
    'ContactStatus',
    'Conversation',
    'ConversationParticipant',
    'ConversionRate',
    'ConversionType',
    'CreditAlert',
    'CreditAlertSeverity',
    'CreditAlertType',
    'CreditBuilderAccount',
    'CreditBuilderType',
    'CreditDispute',
    'CreditDisputeStatus',
    'CreditDisputeType',
    'CreditScore',
    'CreditSimulation',
    'CryptoAsset',
    'CryptoAssetType',
    'CryptoTransaction',
    'CryptoTransactionStatus',
    'CryptoWallet',
    'CurrencyConversion',
    'CurrencyInfo',
    'DeFiPosition',
    'DeFiProtocolType',
    'DirectMessage',
    'ExpenseReport',
    'Goal',
    'GoalContribution',
    'GoalStatus',
    'Invoice',
    'LinkedAccount',
    'Log',
    'LoginAttempt',
    'Merchant',
    'Message',
    'MessageAttachment',
    'MessageFolder',
    'MessageReadReceipt',
    'MessageSettings',
    'MessageStatus',
    'NFTAsset',
    'Note',
    'Notification',
    'NotificationType',
    'PaymentMethod',
    'PaymentMethodStatus',
    'PaymentMethodType',
    'Receipt',
    'RecurringRule',
    'SecurityEvent',
    'SecurityEventType',
    'SecurityIncident',
    'SpendingLimitPeriod',
    'Subscription',
    'SubscriptionCategory',
    'SubscriptionStatus',
    'Transaction',
    'TransactionAnomaly',
    'TransactionDirection',
    'TransactionStatus',
    'TransactionType',
    'TrustedDevice',
    'UnifiedBalance',
    'UnifiedTransaction',
    'UnifiedTransferStatus',
    'User',
    'UserRole',
]
