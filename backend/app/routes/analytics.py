from datetime import date, datetime, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query

from ..models import (
    Account,
    AccountType,
    Budget,
    BudgetPeriod,
    Category,
    Goal,
    GoalStatus,
    IncomeExpenseSummary,
    SpendingByCategory,
    Transaction,
    TransactionType,
)
from ..repositories.data_manager import data_manager
from ..services.net_worth_valuation import compute_net_worth
from ..storage.memory_adapter import db, func
from ..utils.auth import get_current_user
from ..utils.validators import Validators

router = APIRouter()

@router.get("/spending/by-category")
async def get_spending_by_category(
    start_date: date | None = None,
    end_date: date | None = None,
    income_only: bool = False,
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get spending breakdown by category"""
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Validate date range
    Validators.validate_date_range(start_date, end_date)

    # Get user's account IDs
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == current_user['user_id']
    ).subquery()

    # Query transactions grouped by category
    query = db_session.query(
        Category.id,
        Category.name,
        func.sum(Transaction.amount).label('total_amount'),
        func.count(Transaction.id).label('transaction_count')
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        Transaction.account_id.in_(user_accounts),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
        Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
    )

    query = query.filter(Category.is_income) if income_only else query.filter(not Category.is_income)

    # Group by category and order by total amount
    results = query.group_by(
        Category.id, Category.name
    ).order_by(
        func.sum(Transaction.amount).desc()
    ).limit(limit).all()

    # Calculate total for percentage
    total = sum(r.total_amount for r in results)

    categories = []
    for r in results:
        percentage = (r.total_amount / total * 100) if total > 0 else 0
        categories.append(
            SpendingByCategory(
                category_id=r.id,
                category_name=r.name,
                total_amount=round(r.total_amount, 2),
                transaction_count=r.transaction_count,
                percentage=round(percentage, 2)
            )
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total": round(total, 2),
        "categories": categories
    }

@router.get("/income-expense/summary")
async def get_income_expense_summary(
    period: str = "monthly",  # daily, weekly, monthly, yearly
    periods_back: int = Query(6, ge=1, le=24),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get income vs expense summary over time"""
    # Get user's account IDs
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == current_user['user_id']
    ).subquery()

    # Calculate date range based on period
    end_date = date.today()
    if period == "daily":
        start_date = end_date - timedelta(days=periods_back)
    elif period == "weekly":
        start_date = end_date - timedelta(weeks=periods_back)
    elif period == "monthly":
        start_date = end_date - relativedelta(months=periods_back)
    else:  # yearly
        start_date = end_date - relativedelta(years=periods_back)

    # Get transactions
    transactions = db_session.query(
        Transaction.transaction_date,
        Transaction.amount,
        Transaction.transaction_type,
        Category.is_income
    ).join(
        Category, Transaction.category_id == Category.id
    ).filter(
        Transaction.account_id.in_(user_accounts),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time())
    ).all()

    # Group by period
    summaries = []
    current = start_date

    while current <= end_date:
        # Calculate period boundaries
        if period == "daily":
            period_start = current
            period_end = current
            next_period = current + timedelta(days=1)
            period_label = current.strftime("%Y-%m-%d")
        elif period == "weekly":
            period_start = current - timedelta(days=current.weekday())
            period_end = period_start + timedelta(days=6)
            next_period = period_start + timedelta(weeks=1)
            period_label = f"Week of {period_start.strftime('%Y-%m-%d')}"
        elif period == "monthly":
            period_start = current.replace(day=1)
            next_month = period_start + relativedelta(months=1)
            period_end = next_month - timedelta(days=1)
            next_period = next_month
            period_label = current.strftime("%B %Y")
        else:  # yearly
            period_start = current.replace(month=1, day=1)
            period_end = current.replace(month=12, day=31)
            next_period = period_start + relativedelta(years=1)
            period_label = str(current.year)

        # Calculate income and expenses for period
        period_transactions = [
            t for t in transactions
            if period_start <= t.transaction_date.date() <= period_end
        ]

        income = sum(
            t.amount for t in period_transactions
            if t.is_income or t.transaction_type == TransactionType.CREDIT
        )

        expenses = sum(
            t.amount for t in period_transactions
            if not t.is_income and t.transaction_type == TransactionType.DEBIT
        )

        # Get breakdown by category
        income_categories = {}
        expense_categories = {}

        for t in period_transactions:
            if t.is_income or t.transaction_type == TransactionType.CREDIT:
                cat_name = "Income"  # Simplified for now
                income_categories[cat_name] = income_categories.get(cat_name, 0) + t.amount
            else:
                cat_name = "Expense"  # Simplified for now
                expense_categories[cat_name] = expense_categories.get(cat_name, 0) + t.amount

        summaries.append(
            IncomeExpenseSummary(
                period=period_label,
                total_income=round(income, 2),
                total_expenses=round(expenses, 2),
                net_income=round(income - expenses, 2),
                income_by_category=[
                    SpendingByCategory(
                        category_id=0,
                        category_name=name,
                        total_amount=round(amount, 2),
                        transaction_count=0,
                        percentage=0
                    )
                    for name, amount in income_categories.items()
                ],
                expenses_by_category=[
                    SpendingByCategory(
                        category_id=0,
                        category_name=name,
                        total_amount=round(amount, 2),
                        transaction_count=0,
                        percentage=0
                    )
                    for name, amount in expense_categories.items()
                ]
            )
        )

        current = next_period

    return {
        "period_type": period,
        "summaries": summaries
    }

