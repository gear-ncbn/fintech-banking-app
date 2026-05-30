"""
Watchlist Models

Defines data structures for internal and external watchlist management.
"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class WatchlistType(StrEnum):
    """Types of watchlists"""
    INTERNAL = "internal"
    EXTERNAL = "external"
    REGULATORY = "regulatory"
    LAW_ENFORCEMENT = "law_enforcement"
    INDUSTRY = "industry"


class WatchlistCategory(StrEnum):
    """Categories of watchlist entries"""
    HIGH_RISK = "high_risk"
    SUSPICIOUS = "suspicious"
    FRAUD = "fraud"
    SANCTIONS = "sanctions"
    PEP = "pep"
    ADVERSE_MEDIA = "adverse_media"
    TERRORIST = "terrorist"
    CRIMINAL = "criminal"
    DO_NOT_ONBOARD = "do_not_onboard"
    MONITOR_CLOSELY = "monitor_closely"
    EXITED = "exited"


class EntityIdentifier(BaseModel):
    """Entity identifier for matching"""
    identifier_type: str  # ssn, ein, passport, account_number, phone, email
    identifier_value: str
    issuing_country: str | None = None
    is_primary: bool = False


class WatchlistEntry(BaseModel):
    """Entry in a watchlist"""
    entry_id: UUID = Field(default_factory=uuid4)
    watchlist_id: UUID

    # Entity information
    entity_type: str  # individual, organization
    primary_name: str
    aliases: list[str] = Field(default_factory=list)
    identifiers: list[EntityIdentifier] = Field(default_factory=list)

    # Personal details (for individuals)
    date_of_birth: date | None = None
    nationalities: list[str] = Field(default_factory=list)
    countries_of_residence: list[str] = Field(default_factory=list)

    # Organization details
    registration_number: str | None = None
    incorporation_country: str | None = None

    # Category and risk
    category: WatchlistCategory
    risk_level: str = "high"
    risk_score: float = 0.0

    # Reason
    reason: str
    reason_code: str | None = None
    evidence_summary: str | None = None

    # Source
    source: str
    source_reference: str | None = None
    source_date: datetime | None = None

    # Related records
    related_case_ids: list[UUID] = Field(default_factory=list)
    related_alert_ids: list[UUID] = Field(default_factory=list)
    related_customer_ids: list[str] = Field(default_factory=list)

    # Status
    is_active: bool = True
    status: str = "active"  # active, inactive, under_review, removed

    # Review information
    last_reviewed_by: str | None = None
    last_reviewed_at: datetime | None = None
    next_review_date: date | None = None

    # Validity
    effective_from: datetime = Field(default_factory=lambda: datetime.now(UTC))
    effective_until: datetime | None = None

    # Created/Updated
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_by: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Notes
    notes: str | None = None
    internal_notes: str | None = None

    # Metadata
    metadata: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class Watchlist(BaseModel):
    """Watchlist definition"""
    watchlist_id: UUID = Field(default_factory=uuid4)
    watchlist_name: str
    watchlist_code: str
    watchlist_type: WatchlistType
    description: str

    # Configuration
    default_category: WatchlistCategory
    auto_alert: bool = True
    alert_severity: str = "high"

    # Access control
    owner_team: str
    view_teams: list[str] = Field(default_factory=list)
    edit_teams: list[str] = Field(default_factory=list)

    # Screening configuration
    include_in_screening: bool = True
    screening_priority: int = 1
    match_threshold: float = 0.8

    # Statistics
    entry_count: int = 0
    active_entry_count: int = 0

    # External source
    is_external: bool = False
    external_source_url: str | None = None
    last_sync_date: datetime | None = None
    sync_frequency_hours: int = 24

    # Status
    is_active: bool = True

    # Timestamps
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class WatchlistMatch(BaseModel):
    """Match result when screening against watchlists"""
    match_id: UUID = Field(default_factory=uuid4)

    # What was screened
    screened_entity_type: str
    screened_entity_id: str
    screened_entity_name: str
    screened_identifiers: list[EntityIdentifier] = Field(default_factory=list)

    # Matched entry
    watchlist_id: UUID
    watchlist_name: str
    entry_id: UUID
    entry_name: str
    entry_category: WatchlistCategory

    # Match quality
    match_score: float
    match_type: str  # exact, fuzzy, partial
    matching_fields: list[str] = Field(default_factory=list)

    # Field-level scores
    name_score: float = 0.0
    identifier_score: float = 0.0
    dob_match: bool = False
    nationality_match: bool = False

    # Status
    status: str = "pending"  # pending, confirmed, false_positive, escalated
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None

    # Alert linkage
    alert_id: UUID | None = None
    case_id: UUID | None = None

    # Timestamps
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class WatchlistScreeningRequest(BaseModel):
    """Request to screen against watchlists"""
    request_id: UUID = Field(default_factory=uuid4)

    # Entity to screen
    entity_type: str
    entity_id: str | None = None
    entity_name: str
    aliases: list[str] = Field(default_factory=list)
    identifiers: list[EntityIdentifier] = Field(default_factory=list)

    # Additional information
    date_of_birth: date | None = None
    nationalities: list[str] = Field(default_factory=list)

    # Screening parameters
    watchlist_ids: list[UUID] | None = None  # None = all active
    match_threshold: float = 0.8
    include_inactive: bool = False

    # Request metadata
    screening_type: str = "real_time"  # real_time, batch, periodic
    requested_by: str
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class WatchlistScreeningResult(BaseModel):
    """Result of watchlist screening"""
    result_id: UUID = Field(default_factory=uuid4)
    request_id: UUID

    # Screened entity
    entity_type: str
    entity_id: str | None = None
    entity_name: str

    # Results
    has_matches: bool = False
    match_count: int = 0
    highest_match_score: float = 0.0
    matches: list[WatchlistMatch] = Field(default_factory=list)

    # Lists screened
    watchlists_screened: int = 0
    entries_screened: int = 0

    # Processing
    screening_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    processing_time_ms: int = 0

    # Actions taken
    alerts_generated: int = 0
    alert_ids: list[UUID] = Field(default_factory=list)


class WatchlistImport(BaseModel):
    """Watchlist import record"""
    import_id: UUID = Field(default_factory=uuid4)
    watchlist_id: UUID

    # Import source
    source_type: str  # file, api, database
    source_name: str
    source_reference: str | None = None

    # Statistics
    total_records: int = 0
    imported_records: int = 0
    updated_records: int = 0
    failed_records: int = 0
    duplicate_records: int = 0

    # Errors
    errors: list[dict[str, Any]] = Field(default_factory=list)

    # Status
    status: str = "pending"  # pending, processing, completed, failed
    started_at: datetime | None = None
    completed_at: datetime | None = None

    # Created by
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class WatchlistAuditLog(BaseModel):
    """Audit log for watchlist changes"""
    audit_id: UUID = Field(default_factory=uuid4)
    watchlist_id: UUID
    entry_id: UUID | None = None

    # Action
    action: str  # create, update, delete, review, activate, deactivate
    action_details: str

    # Changes
    previous_values: dict[str, Any] | None = None
    new_values: dict[str, Any] | None = None

    # Actor
    performed_by: str
    performed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Context
    reason: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None


class WatchlistStatistics(BaseModel):
    """Watchlist statistics"""
    total_watchlists: int = 0
    total_entries: int = 0
    active_entries: int = 0
    by_type: dict[str, int] = Field(default_factory=dict)
    by_category: dict[str, int] = Field(default_factory=dict)
    matches_this_month: int = 0
    false_positive_rate: float = 0.0
    pending_review: int = 0
    entries_added_this_month: int = 0
    entries_removed_this_month: int = 0
