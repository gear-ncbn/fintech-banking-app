"""Vendor Risk Models - Data models for third-party risk management"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class VendorTier(StrEnum):
    TIER_1 = "tier_1"  # Critical
    TIER_2 = "tier_2"  # High
    TIER_3 = "tier_3"  # Medium
    TIER_4 = "tier_4"  # Low


class VendorStatus(StrEnum):
    PROSPECTIVE = "prospective"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    UNDER_REVIEW = "under_review"
    TERMINATED = "terminated"
    BLOCKED = "blocked"


class ServiceCategory(StrEnum):
    TECHNOLOGY = "technology"
    FINANCIAL = "financial"
    PROFESSIONAL = "professional"
    OPERATIONAL = "operational"
    FACILITIES = "facilities"
    MARKETING = "marketing"
    LEGAL = "legal"
    HR = "hr"


class RiskRating(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AssessmentType(StrEnum):
    INITIAL = "initial"
    PERIODIC = "periodic"
    AD_HOC = "ad_hoc"
    INCIDENT = "incident"
    EXIT = "exit"


class Vendor(BaseModel):
    vendor_id: UUID = Field(default_factory=uuid4)
    vendor_code: str
    vendor_name: str
    legal_name: str
    dba_name: str | None = None
    vendor_tier: VendorTier
    status: VendorStatus = VendorStatus.PROSPECTIVE
    service_category: ServiceCategory
    services_provided: list[str]
    primary_contact: str
    contact_email: str
    contact_phone: str
    address: str
    country: str
    tax_id: str | None = None
    duns_number: str | None = None
    relationship_owner: str
    business_unit: str
    onboarding_date: date | None = None
    contract_end_date: date | None = None
    annual_spend: Decimal = Decimal("0")
    payment_terms: str
    overall_risk_rating: RiskRating | None = None
    last_assessment_date: date | None = None
    next_assessment_date: date | None = None
    data_access: bool = False
    pii_access: bool = False
    system_access: bool = False
    critical_vendor: bool = False
    concentration_risk: bool = False
    subcontractors: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class VendorContract(BaseModel):
    contract_id: UUID = Field(default_factory=uuid4)
    vendor_id: UUID
    contract_number: str
    contract_name: str
    contract_type: str
    effective_date: date
    expiration_date: date
    auto_renewal: bool = False
    renewal_notice_days: int = 90
    contract_value: Decimal
    currency: str
    payment_frequency: str
    sla_attached: bool = False
    nda_attached: bool = False
    insurance_required: bool = False
    insurance_verified: bool = False
    audit_rights: bool = False
    termination_notice_days: int
    termination_for_cause: bool = True
    termination_for_convenience: bool = False
    data_protection_clause: bool = False
    subcontracting_allowed: bool = False
    status: str = "active"
    owner: str
    approved_by: str
    approval_date: date
    document_location: str


class VendorAssessment(BaseModel):
    assessment_id: UUID = Field(default_factory=uuid4)
    vendor_id: UUID
    assessment_type: AssessmentType
    assessment_date: date
    assessor: str
    reviewer: str | None = None
    status: str = "in_progress"
    financial_risk_rating: RiskRating
    operational_risk_rating: RiskRating
    compliance_risk_rating: RiskRating
    security_risk_rating: RiskRating
    reputational_risk_rating: RiskRating
    overall_risk_rating: RiskRating
    inherent_risk_score: int
    residual_risk_score: int
    financial_stability: str
    years_in_business: int
    certifications: list[str]
    audit_reports: list[str]
    insurance_coverage: dict[str, Decimal]
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    action_items: list[dict[str, Any]] = Field(default_factory=list)
    approved_by: str | None = None
    approval_date: date | None = None


class VendorDueDiligence(BaseModel):
    due_diligence_id: UUID = Field(default_factory=uuid4)
    vendor_id: UUID
    due_diligence_type: str
    request_date: date
    completion_date: date | None = None
    status: str = "pending"
    background_check: bool = False
    financial_review: bool = False
    reference_check: bool = False
    site_visit: bool = False
    security_assessment: bool = False
    compliance_verification: bool = False
    sanctions_screening: bool = False
    adverse_media_check: bool = False
    findings: dict[str, Any] = Field(default_factory=dict)
    risk_flags: list[str] = Field(default_factory=list)
    recommendation: str = ""
    performed_by: str
    reviewed_by: str | None = None


class VendorIncident(BaseModel):
    incident_id: UUID = Field(default_factory=uuid4)
    vendor_id: UUID
    incident_date: datetime
    reported_date: datetime
    incident_type: str
    severity: str
    description: str
    impact_description: str
    service_affected: str
    root_cause: str | None = None
    vendor_response: str | None = None
    remediation_actions: list[str] = Field(default_factory=list)
    remediation_deadline: date | None = None
    status: str = "open"
    resolution_date: datetime | None = None
    financial_impact: Decimal | None = None
    sla_breached: bool = False
    credit_applied: Decimal | None = None
    escalated: bool = False
    regulatory_notification: bool = False


class VendorPerformance(BaseModel):
    performance_id: UUID = Field(default_factory=uuid4)
    vendor_id: UUID
    review_period: str
    period_start: date
    period_end: date
    sla_metrics: dict[str, Decimal]
    overall_sla_compliance: Decimal
    quality_score: Decimal
    delivery_score: Decimal
    responsiveness_score: Decimal
    cost_performance: Decimal
    overall_score: Decimal
    issues_reported: int
    issues_resolved: int
    incidents_count: int
    strengths: list[str]
    areas_for_improvement: list[str]
    action_items: list[dict[str, Any]]
    reviewer: str
    review_date: date


class VendorRiskMetrics(BaseModel):
    metrics_id: UUID = Field(default_factory=uuid4)
    metrics_date: date
    total_vendors: int
    active_vendors: int
    critical_vendors: int
    tier_1_count: int
    tier_2_count: int
    tier_3_count: int
    tier_4_count: int
    high_risk_vendors: int
    total_spend: Decimal
    assessments_due: int
    assessments_overdue: int
    contracts_expiring_90_days: int
    open_incidents: int
    average_performance_score: Decimal
    concentration_risk_vendors: int
    data_access_vendors: int
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
