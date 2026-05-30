"""Reporting Models - Data models for regulatory reporting"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ReportFrequency(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"
    AD_HOC = "ad_hoc"


class ReportStatus(StrEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    AMENDED = "amended"


class Regulator(StrEnum):
    FED = "fed"
    OCC = "occ"
    FDIC = "fdic"
    SEC = "sec"
    FINRA = "finra"
    CFTC = "cftc"
    CFPB = "cfpb"
    FCA = "fca"
    PRA = "pra"
    ECB = "ecb"
    BIS = "bis"


class RegulatoryReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_code: str
    report_name: str
    regulator: Regulator
    frequency: ReportFrequency
    reporting_period_start: date
    reporting_period_end: date
    due_date: date
    entity_id: str
    entity_name: str
    status: ReportStatus = ReportStatus.DRAFT
    version: int = 1
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reviewed_by: str | None = None
    review_date: datetime | None = None
    approved_by: str | None = None
    approval_date: datetime | None = None
    submitted_by: str | None = None
    submission_date: datetime | None = None
    submission_reference: str | None = None
    regulator_response: str | None = None
    response_date: datetime | None = None
    amendment_reason: str | None = None


class ReportSchedule(BaseModel):
    schedule_id: UUID = Field(default_factory=uuid4)
    report_code: str
    report_name: str
    regulator: Regulator
    frequency: ReportFrequency
    reporting_day: int | None = None  # Day of month for monthly
    reporting_offset_days: int  # Days after period end
    entity_id: str
    owner: str
    backup_owner: str | None = None
    data_sources: list[str]
    dependencies: list[str]
    automated: bool = False
    automation_status: str | None = None
    is_active: bool = True
    next_due_date: date
    last_submission_date: date | None = None


class ReportValidation(BaseModel):
    validation_id: UUID = Field(default_factory=uuid4)
    report_id: UUID
    validation_rule_id: str
    rule_description: str
    rule_type: str  # arithmetic, logical, cross_report
    expected_value: str | None = None
    actual_value: str
    passed: bool
    severity: str  # error, warning, info
    validation_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    resolution_required: bool = False
    resolved: bool = False
    resolution_notes: str | None = None
    resolved_by: str | None = None


class ReportDataElement(BaseModel):
    element_id: UUID = Field(default_factory=uuid4)
    report_id: UUID
    element_code: str
    element_name: str
    schedule: str
    line_item: str
    column: str
    value: str
    data_type: str
    source_system: str
    source_table: str | None = None
    extraction_date: datetime
    transformation_applied: str | None = None
    manual_override: bool = False
    override_reason: str | None = None
    overridden_by: str | None = None


class ReportingException(BaseModel):
    exception_id: UUID = Field(default_factory=uuid4)
    report_id: UUID
    exception_type: str
    description: str
    identified_date: date
    identified_by: str
    impact: str
    root_cause: str | None = None
    remediation_action: str
    remediation_owner: str
    remediation_due_date: date
    status: str = "open"
    resolution_date: date | None = None
    resolution_notes: str | None = None


class ReportAmendment(BaseModel):
    amendment_id: UUID = Field(default_factory=uuid4)
    original_report_id: UUID
    amended_report_id: UUID
    amendment_date: date
    amendment_reason: str
    changes_summary: str
    elements_changed: list[dict[str, Any]]
    materiality_assessment: str
    regulator_notified: bool = False
    notification_date: date | None = None
    approved_by: str
    approval_date: date


class ReportingCalendar(BaseModel):
    calendar_id: UUID = Field(default_factory=uuid4)
    year: int
    month: int
    report_code: str
    entity_id: str
    period_start: date
    period_end: date
    internal_deadline: date
    submission_deadline: date
    status: str = "pending"
    assigned_to: str
    notes: str | None = None


class ReportMetrics(BaseModel):
    metrics_id: UUID = Field(default_factory=uuid4)
    metrics_date: date
    total_reports: int
    reports_submitted_on_time: int
    reports_submitted_late: int
    reports_rejected: int
    reports_amended: int
    validation_errors: int
    validation_warnings: int
    exceptions_open: int
    exceptions_resolved: int
    automation_rate: Decimal
    average_preparation_days: float
    compliance_rate: Decimal
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
