"""Master Data Management Models"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class EntityStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    MERGED = "merged"
    DELETED = "deleted"


class MasterDataDomain(BaseModel):
    domain_id: UUID = Field(default_factory=uuid4)
    domain_name: str
    domain_code: str
    description: str
    owner: str
    steward: str
    source_systems: list[str] = Field(default_factory=list)
    entity_types: list[str] = Field(default_factory=list)
    governance_policy: str = ""
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_active: bool = True


class MasterEntity(BaseModel):
    entity_id: UUID = Field(default_factory=uuid4)
    domain_id: UUID
    entity_type: str
    golden_record_id: str
    entity_name: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    source_records: list[dict[str, Any]] = Field(default_factory=list)
    match_confidence: Decimal = Decimal("100")
    status: EntityStatus = EntityStatus.ACTIVE
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_updated: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: str = ""
    updated_by: str = ""


class MatchRule(BaseModel):
    rule_id: UUID = Field(default_factory=uuid4)
    domain_id: UUID
    rule_name: str
    rule_description: str
    match_type: str  # exact, fuzzy, probabilistic
    match_fields: list[str] = Field(default_factory=list)
    match_threshold: Decimal = Decimal("80")
    weight: Decimal = Decimal("1")
    is_blocking_rule: bool = False
    blocking_keys: list[str] = Field(default_factory=list)
    is_active: bool = True
    created_by: str = ""


class MergeRule(BaseModel):
    rule_id: UUID = Field(default_factory=uuid4)
    domain_id: UUID
    rule_name: str
    attribute_name: str
    survivorship_rule: str  # most_recent, most_complete, source_priority, aggregate
    source_priority: list[str] = Field(default_factory=list)
    is_active: bool = True


class MatchCandidate(BaseModel):
    candidate_id: UUID = Field(default_factory=uuid4)
    domain_id: UUID
    entity_type: str
    record_1_id: str
    record_1_source: str
    record_2_id: str
    record_2_source: str
    match_score: Decimal
    matched_fields: dict[str, Decimal] = Field(default_factory=dict)
    match_status: str = "pending"  # pending, confirmed, rejected, auto_merged
    reviewed_by: str | None = None
    review_date: datetime | None = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MergeHistory(BaseModel):
    merge_id: UUID = Field(default_factory=uuid4)
    entity_id: UUID
    merged_records: list[str] = Field(default_factory=list)
    merge_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    merge_type: str  # auto, manual
    merged_by: str = ""
    survivorship_decisions: dict[str, str] = Field(default_factory=dict)
    can_unmerge: bool = True


class DataStewardshipTask(BaseModel):
    task_id: UUID = Field(default_factory=uuid4)
    domain_id: UUID
    task_type: str  # match_review, merge_approval, data_correction, exception_handling
    description: str
    entity_ids: list[UUID] = Field(default_factory=list)
    priority: str = "normal"
    assigned_to: str = ""
    assigned_date: datetime | None = None
    due_date: date | None = None
    status: str = "pending"
    resolution: str = ""
    completed_date: datetime | None = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class GoldenRecordAudit(BaseModel):
    audit_id: UUID = Field(default_factory=uuid4)
    entity_id: UUID
    action: str  # create, update, merge, unmerge, delete
    action_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    performed_by: str
    previous_state: dict[str, Any] = Field(default_factory=dict)
    new_state: dict[str, Any] = Field(default_factory=dict)
    reason: str = ""
