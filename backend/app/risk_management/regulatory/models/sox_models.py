"""SOX Models - Data models for Sarbanes-Oxley compliance"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ControlObjective(StrEnum):
    EXISTENCE = "existence"
    COMPLETENESS = "completeness"
    RIGHTS_OBLIGATIONS = "rights_obligations"
    VALUATION = "valuation"
    PRESENTATION = "presentation"


class AssertionType(StrEnum):
    EXISTENCE_OCCURRENCE = "existence_occurrence"
    COMPLETENESS = "completeness"
    VALUATION_ALLOCATION = "valuation_allocation"
    RIGHTS_OBLIGATIONS = "rights_obligations"
    PRESENTATION_DISCLOSURE = "presentation_disclosure"


class DeficiencyType(StrEnum):
    CONTROL_DEFICIENCY = "control_deficiency"
    SIGNIFICANT_DEFICIENCY = "significant_deficiency"
    MATERIAL_WEAKNESS = "material_weakness"


class SOXProcess(BaseModel):
    process_id: UUID = Field(default_factory=uuid4)
    process_code: str
    process_name: str
    process_description: str
    business_unit: str
    process_owner: str
    financial_statement_areas: list[str]
    assertions_addressed: list[AssertionType]
    materiality_threshold: Decimal
    in_scope: bool = True
    risk_rating: str
    last_assessment_date: date | None = None
    next_assessment_date: date | None = None
    documentation_location: str
    is_active: bool = True


class SOXControl(BaseModel):
    control_id: UUID = Field(default_factory=uuid4)
    control_code: str
    process_id: UUID
    control_name: str
    control_description: str
    control_objective: ControlObjective
    assertions: list[AssertionType]
    control_type: str  # preventive, detective
    control_nature: str  # manual, automated, IT-dependent
    control_frequency: str
    control_owner: str
    performer: str
    evidence_type: str
    evidence_retention: str
    key_control: bool = False
    compensating_control: bool = False
    compensates_for: UUID | None = None
    design_effectiveness: str | None = None
    operating_effectiveness: str | None = None
    last_test_date: date | None = None
    next_test_date: date | None = None
    status: str = "active"


class SOXRisk(BaseModel):
    risk_id: UUID = Field(default_factory=uuid4)
    risk_code: str
    process_id: UUID
    risk_description: str
    risk_source: str  # fraud, error
    financial_statement_impact: str
    assertions_impacted: list[AssertionType]
    likelihood: str
    impact: str
    inherent_risk: str
    controls_mitigating: list[UUID]
    residual_risk: str
    risk_response: str
    management_override_risk: bool = False


class SOXTestPlan(BaseModel):
    plan_id: UUID = Field(default_factory=uuid4)
    fiscal_year: int
    quarter: int
    control_id: UUID
    test_type: str  # walkthrough, sample_test, roll_forward
    planned_test_date: date
    sample_size: int
    selection_method: str
    test_procedure: str
    assigned_tester: str
    status: str = "planned"
    actual_test_date: date | None = None
    completed_by: str | None = None


class SOXTestResult(BaseModel):
    result_id: UUID = Field(default_factory=uuid4)
    plan_id: UUID
    control_id: UUID
    test_date: date
    tester: str
    population_size: int
    sample_size: int
    items_tested: int
    exceptions_found: int
    exception_rate: Decimal
    design_conclusion: str  # effective, ineffective
    operating_conclusion: str  # effective, ineffective
    overall_conclusion: str
    test_evidence: list[str]
    findings: list[str] = Field(default_factory=list)
    management_response: str | None = None
    reviewed_by: str | None = None
    review_date: date | None = None


class SOXDeficiency(BaseModel):
    deficiency_id: UUID = Field(default_factory=uuid4)
    deficiency_reference: str
    control_id: UUID
    test_result_id: UUID | None = None
    deficiency_type: DeficiencyType
    deficiency_description: str
    root_cause: str
    financial_statement_impact: str
    quantitative_impact: Decimal | None = None
    qualitative_factors: list[str]
    compensating_controls: list[UUID]
    remediation_plan: str
    remediation_owner: str
    remediation_due_date: date
    status: str = "open"
    remediation_date: date | None = None
    retest_required: bool = True
    retest_date: date | None = None
    retest_result: str | None = None
    closed_by: str | None = None
    closed_date: date | None = None


class ManagementCertification(BaseModel):
    certification_id: UUID = Field(default_factory=uuid4)
    fiscal_year: int
    quarter: int | None = None
    certification_type: str  # 302, 906
    certifier_name: str
    certifier_title: str
    certification_date: date
    icfr_effective: bool
    material_weaknesses_exist: bool
    material_weaknesses_disclosed: list[str]
    significant_changes: bool
    change_description: str | None = None
    certification_statement: str
    signed: bool = False
    signature_date: date | None = None


class SOXAuditCommittee(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    fiscal_year: int
    quarter: int
    controls_tested: int
    controls_effective: int
    controls_ineffective: int
    deficiencies_identified: int
    control_deficiencies: int
    significant_deficiencies: int
    material_weaknesses: int
    remediations_completed: int
    remediations_in_progress: int
    key_observations: list[str]
    management_actions: list[str]
    external_auditor_findings: list[str]
    icfr_assessment: str
    presented_by: str
    presentation_date: date


class SOXReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    fiscal_year: int
    report_type: str
    total_processes: int
    in_scope_processes: int
    total_controls: int
    key_controls: int
    controls_tested: int
    test_pass_rate: Decimal
    deficiencies_open: int
    deficiencies_closed: int
    material_weaknesses: int
    significant_deficiencies: int
    control_deficiencies: int
    remediation_on_track: int
    remediation_overdue: int
    certification_status: str
    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
