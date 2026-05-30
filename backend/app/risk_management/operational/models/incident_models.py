"""Incident Models - Data models for operational incident management"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class IncidentSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class IncidentStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class IncidentCategory(StrEnum):
    OPERATIONAL = "operational"
    TECHNOLOGY = "technology"
    COMPLIANCE = "compliance"
    SECURITY = "security"
    FRAUD = "fraud"
    PROCESS_FAILURE = "process_failure"
    HUMAN_ERROR = "human_error"
    EXTERNAL_EVENT = "external_event"
    VENDOR = "vendor"


class IncidentImpact(StrEnum):
    FINANCIAL = "financial"
    REPUTATIONAL = "reputational"
    REGULATORY = "regulatory"
    CUSTOMER = "customer"
    OPERATIONAL = "operational"
    LEGAL = "legal"


class Incident(BaseModel):
    incident_id: UUID = Field(default_factory=uuid4)
    incident_number: str
    title: str
    description: str
    category: IncidentCategory
    severity: IncidentSeverity
    status: IncidentStatus = IncidentStatus.OPEN
    reported_by: str
    reported_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    occurred_date: datetime
    detected_date: datetime
    resolved_date: datetime | None = None
    closed_date: datetime | None = None
    business_unit: str
    affected_systems: list[str] = Field(default_factory=list)
    impact_types: list[IncidentImpact] = Field(default_factory=list)
    estimated_loss: Decimal | None = None
    actual_loss: Decimal | None = None
    root_cause: str | None = None
    remediation_actions: list[str] = Field(default_factory=list)
    assigned_to: str | None = None
    escalated: bool = False
    escalation_level: int = 0
    regulatory_reportable: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class IncidentTimeline(BaseModel):
    timeline_id: UUID = Field(default_factory=uuid4)
    incident_id: UUID
    event_time: datetime = Field(default_factory=lambda: datetime.now(UTC))
    event_type: str
    description: str
    performed_by: str
    old_status: IncidentStatus | None = None
    new_status: IncidentStatus | None = None
    attachments: list[str] = Field(default_factory=list)


class IncidentEscalation(BaseModel):
    escalation_id: UUID = Field(default_factory=uuid4)
    incident_id: UUID
    escalation_level: int
    escalated_to: str
    escalated_by: str
    escalation_time: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reason: str
    acknowledged: bool = False
    acknowledged_time: datetime | None = None


class IncidentRootCauseAnalysis(BaseModel):
    analysis_id: UUID = Field(default_factory=uuid4)
    incident_id: UUID
    analysis_date: date
    analyst: str
    root_causes: list[str]
    contributing_factors: list[str]
    methodology: str  # 5 Whys, Fishbone, etc.
    findings: str
    recommendations: list[str]
    preventive_measures: list[str]
    status: str = "draft"
    approved_by: str | None = None
    approval_date: date | None = None


class IncidentCorrectiveAction(BaseModel):
    action_id: UUID = Field(default_factory=uuid4)
    incident_id: UUID
    analysis_id: UUID | None = None
    action_type: str  # immediate, short_term, long_term
    description: str
    assigned_to: str
    due_date: date
    status: str = "pending"
    completion_date: date | None = None
    verification_required: bool = True
    verified_by: str | None = None
    verification_date: date | None = None
    effectiveness_rating: int | None = None


class IncidentReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    report_type: str  # daily, weekly, monthly
    period_start: date
    period_end: date
    total_incidents: int
    incidents_by_severity: dict[str, int]
    incidents_by_category: dict[str, int]
    incidents_by_status: dict[str, int]
    total_estimated_loss: Decimal
    total_actual_loss: Decimal
    average_resolution_time: float  # hours
    escalation_rate: float
    trending_categories: list[str]
    generated_by: str
    metadata: dict[str, Any] = Field(default_factory=dict)
