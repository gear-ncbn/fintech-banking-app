"""
KYC (Know Your Customer) Models

Defines data structures for customer due diligence and KYC processes.
"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class KYCStatus(StrEnum):
    """KYC verification status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PENDING_DOCUMENTS = "pending_documents"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    SUSPENDED = "suspended"


class KYCLevel(StrEnum):
    """Level of KYC verification"""
    BASIC = "basic"
    STANDARD = "standard"
    ENHANCED = "enhanced"
    SIMPLIFIED = "simplified"


class DocumentType(StrEnum):
    """Types of identity documents"""
    PASSPORT = "passport"
    NATIONAL_ID = "national_id"
    DRIVERS_LICENSE = "drivers_license"
    RESIDENCE_PERMIT = "residence_permit"
    UTILITY_BILL = "utility_bill"
    BANK_STATEMENT = "bank_statement"
    TAX_RETURN = "tax_return"
    COMPANY_REGISTRATION = "company_registration"
    ARTICLES_OF_INCORPORATION = "articles_of_incorporation"
    SHAREHOLDER_REGISTER = "shareholder_register"
    FINANCIAL_STATEMENT = "financial_statement"
    PROOF_OF_ADDRESS = "proof_of_address"
    SOURCE_OF_FUNDS = "source_of_funds"
    SOURCE_OF_WEALTH = "source_of_wealth"


class VerificationMethod(StrEnum):
    """Methods of verification"""
    DOCUMENT_UPLOAD = "document_upload"
    BIOMETRIC = "biometric"
    VIDEO_CALL = "video_call"
    IN_PERSON = "in_person"
    DATABASE_CHECK = "database_check"
    THIRD_PARTY = "third_party"


class IdentityDocument(BaseModel):
    """Identity document record"""
    document_id: UUID = Field(default_factory=uuid4)
    document_type: DocumentType
    document_number: str | None = None

    # Document details
    issuing_country: str
    issuing_authority: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None

    # File information
    file_path: str
    file_name: str
    file_size: int
    mime_type: str

    # Verification
    verification_status: str = "pending"  # pending, verified, rejected
    verified_by: str | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None

    # OCR extracted data
    extracted_data: dict[str, Any] = Field(default_factory=dict)
    ocr_confidence: float = 0.0

    # Timestamps
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime | None = None


class AddressVerification(BaseModel):
    """Address verification record"""
    verification_id: UUID = Field(default_factory=uuid4)

    # Address
    address_type: str  # residential, business, mailing
    address_line1: str
    address_line2: str | None = None
    city: str
    state_province: str
    postal_code: str
    country: str

    # Verification
    verification_method: VerificationMethod
    verification_status: str = "pending"
    verification_date: datetime | None = None
    verified_by: str | None = None

    # Supporting document
    document_id: UUID | None = None
    document_type: DocumentType | None = None

    # Validity
    valid_from: datetime
    valid_until: datetime | None = None

    # Third-party verification
    third_party_provider: str | None = None
    third_party_reference: str | None = None
    third_party_result: dict[str, Any] | None = None


class BiometricVerification(BaseModel):
    """Biometric verification record"""
    verification_id: UUID = Field(default_factory=uuid4)

    # Biometric type
    biometric_type: str  # facial, fingerprint, voice
    capture_method: str

    # Verification result
    verification_status: str = "pending"
    match_score: float = 0.0
    liveness_score: float = 0.0
    quality_score: float = 0.0

    # Reference
    reference_document_id: UUID | None = None

    # Provider
    provider: str
    provider_reference: str
    provider_result: dict[str, Any] = Field(default_factory=dict)

    # Timestamps
    captured_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    verified_at: datetime | None = None


class SourceOfFunds(BaseModel):
    """Source of funds declaration"""
    source_id: UUID = Field(default_factory=uuid4)

    # Source type
    source_type: str  # employment, business, inheritance, investment, savings, gift, loan
    description: str

    # Amount
    amount: float | None = None
    currency: str = "USD"
    percentage_of_total: float | None = None

    # Supporting documents
    document_ids: list[UUID] = Field(default_factory=list)

    # Verification
    verification_status: str = "pending"
    verified_by: str | None = None
    verified_at: datetime | None = None
    verification_notes: str | None = None


class SourceOfWealth(BaseModel):
    """Source of wealth declaration"""
    source_id: UUID = Field(default_factory=uuid4)

    # Source type
    source_type: str  # business_ownership, inheritance, investments, real_estate, employment
    description: str

    # Estimated value
    estimated_value: float | None = None
    currency: str = "USD"

    # Period accumulated
    accumulated_since: date | None = None

    # Supporting documents
    document_ids: list[UUID] = Field(default_factory=list)

    # Verification
    verification_status: str = "pending"
    verified_by: str | None = None
    verified_at: datetime | None = None


class BeneficialOwner(BaseModel):
    """Beneficial owner information (for entities)"""
    owner_id: UUID = Field(default_factory=uuid4)

    # Personal information
    first_name: str
    last_name: str
    date_of_birth: date
    nationality: str
    tax_residence: str

    # Ownership
    ownership_percentage: float
    ownership_type: str  # direct, indirect
    control_type: str | None = None  # voting, management

    # Contact
    address: str | None = None
    country_of_residence: str

    # Identification
    id_type: DocumentType
    id_number: str
    id_issuing_country: str
    id_expiry_date: date | None = None

    # PEP status
    is_pep: bool = False
    pep_details: str | None = None

    # Verification
    verification_status: str = "pending"
    documents: list[UUID] = Field(default_factory=list)


