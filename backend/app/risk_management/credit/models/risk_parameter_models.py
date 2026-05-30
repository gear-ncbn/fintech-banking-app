"""Risk Parameter Models - PD, LGD, EAD modeling"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ParameterType(StrEnum):
    PD = "pd"  # Probability of Default
    LGD = "lgd"  # Loss Given Default
    EAD = "ead"  # Exposure at Default
    CCF = "ccf"  # Credit Conversion Factor
    EL = "el"  # Expected Loss
    UL = "ul"  # Unexpected Loss


class ModelApproach(StrEnum):
    STANDARDIZED = "standardized"
    FOUNDATION_IRB = "foundation_irb"
    ADVANCED_IRB = "advanced_irb"


class PDModel(BaseModel):
    model_id: UUID = Field(default_factory=uuid4)
    model_name: str
    segment: str
    model_approach: ModelApproach
    version: str
    methodology: str
    calibration_date: date
    through_the_cycle_pd: float
    point_in_time_pd: float
    long_run_average_pd: float
    economic_cycle_adjustment: float = 0.0
    model_factors: list[dict[str, Any]] = []
    validation_results: dict[str, float] = {}
    regulatory_floor: float = 0.0003
    status: str = "active"
    created_by: str
    approved_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LGDModel(BaseModel):
    model_id: UUID = Field(default_factory=uuid4)
    model_name: str
    segment: str
    collateral_type: str | None = None
    model_approach: ModelApproach
    version: str
    methodology: str
    calibration_date: date
    downturn_lgd: float
    long_run_average_lgd: float
    recovery_rate: float
    cure_rate: float
    workout_lgd: float
    collateral_recovery_rate: float = 0.0
    time_to_resolution_months: int = 12
    discount_rate: float = 0.05
    model_factors: list[dict[str, Any]] = []
    validation_results: dict[str, float] = {}
    regulatory_floor: float = 0.0
    status: str = "active"
    created_by: str
    approved_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EADModel(BaseModel):
    model_id: UUID = Field(default_factory=uuid4)
    model_name: str
    product_type: str
    model_approach: ModelApproach
    version: str
    methodology: str
    calibration_date: date
    credit_conversion_factor: float = Field(ge=0, le=1)
    utilization_at_default: float
    limit_at_default: float
    undrawn_at_default: float
    additional_drawdown_factor: float = 0.0
    model_factors: list[dict[str, Any]] = []
    validation_results: dict[str, float] = {}
    status: str = "active"
    created_by: str
    approved_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RiskParameterEstimate(BaseModel):
    estimate_id: UUID = Field(default_factory=uuid4)
    entity_id: str
    entity_type: str
    segment: str
    parameter_type: ParameterType
    point_estimate: float
    lower_bound: float
    upper_bound: float
    confidence_level: float = 0.95
    estimation_date: date
    model_id: UUID
    model_version: str
    input_factors: dict[str, Any] = {}
    adjustment_factors: dict[str, float] = {}
    regulatory_adjustment: float = 0.0
    final_estimate: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExpectedLossCalculation(BaseModel):
    calculation_id: UUID = Field(default_factory=uuid4)
    entity_id: str
    facility_id: UUID | None = None
    calculation_date: date
    exposure_at_default: float
    probability_of_default: float
    loss_given_default: float
    expected_loss: float
    expected_loss_percentage: float
    provision_required: float
    provision_shortfall: float = 0.0
    risk_weighted_assets: float
    capital_requirement: float
    calculation_approach: ModelApproach
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class UnexpectedLossCalculation(BaseModel):
    calculation_id: UUID = Field(default_factory=uuid4)
    entity_id: str
    portfolio_id: UUID | None = None
    calculation_date: date
    unexpected_loss: float
    value_at_risk: float
    confidence_level: float = 0.999
    time_horizon_days: int = 252
    correlation_factor: float
    asset_correlation: float
    maturity_adjustment: float
    economic_capital: float
    regulatory_capital: float
    capital_buffer: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ParameterBacktest(BaseModel):
    backtest_id: UUID = Field(default_factory=uuid4)
    model_id: UUID
    parameter_type: ParameterType
    backtest_period_start: date
    backtest_period_end: date
    predicted_values: list[float] = []
    actual_values: list[float] = []
    accuracy_ratio: float
    binomial_test_result: str
    hosmer_lemeshow_stat: float | None = None
    kolmogorov_smirnov_stat: float | None = None
    gini_coefficient: float | None = None
    information_value: float | None = None
    pass_fail: str
    observations: str
    backtested_by: str
    backtest_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ParameterStressTest(BaseModel):
    stress_test_id: UUID = Field(default_factory=uuid4)
    parameter_type: ParameterType
    scenario_name: str
    base_value: float
    stressed_value: float
    stress_multiplier: float
    stress_factors: dict[str, float] = {}
    economic_variables: dict[str, float] = {}
    impact_assessment: str
    test_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    tested_by: str


class RiskParameterStatistics(BaseModel):
    total_pd_models: int = 0
    total_lgd_models: int = 0
    total_ead_models: int = 0
    average_pd: float = 0.0
    average_lgd: float = 0.0
    total_expected_loss: float = 0.0
    total_rwa: float = 0.0
