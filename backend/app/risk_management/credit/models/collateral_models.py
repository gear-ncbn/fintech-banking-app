"""Collateral Models - Collateral and security management models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CollateralType(StrEnum):
    REAL_ESTATE = "real_estate"
    VEHICLE = "vehicle"
    EQUIPMENT = "equipment"
    INVENTORY = "inventory"
    RECEIVABLES = "receivables"
    SECURITIES = "securities"
    CASH = "cash"
    GUARANTEE = "guarantee"
    OTHER = "other"


class CollateralStatus(StrEnum):
    PENDING = "pending"
    VERIFIED = "verified"
    PERFECTED = "perfected"
    RELEASED = "released"
    IMPAIRED = "impaired"
    LIQUIDATED = "liquidated"


class ValuationType(StrEnum):
    MARKET = "market"
    APPRAISED = "appraised"
    BOOK = "book"
    FORCED_SALE = "forced_sale"
    DISCOUNTED = "discounted"


class Collateral(BaseModel):
    collateral_id: UUID = Field(default_factory=uuid4)
    collateral_code: str
    collateral_type: CollateralType
    description: str
    owner_id: str
    owner_name: str
    status: CollateralStatus = CollateralStatus.PENDING
    original_value: float
    current_value: float
    haircut_percentage: float = Field(default=0.0, ge=0, le=100)
    adjusted_value: float
    currency: str = "USD"
    location: str | None = None
    registration_number: str | None = None
    registration_date: date | None = None
    perfection_status: str = "pending"
    perfection_date: date | None = None
    insurance_policy: str | None = None
    insurance_expiry: date | None = None
    linked_facilities: list[UUID] = []
    total_allocation: float = 0.0
    available_value: float = 0.0
    last_valuation_date: date | None = None
    next_valuation_date: date | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CollateralValuation(BaseModel):
    valuation_id: UUID = Field(default_factory=uuid4)
    collateral_id: UUID
    valuation_type: ValuationType
    valuation_date: date
    valuer_name: str
    valuer_company: str | None = None
    market_value: float
    forced_sale_value: float
    insurance_value: float | None = None
    land_value: float | None = None
    building_value: float | None = None
    valuation_methodology: str
    assumptions: list[str] = []
    value_drivers: list[str] = []
    risk_factors: list[str] = []
    valuation_report_url: str | None = None
    expiry_date: date
    status: str = "current"
    approved_by: str | None = None
    approved_date: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CollateralAllocation(BaseModel):
    allocation_id: UUID = Field(default_factory=uuid4)
    collateral_id: UUID
    facility_id: UUID
    loan_id: UUID | None = None
    allocation_amount: float
    allocation_percentage: float
    priority_ranking: int = 1
    effective_date: date
    expiry_date: date | None = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CollateralHaircut(BaseModel):
    haircut_id: UUID = Field(default_factory=uuid4)
    collateral_type: CollateralType
    sub_type: str | None = None
    standard_haircut: float
    stressed_haircut: float
    currency_haircut: float = 0.0
    volatility_adjustment: float = 0.0
    liquidity_adjustment: float = 0.0
    total_haircut: float
    effective_date: date
    review_date: date
    approved_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CollateralMonitoring(BaseModel):
    monitoring_id: UUID = Field(default_factory=uuid4)
    collateral_id: UUID
    monitoring_date: date
    value_change_percentage: float
    ltv_ratio: float
    margin_call_triggered: bool = False
    margin_call_amount: float | None = None
    insurance_status: str
    physical_inspection_due: bool = False
    legal_review_due: bool = False
    issues_identified: list[str] = []
    recommendations: list[str] = []
    monitored_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Guarantee(BaseModel):
    guarantee_id: UUID = Field(default_factory=uuid4)
    guarantee_type: str  # corporate, personal, bank, government
    guarantor_id: str
    guarantor_name: str
    guarantor_rating: str | None = None
    guaranteed_facility_id: UUID
    guarantee_amount: float
    guarantee_percentage: float
    currency: str = "USD"
    effective_date: date
    expiry_date: date
    guarantee_document: str | None = None
    status: str = "active"
    legal_enforceability: str = "enforceable"
    recovery_rate_assumption: float = Field(default=0.5, ge=0, le=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CollateralStatistics(BaseModel):
    total_collateral_count: int = 0
    total_original_value: float = 0.0
    total_current_value: float = 0.0
    total_adjusted_value: float = 0.0
    by_type: dict[str, float] = {}
    by_status: dict[str, int] = {}
    average_haircut: float = 0.0
    average_ltv: float = 0.0
