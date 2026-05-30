"""RCSA Models - Risk Control Self-Assessment data models"""

from datetime import date
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class RiskCategory(StrEnum):
    OPERATIONAL = "operational"
    COMPLIANCE = "compliance"
    STRATEGIC = "strategic"
    FINANCIAL = "financial"
    TECHNOLOGY = "technology"
    REPUTATIONAL = "reputational"
    LEGAL = "legal"


class RiskLikelihood(StrEnum):
    RARE = "rare"
    UNLIKELY = "unlikely"
    POSSIBLE = "possible"
    LIKELY = "likely"
    ALMOST_CERTAIN = "almost_certain"


class RiskImpact(StrEnum):
    NEGLIGIBLE = "negligible"
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CATASTROPHIC = "catastrophic"


class ControlEffectiveness(StrEnum):
    EFFECTIVE = "effective"
    PARTIALLY_EFFECTIVE = "partially_effective"
    INEFFECTIVE = "ineffective"
    NOT_TESTED = "not_tested"


class AssessmentStatus(StrEnum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    EXPIRED = "expired"


class RCSAAssessment(BaseModel):
    assessment_id: UUID = Field(default_factory=uuid4)
    assessment_name: str
    business_unit: str
    process_name: str
    process_owner: str
    assessment_date: date
    due_date: date
    status: AssessmentStatus = AssessmentStatus.DRAFT
    assessor: str
    reviewer: str | None = None
    approver: str | None = None
    review_date: date | None = None
    approval_date: date | None = None
    next_assessment_date: date | None = None
    overall_risk_rating: str | None = None
    overall_control_rating: str | None = None
    total_risks_identified: int = 0
    total_controls_assessed: int = 0
    action_items_count: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class RCSARisk(BaseModel):
    risk_id: UUID = Field(default_factory=uuid4)
    assessment_id: UUID
    risk_reference: str
    risk_name: str
    risk_description: str
    risk_category: RiskCategory
    risk_owner: str
    inherent_likelihood: RiskLikelihood
    inherent_impact: RiskImpact
    inherent_risk_score: int
    inherent_risk_rating: str
    residual_likelihood: RiskLikelihood
    residual_impact: RiskImpact
    residual_risk_score: int
    residual_risk_rating: str
    target_likelihood: RiskLikelihood | None = None
    target_impact: RiskImpact | None = None
    target_risk_score: int | None = None
    risk_appetite: str
    within_appetite: bool = True
    trend: str = "stable"  # increasing, stable, decreasing
    controls_mapped: list[UUID] = Field(default_factory=list)
    action_required: bool = False


class RCSAControl(BaseModel):
    control_id: UUID = Field(default_factory=uuid4)
    assessment_id: UUID
    control_reference: str
    control_name: str
    control_description: str
    control_type: str  # preventive, detective, corrective
    control_nature: str  # manual, automated, semi-automated
    control_owner: str
    frequency: str
    design_effectiveness: ControlEffectiveness
    operating_effectiveness: ControlEffectiveness
    overall_effectiveness: ControlEffectiveness
    last_test_date: date | None = None
    next_test_date: date | None = None
    test_results: str | None = None
    risks_mitigated: list[UUID] = Field(default_factory=list)
    gaps_identified: list[str] = Field(default_factory=list)
    improvement_required: bool = False


class RCSAActionItem(BaseModel):
    action_id: UUID = Field(default_factory=uuid4)
    assessment_id: UUID
    risk_id: UUID | None = None
    control_id: UUID | None = None
    action_type: str  # risk_mitigation, control_improvement, gap_remediation
    action_description: str
    assigned_to: str
    due_date: date
    priority: str  # high, medium, low
    status: str = "open"
    completion_date: date | None = None
    verification_required: bool = True
    verified_by: str | None = None
    verification_date: date | None = None
    notes: str | None = None


class RiskHeatmap(BaseModel):
    heatmap_id: UUID = Field(default_factory=uuid4)
    assessment_id: UUID | None = None
    generated_date: date
    heatmap_type: str  # inherent, residual
    business_unit: str | None = None
    matrix_data: list[list[int]]  # 5x5 matrix with counts
    risk_distribution: dict[str, int]
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    total_risks: int


class RCSAReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    report_type: str
    period: str
    business_unit: str | None = None
    assessments_completed: int
    assessments_pending: int
    total_risks: int
    high_risks: int
    medium_risks: int
    low_risks: int
    risks_outside_appetite: int
    total_controls: int
    effective_controls: int
    partially_effective_controls: int
    ineffective_controls: int
    open_action_items: int
    overdue_action_items: int
    generated_by: str
