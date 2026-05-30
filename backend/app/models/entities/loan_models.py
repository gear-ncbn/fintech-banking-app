from datetime import date, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


# Loan-specific enums
class LoanType(StrEnum):
    PERSONAL = "personal"
    AUTO = "auto"
    MORTGAGE = "mortgage"
    STUDENT = "student"
    BUSINESS = "business"
    CRYPTO_BACKED = "crypto_backed"
    HOME_EQUITY = "home_equity"

class LoanStatus(StrEnum):
    APPLICATION = "application"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    PAID_OFF = "paid_off"
    DEFAULTED = "defaulted"
    REFINANCED = "refinanced"

class PaymentFrequency(StrEnum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"

class InterestType(StrEnum):
    FIXED = "fixed"
    VARIABLE = "variable"
    HYBRID = "hybrid"  # Fixed for initial period, then variable

# Request/Response Models
class LoanApplicationCreate(BaseModel):
    loan_type: LoanType
    requested_amount: float
    purpose: str
    term_months: int
    employment_status: str
    annual_income: float
    monthly_expenses: float
    collateral_description: str | None = None
    collateral_value: float | None = None

class LoanApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    loan_type: LoanType
    requested_amount: float
    purpose: str
    term_months: int
    status: LoanStatus
    credit_score_at_application: int
    annual_income: float
    debt_to_income_ratio: float
    created_at: datetime
    updated_at: datetime
    decision_date: datetime | None = None
    rejection_reason: str | None = None

class LoanOfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    lender_name: str
    approved_amount: float
    interest_rate: float
    interest_type: InterestType
    term_months: int
    monthly_payment: float
    total_interest: float
    total_cost: float
    origination_fee: float
    apr: float  # Annual Percentage Rate
    special_conditions: list[str] | None = None
    expires_at: datetime
    created_at: datetime

class LoanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    account_id: int  # Links to Account with type LOAN
    loan_type: LoanType
    lender_name: str
    original_amount: float
    current_balance: float
    interest_rate: float
    interest_type: InterestType
    term_months: int
    payment_frequency: PaymentFrequency
    monthly_payment: float
    next_payment_date: date
    next_payment_amount: float
    payments_made: int
    payments_remaining: int
    total_paid: float
    total_interest_paid: float
    status: LoanStatus
    originated_date: date
    maturity_date: date
    last_payment_date: date | None = None
    escrow_balance: float | None = None  # For mortgages
    collateral_description: str | None = None
    created_at: datetime
    updated_at: datetime

class LoanPaymentScheduleResponse(BaseModel):
    payment_number: int
    payment_date: date
    payment_amount: float
    principal: float
    interest: float
    escrow: float | None = None
    remaining_balance: float
    cumulative_interest: float
    cumulative_principal: float

class LoanPaymentCreate(BaseModel):
    loan_id: int
    amount: float
    payment_type: str = "regular"  # regular, extra_principal, payoff
    payment_date: date | None = None
    note: str | None = None

class LoanPaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loan_id: int
    payment_number: int
    amount: float
    principal_amount: float
    interest_amount: float
    escrow_amount: float | None = None
    extra_principal: float | None = None
    payment_type: str
    payment_date: date
    posted_date: datetime
    remaining_balance: float
    note: str | None = None

class LoanRefinanceAnalysis(BaseModel):
    current_loan: dict[str, Any]
    refinance_options: list[dict[str, Any]]
    break_even_months: int
    total_savings: float
    monthly_savings: float
    recommendation: str
    factors_considered: list[str]

class LoanAmortizationRequest(BaseModel):
    principal: float
    interest_rate: float
    term_months: int
    extra_payment: float | None = None
    extra_payment_frequency: str | None = None
    start_date: date | None = None

class LoanSummaryStats(BaseModel):
    total_loans: int
    total_original_amount: float
    total_current_balance: float
    total_monthly_payments: float
    average_interest_rate: float
    total_interest_paid: float
    loans_by_type: dict[str, int]
    next_payment_total: float
    next_payment_date: date | None = None

class CryptoLoanCreate(BaseModel):
    requested_amount_usd: float
    collateral_asset: str  # BTC, ETH, etc
    collateral_amount: str
    loan_to_value: float  # e.g., 50% LTV
    term_days: int
    purpose: str
