"""
SAR (Suspicious Activity Report) Models

Defines data structures for SAR filing and management.
"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class SARStatus(StrEnum):
    """SAR filing status"""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    REJECTED = "rejected"
    AMENDED = "amended"


class SARType(StrEnum):
    """Type of SAR"""
    INITIAL = "initial"
    CONTINUING = "continuing"
    CORRECTED = "corrected"
    JOINT = "joint"


class SuspiciousActivityType(StrEnum):
    """Types of suspicious activity"""
    MONEY_LAUNDERING = "money_laundering"
    STRUCTURING = "structuring"
    TERRORIST_FINANCING = "terrorist_financing"
    FRAUD = "fraud"
    IDENTITY_THEFT = "identity_theft"
    CHECK_FRAUD = "check_fraud"
    LOAN_FRAUD = "loan_fraud"
    CREDIT_CARD_FRAUD = "credit_card_fraud"
    WIRE_TRANSFER_FRAUD = "wire_transfer_fraud"
    MORTGAGE_FRAUD = "mortgage_fraud"
    INSIDER_ABUSE = "insider_abuse"
    BRIBERY = "bribery"
    EMBEZZLEMENT = "embezzlement"
    TAX_EVASION = "tax_evasion"
    SANCTIONS_VIOLATION = "sanctions_violation"
    OTHER = "other"


class FilingInstitution(BaseModel):
    """Institution filing the SAR"""
    institution_name: str
    institution_type: str
    ein: str
    address: str
    city: str
    state: str
    zip_code: str
    country: str = "US"
    regulator: str
    regulatory_id: str


class SubjectInfo(BaseModel):
    """Subject of the SAR"""
    subject_id: UUID = Field(default_factory=uuid4)
    subject_type: str  # individual, entity
    is_internal: bool = False

    # Individual info
    last_name: str | None = None
    first_name: str | None = None
    middle_name: str | None = None
    suffix: str | None = None
    date_of_birth: date | None = None
    ssn_tin: str | None = None
    passport_number: str | None = None
    passport_country: str | None = None
    drivers_license: str | None = None
    drivers_license_state: str | None = None

    # Entity info
    entity_name: str | None = None
    entity_type: str | None = None
    ein: str | None = None
    naics_code: str | None = None

    # Contact info
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    phone_numbers: list[str] = Field(default_factory=list)
    email_addresses: list[str] = Field(default_factory=list)

    # Relationship
    relationship_to_institution: str | None = None
    account_numbers: list[str] = Field(default_factory=list)

    # Role
    role_in_activity: str = "subject"  # subject, beneficiary, conductor


class SuspiciousActivity(BaseModel):
    """Details of suspicious activity"""
    activity_id: UUID = Field(default_factory=uuid4)
    activity_type: SuspiciousActivityType
    activity_description: str

    # Date range
    date_first_detected: datetime
    date_activity_started: datetime | None = None
    date_activity_ended: datetime | None = None

    # Amount
    total_amount: float = 0.0
    currency: str = "USD"

    # Instruments
    instruments_involved: list[str] = Field(default_factory=list)  # cash, wire, check, etc.

    # Products/Services
    products_involved: list[str] = Field(default_factory=list)

    # Geographic
    countries_involved: list[str] = Field(default_factory=list)


class TransactionDetail(BaseModel):
    """Transaction details for SAR"""
    transaction_id: str
    transaction_date: datetime
    transaction_type: str
    amount: float
    currency: str = "USD"
    direction: str  # in, out
    counterparty_name: str | None = None
    counterparty_account: str | None = None
    counterparty_institution: str | None = None
    location: str | None = None
    notes: str | None = None


class Narrative(BaseModel):
    """SAR narrative section"""
    narrative_id: UUID = Field(default_factory=uuid4)
    section: str  # who, what, when, where, why, how
    content: str
    version: int = 1
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    modified_by: str | None = None
    modified_at: datetime | None = None


class SARDocument(BaseModel):
    """Document attached to SAR"""
    document_id: UUID = Field(default_factory=uuid4)
    document_name: str
    document_type: str
    file_path: str
    file_size: int
    mime_type: str
    description: str | None = None
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SARApproval(BaseModel):
    """Approval record for SAR"""
    approval_id: UUID = Field(default_factory=uuid4)
    approver_id: str
    approver_name: str
    approver_role: str
    decision: str  # approved, rejected, returned
    comments: str | None = None
    approved_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SARSubmission(BaseModel):
    """SAR submission record"""
    submission_id: UUID = Field(default_factory=uuid4)
    submission_date: datetime
    submission_method: str  # efiling, batch
    batch_id: str | None = None

    # Filing reference
    bsa_id: str | None = None  # BSA tracking number
    acknowledgment_number: str | None = None

    # Response
    response_received: bool = False
    response_date: datetime | None = None
    response_status: str | None = None
    response_errors: list[str] = Field(default_factory=list)


class SAR(BaseModel):
    """Main SAR entity"""
    sar_id: UUID = Field(default_factory=uuid4)
    sar_number: str

    # SAR type and status
    sar_type: SARType = SARType.INITIAL
    status: SARStatus = SARStatus.DRAFT

    # Prior SAR reference
    prior_sar_number: str | None = None
    prior_bsa_id: str | None = None

    # Filing institution
    filing_institution: FilingInstitution

    # Subjects
    subjects: list[SubjectInfo] = Field(default_factory=list)
    primary_subject_index: int = 0

    # Suspicious activity
    activities: list[SuspiciousActivity] = Field(default_factory=list)
    primary_activity_type: SuspiciousActivityType

    # Financial summary
    total_suspicious_amount: float = 0.0
    cumulative_amount: float = 0.0

    # Transactions
    transactions: list[TransactionDetail] = Field(default_factory=list)
    transaction_count: int = 0

    # Narrative
    narratives: list[Narrative] = Field(default_factory=list)
    full_narrative: str | None = None

    # Law enforcement contact
    law_enforcement_contacted: bool = False
    law_enforcement_agency: str | None = None
    law_enforcement_contact_date: datetime | None = None

    # Documents
    documents: list[SARDocument] = Field(default_factory=list)

    # Related records
    case_ids: list[UUID] = Field(default_factory=list)
    alert_ids: list[UUID] = Field(default_factory=list)

    # Approval workflow
    approvals: list[SARApproval] = Field(default_factory=list)
    requires_approval_from: list[str] = Field(default_factory=list)

    # Submission
    submissions: list[SARSubmission] = Field(default_factory=list)
    last_submission: SARSubmission | None = None

    # Filing deadline
    filing_deadline: datetime
    extension_granted: bool = False
    extension_reason: str | None = None
    new_deadline: datetime | None = None

    # Preparer info
    prepared_by: str
    prepared_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    submitted_at: datetime | None = None

    # Metadata
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SARSummary(BaseModel):
    """Summary view of a SAR for listings"""
    sar_id: UUID
    sar_number: str
    sar_type: SARType
    status: SARStatus
    primary_subject_name: str
    primary_activity_type: SuspiciousActivityType
    total_amount: float
    filing_deadline: datetime
    prepared_by: str
    created_at: datetime
    submitted_at: datetime | None = None


class SARStatistics(BaseModel):
    """SAR statistics for reporting"""
    total_sars: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    by_activity_type: dict[str, int] = Field(default_factory=dict)
    by_sar_type: dict[str, int] = Field(default_factory=dict)
    filed_this_month: int = 0
    filed_this_quarter: int = 0
    filed_this_year: int = 0
    pending_filing: int = 0
    overdue: int = 0
    average_preparation_days: float = 0.0
    rejection_rate: float = 0.0


class SARCreateRequest(BaseModel):
    """Request to create a SAR"""
    sar_type: SARType = SARType.INITIAL
    prior_sar_number: str | None = None
    case_ids: list[UUID] = Field(default_factory=list)
    alert_ids: list[UUID] = Field(default_factory=list)
    primary_activity_type: SuspiciousActivityType


class SARUpdateRequest(BaseModel):
    """Request to update a SAR"""
    status: SARStatus | None = None
    subjects: list[SubjectInfo] | None = None
    activities: list[SuspiciousActivity] | None = None
    full_narrative: str | None = None
    law_enforcement_contacted: bool | None = None
    law_enforcement_agency: str | None = None


class SARSearchCriteria(BaseModel):
    """Search criteria for SARs"""
    statuses: list[SARStatus] | None = None
    sar_types: list[SARType] | None = None
    activity_types: list[SuspiciousActivityType] | None = None
    subject_names: list[str] | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    prepared_by: list[str] | None = None
    overdue_only: bool = False
    page: int = 1
    page_size: int = 50
    sort_by: str = "created_at"
    sort_order: str = "desc"
