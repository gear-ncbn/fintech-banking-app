from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from ..models import Contact, ContactCreate, ContactResponse, ContactStatus, ContactStatusUpdate, ContactUpdate, User
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.validators import ValidationError

router = APIRouter()

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact_request(
    request: Request,
    contact_data: ContactCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Send a contact request to another user"""

    # Validate contact user exists
    contact_user = db_session.query(User).filter(User.id == contact_data.contact_id).first()
    if not contact_user:
        raise ValidationError("User not found")

    # Check if trying to add self
    if contact_data.contact_id == current_user['user_id']:
        raise ValidationError("Cannot add yourself as a contact")

    # Check if contact already exists
    existing = db_session.query(Contact).filter(
        ((Contact.user_id == current_user['user_id']) & (Contact.contact_id == contact_data.contact_id)) |
        ((Contact.user_id == contact_data.contact_id) & (Contact.contact_id == current_user['user_id']))
    ).first()

    if existing:
        raise ValidationError("Contact relationship already exists")

    # Create contact request
    new_contact = Contact(
        user_id=current_user['user_id'],
        contact_id=contact_data.contact_id,
        status=ContactStatus.PENDING,
        nickname=contact_data.nickname
    )

    db_session.add(new_contact)
    db_session.flush()

    # Create notification for contact request
    from ..models import Notification, NotificationType
    notification = Notification(
        user_id=contact_data.contact_id,
        type=NotificationType.CONTACT_REQUEST,
        title="New Contact Request",
        message=f"{current_user['username']} wants to add you as a contact",
        action_url="/contacts/requests",
        metadata={
            "contact_request_id": new_contact.id,
            "requester_id": current_user['user_id'],
            "requester_username": current_user['username']
        }
    )
    db_session.add(notification)
    db_session.commit()
    db_session.refresh(new_contact)

    # Log contact request

    # Prepare response with contact info
    response = ContactResponse.model_validate(new_contact)
    response.contact_username = contact_user.username
    response.contact_email = contact_user.email

    return response

@router.get("", response_model=list[ContactResponse])
async def get_contacts(
    status: ContactStatus | None = None,
    include_pending: bool = True,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all contacts for the current user"""
    # Get contacts where user is either the requester or the recipient
    query = db_session.query(Contact).filter(
        (Contact.user_id == current_user['user_id']) |
        (Contact.contact_id == current_user['user_id'])
    )

    if status:
        query = query.filter(Contact.status == status)
    elif not include_pending:
        query = query.filter(Contact.status != ContactStatus.PENDING)

    contacts = query.all()

    results = []
    for contact in contacts:
        # Determine which user is the contact
        if contact.user_id == current_user['user_id']:
            contact_user = db_session.query(User).filter(User.id == contact.contact_id).first()
            response = ContactResponse.model_validate(contact)
        else:
            # Swap perspective for received requests
            contact_user = db_session.query(User).filter(User.id == contact.user_id).first()
            response = ContactResponse(
                id=contact.id,
                user_id=contact.contact_id,
                contact_id=contact.user_id,
                status=contact.status,
                nickname=None,  # Nickname is set by requester
                is_favorite=False,
                created_at=contact.created_at,
                updated_at=contact.updated_at
            )

        if contact_user:
            response.contact_username = contact_user.username
            response.contact_email = contact_user.email

        results.append(response)

    return results

@router.get("/requests/pending")
async def get_pending_requests(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get pending contact requests (both sent and received)"""
    # Sent requests
    sent = db_session.query(Contact).filter(
        Contact.user_id == current_user['user_id'],
        Contact.status == ContactStatus.PENDING
    ).all()

    # Received requests
    received = db_session.query(Contact).filter(
        Contact.contact_id == current_user['user_id'],
        Contact.status == ContactStatus.PENDING
    ).all()

    sent_list = []
    for contact in sent:
        user = db_session.query(User).filter(User.id == contact.contact_id).first()
        sent_list.append({
            "id": contact.id,
            "contact_id": contact.contact_id,
            "username": user.username if user else None,
            "email": user.email if user else None,
            "created_at": contact.created_at
        })

    received_list = []
    for contact in received:
        user = db_session.query(User).filter(User.id == contact.user_id).first()
        received_list.append({
            "id": contact.id,
            "contact_id": contact.user_id,
            "username": user.username if user else None,
            "email": user.email if user else None,
            "created_at": contact.created_at
        })

    return {
        "sent_requests": sent_list,
        "received_requests": received_list
    }

@router.put("/{contact_id}/status", response_model=ContactResponse)
async def update_contact_status(
    request: Request,
    contact_id: int,
    status_update: ContactStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Accept or reject a contact request"""

    # Find contact request where current user is the recipient
    contact = db_session.query(Contact).filter(
        Contact.id == contact_id,
        Contact.contact_id == current_user['user_id']
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact request not found"
        )

    if contact.status != ContactStatus.PENDING:
        raise ValidationError("Can only update pending requests")

    # Update status
    contact.status = status_update.status
    contact.updated_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(contact)

    # Get requester info
    requester = db_session.query(User).filter(User.id == contact.user_id).first()

    # Log status update

    # Prepare response
    response = ContactResponse(
        id=contact.id,
        user_id=contact.contact_id,
        contact_id=contact.user_id,
        status=contact.status,
        nickname=None,
        is_favorite=contact.is_favorite,
        created_at=contact.created_at,
        updated_at=contact.updated_at
    )

    if requester:
        response.contact_username = requester.username
        response.contact_email = requester.email

    return response

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    request: Request,
    contact_id: int,
    update_data: ContactUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update contact details (nickname, favorite status)"""

    # Find contact where current user is the owner
    contact = db_session.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == current_user['user_id']
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    # Update fields
    if update_data.nickname is not None:
        contact.nickname = update_data.nickname

    if update_data.is_favorite is not None:
        contact.is_favorite = update_data.is_favorite

    contact.updated_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(contact)

    # Get contact user info
    contact_user = db_session.query(User).filter(User.id == contact.contact_id).first()

    # Prepare response
    response = ContactResponse.model_validate(contact)
    if contact_user:
        response.contact_username = contact_user.username
        response.contact_email = contact_user.email

    return response

@router.delete("/{contact_id}")
async def remove_contact(
    request: Request,
    contact_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Remove a contact relationship"""

    # Find contact where user is either party
    contact = db_session.query(Contact).filter(
        Contact.id == contact_id,
        ((Contact.user_id == current_user['user_id']) |
         (Contact.contact_id == current_user['user_id']))
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    # Delete contact
    db_session.delete(contact)
    db_session.commit()

    # Log deletion

    return {"message": "Contact removed successfully"}

@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2),
    exclude_contacts: bool = True,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Search for users to add as contacts"""
    try:
        # Get all users first
        all_users = db_session.query(User).filter(
            User.id != current_user['user_id'],
            User.is_active
        ).all()

        # Filter by search term in Python
        search_term = q.lower()
        matching_users = [
            user for user in all_users
            if (search_term in user.username.lower() or
                search_term in user.email.lower())
        ]

        if exclude_contacts:
            # Get existing contact IDs
            existing_contacts = db_session.query(Contact).all()

            contact_ids = set()
            for c in existing_contacts:
                if c.user_id == current_user['user_id']:
                    contact_ids.add(c.contact_id)
                elif c.contact_id == current_user['user_id']:
                    contact_ids.add(c.user_id)

            # Filter out existing contacts
            matching_users = [
                user for user in matching_users
                if user.id not in contact_ids
            ]

        # Limit results
        matching_users = matching_users[:10]

        # Filter by privacy settings
        searchable_users = []
        for user in matching_users:
            privacy_settings = user.privacy_settings or {'searchable': True}
            if privacy_settings.get('searchable', True):
                searchable_users.append({
                    "id": user.id,
                    "username": user.username,
                    "email": user.email if privacy_settings.get('show_email', False) else None,
                    "first_name": user.first_name if privacy_settings.get('show_full_name', True) else None,
                    "last_name": user.last_name if privacy_settings.get('show_full_name', True) else None
                })

        return searchable_users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {e!s}"
        ) from None
