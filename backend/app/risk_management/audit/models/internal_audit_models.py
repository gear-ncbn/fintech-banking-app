"""Internal Audit Models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class AuditType(StrEnum):
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    COMPLIANCE = "compliance"
    IT = "it"
    INTEGRATED = "integrated"
    SPECIAL = "special"
    FOLLOW_UP = "follow_up"


class AuditStatus(StrEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    FIELDWORK = "fieldwork"
    REPORTING = "reporting"
    REVIEW = "review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FindingSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    ADVISORY = "advisory"


class InternalAudit(BaseModel):
    audit_id: UUID = Field(default_factory=uuid4)
    audit_reference: str
    audit_name: str
    audit_type: AuditType
    audit_scope: str
    audit_objectives: list[str]
    business_unit: str
    audit_period_start: date
    audit_period_end: date
    planned_start_date: date
    planned_end_date: date
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    lead_auditor: str
    audit_team: list[str]
    status: AuditStatus = AuditStatus.PLANNED
    risk_rating: str = "medium"
    budgeted_hours: int = 0
    actual_hours: int = 0
    methodology: str = ""
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AuditWorkpaper(BaseModel):
    workpaper_id: UUID = Field(default_factory=uuid4)
    audit_id: UUID
    workpaper_reference: str
    workpaper_title: str
    workpaper_type: str
    section: str
    prepared_by: str
    prepared_date: date
    reviewed_by: str | None = None
    review_date: date | None = None
    status: str = "draft"
    description: str = ""
    testing_objective: str = ""
    testing_procedure: str = ""
    sample_size: int = 0
    population_size: int = 0
    exceptions_found: int = 0
    conclusion: str = ""
    attachments: list[str] = Field(default_factory=list)


class AuditFinding(BaseModel):
    finding_id: UUID = Field(default_factory=uuid4)
    audit_id: UUID
    finding_reference: str
    finding_title: str
    severity: FindingSeverity
    condition: str
    criteria: str
    cause: str
    effect: str
    recommendation: str
    management_response: str = ""
    action_plan: str = ""
    action_owner: str = ""
    target_date: date | None = None
    status: str = "open"
    validated: bool = False
    validation_date: date | None = None
    validated_by: str | None = None
    repeat_finding: bool = False
    prior_finding_reference: str | None = None


class AuditReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    audit_id: UUID
    report_reference: str
    report_title: str
    report_type: str
    executive_summary: str
    scope_summary: str
    methodology_summary: str
    findings_summary: dict[str, int] = Field(default_factory=dict)
    overall_opinion: str
    key_observations: list[str] = Field(default_factory=list)
    positive_observations: list[str] = Field(default_factory=list)
    drafted_by: str
    drafted_date: date
    reviewed_by: str | None = None
    review_date: date | None = None
    approved_by: str | None = None
    approval_date: date | None = None
    issued_date: date | None = None
    distribution_list: list[str] = Field(default_factory=list)
    status: str = "draft"


class AuditFollowUp(BaseModel):
    follow_up_id: UUID = Field(default_factory=uuid4)
    finding_id: UUID
    audit_id: UUID
    follow_up_date: date
    follow_up_by: str
    implementation_status: str
    evidence_reviewed: list[str] = Field(default_factory=list)
    management_update: str = ""
    auditor_assessment: str = ""
    remaining_risk: str = ""
    revised_target_date: date | None = None
    closed: bool = False
    closed_date: date | None = None
