from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from ..models import (
    Account,
    AccountCreate,
    AccountResponse,
    AccountSummary,
    AccountUpdate,
    JointAccountCreate,
    Transaction,
    User,
)
from ..repositories.data_manager import data_manager
from ..services.net_worth_valuation import compute_net_worth
from ..storage.memory_adapter import db, desc
from ..utils.auth import get_current_user
from ..utils.validators import Validators

router = APIRouter()

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    request: Request,
    account_data: AccountCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new account"""

    # Create new account
    # account_data.account_type is already an AccountType enum from Pydantic
    new_account = Account(
        user_id=current_user['user_id'],
        name=account_data.name,
        account_type=account_data.account_type,
        account_number=account_data.account_number,
        institution_name=account_data.institution_name,
        balance=account_data.initial_balance,
        credit_limit=account_data.credit_limit,
        interest_rate=account_data.interest_rate,
        is_active=True
    )

    db_session.add(new_account)
    db_session.commit()
    db_session.refresh(new_account)

    return AccountResponse.model_validate(new_account)

@router.post("/joint", status_code=status.HTTP_201_CREATED)
async def create_joint_account(
    request: Request,
    account_data: JointAccountCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new joint account"""


    # Validate required fields
    if not account_data.joint_owner_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Joint owner username is required"
        )

    # Find the joint owner by username
    joint_owner = db_session.query(User).filter(User.username == account_data.joint_owner_username).first()
    if not joint_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with username '{account_data.joint_owner_username}' not found"
        )

    # Check if joint owner is different from current user
    if joint_owner.id == current_user['user_id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create joint account with yourself"
        )

    # Create new account
    # account_data.account_type is already an AccountType enum from Pydantic
    new_account = Account(
        user_id=current_user['user_id'],  # Primary owner
        name=account_data.name,
        account_type=account_data.account_type,
        account_number=account_data.account_number,
        institution_name=account_data.institution_name,
        balance=account_data.initial_balance,
        credit_limit=account_data.credit_limit,
        interest_rate=account_data.interest_rate,
        is_active=True
    )

    db_session.add(new_account)
    db_session.flush()  # Get the account ID

    # For memory-based system, store joint owner info in metadata
    new_account.joint_owner_id = joint_owner.id
    new_account.is_joint = True

    db_session.commit()
    db_session.refresh(new_account)

    # Get current user details for notifications
    current_user_obj = db_session.query(User).get(current_user['user_id'])

    # Create notifications for both users
    from ..models import Notification, NotificationType

    # Notification for the creator
    creator_notification = Notification(
        user_id=current_user['user_id'],
        type=NotificationType.ACCOUNT_UPDATE,
        title="Joint Account Created",
        message=f"You've successfully created a joint {account_data.account_type.value} account '{account_data.name}' with {joint_owner.full_name}",
        is_read=False,
        metadata={
            "account_id": new_account.id,
            "joint_owner_id": joint_owner.id,
            "joint_owner_name": joint_owner.full_name
        }
    )
    db_session.add(creator_notification)

    # Notification for the joint owner
    joint_owner_notification = Notification(
        user_id=joint_owner.id,
        type=NotificationType.ACCOUNT_UPDATE,
        title="Added to Joint Account",
        message=f"{current_user_obj.full_name} has added you as a joint owner of the {account_data.account_type.value} account '{account_data.name}'",
        is_read=False,
        metadata={
            "account_id": new_account.id,
            "creator_id": current_user['user_id'],
            "creator_name": current_user_obj.full_name
        }
    )
    db_session.add(joint_owner_notification)

    db_session.commit()

    # Create custom response with owners field
    response = AccountResponse.model_validate(new_account).model_dump()
    # For memory-based system, manually create owners list
    response["owners"] = [
        {"id": current_user_obj.id, "username": current_user_obj.username, "email": current_user_obj.email},
        {"id": joint_owner.id, "username": joint_owner.username, "email": joint_owner.email}
    ]

    return response

