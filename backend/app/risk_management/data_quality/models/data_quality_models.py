"""Data Quality Models"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class QualityDimension(StrEnum):
    ACCURACY = "accuracy"
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    TIMELINESS = "timeliness"
    UNIQUENESS = "uniqueness"
    VALIDITY = "validity"
    INTEGRITY = "integrity"


class RuleSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class DataQualityRule(BaseModel):
    rule_id: UUID = Field(default_factory=uuid4)
    rule_code: str
    rule_name: str
    rule_description: str
    dimension: QualityDimension
    severity: RuleSeverity
    data_domain: str
    table_name: str
    column_name: str | None = None
    rule_expression: str
    threshold_percentage: Decimal = Decimal("100")
    owner: str
    is_active: bool = True
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_modified: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DataQualityCheck(BaseModel):
    check_id: UUID = Field(default_factory=uuid4)
    rule_id: UUID
    check_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    total_records: int
    passed_records: int
    failed_records: int
    pass_percentage: Decimal
    status: str = "completed"
    execution_time_ms: int = 0
    error_samples: list[dict[str, Any]] = Field(default_factory=list)
    check_query: str = ""
    environment: str = "production"


class DataQualityScore(BaseModel):
    score_id: UUID = Field(default_factory=uuid4)
    score_date: date
    data_domain: str
    table_name: str
    overall_score: Decimal
    dimension_scores: dict[str, Decimal] = Field(default_factory=dict)
    rules_evaluated: int = 0
    rules_passed: int = 0
    rules_failed: int = 0
    trend: str = "stable"  # improving, declining, stable
    calculated_by: str = "system"


class DataQualityIssue(BaseModel):
    issue_id: UUID = Field(default_factory=uuid4)
    rule_id: UUID
    check_id: UUID
    issue_reference: str
    issue_type: str
    description: str
    affected_records: int
    impact_assessment: str
    root_cause: str = ""
    remediation_plan: str = ""
    assigned_to: str = ""
    due_date: date | None = None
    status: str = "open"
    priority: str = "medium"
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DataQualityReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    report_period: str
    generated_by: str
    domains_covered: list[str] = Field(default_factory=list)
    overall_quality_score: Decimal = Decimal("0")
    rules_executed: int = 0
    checks_passed: int = 0
    checks_failed: int = 0
    issues_identified: int = 0
    issues_resolved: int = 0
    dimension_summary: dict[str, dict[str, Any]] = Field(default_factory=dict)
    trend_analysis: dict[str, Any] = Field(default_factory=dict)
    recommendations: list[str] = Field(default_factory=list)
    status: str = "draft"


class DataQualityThreshold(BaseModel):
    threshold_id: UUID = Field(default_factory=uuid4)
    data_domain: str
    table_name: str
    dimension: QualityDimension
    minimum_score: Decimal
    target_score: Decimal
    alert_threshold: Decimal
    escalation_threshold: Decimal
    effective_date: date
    approved_by: str
    is_active: bool = True
