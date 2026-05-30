"""Issue Management Models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class IssueSource(StrEnum):
    INTERNAL_AUDIT = "internal_audit"
    EXTERNAL_AUDIT = "external_audit"
    REGULATORY_EXAM = "regulatory_exam"
    SELF_IDENTIFIED = "self_identified"
    COMPLIANCE_TESTING = "compliance_testing"
    INCIDENT = "incident"
    CUSTOMER_COMPLAINT = "customer_complaint"
    RISK_ASSESSMENT = "risk_assessment"


class IssuePriority(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_VALIDATION = "pending_validation"
    VALIDATED = "validated"
    CLOSED = "closed"
    OVERDUE = "overdue"
    ESCALATED = "escalated"


class Issue(BaseModel):
    issue_id: UUID = Field(default_factory=uuid4)
    issue_reference: str
    issue_title: str
    source: IssueSource
    source_reference: str = ""
    priority: IssuePriority
    description: str
    root_cause: str = ""
    impact: str
    risk_rating: str = "medium"
    business_unit: str
    process_affected: str = ""
    identified_date: date
    identified_by: str
    owner: str
    due_date: date
    extended_due_date: date | None = None
    extension_count: int = 0
    status: IssueStatus = IssueStatus.OPEN
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ActionPlan(BaseModel):
    action_id: UUID = Field(default_factory=uuid4)
    issue_id: UUID
    action_reference: str
    action_description: str
    action_type: str
    owner: str
    due_date: date
    completion_date: date | None = None
    status: str = "open"
    progress_percentage: int = 0
    evidence_required: list[str] = Field(default_factory=list)
    evidence_provided: list[str] = Field(default_factory=list)
    comments: str = ""
    dependencies: list[str] = Field(default_factory=list)


class IssueUpdate(BaseModel):
    update_id: UUID = Field(default_factory=uuid4)
    issue_id: UUID
    update_date: date
    updated_by: str
    update_type: str  # progress, status_change, extension, escalation
    previous_status: str = ""
    new_status: str = ""
    progress_update: str
    blockers: list[str] = Field(default_factory=list)
    next_steps: str = ""
    documents_attached: list[str] = Field(default_factory=list)


class IssueValidation(BaseModel):
    validation_id: UUID = Field(default_factory=uuid4)
    issue_id: UUID
    validation_date: date
    validator: str
    validation_type: str  # initial, follow_up, final
    evidence_reviewed: list[str] = Field(default_factory=list)
    tests_performed: list[str] = Field(default_factory=list)
    validation_result: str  # validated, not_validated, partial
    findings: str = ""
    remaining_risk: str = ""
    recommendation: str = ""
    reopen_required: bool = False


class IssueEscalation(BaseModel):
    escalation_id: UUID = Field(default_factory=uuid4)
    issue_id: UUID
    escalation_date: date
    escalated_by: str
    escalation_reason: str
    escalated_to: str
    escalation_level: int
    response_required_by: date
    response_received: str | None = None
    response_date: date | None = None
    resolution: str = ""
    status: str = "pending"


class IssueReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_period: str
    report_date: date
    prepared_by: str
    total_issues: int = 0
    issues_by_source: dict[str, int] = Field(default_factory=dict)
    issues_by_priority: dict[str, int] = Field(default_factory=dict)
    issues_by_status: dict[str, int] = Field(default_factory=dict)
    opened_this_period: int = 0
    closed_this_period: int = 0
    overdue_issues: int = 0
    aging_analysis: dict[str, int] = Field(default_factory=dict)
    key_issues: list[dict[str, Any]] = Field(default_factory=list)
    trends: dict[str, Any] = Field(default_factory=dict)
    status: str = "draft"
