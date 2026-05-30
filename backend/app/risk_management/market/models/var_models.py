"""VaR Models - Value at Risk calculation models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class VaRMethod(StrEnum):
    HISTORICAL = "historical"
    PARAMETRIC = "parametric"
    MONTE_CARLO = "monte_carlo"


class ConfidenceLevel(StrEnum):
    CL_95 = "95"
    CL_99 = "99"
    CL_99_5 = "99.5"


class VaRCalculation(BaseModel):
    calculation_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    calculation_date: date
    method: VaRMethod
    confidence_level: ConfidenceLevel
    time_horizon_days: int = 1
    var_amount: float
    var_percentage: float
    portfolio_value: float
    expected_shortfall: float | None = None
    component_var: dict[str, float] = {}
    marginal_var: dict[str, float] = {}
    incremental_var: dict[str, float] = {}
    diversification_benefit: float = 0.0
    undiversified_var: float = 0.0
    model_parameters: dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class VaRBacktest(BaseModel):
    backtest_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    backtest_start: date
    backtest_end: date
    method: VaRMethod
    confidence_level: ConfidenceLevel
    total_observations: int
    exceptions: int
    exception_rate: float
    expected_exceptions: float
    kupiec_test_stat: float
    kupiec_p_value: float
    christoffersen_test_stat: float | None = None
    traffic_light_zone: str  # green, yellow, red
    pass_fail: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class VaRLimit(BaseModel):
    limit_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    limit_type: str  # var, expected_shortfall
    limit_amount: float
    current_var: float
    utilization_percentage: float
    warning_threshold: float = 80.0
    breach_status: bool = False
    effective_date: date
    expiry_date: date | None = None
    approved_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class VaRException(BaseModel):
    exception_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    exception_date: date
    predicted_var: float
    actual_loss: float
    exception_amount: float
    exception_multiplier: float
    explanation: str | None = None
    market_conditions: dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class VaRStatistics(BaseModel):
    total_calculations: int = 0
    average_var: float = 0.0
    total_exceptions: int = 0
    average_exception_rate: float = 0.0
    by_method: dict[str, int] = {}
