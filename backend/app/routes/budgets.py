from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import (
    Account,
    Budget,
    BudgetCreate,
    BudgetPeriod,
    BudgetResponse,
    BudgetSummary,
    BudgetUpdate,
    Category,
    Transaction,
    TransactionType,
)
from ..storage.memory_adapter import db, func
from ..utils.auth import get_current_user
from ..utils.validators import ValidationError, Validators

router = APIRouter()

def calculate_budget_usage(budget: Budget, db_session: Any, user_id: int) -> dict:
    """Calculate current spending for a budget"""
    # Determine date range based on period
    today = date.today()

    if budget.period == BudgetPeriod.WEEKLY:
        # Get start of current week (Monday)
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif budget.period == BudgetPeriod.MONTHLY:
        # Get start of current month
        start_date = today.replace(day=1)
        # Get end of month
        next_month = start_date + relativedelta(months=1)
        end_date = next_month - timedelta(days=1)
    else:  # YEARLY
        # Get start of current year
        start_date = today.replace(month=1, day=1)
        end_date = today.replace(month=12, day=31)

    # Get user's accounts
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == user_id
    ).subquery()

    # Calculate spending
    spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.category_id == budget.category_id,
        Transaction.account_id.in_(user_accounts),
        Transaction.transaction_type == TransactionType.DEBIT,
        Transaction.transaction_date >= datetime.combine(start_date, time.min),
        Transaction.transaction_date <= datetime.combine(end_date, time.max)
    ).scalar() or 0.0

    remaining = budget.amount - spent
    percentage_used = (spent / budget.amount * 100) if budget.amount > 0 else 0

    return {
        "spent_amount": round(spent, 2),
        "remaining_amount": round(remaining, 2),
        "percentage_used": round(percentage_used, 2),
        "period_start": start_date,
        "period_end": end_date
    }

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    request: Request,
    budget_data: BudgetCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new budget"""

    # Validate category access
    category = Validators.validate_category_access(
        db_session,
        budget_data.category_id,
        current_user['user_id']
    )

    # Validate it's an expense category
    if category.is_income:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budgets can only be created for expense categories"
        )

    # Validate budget period
    Validators.validate_budget_period(budget_data.start_date, budget_data.end_date)

    # Check if active budget already exists for this category and period
    existing = db_session.query(Budget).filter(
        Budget.user_id == current_user['user_id'],
        Budget.category_id == budget_data.category_id,
        Budget.period == budget_data.period,
        Budget.is_active
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active {budget_data.period.value} budget already exists for {category.name}"
        )

    # Create new budget
    new_budget = Budget(
        user_id=current_user['user_id'],
        category_id=budget_data.category_id,
        amount=budget_data.amount,
        period=budget_data.period,
        start_date=budget_data.start_date,
        end_date=budget_data.end_date,
        alert_threshold=budget_data.alert_threshold,
        is_active=True
    )

    db_session.add(new_budget)
    db_session.commit()
    db_session.refresh(new_budget)

    # Log budget creation

    # Calculate initial usage
    usage = calculate_budget_usage(new_budget, db_session, current_user['user_id'])

    response = BudgetResponse.model_validate(new_budget)
    response.spent_amount = usage['spent_amount']
    response.remaining_amount = usage['remaining_amount']
    response.percentage_used = usage['percentage_used']

    return response

@router.get("", response_model=list[BudgetResponse])
async def get_budgets(
    period: BudgetPeriod | None = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all user budgets with current usage"""
    query = db_session.query(Budget).filter(Budget.user_id == current_user['user_id'])

    if active_only:
        query = query.filter(Budget.is_active)

    if period:
        query = query.filter(Budget.period == period)

    budgets = query.order_by(Budget.created_at.desc()).all()

    # Calculate usage for each budget
    results = []
    for budget in budgets:
        usage = calculate_budget_usage(budget, db_session, current_user['user_id'])
        response = BudgetResponse.model_validate(budget)
        response.spent_amount = usage['spent_amount']
        response.remaining_amount = usage['remaining_amount']
        response.percentage_used = usage['percentage_used']
        results.append(response)

    return results

