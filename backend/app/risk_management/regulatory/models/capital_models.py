"""Capital Models - Data models for regulatory capital management"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CapitalInstrumentType(StrEnum):
    COMMON_EQUITY = "common_equity"
    RETAINED_EARNINGS = "retained_earnings"
    AOCI = "aoci"
    MINORITY_INTEREST = "minority_interest"
    PREFERRED_STOCK = "preferred_stock"
    CONTINGENT_CONVERTIBLE = "contingent_convertible"
    SUBORDINATED_DEBT = "subordinated_debt"


class DeductionType(StrEnum):
    GOODWILL = "goodwill"
    INTANGIBLES = "intangibles"
    DTA = "dta"
    MSR = "msr"
    PENSION = "pension"
    RECIPROCAL_HOLDINGS = "reciprocal_holdings"
    SIGNIFICANT_INVESTMENTS = "significant_investments"


class CapitalInstrument(BaseModel):
    instrument_id: UUID = Field(default_factory=uuid4)
    instrument_code: str
    instrument_type: CapitalInstrumentType
    tier: str  # CET1, AT1, Tier2
    issuer: str
    issue_date: date
    maturity_date: date | None = None
    perpetual: bool = False
    nominal_amount: Decimal
    carrying_amount: Decimal
    eligible_amount: Decimal
    coupon_rate: Decimal | None = None
    coupon_frequency: str | None = None
    call_date: date | None = None
    step_up: bool = False
    conversion_trigger: str | None = None
    write_down_trigger: str | None = None
    governing_law: str
    grandfathered: bool = False
    grandfathering_end_date: date | None = None
    is_active: bool = True


class CapitalDeduction(BaseModel):
    deduction_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    deduction_type: DeductionType
    tier: str
    gross_amount: Decimal
    threshold_amount: Decimal | None = None
    deduction_amount: Decimal
    rwa_treatment_amount: Decimal | None = None
    description: str
    reference: str
    methodology: str


class CapitalPosition(BaseModel):
    position_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    entity_id: str
    cet1_gross: Decimal
    cet1_deductions: Decimal
    cet1_adjustments: Decimal
    cet1_net: Decimal
    at1_gross: Decimal
    at1_deductions: Decimal
    at1_net: Decimal
    tier1_capital: Decimal
    tier2_gross: Decimal
    tier2_deductions: Decimal
    tier2_net: Decimal
    total_capital: Decimal
    total_rwa: Decimal
    cet1_ratio: Decimal
    tier1_ratio: Decimal
    total_capital_ratio: Decimal
    leverage_exposure: Decimal
    leverage_ratio: Decimal


class CapitalPlan(BaseModel):
    plan_id: UUID = Field(default_factory=uuid4)
    plan_name: str
    plan_year: int
    entity_id: str
    baseline_capital: Decimal
    target_cet1_ratio: Decimal
    target_tier1_ratio: Decimal
    target_total_ratio: Decimal
    planned_issuances: list[dict[str, Any]]
    planned_redemptions: list[dict[str, Any]]
    dividend_assumptions: dict[str, Decimal]
    rwa_projections: dict[str, Decimal]
    stress_scenario_results: dict[str, Any]
    contingency_actions: list[str]
    approval_status: str = "draft"
    approved_by: str | None = None
    approval_date: date | None = None


class StressTestCapital(BaseModel):
    stress_id: UUID = Field(default_factory=uuid4)
    scenario_name: str
    scenario_type: str  # baseline, adverse, severely_adverse
    reporting_date: date
    projection_period: str
    starting_capital: Decimal
    projected_capital: Decimal
    capital_impact: Decimal
    rwa_impact: Decimal
    pre_provision_net_revenue: Decimal
    credit_losses: Decimal
    market_losses: Decimal
    operational_losses: Decimal
    other_impacts: Decimal
    minimum_cet1_ratio: Decimal
    minimum_tier1_ratio: Decimal
    minimum_total_ratio: Decimal
    capital_shortfall: Decimal
    management_actions: list[str]
    remediation_timeline: str | None = None


class CapitalLimit(BaseModel):
    limit_id: UUID = Field(default_factory=uuid4)
    limit_type: str  # regulatory, internal, buffer
    metric: str  # cet1_ratio, tier1_ratio, total_ratio, leverage
    minimum_value: Decimal
    warning_threshold: Decimal
    target_value: Decimal
    current_value: Decimal
    headroom: Decimal
    status: str  # green, amber, red
    effective_date: date
    review_date: date
    approved_by: str


class CapitalAllocation(BaseModel):
    allocation_id: UUID = Field(default_factory=uuid4)
    allocation_date: date
    business_unit: str
    allocated_capital: Decimal
    rwa_consumption: Decimal
    return_on_allocated_capital: Decimal
    economic_profit: Decimal
    hurdle_rate: Decimal
    capital_efficiency: Decimal
    allocation_methodology: str


class CapitalReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    report_type: str
    entity_id: str
    total_capital: Decimal
    cet1_ratio: Decimal
    tier1_ratio: Decimal
    total_ratio: Decimal
    leverage_ratio: Decimal
    capital_surplus: Decimal
    rwa_total: Decimal
    rwa_density: Decimal
    capital_instruments_count: int
    upcoming_maturities: list[dict[str, Any]]
    stress_test_results: dict[str, Any]
    regulatory_requirements: dict[str, Decimal]
    buffer_utilization: dict[str, Decimal]
    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
