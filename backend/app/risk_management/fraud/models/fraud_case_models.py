"""
Fraud Case Models

Defines data structures for fraud investigation cases.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class FraudCaseStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    CONFIRMED_FRAUD = "confirmed_fraud"
    NOT_FRAUD = "not_fraud"
    ESCALATED = "escalated"
    CLOSED = "closed"


class FraudCasePriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RecoveryStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PARTIAL_RECOVERY = "partial_recovery"
    FULL_RECOVERY = "full_recovery"
    UNABLE_TO_RECOVER = "unable_to_recover"


class CaseAction(BaseModel):
    action_id: UUID = Field(default_factory=uuid4)
    action_type: str
    description: str
    performed_by: str
    performed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    result: str | None = None
    notes: str | None = None


class CaseFinding(BaseModel):
    finding_id: UUID = Field(default_factory=uuid4)
    finding_type: str
    description: str
    evidence: list[str] = Field(default_factory=list)
    severity: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FraudCase(BaseModel):
    case_id: UUID = Field(default_factory=uuid4)
    case_number: str
    title: str
    description: str

    status: FraudCaseStatus = FraudCaseStatus.OPEN
    priority: FraudCasePriority = FraudCasePriority.MEDIUM

    customer_id: str
    customer_name: str
    account_ids: list[str] = Field(default_factory=list)

    alert_ids: list[UUID] = Field(default_factory=list)
    transaction_ids: list[str] = Field(default_factory=list)

    total_fraud_amount: float = 0.0
    recovered_amount: float = 0.0
    recovery_status: RecoveryStatus = RecoveryStatus.NOT_STARTED

    fraud_type: str
    fraud_confirmed: bool = False
    fraud_vector: str | None = None

    assigned_to: str | None = None
    investigator_notes: str | None = None

    actions: list[CaseAction] = Field(default_factory=list)
    findings: list[CaseFinding] = Field(default_factory=list)

    law_enforcement_reported: bool = False
    law_enforcement_reference: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    closed_at: datetime | None = None
    due_date: datetime | None = None

    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class FraudCaseSummary(BaseModel):
    case_id: UUID
    case_number: str
    title: str
    status: FraudCaseStatus
    priority: FraudCasePriority
    customer_name: str
    fraud_type: str
    total_fraud_amount: float
    assigned_to: str | None = None
    created_at: datetime


class FraudCaseStatistics(BaseModel):
    total_cases: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)
    by_priority: dict[str, int] = Field(default_factory=dict)
    confirmed_fraud_cases: int = 0
    total_fraud_amount: float = 0.0
    total_recovered: float = 0.0
    recovery_rate: float = 0.0
    open_cases: int = 0
    overdue_cases: int = 0
