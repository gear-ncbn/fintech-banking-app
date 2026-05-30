"""Data Reconciliation Utilities"""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import uuid4


class ReconciliationType(StrEnum):
    COUNT_MATCH = "count_match"
    SUM_MATCH = "sum_match"
    RECORD_MATCH = "record_match"
    HASH_MATCH = "hash_match"
    BALANCE_MATCH = "balance_match"


class ReconciliationStatus(StrEnum):
    MATCHED = "matched"
    MISMATCHED = "mismatched"
    PARTIAL_MATCH = "partial_match"
    MISSING_SOURCE = "missing_source"
    MISSING_TARGET = "missing_target"


@dataclass
class ReconciliationBreak:
    break_id: str
    break_type: str
    key_value: str
    source_value: Any
    target_value: Any
    difference: Any
    severity: str
    detected_at: datetime


@dataclass
class ReconciliationResult:
    result_id: str
    reconciliation_type: ReconciliationType
    source_name: str
    target_name: str
    status: ReconciliationStatus
    source_count: int
    target_count: int
    matched_count: int
    unmatched_count: int
    match_rate: Decimal
    breaks: list[ReconciliationBreak]
    source_total: Decimal | None
    target_total: Decimal | None
    difference: Decimal | None
    execution_time_ms: int
    executed_at: datetime


