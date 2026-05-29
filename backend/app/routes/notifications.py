from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from ..models import Notification, NotificationResponse, NotificationType, NotificationUpdate
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user

router = APIRouter()

@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    is_read: bool | None = None,
    type: NotificationType | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get user notifications"""
    query = db_session.query(Notification).filter(
        Notification.user_id == current_user['user_id']
    )

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    if type:
        query = query.filter(Notification.type == type)

    # Order by newest first
    query = query.order_by(Notification.created_at.desc())

    # Apply pagination
    notifications = query.offset(offset).limit(limit).all()

    return [NotificationResponse.model_validate(n) for n in notifications]

@router.get("/unread/count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get count of unread notifications"""
    count = db_session.query(Notification).filter(
        Notification.user_id == current_user['user_id'],
        not Notification.is_read
    ).count()

    # Count by type
    by_type = {}
    for notif_type in NotificationType:
        type_count = db_session.query(Notification).filter(
            Notification.user_id == current_user['user_id'],
            not Notification.is_read,
            Notification.type == notif_type
        ).count()
        if type_count > 0:
            by_type[notif_type.value] = type_count

    return {
        "total": count,
        "by_type": by_type
    }

@router.put("/{notification_id:int}", response_model=NotificationResponse)
async def update_notification(
    request: Request,
    notification_id: int,
    update_data: NotificationUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Mark notification as read"""

    notification = db_session.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user['user_id']
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    if update_data.is_read and not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(UTC)

        db_session.commit()
        db_session.refresh(notification)

        # Log read

    return NotificationResponse.model_validate(notification)

@router.put("/mark-all-read")
async def mark_all_read(
    request: Request,
    notification_type: NotificationType | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Mark all notifications as read"""

    query = db_session.query(Notification).filter(
        Notification.user_id == current_user['user_id'],
        not Notification.is_read
    )

    if notification_type:
        query = query.filter(Notification.type == notification_type)

    # Update all unread notifications
    count = query.update({
        "is_read": True,
        "read_at": datetime.now(UTC)
    })

    db_session.commit()

    # Log bulk update

    return {"message": f"Marked {count} notifications as read"}

@router.delete("/{notification_id:int}")
async def delete_notification(
    request: Request,
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete a notification"""

    notification = db_session.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user['user_id']
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db_session.delete(notification)
    db_session.commit()

    # Log deletion

    return {"message": "Notification deleted successfully"}

@router.post("/test/{notification_type}")
async def create_test_notification(
    request: Request,
    notification_type: NotificationType,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a test notification (for development/testing)"""

    # Create test notification based on type
    messages = {
        NotificationType.BUDGET_WARNING: {
            "title": "Budget Alert",
            "message": "You've spent 85% of your monthly Food & Dining budget"
        },
        NotificationType.GOAL_MILESTONE: {
            "title": "Goal Achievement",
            "message": "Congratulations! You've reached 50% of your Emergency Fund goal"
        },
        NotificationType.TRANSACTION_ALERT: {
            "title": "Large Transaction",
            "message": "A transaction of $500 was just processed on your account"
        },
        NotificationType.ACCOUNT_UPDATE: {
            "title": "Account Update",
            "message": "Your checking account balance has been updated"
        },
        NotificationType.NEW_MESSAGE: {
            "title": "New Message",
            "message": "You have a new message from Jane Smith"
        },
        NotificationType.CONTACT_REQUEST: {
            "title": "Contact Request",
            "message": "Mike Wilson wants to connect with you"
        }
    }

    notif_data = messages.get(notification_type, {
        "title": "Test Notification",
        "message": f"This is a test {notification_type.value} notification"
    })

    notification = Notification(
        user_id=current_user['user_id'],
        type=notification_type,
        title=notif_data["title"],
        message=notif_data["message"],
        is_read=False
    )

    db_session.add(notification)
    db_session.commit()
    db_session.refresh(notification)

    return NotificationResponse.model_validate(notification)
