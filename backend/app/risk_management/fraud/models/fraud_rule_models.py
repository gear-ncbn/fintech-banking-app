"""
Fraud Rule Models

Defines data structures for fraud detection rules.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class RuleType(StrEnum):
    THRESHOLD = "threshold"
    VELOCITY = "velocity"
    PATTERN = "pattern"
    GEOGRAPHIC = "geographic"
    BEHAVIORAL = "behavioral"
    DEVICE = "device"
    TIME_BASED = "time_based"
    COMPOSITE = "composite"


class RuleStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TESTING = "testing"
    DEPRECATED = "deprecated"


class RuleAction(StrEnum):
    ALERT = "alert"
    BLOCK = "block"
    CHALLENGE = "challenge"
    REVIEW = "review"
    LOG = "log"


class RuleCondition(BaseModel):
    condition_id: UUID = Field(default_factory=uuid4)
    field: str
    operator: str
    value: Any
    data_type: str = "string"


class FraudRule(BaseModel):
    rule_id: UUID = Field(default_factory=uuid4)
    rule_code: str
    rule_name: str
    rule_type: RuleType
    description: str

    status: RuleStatus = RuleStatus.ACTIVE
    priority: int = 1

    conditions: list[RuleCondition] = Field(default_factory=list)
    logic_expression: str

    action: RuleAction = RuleAction.ALERT
    alert_severity: str = "medium"
    score_weight: float = 1.0

    applicable_channels: list[str] = Field(default_factory=list)
    applicable_products: list[str] = Field(default_factory=list)
    excluded_customers: list[str] = Field(default_factory=list)

    effective_from: datetime = Field(default_factory=lambda: datetime.now(UTC))
    effective_to: datetime | None = None

    hit_count: int = 0
    last_hit_at: datetime | None = None
    false_positive_rate: float = 0.0

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    version: int = 1
    parent_rule_id: UUID | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


class RuleSet(BaseModel):
    ruleset_id: UUID = Field(default_factory=uuid4)
    ruleset_name: str
    description: str

    rules: list[UUID] = Field(default_factory=list)
    evaluation_mode: str = "all"

    is_active: bool = True
    priority: int = 1

    applicable_channels: list[str] = Field(default_factory=list)

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RuleEvaluationResult(BaseModel):
    rule_id: UUID
    rule_name: str
    matched: bool
    score: float
    action: RuleAction
    conditions_matched: list[str] = Field(default_factory=list)
    evaluation_time_ms: float = 0.0


class RulePerformanceMetrics(BaseModel):
    rule_id: UUID
    rule_name: str
    total_evaluations: int = 0
    total_hits: int = 0
    hit_rate: float = 0.0
    true_positives: int = 0
    false_positives: int = 0
    false_positive_rate: float = 0.0
    average_evaluation_time_ms: float = 0.0
    period_start: datetime
    period_end: datetime
