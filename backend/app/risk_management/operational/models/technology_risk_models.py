"""Technology Risk Models - Data models for IT risk management"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class AssetType(StrEnum):
    APPLICATION = "application"
    DATABASE = "database"
    SERVER = "server"
    NETWORK = "network"
    ENDPOINT = "endpoint"
    CLOUD_SERVICE = "cloud_service"
    DATA = "data"


class AssetCriticality(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class VulnerabilitySeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class PatchStatus(StrEnum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    APPLIED = "applied"
    FAILED = "failed"
    DEFERRED = "deferred"
    NOT_APPLICABLE = "not_applicable"


class IncidentType(StrEnum):
    SECURITY = "security"
    AVAILABILITY = "availability"
    PERFORMANCE = "performance"
    DATA_BREACH = "data_breach"
    MALWARE = "malware"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    CONFIGURATION = "configuration"


class ITAsset(BaseModel):
    asset_id: UUID = Field(default_factory=uuid4)
    asset_code: str
    asset_name: str
    asset_type: AssetType
    description: str
    criticality: AssetCriticality
    owner: str
    custodian: str
    business_unit: str
    location: str
    environment: str  # production, staging, development
    ip_address: str | None = None
    hostname: str | None = None
    operating_system: str | None = None
    version: str | None = None
    vendor: str | None = None
    support_end_date: date | None = None
    data_classification: str
    pii_stored: bool = False
    pci_scope: bool = False
    sox_scope: bool = False
    last_scan_date: date | None = None
    vulnerability_count: int = 0
    compliance_status: str = "compliant"
    is_active: bool = True
    created_date: date = Field(default_factory=date.today)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Vulnerability(BaseModel):
    vulnerability_id: UUID = Field(default_factory=uuid4)
    cve_id: str | None = None
    title: str
    description: str
    severity: VulnerabilitySeverity
    cvss_score: Decimal | None = None
    cvss_vector: str | None = None
    affected_assets: list[UUID] = Field(default_factory=list)
    affected_systems: list[str] = Field(default_factory=list)
    discovery_date: date
    discovery_source: str
    exploit_available: bool = False
    actively_exploited: bool = False
    patch_available: bool = False
    patch_id: str | None = None
    remediation_steps: list[str] = Field(default_factory=list)
    workaround: str | None = None
    status: str = "open"
    assigned_to: str | None = None
    due_date: date | None = None
    remediation_date: date | None = None
    false_positive: bool = False
    risk_accepted: bool = False
    acceptance_reason: str | None = None
    acceptance_expiry: date | None = None


class PatchManagement(BaseModel):
    patch_id: UUID = Field(default_factory=uuid4)
    patch_code: str
    patch_name: str
    vendor: str
    release_date: date
    severity: str
    affected_products: list[str]
    affected_assets: list[UUID] = Field(default_factory=list)
    cve_addressed: list[str] = Field(default_factory=list)
    status: PatchStatus = PatchStatus.PENDING
    scheduled_date: date | None = None
    applied_date: date | None = None
    applied_by: str | None = None
    test_required: bool = True
    test_status: str | None = None
    test_date: date | None = None
    rollback_plan: bool = False
    change_ticket: str | None = None
    notes: str | None = None


class TechRiskAssessment(BaseModel):
    assessment_id: UUID = Field(default_factory=uuid4)
    asset_id: UUID
    assessment_type: str
    assessment_date: date
    assessor: str
    confidentiality_risk: str
    integrity_risk: str
    availability_risk: str
    overall_risk_rating: str
    threats_identified: list[str]
    vulnerabilities_found: list[str]
    controls_in_place: list[str]
    control_gaps: list[str]
    recommendations: list[str]
    action_items: list[dict[str, Any]] = Field(default_factory=list)
    next_assessment_date: date | None = None
    status: str = "completed"
    approved_by: str | None = None


class SecurityIncident(BaseModel):
    incident_id: UUID = Field(default_factory=uuid4)
    incident_number: str
    incident_type: IncidentType
    severity: str
    status: str = "open"
    title: str
    description: str
    detected_time: datetime
    reported_time: datetime
    affected_assets: list[UUID] = Field(default_factory=list)
    affected_users: int = 0
    data_compromised: bool = False
    data_type_compromised: list[str] | None = None
    records_affected: int | None = None
    attack_vector: str | None = None
    indicators_of_compromise: list[str] = Field(default_factory=list)
    containment_time: datetime | None = None
    eradication_time: datetime | None = None
    recovery_time: datetime | None = None
    closure_time: datetime | None = None
    root_cause: str | None = None
    lessons_learned: list[str] = Field(default_factory=list)
    regulatory_notification: bool = False
    notification_date: datetime | None = None
    financial_impact: Decimal | None = None


class AccessReview(BaseModel):
    review_id: UUID = Field(default_factory=uuid4)
    system_id: UUID
    system_name: str
    review_type: str  # periodic, ad_hoc
    review_date: date
    reviewer: str
    total_users: int
    users_reviewed: int
    access_confirmed: int
    access_revoked: int
    access_modified: int
    privileged_accounts: int
    service_accounts: int
    orphan_accounts: int
    dormant_accounts: int
    segregation_conflicts: int
    findings: list[str] = Field(default_factory=list)
    status: str = "in_progress"
    completion_date: date | None = None
    next_review_date: date | None = None


class ChangeRisk(BaseModel):
    change_id: UUID = Field(default_factory=uuid4)
    change_ticket: str
    change_title: str
    change_type: str  # standard, normal, emergency
    change_date: date
    affected_systems: list[UUID]
    risk_category: str
    risk_score: int
    impact_assessment: str
    rollback_plan: bool
    test_plan: bool
    approval_status: str
    approved_by: str | None = None
    implementation_status: str
    post_implementation_review: bool = False
    issues_found: list[str] = Field(default_factory=list)
    created_by: str


class TechRiskMetrics(BaseModel):
    metrics_id: UUID = Field(default_factory=uuid4)
    metrics_date: date
    total_assets: int
    critical_assets: int
    assets_scanned: int
    scan_coverage: Decimal
    total_vulnerabilities: int
    critical_vulnerabilities: int
    high_vulnerabilities: int
    medium_vulnerabilities: int
    low_vulnerabilities: int
    vulnerabilities_remediated_mtd: int
    average_remediation_days: float
    patches_pending: int
    patches_overdue: int
    security_incidents_mtd: int
    mttr_hours: float  # Mean Time To Resolve
    access_reviews_completed: int
    access_reviews_pending: int
    compliance_score: Decimal
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