@router.get("/net-worth/history")
async def get_net_worth_history(
    months_back: int = Query(12, ge=1, le=60),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get net worth history over time"""
    end_date = date.today()
    start_date = end_date - relativedelta(months=months_back)

    # Get all user accounts
    accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()

    # Get all transactions for the period
    transactions = db_session.query(Transaction).filter(
        Transaction.account_id.in_([a.id for a in accounts]),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time())
    ).order_by(Transaction.transaction_date).all()

    # The investment portfolio + crypto wallet are valued canonically (single
    # source of truth) so the latest point reconciles with the Accounts and
    # Analytics "Net Worth". We don't store historical portfolio snapshots, so
    # the current investment value is carried across the history; month-to-month
    # movement therefore reflects the user's cash/liability changes.
    investment_value = compute_net_worth(
        data_manager, current_user['user_id']
    )["investment_value"]

    # Calculate month-by-month net worth
    history = []
    current = start_date.replace(day=1)

    while current <= end_date:
        month_end = (current + relativedelta(months=1)) - timedelta(days=1)

        # Calculate account balances at month end
        total_assets = investment_value
        total_liabilities = 0.0

        for account in accounts:
            # Start with current balance
            balance = account.balance

            # Work backwards from current transactions
            for tx in reversed(transactions):
                if tx.account_id == account.id and tx.transaction_date.date() > month_end:
                    # Reverse the transaction
                    if tx.transaction_type == TransactionType.DEBIT:
                        balance += tx.amount
                    elif tx.transaction_type == TransactionType.CREDIT:
                        balance -= tx.amount

            # Categorize by account type. Investment value is folded in via the
            # canonical valuation above, so only liquid bank assets are summed
            # here to avoid double counting.
            if account.account_type in [AccountType.CHECKING, AccountType.SAVINGS]:
                total_assets += balance
            elif account.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
                total_liabilities += abs(balance)

        history.append({
            "date": month_end,
            "assets": round(total_assets, 2),
            "liabilities": round(total_liabilities, 2),
            "net_worth": round(total_assets - total_liabilities, 2)
        })

        current += relativedelta(months=1)

    return {
        "history": history,
        "current_net_worth": history[-1]["net_worth"] if history else 0
    }

@router.get("/budget/performance")
async def get_budget_performance(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get budget performance analysis"""
    # Get active budgets
    budgets = db_session.query(Budget).filter(
        Budget.user_id == current_user['user_id'],
        Budget.is_active
    ).all()

    # Get user's account IDs
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == current_user['user_id']
    ).subquery()

    performance = []

    for budget in budgets:
        # Calculate current period dates
        today = date.today()

        if budget.period == BudgetPeriod.WEEKLY:
            period_start = today - timedelta(days=today.weekday())
            period_end = period_start + timedelta(days=6)
        elif budget.period == BudgetPeriod.MONTHLY:
            period_start = today.replace(day=1)
            next_month = period_start + relativedelta(months=1)
            period_end = next_month - timedelta(days=1)
        else:  # YEARLY
            period_start = today.replace(month=1, day=1)
            period_end = today.replace(month=12, day=31)

        # Get spending for this budget's category
        spent = db_session.query(func.sum(Transaction.amount)).filter(
            Transaction.category_id == budget.category_id,
            Transaction.account_id.in_(user_accounts),
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.transaction_date >= datetime.combine(period_start, datetime.min.time()),
            Transaction.transaction_date <= datetime.combine(period_end, datetime.max.time())
        ).scalar() or 0.0

        # Get category name
        category = db_session.query(Category).filter(
            Category.id == budget.category_id
        ).first()

        performance.append({
            "budget_id": budget.id,
            "category_name": category.name if category else "Unknown",
            "period": budget.period if isinstance(budget.period, str) else budget.period.value,
            "budgeted_amount": budget.amount,
            "spent_amount": round(spent, 2),
            "remaining_amount": round(budget.amount - spent, 2),
            "percentage_used": round((spent / budget.amount * 100) if budget.amount > 0 else 0, 2),
            "on_track": spent <= (budget.amount * 0.8),  # Within 80% is on track
            "period_start": period_start,
            "period_end": period_end
        })

    # Sort by percentage used (highest first)
    performance.sort(key=lambda x: x['percentage_used'], reverse=True)

    return {
        "budget_count": len(performance),
        "over_budget_count": sum(1 for p in performance if p['percentage_used'] > 100),
        "at_risk_count": sum(1 for p in performance if 80 <= p['percentage_used'] <= 100),
        "performance": performance
    }

