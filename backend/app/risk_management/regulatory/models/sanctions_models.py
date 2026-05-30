"""Sanctions Models - Data models for sanctions compliance"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class SanctionsList(StrEnum):
    OFAC_SDN = "ofac_sdn"
    OFAC_SSI = "ofac_ssi"
    OFAC_CAPTA = "ofac_capta"
    UN_CONSOLIDATED = "un_consolidated"
    EU_CONSOLIDATED = "eu_consolidated"
    UK_CONSOLIDATED = "uk_consolidated"
    FATF = "fatf"


class ScreeningType(StrEnum):
    NAME = "name"
    TRANSACTION = "transaction"
    PAYMENT = "payment"
    ONBOARDING = "onboarding"
    PERIODIC = "periodic"


class AlertStatus(StrEnum):
    NEW = "new"
    IN_REVIEW = "in_review"
    ESCALATED = "escalated"
    TRUE_MATCH = "true_match"
    FALSE_POSITIVE = "false_positive"
    CLOSED = "closed"


class MatchStrength(StrEnum):
    EXACT = "exact"
    STRONG = "strong"
    MEDIUM = "medium"
    WEAK = "weak"


class SanctionsListEntry(BaseModel):
    entry_id: UUID = Field(default_factory=uuid4)
    list_source: SanctionsList
    list_entry_id: str
    entry_type: str  # individual, entity, vessel, aircraft
    name: str
    aliases: list[str] = Field(default_factory=list)
    date_of_birth: date | None = None
    place_of_birth: str | None = None
    nationality: str | None = None
    passport_numbers: list[str] = Field(default_factory=list)
    id_numbers: list[str] = Field(default_factory=list)
    addresses: list[str] = Field(default_factory=list)
    programs: list[str] = Field(default_factory=list)
    sanctions_type: str
    listed_date: date
    delisted_date: date | None = None
    remarks: str | None = None
    is_active: bool = True
    last_updated: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ScreeningRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    screening_type: ScreeningType
    request_reference: str
    screening_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    requestor: str
    lists_screened: list[SanctionsList]
    subject_type: str
    subject_name: str
    subject_dob: date | None = None
    subject_country: str | None = None
    subject_id: str | None = None
    additional_data: dict[str, Any] = Field(default_factory=dict)
    matches_found: int = 0
    status: str = "pending"
    completed_date: datetime | None = None
    processing_time_ms: int | None = None


class ScreeningAlert(BaseModel):
    alert_id: UUID = Field(default_factory=uuid4)
    request_id: UUID
    alert_reference: str
    list_source: SanctionsList
    list_entry_id: str
    matched_name: str
    subject_name: str
    match_strength: MatchStrength
    match_score: Decimal
    match_fields: list[str]
    status: AlertStatus = AlertStatus.NEW
    assigned_to: str | None = None
    assigned_date: datetime | None = None
    decision: str | None = None
    decision_rationale: str | None = None
    decided_by: str | None = None
    decision_date: datetime | None = None
    escalated_to: str | None = None
    escalation_date: datetime | None = None
    sla_due_date: datetime
    is_overdue: bool = False


class SanctionsCase(BaseModel):
    case_id: UUID = Field(default_factory=uuid4)
    case_reference: str
    case_type: str  # potential_match, blocked_transaction, license_review
    source_alert_ids: list[UUID]
    customer_id: str | None = None
    transaction_ids: list[str] = Field(default_factory=list)
    case_status: str = "open"
    priority: str  # high, medium, low
    assigned_to: str
    assigned_date: datetime
    investigation_notes: list[dict[str, Any]] = Field(default_factory=list)
    documents_collected: list[str] = Field(default_factory=list)
    ofac_license_required: bool = False
    license_reference: str | None = None
    escalated: bool = False
    escalation_reason: str | None = None
    regulatory_filing_required: bool = False
    filing_reference: str | None = None
    final_decision: str | None = None
    decision_date: datetime | None = None
    closed_by: str | None = None
    closed_date: datetime | None = None


class BlockedTransaction(BaseModel):
    blocked_id: UUID = Field(default_factory=uuid4)
    transaction_id: str
    transaction_type: str
    transaction_date: datetime
    amount: Decimal
    currency: str
    originator: str
    originator_account: str
    beneficiary: str
    beneficiary_account: str
    blocking_reason: str
    blocked_date: datetime
    list_source: SanctionsList
    matched_entry: str
    case_id: UUID | None = None
    status: str = "blocked"
    release_authorized: bool = False
    release_authorization: str | None = None
    release_date: datetime | None = None
    rejected: bool = False
    rejection_date: datetime | None = None
    regulatory_reported: bool = False
    report_date: datetime | None = None


class SanctionsListUpdate(BaseModel):
    update_id: UUID = Field(default_factory=uuid4)
    list_source: SanctionsList
    update_date: date
    update_type: str  # additions, deletions, modifications
    entries_added: int
    entries_removed: int
    entries_modified: int
    file_reference: str
    processed_date: datetime
    processed_by: str
    rescreening_triggered: bool = False
    rescreening_completed: bool = False
    new_alerts_generated: int = 0


class SanctionsReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    reporting_period: str
    total_screenings: int
    screenings_by_type: dict[str, int]
    total_alerts: int
    alerts_by_strength: dict[str, int]
    true_matches: int
    false_positives: int
    false_positive_rate: Decimal
    blocked_transactions: int
    blocked_amount: Decimal
    cases_opened: int
    cases_closed: int
    average_resolution_time: float
    escalations: int
    regulatory_filings: int
    list_updates_processed: int
    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
