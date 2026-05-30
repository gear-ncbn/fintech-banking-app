import hashlib
import random
import string
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field

from ..models import (
    Account,
    AccountType,
    Card,
    CardAnalyticsResponse,
    CardFreezeRequest,
    CardLimitRequest,
    CardLimitResponse,
    CardSpendingLimit,
    CardStatus,
    CardType,
    Category,
    Notification,
    NotificationType,
    SpendingLimitPeriod,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.validators import ValidationError

router = APIRouter()

def enum_value(value: Any) -> Any:
    """Return enum values while preserving plain memory-model strings."""
    return value.value if hasattr(value, "value") else value

# Pydantic model for creating virtual card from parent card (no account_id needed)
class CardFromParentCreate(BaseModel):
    spending_limit: float | None = None
    merchant_restrictions: list[str] | None = None
    expires_in_days: int | None = Field(default=30, ge=1, le=365)
    single_use: bool = False
    name: str | None = None

# Additional Pydantic models for standard card operations
class CardCreate(BaseModel):
    card_number: str
    card_type: str  # 'credit' or 'debit'
    card_name: str
    issuer: str | None = None
    linked_account_id: int | None = None  # For debit cards
    credit_limit: float | None = None  # For credit cards
    current_balance: float | None = 0.0  # For credit cards
    billing_cycle_day: int | None = None  # For credit cards
    interest_rate: float | None = None  # For credit cards
    expiry_date: str | None = None
    rewards_program: str | None = None
    rewards_rate: float | None = None

class VirtualCardCreateRequest(BaseModel):
    account_id: int
    spending_limit: float | None = None
    merchant_restrictions: list[str] | None = None
    expires_in_days: int | None = Field(default=30, ge=1, le=365)
    single_use: bool = False
    name: str | None = None

class CardUpdate(BaseModel):
    card_name: str | None = None
    credit_limit: float | None = None
    is_active: bool | None = None
    billing_cycle_day: int | None = None
    interest_rate: float | None = None

class CardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    account_id: int
    card_name: str | None = None
    card_type: str
    last_four: str
    issuer: str | None = None
    is_active: bool
    linked_account_id: int | None = None
    credit_limit: float | None = None
    current_balance: float | None = None
    available_credit: float | None = None
    billing_cycle_day: int | None = None
    interest_rate: float | None = None
    expiry_date: date | None = None
    rewards_program: str | None = None
    rewards_rate: float | None = None
    created_at: datetime
    updated_at: datetime | None = None

class CardPaymentRequest(BaseModel):
    amount: float = Field(gt=0)
    from_account_id: int
    payment_date: datetime

class CardPaymentResponse(BaseModel):
    payment_id: int
    amount: float
    new_balance: float
    payment_date: datetime

class CardStatementResponse(BaseModel):
    statement_period: str
    previous_balance: float
    payments: float
    purchases: float
    interest_charged: float
    new_balance: float
    minimum_payment: float
    due_date: date
    transactions: list[dict[str, Any]]

class VirtualCardResponse(BaseModel):
    id: int
    account_id: int
    card_number_masked: str
    card_type: str
    status: str
    spending_limit: float | None = None
    spent_amount: float = 0.0
    merchant_restrictions: list[str] | None = None
    single_use: bool = False
    name: str | None = None
    created_at: datetime
    expires_at: datetime | None = None
    last_used_at: datetime | None = None
    is_virtual: bool = True
    parent_card_id: int | None = None

class CardRewardsResponse(BaseModel):
    total_rewards: float
    pending_rewards: float
    available_rewards: float
    rewards_history: list[dict[str, Any]]

class SpendingLimitRequest(BaseModel):
    daily_limit: float | None = None
    monthly_limit: float | None = None
    category_limits: dict[str, float] | None = None

class AlertConfigRequest(BaseModel):
    payment_due_alert: bool | None = None
    high_balance_alert: bool | None = None
    high_balance_threshold: int | None = None  # Percentage
    unusual_activity_alert: bool | None = None

class FraudReportRequest(BaseModel):
    transaction_ids: list[int]
    description: str
    contact_number: str

class FraudReportResponse(BaseModel):
    case_number: str
    card_blocked: bool
    new_card_ordered: bool
    estimated_delivery: date

def generate_card_number():
    """Generate a mock card number"""
    # Mock card number starting with 4 (Visa-like)
    return "4" + ''.join(random.choices(string.digits, k=15))

def generate_cvv():
    """Generate a mock CVV"""
    return ''.join(random.choices(string.digits, k=3))

def mask_card_number(card_number: str) -> str:
    """Mask card number except last 4 digits"""
    return f"****{card_number[-4:]}"

def get_last_four(card_number: str) -> str:
    """Get last 4 digits of card number"""
    return card_number[-4:] if len(card_number) >= 4 else card_number

# Standard Card CRUD Operations
@router.post("", response_model=dict[str, Any])
async def create_card(
    request: Request,
    card_data: CardCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new credit or debit card"""

    # Cards are physical by default (virtual cards use different endpoint)
    card_type = CardType.PHYSICAL

    # For debit cards, use linked account. For credit cards, create/find credit account
    if card_data.card_type == "debit":
        if not card_data.linked_account_id:
            raise ValidationError("Debit cards must be linked to an account")

        # Verify account ownership
        account = db_session.query(Account).filter(
            Account.id == card_data.linked_account_id,
            Account.user_id == current_user['user_id']
        ).first()

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        account_id = account.id
    else:
        # For credit cards, always create a new credit account
        # Each card should have its own account to avoid state conflicts
        account = Account(
            user_id=current_user['user_id'],
            name=card_data.card_name,
            account_type=AccountType.CREDIT_CARD,
            balance=-card_data.current_balance if card_data.current_balance else 0.0,
            credit_limit=card_data.credit_limit,
            interest_rate=card_data.interest_rate,
            institution_name=card_data.issuer,
            is_active=True
        )
        db_session.add(account)
        db_session.flush()

        account_id = account.id

    # Parse expiry date
    expiry_date = None
    if card_data.expiry_date:
        try:
            expiry_date = datetime.strptime(card_data.expiry_date, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid expiry date format. Use YYYY-MM-DD") from None
    else:
        # Default to 4 years from now
        expiry_date = (datetime.now(UTC) + timedelta(days=365 * 4)).date()

    # Create card
    card = Card(
        user_id=current_user['user_id'],
        account_id=account_id,
        card_number=card_data.card_number,  # In production, encrypt this
        card_type=card_type,
        status=CardStatus.ACTIVE,
        expiry_date=expiry_date,
        cvv_hash=hashlib.sha256(generate_cvv().encode()).hexdigest(),
        is_contactless_enabled=True,
        is_online_enabled=True,
        is_international_enabled=True
    )

    # Store additional metadata in a JSON column if available
    # For this example, we'll store in separate columns if they exist
    metadata = {
        "card_name": card_data.card_name,
        "issuer": card_data.issuer,
        "linked_account_id": card_data.linked_account_id,
        "credit_limit": card_data.credit_limit,
        "current_balance": card_data.current_balance,
        "billing_cycle_day": card_data.billing_cycle_day,
        "interest_rate": card_data.interest_rate,
        "rewards_program": card_data.rewards_program,
        "rewards_rate": card_data.rewards_rate
    }

    # Store card name in the account name field since Card model doesn't have card_name
    if account:
        account.name = card_data.card_name

    db_session.add(card)
    db_session.commit()
    db_session.refresh(card)

    # Return response
    response_data = {
        "id": card.id,
        "user_id": card.user_id,
        "account_id": card.account_id,
        "card_name": metadata["card_name"],
        "card_type": card_data.card_type,
        "last_four": get_last_four(card_data.card_number),
        "issuer": metadata["issuer"],
        "is_active": card.status == CardStatus.ACTIVE,
        "expiry_date": card.expiry_date,
        "created_at": card.created_at,
        "updated_at": card.updated_at
    }

    # Add card type specific fields
    if card_data.card_type == "debit":
        response_data["linked_account_id"] = metadata["linked_account_id"]
    else:
        # Credit card specific fields
        response_data["credit_limit"] = metadata["credit_limit"]
        response_data["current_balance"] = metadata["current_balance"]
        response_data["available_credit"] = metadata["credit_limit"] - metadata["current_balance"] if metadata["credit_limit"] and metadata["current_balance"] else None
        response_data["billing_cycle_day"] = metadata["billing_cycle_day"]
        response_data["interest_rate"] = metadata["interest_rate"]
        response_data["rewards_program"] = metadata["rewards_program"]
        response_data["rewards_rate"] = metadata["rewards_rate"]

    return response_data

@router.get("/analytics", response_model=dict[str, Any])
async def get_cards_analytics(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get overall card spending analytics"""
    # Get all user's cards
    cards = db_session.query(Card).filter(
        Card.user_id == current_user['user_id']
    ).all()

    # Get all user accounts
    all_accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()

    # Separate credit accounts
    credit_accounts = [a for a in all_accounts if a.account_type == AccountType.CREDIT_CARD]

    # Calculate analytics
    total_credit_limit = sum(a.credit_limit or 0 for a in credit_accounts)
    total_balance = sum(-a.balance for a in credit_accounts if a.balance < 0)
    utilization_rate = (total_balance / total_credit_limit * 100) if total_credit_limit > 0 else 0

    # Count cards by type
    cards_by_type = {
        "credit": sum(1 for c in cards if (c._data if hasattr(c, '_data') else c).get('card_type') == 'credit'),
        "debit": sum(1 for c in cards if (c._data if hasattr(c, '_data') else c).get('card_type') == 'debit'),
        "virtual": sum(1 for c in cards if (c._data if hasattr(c, '_data') else c).get('card_type') == 'virtual')
    }

    # Get recent transactions for spending by category
    all_account_ids = [a.id for a in credit_accounts]
    if all_account_ids:
        recent_transactions = db_session.query(Transaction).filter(
            Transaction.account_id.in_(all_account_ids),
            Transaction.transaction_date >= datetime.now(UTC) - timedelta(days=30),
            Transaction.transaction_type == TransactionType.DEBIT
        ).all()

        spending_by_category = {}
        for t in recent_transactions:
            if t.category:
                category_name = t.category.name
                spending_by_category[category_name] = spending_by_category.get(category_name, 0) + t.amount

        # Calculate average transaction size
        average_transaction_size = sum(t.amount for t in recent_transactions) / len(recent_transactions) if recent_transactions else 0
    else:
        spending_by_category = {}
        average_transaction_size = 0

    # Count active cards - simplified logic
    active_count = sum(1 for c in cards if str(c.status).lower() == 'active')

    return {
        "total_credit_limit": total_credit_limit,
        "total_balance": total_balance,
        "utilization_rate": round(utilization_rate, 2),
        "cards_by_type": cards_by_type,
        "spending_by_category": spending_by_category,
        "average_transaction_size": round(average_transaction_size, 2),
        "total_cards": len(cards),
        # Count active cards - check for both string 'active' and enum ACTIVE
        "active_cards": active_count
    }

@router.get("/virtual", response_model=list[VirtualCardResponse])
async def list_virtual_cards(
    account_id: int | None = None,
    include_expired: bool = False,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """List all virtual cards for the user"""
    # Get user's account IDs
    user_accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()

    user_account_ids = [acc.id for acc in user_accounts]

    query = db_session.query(Card).filter(
        Card.account_id.in_(user_account_ids),
        Card.card_type == 'virtual'
    )

    if account_id:
        # Verify account ownership
        account = db_session.query(Account).filter(
            Account.id == account_id,
            Account.user_id == current_user['user_id']
        ).first()

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        query = query.filter(Card.account_id == account_id)

    if not include_expired:
        query = query.filter(
            Card.status != 'expired',
            Card.status != 'cancelled'
        )

    cards = query.order_by(Card.created_at.desc()).all()

    # Convert cards to VirtualCardResponse
    responses = []
    for card in cards:
        # Access card data properly
        card_data = card._data if hasattr(card, '_data') else card

        responses.append(VirtualCardResponse(
            id=card_data.get('id', card.id if hasattr(card, 'id') else 0),
            account_id=card_data.get('account_id', card.account_id if hasattr(card, 'account_id') else 0),
            card_number_masked=card_data.get('card_number_masked') or mask_card_number(card_data.get('card_number', '****')),
            card_type=card_data.get('card_type', 'virtual'),
            status=card_data.get('status', 'active'),
            spending_limit=card_data.get('spending_limit'),
            spent_amount=card_data.get('spent_amount', 0.0),
            merchant_restrictions=card_data.get('merchant_restrictions', []),
            single_use=card_data.get('single_use', False),
            name=card_data.get('name') or card_data.get('card_name', 'Virtual Card'),
            created_at=card_data.get('created_at', datetime.now(UTC)),
            # Virtual cards are seeded with `expiry_date` (YYYY-MM-DD); fall back
            # to it so the expiration renders instead of an empty/invalid date.
            expires_at=card_data.get('expires_at') or card_data.get('expiry_date'),
            last_used_at=card_data.get('last_used_at'),
            is_virtual=True,
            parent_card_id=card_data.get('parent_card_id')
        ))

    return responses

@router.get("/{card_id}", response_model=dict[str, Any])
async def get_card(
    card_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get a specific card by ID"""
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Get card data - handle both dict and object formats
    card_data = card._data if hasattr(card, '_data') else card
    account = db_session.query(Account).filter(Account.id == card_data.get('account_id')).first() if card_data.get('account_id') else None

    # Build response
    response_data = {
        "id": card_data.get('id'),
        "user_id": card_data.get('user_id'),
        "account_id": card_data.get('account_id'),
        "card_name": card_data.get('card_name', f"Card ending in {card_data.get('card_number', '****')[-4:]}"),
        "card_type": card_data.get('card_type'),
        "card_number": card_data.get('card_number'),
        "cvv": card_data.get('cvv', '***'),
        "last_four": card_data.get('card_number', '****')[-4:],
        "issuer": card_data.get('issuer', account.institution_name if account else "Unknown Bank"),
        "is_active": card_data.get('status') == 'active',
        "status": card_data.get('status'),
        "expiry_date": card_data.get('expiry_date'),
        "created_at": card_data.get('created_at'),
        "updated_at": card_data.get('updated_at')
    }

    # Add card type specific fields
    if card_data.get('card_type') == "debit":
        response_data["linked_account_id"] = card_data.get('account_id')
    elif card_data.get('card_type') == "credit":
        # Credit card specific fields
        response_data["credit_limit"] = card_data.get('credit_limit')
        response_data["current_balance"] = card_data.get('current_balance', 0.0)
        response_data["available_credit"] = card_data.get('available_credit')
        response_data["minimum_payment"] = card_data.get('minimum_payment')
        response_data["payment_due_date"] = card_data.get('payment_due_date')
        response_data["interest_rate"] = card_data.get('interest_rate')
        response_data["rewards_program"] = card_data.get('rewards_program')
        response_data["rewards_rate"] = card_data.get('rewards_rate')
        response_data["rewards_balance"] = card_data.get('rewards_balance')
    elif card_data.get('card_type') == "virtual":
        # Virtual card specific fields
        response_data["spending_limit"] = card_data.get('spending_limit')
        response_data["spent_amount"] = card_data.get('spent_amount')
        response_data["single_use"] = card_data.get('single_use')
        response_data["merchant_restrictions"] = card_data.get('merchant_restrictions', [])

    return response_data

@router.put("/{card_id}", response_model=dict[str, Any])
async def update_card(
    request: Request,
    card_id: int,
    update_data: CardUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update card information"""

    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Update card status if is_active is provided
    if update_data.is_active is not None:
        card.status = CardStatus.ACTIVE if update_data.is_active else CardStatus.FROZEN

    # Update account if credit limit or interest rate changed
    # Check if it's a credit card by looking at the account type
    account = db_session.query(Account).filter(Account.id == card.account_id).first()
    if account:
        # Update card name if provided
        if update_data.card_name is not None:
            account.name = update_data.card_name

        # Update credit card specific fields
        if account.account_type == AccountType.CREDIT_CARD and (update_data.credit_limit is not None or update_data.interest_rate is not None):
            if update_data.credit_limit is not None:
                account.credit_limit = update_data.credit_limit
            if update_data.interest_rate is not None:
                account.interest_rate = update_data.interest_rate

    db_session.commit()
    db_session.refresh(card)

    # Return updated card
    return await get_card(card_id, current_user, db_session)

@router.post("/{card_id}/deactivate", response_model=dict[str, Any])
async def deactivate_card(
    request: Request,
    card_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Deactivate a card"""

    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    card.status = CardStatus.FROZEN
    db_session.commit()

    return {
        "id": card.id,
        "is_active": False,
        "message": "Card deactivated successfully"
    }

@router.get("", response_model=list[dict[str, Any]])
async def list_cards(
    card_type: str | None = Query(None, description="Filter by card type (credit/debit)"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """List all user cards with optional filtering"""
    query = db_session.query(Card).filter(
        Card.user_id == current_user['user_id']
    )

    # Filter by card type
    if card_type:
        query = query.filter(Card.card_type == card_type)

    # Filter by active status
    if is_active is not None:
        query = query.filter(Card.status == 'active') if is_active else query.filter(Card.status != 'active')

    cards = query.all()

    # Build response list
    response_cards = []
    for card in cards:
        # Get card data - handle both dict and object formats
        card_data = card._data if hasattr(card, '_data') else card
        account = db_session.query(Account).filter(Account.id == card_data.get('account_id')).first() if card_data.get('account_id') else None

        # Build response
        response_data = {
            "id": card_data.get('id'),
            "user_id": card_data.get('user_id'),
            "account_id": card_data.get('account_id'),
            "card_name": card_data.get('card_name', f"Card ending in {card_data.get('card_number', '****')[-4:]}"),
            "card_type": card_data.get('card_type'),
            "card_number": card_data.get('card_number'),
            "cvv": card_data.get('cvv', '***'),
            "last_four": card_data.get('card_number', '****')[-4:],
            "issuer": card_data.get('issuer', account.institution_name if account else "Unknown Bank"),
            "is_active": card_data.get('status') == 'active',
            "status": card_data.get('status'),
            "expiry_date": card_data.get('expiry_date'),
            "created_at": card_data.get('created_at'),
            "updated_at": card_data.get('updated_at')
        }

        # Add card type specific fields
        if card_data.get('card_type') == "debit":
            response_data["linked_account_id"] = card_data.get('account_id')
        elif card_data.get('card_type') == "credit":
            # Credit card specific fields
            response_data["credit_limit"] = card_data.get('credit_limit')
            response_data["current_balance"] = card_data.get('current_balance', 0.0)
            response_data["available_credit"] = card_data.get('available_credit')
            response_data["minimum_payment"] = card_data.get('minimum_payment')
            response_data["payment_due_date"] = card_data.get('payment_due_date')
            response_data["interest_rate"] = card_data.get('interest_rate')
            response_data["rewards_program"] = card_data.get('rewards_program')
            response_data["rewards_rate"] = card_data.get('rewards_rate')
            response_data["rewards_balance"] = card_data.get('rewards_balance')
        elif card_data.get('card_type') == "virtual":
            # Virtual card specific fields
            response_data["spending_limit"] = card_data.get('spending_limit')
            response_data["spent_amount"] = card_data.get('spent_amount')
            response_data["single_use"] = card_data.get('single_use')
            response_data["merchant_restrictions"] = card_data.get('merchant_restrictions', [])

        response_cards.append(response_data)

    return response_cards


@router.get("/{card_id}/transactions", response_model=list[dict[str, Any]])
async def get_card_transactions(
    card_id: int,
    limit: int = Query(100, description="Number of transactions to return"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get transactions for a specific card"""
    # Verify card ownership
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Get transactions for the card's account
    transactions = db_session.query(Transaction).filter(
        Transaction.account_id == card.account_id
    ).order_by(Transaction.transaction_date.desc()).limit(limit).offset(offset).all()

    # Format transactions
    result = []
    for t in transactions:
        result.append({
            "id": t.id,
            "amount": t.amount,
            "description": t.description or "Unknown",
            "transaction_date": t.transaction_date.isoformat(),
            "merchant": t.description[:20] if t.description else "Unknown",
            "category": t.category.name if t.category else "Uncategorized",
            "status": enum_value(t.status)
        })

    return result

@router.get("/{card_id}/statement/{year}/{month}", response_model=CardStatementResponse)
async def get_card_statement(
    card_id: int,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get monthly statement for a credit card"""
    # Verify card ownership and type
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Check if it's a credit card by looking at the account type
    account = db_session.query(Account).filter(Account.id == card.account_id).first()
    if not account or account.account_type != AccountType.CREDIT_CARD:
        raise ValidationError("Statements are only available for credit cards")

    # Get account
    account = db_session.query(Account).filter(Account.id == card.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    # Calculate statement period
    billing_day = 15  # Mock billing cycle day
    if month == 1:
        prev_month = 12
        prev_year = year - 1
    else:
        prev_month = month - 1
        prev_year = year

    start_date = datetime(prev_year, prev_month, billing_day)
    end_date = datetime(year, month, billing_day)

    # Get transactions for the period
    transactions = db_session.query(Transaction).filter(
        Transaction.account_id == card.account_id,
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date < end_date
    ).all()

    # Calculate statement details
    purchases = sum(t.amount for t in transactions if t.transaction_type == TransactionType.DEBIT)
    payments = sum(t.amount for t in transactions if t.transaction_type == TransactionType.CREDIT)

    # Mock previous balance and interest
    previous_balance = 1000.0
    interest_rate = account.interest_rate or 18.99
    interest_charged = (previous_balance * (interest_rate / 100) / 12) if previous_balance > 0 else 0.0

    new_balance = previous_balance + purchases - payments + interest_charged
    minimum_payment = max(25.0, new_balance * 0.02)  # 2% of balance or $25, whichever is greater

    # Format transactions
    transaction_list = []
    for t in transactions:
        transaction_list.append({
            "date": t.transaction_date.isoformat(),
            "description": t.description or "Unknown",
            "amount": t.amount,
            "type": enum_value(t.transaction_type)
        })

    return CardStatementResponse(
        statement_period=f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}",
        previous_balance=previous_balance,
        payments=payments,
        purchases=purchases,
        interest_charged=round(interest_charged, 2),
        new_balance=round(new_balance, 2),
        minimum_payment=round(minimum_payment, 2),
        due_date=end_date.date() + timedelta(days=25),
        transactions=transaction_list
    )

@router.post("/{card_id}/payment", response_model=CardPaymentResponse)
async def make_card_payment(
    request: Request,
    card_id: int,
    payment_data: CardPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Make a payment on a credit card"""

    # Verify card ownership and type
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Check if it's a credit card by looking at the account type
    credit_account = db_session.query(Account).filter(Account.id == card.account_id).first()
    if not credit_account:
        raise ValidationError(f"Credit card account not found (account_id={card.account_id})")
    if credit_account.account_type != AccountType.CREDIT_CARD:
        raise ValidationError(f"Payments can only be made on credit cards (account_type={credit_account.account_type}, expected={AccountType.CREDIT_CARD})")

    # Verify source account ownership
    source_account = db_session.query(Account).filter(
        Account.id == payment_data.from_account_id,
        Account.user_id == current_user['user_id']
    ).first()

    if not source_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source account not found"
        )

    # Check source account balance
    if source_account.balance < payment_data.amount:
        raise ValidationError("Insufficient funds in source account")

    # Account is already fetched above, no need to query again

    # Process payment
    # Debit from source account
    source_account.balance -= payment_data.amount

    # Credit to credit card account (reduce negative balance)
    credit_account.balance += payment_data.amount

    # Create transactions
    # Debit transaction from source account
    debit_transaction = Transaction(
        account_id=source_account.id,
        amount=payment_data.amount,
        transaction_type=TransactionType.DEBIT,
        status=TransactionStatus.COMPLETED,
        description=f"Credit card payment - Card ending in {card.card_number[-4:]}",
        transaction_date=payment_data.payment_date,
        to_account_id=credit_account.id
    )

    # Credit transaction to credit card account
    credit_transaction = Transaction(
        account_id=credit_account.id,
        amount=payment_data.amount,
        transaction_type=TransactionType.CREDIT,
        status=TransactionStatus.COMPLETED,
        description="Payment received - Thank you",
        transaction_date=payment_data.payment_date,
        from_account_id=source_account.id
    )

    db_session.add(debit_transaction)
    db_session.add(credit_transaction)
    db_session.commit()

    return CardPaymentResponse(
        payment_id=credit_transaction.id,
        amount=payment_data.amount,
        new_balance=-credit_account.balance,  # Show as positive for credit cards
        payment_date=payment_data.payment_date
    )

@router.get("/{card_id}/rewards", response_model=CardRewardsResponse)
async def get_card_rewards(
    card_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get rewards balance and history for a card"""
    # Verify card ownership
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Mock rewards data
    # In production, this would be calculated from transactions with rewards rates
    total_rewards = 1543.25
    pending_rewards = 123.50
    available_rewards = total_rewards - pending_rewards

    # Mock rewards history
    rewards_history = [
    ]

    return CardRewardsResponse(
        total_rewards=total_rewards,
        pending_rewards=pending_rewards,
        available_rewards=available_rewards,
        rewards_history=rewards_history
    )

@router.put("/{card_id}/spending-limit", response_model=dict[str, Any])
async def set_spending_limits(
    request: Request,
    card_id: int,
    limit_data: SpendingLimitRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Set spending limits for a card"""

    # Verify card ownership
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Create or update spending limits
    # Daily limit
    if limit_data.daily_limit is not None:
        daily_limit = db_session.query(CardSpendingLimit).filter(
            CardSpendingLimit.card_id == card_id,
            CardSpendingLimit.limit_period == SpendingLimitPeriod.DAILY,
            CardSpendingLimit.is_active
        ).first()

        if daily_limit:
            daily_limit.limit_amount = limit_data.daily_limit
            daily_limit.updated_at = datetime.now(UTC)
        else:
            daily_limit = CardSpendingLimit(
                card_id=card_id,
                limit_amount=limit_data.daily_limit,
                limit_period=SpendingLimitPeriod.DAILY,
                period_start=datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0),
                period_end=datetime.now(UTC).replace(hour=23, minute=59, second=59, microsecond=999999),
                current_usage=0.0,
                is_active=True
            )
            db_session.add(daily_limit)

    # Monthly limit
    if limit_data.monthly_limit is not None:
        monthly_limit = db_session.query(CardSpendingLimit).filter(
            CardSpendingLimit.card_id == card_id,
            CardSpendingLimit.limit_period == SpendingLimitPeriod.MONTHLY,
            CardSpendingLimit.is_active
        ).first()

        if monthly_limit:
            monthly_limit.limit_amount = limit_data.monthly_limit
            monthly_limit.updated_at = datetime.now(UTC)
        else:
            now = datetime.now(UTC)
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                period_end = period_start.replace(year=now.year + 1, month=1) - timedelta(microseconds=1)
            else:
                period_end = period_start.replace(month=now.month + 1) - timedelta(microseconds=1)

            monthly_limit = CardSpendingLimit(
                card_id=card_id,
                limit_amount=limit_data.monthly_limit,
                limit_period=SpendingLimitPeriod.MONTHLY,
                period_start=period_start,
                period_end=period_end,
                current_usage=0.0,
                is_active=True
            )
            db_session.add(monthly_limit)

    # Category limits
    if limit_data.category_limits:
        for category, limit_amount in limit_data.category_limits.items():
            # Since contains() is not available in memory adapter,
            # we need to fetch all category limits and check manually
            all_cat_limits = db_session.query(CardSpendingLimit).filter(
                CardSpendingLimit.card_id == card_id,
                CardSpendingLimit.is_active
            ).all()

            # Find matching category limit
            cat_limit = None
            for limit in all_cat_limits:
                if limit.merchant_categories and category in limit.merchant_categories:
                    cat_limit = limit
                    break

            if cat_limit:
                cat_limit.limit_amount = limit_amount
                cat_limit.updated_at = datetime.now(UTC)
            else:
                cat_limit = CardSpendingLimit(
                    card_id=card_id,
                    limit_amount=limit_amount,
                    limit_period=SpendingLimitPeriod.MONTHLY,
                    merchant_categories=[category],
                    period_start=datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
                    period_end=(datetime.now(UTC).replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(microseconds=1),
                    current_usage=0.0,
                    is_active=True
                )
                db_session.add(cat_limit)

    db_session.commit()

    # Get all active limits for response
    active_limits = db_session.query(CardSpendingLimit).filter(
        CardSpendingLimit.card_id == card_id,
        CardSpendingLimit.is_active
    ).all()

    return {
        "card_id": card_id,
        "daily_limit": next((l.limit_amount for l in active_limits if l.limit_period == SpendingLimitPeriod.DAILY), None),
        "monthly_limit": next((l.limit_amount for l in active_limits if l.limit_period == SpendingLimitPeriod.MONTHLY and not l.merchant_categories), None),
        "category_limits": {l.merchant_categories[0]: l.limit_amount for l in active_limits if l.merchant_categories},
        "updated_at": datetime.now(UTC).isoformat()
    }


@router.get("/{card_id}/spending-limit", response_model=dict[str, Any])
async def get_spending_limits(
    card_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get spending limits for a card"""
    # Verify card ownership
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Get all active limits
    active_limits = db_session.query(CardSpendingLimit).filter(
        CardSpendingLimit.card_id == card_id,
        CardSpendingLimit.is_active
    ).all()

    # Calculate current usage for each limit
    limits_with_usage = []
    for limit in active_limits:
        # Get transactions within the period
        transactions = db_session.query(Transaction).filter(
            Transaction.account_id == card.account_id,
            Transaction.transaction_date >= limit.period_start,
            Transaction.transaction_date <= limit.period_end,
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.status == TransactionStatus.COMPLETED
        )

        # Filter by category if specified
        if limit.merchant_categories:
            # Get category IDs for the merchant categories
            categories = db_session.query(Category).filter(
                Category.name.in_(limit.merchant_categories)
            ).all()
            category_ids = [c.id for c in categories]

            # Filter transactions by category IDs
            if category_ids:
                transactions = transactions.filter(
                    Transaction.category_id.in_(category_ids)
                )

        current_usage = sum(t.amount for t in transactions.all())

        limits_with_usage.append({
            "id": limit.id,
            "limit_amount": limit.limit_amount,
            "limit_period": enum_value(limit.limit_period),
            "current_usage": current_usage,
            "remaining": max(0, limit.limit_amount - current_usage),
            "merchant_categories": limit.merchant_categories,
            "period_start": limit.period_start.isoformat(),
            "period_end": limit.period_end.isoformat()
        })

    return {
        "card_id": card_id,
        "daily_limit": next((l["limit_amount"] for l in limits_with_usage if l["limit_period"] == "DAILY"), None),
        "daily_usage": next((l["current_usage"] for l in limits_with_usage if l["limit_period"] == "DAILY"), 0),
        "monthly_limit": next((l["limit_amount"] for l in limits_with_usage if l["limit_period"] == "MONTHLY" and not l["merchant_categories"]), None),
        "monthly_usage": next((l["current_usage"] for l in limits_with_usage if l["limit_period"] == "MONTHLY" and not l["merchant_categories"]), 0),
        "category_limits": {l["merchant_categories"][0]: {"limit": l["limit_amount"], "usage": l["current_usage"]} for l in limits_with_usage if l["merchant_categories"]},
        "limits": limits_with_usage
    }

@router.put("/{card_id}/alerts", response_model=dict[str, Any])
async def configure_card_alerts(
    request: Request,
    card_id: int,
    alert_config: AlertConfigRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Configure alert settings for a card"""

    # Verify card ownership
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # In production, these settings would be stored in the database
    # For now, we'll just return the requested configuration
    return {
        "card_id": card_id,
        "payment_due_alert": alert_config.payment_due_alert,
        "high_balance_alert": alert_config.high_balance_alert,
        "high_balance_threshold": alert_config.high_balance_threshold,
        "unusual_activity_alert": alert_config.unusual_activity_alert,
        "updated_at": datetime.now(UTC).isoformat()
    }



@router.post("/{card_id}/fraud-report", response_model=FraudReportResponse)
async def report_card_fraud(
    request: Request,
    card_id: int,
    fraud_data: FraudReportRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Report fraudulent transactions on a card"""

    # Verify card ownership
    card = db_session.query(Card).filter(
        Card.id == card_id,
        Card.user_id == current_user['user_id']
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Block the card immediately
    card.status = CardStatus.FROZEN
    db_session.commit()

    # Generate case number
    case_number = f"FRAUD-{datetime.now(UTC).strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    # Create notification
    notification = Notification(
        user_id=current_user['user_id'],
        type=NotificationType.SECURITY,
        title="Fraud Report Received",
        message=f"We've received your fraud report for card ending in {card.card_number[-4:]}. Case number: {case_number}",
        related_entity_type="card",
        related_entity_id=card_id
    )
    db_session.add(notification)
    db_session.commit()


    return FraudReportResponse(
        case_number=case_number,
        card_blocked=True,
        new_card_ordered=True,
        estimated_delivery=(datetime.now(UTC) + timedelta(days=7)).date()
    )


# Virtual Card Operations (Original endpoints)
@router.post("/{parent_card_id}/virtual", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
async def create_virtual_card_from_parent(
    request: Request,
    parent_card_id: int,
    card_data: CardFromParentCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a virtual card linked to a parent physical card"""

    # Verify parent card ownership
    parent_card = db_session.query(Card).filter(
        Card.id == parent_card_id,
        Card.user_id == current_user['user_id'],
        Card.card_type != CardType.VIRTUAL
    ).first()

    if not parent_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent card not found or is not a physical card"
        )

    # Generate virtual card details
    card_number = generate_card_number()
    cvv = generate_cvv()

    # Calculate expiry
    expires_at = datetime.now(UTC) + timedelta(days=card_data.expires_in_days or 30)

    # Create virtual card
    virtual_card = Card(
        user_id=current_user['user_id'],
        account_id=parent_card.account_id,
        card_number=card_number,
        card_type=CardType.VIRTUAL,
        status=CardStatus.ACTIVE,
        expiry_date=expires_at.date(),
        cvv_hash=hashlib.sha256(cvv.encode()).hexdigest(),
        is_contactless_enabled=False,
        is_online_enabled=True,
        is_international_enabled=parent_card.is_international_enabled
    )

    # Store virtual card specific data
    # In production, this would be in separate columns or JSON
    metadata = {
        "parent_card_id": parent_card_id,
        "card_number_masked": mask_card_number(card_number),
        "cvv": cvv,  # In production, don't store this
        "spending_limit": card_data.spending_limit,
        "merchant_restrictions": card_data.merchant_restrictions,
        "single_use": card_data.single_use,
        "name": card_data.name or f"Virtual Card {datetime.now(UTC).strftime('%m/%d')}",
        "expires_at": expires_at,
        "spent_amount": 0.0,
        "is_virtual": True
    }

    db_session.add(virtual_card)
    db_session.commit()
    db_session.refresh(virtual_card)


    # Return CardResponse format
    return CardResponse(
        id=virtual_card.id,
        account_id=virtual_card.account_id,
        card_number_masked=metadata["card_number_masked"],
        card_type=CardType.VIRTUAL,
        status=virtual_card.status,
        spending_limit=metadata["spending_limit"],
        spent_amount=metadata["spent_amount"],
        merchant_restrictions=metadata["merchant_restrictions"],
        single_use=metadata["single_use"],
        name=metadata["name"],
        created_at=virtual_card.created_at,
        expires_at=metadata["expires_at"],
        last_used_at=None,
        is_virtual=True,
        parent_card_id=parent_card_id
    )

@router.post("/virtual", response_model=VirtualCardResponse, status_code=status.HTTP_201_CREATED)
async def create_virtual_card(
    request: Request,
    card_data: VirtualCardCreateRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Generate a new virtual card"""

    # Verify account ownership
    account = db_session.query(Account).filter(
        Account.id == card_data.account_id,
        Account.user_id == current_user['user_id'],
        Account.is_active
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or inactive"
        )

    # Generate card details
    card_number = generate_card_number()
    cvv = generate_cvv()

    # Calculate expiry
    expires_at = datetime.now(UTC) + timedelta(days=card_data.expires_in_days or 30)

    # Create virtual card
    virtual_card = Card(
        user_id=current_user['user_id'],
        account_id=card_data.account_id,
        card_number=card_number,  # In production, encrypt this
        card_number_masked=mask_card_number(card_number),
        cvv=cvv,  # In production, encrypt this
        card_type='virtual',
        status='active',
        spending_limit=card_data.spending_limit,
        merchant_restrictions=card_data.merchant_restrictions,
        single_use=card_data.single_use,
        name=card_data.name or f"Virtual Card {datetime.now(UTC).strftime('%m/%d')}",
        expires_at=expires_at
    )

    db_session.add(virtual_card)
    db_session.commit()
    db_session.refresh(virtual_card)


    # Return CardResponse with proper fields
    try:
        response_data = {
            "id": virtual_card.id,
            "account_id": virtual_card.account_id,
            "card_number_masked": virtual_card.card_number_masked or mask_card_number(card_number),
            "card_type": virtual_card.card_type or 'virtual',
            "status": virtual_card.status or 'active',
            "spending_limit": virtual_card.spending_limit if hasattr(virtual_card, 'spending_limit') else None,
            "spent_amount": 0.0,  # Track this separately in production
            "merchant_restrictions": virtual_card.merchant_restrictions if hasattr(virtual_card, 'merchant_restrictions') else None,
            "single_use": virtual_card.single_use if hasattr(virtual_card, 'single_use') else False,
            "name": virtual_card.name or f"Virtual Card {datetime.now(UTC).strftime('%m/%d')}",
            "created_at": virtual_card.created_at,
            "expires_at": virtual_card.expires_at if hasattr(virtual_card, 'expires_at') else expires_at,
            "last_used_at": None,
            "is_virtual": True,
            "parent_card_id": None
        }
        return VirtualCardResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating virtual card response: {e!s}"
        )


@router.put("/{card_id}/freeze", response_model=CardResponse)
async def freeze_unfreeze_card(
    request: Request,
    card_id: int,
    freeze_data: CardFreezeRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Freeze or unfreeze a virtual card"""

    # Get card and verify ownership
    card = db_session.query(Card).filter(
        Card.id == card_id
    ).first()

    if card:
        # Verify ownership through account
        account = db_session.query(Account).filter(
            Account.id == card.account_id,
            Account.user_id == current_user['user_id']
        ).first()

        if not account:
            card = None

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    if card.status == CardStatus.EXPIRED:
        raise ValidationError("Cannot modify expired card")

    if card.status == CardStatus.CANCELLED:
        raise ValidationError("Cannot modify cancelled card")

    # Update status
    new_status = CardStatus.FROZEN if freeze_data.freeze else CardStatus.ACTIVE
    card.status = new_status

    db_session.commit()
    db_session.refresh(card)


    # Return CardResponse with proper fields
    return CardResponse(
        id=card.id,
        user_id=card.user_id,
        account_id=card.account_id,
        card_name=getattr(card, 'card_name', getattr(card, 'name', f"Card {card.id}")),
        card_type=enum_value(card.card_type),
        last_four=get_last_four(card.card_number) if card.card_number else "0000",
        issuer=getattr(card, 'issuer', None),
        is_active=card.status == CardStatus.ACTIVE,
        linked_account_id=getattr(card, 'linked_account_id', None),
        credit_limit=getattr(card, 'credit_limit', None),
        current_balance=getattr(card, 'current_balance', None),
        available_credit=getattr(card, 'available_credit', None),
        billing_cycle_day=getattr(card, 'billing_cycle_day', None),
        interest_rate=getattr(card, 'interest_rate', None),
        expiry_date=getattr(card, 'expiry_date', None),
        rewards_program=getattr(card, 'rewards_program', None),
        rewards_rate=getattr(card, 'rewards_rate', None),
        created_at=card.created_at,
        updated_at=getattr(card, 'updated_at', None)
    )

@router.post("/{card_id}/limits", response_model=CardLimitResponse, status_code=status.HTTP_201_CREATED)
async def set_card_limit(
    request: Request,
    card_id: int,
    limit_data: CardLimitRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Set spending limits for a card"""

    # Get card and verify ownership
    card = db_session.query(Card).filter(
        Card.id == card_id
    ).first()

    if card:
        # Verify ownership through account
        account = db_session.query(Account).filter(
            Account.id == card.account_id,
            Account.user_id == current_user['user_id']
        ).first()

        if not account:
            card = None

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Calculate period dates
    now = datetime.now(UTC)
    if limit_data.limit_period == SpendingLimitPeriod.DAILY:
        period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(days=1)
    elif limit_data.limit_period == SpendingLimitPeriod.WEEKLY:
        days_since_monday = now.weekday()
        period_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(days=7)
    elif limit_data.limit_period == SpendingLimitPeriod.MONTHLY:
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Calculate next month
        if now.month == 12:
            period_end = period_start.replace(year=now.year + 1, month=1)
        else:
            period_end = period_start.replace(month=now.month + 1)
    else:  # PER_TRANSACTION
        period_start = now
        period_end = now + timedelta(days=365)  # Effectively no end

    # Create card limit
    card_limit = CardSpendingLimit(
        card_id=card_id,
        limit_amount=limit_data.limit_amount,
        limit_period=limit_data.limit_period,
        merchant_categories=limit_data.merchant_categories,
        period_start=period_start,
        period_end=period_end,
        current_usage=0.0,
        is_active=True
    )

    db_session.add(card_limit)
    db_session.commit()
    db_session.refresh(card_limit)

    # Return CardLimitResponse with proper fields
    return CardLimitResponse(
        id=card_limit.id,
        card_id=card_limit.card_id,
        limit_amount=card_limit.limit_amount,
        limit_period=card_limit.limit_period,
        merchant_categories=card_limit.merchant_categories,
        current_usage=card_limit.current_usage,
        created_at=card_limit.created_at,
        is_active=card_limit.is_active
    )

@router.get("/{card_id}/analytics", response_model=CardAnalyticsResponse)
async def get_card_analytics(
    card_id: int,
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get analytics for card usage"""
    # Get card and verify ownership
    card = db_session.query(Card).filter(
        Card.id == card_id
    ).first()

    if card:
        # Verify ownership through account
        account = db_session.query(Account).filter(
            Account.id == card.account_id,
            Account.user_id == current_user['user_id']
        ).first()

        if not account:
            card = None

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    # Calculate date range
    end_date = datetime.now(UTC)
    start_date = end_date - timedelta(days=days)

    # Get transactions (mock data for now)
    # In production, you would track virtual card transactions
    transactions = db_session.query(Transaction).filter(
        Transaction.account_id == card.account_id,
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
        Transaction.transaction_type == TransactionType.DEBIT
    ).all()

    # Calculate analytics
    total_transactions = len(transactions)
    total_spent = sum(t.amount for t in transactions)
    average_transaction = total_spent / total_transactions if total_transactions > 0 else 0

    # Group by merchant (mock)
    merchant_spending = {}
    for t in transactions:
        merchant = t.description[:20]  # Mock merchant name
        merchant_spending[merchant] = merchant_spending.get(merchant, 0) + t.amount

    top_merchants = sorted(
        [{"merchant": k, "amount": v} for k, v in merchant_spending.items()],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]

    # Group by category
    category_spending = {}
    for t in transactions:
        if t.category:
            category_name = t.category.name
            category_spending[category_name] = category_spending.get(category_name, 0) + t.amount

    # Daily spending trend (last 7 days)
    daily_spending = []
    for i in range(7):
        day = end_date - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_total = sum(
            t.amount for t in transactions
            if day_start <= t.transaction_date < day_end
        )

        daily_spending.append({
            "date": day_start.isoformat(),
            "amount": day_total
        })

    daily_spending.reverse()

    return CardAnalyticsResponse(
        card_id=card_id,
        total_transactions=total_transactions,
        total_spent=total_spent,
        average_transaction=round(average_transaction, 2),
        top_merchants=top_merchants,
        spending_by_category=category_spending,
        daily_spending_trend=daily_spending,
        fraud_alerts=0,  # Mock
        period_start=start_date,
        period_end=end_date
    )
