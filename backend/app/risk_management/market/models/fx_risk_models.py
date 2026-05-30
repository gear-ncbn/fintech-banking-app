"""FX Risk Models - Foreign exchange risk management models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class FXPositionType(StrEnum):
    SPOT = "spot"
    FORWARD = "forward"
    SWAP = "swap"
    OPTION = "option"
    NDF = "ndf"


class FXPosition(BaseModel):
    position_id: UUID = Field(default_factory=uuid4)
    position_type: FXPositionType
    currency_pair: str
    base_currency: str
    quote_currency: str
    notional_amount: float
    direction: str  # long, short
    spot_rate: float
    forward_rate: float | None = None
    value_date: date
    maturity_date: date | None = None
    mtm_value: float = 0.0
    unrealized_pnl: float = 0.0
    delta: float = 0.0
    portfolio_id: UUID
    counterparty_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FXExposure(BaseModel):
    exposure_id: UUID = Field(default_factory=uuid4)
    currency: str
    gross_long: float
    gross_short: float
    net_position: float
    spot_equivalent: float
    delta_equivalent: float
    var_contribution: float
    stress_loss: float
    hedge_ratio: float = 0.0
    as_of_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FXRate(BaseModel):
    rate_id: UUID = Field(default_factory=uuid4)
    currency_pair: str
    base_currency: str
    quote_currency: str
    spot_rate: float
    bid_rate: float
    ask_rate: float
    mid_rate: float
    forward_points: dict[str, float] = {}
    volatility: float
    rate_date: date
    rate_time: datetime
    source: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FXVolatilitySurface(BaseModel):
    surface_id: UUID = Field(default_factory=uuid4)
    currency_pair: str
    surface_date: date
    tenors: list[str] = []
    deltas: list[float] = []
    volatilities: list[list[float]] = []
    atm_vols: dict[str, float] = {}
    risk_reversals: dict[str, float] = {}
    butterflies: dict[str, float] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FXScenario(BaseModel):
    scenario_id: UUID = Field(default_factory=uuid4)
    scenario_name: str
    scenario_type: str  # historical, hypothetical
    rate_shocks: dict[str, float] = {}
    vol_shocks: dict[str, float] = {}
    correlation_shocks: dict[str, float] = {}
    pnl_impact: float
    var_impact: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FXRiskStatistics(BaseModel):
    total_positions: int = 0
    total_notional: float = 0.0
    net_fx_exposure: float = 0.0
    fx_var: float = 0.0
    by_currency: dict[str, float] = {}
