"""
Customer Risk Models

Defines data structures for customer risk assessment and profiling.
"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CustomerRiskLevel(StrEnum):
    """Customer risk classification"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    PROHIBITED = "prohibited"


class CustomerType(StrEnum):
    """Type of customer"""
    INDIVIDUAL = "individual"
    SOLE_PROPRIETOR = "sole_proprietor"
    PARTNERSHIP = "partnership"
    CORPORATION = "corporation"
    LLC = "llc"
    NON_PROFIT = "non_profit"
    GOVERNMENT = "government"
    TRUST = "trust"
    FINANCIAL_INSTITUTION = "financial_institution"


class PEPStatus(StrEnum):
    """Politically Exposed Person status"""
    NOT_PEP = "not_pep"
    PEP = "pep"
    PEP_FAMILY = "pep_family"
    PEP_ASSOCIATE = "pep_associate"


class RiskFactorCategory(StrEnum):
    """Categories of risk factors"""
    GEOGRAPHY = "geography"
    PRODUCT = "product"
    CHANNEL = "channel"
    CUSTOMER = "customer"
    TRANSACTION = "transaction"
    INDUSTRY = "industry"


class GeographicRisk(BaseModel):
    """Geographic risk assessment"""
    country_code: str
    country_name: str
    risk_level: str
    risk_score: float
    is_sanctioned: bool = False
    is_high_risk_jurisdiction: bool = False
    fatf_status: str | None = None
    corruption_index: float | None = None
    aml_index: float | None = None


class RiskFactor(BaseModel):
    """Individual risk factor"""
    factor_id: UUID = Field(default_factory=uuid4)
    category: RiskFactorCategory
    factor_code: str
    factor_name: str
    description: str
    weight: float = 1.0
    score: float
    evidence: str | None = None
    identified_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime | None = None
    source: str = "system"


class BehaviorProfile(BaseModel):
    """Customer transaction behavior profile"""
    profile_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    # Transaction patterns
    avg_monthly_transaction_count: float = 0.0
    avg_monthly_transaction_amount: float = 0.0
    avg_transaction_size: float = 0.0
    max_transaction_size: float = 0.0

    # Time patterns
    typical_transaction_days: list[int] = Field(default_factory=list)  # 0-6
    typical_transaction_hours: list[int] = Field(default_factory=list)  # 0-23

    # Geographic patterns
    typical_countries: list[str] = Field(default_factory=list)
    high_risk_country_exposure: float = 0.0

    # Channel patterns
    primary_channels: list[str] = Field(default_factory=list)

    # Product patterns
    product_types_used: list[str] = Field(default_factory=list)

    # Counterparty patterns
    unique_counterparties_per_month: float = 0.0
    recurring_counterparties: list[str] = Field(default_factory=list)

    # Calculated metrics
    velocity_score: float = 0.0
    diversity_score: float = 0.0
    consistency_score: float = 0.0

    # Timestamps
    profile_period_start: datetime
    profile_period_end: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CustomerRiskAssessment(BaseModel):
    """Customer risk assessment result"""
    assessment_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Risk classification
    risk_level: CustomerRiskLevel
    overall_risk_score: float = Field(ge=0, le=100)

    # Component scores
    inherent_risk_score: float = 0.0
    control_effectiveness_score: float = 0.0
    residual_risk_score: float = 0.0

    # Category scores
    geography_risk_score: float = 0.0
    product_risk_score: float = 0.0
    channel_risk_score: float = 0.0
    customer_risk_score: float = 0.0
    transaction_risk_score: float = 0.0
    industry_risk_score: float = 0.0

    # Risk factors
    risk_factors: list[RiskFactor] = Field(default_factory=list)

    # Special statuses
    pep_status: PEPStatus = PEPStatus.NOT_PEP
    pep_details: str | None = None
    sanctions_status: bool = False
    sanctions_details: str | None = None
    adverse_media_flag: bool = False
    adverse_media_details: str | None = None

    # Approval
    requires_approval: bool = False
    approved_by: str | None = None
    approved_at: datetime | None = None
    approval_notes: str | None = None

    # Next review
    next_review_date: date | None = None
    review_frequency_months: int = 12

    # Metadata
    assessment_type: str = "periodic"  # periodic, event-triggered, onboarding
    triggered_by: str | None = None
    model_version: str = "1.0"


class CustomerRiskProfile(BaseModel):
    """Complete customer risk profile"""
    profile_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    # Basic information
    customer_type: CustomerType
    customer_name: str
    customer_since: datetime
    relationship_manager: str | None = None

    # Current risk status
    current_risk_level: CustomerRiskLevel
    current_risk_score: float
    last_assessment_date: datetime
    next_review_date: date

    # Risk history
    risk_assessment_history: list[CustomerRiskAssessment] = Field(default_factory=list)

    # Geographic exposure
    country_of_residence: str
    countries_of_operation: list[str] = Field(default_factory=list)
    geographic_risks: list[GeographicRisk] = Field(default_factory=list)

    # Behavior profile
    behavior_profile: BehaviorProfile | None = None

    # Special flags
    pep_status: PEPStatus = PEPStatus.NOT_PEP
    sanctions_match: bool = False
    adverse_media: bool = False
    on_watchlist: bool = False
    under_investigation: bool = False

    # EDD requirements
    requires_edd: bool = False
    edd_reason: str | None = None
    edd_last_completed: datetime | None = None

    # Active risk factors
    active_risk_factors: list[RiskFactor] = Field(default_factory=list)

    # Alerts and cases
    open_alerts_count: int = 0
    open_cases_count: int = 0
    total_sars_filed: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RiskScoreCalculation(BaseModel):
    """Details of risk score calculation"""
    calculation_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    calculation_date: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Input factors
    input_factors: list[dict[str, Any]] = Field(default_factory=list)

    # Weights applied
    category_weights: dict[str, float] = Field(default_factory=dict)

    # Intermediate scores
    category_scores: dict[str, float] = Field(default_factory=dict)

    # Final calculation
    weighted_score: float
    adjustments: list[dict[str, Any]] = Field(default_factory=list)
    final_score: float
    risk_level: CustomerRiskLevel

    # Model information
    model_name: str
    model_version: str
    confidence_score: float = 1.0


class RiskOverrideRequest(BaseModel):
    """Request to override customer risk level"""
    override_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    current_risk_level: CustomerRiskLevel
    requested_risk_level: CustomerRiskLevel
    reason: str
    justification: str
    supporting_documents: list[str] = Field(default_factory=list)
    requested_by: str
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    review_deadline: datetime

    # Approval chain
    requires_approval_from: list[str] = Field(default_factory=list)
    approvals: list[dict[str, Any]] = Field(default_factory=list)
    status: str = "pending"  # pending, approved, rejected

    # Validity
    valid_from: datetime | None = None
    valid_until: datetime | None = None


class CustomerRiskSummary(BaseModel):
    """Summary view of customer risk for listings"""
    customer_id: str
    customer_name: str
    customer_type: CustomerType
    risk_level: CustomerRiskLevel
    risk_score: float
    pep_status: PEPStatus
    sanctions_match: bool
    open_alerts: int
    open_cases: int
    last_assessment: datetime
    next_review: date
    requires_attention: bool