@router.get("", response_model=list[AccountResponse])
async def get_accounts(
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all user accounts (including joint accounts)"""

    # Get accounts where user is primary owner or joint owner
    db_session.query(User).get(current_user['user_id'])

    # Get primary accounts
    primary_query = db_session.query(Account).filter(Account.user_id == current_user['user_id'])

    if not include_inactive:
        primary_query = primary_query.filter(Account.is_active)

    primary_accounts = primary_query.all()

    # Get joint accounts - query for accounts where current user is joint owner
    joint_accounts = []
    all_accounts_query = db_session.query(Account).filter(
        Account.joint_owner_id == current_user['user_id']
    )
    if not include_inactive:
        all_accounts_query = all_accounts_query.filter(Account.is_active)
    joint_accounts = all_accounts_query.all()

    # Combine and deduplicate
    all_accounts = list({acc.id: acc for acc in primary_accounts + joint_accounts}.values())

    # Sort by created_at
    all_accounts.sort(key=lambda x: x.created_at, reverse=True)

    return [AccountResponse.model_validate(acc) for acc in all_accounts]

@router.get("/summary", response_model=AccountSummary)
async def get_account_summary(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get financial summary across all accounts (including joint accounts)"""
    # Get user for joint accounts
    db_session.query(User).get(current_user['user_id'])

    # Get primary accounts
    primary_accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id'],
        Account.is_active
    ).all()

    # Get joint accounts - query for accounts where current user is joint owner
    joint_accounts = db_session.query(Account).filter(
        Account.joint_owner_id == current_user['user_id'],
        Account.is_active
    ).all()

    # Combine and deduplicate
    all_accounts = list({acc.id: acc for acc in primary_accounts + joint_accounts}.values())

    # Net worth comes from the single source of truth so it includes the
    # investment portfolio + crypto wallet and reconciles with the Analytics,
    # Investments and Crypto pages (see services.net_worth_valuation).
    net_worth_breakdown = compute_net_worth(data_manager, current_user['user_id'])

    return AccountSummary(
        total_assets=net_worth_breakdown["total_assets"],
        total_liabilities=net_worth_breakdown["total_liabilities"],
        net_worth=net_worth_breakdown["net_worth"],
        accounts=[AccountResponse.model_validate(acc) for acc in all_accounts]
    )

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get specific account details"""
    account = Validators.validate_account_ownership(
        db_session,
        account_id,
        current_user['user_id']
    )

    # Check if account is active
    if not account.is_active:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Access to inactive account is forbidden"}
        )

    return AccountResponse.model_validate(account)

@router.get("/{account_id}/transactions")
async def get_account_transactions(
    account_id: int,
    skip: int = 0,
    limit: int = 20,
    start_date: str | None = None,
    end_date: str | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get transactions for a specific account"""
    # Validate account ownership
    Validators.validate_account_ownership(
        db_session,
        account_id,
        current_user['user_id']
    )

    # Build query
    query = db_session.query(Transaction).filter(Transaction.account_id == account_id)

    # Apply date filters if provided
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.transaction_date >= start_dt)
        except (ValueError, AttributeError):
            pass

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.transaction_date <= end_dt)
        except (ValueError, AttributeError):
            pass

    # Order by date descending and apply pagination
    transactions = query.order_by(desc(Transaction.transaction_date)).offset(skip).limit(limit).all()

    # Get categories for transactions - include merchant info too
    from ..models import Category, Merchant
    category_ids = [t.category_id for t in transactions if t.category_id]
    categories = {}
    if category_ids:
        cats = db_session.query(Category).filter(Category.id.in_(category_ids)).all()
        categories = {c.id: c for c in cats}

    # Get merchants for transactions
    merchant_ids = [t.merchant_id for t in transactions if hasattr(t, 'merchant_id') and t.merchant_id]
    merchants = {}
    if merchant_ids:
        merch = db_session.query(Merchant).filter(Merchant.id.in_(merchant_ids)).all()
        merchants = {m.id: m.name for m in merch}

    # Convert to response format
    return [
        {
            "id": t.id,
            "account_id": t.account_id,
            "category_id": t.category_id,
            "category": {
                "id": categories[t.category_id].id,
                "name": categories[t.category_id].name,
                "type": "income" if categories[t.category_id].is_income else "expense",
                "icon": categories[t.category_id].icon,
                "color": categories[t.category_id].color
            } if t.category_id and t.category_id in categories else None,
            "transaction_type": t.transaction_type.value if hasattr(t.transaction_type, 'value') else t.transaction_type,
            "amount": float(t.amount),
            "description": t.description,
            "merchant": merchants.get(t.merchant_id) if hasattr(t, 'merchant_id') and t.merchant_id else None,
            "merchant_id": t.merchant_id if hasattr(t, 'merchant_id') else None,
            "transaction_date": t.transaction_date.isoformat(),
            "posted_date": t.posted_date.isoformat() if t.posted_date else None,
            "location": t.location,
            "notes": t.notes,
            "tags": t.tags if hasattr(t, 'tags') else [],
            "attachments": t.attachments if hasattr(t, 'attachments') else [],
            "is_flagged": t.is_flagged if hasattr(t, 'is_flagged') else False,
            "created_at": t.created_at.isoformat(),
            "status": t.status.value if hasattr(t, 'status') and hasattr(t.status, 'value') else (t.status if hasattr(t, 'status') else "completed")
        }
        for t in transactions
    ]

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    request: Request,
    account_id: int,
    account_update: AccountUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update account details"""

    account = Validators.validate_account_ownership(
        db_session,
        account_id,
        current_user['user_id']
    )

    # Update allowed fields
    update_data = account_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(account, field) and value is not None:
            setattr(account, field, value)

    account.updated_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(account)

    return AccountResponse.model_validate(account)

@router.delete("/{account_id}")
async def deactivate_account(
    request: Request,
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Deactivate an account (soft delete)"""

    account = Validators.validate_account_ownership(
        db_session,
        account_id,
        current_user['user_id']
    )

    # Check if account has non-zero balance
    if abs(account.balance) > 0.01:  # Small tolerance for floating point
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": f"Cannot deactivate account with non-zero balance: ${account.balance:.2f}"}
        )

    # Deactivate account
    account.is_active = False
    account.updated_at = datetime.now(UTC)
    db_session.commit()

    return {"message": "Account deactivated successfully"}

@router.get("/{account_id}/balance")
async def get_account_balance(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get current account balance with recent transactions"""
    account = Validators.validate_account_ownership(
        db_session,
        account_id,
        current_user['user_id']
    )

    # Get last 5 transactions
    recent_transactions = db_session.query(Transaction).filter(
        Transaction.account_id == account_id
    ).order_by(Transaction.transaction_date.desc()).limit(5).all()

    return {
        "account_id": account.id,
        "account_name": account.name,
        "balance": account.balance,
        "account_type": account.account_type.value,
        "credit_limit": account.credit_limit,
        "available_credit": account.credit_limit + account.balance if account.credit_limit else None,
        "recent_transactions": [
            {
                "id": tx.id,
                "amount": tx.amount,
                "type": tx.transaction_type.value if hasattr(tx.transaction_type, 'value') else tx.transaction_type,
                "description": tx.description,
                "date": tx.transaction_date.isoformat()
            }
            for tx in recent_transactions
        ]
    }
