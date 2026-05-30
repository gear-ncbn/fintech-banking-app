"""Data Validation Models"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ValidationType(StrEnum):
    SCHEMA = "schema"
    FORMAT = "format"
    RANGE = "range"
    REFERENTIAL = "referential"
    BUSINESS_RULE = "business_rule"
    CROSS_FIELD = "cross_field"
    TEMPORAL = "temporal"


class ValidationRule(BaseModel):
    rule_id: UUID = Field(default_factory=uuid4)
    rule_code: str
    rule_name: str
    rule_description: str
    validation_type: ValidationType
    target_table: str
    target_columns: list[str] = Field(default_factory=list)
    validation_expression: str
    error_message: str
    severity: str = "error"
    is_blocking: bool = False
    is_active: bool = True
    owner: str = ""
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ValidationExecution(BaseModel):
    execution_id: UUID = Field(default_factory=uuid4)
    execution_name: str
    execution_type: str  # batch, real_time, on_demand
    target_dataset: str
    rules_executed: list[UUID] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    status: str = "running"
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    error_count: int = 0
    triggered_by: str = ""


class ValidationResult(BaseModel):
    result_id: UUID = Field(default_factory=uuid4)
    execution_id: UUID
    rule_id: UUID
    rule_name: str
    validation_type: str
    records_evaluated: int = 0
    records_passed: int = 0
    records_failed: int = 0
    pass_percentage: Decimal = Decimal("100")
    status: str = "passed"
    error_samples: list[dict[str, Any]] = Field(default_factory=list)
    execution_time_ms: int = 0


class ValidationError(BaseModel):
    error_id: UUID = Field(default_factory=uuid4)
    result_id: UUID
    rule_id: UUID
    record_identifier: str
    error_type: str
    error_message: str
    field_name: str = ""
    invalid_value: str = ""
    expected_value: str = ""
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: str = "new"
    corrected: bool = False
    corrected_by: str | None = None
    correction_date: datetime | None = None


class ValidationSchedule(BaseModel):
    schedule_id: UUID = Field(default_factory=uuid4)
    schedule_name: str
    target_dataset: str
    rules: list[UUID] = Field(default_factory=list)
    cron_expression: str
    timezone: str = "UTC"
    is_active: bool = True
    last_run: datetime | None = None
    next_run: datetime | None = None
    notification_emails: list[str] = Field(default_factory=list)
    created_by: str = ""


class ValidationReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    report_period: str
    datasets_validated: int = 0
    rules_executed: int = 0
    total_records_validated: int = 0
    overall_pass_rate: Decimal = Decimal("100")
    validation_by_type: dict[str, dict[str, int]] = Field(default_factory=dict)
    top_failing_rules: list[dict[str, Any]] = Field(default_factory=list)
    trend_analysis: dict[str, Any] = Field(default_factory=dict)
    recommendations: list[str] = Field(default_factory=list)
    generated_by: str = ""
    status: str = "draft"


class RealTimeValidation(BaseModel):
    validation_id: UUID = Field(default_factory=uuid4)
    stream_name: str
    rule_id: UUID
    record_id: str
    validation_timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_valid: bool = True
    error_details: str | None = None
    processing_time_ms: int = 0
    action_taken: str = ""  # accepted, rejected, quarantined
