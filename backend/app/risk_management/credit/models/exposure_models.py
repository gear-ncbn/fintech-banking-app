"""Exposure Models - Credit exposure calculation models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ExposureType(StrEnum):
    FUNDED = "funded"
    UNFUNDED = "unfunded"
    CONTINGENT = "contingent"
    DERIVATIVE = "derivative"
    OFF_BALANCE = "off_balance"


class ExposureCategory(StrEnum):
    LOAN = "loan"
    CREDIT_LINE = "credit_line"
    LETTER_OF_CREDIT = "letter_of_credit"
    GUARANTEE = "guarantee"
    DERIVATIVE = "derivative"
    TRADE_FINANCE = "trade_finance"


class CreditExposure(BaseModel):
    exposure_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    customer_name: str
    facility_id: UUID | None = None
    exposure_type: ExposureType
    exposure_category: ExposureCategory
    gross_exposure: float
    net_exposure: float
    collateral_value: float = 0.0
    guarantees_value: float = 0.0
    credit_conversion_factor: float = Field(default=1.0, ge=0, le=1)
    exposure_at_default: float
    drawn_amount: float = 0.0
    undrawn_amount: float = 0.0
    limit_amount: float
    limit_utilization: float = 0.0
    currency: str = "USD"
    maturity_date: date | None = None
    risk_weight: float = Field(default=1.0, ge=0)
    risk_weighted_assets: float = 0.0
    expected_loss: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExposureAggregate(BaseModel):
    aggregate_id: UUID = Field(default_factory=uuid4)
    aggregation_level: str  # customer, group, industry, country
    aggregation_key: str
    aggregation_name: str
    total_gross_exposure: float
    total_net_exposure: float
    total_ead: float
    total_rwa: float
    number_of_exposures: int
    weighted_average_pd: float
    weighted_average_lgd: float
    expected_loss: float
    limit_amount: float | None = None
    limit_utilization: float = 0.0
    as_of_date: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExposureLimit(BaseModel):
    limit_id: UUID = Field(default_factory=uuid4)
    limit_type: str  # customer, group, industry, country, product
    limit_key: str
    limit_name: str
    limit_amount: float
    current_exposure: float
    available_amount: float
    utilization_percentage: float
    warning_threshold: float = 0.8
    breach_threshold: float = 1.0
    status: str = "active"  # active, warning, breach
    effective_date: date
    expiry_date: date | None = None
    approved_by: str
    approved_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LargeExposure(BaseModel):
    exposure_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    customer_name: str
    group_id: str | None = None
    group_name: str | None = None
    total_exposure: float
    exposure_as_percentage_of_capital: float
    regulatory_limit_percentage: float = 25.0
    breach_status: bool = False
    breach_amount: float | None = None
    exemptions: list[str] = []
    reporting_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CounterpartyExposure(BaseModel):
    counterparty_id: UUID = Field(default_factory=uuid4)
    counterparty_name: str
    counterparty_type: str  # bank, corporate, sovereign, retail
    internal_rating: str
    external_rating: str | None = None
    country: str
    industry: str
    total_on_balance: float
    total_off_balance: float
    total_derivatives: float
    total_exposure: float
    potential_future_exposure: float
    credit_valuation_adjustment: float = 0.0
    netting_benefits: float = 0.0
    collateral_held: float = 0.0
    net_exposure: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExposureMovement(BaseModel):
    movement_id: UUID = Field(default_factory=uuid4)
    exposure_id: UUID
    movement_date: date
    movement_type: str  # increase, decrease, new, closure
    previous_exposure: float
    new_exposure: float
    change_amount: float
    change_reason: str
    approved_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExposureStatistics(BaseModel):
    total_gross_exposure: float = 0.0
    total_net_exposure: float = 0.0
    total_ead: float = 0.0
    total_rwa: float = 0.0
    by_type: dict[str, float] = {}
    by_category: dict[str, float] = {}
    number_of_exposures: int = 0
    average_utilization: float = 0.0
