"""Data Masking Utilities for PII Protection"""

import hashlib
import re
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any
from uuid import uuid4


class MaskingType(StrEnum):
    REDACT = "redact"
    PARTIAL_MASK = "partial_mask"
    HASH = "hash"
    TOKENIZE = "tokenize"
    ENCRYPT = "encrypt"
    SUBSTITUTE = "substitute"
    SHUFFLE = "shuffle"
    NULLIFY = "nullify"


@dataclass
class MaskingRule:
    rule_id: str
    rule_name: str
    field_pattern: str
    masking_type: MaskingType
    parameters: dict[str, Any]
    is_active: bool = True


@dataclass
class MaskingResult:
    original_field: str
    masked_value: Any
    masking_type: MaskingType
    was_masked: bool


class DataMaskingUtilities:
    def __init__(self):
        self._rules: dict[str, MaskingRule] = {}
        self._token_vault: dict[str, str] = {}
        self._reverse_vault: dict[str, str] = {}
        self._masking_handlers: dict[MaskingType, Callable] = {}
        self._register_handlers()

    def _register_handlers(self) -> None:
        self._masking_handlers[MaskingType.REDACT] = self._mask_redact
        self._masking_handlers[MaskingType.PARTIAL_MASK] = self._mask_partial
        self._masking_handlers[MaskingType.HASH] = self._mask_hash
        self._masking_handlers[MaskingType.TOKENIZE] = self._mask_tokenize
        self._masking_handlers[MaskingType.SUBSTITUTE] = self._mask_substitute
        self._masking_handlers[MaskingType.NULLIFY] = self._mask_nullify

    def create_rule(
        self,
        rule_name: str,
        field_pattern: str,
        masking_type: MaskingType,
        parameters: dict[str, Any] | None = None,
    ) -> MaskingRule:
        rule = MaskingRule(
            rule_id=str(uuid4()),
            rule_name=rule_name,
            field_pattern=field_pattern,
            masking_type=masking_type,
            parameters=parameters or {},
        )
        self._rules[rule.rule_id] = rule
        return rule

    def mask_value(
        self,
        value: Any,
        masking_type: MaskingType,
        parameters: dict[str, Any] | None = None,
    ) -> MaskingResult:
        if value is None:
            return MaskingResult(
                original_field="",
                masked_value=None,
                masking_type=masking_type,
                was_masked=False,
            )

        handler = self._masking_handlers.get(masking_type)
        if handler:
            masked = handler(value, parameters or {})
            return MaskingResult(
                original_field=str(value),
                masked_value=masked,
                masking_type=masking_type,
                was_masked=True,
            )

        return MaskingResult(
            original_field=str(value),
            masked_value=value,
            masking_type=masking_type,
            was_masked=False,
        )

    def mask_record(
        self,
        record: dict[str, Any],
        field_rules: dict[str, MaskingRule],
    ) -> dict[str, Any]:
        masked = record.copy()

        for field_name, rule in field_rules.items():
            if field_name in masked and rule.is_active:
                result = self.mask_value(
                    masked[field_name],
                    rule.masking_type,
                    rule.parameters,
                )
                masked[field_name] = result.masked_value

        return masked

    def mask_dataset(
        self,
        data: list[dict[str, Any]],
        field_rules: dict[str, MaskingRule],
    ) -> list[dict[str, Any]]:
        return [self.mask_record(record, field_rules) for record in data]

    def auto_detect_and_mask(
        self,
        record: dict[str, Any],
    ) -> dict[str, Any]:
        masked = record.copy()
        pii_patterns = {
            "email": (r"email|e_mail|e-mail", MaskingType.PARTIAL_MASK),
            "phone": (r"phone|mobile|tel", MaskingType.PARTIAL_MASK),
            "ssn": (r"ssn|social_security|sin", MaskingType.REDACT),
            "credit_card": (r"card|cc_number|credit", MaskingType.PARTIAL_MASK),
            "address": (r"address|street|addr", MaskingType.PARTIAL_MASK),
            "name": (r"first_name|last_name|full_name", MaskingType.PARTIAL_MASK),
            "dob": (r"birth|dob|date_of_birth", MaskingType.REDACT),
            "password": (r"password|pwd|secret", MaskingType.REDACT),
        }

        for field_name, value in record.items():
            if value is None:
                continue

            field_lower = field_name.lower()
            for _pii_type, (pattern, mask_type) in pii_patterns.items():
                if re.search(pattern, field_lower, re.IGNORECASE):
                    result = self.mask_value(value, mask_type)
                    masked[field_name] = result.masked_value
                    break

        return masked

    def _mask_redact(self, value: Any, params: dict[str, Any]) -> str:
        return params.get("replacement", "***REDACTED***")

    def _mask_partial(self, value: Any, params: dict[str, Any]) -> str:
        str_value = str(value)
        visible_start = params.get("visible_start", 2)
        visible_end = params.get("visible_end", 2)
        mask_char = params.get("mask_char", "*")

        if len(str_value) <= visible_start + visible_end:
            return mask_char * len(str_value)

        start = str_value[:visible_start]
        end = str_value[-visible_end:] if visible_end > 0 else ""
        middle_len = len(str_value) - visible_start - visible_end
        middle = mask_char * middle_len

        return start + middle + end

    def _mask_hash(self, value: Any, params: dict[str, Any]) -> str:
        algorithm = params.get("algorithm", "sha256")
        salt = params.get("salt", "")

        salted_value = f"{salt}{value}"

        if algorithm == "sha256":
            return hashlib.sha256(salted_value.encode()).hexdigest()
        if algorithm == "md5":
            return hashlib.md5(salted_value.encode()).hexdigest()
        if algorithm == "sha512":
            return hashlib.sha512(salted_value.encode()).hexdigest()

        return hashlib.sha256(salted_value.encode()).hexdigest()

    def _mask_tokenize(self, value: Any, params: dict[str, Any]) -> str:
        str_value = str(value)

        if str_value in self._token_vault:
            return self._token_vault[str_value]

        token = f"TKN_{uuid4().hex[:16].upper()}"
        self._token_vault[str_value] = token
        self._reverse_vault[token] = str_value

        return token

    def detokenize(self, token: str) -> str | None:
        return self._reverse_vault.get(token)

    def _mask_substitute(self, value: Any, params: dict[str, Any]) -> Any:
        return params.get("substitute_value", "SUBSTITUTE")

    def _mask_nullify(self, value: Any, params: dict[str, Any]) -> None:
        return None

    def mask_email(self, email: str) -> str:
        if "@" not in email:
            return self._mask_partial(email, {"visible_start": 2, "visible_end": 0})

        parts = email.split("@")
        local = parts[0]
        domain = parts[1]

        masked_local = local[0] + "*" * (len(local) - 1) if len(local) > 1 else "*"
        return f"{masked_local}@{domain}"

    def mask_phone(self, phone: str) -> str:
        digits = re.sub(r"\D", "", phone)
        if len(digits) >= 4:
            return "*" * (len(digits) - 4) + digits[-4:]
        return "*" * len(digits)

    def mask_credit_card(self, card_number: str) -> str:
        digits = re.sub(r"\D", "", card_number)
        if len(digits) >= 4:
            return "*" * (len(digits) - 4) + digits[-4:]
        return "*" * len(digits)

    def get_rules(self) -> dict[str, MaskingRule]:
        return self._rules.copy()

    def clear_token_vault(self) -> None:
        self._token_vault.clear()
        self._reverse_vault.clear()


data_masking_utilities = DataMaskingUtilities()