class KYCCheck(BaseModel):
    """Individual KYC check"""
    check_id: UUID = Field(default_factory=uuid4)
    check_type: str  # identity, address, sanctions, pep, adverse_media
    check_name: str

    # Status
    status: str = "pending"
    result: str | None = None  # pass, fail, review_required
    risk_level: str | None = None

    # Provider
    provider: str | None = None
    provider_reference: str | None = None
    provider_result: dict[str, Any] = Field(default_factory=dict)

    # Findings
    findings: list[dict[str, Any]] = Field(default_factory=list)
    alerts: list[str] = Field(default_factory=list)

    # Timestamps
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None

    # Review
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None


class KYCProfile(BaseModel):
    """Complete KYC profile for a customer"""
    profile_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    customer_type: str  # individual, corporate

    # Status
    kyc_status: KYCStatus = KYCStatus.NOT_STARTED
    kyc_level: KYCLevel = KYCLevel.STANDARD

    # Personal/Entity information
    full_name: str
    date_of_birth: date | None = None
    nationality: str | None = None
    tax_id: str | None = None
    occupation: str | None = None
    employer: str | None = None

    # For corporate
    company_name: str | None = None
    registration_number: str | None = None
    incorporation_country: str | None = None
    incorporation_date: date | None = None
    business_type: str | None = None

    # Documents
    identity_documents: list[IdentityDocument] = Field(default_factory=list)

    # Address verifications
    address_verifications: list[AddressVerification] = Field(default_factory=list)

    # Biometrics
    biometric_verifications: list[BiometricVerification] = Field(default_factory=list)

    # Source of funds/wealth
    sources_of_funds: list[SourceOfFunds] = Field(default_factory=list)
    sources_of_wealth: list[SourceOfWealth] = Field(default_factory=list)

    # Beneficial owners (for corporate)
    beneficial_owners: list[BeneficialOwner] = Field(default_factory=list)

    # KYC checks performed
    checks: list[KYCCheck] = Field(default_factory=list)

    # Risk assessment
    risk_score: float = 0.0
    risk_level: str = "medium"
    risk_factors: list[str] = Field(default_factory=list)

    # PEP status
    is_pep: bool = False
    pep_level: str | None = None
    pep_details: str | None = None

    # Sanctions
    sanctions_hit: bool = False
    sanctions_details: str | None = None

    # Adverse media
    adverse_media_hit: bool = False
    adverse_media_details: str | None = None

    # EDD
    requires_edd: bool = False
    edd_reason: str | None = None
    edd_completed: bool = False
    edd_completed_at: datetime | None = None

    # Approval
    approved_by: str | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None

    # Review schedule
    last_review_date: datetime | None = None
    next_review_date: date | None = None
    review_frequency_months: int = 12

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime | None = None


class EDDRequest(BaseModel):
    """Enhanced Due Diligence request"""
    edd_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    kyc_profile_id: UUID

    # Reason for EDD
    trigger_reason: str
    trigger_type: str  # pep, high_risk_country, high_value, sanctions_hit, adverse_media
    triggered_by: str
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Required information
    required_documents: list[DocumentType] = Field(default_factory=list)
    required_checks: list[str] = Field(default_factory=list)
    additional_questions: list[str] = Field(default_factory=list)

    # Status
    status: str = "open"  # open, in_progress, completed, cancelled
    assigned_to: str | None = None

    # Findings
    findings: list[dict[str, Any]] = Field(default_factory=list)
    risk_assessment: str | None = None
    recommendation: str | None = None

    # Approval
    approved_by: str | None = None
    approved_at: datetime | None = None

    # Timestamps
    due_date: datetime
    completed_at: datetime | None = None


class OnboardingWorkflow(BaseModel):
    """Customer onboarding workflow"""
    workflow_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    # Workflow status
    status: str = "initiated"
    current_step: str
    completed_steps: list[str] = Field(default_factory=list)
    pending_steps: list[str] = Field(default_factory=list)

    # Customer type
    customer_type: str
    product_type: str

    # KYC profile
    kyc_profile_id: UUID | None = None

    # Required checks based on product/customer type
    required_kyc_level: KYCLevel
    required_documents: list[DocumentType] = Field(default_factory=list)
    required_checks: list[str] = Field(default_factory=list)

    # Progress
    documents_collected: int = 0
    documents_required: int = 0
    checks_completed: int = 0
    checks_required: int = 0

    # Timestamps
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    expires_at: datetime

    # Assigned reviewer
    assigned_to: str | None = None


class KYCStatistics(BaseModel):
    """KYC statistics for reporting"""
    total_profiles: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    by_kyc_level: dict[str, int] = Field(default_factory=dict)
    by_risk_level: dict[str, int] = Field(default_factory=dict)
    onboarding_in_progress: int = 0
    pending_review: int = 0
    expired_profiles: int = 0
    requiring_edd: int = 0
    pep_count: int = 0
    high_risk_count: int = 0
    average_onboarding_days: float = 0.0
    document_rejection_rate: float = 0.0
