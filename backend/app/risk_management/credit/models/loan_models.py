"""Loan Models - Loan application and origination risk models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class LoanType(StrEnum):
    PERSONAL = "personal"
    MORTGAGE = "mortgage"
    AUTO = "auto"
    BUSINESS = "business"
    CREDIT_LINE = "credit_line"
    STUDENT = "student"
    HOME_EQUITY = "home_equity"


class LoanStatus(StrEnum):
    APPLICATION = "application"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FUNDED = "funded"
    ACTIVE = "active"
    DELINQUENT = "delinquent"
    DEFAULT = "default"
    PAID_OFF = "paid_off"
    CHARGED_OFF = "charged_off"


class RiskDecision(StrEnum):
    APPROVE = "approve"
    DECLINE = "decline"
    REFER = "refer"
    CONDITIONAL_APPROVE = "conditional_approve"


class LoanApplication(BaseModel):
    application_id: UUID = Field(default_factory=uuid4)
    application_number: str
    customer_id: str
    customer_name: str
    loan_type: LoanType
    requested_amount: float
    requested_term_months: int
    purpose: str
    employment_status: str
    annual_income: float
    monthly_debt: float
    debt_to_income_ratio: float = 0.0
    credit_score: int | None = None
    application_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: LoanStatus = LoanStatus.APPLICATION
    assigned_underwriter: str | None = None
    risk_assessment: dict[str, Any] | None = None
    decision: RiskDecision | None = None
    decision_date: datetime | None = None
    decision_reason: str | None = None
    conditions: list[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LoanRiskAssessment(BaseModel):
    assessment_id: UUID = Field(default_factory=uuid4)
    application_id: UUID
    customer_id: str
    risk_score: float = Field(ge=0, le=100)
    risk_grade: str
    probability_of_default: float = Field(ge=0, le=1)
    loss_given_default: float = Field(ge=0, le=1)
    expected_loss: float
    risk_factors: list[dict[str, Any]] = []
    strengths: list[str] = []
    weaknesses: list[str] = []
    mitigating_factors: list[str] = []
    recommended_decision: RiskDecision
    recommended_amount: float | None = None
    recommended_rate: float | None = None
    recommended_term: int | None = None
    conditions_required: list[str] = []
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    assessed_by: str
    model_version: str = "1.0"


class Loan(BaseModel):
    loan_id: UUID = Field(default_factory=uuid4)
    loan_number: str
    application_id: UUID
    customer_id: str
    customer_name: str
    loan_type: LoanType
    principal_amount: float
    current_balance: float
    interest_rate: float
    term_months: int
    monthly_payment: float
    origination_date: date
    maturity_date: date
    first_payment_date: date
    status: LoanStatus = LoanStatus.ACTIVE
    collateral_id: UUID | None = None
    days_past_due: int = 0
    last_payment_date: date | None = None
    next_payment_date: date | None = None
    total_payments_made: int = 0
    total_interest_paid: float = 0.0
    total_principal_paid: float = 0.0
    risk_rating: str = "standard"
    watch_list: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LoanPayment(BaseModel):
    payment_id: UUID = Field(default_factory=uuid4)
    loan_id: UUID
    payment_number: int
    payment_date: date
    due_date: date
    scheduled_amount: float
    actual_amount: float
    principal_portion: float
    interest_portion: float
    fees_portion: float = 0.0
    balance_after: float
    payment_status: str = "completed"
    payment_method: str
    days_late: int = 0
    late_fee: float = 0.0


class DelinquencyRecord(BaseModel):
    record_id: UUID = Field(default_factory=uuid4)
    loan_id: UUID
    customer_id: str
    delinquency_start_date: date
    delinquency_end_date: date | None = None
    days_delinquent: int
    amount_past_due: float
    delinquency_bucket: str  # 30, 60, 90, 120+
    collection_status: str = "active"
    collection_attempts: int = 0
    last_contact_date: date | None = None
    promise_to_pay_date: date | None = None
    resolution: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LoanStatistics(BaseModel):
    total_loans: int = 0
    total_principal: float = 0.0
    total_outstanding: float = 0.0
    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    average_interest_rate: float = 0.0
    delinquency_rate: float = 0.0
    default_rate: float = 0.0
