"""
AML Case Models

Defines data structures for AML investigation cases.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CaseStatus(StrEnum):
    """Case workflow status"""
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    ESCALATED = "escalated"
    PENDING_SAR = "pending_sar"
    SAR_FILED = "sar_filed"
    CLOSED_NO_ACTION = "closed_no_action"
    CLOSED_WITH_ACTION = "closed_with_action"


class CasePriority(StrEnum):
    """Case priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CaseCategory(StrEnum):
    """Case categories"""
    MONEY_LAUNDERING = "money_laundering"
    TERRORIST_FINANCING = "terrorist_financing"
    FRAUD = "fraud"
    SANCTIONS_VIOLATION = "sanctions_violation"
    TAX_EVASION = "tax_evasion"
    BRIBERY_CORRUPTION = "bribery_corruption"
    STRUCTURING = "structuring"
    UNKNOWN_SOURCE_OF_FUNDS = "unknown_source_of_funds"
    SHELL_COMPANY = "shell_company"
    OTHER = "other"


class InvestigationFinding(BaseModel):
    """Individual investigation finding"""
    finding_id: UUID = Field(default_factory=uuid4)
    finding_type: str
    description: str
    severity: str
    evidence_refs: list[UUID] = Field(default_factory=list)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    validated: bool = False
    validated_by: str | None = None
    validated_at: datetime | None = None


class CaseTimeline(BaseModel):
    """Timeline entry for case activity"""
    entry_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    activity_type: str
    description: str
    actor_id: str
    actor_name: str
    details: dict[str, Any] = Field(default_factory=dict)


class CaseDocument(BaseModel):
    """Document attached to a case"""
    document_id: UUID = Field(default_factory=uuid4)
    document_name: str
    document_type: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class RelatedEntity(BaseModel):
    """Entity related to a case"""
    entity_id: str
    entity_type: str  # customer, account, transaction, organization
    entity_name: str
    relationship_type: str
    added_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    notes: str | None = None


class CaseAssignment(BaseModel):
    """Case assignment record"""
    assignment_id: UUID = Field(default_factory=uuid4)
    assigned_to: str
    assigned_by: str
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    role: str
    is_primary: bool = False
    notes: str | None = None


class SARReference(BaseModel):
    """SAR filing reference"""
    sar_id: UUID
    sar_number: str
    filing_date: datetime
    filing_status: str
    acknowledgment_number: str | None = None


class AMLCase(BaseModel):
    """Main AML Investigation Case entity"""
    case_id: UUID = Field(default_factory=uuid4)
    case_number: str
    title: str
    description: str

    # Classification
    status: CaseStatus = CaseStatus.DRAFT
    priority: CasePriority = CasePriority.MEDIUM
    category: CaseCategory
    subcategory: str | None = None

    # Subject information
    primary_subject_id: str
    primary_subject_type: str
    primary_subject_name: str

    # Related entities
    related_entities: list[RelatedEntity] = Field(default_factory=list)

    # Alerts linked to this case
    alert_ids: list[UUID] = Field(default_factory=list)

    # Financial summary
    total_suspicious_amount: float = 0.0
    transaction_count: int = 0
    period_start: datetime | None = None
    period_end: datetime | None = None
    currencies_involved: list[str] = Field(default_factory=list)
    countries_involved: list[str] = Field(default_factory=list)

    # Investigation
    findings: list[InvestigationFinding] = Field(default_factory=list)
    timeline: list[CaseTimeline] = Field(default_factory=list)
    documents: list[CaseDocument] = Field(default_factory=list)

    # Assignment
    assignments: list[CaseAssignment] = Field(default_factory=list)
    lead_investigator: str | None = None
    review_team: list[str] = Field(default_factory=list)

    # SAR information
    sar_required: bool = False
    sar_deadline: datetime | None = None
    sar_references: list[SARReference] = Field(default_factory=list)

    # Risk assessment
    initial_risk_score: float = 0.0
    current_risk_score: float = 0.0
    risk_factors: list[str] = Field(default_factory=list)

    # Resolution
    resolution_type: str | None = None
    resolution_summary: str | None = None
    resolved_by: str | None = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    opened_at: datetime | None = None
    closed_at: datetime | None = None
    due_date: datetime | None = None

    # Metadata
    source_system: str = "aml_case_management"
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CaseSummary(BaseModel):
    """Summarized view of a case for listings"""
    case_id: UUID
    case_number: str
    title: str
    status: CaseStatus
    priority: CasePriority
    category: CaseCategory
    primary_subject_name: str
    alert_count: int
    total_suspicious_amount: float
    lead_investigator: str | None = None
    created_at: datetime
    due_date: datetime | None = None
    sar_required: bool


class CaseStatistics(BaseModel):
    """Case statistics for dashboards"""
    total_cases: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    by_priority: dict[str, int] = Field(default_factory=dict)
    by_category: dict[str, int] = Field(default_factory=dict)
    average_resolution_days: float = 0.0
    sar_filing_rate: float = 0.0
    overdue_count: int = 0
    open_cases: int = 0
    closed_this_month: int = 0
    avg_alerts_per_case: float = 0.0


class CaseCreateRequest(BaseModel):
    """Request model for creating a case"""
    title: str
    description: str
    category: CaseCategory
    priority: CasePriority = CasePriority.MEDIUM
    primary_subject_id: str
    primary_subject_type: str
    primary_subject_name: str
    alert_ids: list[UUID] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class CaseUpdateRequest(BaseModel):
    """Request model for updating a case"""
    title: str | None = None
    description: str | None = None
    status: CaseStatus | None = None
    priority: CasePriority | None = None
    category: CaseCategory | None = None
    lead_investigator: str | None = None
    sar_required: bool | None = None
    sar_deadline: datetime | None = None
    due_date: datetime | None = None
    tags: list[str] | None = None


class CaseSearchCriteria(BaseModel):
    """Search criteria for cases"""
    statuses: list[CaseStatus] | None = None
    priorities: list[CasePriority] | None = None
    categories: list[CaseCategory] | None = None
    investigators: list[str] | None = None
    subject_ids: list[str] | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    sar_required: bool | None = None
    overdue_only: bool = False
    tags: list[str] | None = None
    page: int = 1
    page_size: int = 50
    sort_by: str = "created_at"
    sort_order: str = "desc"
