"""Interest Rate Models - Interest rate risk management models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class RateType(StrEnum):
    OVERNIGHT = "overnight"
    SHORT_TERM = "short_term"
    MEDIUM_TERM = "medium_term"
    LONG_TERM = "long_term"


class CurveType(StrEnum):
    YIELD = "yield"
    DISCOUNT = "discount"
    FORWARD = "forward"
    ZERO = "zero"


class InterestRateCurve(BaseModel):
    curve_id: UUID = Field(default_factory=uuid4)
    curve_name: str
    curve_type: CurveType
    currency: str
    reference_date: date
    tenors: list[str] = []
    rates: list[float] = []
    interpolation_method: str = "linear"
    source: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DurationAnalysis(BaseModel):
    analysis_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    analysis_date: date
    modified_duration: float
    macaulay_duration: float
    effective_duration: float
    dollar_duration: float
    dv01: float  # Dollar Value of 01 basis point
    convexity: float
    portfolio_value: float
    yield_to_maturity: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class GapAnalysis(BaseModel):
    analysis_id: UUID = Field(default_factory=uuid4)
    analysis_date: date
    time_buckets: list[str] = []
    rate_sensitive_assets: list[float] = []
    rate_sensitive_liabilities: list[float] = []
    gap_amounts: list[float] = []
    cumulative_gap: list[float] = []
    gap_ratio: list[float] = []
    net_interest_income_impact: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RateShockScenario(BaseModel):
    scenario_id: UUID = Field(default_factory=uuid4)
    scenario_name: str
    scenario_type: str  # parallel, twist, steepening, flattening
    shock_amounts: dict[str, float] = {}
    base_curve_id: UUID
    stressed_rates: dict[str, float] = {}
    pnl_impact: float
    duration_impact: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class InterestRateRisk(BaseModel):
    risk_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    assessment_date: date
    repricing_risk: float
    yield_curve_risk: float
    basis_risk: float
    optionality_risk: float
    total_ir_risk: float
    economic_value_sensitivity: float
    earnings_at_risk: float
    net_interest_income_at_risk: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class InterestRateStatistics(BaseModel):
    total_curves: int = 0
    average_duration: float = 0.0
    total_dv01: float = 0.0
    by_currency: dict[str, float] = {}
