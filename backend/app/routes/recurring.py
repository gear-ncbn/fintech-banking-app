from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import (
    Account,
    RecurringRule,
    RecurringRuleCreate,
    RecurringRuleResponse,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.validators import ValidationError, Validators

router = APIRouter()

def calculate_next_occurrence(rule: RecurringRule) -> date:
    """Calculate next occurrence date based on frequency"""
    today = date.today()

    if rule.frequency == "daily":
        return today + timedelta(days=1)
    if rule.frequency == "weekly":
        days_ahead = rule.day_of_week - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)
    if rule.frequency == "monthly":
        next_month = today.replace(day=1) + timedelta(days=32)
        next_month = next_month.replace(day=1)
        try:
            return next_month.replace(day=rule.day_of_month)
        except ValueError:
            # Handle months with fewer days
            import calendar
            last_day = calendar.monthrange(next_month.year, next_month.month)[1]
            return next_month.replace(day=min(rule.day_of_month, last_day))
    elif rule.frequency == "yearly":
        return today.replace(year=today.year + 1)

    return today + timedelta(days=30)  # Default

@router.post("", response_model=RecurringRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_rule(
    request: Request,
    rule_data: RecurringRuleCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new recurring transaction rule"""

    # Validate account ownership
    Validators.validate_account_ownership(
        db_session,
        rule_data.account_id,
        current_user['user_id']
    )

    # Validate category if provided
    if rule_data.category_id:
        Validators.validate_category_access(
            db_session,
            rule_data.category_id,
            current_user['user_id']
        )

    # Validate frequency parameters
    if rule_data.frequency == "weekly" and (rule_data.day_of_week is None or rule_data.day_of_week < 0 or rule_data.day_of_week > 6):
        raise ValidationError("Weekly frequency requires day_of_week (0-6)")

    if rule_data.frequency == "monthly" and (rule_data.day_of_month is None or rule_data.day_of_month < 1 or rule_data.day_of_month > 31):
        raise ValidationError("Monthly frequency requires day_of_month (1-31)")

    # Create recurring rule
    new_rule = RecurringRule(
        user_id=current_user['user_id'],
        name=rule_data.name,
        account_id=rule_data.account_id,
        category_id=rule_data.category_id,
        amount=rule_data.amount,
        transaction_type=rule_data.transaction_type,
        frequency=rule_data.frequency,
        day_of_month=rule_data.day_of_month,
        day_of_week=rule_data.day_of_week,
        start_date=rule_data.start_date,
        end_date=rule_data.end_date,
        next_occurrence=calculate_next_occurrence(rule_data),
        is_active=True
    )

    db_session.add(new_rule)
    db_session.commit()
    db_session.refresh(new_rule)

    # Log creation

    return RecurringRuleResponse.model_validate(new_rule)

@router.get("", response_model=list[RecurringRuleResponse])
async def get_recurring_rules(
    active_only: bool = True,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all recurring transaction rules"""
    query = db_session.query(RecurringRule).filter(
        RecurringRule.user_id == current_user['user_id']
    )

    if active_only:
        query = query.filter(RecurringRule.is_active)

    rules = query.order_by(RecurringRule.next_occurrence).all()

    return [RecurringRuleResponse.model_validate(rule) for rule in rules]

@router.get("/{rule_id}", response_model=RecurringRuleResponse)
async def get_recurring_rule(
    rule_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get specific recurring rule details"""
    rule = db_session.query(RecurringRule).filter(
        RecurringRule.id == rule_id,
        RecurringRule.user_id == current_user['user_id']
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring rule not found"
        )

    return RecurringRuleResponse.model_validate(rule)

@router.put("/{rule_id}/toggle")
async def toggle_recurring_rule(
    request: Request,
    rule_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Enable/disable a recurring rule"""

    rule = db_session.query(RecurringRule).filter(
        RecurringRule.id == rule_id,
        RecurringRule.user_id == current_user['user_id']
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring rule not found"
        )

    rule.is_active = not rule.is_active
    db_session.commit()

    action = "enabled" if rule.is_active else "disabled"

    # Log toggle

    return {"message": f"Recurring rule {action} successfully", "is_active": rule.is_active}

@router.post("/{rule_id}/execute")
async def execute_recurring_rule(
    request: Request,
    rule_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Manually execute a recurring rule"""

    rule = db_session.query(RecurringRule).filter(
        RecurringRule.id == rule_id,
        RecurringRule.user_id == current_user['user_id']
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring rule not found"
        )

    if not rule.is_active:
        raise ValidationError("Cannot execute inactive rule")

    # Get account
    account = db_session.query(Account).filter(Account.id == rule.account_id).first()
    if not account:
        raise ValidationError("Associated account not found")

    # Validate sufficient funds for debits
    if rule.transaction_type == TransactionType.DEBIT:
        Validators.validate_sufficient_funds(account, rule.amount)

    # Create transaction
    transaction = Transaction(
        account_id=rule.account_id,
        category_id=rule.category_id,
        amount=rule.amount,
        transaction_type=rule.transaction_type,
        status=TransactionStatus.COMPLETED,
        description=f"Recurring: {rule.name}",
        transaction_date=datetime.now(UTC),
        recurring_rule_id=rule.id,
        reference_number=f"REC-{rule.id}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"
    )

    # Update account balance
    if rule.transaction_type == TransactionType.DEBIT:
        account.balance -= rule.amount
    else:
        account.balance += rule.amount

    # Update next occurrence
    rule.next_occurrence = calculate_next_occurrence(rule)

    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)

    # Log execution

    return {
        "message": "Recurring transaction executed successfully",
        "transaction_id": transaction.id,
        "next_occurrence": rule.next_occurrence
    }

@router.delete("/{rule_id}")
async def delete_recurring_rule(
    request: Request,
    rule_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete a recurring rule"""

    rule = db_session.query(RecurringRule).filter(
        RecurringRule.id == rule_id,
        RecurringRule.user_id == current_user['user_id']
    ).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring rule not found"
        )

    # Soft delete - just deactivate
    rule.is_active = False
    db_session.commit()

    # Log deletion

    return {"message": "Recurring rule deleted successfully"}

@router.get("/upcoming/preview")
async def preview_upcoming_recurring(
    days_ahead: int = 30,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Preview upcoming recurring transactions"""
    end_date = date.today() + timedelta(days=days_ahead)

    rules = db_session.query(RecurringRule).filter(
        RecurringRule.user_id == current_user['user_id'],
        RecurringRule.is_active,
        RecurringRule.next_occurrence <= end_date
    ).all()

    upcoming = []
    for rule in rules:
        current_date = rule.next_occurrence
        while current_date <= end_date:
            upcoming.append({
                "rule_id": rule.id,
                "rule_name": rule.name,
                "amount": rule.amount,
                "transaction_type": rule.transaction_type.value,
                "scheduled_date": current_date,
                "account_id": rule.account_id,
                "category_id": rule.category_id
            })

            # Calculate next date
            if rule.frequency == "daily":
                current_date += timedelta(days=1)
            elif rule.frequency == "weekly":
                current_date += timedelta(weeks=1)
            elif rule.frequency == "monthly":
                # Add one month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            elif rule.frequency == "yearly":
                current_date = current_date.replace(year=current_date.year + 1)
            else:
                break

    # Sort by date
    upcoming.sort(key=lambda x: x['scheduled_date'])

    return {
        "count": len(upcoming),
        "upcoming_transactions": upcoming
    }
