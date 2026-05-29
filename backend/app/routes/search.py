from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query

from ..models import Account, Budget, Category, Contact, Goal, Merchant, Message, Transaction, User
from ..storage.memory_adapter import db, or_
from ..utils.auth import get_current_user

router = APIRouter()

@router.get("")
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    types: list[str] | None = Query(None, description="Entity types to search"),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Global search across multiple entities"""
    search_term = f"%{q}%"
    results = {
        "transactions": [],
        "accounts": [],
        "categories": [],
        "merchants": [],
        "budgets": [],
        "goals": [],
        "contacts": [],
        "messages": []
    }

    # If no types specified, search all
    if not types:
        types = list(results.keys())

    # Get user's account IDs for transaction search
    user_accounts = [a.id for a in db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()]

    # Search transactions
    if "transactions" in types:
        transactions = db_session.query(Transaction).filter(
            Transaction.account_id.in_(user_accounts),
            or_(
                Transaction.description.ilike(search_term),
                Transaction.notes.ilike(search_term),
                Transaction.reference_number.ilike(search_term)
            )
        ).order_by(Transaction.transaction_date.desc()).limit(limit).all()

        for tx in transactions:
            account = db_session.query(Account).filter(Account.id == tx.account_id).first()
            category = db_session.query(Category).filter(Category.id == tx.category_id).first() if tx.category_id else None

            results["transactions"].append({
                "id": tx.id,
                "type": "transaction",
                "title": tx.description or f"{tx.transaction_type.value} Transaction",
                "subtitle": f"${tx.amount} - {account.name if account else 'Unknown Account'}",
                "date": tx.transaction_date,
                "url": f"/transactions/{tx.id}",
                "match_field": "description" if tx.description and q.lower() in tx.description.lower() else "notes"
            })

    # Search accounts
    if "accounts" in types:
        accounts = db_session.query(Account).filter(
            Account.user_id == current_user['user_id'],
            or_(
                Account.name.ilike(search_term),
                Account.account_number.ilike(search_term),
                Account.institution_name.ilike(search_term)
            )
        ).limit(limit).all()

        for acc in accounts:
            results["accounts"].append({
                "id": acc.id,
                "type": "account",
                "title": acc.name,
                "subtitle": f"{acc.account_type.value} - ${acc.balance:,.2f}",
                "date": acc.created_at,
                "url": f"/accounts/{acc.id}",
                "match_field": "name" if q.lower() in acc.name.lower() else "institution"
            })

    # Search categories
    if "categories" in types:
        categories = db_session.query(Category).filter(
            or_(
                Category.is_system,
                Category.user_id == current_user['user_id']
            ),
            Category.name.ilike(search_term)
        ).limit(limit).all()

        for cat in categories:
            results["categories"].append({
                "id": cat.id,
                "type": "category",
                "title": cat.name,
                "subtitle": f"{'Income' if cat.is_income else 'Expense'} Category",
                "date": cat.created_at,
                "url": f"/categories/{cat.id}",
                "match_field": "name"
            })

    # Search merchants
    if "merchants" in types:
        merchants = db_session.query(Merchant).filter(
            Merchant.name.ilike(search_term)
        ).limit(limit).all()

        for merch in merchants:
            # Count transactions for this merchant
            tx_count = db_session.query(Transaction).filter(
                Transaction.merchant_id == merch.id,
                Transaction.account_id.in_(user_accounts)
            ).count()

            results["merchants"].append({
                "id": merch.id,
                "type": "merchant",
                "title": merch.name,
                "subtitle": f"{tx_count} transactions",
                "date": merch.created_at,
                "url": f"/merchants/{merch.id}",
                "match_field": "name"
            })

    # Search budgets
    if "budgets" in types:
        budgets = db_session.query(Budget).join(
            Category
        ).filter(
            Budget.user_id == current_user['user_id'],
            Category.name.ilike(search_term)
        ).limit(limit).all()

        for budget in budgets:
            category = db_session.query(Category).filter(Category.id == budget.category_id).first()

            results["budgets"].append({
                "id": budget.id,
                "type": "budget",
                "title": f"{category.name if category else 'Unknown'} Budget",
                "subtitle": f"${budget.amount} {budget.period.value}",
                "date": budget.created_at,
                "url": f"/budgets/{budget.id}",
                "match_field": "category"
            })

    # Search goals
    if "goals" in types:
        goals = db_session.query(Goal).filter(
            Goal.user_id == current_user['user_id'],
            or_(
                Goal.name.ilike(search_term),
                Goal.description.ilike(search_term)
            )
        ).limit(limit).all()

        for goal in goals:
            progress = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0

            results["goals"].append({
                "id": goal.id,
                "type": "goal",
                "title": goal.name,
                "subtitle": f"${goal.current_amount:,.2f} of ${goal.target_amount:,.2f} ({progress:.1f}%)",
                "date": goal.created_at,
                "url": f"/goals/{goal.id}",
                "match_field": "name" if q.lower() in goal.name.lower() else "description"
            })

    # Search contacts
    if "contacts" in types:
        contacts = db_session.query(Contact).join(
            User, Contact.contact_id == User.id
        ).filter(
            Contact.user_id == current_user['user_id'],
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                Contact.nickname.ilike(search_term)
            )
        ).limit(limit).all()

        for contact in contacts:
            contact_user = db_session.query(User).filter(User.id == contact.contact_id).first()

            if contact_user:
                results["contacts"].append({
                    "id": contact.id,
                    "type": "contact",
                    "title": contact.nickname or contact_user.username,
                    "subtitle": contact_user.email,
                    "date": contact.created_at,
                    "url": f"/contacts/{contact.id}",
                    "match_field": "nickname" if contact.nickname and q.lower() in contact.nickname.lower() else "username"
                })

    # Search messages
    if "messages" in types:
        # Get user's conversation IDs
        from ..models import ConversationParticipant

        user_conversations = [p.conversation_id for p in db_session.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == current_user['user_id']
        ).all()]

        messages = db_session.query(Message).filter(
            Message.conversation_id.in_(user_conversations),
            Message.content.ilike(search_term),
            not Message.is_deleted
        ).order_by(Message.created_at.desc()).limit(limit).all()

        for msg in messages:
            sender = db_session.query(User).filter(User.id == msg.sender_id).first()

            results["messages"].append({
                "id": msg.id,
                "type": "message",
                "title": msg.content[:50] + "..." if len(msg.content) > 50 else msg.content,
                "subtitle": f"From {sender.username if sender else 'Unknown'}",
                "date": msg.created_at,
                "url": f"/messages/{msg.conversation_id}#msg-{msg.id}",
                "match_field": "content"
            })

    # Calculate total results
    total_results = sum(len(items) for items in results.values())

    return {
        "query": q,
        "total_results": total_results,
        "results": results
    }

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get search suggestions as user types"""
    search_term = f"{q}%"
    suggestions = []

    # Get user's categories
    categories = db_session.query(Category.name).filter(
        or_(
            Category.is_system,
            Category.user_id == current_user['user_id']
        ),
        Category.name.ilike(search_term)
    ).limit(3).all()

    for cat in categories:
        suggestions.append({
            "text": cat.name,
            "type": "category"
        })

    # Get merchants
    merchants = db_session.query(Merchant.name).filter(
        Merchant.name.ilike(search_term)
    ).limit(3).all()

    for merch in merchants:
        suggestions.append({
            "text": merch.name,
            "type": "merchant"
        })

    # Get recent transaction descriptions
    user_accounts = [a.id for a in db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()]

    tx_descriptions = db_session.query(
        Transaction.description
    ).filter(
        Transaction.account_id.in_(user_accounts),
        Transaction.description.ilike(search_term),
        Transaction.description.isnot(None)
    ).distinct().limit(3).all()

    for desc in tx_descriptions:
        suggestions.append({
            "text": desc.description,
            "type": "transaction"
        })

    return suggestions[:10]  # Return top 10 suggestions

@router.get("/recent")
async def get_recent_searches(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get user's recent searches (placeholder for now)"""
    # In a real implementation, this would track user's search history
    return {
        "recent_searches": [
            {"query": "Starbucks", "timestamp": datetime.now(UTC), "result_count": 15},
            {"query": "Food & Dining", "timestamp": datetime.now(UTC), "result_count": 42},
            {"query": "Emergency Fund", "timestamp": datetime.now(UTC), "result_count": 1}
        ]
    }
