"""
Entity Resolution Models

Defines data structures for entity resolution and identity matching.
"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class EntityType(StrEnum):
    """Types of entities"""
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"
    ACCOUNT = "account"
    TRANSACTION = "transaction"


class MatchConfidence(StrEnum):
    """Confidence level of a match"""
    DEFINITE = "definite"
    PROBABLE = "probable"
    POSSIBLE = "possible"
    UNLIKELY = "unlikely"


class ResolutionStatus(StrEnum):
    """Status of entity resolution"""
    PENDING = "pending"
    AUTO_RESOLVED = "auto_resolved"
    MANUALLY_RESOLVED = "manually_resolved"
    REJECTED = "rejected"
    SPLIT = "split"


class IdentityAttribute(BaseModel):
    """Individual identity attribute"""
    attribute_id: UUID = Field(default_factory=uuid4)
    attribute_type: str
    attribute_value: str
    confidence: float = 1.0
    source_system: str
    source_record_id: str
    captured_at: datetime
    is_primary: bool = False
    is_verified: bool = False


class NameVariant(BaseModel):
    """Name variant for an entity"""
    variant_id: UUID = Field(default_factory=uuid4)
    name_type: str  # legal, maiden, alias, trading_name, former
    full_name: str
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    suffix: str | None = None
    prefix: str | None = None
    source_system: str
    confidence: float = 1.0
    is_primary: bool = False


class AddressRecord(BaseModel):
    """Address record for an entity"""
    address_id: UUID = Field(default_factory=uuid4)
    address_type: str  # residential, business, mailing, registered
    address_line1: str
    address_line2: str | None = None
    city: str
    state_province: str | None = None
    postal_code: str | None = None
    country: str
    is_current: bool = True
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    source_system: str
    confidence: float = 1.0


class IdentifierRecord(BaseModel):
    """Identifier record for an entity"""
    identifier_id: UUID = Field(default_factory=uuid4)
    identifier_type: str  # ssn, ein, passport, account, phone, email
    identifier_value: str
    issuing_authority: str | None = None
    issuing_country: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    is_verified: bool = False
    source_system: str
    confidence: float = 1.0


class RelationshipRecord(BaseModel):
    """Relationship between entities"""
    relationship_id: UUID = Field(default_factory=uuid4)
    related_entity_id: UUID
    relationship_type: str  # spouse, child, parent, employer, employee, owner, director
    relationship_role: str  # from perspective of the primary entity
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool = True
    ownership_percentage: float | None = None
    source_system: str
    confidence: float = 1.0


class MasterEntity(BaseModel):
    """Master entity record (golden record)"""
    entity_id: UUID = Field(default_factory=uuid4)
    entity_type: EntityType

    # Resolved name
    primary_name: str
    name_variants: list[NameVariant] = Field(default_factory=list)

    # Demographics (for individuals)
    date_of_birth: date | None = None
    gender: str | None = None
    nationalities: list[str] = Field(default_factory=list)

    # Organization details
    incorporation_date: date | None = None
    incorporation_country: str | None = None
    business_type: str | None = None

    # Addresses
    addresses: list[AddressRecord] = Field(default_factory=list)
    primary_address: AddressRecord | None = None

    # Identifiers
    identifiers: list[IdentifierRecord] = Field(default_factory=list)

    # Relationships
    relationships: list[RelationshipRecord] = Field(default_factory=list)

    # Source records
    source_record_ids: list[str] = Field(default_factory=list)
    source_systems: list[str] = Field(default_factory=list)

    # Data quality
    completeness_score: float = 0.0
    accuracy_score: float = 0.0
    timeliness_score: float = 0.0
    consistency_score: float = 0.0
    overall_quality_score: float = 0.0

    # Risk attributes
    risk_score: float = 0.0
    risk_flags: list[str] = Field(default_factory=list)
    is_pep: bool = False
    is_sanctioned: bool = False
    is_on_watchlist: bool = False

    # Status
    status: str = "active"
    merge_history: list[dict[str, Any]] = Field(default_factory=list)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_resolved_at: datetime | None = None


class SourceRecord(BaseModel):
    """Source record from a system"""
    record_id: str
    source_system: str
    entity_type: EntityType

    # Raw data
    raw_data: dict[str, Any] = Field(default_factory=dict)

    # Extracted attributes
    names: list[NameVariant] = Field(default_factory=list)
    addresses: list[AddressRecord] = Field(default_factory=list)
    identifiers: list[IdentifierRecord] = Field(default_factory=list)
    date_of_birth: date | None = None
    additional_attributes: dict[str, Any] = Field(default_factory=dict)

    # Resolution status
    master_entity_id: UUID | None = None
    resolution_status: ResolutionStatus = ResolutionStatus.PENDING
    resolution_confidence: float = 0.0

    # Timestamps
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    resolved_at: datetime | None = None


class MatchCandidate(BaseModel):
    """Candidate match between records"""
    candidate_id: UUID = Field(default_factory=uuid4)

    # Records being compared
    record_1_id: str
    record_1_source: str
    record_2_id: str
    record_2_source: str

    # Match scores
    overall_score: float
    confidence: MatchConfidence

    # Field-level scores
    name_score: float = 0.0
    address_score: float = 0.0
    identifier_score: float = 0.0
    dob_score: float = 0.0

    # Matching details
    matching_fields: list[str] = Field(default_factory=list)
    non_matching_fields: list[str] = Field(default_factory=list)
    score_breakdown: dict[str, float] = Field(default_factory=dict)

    # Status
    status: str = "pending"  # pending, confirmed, rejected
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    resolution_notes: str | None = None

    # Timestamps
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MergeOperation(BaseModel):
    """Record of a merge operation"""
    merge_id: UUID = Field(default_factory=uuid4)

    # Merge type
    merge_type: str  # auto, manual

    # Entities involved
    surviving_entity_id: UUID
    merged_entity_ids: list[UUID] = Field(default_factory=list)

    # Match information
    match_candidate_ids: list[UUID] = Field(default_factory=list)
    merge_confidence: float

    # Before/After
    pre_merge_state: dict[str, Any] = Field(default_factory=dict)
    post_merge_state: dict[str, Any] = Field(default_factory=dict)

    # Conflicts resolved
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    conflict_resolutions: list[dict[str, Any]] = Field(default_factory=list)

    # Performed by
    performed_by: str
    performed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    approved_by: str | None = None
    approved_at: datetime | None = None

    # Rollback
    can_rollback: bool = True
    rolled_back: bool = False
    rollback_at: datetime | None = None


class SplitOperation(BaseModel):
    """Record of a split operation"""
    split_id: UUID = Field(default_factory=uuid4)

    # Original entity
    original_entity_id: UUID

    # New entities
    new_entity_ids: list[UUID] = Field(default_factory=list)

    # Split details
    split_reason: str
    record_assignments: dict[str, str] = Field(default_factory=dict)  # record_id -> new_entity_id

    # Performed by
    performed_by: str
    performed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    approved_by: str | None = None
    approved_at: datetime | None = None


class ResolutionRule(BaseModel):
    """Rule for automatic entity resolution"""
    rule_id: UUID = Field(default_factory=uuid4)
    rule_name: str
    rule_code: str

    # Rule configuration
    entity_type: EntityType
    match_fields: list[str] = Field(default_factory=list)
    field_weights: dict[str, float] = Field(default_factory=dict)
    threshold: float = 0.85

    # Auto-merge settings
    auto_merge_threshold: float = 0.95
    auto_merge_enabled: bool = True

    # Status
    is_active: bool = True
    priority: int = 1

    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ResolutionJob(BaseModel):
    """Batch resolution job"""
    job_id: UUID = Field(default_factory=uuid4)
    job_name: str

    # Scope
    entity_type: EntityType
    source_systems: list[str] = Field(default_factory=list)
    date_range_start: datetime | None = None
    date_range_end: datetime | None = None

    # Progress
    total_records: int = 0
    processed_records: int = 0
    matches_found: int = 0
    auto_merged: int = 0
    pending_review: int = 0
    errors: int = 0

    # Status
    status: str = "pending"  # pending, running, completed, failed
    started_at: datetime | None = None
    completed_at: datetime | None = None

    # Created by
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EntityResolutionStatistics(BaseModel):
    """Statistics for entity resolution"""
    total_master_entities: int = 0
    total_source_records: int = 0
    unresolved_records: int = 0
    pending_review: int = 0
    auto_merge_rate: float = 0.0
    average_match_score: float = 0.0
    by_entity_type: dict[str, int] = Field(default_factory=dict)
    by_source_system: dict[str, int] = Field(default_factory=dict)
    matches_this_month: int = 0
    merges_this_month: int = 0
    splits_this_month: int = 0
    data_quality_score: float = 0.0