@router.get("/summary", response_model=BudgetSummary)
async def get_budget_summary(
    period: BudgetPeriod | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get budget summary with totals"""
    query = db_session.query(Budget).filter(
        Budget.user_id == current_user['user_id'],
        Budget.is_active
    )

    if period:
        query = query.filter(Budget.period == period)

    budgets = query.all()

    total_budgeted = 0.0
    total_spent = 0.0
    budget_responses = []

    for budget in budgets:
        usage = calculate_budget_usage(budget, db_session, current_user['user_id'])

        total_budgeted += budget.amount
        total_spent += usage['spent_amount']

        response = BudgetResponse.model_validate(budget)
        response.spent_amount = usage['spent_amount']
        response.remaining_amount = usage['remaining_amount']
        response.percentage_used = usage['percentage_used']
        budget_responses.append(response)

    return BudgetSummary(
        total_budget=round(total_budgeted, 2),  # Changed to match frontend
        total_spent=round(total_spent, 2),
        total_remaining=round(total_budgeted - total_spent, 2),
        budgets=budget_responses
    )

@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get specific budget with usage details"""
    budget = db_session.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user['user_id']
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    usage = calculate_budget_usage(budget, db_session, current_user['user_id'])

    response = BudgetResponse.model_validate(budget)
    response.spent_amount = usage['spent_amount']
    response.remaining_amount = usage['remaining_amount']
    response.percentage_used = usage['percentage_used']

    return response

@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    request: Request,
    budget_id: int,
    update_data: BudgetUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update budget settings"""

    budget = db_session.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user['user_id']
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Update allowed fields
    if update_data.amount is not None:
        if update_data.amount <= 0:
            raise ValidationError("Budget amount must be greater than 0")
        budget.amount = update_data.amount

    if update_data.alert_threshold is not None:
        if not 0 <= update_data.alert_threshold <= 1:
            raise ValidationError("Alert threshold must be between 0 and 1")
        budget.alert_threshold = update_data.alert_threshold

    if update_data.is_active is not None:
        budget.is_active = update_data.is_active

    budget.updated_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(budget)

    # Calculate usage
    usage = calculate_budget_usage(budget, db_session, current_user['user_id'])

    # Check if budget is over threshold after update
    if usage['percentage_used'] >= budget.alert_threshold * 100:
        # Get category name for notification
        category = db_session.query(Category).filter(
            Category.id == budget.category_id
        ).first()

        # Import Notification model if not already imported
        from ..models import Notification, NotificationType

        # Calculate over amount
        over_amount = usage['spent_amount'] - budget.amount

        # Create notification
        notification = Notification(
            user_id=current_user['user_id'],
            type=NotificationType.BUDGET_WARNING,
            title="Budget Alert",
            message=f"Your {budget.period.value} {category.name if category else 'budget'} is over by ${over_amount:.2f}",
            action_url=f"/budget/{budget.id}",
            is_read=False,
            metadata={
                "budget_id": budget.id,
                "category_name": category.name if category else "Unknown",
                "period": budget.period.value,
                "budget_amount": budget.amount,
                "spent_amount": usage['spent_amount'],
                "percentage_used": usage['percentage_used']
            }
        )
        db_session.add(notification)
        db_session.commit()

        # Log budget alert

    response = BudgetResponse.model_validate(budget)
    response.spent_amount = usage['spent_amount']
    response.remaining_amount = usage['remaining_amount']
    response.percentage_used = usage['percentage_used']

    return response

@router.delete("/{budget_id}")
async def delete_budget(
    request: Request,
    budget_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete (deactivate) a budget"""

    budget = db_session.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user['user_id']
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Soft delete - just deactivate
    budget.is_active = False
    budget.updated_at = datetime.now(UTC)
    db_session.commit()

    # Log deletion

    return {"message": "Budget deactivated successfully"}

@router.get("/alerts/check")
async def check_budget_alerts(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Check for budgets that have exceeded alert threshold"""
    active_budgets = db_session.query(Budget).filter(
        Budget.user_id == current_user['user_id'],
        Budget.is_active
    ).all()

    alerts = []

    for budget in active_budgets:
        usage = calculate_budget_usage(budget, db_session, current_user['user_id'])

        if usage['percentage_used'] >= budget.alert_threshold * 100:
            # Get category name
            category = db_session.query(Category).filter(
                Category.id == budget.category_id
            ).first()

            alerts.append({
                "budget_id": budget.id,
                "category_name": category.name if category else "Unknown",
                "period": budget.period if isinstance(budget.period, str) else budget.period.value,
                "budget_amount": budget.amount,
                "spent_amount": usage['spent_amount'],
                "percentage_used": usage['percentage_used'],
                "alert_threshold": budget.alert_threshold * 100,
                "message": f"You've spent {usage['percentage_used']:.1f}% of your "
                          f"{budget.period if isinstance(budget.period, str) else budget.period.value} budget for {category.name if category else 'this category'}"
            })

    return {
        "has_alerts": len(alerts) > 0,
        "alerts": alerts
    }
