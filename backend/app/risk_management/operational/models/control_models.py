"""Control Models - Data models for control management"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ControlType(StrEnum):
    PREVENTIVE = "preventive"
    DETECTIVE = "detective"
    CORRECTIVE = "corrective"
    DIRECTIVE = "directive"
    COMPENSATING = "compensating"


class ControlNature(StrEnum):
    MANUAL = "manual"
    AUTOMATED = "automated"
    SEMI_AUTOMATED = "semi_automated"
    IT_DEPENDENT = "it_dependent"


class ControlCategory(StrEnum):
    AUTHORIZATION = "authorization"
    RECONCILIATION = "reconciliation"
    VERIFICATION = "verification"
    SEGREGATION = "segregation"
    PHYSICAL = "physical"
    MONITORING = "monitoring"
    SYSTEM = "system"


class ControlStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"
    REMEDIATION = "remediation"
    RETIRED = "retired"


class TestResult(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    PARTIAL = "partial"
    NOT_APPLICABLE = "not_applicable"


class Control(BaseModel):
    control_id: UUID = Field(default_factory=uuid4)
    control_code: str
    control_name: str
    control_description: str
    control_objective: str
    control_type: ControlType
    control_nature: ControlNature
    control_category: ControlCategory
    status: ControlStatus = ControlStatus.ACTIVE
    business_unit: str
    process: str
    owner: str
    frequency: str  # continuous, daily, weekly, monthly, etc.
    evidence_type: str
    evidence_location: str
    automation_level: int = 0  # 0-100%
    key_control: bool = False
    sox_control: bool = False
    regulatory_control: bool = False
    risks_mitigated: list[UUID] = Field(default_factory=list)
    dependencies: list[UUID] = Field(default_factory=list)
    design_rating: str | None = None
    operating_rating: str | None = None
    overall_rating: str | None = None
    last_test_date: date | None = None
    next_test_date: date | None = None
    created_date: date = Field(default_factory=date.today)
    last_modified: datetime = Field(default_factory=lambda: datetime.now(UTC))
    metadata: dict[str, Any] = Field(default_factory=dict)


class ControlTest(BaseModel):
    test_id: UUID = Field(default_factory=uuid4)
    control_id: UUID
    test_name: str
    test_type: str  # design, operating effectiveness
    test_date: date
    test_period_start: date
    test_period_end: date
    tester: str
    reviewer: str | None = None
    sample_size: int
    population_size: int
    exceptions_found: int
    exception_rate: Decimal
    test_result: TestResult
    design_conclusion: str | None = None
    operating_conclusion: str | None = None
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    management_response: str | None = None
    evidence_reviewed: list[str] = Field(default_factory=list)
    test_procedure: str
    notes: str | None = None


class ControlException(BaseModel):
    exception_id: UUID = Field(default_factory=uuid4)
    control_id: UUID
    test_id: UUID
    exception_date: date
    exception_description: str
    root_cause: str
    impact: str
    severity: str  # high, medium, low
    compensating_control: str | None = None
    remediation_required: bool = True
    remediation_action: str | None = None
    remediation_owner: str | None = None
    remediation_due_date: date | None = None
    remediation_status: str = "open"
    remediation_completed_date: date | None = None
    verified_by: str | None = None
    verification_date: date | None = None


class ControlGap(BaseModel):
    gap_id: UUID = Field(default_factory=uuid4)
    control_id: UUID | None = None
    gap_type: str  # design, coverage, operating
    gap_description: str
    identified_date: date
    identified_by: str
    risk_exposure: str
    business_unit: str
    process: str
    severity: str
    remediation_plan: str
    remediation_owner: str
    target_remediation_date: date
    status: str = "open"
    actual_remediation_date: date | None = None
    validation_required: bool = True
    validated_by: str | None = None
    validation_date: date | None = None


class ControlFramework(BaseModel):
    framework_id: UUID = Field(default_factory=uuid4)
    framework_name: str
    framework_version: str
    description: str
    issuing_body: str
    effective_date: date
    domains: list[str]
    total_controls: int
    applicable_controls: int
    implemented_controls: int
    implementation_percentage: Decimal
    last_assessment_date: date | None = None
    next_assessment_date: date | None = None
    is_active: bool = True


class ControlMapping(BaseModel):
    mapping_id: UUID = Field(default_factory=uuid4)
    control_id: UUID
    framework_id: UUID
    framework_control_id: str
    framework_control_name: str
    mapping_status: str  # full, partial, not_mapped
    mapping_notes: str | None = None
    gap_identified: bool = False
    verified_by: str | None = None
    verification_date: date | None = None


class ControlMetrics(BaseModel):
    metrics_id: UUID = Field(default_factory=uuid4)
    metrics_date: date
    business_unit: str | None = None
    total_controls: int
    active_controls: int
    key_controls: int
    automated_controls: int
    manual_controls: int
    controls_tested: int
    controls_passed: int
    controls_failed: int
    pass_rate: Decimal
    exception_count: int
    open_gaps: int
    overdue_remediations: int
    average_remediation_days: float
    sox_controls_count: int
    sox_controls_effective: int
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
