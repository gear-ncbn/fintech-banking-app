"""Consumer Protection Models - Data models for consumer protection compliance"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ComplaintCategory(StrEnum):
    BILLING = "billing"
    SERVICE = "service"
    DISCLOSURE = "disclosure"
    FEES = "fees"
    FRAUD = "fraud"
    PRIVACY = "privacy"
    DISCRIMINATION = "discrimination"
    UNFAIR_PRACTICE = "unfair_practice"
    COLLECTION = "collection"
    OTHER = "other"


class ComplaintStatus(StrEnum):
    RECEIVED = "received"
    ACKNOWLEDGED = "acknowledged"
    IN_REVIEW = "in_review"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REGULATORY = "regulatory"


class FairLendingProtectedClass(StrEnum):
    RACE = "race"
    COLOR = "color"
    RELIGION = "religion"
    NATIONAL_ORIGIN = "national_origin"
    SEX = "sex"
    MARITAL_STATUS = "marital_status"
    AGE = "age"
    DISABILITY = "disability"
    MILITARY_STATUS = "military_status"


class ConsumerComplaint(BaseModel):
    complaint_id: UUID = Field(default_factory=uuid4)
    complaint_reference: str
    customer_id: str
    customer_name: str
    contact_method: str  # phone, email, mail, in_person, regulator
    received_date: datetime
    category: ComplaintCategory
    subcategory: str | None = None
    product_type: str
    account_number: str | None = None
    description: str
    relief_requested: str | None = None
    amount_disputed: Decimal | None = None
    status: ComplaintStatus = ComplaintStatus.RECEIVED
    priority: str = "normal"
    acknowledgment_date: datetime | None = None
    assigned_to: str | None = None
    assigned_date: datetime | None = None
    sla_due_date: date
    regulatory_complaint: bool = False
    regulator_reference: str | None = None
    resolution: str | None = None
    resolution_amount: Decimal | None = None
    resolution_date: datetime | None = None
    customer_satisfaction: int | None = None
    root_cause: str | None = None
    systemic_issue: bool = False


class FairLendingAnalysis(BaseModel):
    analysis_id: UUID = Field(default_factory=uuid4)
    analysis_date: date
    analysis_type: str  # hmda, pricing, underwriting
    product_type: str
    analysis_period_start: date
    analysis_period_end: date
    total_applications: int
    approved_count: int
    denied_count: int
    withdrawn_count: int
    protected_class: FairLendingProtectedClass
    control_group_approval_rate: Decimal
    protected_group_approval_rate: Decimal
    rate_disparity: Decimal
    statistical_significance: bool
    average_pricing_control: Decimal | None = None
    average_pricing_protected: Decimal | None = None
    pricing_disparity: Decimal | None = None
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    analyst: str
    reviewed_by: str | None = None
    status: str = "draft"


class TILADisclosure(BaseModel):
    disclosure_id: UUID = Field(default_factory=uuid4)
    loan_id: str
    customer_id: str
    disclosure_type: str  # initial, final, corrected
    disclosure_date: date
    product_type: str
    loan_amount: Decimal
    apr: Decimal
    finance_charge: Decimal
    amount_financed: Decimal
    total_of_payments: Decimal
    payment_amount: Decimal
    payment_frequency: str
    number_of_payments: int
    prepayment_penalty: bool = False
    prepayment_penalty_amount: Decimal | None = None
    balloon_payment: bool = False
    balloon_amount: Decimal | None = None
    variable_rate: bool = False
    rate_index: str | None = None
    delivered_date: date
    delivery_method: str
    signed_date: date | None = None
    right_to_cancel_date: date | None = None
    compliant: bool = True
    compliance_issues: list[str] = Field(default_factory=list)


class RESPADisclosure(BaseModel):
    disclosure_id: UUID = Field(default_factory=uuid4)
    loan_id: str
    disclosure_type: str  # LE, CD
    disclosure_date: date
    loan_amount: Decimal
    interest_rate: Decimal
    monthly_principal_interest: Decimal
    closing_costs: Decimal
    cash_to_close: Decimal
    origination_charges: Decimal
    services_you_cannot_shop: Decimal
    services_you_can_shop: Decimal
    taxes_and_insurance: Decimal
    other_costs: Decimal
    lender_credits: Decimal
    deposit: Decimal
    seller_credits: Decimal
    tolerance_exceeded: bool = False
    tolerance_items: list[dict[str, Any]] = Field(default_factory=list)
    delivered_date: date
    delivery_method: str
    timing_compliant: bool = True
    three_day_rule_met: bool = True


class UDAPReview(BaseModel):
    review_id: UUID = Field(default_factory=uuid4)
    review_date: date
    product_service: str
    review_type: str  # marketing, disclosure, practice
    reviewer: str
    unfair_assessment: str
    deceptive_assessment: str
    abusive_assessment: str
    issues_identified: list[dict[str, Any]]
    risk_rating: str
    recommendations: list[str]
    remediation_required: bool = False
    remediation_items: list[dict[str, Any]] = Field(default_factory=list)
    approved_by: str | None = None
    status: str = "pending"


class ServicememberProtection(BaseModel):
    protection_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    account_id: str
    military_status: str  # active_duty, reserve, dependent
    verification_date: date
    verification_method: str
    scra_benefits_applied: bool = False
    mla_benefits_applied: bool = False
    interest_rate_reduction: Decimal | None = None
    effective_date: date | None = None
    end_date: date | None = None
    deployment_date: date | None = None
    return_date: date | None = None
    protections_applied: list[str]
    notes: str | None = None


class ConsumerProtectionReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    reporting_period: str
    total_complaints: int
    complaints_by_category: dict[str, int]
    complaints_by_status: dict[str, int]
    average_resolution_days: float
    sla_compliance_rate: Decimal
    regulatory_complaints: int
    escalated_complaints: int
    customer_satisfaction_avg: float
    fair_lending_reviews: int
    fair_lending_findings: int
    disclosure_reviews: int
    disclosure_compliance_rate: Decimal
    udap_reviews: int
    udap_issues_found: int
    servicemember_accounts: int
    training_completion_rate: Decimal
    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
