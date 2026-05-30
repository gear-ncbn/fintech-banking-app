"""KYC Models - Data models for Know Your Customer compliance"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CustomerType(StrEnum):
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"
    TRUST = "trust"
    PARTNERSHIP = "partnership"
    GOVERNMENT = "government"
    NON_PROFIT = "non_profit"


class RiskRating(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PROHIBITED = "prohibited"


class VerificationStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"


class DocumentType(StrEnum):
    PASSPORT = "passport"
    NATIONAL_ID = "national_id"
    DRIVERS_LICENSE = "drivers_license"
    UTILITY_BILL = "utility_bill"
    BANK_STATEMENT = "bank_statement"
    COMPANY_REGISTRATION = "company_registration"
    ARTICLES_OF_INCORPORATION = "articles_of_incorporation"
    FINANCIAL_STATEMENT = "financial_statement"


class CustomerProfile(BaseModel):
    profile_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    customer_type: CustomerType
    full_name: str
    date_of_birth: date | None = None
    nationality: str | None = None
    country_of_residence: str
    address: str
    occupation: str | None = None
    employer: str | None = None
    source_of_funds: str
    source_of_wealth: str | None = None
    expected_activity: str
    expected_monthly_volume: Decimal
    pep_status: bool = False
    pep_details: str | None = None
    sanctions_status: bool = False
    adverse_media: bool = False
    risk_rating: RiskRating = RiskRating.MEDIUM
    risk_score: int = 50
    onboarding_date: date
    last_review_date: date | None = None
    next_review_date: date | None = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CorporateCustomer(BaseModel):
    corporate_id: UUID = Field(default_factory=uuid4)
    profile_id: UUID
    legal_name: str
    trading_name: str | None = None
    registration_number: str
    registration_country: str
    registration_date: date
    legal_form: str
    industry_sector: str
    business_description: str
    website: str | None = None
    annual_revenue: Decimal | None = None
    employee_count: int | None = None
    beneficial_owners: list[dict[str, Any]] = Field(default_factory=list)
    directors: list[dict[str, Any]] = Field(default_factory=list)
    authorized_signatories: list[dict[str, Any]] = Field(default_factory=list)
    parent_company: str | None = None
    subsidiaries: list[str] = Field(default_factory=list)
    complex_structure: bool = False
    structure_diagram: str | None = None


class IdentityVerification(BaseModel):
    verification_id: UUID = Field(default_factory=uuid4)
    profile_id: UUID
    verification_type: str  # identity, address, document
    document_type: DocumentType
    document_number: str
    issuing_country: str
    issue_date: date | None = None
    expiry_date: date | None = None
    verification_method: str  # manual, automated, third_party
    verification_provider: str | None = None
    verification_reference: str | None = None
    status: VerificationStatus = VerificationStatus.PENDING
    verification_date: datetime | None = None
    verified_by: str | None = None
    failure_reason: str | None = None
    document_location: str
    confidence_score: Decimal | None = None


class EnhancedDueDiligence(BaseModel):
    edd_id: UUID = Field(default_factory=uuid4)
    profile_id: UUID
    trigger_reason: str
    edd_date: date
    conducted_by: str
    source_of_wealth_verified: bool = False
    source_of_funds_verified: bool = False
    business_relationship_purpose: str
    expected_transactions: str
    geographical_exposure: list[str]
    pep_screening_result: str | None = None
    sanctions_screening_result: str | None = None
    adverse_media_result: str | None = None
    site_visit_conducted: bool = False
    site_visit_date: date | None = None
    management_approval: bool = False
    approval_date: date | None = None
    approved_by: str | None = None
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    next_review_date: date
    status: str = "pending"


class PeriodicReview(BaseModel):
    review_id: UUID = Field(default_factory=uuid4)
    profile_id: UUID
    review_type: str  # annual, event_triggered, risk_based
    review_date: date
    reviewer: str
    previous_risk_rating: RiskRating
    new_risk_rating: RiskRating
    risk_score_change: int
    changes_identified: list[str]
    documents_updated: list[str]
    screening_results: dict[str, str]
    transaction_review: dict[str, Any]
    sar_filed: bool = False
    recommendations: list[str]
    action_items: list[dict[str, Any]]
    next_review_date: date
    status: str = "completed"
    approved_by: str | None = None


class BeneficialOwner(BaseModel):
    owner_id: UUID = Field(default_factory=uuid4)
    profile_id: UUID  # Corporate profile
    individual_profile_id: UUID | None = None
    full_name: str
    date_of_birth: date
    nationality: str
    country_of_residence: str
    ownership_percentage: Decimal
    ownership_type: str  # direct, indirect
    control_type: str | None = None  # voting_rights, board_control, etc.
    verification_status: VerificationStatus = VerificationStatus.PENDING
    pep_status: bool = False
    sanctions_status: bool = False
    verified_date: date | None = None
    is_active: bool = True


class KYCReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    reporting_period: str
    total_customers: int
    new_customers: int
    high_risk_customers: int
    medium_risk_customers: int
    low_risk_customers: int
    pep_customers: int
    verifications_completed: int
    verifications_failed: int
    edd_conducted: int
    periodic_reviews_completed: int
    periodic_reviews_overdue: int
    sars_filed: int
    accounts_closed: int
    average_onboarding_time: float
    compliance_score: float
    generated_by: str
