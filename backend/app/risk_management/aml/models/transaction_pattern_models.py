"""
Transaction Pattern Models

Defines data structures for transaction pattern analysis and detection.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class PatternType(StrEnum):
    """Types of transaction patterns"""
    STRUCTURING = "structuring"
    LAYERING = "layering"
    SMURFING = "smurfing"
    ROUND_TRIPPING = "round_tripping"
    RAPID_MOVEMENT = "rapid_movement"
    FAN_IN = "fan_in"
    FAN_OUT = "fan_out"
    CYCLIC = "cyclic"
    VELOCITY_SPIKE = "velocity_spike"
    AMOUNT_ANOMALY = "amount_anomaly"
    TIME_ANOMALY = "time_anomaly"
    GEOGRAPHIC_ANOMALY = "geographic_anomaly"
    COUNTERPARTY_ANOMALY = "counterparty_anomaly"
    DORMANT_ACTIVATION = "dormant_activation"
    MIRROR_TRADING = "mirror_trading"


class PatternSeverity(StrEnum):
    """Severity of detected patterns"""
    INFORMATIONAL = "informational"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PatternStatus(StrEnum):
    """Status of pattern detection"""
    DETECTED = "detected"
    UNDER_REVIEW = "under_review"
    CONFIRMED = "confirmed"
    DISMISSED = "dismissed"
    ESCALATED = "escalated"


class TransactionNode(BaseModel):
    """Node in a transaction flow"""
    node_id: str
    node_type: str  # account, customer, external_entity
    node_name: str
    account_id: str | None = None
    customer_id: str | None = None
    is_internal: bool = True
    risk_score: float = 0.0
    country: str | None = None


class TransactionEdge(BaseModel):
    """Edge in a transaction flow"""
    edge_id: UUID = Field(default_factory=uuid4)
    source_node_id: str
    target_node_id: str
    transaction_id: str
    amount: float
    currency: str
    transaction_date: datetime
    transaction_type: str
    channel: str | None = None


class TransactionFlow(BaseModel):
    """Complete transaction flow"""
    flow_id: UUID = Field(default_factory=uuid4)

    # Flow structure
    nodes: list[TransactionNode] = Field(default_factory=list)
    edges: list[TransactionEdge] = Field(default_factory=list)

    # Flow metrics
    total_amount: float = 0.0
    transaction_count: int = 0
    unique_entities: int = 0

    # Time window
    start_date: datetime
    end_date: datetime
    duration_hours: float = 0.0

    # Geographic span
    countries_involved: list[str] = Field(default_factory=list)
    high_risk_jurisdictions: list[str] = Field(default_factory=list)


class StructuringPattern(BaseModel):
    """Structuring pattern detection"""
    pattern_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    # Pattern details
    transactions: list[str] = Field(default_factory=list)
    total_amount: float = 0.0
    individual_amounts: list[float] = Field(default_factory=list)
    reporting_threshold: float = 10000.0

    # Analysis
    amount_below_threshold_count: int = 0
    amount_below_threshold_total: float = 0.0
    average_amount: float = 0.0
    max_amount: float = 0.0

    # Time analysis
    time_window_days: int = 1
    transactions_per_day: float = 0.0

    # Confidence
    confidence_score: float = 0.0
    indicators: list[str] = Field(default_factory=list)


class LayeringPattern(BaseModel):
    """Layering pattern detection"""
    pattern_id: UUID = Field(default_factory=uuid4)

    # Entities involved
    origin_entity: str
    intermediate_entities: list[str] = Field(default_factory=list)
    final_entity: str

    # Transaction chain
    transaction_chain: list[str] = Field(default_factory=list)
    layer_count: int = 0

    # Amounts
    initial_amount: float = 0.0
    final_amount: float = 0.0
    amount_variance: float = 0.0

    # Timing
    chain_duration_hours: float = 0.0
    average_hop_time_hours: float = 0.0

    # Geographic
    jurisdictions_involved: list[str] = Field(default_factory=list)

    # Confidence
    confidence_score: float = 0.0
    layer_indicators: list[str] = Field(default_factory=list)


class VelocityPattern(BaseModel):
    """Velocity anomaly pattern"""
    pattern_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    account_id: str

    # Current period
    current_period_start: datetime
    current_period_end: datetime
    current_transaction_count: int = 0
    current_transaction_amount: float = 0.0

    # Historical baseline
    baseline_avg_count: float = 0.0
    baseline_avg_amount: float = 0.0
    baseline_std_count: float = 0.0
    baseline_std_amount: float = 0.0

    # Deviation
    count_deviation: float = 0.0
    amount_deviation: float = 0.0
    count_z_score: float = 0.0
    amount_z_score: float = 0.0

    # Confidence
    confidence_score: float = 0.0


class GeographicPattern(BaseModel):
    """Geographic anomaly pattern"""
    pattern_id: UUID = Field(default_factory=uuid4)
    customer_id: str

    # Transaction details
    transaction_ids: list[str] = Field(default_factory=list)

    # Geographic analysis
    unusual_countries: list[str] = Field(default_factory=list)
    high_risk_countries: list[str] = Field(default_factory=list)
    new_countries: list[str] = Field(default_factory=list)

    # Expected vs Actual
    expected_countries: list[str] = Field(default_factory=list)
    actual_countries: list[str] = Field(default_factory=list)

    # Risk metrics
    high_risk_amount: float = 0.0
    high_risk_percentage: float = 0.0

    # Confidence
    confidence_score: float = 0.0


class DetectedPattern(BaseModel):
    """Generic detected pattern"""
    pattern_id: UUID = Field(default_factory=uuid4)
    pattern_type: PatternType
    severity: PatternSeverity
    status: PatternStatus = PatternStatus.DETECTED

    # Subject
    primary_entity_id: str
    primary_entity_type: str
    primary_entity_name: str

    # Transactions involved
    transaction_ids: list[str] = Field(default_factory=list)
    transaction_count: int = 0
    total_amount: float = 0.0

    # Detection details
    detection_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    detection_rule_id: str
    detection_rule_name: str
    confidence_score: float = Field(ge=0, le=1)

    # Pattern-specific data
    pattern_details: dict[str, Any] = Field(default_factory=dict)

    # Related patterns
    related_patterns: list[UUID] = Field(default_factory=list)

    # Alert linkage
    alert_id: UUID | None = None

    # Review
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PatternRule(BaseModel):
    """Rule for pattern detection"""
    rule_id: UUID = Field(default_factory=uuid4)
    rule_code: str
    rule_name: str
    pattern_type: PatternType

    # Rule definition
    description: str
    logic_expression: str

    # Parameters
    parameters: dict[str, Any] = Field(default_factory=dict)
    thresholds: dict[str, float] = Field(default_factory=dict)

    # Scoring
    base_severity: PatternSeverity
    score_weight: float = 1.0

    # Applicability
    applicable_products: list[str] = Field(default_factory=list)
    applicable_customer_types: list[str] = Field(default_factory=list)
    excluded_customers: list[str] = Field(default_factory=list)

    # Status
    is_active: bool = True
    effective_from: datetime
    effective_to: datetime | None = None

    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_modified_by: str | None = None
    last_modified_at: datetime | None = None
    version: int = 1


class PatternAnalysisRequest(BaseModel):
    """Request for pattern analysis"""
    request_id: UUID = Field(default_factory=uuid4)

    # Scope
    customer_ids: list[str] | None = None
    account_ids: list[str] | None = None
    transaction_ids: list[str] | None = None

    # Time window
    date_from: datetime
    date_to: datetime

    # Analysis type
    pattern_types: list[PatternType] | None = None
    analysis_depth: str = "standard"  # quick, standard, deep

    # Thresholds
    min_confidence_score: float = 0.7

    # Requestor
    requested_by: str
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PatternAnalysisResult(BaseModel):
    """Result of pattern analysis"""
    result_id: UUID = Field(default_factory=uuid4)
    request_id: UUID

    # Scope analyzed
    customers_analyzed: int = 0
    accounts_analyzed: int = 0
    transactions_analyzed: int = 0

    # Findings
    patterns_detected: int = 0
    detected_patterns: list[DetectedPattern] = Field(default_factory=list)

    # By type
    patterns_by_type: dict[str, int] = Field(default_factory=dict)
    patterns_by_severity: dict[str, int] = Field(default_factory=dict)

    # Processing
    analysis_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    processing_time_seconds: float = 0.0
    rules_executed: int = 0

    # Alerts generated
    alerts_generated: int = 0
    alert_ids: list[UUID] = Field(default_factory=list)


class TransactionProfileDeviation(BaseModel):
    """Deviation from expected transaction profile"""
    deviation_id: UUID = Field(default_factory=uuid4)
    customer_id: str
    account_id: str

    # Deviation type
    deviation_type: str
    deviation_description: str

    # Expected vs Actual
    expected_value: float
    actual_value: float
    deviation_percentage: float
    z_score: float

    # Transactions causing deviation
    transaction_ids: list[str] = Field(default_factory=list)

    # Time period
    period_start: datetime
    period_end: datetime

    # Significance
    severity: PatternSeverity
    confidence_score: float

    # Detection
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    detection_model: str
