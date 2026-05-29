from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import Account, Category, CategoryCreate, CategoryResponse, CategoryUpdate, Transaction
from ..storage.memory_adapter import ORClause, db
from ..utils.auth import get_current_user
from ..utils.validators import ValidationError, sanitize_string

router = APIRouter()

@router.get("", response_model=list[CategoryResponse])
async def get_categories(
    include_system: bool = True,
    income_only: bool | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all categories (system and user-specific)"""
    query = db_session.query(Category)

    # Filter by ownership
    if include_system:
        query = query.filter(
            ORClause(Category.is_system == True, Category.user_id == current_user['user_id'])  # noqa: E712
        )
    else:
        query = query.filter(Category.user_id == current_user['user_id'])

    # Filter by income/expense
    if income_only is not None:
        query = query.filter(Category.is_income == income_only)

    # Order by system first, then by name
    categories = query.order_by(
        Category.is_system.desc(),
        Category.is_income.desc(),
        Category.name
    ).all()

    return [CategoryResponse.model_validate(cat) for cat in categories]

@router.get("/system", response_model=list[CategoryResponse])
async def get_system_categories(
    income_only: bool | None = None,
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get only system-defined categories"""
    query = db_session.query(Category).filter(Category.is_system)

    if income_only is not None:
        query = query.filter(Category.is_income == income_only)

    categories = query.order_by(Category.is_income.desc(), Category.name).all()

    return [CategoryResponse.model_validate(cat) for cat in categories]

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: Request,
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a custom category"""

    # Sanitize input
    category_name = sanitize_string(category_data.name, 50)

    # Check if category name already exists for this user
    existing = db_session.query(Category).filter(
        Category.user_id == current_user['user_id'],
        Category.name == category_name
    ).first()

    if existing:
        raise ValidationError("Category with this name already exists")

    # Validate parent category if provided
    parent_category = None
    if category_data.parent_id:
        parent_category = db_session.query(Category).filter(
            Category.id == category_data.parent_id,
            ORClause(Category.is_system == True, Category.user_id == current_user['user_id'])  # noqa: E712
        ).first()

        if not parent_category:
            raise ValidationError("Parent category not found or access denied")

        # Ensure income/expense type matches parent
        if parent_category.is_income != category_data.is_income:
            raise ValidationError(
                "Category type (income/expense) must match parent category"
            )

    # Create new category
    new_category = Category(
        user_id=current_user['user_id'],
        name=category_name,
        parent_id=category_data.parent_id,
        icon=category_data.icon,
        color=category_data.color,
        is_income=category_data.is_income,
        is_system=False
    )

    db_session.add(new_category)
    db_session.commit()
    db_session.refresh(new_category)

    # Log category creation

    return CategoryResponse.model_validate(new_category)

@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get specific category details"""
    category = db_session.query(Category).filter(
        Category.id == category_id,
        ORClause(Category.is_system == True, Category.user_id == current_user['user_id'])  # noqa: E712
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return CategoryResponse.model_validate(category)

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    request: Request,
    category_id: int,
    update_data: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update custom category"""

    # Get category and verify ownership
    category = db_session.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user['user_id'],
        not Category.is_system
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be modified"
        )

    # Update allowed fields
    if update_data.name is not None:
        new_name = sanitize_string(update_data.name, 50)

        # Check if name already exists
        existing = db_session.query(Category).filter(
            Category.user_id == current_user['user_id'],
            Category.name == new_name,
            Category.id != category_id
        ).first()

        if existing:
            raise ValidationError("Category with this name already exists")

        category.name = new_name

    if update_data.icon is not None:
        category.icon = update_data.icon

    if update_data.color is not None:
        category.color = update_data.color

    if update_data.parent_id is not None:
        if update_data.parent_id:
            # Validate parent category
            parent = db_session.query(Category).filter(
                Category.id == update_data.parent_id,
                ORClause(Category.is_system == True, Category.user_id == current_user['user_id'])  # noqa: E712
            ).first()

            if not parent:
                raise ValidationError("Parent category not found")

            # Ensure not creating circular reference
            if parent.parent_id == category_id:
                raise ValidationError("Cannot create circular category reference")

            # Ensure income/expense type matches
            if parent.is_income != category.is_income:
                raise ValidationError("Category type must match parent category")

        category.parent_id = update_data.parent_id

    category.updated_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(category)

    return CategoryResponse.model_validate(category)

@router.delete("/{category_id}")
async def delete_category(
    request: Request,
    category_id: int,
    reassign_to_category_id: int | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete custom category"""

    # Get category and verify ownership
    category = db_session.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user['user_id'],
        not Category.is_system
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be deleted"
        )

    # Check if category has transactions
    transaction_count = db_session.query(Transaction).filter(
        Transaction.category_id == category_id
    ).count()

    if transaction_count > 0:
        if not reassign_to_category_id:
            raise ValidationError(
                f"Category has {transaction_count} transactions. "
                "Provide reassign_to_category_id to move them to another category"
            )

        # Validate reassignment category
        new_category = db_session.query(Category).filter(
            Category.id == reassign_to_category_id,
            ORClause(Category.is_system == True, Category.user_id == current_user['user_id']),  # noqa: E712
            Category.is_income == category.is_income  # Must be same type
        ).first()

        if not new_category:
            raise ValidationError("Invalid reassignment category")

        # Reassign transactions
        db_session.query(Transaction).filter(
            Transaction.category_id == category_id
        ).update({"category_id": reassign_to_category_id})

    # Check if category has children
    child_count = db_session.query(Category).filter(
        Category.parent_id == category_id
    ).count()

    if child_count > 0:
        # Move children to parent
        db_session.query(Category).filter(
            Category.parent_id == category_id
        ).update({"parent_id": category.parent_id})

    # Delete category
    db_session.delete(category)
    db_session.commit()

    # Log deletion

    return {"message": "Category deleted successfully"}

@router.get("/{category_id}/transactions/count")
async def get_category_transaction_count(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get transaction count for a category"""
    # Verify category access
    category = db_session.query(Category).filter(
        Category.id == category_id,
        ORClause(Category.is_system == True, Category.user_id == current_user['user_id'])  # noqa: E712
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Get user's accounts
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == current_user['user_id']
    ).subquery()

    # Count transactions
    count = db_session.query(Transaction).filter(
        Transaction.category_id == category_id,
        Transaction.account_id.in_(user_accounts)
    ).count()

    return {
        "category_id": category_id,
        "category_name": category.name,
        "transaction_count": count
    }
