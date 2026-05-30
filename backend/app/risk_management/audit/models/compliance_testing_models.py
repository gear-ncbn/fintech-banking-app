"""Compliance Testing Models"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class TestingType(StrEnum):
    CONTROL = "control"
    SUBSTANTIVE = "substantive"
    COMPLIANCE = "compliance"
    WALKTHROUGH = "walkthrough"
    INQUIRY = "inquiry"
    OBSERVATION = "observation"
    INSPECTION = "inspection"
    REPERFORMANCE = "reperformance"


class TestResult(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    PARTIAL = "partial"
    NOT_TESTED = "not_tested"
    NOT_APPLICABLE = "not_applicable"


class ComplianceTestPlan(BaseModel):
    plan_id: UUID = Field(default_factory=uuid4)
    plan_reference: str
    plan_name: str
    testing_period: str
    regulation: str
    requirement_reference: str
    control_id: str | None = None
    test_objective: str
    test_procedure: str
    testing_type: TestingType
    sample_methodology: str
    planned_sample_size: int
    testing_frequency: str
    assigned_tester: str
    planned_date: date
    status: str = "planned"
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ComplianceTestExecution(BaseModel):
    execution_id: UUID = Field(default_factory=uuid4)
    plan_id: UUID
    execution_date: date
    tester: str
    population_size: int
    sample_size: int
    items_tested: int
    exceptions_found: int
    exception_rate: Decimal = Decimal("0")
    test_result: TestResult = TestResult.NOT_TESTED
    evidence_references: list[str] = Field(default_factory=list)
    workpaper_reference: str = ""
    observations: str = ""
    conclusion: str = ""
    reviewed_by: str | None = None
    review_date: date | None = None
    review_comments: str = ""


class ComplianceException(BaseModel):
    exception_id: UUID = Field(default_factory=uuid4)
    execution_id: UUID
    exception_reference: str
    description: str
    sample_item: str
    expected_result: str
    actual_result: str
    root_cause: str = ""
    severity: str = "medium"
    impact: str = ""
    remediation_required: bool = True
    remediation_action: str = ""
    remediation_owner: str = ""
    remediation_due_date: date | None = None
    status: str = "open"


class ComplianceMonitoring(BaseModel):
    monitoring_id: UUID = Field(default_factory=uuid4)
    monitoring_reference: str
    regulation: str
    monitoring_area: str
    monitoring_period: str
    metrics: list[dict[str, Any]] = Field(default_factory=list)
    thresholds: dict[str, Decimal] = Field(default_factory=dict)
    current_values: dict[str, Decimal] = Field(default_factory=dict)
    breaches_identified: list[dict[str, Any]] = Field(default_factory=list)
    trend_analysis: dict[str, Any] = Field(default_factory=dict)
    monitoring_frequency: str
    last_monitoring_date: date
    next_monitoring_date: date
    owner: str
    status: str = "active"


class RegulatoryChange(BaseModel):
    change_id: UUID = Field(default_factory=uuid4)
    change_reference: str
    regulation: str
    regulator: str
    change_type: str  # new, amendment, repeal, guidance
    effective_date: date
    summary: str
    detailed_description: str
    impact_assessment: str
    affected_areas: list[str] = Field(default_factory=list)
    required_actions: list[dict[str, Any]] = Field(default_factory=list)
    assigned_to: str
    implementation_deadline: date
    status: str = "identified"
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ComplianceReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_reference: str
    report_period: str
    report_date: date
    prepared_by: str
    regulations_covered: list[str] = Field(default_factory=list)
    tests_performed: int = 0
    tests_passed: int = 0
    tests_failed: int = 0
    pass_rate: Decimal = Decimal("0")
    exceptions_identified: int = 0
    open_exceptions: int = 0
    key_findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    management_actions: list[dict[str, Any]] = Field(default_factory=list)
    overall_compliance_status: str
    approved_by: str | None = None
    approval_date: date | None = None
    status: str = "draft"