class DataReconciliationUtilities:
    def __init__(self):
        self._tolerance_percentage = Decimal("0.01")
        self._tolerance_absolute = Decimal("0.01")

    def reconcile_counts(
        self,
        source_data: list[dict[str, Any]],
        target_data: list[dict[str, Any]],
        source_name: str = "source",
        target_name: str = "target",
    ) -> ReconciliationResult:
        start_time = datetime.now(UTC)

        source_count = len(source_data)
        target_count = len(target_data)
        difference = source_count - target_count

        if difference == 0:
            status = ReconciliationStatus.MATCHED
        else:
            status = ReconciliationStatus.MISMATCHED

        breaks = []
        if difference != 0:
            breaks.append(
                ReconciliationBreak(
                    break_id=str(uuid4()),
                    break_type="count_mismatch",
                    key_value="total_records",
                    source_value=source_count,
                    target_value=target_count,
                    difference=difference,
                    severity="high" if abs(difference) > 100 else "medium",
                    detected_at=datetime.now(UTC),
                )
            )

        end_time = datetime.now(UTC)
        exec_time = int((end_time - start_time).total_seconds() * 1000)

        return ReconciliationResult(
            result_id=str(uuid4()),
            reconciliation_type=ReconciliationType.COUNT_MATCH,
            source_name=source_name,
            target_name=target_name,
            status=status,
            source_count=source_count,
            target_count=target_count,
            matched_count=min(source_count, target_count),
            unmatched_count=abs(difference),
            match_rate=Decimal("100") if difference == 0 else Decimal(str(round(min(source_count, target_count) / max(source_count, target_count) * 100, 2))),
            breaks=breaks,
            source_total=None,
            target_total=None,
            difference=Decimal(str(difference)),
            execution_time_ms=exec_time,
            executed_at=end_time,
        )

    def reconcile_sums(
        self,
        source_data: list[dict[str, Any]],
        target_data: list[dict[str, Any]],
        sum_field: str,
        source_name: str = "source",
        target_name: str = "target",
    ) -> ReconciliationResult:
        start_time = datetime.now(UTC)

        source_total = sum(
            Decimal(str(r.get(sum_field, 0))) for r in source_data if r.get(sum_field) is not None
        )
        target_total = sum(
            Decimal(str(r.get(sum_field, 0))) for r in target_data if r.get(sum_field) is not None
        )

        difference = source_total - target_total
        abs_diff = abs(difference)

        tolerance = max(
            self._tolerance_absolute,
            source_total * self._tolerance_percentage / Decimal("100"),
        )

        if abs_diff <= tolerance:
            status = ReconciliationStatus.MATCHED
        else:
            status = ReconciliationStatus.MISMATCHED

        breaks = []
        if status == ReconciliationStatus.MISMATCHED:
            breaks.append(
                ReconciliationBreak(
                    break_id=str(uuid4()),
                    break_type="sum_mismatch",
                    key_value=sum_field,
                    source_value=float(source_total),
                    target_value=float(target_total),
                    difference=float(difference),
                    severity="critical" if abs_diff > source_total * Decimal("0.01") else "high",
                    detected_at=datetime.now(UTC),
                )
            )

        end_time = datetime.now(UTC)
        exec_time = int((end_time - start_time).total_seconds() * 1000)

        return ReconciliationResult(
            result_id=str(uuid4()),
            reconciliation_type=ReconciliationType.SUM_MATCH,
            source_name=source_name,
            target_name=target_name,
            status=status,
            source_count=len(source_data),
            target_count=len(target_data),
            matched_count=len(source_data) if status == ReconciliationStatus.MATCHED else 0,
            unmatched_count=0 if status == ReconciliationStatus.MATCHED else len(source_data),
            match_rate=Decimal("100") if status == ReconciliationStatus.MATCHED else Decimal("0"),
            breaks=breaks,
            source_total=source_total,
            target_total=target_total,
            difference=difference,
            execution_time_ms=exec_time,
            executed_at=end_time,
        )

    def reconcile_records(
        self,
        source_data: list[dict[str, Any]],
        target_data: list[dict[str, Any]],
        key_fields: list[str],
        compare_fields: list[str] | None = None,
        source_name: str = "source",
        target_name: str = "target",
    ) -> ReconciliationResult:
        start_time = datetime.now(UTC)

        source_map = {}
        for record in source_data:
            key = tuple(str(record.get(f, "")) for f in key_fields)
            source_map[key] = record

        target_map = {}
        for record in target_data:
            key = tuple(str(record.get(f, "")) for f in key_fields)
            target_map[key] = record

        source_keys = set(source_map.keys())
        target_keys = set(target_map.keys())

        matched_keys = source_keys & target_keys
        source_only = source_keys - target_keys
        target_only = target_keys - source_keys

        breaks = []
        matched_count = 0

        for key in source_only:
            breaks.append(
                ReconciliationBreak(
                    break_id=str(uuid4()),
                    break_type="missing_in_target",
                    key_value=str(key),
                    source_value=source_map[key],
                    target_value=None,
                    difference="record_missing",
                    severity="high",
                    detected_at=datetime.now(UTC),
                )
            )

        for key in target_only:
            breaks.append(
                ReconciliationBreak(
                    break_id=str(uuid4()),
                    break_type="missing_in_source",
                    key_value=str(key),
                    source_value=None,
                    target_value=target_map[key],
                    difference="record_extra",
                    severity="high",
                    detected_at=datetime.now(UTC),
                )
            )

        fields_to_compare = compare_fields or list(
            set(source_data[0].keys()) if source_data else set()
        )

        for key in matched_keys:
            source_record = source_map[key]
            target_record = target_map[key]
            has_diff = False

            for field_name in fields_to_compare:
                source_val = source_record.get(field_name)
                target_val = target_record.get(field_name)

                if source_val != target_val:
                    has_diff = True
                    breaks.append(
                        ReconciliationBreak(
                            break_id=str(uuid4()),
                            break_type="value_mismatch",
                            key_value=f"{key}.{field_name}",
                            source_value=source_val,
                            target_value=target_val,
                            difference=f"{source_val} != {target_val}",
                            severity="medium",
                            detected_at=datetime.now(UTC),
                        )
                    )

            if not has_diff:
                matched_count += 1

        total_records = len(source_data)
        unmatched_count = total_records - matched_count
        match_rate = Decimal(str(round(matched_count / total_records * 100, 2))) if total_records > 0 else Decimal("100")

        if matched_count == total_records and not source_only and not target_only:
            status = ReconciliationStatus.MATCHED
        elif matched_count > 0:
            status = ReconciliationStatus.PARTIAL_MATCH
        else:
            status = ReconciliationStatus.MISMATCHED

        end_time = datetime.now(UTC)
        exec_time = int((end_time - start_time).total_seconds() * 1000)

        return ReconciliationResult(
            result_id=str(uuid4()),
            reconciliation_type=ReconciliationType.RECORD_MATCH,
            source_name=source_name,
            target_name=target_name,
            status=status,
            source_count=len(source_data),
            target_count=len(target_data),
            matched_count=matched_count,
            unmatched_count=unmatched_count,
            match_rate=match_rate,
            breaks=breaks,
            source_total=None,
            target_total=None,
            difference=None,
            execution_time_ms=exec_time,
            executed_at=end_time,
        )

    def set_tolerance(
        self, percentage: Decimal | None = None, absolute: Decimal | None = None
    ) -> None:
        if percentage is not None:
            self._tolerance_percentage = percentage
        if absolute is not None:
            self._tolerance_absolute = absolute


data_reconciliation_utilities = DataReconciliationUtilities()
