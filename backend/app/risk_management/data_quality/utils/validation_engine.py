"""Data Validation Engine"""

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4


class ValidationSeverity(StrEnum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationStatus(StrEnum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class ValidationRuleDefinition:
    rule_id: str
    rule_name: str
    rule_type: str
    expression: str
    error_message: str
    severity: ValidationSeverity = ValidationSeverity.ERROR
    is_active: bool = True
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationError:
    error_id: str
    rule_id: str
    record_id: str
    field_name: str
    error_message: str
    invalid_value: str
    expected_value: str
    severity: ValidationSeverity
    detected_at: datetime


@dataclass
class ValidationResult:
    result_id: str
    rule_id: str
    status: ValidationStatus
    records_evaluated: int
    records_passed: int
    records_failed: int
    errors: list[ValidationError]
    execution_time_ms: int
    executed_at: datetime


class ValidationEngine:
    def __init__(self):
        self._rules: dict[str, ValidationRuleDefinition] = {}
        self._validators: dict[str, Callable] = {}
        self._register_builtin_validators()

    def _register_builtin_validators(self) -> None:
        self._validators["not_null"] = self._validate_not_null
        self._validators["not_empty"] = self._validate_not_empty
        self._validators["min_length"] = self._validate_min_length
        self._validators["max_length"] = self._validate_max_length
        self._validators["regex"] = self._validate_regex
        self._validators["email"] = self._validate_email
        self._validators["numeric"] = self._validate_numeric
        self._validators["integer"] = self._validate_integer
        self._validators["positive"] = self._validate_positive
        self._validators["range"] = self._validate_range
        self._validators["date_format"] = self._validate_date_format
        self._validators["in_list"] = self._validate_in_list
        self._validators["unique"] = self._validate_unique
        self._validators["referential"] = self._validate_referential

    def register_rule(
        self,
        rule_name: str,
        rule_type: str,
        expression: str,
        error_message: str,
        severity: ValidationSeverity = ValidationSeverity.ERROR,
        parameters: dict[str, Any] | None = None,
    ) -> ValidationRuleDefinition:
        rule_id = str(uuid4())
        rule = ValidationRuleDefinition(
            rule_id=rule_id,
            rule_name=rule_name,
            rule_type=rule_type,
            expression=expression,
            error_message=error_message,
            severity=severity,
            parameters=parameters or {},
        )
        self._rules[rule_id] = rule
        return rule

    def register_custom_validator(self, validator_name: str, validator_func: Callable) -> None:
        self._validators[validator_name] = validator_func

    def validate_record(
        self,
        record: dict[str, Any],
        rules: list[ValidationRuleDefinition],
        record_id: str = "",
    ) -> list[ValidationError]:
        errors = []

        for rule in rules:
            if not rule.is_active:
                continue

            validator = self._validators.get(rule.rule_type)
            if not validator:
                continue

            target_field = rule.parameters.get("field", rule.expression)
            value = record.get(target_field)

            is_valid, error_msg = validator(value, rule.parameters)

            if not is_valid:
                errors.append(
                    ValidationError(
                        error_id=str(uuid4()),
                        rule_id=rule.rule_id,
                        record_id=record_id,
                        field_name=target_field,
                        error_message=error_msg or rule.error_message,
                        invalid_value=str(value) if value is not None else "NULL",
                        expected_value=rule.expression,
                        severity=rule.severity,
                        detected_at=datetime.now(UTC),
                    )
                )

        return errors

    def validate_dataset(
        self,
        data: list[dict[str, Any]],
        rules: list[ValidationRuleDefinition],
        id_field: str = "id",
    ) -> ValidationResult:
        start_time = datetime.now(UTC)
        all_errors = []
        records_passed = 0

        for record in data:
            record_id = str(record.get(id_field, ""))
            errors = self.validate_record(record, rules, record_id)

            if errors:
                all_errors.extend(errors)
            else:
                records_passed += 1

        end_time = datetime.now(UTC)
        exec_time = int((end_time - start_time).total_seconds() * 1000)

        return ValidationResult(
            result_id=str(uuid4()),
            rule_id="dataset_validation",
            status=ValidationStatus.PASSED if not all_errors else ValidationStatus.FAILED,
            records_evaluated=len(data),
            records_passed=records_passed,
            records_failed=len(data) - records_passed,
            errors=all_errors,
            execution_time_ms=exec_time,
            executed_at=end_time,
        )

    def _validate_not_null(self, value: Any, params: dict[str, Any]) -> tuple:
        if value is None:
            return False, "Value cannot be null"
        return True, None

    def _validate_not_empty(self, value: Any, params: dict[str, Any]) -> tuple:
        if value is None or value == "":
            return False, "Value cannot be empty"
        return True, None

    def _validate_min_length(self, value: Any, params: dict[str, Any]) -> tuple:
        min_len = params.get("min_length", 0)
        if value is None:
            return False, f"Value must have minimum length of {min_len}"
        if len(str(value)) < min_len:
            return False, f"Value length {len(str(value))} is less than minimum {min_len}"
        return True, None

    def _validate_max_length(self, value: Any, params: dict[str, Any]) -> tuple:
        max_len = params.get("max_length", 1000)
        if value is None:
            return True, None
        if len(str(value)) > max_len:
            return False, f"Value length {len(str(value))} exceeds maximum {max_len}"
        return True, None

    def _validate_regex(self, value: Any, params: dict[str, Any]) -> tuple:
        pattern = params.get("pattern", ".*")
        if value is None:
            return False, "Value cannot be null for regex validation"
        if not re.match(pattern, str(value)):
            return False, f"Value does not match pattern {pattern}"
        return True, None

    def _validate_email(self, value: Any, params: dict[str, Any]) -> tuple:
        if value is None:
            return False, "Email cannot be null"
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, str(value)):
            return False, "Invalid email format"
        return True, None

    def _validate_numeric(self, value: Any, params: dict[str, Any]) -> tuple:
        if value is None:
            return False, "Value cannot be null for numeric validation"
        try:
            float(value)
            return True, None
        except (ValueError, TypeError):
            return False, "Value must be numeric"

    def _validate_integer(self, value: Any, params: dict[str, Any]) -> tuple:
        if value is None:
            return False, "Value cannot be null for integer validation"
        try:
            int(value)
            return True, None
        except (ValueError, TypeError):
            return False, "Value must be an integer"

    def _validate_positive(self, value: Any, params: dict[str, Any]) -> tuple:
        if value is None:
            return False, "Value cannot be null"
        try:
            num = float(value)
            if num <= 0:
                return False, "Value must be positive"
            return True, None
        except (ValueError, TypeError):
            return False, "Value must be numeric and positive"

    def _validate_range(self, value: Any, params: dict[str, Any]) -> tuple:
        min_val = params.get("min")
        max_val = params.get("max")

        if value is None:
            return False, "Value cannot be null for range validation"

        try:
            num = float(value)
            if min_val is not None and num < float(min_val):
                return False, f"Value {num} is below minimum {min_val}"
            if max_val is not None and num > float(max_val):
                return False, f"Value {num} exceeds maximum {max_val}"
            return True, None
        except (ValueError, TypeError):
            return False, "Value must be numeric for range validation"

    def _validate_date_format(self, value: Any, params: dict[str, Any]) -> tuple:
        date_format = params.get("format", "%Y-%m-%d")

        if value is None:
            return False, "Date value cannot be null"

        try:
            datetime.strptime(str(value), date_format)
            return True, None
        except ValueError:
            return False, f"Invalid date format, expected {date_format}"

    def _validate_in_list(self, value: Any, params: dict[str, Any]) -> tuple:
        allowed_values = params.get("values", [])

        if value is None:
            return False, "Value cannot be null"

        if value not in allowed_values:
            return False, f"Value must be one of: {allowed_values}"
        return True, None

    def _validate_unique(self, value: Any, params: dict[str, Any]) -> tuple:
        existing_values = params.get("existing_values", set())

        if value is None:
            return True, None

        if value in existing_values:
            return False, "Value must be unique"
        return True, None

    def _validate_referential(self, value: Any, params: dict[str, Any]) -> tuple:
        reference_values = params.get("reference_values", set())

        if value is None:
            allow_null = params.get("allow_null", True)
            if allow_null:
                return True, None
            return False, "Foreign key value cannot be null"

        if value not in reference_values:
            return False, "Foreign key reference not found"
        return True, None

    def get_rule(self, rule_id: str) -> ValidationRuleDefinition | None:
        return self._rules.get(rule_id)

    def get_all_rules(self) -> list[ValidationRuleDefinition]:
        return list(self._rules.values())

    def get_available_validators(self) -> list[str]:
        return list(self._validators.keys())


validation_engine = ValidationEngine()