@router.get("/goals/progress")
async def get_goals_progress(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get detailed goal progress analysis"""
    goals = db_session.query(Goal).filter(
        Goal.user_id == current_user['user_id']
    ).all()

    active_goals = [g for g in goals if g.status == GoalStatus.ACTIVE]
    completed_goals = [g for g in goals if g.status == GoalStatus.COMPLETED]

    # Calculate overall progress
    total_target = sum(g.target_amount for g in active_goals)
    total_saved = sum(g.current_amount for g in active_goals)

    # Project completion dates
    projections = []
    for goal in active_goals:
        if goal.auto_transfer_amount and goal.auto_transfer_frequency:
            remaining = goal.target_amount - goal.current_amount

            if goal.auto_transfer_frequency == "monthly":
                months_needed = remaining / goal.auto_transfer_amount
                projected_date = date.today() + relativedelta(months=int(months_needed))
            elif goal.auto_transfer_frequency == "weekly":
                weeks_needed = remaining / goal.auto_transfer_amount
                projected_date = date.today() + timedelta(weeks=int(weeks_needed))
            else:
                projected_date = None
        else:
            projected_date = None

        projections.append({
            "goal_id": goal.id,
            "goal_name": goal.name,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "progress_percentage": round((goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0, 2),
            "target_date": goal.target_date,
            "projected_completion": projected_date,
            "on_track": projected_date <= goal.target_date if projected_date and goal.target_date else True
        })

    return {
        "active_goals": len(active_goals),
        "completed_goals": len(completed_goals),
        "total_target_amount": round(total_target, 2),
        "total_saved_amount": round(total_saved, 2),
        "overall_progress": round((total_saved / total_target * 100) if total_target > 0 else 0, 2),
        "goal_projections": projections
    }
