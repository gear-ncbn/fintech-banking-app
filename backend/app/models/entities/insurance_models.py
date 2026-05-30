from datetime import date, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


# Insurance-specific enums
class InsuranceType(StrEnum):
    HEALTH = "health"
    AUTO = "auto"
    HOME = "home"
    LIFE = "life"
    DISABILITY = "disability"
    DENTAL = "dental"
    VISION = "vision"
    PET = "pet"
    TRAVEL = "travel"
    CRYPTO = "crypto"  # For digital asset insurance
    CYBER = "cyber"    # Cyber security insurance

class PolicyStatus(StrEnum):
    ACTIVE = "active"
    PENDING = "pending"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    LAPSED = "lapsed"

class ClaimStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    DENIED = "denied"
    PAID = "paid"
    APPEALED = "appealed"
    CLOSED = "closed"

class PremiumFrequency(StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"

class CoverageType(StrEnum):
    LIABILITY = "liability"
    COLLISION = "collision"
    COMPREHENSIVE = "comprehensive"
    MEDICAL = "medical"
    PROPERTY = "property"
    TERM_LIFE = "term_life"
    WHOLE_LIFE = "whole_life"
    SHORT_TERM_DISABILITY = "short_term_disability"
    LONG_TERM_DISABILITY = "long_term_disability"

# Request/Response Models
class InsurancePolicyCreate(BaseModel):
    insurance_type: InsuranceType
    provider_name: str
    policy_number: str
    coverage_amount: float
    deductible: float
    premium_amount: float
    premium_frequency: PremiumFrequency
    start_date: date
    end_date: date
    beneficiaries: list[dict[str, str]] | None = None
    coverage_details: dict[str, Any] | None = None

class InsurancePolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    insurance_type: InsuranceType
    provider_name: str
    policy_number: str
    status: PolicyStatus
    coverage_amount: float
    deductible: float
    out_of_pocket_max: float | None = None
    premium_amount: float
    premium_frequency: PremiumFrequency
    next_premium_date: date
    start_date: date
    end_date: date
    renewal_date: date | None = None
    beneficiaries: list[dict[str, str]] | None = None
    coverage_details: dict[str, Any]
    documents: list[dict[str, str]]
    created_at: datetime
    updated_at: datetime

class InsuranceClaimCreate(BaseModel):
    policy_id: int
    claim_type: str
    incident_date: date
    amount_claimed: float
    description: str
    supporting_documents: list[str] | None = None
    provider_details: dict[str, str] | None = None

class InsuranceClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    policy_id: int
    claim_number: str
    claim_type: str
    status: ClaimStatus
    incident_date: date
    filed_date: datetime
    amount_claimed: float
    amount_approved: float | None = None
    amount_paid: float | None = None
    deductible_applied: float | None = None
    description: str
    adjuster_name: str | None = None
    adjuster_notes: str | None = None
    denial_reason: str | None = None
    documents: list[dict[str, str]]
    status_history: list[dict[str, Any]]
    payment_date: datetime | None = None
    appeal_deadline: date | None = None
    created_at: datetime
    updated_at: datetime

class InsuranceProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    insurance_types: list[InsuranceType]
    rating: float
    customer_service_phone: str
    customer_service_email: str | None = None
    website: str
    claim_phone: str
    network_size: int | None = None  # For health insurance
    financial_strength_rating: str | None = None
    complaint_ratio: float | None = None

class InsuranceQuoteRequest(BaseModel):
    insurance_type: InsuranceType
    coverage_amount: float
    deductible: float
    personal_info: dict[str, Any]  # Age, location, etc.
    coverage_options: list[str] | None = None

class InsuranceQuoteResponse(BaseModel):
    provider_name: str
    monthly_premium: float
    annual_premium: float
    coverage_amount: float
    deductible: float
    coverage_details: dict[str, Any]
    discounts_applied: list[str]
    quote_id: str
    valid_until: datetime

class InsuranceSummaryResponse(BaseModel):
    total_policies: int
    active_policies: int
    total_monthly_premiums: float
    total_annual_premiums: float
    total_coverage_amount: float
    policies_by_type: dict[str, int]
    upcoming_renewals: list[dict[str, Any]]
    recent_claims: list[dict[str, Any]]
    coverage_gaps: list[str]

class HealthInsuranceDetails(BaseModel):
    in_network_deductible: float
    out_network_deductible: float
    in_network_oop_max: float
    out_network_oop_max: float
    copay_primary: float
    copay_specialist: float
    copay_emergency: float
    prescription_coverage: dict[str, Any]
    preventive_care_covered: bool
    hsafsa_eligible: bool

class AutoInsuranceDetails(BaseModel):
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vin: str
    liability_coverage: float
    collision_coverage: float | None = None
    comprehensive_coverage: float | None = None
    uninsured_motorist: float | None = None
    rental_reimbursement: float | None = None
    roadside_assistance: bool

class ClaimTimelineEvent(BaseModel):
    event_date: datetime
    event_type: str
    description: str
    performed_by: str | None = None
    notes: str | None = None
