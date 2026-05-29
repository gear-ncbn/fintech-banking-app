from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# Import shared enums from data_classes
from .dto import (
    AccountType,
    BudgetPeriod,
    ContactStatus,
    ExportFormat,
    GoalStatus,
    MessageStatus,
    NotificationType,
    PaymentMethodStatus,
    PaymentMethodType,
    SecurityEventType,
    TransactionStatus,
    TransactionType,
    TwoFactorMethod,
    UserRole,
)


# Base Models
class BaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None = None

# User Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    currency: str = "USD"
    timezone: str = "UTC"

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    currency: str | None = None
    timezone: str | None = None

class UserResponse(BaseResponse):
    username: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    role: UserRole
    currency: str
    timezone: str
    is_active: bool
    last_login: datetime | None = None

# Account Models
class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    account_number: str | None = None
    institution_name: str | None = None
    initial_balance: float = 0.0
    credit_limit: float | None = None
    interest_rate: float | None = None

class JointAccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    account_number: str | None = None
    institution_name: str | None = None
    initial_balance: float = 0.0
    credit_limit: float | None = None
    interest_rate: float | None = None
    joint_owner_username: str = Field(..., min_length=1)

class AccountUpdate(BaseModel):
    name: str | None = None
    institution_name: str | None = None
    credit_limit: float | None = None
    interest_rate: float | None = None
    is_active: bool | None = None

class AccountResponse(BaseResponse):
    user_id: int
    name: str
    account_type: AccountType
    account_number: str | None = None
    institution_name: str | None = None
    balance: float
    currency: str = "USD"
    credit_limit: float | None = None
    interest_rate: float | None = None
    is_active: bool

    @field_validator('balance', 'credit_limit', mode='before')
    @classmethod
    def format_money_fields(cls, v):
        """Ensure all money fields have exactly 2 decimal places."""
        if v is None:
            return v
        return round(float(v), 2)

