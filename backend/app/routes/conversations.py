from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..models import Conversation, ConversationParticipant, DirectMessage, User
from ..storage.memory_adapter import and_, db, desc, or_
from ..utils.auth import get_current_user

router = APIRouter()

def get_or_create_conversation(db_session: Any, user1_id: int, user2_id: int) -> Conversation:
    """Get or create a conversation between two users"""
    # Sort IDs to ensure consistent conversation lookup
    participant_ids = sorted([user1_id, user2_id])

    # Look for existing conversation by checking participants
    conversations = db_session.query(Conversation).filter(
        not Conversation.is_group
    ).all()

    for conv in conversations:
        # Get participants for this conversation
        participants = db_session.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conv.id
        ).all()

        conv_participant_ids = sorted([p.user_id for p in participants])
        if conv_participant_ids == participant_ids:
            return conv

    # Create new conversation
    conversation = Conversation(
        is_group=False,
        created_by_id=user1_id,
        created_at=datetime.now(UTC)
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)

    # Add participants
    for user_id in [user1_id, user2_id]:
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=user_id,
            is_admin=False,
            joined_at=datetime.now(UTC)
        )
        db_session.add(participant)

    db_session.commit()

    return conversation

@router.get("", response_model=list[dict[str, Any]])
async def get_conversations(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all conversations for the current user"""
    # Find all conversations where user is a participant
    participant_convs = db_session.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user['user_id']
    ).all()

    user_conversations = []
    for part in participant_convs:
        conv = db_session.query(Conversation).filter(
            Conversation.id == part.conversation_id
        ).first()

        if not conv or conv.is_group:
            continue

        # Get the other participant
        other_participant = db_session.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.user_id != current_user['user_id']
        ).first()

        if not other_participant:
            continue

        other_user = db_session.query(User).filter(User.id == other_participant.user_id).first()

        if not other_user:
            continue

        # Get last message
        last_message = db_session.query(DirectMessage).filter(
            or_(
                and_(
                    DirectMessage.sender_id == current_user['user_id'],
                    DirectMessage.recipient_id == other_user.id
                ),
                and_(
                    DirectMessage.sender_id == other_user.id,
                    DirectMessage.recipient_id == current_user['user_id']
                )
            ),
                not DirectMessage.is_draft
            ).order_by(desc(DirectMessage.sent_at)).first()

        # Count unread messages
        unread_count = db_session.query(DirectMessage).filter(
            DirectMessage.sender_id == other_user.id,
            DirectMessage.recipient_id == current_user['user_id'],
            not DirectMessage.is_read,
            not DirectMessage.deleted_by_recipient
        ).count()

        user_conversations.append({
            "id": conv.id,
            "other_user": {
                "id": other_user.id,
                "username": other_user.username,
                "full_name": other_user.full_name
            },
            "last_message": {
                "id": last_message.id,
                "message": last_message.message[:100] + "..." if len(last_message.message) > 100 else last_message.message,
                "sent_at": last_message.sent_at,
                "is_from_me": last_message.sender_id == current_user['user_id']
            } if last_message else None,
            "unread_count": unread_count,
            "last_message_at": last_message.sent_at.isoformat() if last_message else conv.created_at.isoformat()
        })

    # Sort by last message time
    user_conversations.sort(key=lambda x: x['last_message_at'] or datetime.min, reverse=True)

    return user_conversations

@router.get("/{user_id}/messages", response_model=list[dict[str, Any]])
async def get_conversation_messages(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get messages in a conversation with a specific user"""
    # Verify the other user exists
    other_user = db_session.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get or create conversation
    get_or_create_conversation(db_session, current_user['user_id'], user_id)

    # Get messages
    messages = db_session.query(DirectMessage).filter(
        or_(
            and_(
                DirectMessage.sender_id == current_user['user_id'],
                DirectMessage.recipient_id == user_id,
                not DirectMessage.deleted_by_sender
            ),
            and_(
                DirectMessage.sender_id == user_id,
                DirectMessage.recipient_id == current_user['user_id'],
                not DirectMessage.deleted_by_recipient
            )
        ),
        not DirectMessage.is_draft
    ).order_by(desc(DirectMessage.sent_at)).offset(offset).limit(limit).all()

    # Mark messages as read
    unread_messages = [m for m in messages if m.recipient_id == current_user['user_id'] and not m.is_read]
    for msg in unread_messages:
        msg.is_read = True
        msg.read_at = datetime.now(UTC)

    if unread_messages:
        db_session.commit()

    # Format messages
    formatted_messages = []
    for msg in messages:
        formatted_msg = {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "message": msg.message,
            "message_type": msg.message_type,
            "metadata": msg.metadata,
            "is_read": msg.is_read,
            "read_at": msg.read_at,
            "sent_at": msg.sent_at,
            "is_from_me": msg.sender_id == current_user['user_id']
        }

        # Add transaction details if it's a transaction message
        if msg.message_type == 'transaction' and msg.metadata:
            formatted_msg["transaction_details"] = msg.metadata

        formatted_messages.append(formatted_msg)

    # Reverse to show oldest first in conversation view
    formatted_messages.reverse()

    return formatted_messages

@router.post("/{user_id}/mark-read")
async def mark_conversation_read(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Mark all messages in a conversation as read"""
    # Update all unread messages from this user
    updated = db_session.query(DirectMessage).filter(
        DirectMessage.sender_id == user_id,
        DirectMessage.recipient_id == current_user['user_id'],
        not DirectMessage.is_read
    ).update({
        'is_read': True,
        'read_at': datetime.now(UTC)
    }, synchronize_session=False)

    db_session.commit()

    return {"messages_marked_read": updated}

@router.get("/unread-count")
async def get_total_unread_count(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get total unread message count across all conversations"""
    unread_count = db_session.query(DirectMessage).filter(
        DirectMessage.recipient_id == current_user['user_id'],
        not DirectMessage.is_read,
        not DirectMessage.deleted_by_recipient,
        not DirectMessage.is_draft
    ).count()

    return {"unread_count": unread_count}
