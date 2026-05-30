"""
Fraud Investigation Models

Defines data structures for fraud investigation workflow.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class InvestigationStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PENDING_INFO = "pending_info"
    ESCALATED = "escalated"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InvestigationType(StrEnum):
    STANDARD = "standard"
    EXPEDITED = "expedited"
    COMPLEX = "complex"
    EXTERNAL = "external"


class InvestigationOutcome(StrEnum):
    FRAUD_CONFIRMED = "fraud_confirmed"
    NO_FRAUD = "no_fraud"
    INCONCLUSIVE = "inconclusive"
    CUSTOMER_ERROR = "customer_error"


class InvestigationStep(BaseModel):
    step_id: UUID = Field(default_factory=uuid4)
    step_name: str
    step_type: str
    order: int

    status: str = "pending"
    is_required: bool = True

    assigned_to: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None

    result: str | None = None
    notes: str | None = None
    evidence: list[str] = Field(default_factory=list)


class CustomerContact(BaseModel):
    contact_id: UUID = Field(default_factory=uuid4)
    contact_type: str
    contact_method: str

    contacted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    contacted_by: str

    outcome: str
    notes: str

    follow_up_required: bool = False
    follow_up_date: datetime | None = None


class FraudInvestigation(BaseModel):
    investigation_id: UUID = Field(default_factory=uuid4)
    investigation_number: str

    case_id: UUID
    alert_ids: list[UUID] = Field(default_factory=list)

    investigation_type: InvestigationType = InvestigationType.STANDARD
    status: InvestigationStatus = InvestigationStatus.PENDING

    customer_id: str
    customer_name: str

    disputed_amount: float = 0.0
    disputed_transactions: list[str] = Field(default_factory=list)

    steps: list[InvestigationStep] = Field(default_factory=list)
    current_step: int = 0

    customer_contacts: list[CustomerContact] = Field(default_factory=list)

    assigned_investigator: str | None = None
    supervisor: str | None = None

    priority: str = "medium"
    sla_deadline: datetime

    outcome: InvestigationOutcome | None = None
    outcome_reason: str | None = None

    liability_decision: str | None = None
    refund_amount: float = 0.0
    refund_processed: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None

    regulatory_reported: bool = False
    law_enforcement_involved: bool = False

    documents: list[dict[str, Any]] = Field(default_factory=list)
    notes: list[dict[str, Any]] = Field(default_factory=list)

    metadata: dict[str, Any] = Field(default_factory=dict)


class DisputeRecord(BaseModel):
    dispute_id: UUID = Field(default_factory=uuid4)
    investigation_id: UUID

    customer_id: str
    account_id: str

    transaction_id: str
    transaction_date: datetime
    transaction_amount: float
    merchant_name: str | None = None

    dispute_reason: str
    customer_statement: str

    provisional_credit_given: bool = False
    provisional_credit_amount: float = 0.0
    provisional_credit_date: datetime | None = None

    final_decision: str | None = None
    final_decision_date: datetime | None = None

    chargeback_filed: bool = False
    chargeback_date: datetime | None = None
    chargeback_status: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class InvestigationTemplate(BaseModel):
    template_id: UUID = Field(default_factory=uuid4)
    template_name: str
    investigation_type: InvestigationType

    description: str

    required_steps: list[dict[str, Any]] = Field(default_factory=list)
    optional_steps: list[dict[str, Any]] = Field(default_factory=list)

    default_sla_hours: int = 48

    is_active: bool = True

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class InvestigationStatistics(BaseModel):
    total_investigations: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    by_type: dict[str, int] = Field(default_factory=dict)
    by_outcome: dict[str, int] = Field(default_factory=dict)
    total_disputed_amount: float = 0.0
    total_refunded: float = 0.0
    average_resolution_days: float = 0.0
    sla_compliance_rate: float = 0.0
    open_investigations: int = 0
    overdue_investigations: int = 0