class AccountSummary(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float
    accounts: list[AccountResponse]

    @field_validator('total_assets', 'total_liabilities', 'net_worth', mode='before')
    @classmethod
    def format_money_fields(cls, v):
        """Ensure all money fields have exactly 2 decimal places."""
        if v is None:
            return v
        return round(float(v), 2)

# Category Models
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    parent_id: int | None = None
    icon: str | None = None
    color: str | None = None
    is_income: bool = False

class CategoryUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    icon: str | None = None
    color: str | None = None
    is_income: bool | None = None

class CategoryResponse(BaseResponse):
    user_id: int | None = None  # System categories don't have user_id
    name: str
    parent_id: int | None = None
    icon: str | None = None
    color: str | None = None
    is_income: bool
    is_system: bool

# Transaction Models
class TransactionCreate(BaseModel):
    account_id: int
    category_id: int | None = None
    merchant_name: str | None = None
    amount: float = Field(..., gt=0)
    transaction_type: TransactionType
    description: str | None = None
    notes: str | None = None
    transaction_date: datetime

    @field_validator('transaction_type', mode='before')
    @classmethod
    def normalize_transaction_type(cls, v):
        if isinstance(v, str):
            # Convert to lowercase for enum matching
            return v.lower()
        return v

    @field_validator('transaction_date', mode='before')
    @classmethod
    def parse_transaction_date(cls, v):
        if isinstance(v, str):
            try:
                # Handle date string in ISO format (YYYY-MM-DD)
                if 'T' not in v:
                    v = f"{v}T00:00:00"
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD or ISO datetime string") from None
        return v

class TransactionUpdate(BaseModel):
    category_id: int | None = None
    description: str | None = None
    merchant: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    attachments: list[dict[str, Any]] | None = None

class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float = Field(..., gt=0)
    description: str | None = None
    notes: str | None = None
    transaction_date: datetime

class TransactionResponse(BaseResponse):
    account_id: int
    category_id: int | None = None
    merchant_id: int | None = None
    merchant: str | None = None
    amount: float
    transaction_type: TransactionType
    status: TransactionStatus
    description: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    attachments: list[dict[str, Any]] | None = None
    transaction_date: datetime
    from_account_id: int | None = None
    to_account_id: int | None = None
    reference_number: str | None = None
    recurring_rule_id: int | None = None

    @field_validator('amount', mode='before')
    @classmethod
    def format_money_fields(cls, v):
        """Ensure all money fields have exactly 2 decimal places."""
        if v is None:
            return v
        return round(float(v), 2)

class TransactionFilter(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    transaction_type: TransactionType | None = None
    start_date: date | None = None
    end_date: date | None = None
    min_amount: float | None = None
    max_amount: float | None = None

# Budget Models
class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(..., gt=0)
    period: BudgetPeriod
    start_date: date
    end_date: date | None = None
    alert_threshold: float = Field(0.8, ge=0, le=1)

class BudgetUpdate(BaseModel):
    amount: float | None = None
    alert_threshold: float | None = None
    is_active: bool | None = None

class BudgetResponse(BaseResponse):
    user_id: int
    category_id: int
    amount: float
    period: BudgetPeriod
    start_date: date
    end_date: date | None = None
    alert_threshold: float
    is_active: bool
    spent_amount: float | None = None  # Calculated field
    remaining_amount: float | None = None  # Calculated field
    percentage_used: float | None = None  # Calculated field

    @field_validator('amount', 'spent_amount', 'remaining_amount', mode='before')
    @classmethod
    def format_money_fields(cls, v):
        """Ensure all money fields have exactly 2 decimal places."""
        if v is None:
            return v
        return round(float(v), 2)

# Goal Models
class GoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    target_amount: float = Field(..., gt=0)
    target_date: date | None = None
    category: str | None = None
    priority: str | None = None
    initial_amount: float | None = None
    account_id: int | None = None
    auto_transfer_amount: float | None = None
    auto_transfer_frequency: str | None = None
    # Automatic allocation fields
    auto_allocate_percentage: float | None = Field(None, ge=0, le=100)
    auto_allocate_fixed_amount: float | None = Field(None, ge=0)
    allocation_priority: int | None = Field(1, ge=1)
    allocation_source_types: list[str] | None = None

class GoalUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    target_amount: float | None = None
    target_date: date | None = None
    category: str | None = None
    priority: str | None = None
    status: GoalStatus | None = None
    auto_transfer_amount: float | None = None
    auto_transfer_frequency: str | None = None
    # Automatic allocation fields
    auto_allocate_percentage: float | None = Field(None, ge=0, le=100)
    auto_allocate_fixed_amount: float | None = Field(None, ge=0)
    allocation_priority: int | None = Field(None, ge=1)
    allocation_source_types: list[str] | None = None

class GoalContribute(BaseModel):
    amount: float = Field(..., gt=0)
    notes: str | None = None

class GoalResponse(BaseResponse):
    user_id: int
    name: str
    description: str | None = None
    target_amount: float
    current_amount: float
    target_date: date | None = None
    category: str | None = None
    priority: str | None = None
    status: GoalStatus
    account_id: int | None = None
    auto_transfer_amount: float | None = None
    auto_transfer_frequency: str | None = None
    completed_at: datetime | None = None
    progress_percentage: float | None = None  # Calculated field
    # Automatic allocation fields
    auto_allocate_percentage: float | None = None
    auto_allocate_fixed_amount: float | None = None
    allocation_priority: int | None = None
    allocation_source_types: list[str] | None = None

    @field_validator('target_amount', 'current_amount', 'auto_transfer_amount', 'auto_allocate_fixed_amount', mode='before')
    @classmethod
    def format_money_fields(cls, v):
        """Ensure all money fields have exactly 2 decimal places."""
        if v is None:
            return v
        return round(float(v), 2)

# Notification Models
class NotificationResponse(BaseResponse):
    user_id: int
    type: NotificationType
    title: str
    message: str
    is_read: bool
    related_entity_type: str | None = None
    related_entity_id: int | None = None
    read_at: datetime | None = None

class NotificationUpdate(BaseModel):
    is_read: bool

# Recurring Transaction Models
class RecurringRuleCreate(BaseModel):
    name: str
    account_id: int
    category_id: int | None = None
    amount: float = Field(..., gt=0)
    transaction_type: TransactionType
    frequency: str  # daily, weekly, monthly, yearly
    day_of_month: int | None = Field(None, ge=1, le=31)
    day_of_week: int | None = Field(None, ge=0, le=6)
    start_date: date
    end_date: date | None = None

class RecurringRuleResponse(BaseResponse):
    user_id: int
    name: str
    account_id: int
    category_id: int | None = None
    amount: float
    transaction_type: TransactionType
    frequency: str
    day_of_month: int | None = None
    day_of_week: int | None = None
    start_date: date
    end_date: date | None = None
    next_occurrence: date | None = None
    is_active: bool

# Import Models
class ImportFileRequest(BaseModel):
    account_id: int
    file_content: str  # Base64 encoded CSV content

class ImportFileResponse(BaseResponse):
    user_id: int
    filename: str
    account_id: int | None = None
    transactions_count: int
    status: str
    error_message: str | None = None

# Analytics Models
class SpendingByCategory(BaseModel):
    category_id: int
    category_name: str
    total_amount: float
    transaction_count: int
    percentage: float

class IncomeExpenseSummary(BaseModel):
    period: str
    total_income: float
    total_expenses: float
    net_income: float
    income_by_category: list[SpendingByCategory]
    expenses_by_category: list[SpendingByCategory]

class BudgetSummary(BaseModel):
    total_budget: float  # Changed from total_budgeted to match frontend
    total_spent: float
    total_remaining: float
    budgets: list[BudgetResponse]

class GoalSummary(BaseModel):
    total_goals: int
    active_goals: int
    completed_goals: int
    total_target: float
    total_saved: float
    overall_progress: float = 0.0
    goals: list[GoalResponse]

    @field_validator('total_target', 'total_saved', mode='before')
    @classmethod
    def format_money_fields(cls, v):
        """Ensure all money fields have exactly 2 decimal places."""
        if v is None:
            return v
        return round(float(v), 2)

# Contact Models
class ContactCreate(BaseModel):
    contact_id: int
    nickname: str | None = None

class ContactUpdate(BaseModel):
    nickname: str | None = None
    is_favorite: bool | None = None

class ContactStatusUpdate(BaseModel):
    status: ContactStatus

class ContactResponse(BaseResponse):
    user_id: int
    contact_id: int
    status: ContactStatus
    nickname: str | None = None
    is_favorite: bool
    contact_username: str | None = None  # Populated from joins
    contact_email: str | None = None  # Populated from joins

# Conversation Models
class ConversationCreate(BaseModel):
    participant_ids: list[int]  # User IDs to add to conversation
    title: str | None = None  # For group chats
    initial_message: str | None = None

class ConversationUpdate(BaseModel):
    title: str | None = None

class ConversationResponse(BaseResponse):
    title: str | None = None
    is_group: bool
    created_by_id: int | None = None
    last_message_at: datetime | None = None
    participant_count: int | None = None
    unread_count: int | None = None  # Calculated per user

class ConversationParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    user_id: int
    joined_at: datetime
    last_read_at: datetime | None = None
    is_admin: bool
    is_muted: bool
    notification_enabled: bool
    username: str | None = None  # From join

# Message Models
class MessageCreate(BaseModel):
    conversation_id: int
    content: str
    message_type: str = "text"
    related_transaction_id: int | None = None

class MessageUpdate(BaseModel):
    content: str

class MessageResponse(BaseResponse):
    conversation_id: int
    sender_id: int
    content: str
    message_type: str
    related_transaction_id: int | None = None
    status: MessageStatus
    is_edited: bool
    edited_at: datetime | None = None
    is_deleted: bool
    deleted_at: datetime | None = None
    sender_username: str | None = None  # From join
    read_by_count: int | None = None  # Calculated

class MessageReadReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: int
    user_id: int
    read_at: datetime
    username: str | None = None  # From join

# Chat Analytics
class ChatSummary(BaseModel):
    total_conversations: int
    active_conversations: int  # With messages in last 30 days
    total_messages: int
    total_contacts: int
    pending_contact_requests: int

# Direct Message Models
class DirectMessageCreate(BaseModel):
    recipient_username: str
    subject: str
    message: str
    priority: str = "normal"
    attachments: list[dict[str, Any]] | None = None
    is_draft: bool = False

class DirectMessageReply(BaseModel):
    message: str

class DirectMessageResponse(BaseResponse):
    sender_id: int
    sender_username: str | None = None
    recipient_id: int
    recipient_username: str | None = None
    subject: str
    message: str
    priority: str
    is_read: bool
    read_at: datetime | None = None
    is_draft: bool
    parent_message_id: int | None = None
    folder_id: int | None = None
    sent_at: datetime
    attachments: list[dict[str, Any]] | None = []

    @property
    def preview(self) -> str:
        return self.message[:100] + "..." if len(self.message) > 100 else self.message

    @classmethod
    def from_orm_custom(cls, obj):
        # Create instance without attachments
        data = {
            "id": obj.id,
            "sender_id": obj.sender_id,
            "recipient_id": obj.recipient_id,
            "subject": obj.subject,
            "message": obj.message,
            "priority": obj.priority,
            "is_read": obj.is_read,
            "read_at": obj.read_at,
            "is_draft": obj.is_draft,
            "parent_message_id": obj.parent_message_id,
            "folder_id": obj.folder_id,
            "sent_at": obj.sent_at,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
            "attachments": []  # Will be populated separately
        }
        return cls(**data)

class MessageFolderCreate(BaseModel):
    folder_name: str
    color: str | None = None

class MessageFolderResponse(BaseResponse):
    user_id: int
    folder_name: str
    color: str | None = None
    message_count: int | None = 0

class MessageMoveRequest(BaseModel):
    folder_id: int

class MessageSettingsUpdate(BaseModel):
    email_on_new_message: bool | None = None
    push_notifications: bool | None = None
    notification_sound: bool | None = None
    auto_mark_read: bool | None = None

class MessageSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    email_on_new_message: bool
    push_notifications: bool
    notification_sound: bool
    auto_mark_read: bool

class BlockUserRequest(BaseModel):
    username: str
    reason: str | None = None

class BulkMessageUpdate(BaseModel):
    message_ids: list[int]

# Payment Method Models
class PaymentMethodBase(BaseModel):
    type: PaymentMethodType
    nickname: str | None = None
    is_default: bool = False

class PaymentMethodCardCreate(PaymentMethodBase):
    type: PaymentMethodType = PaymentMethodType.CREDIT_CARD
    card_number: str = Field(..., min_length=13, max_length=19)
    expiry_month: int = Field(..., ge=1, le=12)
    expiry_year: int = Field(..., ge=datetime.now().year)
    cvv: str = Field(..., min_length=3, max_length=4)
    billing_zip: str

class PaymentMethodBankCreate(PaymentMethodBase):
    type: PaymentMethodType = PaymentMethodType.BANK_ACCOUNT
    account_number: str
    routing_number: str = Field(..., pattern="^[0-9]{9}$")
    bank_name: str
    account_type: str = Field(..., pattern="^(checking|savings)$")

class PaymentMethodWalletCreate(PaymentMethodBase):
    type: PaymentMethodType = PaymentMethodType.DIGITAL_WALLET
    wallet_provider: str
    wallet_id: str

class PaymentMethodUpdate(BaseModel):
    nickname: str | None = None
    is_default: bool | None = None
    billing_zip: str | None = None

class PaymentMethodResponse(PaymentMethodBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: PaymentMethodStatus
    card_last_four: str | None = None
    card_brand: str | None = None
    expiry_month: int | None = None
    expiry_year: int | None = None
    account_last_four: str | None = None
    bank_name: str | None = None
    wallet_provider: str | None = None
    created_at: datetime
    last_used_at: datetime | None = None

# Two-Factor Authentication Models
class TwoFactorSetup(BaseModel):
    method: TwoFactorMethod
    phone_number: str | None = None  # For SMS
    email: str | None = None  # For email verification

class TwoFactorVerify(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    method: TwoFactorMethod

class TwoFactorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    method: TwoFactorMethod
    is_enabled: bool
    is_primary: bool
    created_at: datetime
    last_used_at: datetime | None = None

class TwoFactorSetupResponse(TwoFactorResponse):
    secret: str | None = None  # For TOTP setup
    qr_code: str | None = None  # QR code image data
    backup_codes: list[str] | None = None  # One-time backup codes

# Device/Session Models
class UserDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    device_name: str
    device_type: str
    os: str | None = None
    browser: str | None = None
    location: str | None = None
    is_trusted: bool
    is_active: bool
    created_at: datetime
    last_active_at: datetime

class DeviceTrustUpdate(BaseModel):
    is_trusted: bool

# Security Audit Log Models
class SecurityAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: SecurityEventType
    device_name: str | None = None
    ip_address: str | None = None
    location: str | None = None
    success: bool
    failure_reason: str | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime

# Transaction Attachment Models
class TransactionAttachment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_id: int
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    uploaded_at: datetime

class TransactionAttachmentCreate(BaseModel):
    file_name: str
    file_type: str
    file_size: int
    file_data: str  # Base64 encoded file data

# Transaction Split Models
class TransactionSplitCreate(BaseModel):
    user_id: int
    amount: float = Field(..., gt=0)
    description: str | None = None

class TransactionSplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_id: int
    user_id: int
    amount: float
    is_paid: bool
    paid_at: datetime | None = None
    description: str | None = None
    user_name: str | None = None  # From join

# Export Models
class ExportRequest(BaseModel):
    format: ExportFormat
    start_date: date
    end_date: date
    account_ids: list[int] | None = None
    category_ids: list[int] | None = None
    include_attachments: bool = False

class ExportResponse(BaseModel):
    export_id: str
    status: str  # pending, processing, completed, failed
    format: ExportFormat
    file_url: str | None = None
    file_size: int | None = None
    created_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None

# Currency Models
class CurrencyInfo(BaseModel):
    code: str
    name: str
    symbol: str
    exchange_rate: float  # Rate to USD

class CurrencyConversion(BaseModel):
    from_currency: str
    to_currency: str
    amount: float
    converted_amount: float
    exchange_rate: float
    conversion_date: datetime

# Bank Linking Models
class BankLinkRequest(BaseModel):
    institution_id: str
    credentials: dict[str, str]  # Bank-specific credentials

class BankLinkResponse(BaseModel):
    link_id: str
    institution_name: str
    status: str  # pending, active, error, expired
    accounts_found: int
    last_sync: datetime | None = None
    error_message: str | None = None

class LinkedAccountResponse(BaseModel):
    id: int
    external_id: str
    institution_name: str
    account_name: str
    account_type: AccountType
    account_number_masked: str
    current_balance: float
    available_balance: float
    last_sync: datetime

# Transfer and Payment Models
class TransferRequest(BaseModel):
    source_account_id: int
    destination_account_id: int
    amount: float = Field(..., gt=0, le=50000)  # Max 50k per transfer
    description: str | None = None
    is_external: bool = False

class DepositRequest(BaseModel):
    account_id: int
    amount: float = Field(..., gt=0, le=100000)  # Max 100k per deposit
    description: str | None = None
    deposit_method: str = Field(..., pattern="^(cash|check|wire|ach|mobile)$")
    source: str | None = None

class WithdrawalRequest(BaseModel):
    account_id: int
    amount: float = Field(..., gt=0, le=10000)  # Max 10k per withdrawal
    description: str | None = None
    withdrawal_method: str = Field(..., pattern="^(atm|bank|wire|check)$")

class BillPaymentRequest(BaseModel):
    account_id: int
    amount: float = Field(..., gt=0)
    payee_name: str
    payee_account_number: str
    bill_type: str = Field(..., pattern="^(utility|credit_card|loan|rent|insurance|other_bills|other)$")
    category_id: int | None = None
    due_date: date | None = None
    description: str | None = None

class TransferResponse(TransactionResponse):
    """Transfer response is the same as TransactionResponse"""


# Linked Account Models
class LinkedAccountResponse(BaseModel):
    """Response for a linked bank account"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    bank_link_id: int
    plaid_account_id: str
    name: str
    type: str
    subtype: str | None = None
    mask: str | None = None
    official_name: str | None = None
    current_balance: float | None = None
    available_balance: float | None = None
    iso_currency_code: str = "USD"
    created_at: datetime | None = None
    last_synced_at: datetime | None = None


# Currency Models
class CurrencyInfoResponse(BaseModel):
    """Response for currency information"""
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    symbol: str
    is_crypto: bool = False
    exchange_rate_to_usd: float = 1.0
    precision: int = 2
    supported_for_conversion: bool = True


class CurrencyConversionRequest(BaseModel):
    """Request for currency conversion"""
    from_currency: str
    to_currency: str
    from_amount: float = Field(..., gt=0)
    markup_percentage: float = Field(default=0, ge=0, le=100)


class CurrencyConversionResponse(BaseResponse):
    """Response for currency conversion transaction"""
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    markup_percentage: float
    fee: float
    total_fee: float
    conversion_date: datetime
    status: str = "completed"
    user_id: int


# Aliases for backwards compatibility (created in __init__.py after importing all models)
# - CurrencyInfo = CurrencyInfoResponse
# - ExpenseReport = ExpenseReportResponse
# - Invoice = InvoiceResponse
# - Receipt = ReceiptResponse


# Import new feature models
# Note: These are imported separately in each route file that needs them
# The duplicate models below have been removed to avoid conflicts
# Models are now properly organized in:
# - app.models.card_models
# - app.models.credit_models
# - app.models.savings_models
# - app.models.business_models
# - app.models.subscription_models
