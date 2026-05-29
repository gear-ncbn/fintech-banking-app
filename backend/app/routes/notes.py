from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from ..models import Note, User
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user


# Request/Response models
class NoteCreate(BaseModel):
    title: str
    content: str
    tags: list[str] | None = []
    is_encrypted: bool = False
    related_account_id: int | None = None
    related_transaction_id: int | None = None

class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    is_encrypted: bool | None = None

class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    tags: list[str]
    is_encrypted: bool
    related_account_id: int | None
    related_transaction_id: int | None
    created_at: datetime
    updated_at: datetime | None

router = APIRouter()

@router.get("", response_model=list[NoteResponse])
async def get_notes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str | None = Query(None),
    tag: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all notes for the current user with optional filtering"""

    # Base query for user's notes
    query = db_session.query(Note).filter(Note.user_id == current_user.id)

    # Apply search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Note.title.ilike(search_pattern)) |
            (Note.content.ilike(search_pattern))
        )

    # Apply tag filter if provided
    if tag:
        query = query.filter(Note.tags.contains([tag]))

    # Get total count before pagination
    query.count()

    # Apply pagination and get results
    return query.offset(skip).limit(limit).all()


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get a specific note by ID"""

    note = db_session.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    return note

@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_data: NoteCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new note"""

    # Create new note
    new_note = Note(
        user_id=current_user.id,
        title=note_data.title,
        content=note_data.content,
        tags=note_data.tags,
        is_encrypted=note_data.is_encrypted
    )

    db_session.add(new_note)
    db_session.commit()
    db_session.refresh(new_note)


    # Add related fields for response
    new_note.related_account_id = note_data.related_account_id
    new_note.related_transaction_id = note_data.related_transaction_id

    return new_note

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update an existing note"""

    # Get existing note
    note = db_session.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Update fields if provided
    update_data = note_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)

    note.updated_at = datetime.now(UTC)

    db_session.commit()
    db_session.refresh(note)

    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete a note"""

    # Get existing note
    note = db_session.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Store note info for logging

    # Delete the note
    db_session.delete(note)
    db_session.commit()


@router.get("/tags/all", response_model=list[str])
async def get_all_tags(
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all unique tags used by the current user"""

    # Get all notes for the user
    notes = db_session.query(Note).filter(Note.user_id == current_user.id).all()

    # Extract unique tags
    all_tags = set()
    for note in notes:
        if note.tags:
            all_tags.update(note.tags)

    return sorted(all_tags)
