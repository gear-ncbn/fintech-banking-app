from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from ..models import (
    Goal,
    GoalContribute,
    GoalContribution,
    GoalCreate,
    GoalResponse,
    GoalSummary,
    GoalUpdate,
)
from ..models.enums import GoalStatus
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.validators import ValidationError, Validators

router = APIRouter()

@router.get("/debug")
async def debug_goals():
    """Debug endpoint to verify correct router is loaded"""
    from ..repositories.data_manager import data_manager
    return {
        "message": "This is the real goals router",
        "total_goals": len(data_manager.goals),
        "file": __file__
    }

def calculate_goal_progress(goal: Goal) -> float:
    """Calculate goal progress percentage"""
    if goal.target_amount <= 0:
        return 0.0
    return min((goal.current_amount / goal.target_amount) * 100, 100.0)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(
    request: Request,
    goal_data: GoalCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new financial goal"""
    try:

        # Log incoming request data

        # Validate account if linked
        if goal_data.account_id:
            Validators.validate_account_ownership(
                db_session,
                goal_data.account_id,
                current_user['user_id']
            )

        # Validate allocation rules if account is linked
        if goal_data.account_id and goal_data.auto_allocate_percentage:
            from ..services.goal_update_service import GoalUpdateService
            validation = GoalUpdateService.validate_allocation_rules(
                db_session,
                goal_data.account_id,
                None,  # No existing goal ID for new goal
                goal_data.auto_allocate_percentage
            )
            if not validation['is_valid']:
                raise ValidationError(validation['message'])

        # Create goal
        initial_amount = goal_data.initial_amount or 0.0
        new_goal = Goal(
            user_id=current_user['user_id'],
            name=goal_data.name,
            description=goal_data.description,
            target_amount=goal_data.target_amount,
            current_amount=initial_amount,
            target_date=goal_data.target_date,
            category=goal_data.category or 'other',
            priority=goal_data.priority or 'medium',
            status=GoalStatus.ACTIVE.value,
            account_id=goal_data.account_id,
            auto_transfer_amount=goal_data.auto_transfer_amount,
            auto_transfer_frequency=goal_data.auto_transfer_frequency,
            # New allocation fields
            auto_allocate_percentage=goal_data.auto_allocate_percentage,
            auto_allocate_fixed_amount=goal_data.auto_allocate_fixed_amount,
            allocation_priority=goal_data.allocation_priority or 1,
            allocation_source_types=goal_data.allocation_source_types or ['income', 'deposit']
        )

        db_session.add(new_goal)
        db_session.commit()

        db_session.refresh(new_goal)

        # Log goal creation
        # Get values safely with proper None handling
        str(getattr(new_goal, 'id', 'unknown'))
        getattr(new_goal, 'name', 'Unknown Goal') or 'Unknown Goal'
        target_amount_val = getattr(new_goal, 'target_amount', None)
        float(target_amount_val) if target_amount_val is not None else 0.0
        target_date = getattr(new_goal, 'target_date', None)
        target_date.isoformat() if target_date else "No target date"

        # Create response
        response = GoalResponse.model_validate(new_goal)
        response.progress_percentage = calculate_goal_progress(new_goal)

        return response
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("", response_model=list[GoalResponse])
async def get_goals(
    status: GoalStatus | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all user goals"""
    query = db_session.query(Goal).filter(Goal.user_id == current_user['user_id'])

    if status:
        query = query.filter(Goal.status == status)

    goals = query.order_by(Goal.created_at.desc()).all()

    results = []
    for goal in goals:
        response = GoalResponse.model_validate(goal)
        response.progress_percentage = calculate_goal_progress(goal)
        results.append(response)

    return results

@router.get("/summary", response_model=GoalSummary)
async def get_goals_summary(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get summary of all goals"""
    goals = db_session.query(Goal).filter(
        Goal.user_id == current_user['user_id']
    ).all()

    total_goals = len(goals)
    active_goals = sum(1 for g in goals if g.status == GoalStatus.ACTIVE.value)
    completed_goals = sum(1 for g in goals if g.status == GoalStatus.COMPLETED.value)
    total_target = sum(g.target_amount for g in goals)
    total_saved = sum(g.current_amount for g in goals)

    goal_responses = []
    for goal in goals:
        response = GoalResponse.model_validate(goal)
        response.progress_percentage = calculate_goal_progress(goal)
        goal_responses.append(response)

    overall_progress = round((total_saved / total_target * 100), 2) if total_target > 0 else 0.0

    return GoalSummary(
        total_goals=total_goals,
        active_goals=active_goals,
        completed_goals=completed_goals,
        total_target=round(total_target, 2),
        total_saved=round(total_saved, 2),
        overall_progress=overall_progress,
        goals=goal_responses
    )

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get specific goal details"""
    goal = db_session.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user['user_id']
    ).first()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    response = GoalResponse.model_validate(goal)
    response.progress_percentage = calculate_goal_progress(goal)

    return response

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    request: Request,
    goal_id: int,
    update_data: GoalUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update goal details"""
    try:

        # Log incoming request data

        goal = db_session.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == current_user['user_id']
        ).first()

        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )

        # Validate allocation rules if updating percentage allocation
        if 'auto_allocate_percentage' in update_data.model_dump(exclude_unset=True) and goal.account_id:
            from ..services.goal_update_service import GoalUpdateService
            validation = GoalUpdateService.validate_allocation_rules(
                db_session,
                goal.account_id,
                goal_id,
                update_data.auto_allocate_percentage
            )
            if not validation['is_valid']:
                raise ValidationError(validation['message'])

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(goal, field) and value is not None:
                setattr(goal, field, value)

        # Check if goal is completed
        if goal.current_amount >= goal.target_amount and goal.status == GoalStatus.ACTIVE.value:
            goal.status = GoalStatus.COMPLETED.value
            goal.completed_at = datetime.now(UTC)

        goal.updated_at = datetime.now(UTC)
        db_session.commit()
        db_session.refresh(goal)

        response = GoalResponse.model_validate(goal)
        response.progress_percentage = calculate_goal_progress(goal)

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update goal. Please try again.") from e

@router.post("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    request: Request,
    goal_id: int,
    contribution: GoalContribute,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Add contribution to a goal"""

    goal = db_session.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user['user_id']
    ).first()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    if goal.status != GoalStatus.ACTIVE.value:
        raise ValidationError("Can only contribute to active goals")

    # Create contribution record
    new_contribution = GoalContribution(
        goal_id=goal_id,
        amount=contribution.amount,
        contribution_date=datetime.now(UTC),
        notes=contribution.notes
    )

    # Update goal current amount
    goal.current_amount += contribution.amount

    # Check if goal is completed
    if goal.current_amount >= goal.target_amount:
        goal.status = GoalStatus.COMPLETED.value
        goal.completed_at = datetime.now(UTC)

    db_session.add(new_contribution)
    db_session.commit()
    db_session.refresh(goal)

    response = GoalResponse.model_validate(goal)
    response.progress_percentage = calculate_goal_progress(goal)

    return response

@router.get("/{goal_id}/contributions")
async def get_goal_contributions(
    goal_id: int,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get contribution history for a goal"""
    goal = db_session.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user['user_id']
    ).first()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    contributions = db_session.query(GoalContribution).filter(
        GoalContribution.goal_id == goal_id
    ).order_by(GoalContribution.contribution_date.desc()).limit(limit).all()

    return {
        "goal_id": goal_id,
        "goal_name": goal.name,
        "contributions": [c.to_dict() for c in contributions]
    }

@router.delete("/{goal_id}")
async def delete_goal(
    request: Request,
    goal_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete (cancel) a goal"""

    goal = db_session.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user['user_id']
    ).first()

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    # Cancel instead of hard delete
    goal.status = GoalStatus.CANCELLED.value
    goal.updated_at = datetime.now(UTC)
    db_session.commit()

    return {"message": "Goal cancelled successfully"}

@router.get("/allocation-summary/{account_id}")
async def get_allocation_summary(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get automatic allocation summary for an account"""
    # Validate account ownership
    Validators.validate_account_ownership(
        db_session,
        account_id,
        current_user['user_id']
    )

    from ..services.goal_update_service import GoalUpdateService
    return GoalUpdateService.get_allocation_summary(db_session, account_id)

