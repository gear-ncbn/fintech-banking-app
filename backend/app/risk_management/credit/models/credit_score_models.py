"""Credit Score Models - Credit scoring and assessment models"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ScoreType(StrEnum):
    FICO = "fico"
    INTERNAL = "internal"
    BEHAVIORAL = "behavioral"
    APPLICATION = "application"
    BUREAU = "bureau"


class ScoreCategory(StrEnum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    VERY_POOR = "very_poor"


class CreditScoreSource(StrEnum):
    EQUIFAX = "equifax"
    EXPERIAN = "experian"
    TRANSUNION = "transunion"
    INTERNAL = "internal"


class CreditScore(BaseModel):
    score_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    score_type: ScoreType
    score_value: int = Field(ge=300, le=850)
    score_category: ScoreCategory
    score_source: CreditScoreSource = CreditScoreSource.INTERNAL
    score_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    valid_until: datetime | None = None
    score_factors: list[dict[str, Any]] = []
    positive_factors: list[str] = []
    negative_factors: list[str] = []
    score_change: int = 0
    previous_score: int | None = None
    confidence_level: float = Field(default=0.85, ge=0, le=1)
    model_version: str = "1.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CreditScoreFactor(BaseModel):
    factor_id: UUID = Field(default_factory=uuid4)
    factor_code: str
    factor_name: str
    factor_category: str
    impact_type: str  # positive, negative
    impact_weight: float = Field(ge=-100, le=100)
    factor_value: Any
    factor_description: str
    recommendation: str | None = None


class CreditScoreHistory(BaseModel):
    history_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    scores: list[CreditScore] = []
    trend: str = "stable"  # improving, declining, stable
    average_score: float = 0.0
    highest_score: int = 0
    lowest_score: int = 0
    score_volatility: float = 0.0
    period_start: datetime = Field(default_factory=lambda: datetime.now(UTC))
    period_end: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CreditScoreRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    request_type: str
    purpose: str
    requested_by: str
    request_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: str = "pending"
    result_score: CreditScore | None = None
    completed_at: datetime | None = None


class ScoreSimulation(BaseModel):
    simulation_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    current_score: int
    simulated_score: int
    score_change: int
    simulation_scenarios: list[dict[str, Any]] = []
    simulation_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: str


class CreditScoreStatistics(BaseModel):
    total_scores: int = 0
    average_score: float = 0.0
    by_category: dict[str, int] = {}
    by_source: dict[str, int] = {}
    scores_today: int = 0
