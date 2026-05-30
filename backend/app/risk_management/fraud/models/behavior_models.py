"""
Behavioral Analysis Models

Defines data structures for user behavior analysis.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class BehaviorCategory(StrEnum):
    LOGIN = "login"
    TRANSACTION = "transaction"
    NAVIGATION = "navigation"
    ACCOUNT_MANAGEMENT = "account_management"
    COMMUNICATION = "communication"


class AnomalyType(StrEnum):
    TIME_ANOMALY = "time_anomaly"
    LOCATION_ANOMALY = "location_anomaly"
    VELOCITY_ANOMALY = "velocity_anomaly"
    AMOUNT_ANOMALY = "amount_anomaly"
    DEVICE_ANOMALY = "device_anomaly"
    PATTERN_ANOMALY = "pattern_anomaly"


class BehaviorPattern(BaseModel):
    pattern_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    pattern_type: str

    typical_login_times: list[int] = Field(default_factory=list)
    typical_login_days: list[int] = Field(default_factory=list)
    typical_locations: list[str] = Field(default_factory=list)
    typical_devices: list[str] = Field(default_factory=list)

    avg_session_duration_minutes: float = 0.0
    avg_transactions_per_session: float = 0.0
    avg_transaction_amount: float = 0.0
    typical_transaction_types: list[str] = Field(default_factory=list)
    typical_counterparties: list[str] = Field(default_factory=list)

    profile_start_date: datetime
    profile_end_date: datetime
    total_data_points: int = 0
    confidence_score: float = 0.0

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class BehaviorEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    session_id: UUID | None = None

    event_type: str
    category: BehaviorCategory

    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    device_id: str | None = None
    ip_address: str | None = None
    location: dict[str, Any] | None = None

    event_data: dict[str, Any] = Field(default_factory=dict)

    is_anomalous: bool = False
    anomaly_score: float = 0.0
    anomaly_types: list[AnomalyType] = Field(default_factory=list)


class BehaviorAnomaly(BaseModel):
    anomaly_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    event_id: UUID

    anomaly_type: AnomalyType
    description: str
    severity: str

    expected_value: Any | None = None
    actual_value: Any | None = None
    deviation_score: float = 0.0

    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    is_reviewed: bool = False
    reviewed_by: str | None = None
    review_result: str | None = None


class BehaviorScore(BaseModel):
    score_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    overall_score: float = Field(ge=0, le=100)

    login_behavior_score: float = 0.0
    transaction_behavior_score: float = 0.0
    device_behavior_score: float = 0.0
    location_behavior_score: float = 0.0

    anomaly_count_24h: int = 0
    anomaly_count_7d: int = 0
    anomaly_count_30d: int = 0

    risk_level: str = "low"
    risk_factors: list[str] = Field(default_factory=list)

    calculated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    valid_until: datetime


class BehaviorProfileUpdate(BaseModel):
    update_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    update_type: str
    old_pattern: dict[str, Any] | None = None
    new_pattern: dict[str, Any]

    reason: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_by: str


class BehaviorStatistics(BaseModel):
    total_profiles: int = 0
    profiles_updated_today: int = 0
    anomalies_detected_today: int = 0
    average_behavior_score: float = 0.0
    high_risk_customers: int = 0
