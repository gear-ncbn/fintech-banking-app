"""
Fraud Pattern Models

Defines data structures for fraud pattern recognition.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class FraudPatternType(StrEnum):
    VELOCITY = "velocity"
    GEO_ANOMALY = "geo_anomaly"
    DEVICE_SWITCHING = "device_switching"
    ACCOUNT_ENUMERATION = "account_enumeration"
    CREDENTIAL_STUFFING = "credential_stuffing"
    CARD_TESTING = "card_testing"
    BUST_OUT = "bust_out"
    MULE_ACTIVITY = "mule_activity"
    COLLUSION = "collusion"
    BOT_ACTIVITY = "bot_activity"


class PatternConfidence(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class FraudPattern(BaseModel):
    pattern_id: UUID = Field(default_factory=uuid4)
    pattern_type: FraudPatternType
    pattern_name: str
    description: str

    detection_criteria: dict[str, Any] = Field(default_factory=dict)
    confidence: PatternConfidence = PatternConfidence.MEDIUM

    entities_involved: list[str] = Field(default_factory=list)
    transactions_involved: list[str] = Field(default_factory=list)

    total_amount: float = 0.0
    transaction_count: int = 0

    time_span_hours: float = 0.0
    first_activity: datetime
    last_activity: datetime

    risk_score: float = Field(ge=0, le=100)

    alert_id: UUID | None = None
    case_id: UUID | None = None

    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    detected_by: str

    is_confirmed: bool = False
    confirmed_by: str | None = None
    confirmed_at: datetime | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


class PatternDefinition(BaseModel):
    definition_id: UUID = Field(default_factory=uuid4)
    pattern_type: FraudPatternType
    pattern_name: str
    description: str

    detection_rules: list[dict[str, Any]] = Field(default_factory=list)
    thresholds: dict[str, float] = Field(default_factory=dict)

    lookback_period_hours: int = 24
    min_events_required: int = 1

    severity: str = "medium"
    auto_alert: bool = True
    auto_block: bool = False

    is_active: bool = True

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class VelocityPattern(BaseModel):
    pattern_id: UUID = Field(default_factory=uuid4)
    entity_type: str
    entity_id: str

    metric_type: str
    time_window_minutes: int

    threshold_value: float
    actual_value: float
    excess_percentage: float

    events: list[dict[str, Any]] = Field(default_factory=list)

    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class GeoAnomalyPattern(BaseModel):
    pattern_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    location_1: dict[str, Any]
    location_2: dict[str, Any]

    distance_km: float
    time_diff_minutes: float
    required_speed_kmh: float

    is_physically_impossible: bool

    event_1_id: str
    event_2_id: str

    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MulePattern(BaseModel):
    pattern_id: UUID = Field(default_factory=uuid4)

    suspected_mule_id: str
    suspected_mule_account: str

    incoming_transactions: list[dict[str, Any]] = Field(default_factory=list)
    outgoing_transactions: list[dict[str, Any]] = Field(default_factory=list)

    total_incoming: float = 0.0
    total_outgoing: float = 0.0
    retention_amount: float = 0.0

    unique_sources: int = 0
    unique_destinations: int = 0

    time_span_hours: float = 0.0

    risk_indicators: list[str] = Field(default_factory=list)
    confidence: PatternConfidence = PatternConfidence.MEDIUM

    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PatternStatistics(BaseModel):
    total_patterns_detected: int = 0
    by_pattern_type: dict[str, int] = Field(default_factory=dict)
    by_confidence: dict[str, int] = Field(default_factory=dict)
    confirmed_patterns: int = 0
    false_positives: int = 0
    total_amount_involved: float = 0.0
