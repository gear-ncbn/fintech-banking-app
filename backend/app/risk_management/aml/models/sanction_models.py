"""
Sanctions Screening Models

Defines data structures for sanctions list screening and management.
"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class SanctionListType(StrEnum):
    """Types of sanction lists"""
    OFAC_SDN = "ofac_sdn"
    OFAC_CONSOLIDATED = "ofac_consolidated"
    UN_CONSOLIDATED = "un_consolidated"
    EU_CONSOLIDATED = "eu_consolidated"
    UK_HMT = "uk_hmt"
    FATF_HIGH_RISK = "fatf_high_risk"
    PEP_LIST = "pep_list"
    ADVERSE_MEDIA = "adverse_media"
    INTERNAL_WATCHLIST = "internal_watchlist"
    INTERPOL = "interpol"
    FBI_MOST_WANTED = "fbi_most_wanted"


class MatchStatus(StrEnum):
    """Status of a sanctions match"""
    PENDING_REVIEW = "pending_review"
    CONFIRMED_MATCH = "confirmed_match"
    FALSE_POSITIVE = "false_positive"
    POTENTIAL_MATCH = "potential_match"
    ESCALATED = "escalated"


class EntityType(StrEnum):
    """Type of sanctioned entity"""
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"
    VESSEL = "vessel"
    AIRCRAFT = "aircraft"
    PROPERTY = "property"


class SanctionListEntry(BaseModel):
    """Entry in a sanctions list"""
    entry_id: UUID = Field(default_factory=uuid4)
    list_type: SanctionListType
    list_name: str

    # Entity information
    entity_type: EntityType
    primary_name: str
    aliases: list[str] = Field(default_factory=list)

    # Identification
    identifiers: dict[str, str] = Field(default_factory=dict)  # passport, id_number, etc.

    # Location information
    addresses: list[dict[str, str]] = Field(default_factory=list)
    nationalities: list[str] = Field(default_factory=list)
    countries_of_birth: list[str] = Field(default_factory=list)

    # Dates
    date_of_birth: date | None = None
    date_of_birth_range: dict[str, date] | None = None
    place_of_birth: str | None = None

    # Sanction details
    sanction_programs: list[str] = Field(default_factory=list)
    sanction_reasons: list[str] = Field(default_factory=list)
    listing_date: date | None = None

    # Additional information
    remarks: str | None = None
    source_url: str | None = None

    # Metadata
    last_updated: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_active: bool = True


class ScreeningRequest(BaseModel):
    """Request to screen an entity against sanctions lists"""
    request_id: UUID = Field(default_factory=uuid4)

    # Entity to screen
    entity_type: EntityType
    entity_id: str | None = None
    entity_name: str
    aliases: list[str] = Field(default_factory=list)

    # Additional identifiers
    date_of_birth: date | None = None
    nationalities: list[str] = Field(default_factory=list)
    addresses: list[dict[str, str]] = Field(default_factory=list)
    identifiers: dict[str, str] = Field(default_factory=dict)

    # Screening parameters
    lists_to_screen: list[SanctionListType] = Field(default_factory=list)
    match_threshold: float = 0.8
    fuzzy_matching: bool = True

    # Request metadata
    screening_type: str = "standard"  # standard, enhanced, batch
    requested_by: str
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    priority: str = "normal"


class MatchDetail(BaseModel):
    """Details of a potential match"""
    match_id: UUID = Field(default_factory=uuid4)
    list_entry_id: UUID
    list_type: SanctionListType

    # Match quality
    match_score: float = Field(ge=0, le=1)
    match_algorithm: str

    # Field-level matches
    name_match_score: float
    name_match_type: str  # exact, fuzzy, alias
    dob_match: bool = False
    nationality_match: bool = False
    address_match: bool = False
    identifier_matches: list[str] = Field(default_factory=list)

    # Matched entity details
    matched_name: str
    matched_aliases: list[str] = Field(default_factory=list)
    matched_identifiers: dict[str, str] = Field(default_factory=dict)
    sanction_programs: list[str] = Field(default_factory=list)


class ScreeningResult(BaseModel):
    """Result of a sanctions screening"""
    result_id: UUID = Field(default_factory=uuid4)
    request_id: UUID

    # Screened entity
    entity_type: EntityType
    entity_id: str | None = None
    entity_name: str

    # Overall result
    has_matches: bool = False
    match_count: int = 0
    highest_match_score: float = 0.0

    # Individual matches
    matches: list[MatchDetail] = Field(default_factory=list)

    # Lists screened
    lists_screened: list[SanctionListType] = Field(default_factory=list)

    # Processing info
    screening_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    processing_time_ms: int = 0

    # Status
    status: MatchStatus = MatchStatus.PENDING_REVIEW
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None


class MatchReview(BaseModel):
    """Review of a potential sanctions match"""
    review_id: UUID = Field(default_factory=uuid4)
    result_id: UUID
    match_id: UUID

    # Review decision
    decision: MatchStatus
    decision_reason: str

    # Reviewer information
    reviewed_by: str
    reviewed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Supporting evidence
    evidence_notes: str | None = None
    supporting_documents: list[str] = Field(default_factory=list)

    # Escalation
    escalated: bool = False
    escalated_to: str | None = None
    escalation_reason: str | None = None


class SanctionAlert(BaseModel):
    """Alert generated from sanctions screening"""
    alert_id: UUID = Field(default_factory=uuid4)
    screening_result_id: UUID

    # Alert details
    alert_type: str
    severity: str
    status: str = "open"

    # Entity information
    entity_type: EntityType
    entity_id: str | None = None
    entity_name: str

    # Match information
    match_list: SanctionListType
    match_score: float
    matched_name: str
    sanction_programs: list[str] = Field(default_factory=list)

    # Assignment
    assigned_to: str | None = None

    # Resolution
    resolution: str | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    due_date: datetime | None = None


class BatchScreeningJob(BaseModel):
    """Batch screening job"""
    job_id: UUID = Field(default_factory=uuid4)

    # Job details
    job_name: str
    job_type: str  # customer_refresh, transaction_screening, new_list_import

    # Scope
    total_entities: int = 0
    lists_to_screen: list[SanctionListType] = Field(default_factory=list)

    # Progress
    entities_processed: int = 0
    matches_found: int = 0
    errors_count: int = 0

    # Status
    status: str = "pending"  # pending, running, completed, failed
    started_at: datetime | None = None
    completed_at: datetime | None = None

    # Configuration
    match_threshold: float = 0.8
    parallel_workers: int = 4

    # Created by
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SanctionListUpdate(BaseModel):
    """Update to a sanctions list"""
    update_id: UUID = Field(default_factory=uuid4)
    list_type: SanctionListType

    # Update details
    update_type: str  # full_refresh, incremental
    source_url: str
    source_date: datetime

    # Statistics
    total_entries: int = 0
    new_entries: int = 0
    modified_entries: int = 0
    removed_entries: int = 0

    # Processing
    processed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    processing_time_seconds: int = 0
    errors: list[str] = Field(default_factory=list)

    # Status
    status: str = "completed"
    applied: bool = True


class WatchlistEntry(BaseModel):
    """Internal watchlist entry"""
    entry_id: UUID = Field(default_factory=uuid4)

    # Entity information
    entity_type: EntityType
    entity_name: str
    aliases: list[str] = Field(default_factory=list)
    identifiers: dict[str, str] = Field(default_factory=dict)

    # Watchlist details
    reason: str
    risk_level: str
    added_by: str
    added_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Validity
    valid_from: datetime = Field(default_factory=lambda: datetime.now(UTC))
    valid_until: datetime | None = None
    is_active: bool = True

    # Review
    last_reviewed: datetime | None = None
    reviewed_by: str | None = None
    next_review: datetime | None = None

    # Notes
    notes: str | None = None
    related_case_ids: list[UUID] = Field(default_factory=list)
