"""Basel Models - Data models for Basel III/IV regulatory compliance"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class RiskCategory(StrEnum):
    CREDIT = "credit"
    MARKET = "market"
    OPERATIONAL = "operational"
    CVA = "cva"
    LEVERAGE = "leverage"


class CapitalTier(StrEnum):
    CET1 = "cet1"
    AT1 = "at1"
    TIER2 = "tier2"


class AssetClassBasel(StrEnum):
    SOVEREIGN = "sovereign"
    BANK = "bank"
    CORPORATE = "corporate"
    RETAIL = "retail"
    RESIDENTIAL_MORTGAGE = "residential_mortgage"
    COMMERCIAL_REAL_ESTATE = "commercial_real_estate"
    EQUITY = "equity"
    SECURITIZATION = "securitization"


class BaselCapitalRequirement(BaseModel):
    requirement_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    entity_id: str
    entity_name: str
    risk_category: RiskCategory
    rwa_amount: Decimal
    capital_required: Decimal
    calculation_method: str
    regulatory_minimum: Decimal
    buffer_requirement: Decimal
    total_requirement: Decimal
    actual_capital: Decimal
    surplus_deficit: Decimal
    is_compliant: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreditRiskRWA(BaseModel):
    rwa_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    asset_class: AssetClassBasel
    approach: str  # standardized, foundation_irb, advanced_irb
    exposure_amount: Decimal
    risk_weight: Decimal
    rwa_amount: Decimal
    pd: Decimal | None = None
    lgd: Decimal | None = None
    ead: Decimal | None = None
    maturity: Decimal | None = None
    correlation: Decimal | None = None
    collateral_value: Decimal | None = None
    guarantee_value: Decimal | None = None


class MarketRiskRWA(BaseModel):
    rwa_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    approach: str  # standardized, internal_models
    desk_id: str
    risk_type: str  # interest_rate, fx, equity, commodity, credit_spread
    sensitivities_based: Decimal
    default_risk_charge: Decimal
    residual_risk_addon: Decimal
    var_charge: Decimal | None = None
    stressed_var: Decimal | None = None
    incremental_risk: Decimal | None = None
    total_rwa: Decimal


class OperationalRiskRWA(BaseModel):
    rwa_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    approach: str  # bia, tsa, ama, standardized
    business_indicator: Decimal
    bi_component: Decimal
    ilm: Decimal  # Internal Loss Multiplier
    loss_component: Decimal
    total_rwa: Decimal


class LeverageRatio(BaseModel):
    ratio_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    entity_id: str
    tier1_capital: Decimal
    total_exposure: Decimal
    on_balance_sheet: Decimal
    derivatives_exposure: Decimal
    sft_exposure: Decimal  # Securities Financing Transactions
    off_balance_sheet: Decimal
    leverage_ratio: Decimal
    minimum_requirement: Decimal
    is_compliant: bool


class LiquidityCoverageRatio(BaseModel):
    lcr_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    entity_id: str
    hqla_level1: Decimal
    hqla_level2a: Decimal
    hqla_level2b: Decimal
    total_hqla: Decimal
    net_cash_outflows: Decimal
    gross_outflows: Decimal
    gross_inflows: Decimal
    lcr_ratio: Decimal
    minimum_requirement: Decimal
    is_compliant: bool


class NetStableFundingRatio(BaseModel):
    nsfr_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    entity_id: str
    available_stable_funding: Decimal
    required_stable_funding: Decimal
    asf_components: dict[str, Decimal]
    rsf_components: dict[str, Decimal]
    nsfr_ratio: Decimal
    minimum_requirement: Decimal
    is_compliant: bool


class CapitalBuffer(BaseModel):
    buffer_id: UUID = Field(default_factory=uuid4)
    reporting_date: date
    entity_id: str
    conservation_buffer: Decimal
    countercyclical_buffer: Decimal
    systemic_buffer: Decimal  # G-SIB or D-SIB
    pillar2_buffer: Decimal
    total_buffer: Decimal
    buffer_available: Decimal
    is_compliant: bool


class BaselReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_type: str
    reporting_date: date
    entity_id: str
    total_rwa: Decimal
    credit_risk_rwa: Decimal
    market_risk_rwa: Decimal
    operational_risk_rwa: Decimal
    cet1_capital: Decimal
    at1_capital: Decimal
    tier2_capital: Decimal
    total_capital: Decimal
    cet1_ratio: Decimal
    tier1_ratio: Decimal
    total_capital_ratio: Decimal
    leverage_ratio: Decimal
    lcr: Decimal
    nsfr: Decimal
    submission_date: date | None = None
    regulator_reference: str | None = None
    status: str = "draft"
    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
