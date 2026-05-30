"""Stress Test Models - Market risk stress testing models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ScenarioType(StrEnum):
    HISTORICAL = "historical"
    HYPOTHETICAL = "hypothetical"
    REVERSE = "reverse"
    SENSITIVITY = "sensitivity"


class ScenarioSeverity(StrEnum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


class StressScenario(BaseModel):
    scenario_id: UUID = Field(default_factory=uuid4)
    scenario_name: str
    scenario_type: ScenarioType
    severity: ScenarioSeverity
    description: str
    equity_shocks: dict[str, float] = {}
    fx_shocks: dict[str, float] = {}
    ir_shocks: dict[str, float] = {}
    credit_spread_shocks: dict[str, float] = {}
    commodity_shocks: dict[str, float] = {}
    volatility_shocks: dict[str, float] = {}
    correlation_adjustments: dict[str, float] = {}
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class StressTestResult(BaseModel):
    result_id: UUID = Field(default_factory=uuid4)
    scenario_id: UUID
    portfolio_id: UUID
    test_date: date
    portfolio_value_before: float
    portfolio_value_after: float
    pnl_impact: float
    pnl_impact_percentage: float
    var_before: float
    var_after: float
    var_change: float
    risk_factor_contributions: dict[str, float] = {}
    position_level_impacts: list[dict[str, Any]] = []
    breach_limits: list[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HistoricalScenario(BaseModel):
    scenario_id: UUID = Field(default_factory=uuid4)
    scenario_name: str
    event_name: str
    event_date: date
    event_duration_days: int
    description: str
    market_data_changes: dict[str, dict[str, float]] = {}
    max_drawdown: float
    recovery_days: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SensitivityAnalysis(BaseModel):
    analysis_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    analysis_date: date
    risk_factor: str
    shock_sizes: list[float] = []
    pnl_impacts: list[float] = []
    sensitivity: float
    convexity: float
    breakeven_point: float | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ReverseStressTest(BaseModel):
    test_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    test_date: date
    target_loss: float
    identified_scenarios: list[dict[str, Any]] = []
    probability_assessment: str
    risk_factors_required: list[str] = []
    plausibility_score: float = Field(ge=0, le=100)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class StressTestStatistics(BaseModel):
    total_scenarios: int = 0
    total_tests_run: int = 0
    average_pnl_impact: float = 0.0
    worst_case_loss: float = 0.0
    by_severity: dict[str, int] = {}
