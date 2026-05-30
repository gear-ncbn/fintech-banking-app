"""Commodity Models - Commodity risk management models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CommodityType(StrEnum):
    ENERGY = "energy"
    METALS = "metals"
    AGRICULTURE = "agriculture"
    LIVESTOCK = "livestock"
    SOFTS = "softs"


class CommodityPositionType(StrEnum):
    PHYSICAL = "physical"
    FUTURE = "future"
    FORWARD = "forward"
    OPTION = "option"
    SWAP = "swap"


class CommodityPosition(BaseModel):
    position_id: UUID = Field(default_factory=uuid4)
    commodity_type: CommodityType
    position_type: CommodityPositionType
    commodity_name: str
    contract_code: str
    quantity: float
    unit: str
    direction: str  # long, short
    entry_price: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    delivery_date: date | None = None
    delivery_location: str | None = None
    portfolio_id: UUID
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommodityCurve(BaseModel):
    curve_id: UUID = Field(default_factory=uuid4)
    commodity_name: str
    commodity_type: CommodityType
    curve_date: date
    contract_months: list[str] = []
    prices: list[float] = []
    curve_shape: str  # contango, backwardation, flat
    roll_yield: float
    convenience_yield: float
    storage_cost: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommodityExposure(BaseModel):
    exposure_id: UUID = Field(default_factory=uuid4)
    commodity_type: CommodityType
    commodity_name: str
    gross_long: float
    gross_short: float
    net_position: float
    notional_value: float
    delta_equivalent: float
    var_contribution: float
    stress_loss: float
    as_of_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommodityScenario(BaseModel):
    scenario_id: UUID = Field(default_factory=uuid4)
    scenario_name: str
    scenario_type: str
    price_shocks: dict[str, float] = {}
    volatility_shocks: dict[str, float] = {}
    curve_shocks: dict[str, float] = {}
    pnl_impact: float
    var_impact: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommodityRiskStatistics(BaseModel):
    total_positions: int = 0
    total_notional: float = 0.0
    commodity_var: float = 0.0
    by_type: dict[str, float] = {}
