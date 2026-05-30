"""Rating Models - Credit rating and grading models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class RatingType(StrEnum):
    INTERNAL = "internal"
    EXTERNAL = "external"
    SHADOW = "shadow"
    BEHAVIORAL = "behavioral"


class RatingAgency(StrEnum):
    MOODYS = "moodys"
    SP = "sp"
    FITCH = "fitch"
    INTERNAL = "internal"


class RatingOutlook(StrEnum):
    POSITIVE = "positive"
    STABLE = "stable"
    NEGATIVE = "negative"
    DEVELOPING = "developing"


class CreditRating(BaseModel):
    rating_id: UUID = Field(default_factory=uuid4)
    entity_id: str
    entity_name: str
    entity_type: str  # customer, counterparty, obligor
    rating_type: RatingType
    rating_agency: RatingAgency
    rating_grade: str  # AAA, AA+, etc.
    rating_score: int = Field(ge=1, le=22)
    rating_category: str  # investment_grade, sub_investment_grade, default
    outlook: RatingOutlook = RatingOutlook.STABLE
    probability_of_default: float = Field(ge=0, le=1)
    loss_given_default: float = Field(ge=0, le=1)
    rating_date: date
    effective_date: date
    review_date: date
    expiry_date: date | None = None
    previous_rating: str | None = None
    rating_change: str | None = None  # upgrade, downgrade, affirmed
    rating_factors: list[dict[str, Any]] = []
    rating_rationale: str
    rated_by: str
    approved_by: str | None = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RatingScale(BaseModel):
    scale_id: UUID = Field(default_factory=uuid4)
    scale_name: str
    rating_agency: RatingAgency
    grades: list[dict[str, Any]] = []
    default_grade: str
    pd_mapping: dict[str, float] = {}
    lgd_mapping: dict[str, float] = {}
    is_active: bool = True
    effective_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RatingGrade(BaseModel):
    grade_id: UUID = Field(default_factory=uuid4)
    scale_id: UUID
    grade_code: str
    grade_name: str
    grade_rank: int
    category: str
    pd_lower_bound: float
    pd_upper_bound: float
    pd_midpoint: float
    lgd_assumption: float
    risk_weight: float
    description: str


class RatingModel(BaseModel):
    model_id: UUID = Field(default_factory=uuid4)
    model_name: str
    model_type: str  # scorecard, statistical, expert
    entity_type: str
    segment: str
    version: str
    factors: list[dict[str, Any]] = []
    factor_weights: dict[str, float] = {}
    calibration_date: date
    validation_date: date | None = None
    accuracy_metrics: dict[str, float] = {}
    status: str = "active"
    created_by: str
    approved_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RatingMigration(BaseModel):
    migration_id: UUID = Field(default_factory=uuid4)
    entity_id: str
    entity_name: str
    from_rating: str
    to_rating: str
    migration_type: str  # upgrade, downgrade, default
    migration_date: date
    migration_reason: str
    trigger_events: list[str] = []
    migration_steps: int = 0
    previous_pd: float
    new_pd: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RatingReview(BaseModel):
    review_id: UUID = Field(default_factory=uuid4)
    rating_id: UUID
    entity_id: str
    review_type: str  # annual, trigger, interim
    review_date: date
    current_rating: str
    proposed_rating: str
    rating_action: str  # affirm, upgrade, downgrade, withdraw
    financial_analysis: dict[str, Any] = {}
    qualitative_factors: dict[str, Any] = {}
    industry_analysis: dict[str, Any] = {}
    peer_comparison: dict[str, Any] = {}
    recommendation: str
    reviewed_by: str
    review_notes: str
    status: str = "pending"
    approved_by: str | None = None
    approved_date: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RatingOverride(BaseModel):
    override_id: UUID = Field(default_factory=uuid4)
    rating_id: UUID
    entity_id: str
    model_rating: str
    override_rating: str
    override_reason: str
    override_type: str  # quantitative, qualitative, expert
    supporting_factors: list[str] = []
    override_date: date
    expiry_date: date
    approved_by: str
    approval_date: datetime
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RatingStatistics(BaseModel):
    total_ratings: int = 0
    by_grade: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_outlook: dict[str, int] = {}
    upgrades_ytd: int = 0
    downgrades_ytd: int = 0
    defaults_ytd: int = 0
    average_pd: float = 0.0
