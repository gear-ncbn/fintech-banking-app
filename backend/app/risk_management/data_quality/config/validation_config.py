"""Validation Configuration"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ValidationMode(StrEnum):
    STRICT = "strict"
    LENIENT = "lenient"
    CUSTOM = "custom"


class OnFailureAction(StrEnum):
    REJECT = "reject"
    WARN = "warn"
    LOG = "log"
    QUARANTINE = "quarantine"


@dataclass
class FieldValidationConfig:
    field_name: str
    validators: list[str]
    is_required: bool = True
    on_failure: OnFailureAction = OnFailureAction.REJECT
    custom_params: dict[str, Any] = field(default_factory=dict)


@dataclass
class DatasetValidationConfig:
    dataset_name: str
    mode: ValidationMode
    field_configs: dict[str, FieldValidationConfig]
    global_validators: list[str] = field(default_factory=list)
    fail_fast: bool = False
    max_errors: int = 1000


class ValidationConfig:
    def __init__(self):
        self._mode = ValidationMode.STRICT
        self._default_action = OnFailureAction.REJECT
        self._dataset_configs: dict[str, DatasetValidationConfig] = {}
        self._global_validators = [
            "not_null",
            "not_empty",
            "valid_format",
        ]
        self._builtin_validators = {
            "not_null": "Ensures value is not null",
            "not_empty": "Ensures value is not empty string",
            "valid_format": "Validates against expected format",
            "email": "Validates email format",
            "phone": "Validates phone number format",
            "date": "Validates date format",
            "numeric": "Ensures value is numeric",
            "integer": "Ensures value is integer",
            "positive": "Ensures value is positive",
            "range": "Validates value is within range",
            "regex": "Validates against regex pattern",
            "length": "Validates string length",
            "in_list": "Validates value is in allowed list",
            "unique": "Validates uniqueness",
            "foreign_key": "Validates foreign key reference",
        }
        self._custom_validators: dict[str, str] = {}

    def get_mode(self) -> ValidationMode:
        return self._mode

    def set_mode(self, mode: ValidationMode) -> None:
        self._mode = mode

    def get_default_action(self) -> OnFailureAction:
        return self._default_action

    def set_default_action(self, action: OnFailureAction) -> None:
        self._default_action = action

    def configure_dataset(
        self,
        dataset_name: str,
        mode: ValidationMode = None,
        fail_fast: bool = False,
        max_errors: int = 1000,
    ) -> DatasetValidationConfig:
        config = DatasetValidationConfig(
            dataset_name=dataset_name,
            mode=mode or self._mode,
            field_configs={},
            global_validators=self._global_validators.copy(),
            fail_fast=fail_fast,
            max_errors=max_errors,
        )
        self._dataset_configs[dataset_name] = config
        return config

    def add_field_config(
        self,
        dataset_name: str,
        field_name: str,
        validators: list[str],
        is_required: bool = True,
        on_failure: OnFailureAction = None,
        custom_params: dict[str, Any] | None = None,
    ) -> None:
        if dataset_name not in self._dataset_configs:
            self.configure_dataset(dataset_name)

        field_config = FieldValidationConfig(
            field_name=field_name,
            validators=validators,
            is_required=is_required,
            on_failure=on_failure or self._default_action,
            custom_params=custom_params or {},
        )
        self._dataset_configs[dataset_name].field_configs[field_name] = field_config

    def get_dataset_config(self, dataset_name: str) -> DatasetValidationConfig | None:
        return self._dataset_configs.get(dataset_name)

    def get_field_config(
        self, dataset_name: str, field_name: str
    ) -> FieldValidationConfig | None:
        dataset_config = self._dataset_configs.get(dataset_name)
        if dataset_config:
            return dataset_config.field_configs.get(field_name)
        return None

    def register_custom_validator(self, name: str, description: str) -> None:
        self._custom_validators[name] = description

    def get_available_validators(self) -> dict[str, str]:
        validators = self._builtin_validators.copy()
        validators.update(self._custom_validators)
        return validators

    def add_global_validator(self, validator: str) -> None:
        if validator not in self._global_validators:
            self._global_validators.append(validator)

    def remove_global_validator(self, validator: str) -> None:
        if validator in self._global_validators:
            self._global_validators.remove(validator)

    def export_config(self) -> dict[str, Any]:
        return {
            "mode": self._mode.value,
            "default_action": self._default_action.value,
            "global_validators": self._global_validators,
            "dataset_count": len(self._dataset_configs),
            "custom_validators": list(self._custom_validators.keys()),
        }


validation_config = ValidationConfig()
