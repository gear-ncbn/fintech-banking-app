"""GDPR Models - Data models for GDPR compliance management"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class LawfulBasis(StrEnum):
    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTEREST = "vital_interest"
    PUBLIC_TASK = "public_task"
    LEGITIMATE_INTEREST = "legitimate_interest"


class DataSubjectRight(StrEnum):
    ACCESS = "access"
    RECTIFICATION = "rectification"
    ERASURE = "erasure"
    RESTRICTION = "restriction"
    PORTABILITY = "portability"
    OBJECTION = "objection"
    AUTOMATED_DECISION = "automated_decision"


class IncidentSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProcessingActivity(BaseModel):
    activity_id: UUID = Field(default_factory=uuid4)
    activity_name: str
    description: str
    purpose: str
    lawful_basis: LawfulBasis
    data_categories: list[str]
    special_categories: list[str] = Field(default_factory=list)
    data_subjects: list[str]
    recipients: list[str]
    third_country_transfers: bool = False
    transfer_mechanism: str | None = None
    retention_period: str
    technical_measures: list[str]
    organizational_measures: list[str]
    controller: str
    processor: str | None = None
    dpo_review_date: date | None = None
    last_updated: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_active: bool = True


class ConsentRecord(BaseModel):
    consent_id: UUID = Field(default_factory=uuid4)
    data_subject_id: str
    purpose: str
    processing_activity_id: UUID
    consent_given: bool
    consent_date: datetime
    consent_method: str
    consent_text: str
    withdrawal_date: datetime | None = None
    withdrawal_method: str | None = None
    is_active: bool = True
    proof_location: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DataSubjectRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    request_reference: str
    data_subject_id: str
    data_subject_email: str
    right_type: DataSubjectRight
    request_details: str
    received_date: datetime
    due_date: date
    status: str = "received"
    assigned_to: str | None = None
    identity_verified: bool = False
    verification_date: datetime | None = None
    response_date: datetime | None = None
    response_details: str | None = None
    extension_applied: bool = False
    extension_reason: str | None = None
    completed_date: datetime | None = None
    closed_by: str | None = None


class DataBreach(BaseModel):
    breach_id: UUID = Field(default_factory=uuid4)
    breach_reference: str
    discovery_date: datetime
    occurrence_date: datetime
    breach_type: str
    severity: IncidentSeverity
    description: str
    data_categories_affected: list[str]
    special_categories_affected: list[str]
    number_of_records: int
    number_of_subjects: int
    systems_affected: list[str]
    root_cause: str | None = None
    containment_measures: list[str]
    notification_required: bool = False
    dpa_notified: bool = False
    dpa_notification_date: datetime | None = None
    subjects_notified: bool = False
    subjects_notification_date: datetime | None = None
    risk_to_subjects: str
    corrective_actions: list[str]
    status: str = "investigating"
    closed_date: datetime | None = None


class DataProtectionImpactAssessment(BaseModel):
    dpia_id: UUID = Field(default_factory=uuid4)
    dpia_reference: str
    project_name: str
    description: str
    processing_activity_id: UUID | None = None
    necessity_assessment: str
    proportionality_assessment: str
    risks_identified: list[dict[str, Any]]
    mitigation_measures: list[dict[str, Any]]
    residual_risks: list[dict[str, Any]]
    dpo_opinion: str | None = None
    dpo_opinion_date: date | None = None
    stakeholder_consultation: bool = False
    dpa_consultation_required: bool = False
    dpa_consultation_date: date | None = None
    approved_by: str | None = None
    approval_date: date | None = None
    status: str = "draft"
    review_date: date | None = None


class ThirdPartyDataTransfer(BaseModel):
    transfer_id: UUID = Field(default_factory=uuid4)
    data_exporter: str
    data_importer: str
    recipient_country: str
    is_adequate_country: bool
    transfer_mechanism: str  # SCC, BCR, consent, etc.
    data_categories: list[str]
    purposes: list[str]
    safeguards: list[str]
    supplementary_measures: list[str]
    tia_completed: bool = False  # Transfer Impact Assessment
    tia_date: date | None = None
    contract_reference: str | None = None
    valid_from: date
    valid_to: date | None = None
    is_active: bool = True


class GDPRComplianceReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    reporting_period: str
    total_processing_activities: int
    activities_with_lawful_basis: int
    total_consent_records: int
    active_consents: int
    withdrawn_consents: int
    dsar_received: int
    dsar_completed: int
    dsar_avg_response_days: float
    breaches_reported: int
    breaches_notified_dpa: int
    dpias_completed: int
    third_country_transfers: int
    training_completed: int
    audit_findings: int
    open_remediation_items: int
    compliance_score: float
    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
