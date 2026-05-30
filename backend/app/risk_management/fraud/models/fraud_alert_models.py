"""
Fraud Alert Models

Defines data structures for fraud alerts.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class FraudAlertSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FraudAlertStatus(StrEnum):
    NEW = "new"
    ASSIGNED = "assigned"
    INVESTIGATING = "investigating"
    CONFIRMED_FRAUD = "confirmed_fraud"
    FALSE_POSITIVE = "false_positive"
    CLOSED = "closed"


class FraudType(StrEnum):
    ACCOUNT_TAKEOVER = "account_takeover"
    NEW_ACCOUNT_FRAUD = "new_account_fraud"
    CARD_NOT_PRESENT = "card_not_present"
    CARD_PRESENT = "card_present"
    IDENTITY_THEFT = "identity_theft"
    SYNTHETIC_IDENTITY = "synthetic_identity"
    FIRST_PARTY_FRAUD = "first_party_fraud"
    FRIENDLY_FRAUD = "friendly_fraud"
    CHECK_FRAUD = "check_fraud"
    WIRE_FRAUD = "wire_fraud"
    ACH_FRAUD = "ach_fraud"
    PHISHING = "phishing"
    SOCIAL_ENGINEERING = "social_engineering"
    APPLICATION_FRAUD = "application_fraud"


class FraudIndicator(BaseModel):
    indicator_id: UUID = Field(default_factory=uuid4)
    indicator_type: str
    indicator_name: str
    description: str
    weight: float = 1.0
    score: float = 0.0
    evidence: str | None = None


class FraudAlert(BaseModel):
    alert_id: UUID = Field(default_factory=uuid4)
    alert_number: str
    fraud_type: FraudType
    severity: FraudAlertSeverity
    status: FraudAlertStatus = FraudAlertStatus.NEW

    customer_id: str
    account_id: str | None = None
    transaction_id: str | None = None

    title: str
    description: str
    fraud_score: float = Field(ge=0, le=100)

    indicators: list[FraudIndicator] = Field(default_factory=list)
    detection_method: str
    detection_rule_id: str | None = None
    ml_model_id: str | None = None

    transaction_amount: float | None = None
    potential_loss: float = 0.0

    device_id: str | None = None
    ip_address: str | None = None
    location: dict[str, Any] | None = None

    assigned_to: str | None = None
    case_id: UUID | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    resolved_at: datetime | None = None

    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class FraudAlertSummary(BaseModel):
    alert_id: UUID
    alert_number: str
    fraud_type: FraudType
    severity: FraudAlertSeverity
    status: FraudAlertStatus
    customer_id: str
    fraud_score: float
    potential_loss: float
    created_at: datetime
    assigned_to: str | None = None


class FraudAlertStatistics(BaseModel):
    total_alerts: int = 0
    by_severity: dict[str, int] = Field(default_factory=dict)
    by_status: dict[str, int] = Field(default_factory=dict)
    by_fraud_type: dict[str, int] = Field(default_factory=dict)
    confirmed_fraud_count: int = 0
    false_positive_count: int = 0
    total_potential_loss: float = 0.0
    total_confirmed_loss: float = 0.0
    average_fraud_score: float = 0.0


class FraudAlertCreateRequest(BaseModel):
    fraud_type: FraudType
    severity: FraudAlertSeverity
    customer_id: str
    account_id: str | None = None
    transaction_id: str | None = None
    title: str
    description: str
    fraud_score: float = Field(ge=0, le=100)
    detection_method: str
    transaction_amount: float | None = None


class FraudAlertSearchCriteria(BaseModel):
    fraud_types: list[FraudType] | None = None
    severities: list[FraudAlertSeverity] | None = None
    statuses: list[FraudAlertStatus] | None = None
    customer_ids: list[str] | None = None
    min_fraud_score: float | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    page_size: int = 50
