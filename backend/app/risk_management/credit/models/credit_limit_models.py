"""Credit Limit Models - Credit limit management models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class LimitType(StrEnum):
    CUSTOMER = "customer"
    GROUP = "group"
    PRODUCT = "product"
    INDUSTRY = "industry"
    COUNTRY = "country"
    CURRENCY = "currency"
    TENOR = "tenor"


class LimitStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    PENDING_APPROVAL = "pending_approval"
    CANCELLED = "cancelled"


class UtilizationStatus(StrEnum):
    NORMAL = "normal"
    WARNING = "warning"
    BREACH = "breach"
    EXCESS = "excess"


class CreditLimit(BaseModel):
    limit_id: UUID = Field(default_factory=uuid4)
    limit_number: str
    limit_type: LimitType
    entity_id: str
    entity_name: str
    limit_amount: float
    currency: str = "USD"
    utilized_amount: float = 0.0
    available_amount: float
    utilization_percentage: float = 0.0
    warning_threshold: float = 80.0
    breach_threshold: float = 100.0
    utilization_status: UtilizationStatus = UtilizationStatus.NORMAL
    status: LimitStatus = LimitStatus.ACTIVE
    effective_date: date
    expiry_date: date
    review_date: date
    approved_by: str
    approved_date: datetime
    approval_authority: str
    conditions: list[str] = []
    covenants: list[dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LimitRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    request_number: str
    request_type: str  # new, increase, decrease, renewal, cancellation
    limit_type: LimitType
    entity_id: str
    entity_name: str
    current_limit: float | None = None
    requested_limit: float
    requested_tenor_months: int
    purpose: str
    justification: str
    supporting_documents: list[str] = []
    risk_assessment: dict[str, Any] | None = None
    credit_rating: str | None = None
    financial_analysis: dict[str, Any] | None = None
    requested_by: str
    request_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: str = "pending"
    current_approver: str | None = None
    approval_history: list[dict[str, Any]] = []
    decision: str | None = None
    decision_date: datetime | None = None
    approved_amount: float | None = None
    conditions: list[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LimitUtilization(BaseModel):
    utilization_id: UUID = Field(default_factory=uuid4)
    limit_id: UUID
    facility_id: UUID | None = None
    utilization_date: date
    utilized_amount: float
    utilization_type: str  # drawdown, repayment, adjustment
    transaction_reference: str | None = None
    balance_after: float
    utilization_percentage_after: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LimitReview(BaseModel):
    review_id: UUID = Field(default_factory=uuid4)
    limit_id: UUID
    review_date: date
    review_type: str  # annual, trigger, interim
    current_limit: float
    recommended_limit: float
    limit_change: float
    change_reason: str
    financial_performance: dict[str, Any] = {}
    risk_assessment: dict[str, Any] = {}
    covenant_compliance: dict[str, Any] = {}
    industry_outlook: str
    recommendation: str
    reviewed_by: str
    approved_by: str | None = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LimitBreach(BaseModel):
    breach_id: UUID = Field(default_factory=uuid4)
    limit_id: UUID
    breach_date: datetime
    breach_type: str  # limit, warning, covenant
    limit_amount: float
    utilized_amount: float
    breach_amount: float
    breach_percentage: float
    breach_reason: str
    transaction_id: str | None = None
    remediation_required: bool = True
    remediation_plan: str | None = None
    remediation_deadline: date | None = None
    resolved: bool = False
    resolved_date: datetime | None = None
    resolution_action: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LimitCovenant(BaseModel):
    covenant_id: UUID = Field(default_factory=uuid4)
    limit_id: UUID
    covenant_type: str  # financial, reporting, negative
    covenant_name: str
    covenant_description: str
    threshold_value: float
    current_value: float | None = None
    compliance_status: str = "compliant"
    measurement_frequency: str  # monthly, quarterly, annually
    last_measurement_date: date | None = None
    next_measurement_date: date | None = None
    grace_period_days: int = 0
    breach_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LimitStatistics(BaseModel):
    total_limits: int = 0
    total_limit_amount: float = 0.0
    total_utilized: float = 0.0
    average_utilization: float = 0.0
    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    breaches_count: int = 0
    warnings_count: int = 0
