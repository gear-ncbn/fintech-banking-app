"""Portfolio Models - Credit portfolio risk models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class PortfolioType(StrEnum):
    RETAIL = "retail"
    COMMERCIAL = "commercial"
    CORPORATE = "corporate"
    SME = "sme"
    CONSUMER = "consumer"
    MORTGAGE = "mortgage"


class PortfolioStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"
    UNDER_REVIEW = "under_review"
    RESTRUCTURING = "restructuring"


class ConcentrationRiskType(StrEnum):
    GEOGRAPHIC = "geographic"
    INDUSTRY = "industry"
    PRODUCT = "product"
    CUSTOMER = "customer"
    COLLATERAL = "collateral"


class CreditPortfolio(BaseModel):
    portfolio_id: UUID = Field(default_factory=uuid4)
    portfolio_name: str
    portfolio_type: PortfolioType
    description: str
    status: PortfolioStatus = PortfolioStatus.ACTIVE
    total_exposure: float = 0.0
    total_commitments: float = 0.0
    utilized_amount: float = 0.0
    number_of_accounts: int = 0
    number_of_customers: int = 0
    weighted_average_rating: str = "BBB"
    weighted_average_pd: float = 0.0
    weighted_average_lgd: float = 0.0
    expected_loss: float = 0.0
    unexpected_loss: float = 0.0
    economic_capital: float = 0.0
    risk_weighted_assets: float = 0.0
    provision_amount: float = 0.0
    portfolio_manager: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PortfolioSegment(BaseModel):
    segment_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    segment_name: str
    segment_type: str
    exposure_amount: float
    exposure_percentage: float
    number_of_accounts: int
    average_rating: str
    average_pd: float
    expected_loss: float
    concentration_limit: float | None = None
    limit_utilization: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ConcentrationRisk(BaseModel):
    concentration_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    concentration_type: ConcentrationRiskType
    dimension_name: str
    dimension_value: str
    exposure_amount: float
    exposure_percentage: float
    limit_amount: float | None = None
    limit_percentage: float | None = None
    breach_status: bool = False
    breach_amount: float | None = None
    risk_score: float = Field(ge=0, le=100)
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PortfolioMigration(BaseModel):
    migration_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    period_start: date
    period_end: date
    migration_matrix: dict[str, dict[str, float]] = {}
    upgrade_rate: float = 0.0
    downgrade_rate: float = 0.0
    stable_rate: float = 0.0
    default_rate: float = 0.0
    average_migration_distance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PortfolioStressTest(BaseModel):
    stress_test_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    scenario_name: str
    scenario_description: str
    scenario_type: str  # baseline, adverse, severely_adverse
    economic_assumptions: dict[str, float] = {}
    stressed_pd: float
    stressed_lgd: float
    stressed_ead: float
    stressed_expected_loss: float
    stressed_unexpected_loss: float
    loss_increase_percentage: float
    capital_impact: float
    test_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: str


class VintageAnalysis(BaseModel):
    analysis_id: UUID = Field(default_factory=uuid4)
    portfolio_id: UUID
    vintage_period: str  # e.g., "2024-Q1"
    origination_amount: float
    current_balance: float
    cumulative_default_rate: float
    cumulative_loss_rate: float
    months_on_book: int
    performance_status: str
    analysis_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PortfolioStatistics(BaseModel):
    total_portfolios: int = 0
    total_exposure: float = 0.0
    total_expected_loss: float = 0.0
    by_type: dict[str, int] = {}
    average_pd: float = 0.0
    average_lgd: float = 0.0
