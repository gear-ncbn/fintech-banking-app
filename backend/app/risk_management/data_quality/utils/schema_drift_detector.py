"""Schema Drift Detection Utilities"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4


class DriftType(StrEnum):
    COLUMN_ADDED = "column_added"
    COLUMN_REMOVED = "column_removed"
    TYPE_CHANGED = "type_changed"
    NULLABLE_CHANGED = "nullable_changed"
    LENGTH_CHANGED = "length_changed"
    PRECISION_CHANGED = "precision_changed"
    DEFAULT_CHANGED = "default_changed"
    CONSTRAINT_ADDED = "constraint_added"
    CONSTRAINT_REMOVED = "constraint_removed"


class DriftSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class ColumnDefinition:
    column_name: str
    data_type: str
    is_nullable: bool = True
    max_length: int | None = None
    precision: int | None = None
    scale: int | None = None
    default_value: str | None = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    constraints: list[str] = field(default_factory=list)


@dataclass
class SchemaDefinition:
    schema_id: str
    table_name: str
    columns: dict[str, ColumnDefinition]
    captured_at: datetime
    version: int = 1


@dataclass
class DriftItem:
    drift_id: str
    drift_type: DriftType
    severity: DriftSeverity
    column_name: str
    description: str
    previous_value: str | None
    current_value: str | None
    detected_at: datetime


@dataclass
class DriftReport:
    report_id: str
    table_name: str
    previous_schema_version: int
    current_schema_version: int
    drift_items: list[DriftItem]
    has_breaking_changes: bool
    total_drifts: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    generated_at: datetime


class SchemaDriftDetector:
    def __init__(self):
        self._schema_history: dict[str, list[SchemaDefinition]] = {}
        self._severity_rules: dict[DriftType, DriftSeverity] = {
            DriftType.COLUMN_REMOVED: DriftSeverity.CRITICAL,
            DriftType.TYPE_CHANGED: DriftSeverity.HIGH,
            DriftType.NULLABLE_CHANGED: DriftSeverity.MEDIUM,
            DriftType.COLUMN_ADDED: DriftSeverity.LOW,
            DriftType.LENGTH_CHANGED: DriftSeverity.MEDIUM,
            DriftType.PRECISION_CHANGED: DriftSeverity.MEDIUM,
            DriftType.DEFAULT_CHANGED: DriftSeverity.LOW,
            DriftType.CONSTRAINT_ADDED: DriftSeverity.MEDIUM,
            DriftType.CONSTRAINT_REMOVED: DriftSeverity.HIGH,
        }

    def register_schema(
        self,
        table_name: str,
        columns: list[ColumnDefinition],
    ) -> SchemaDefinition:
        if table_name not in self._schema_history:
            self._schema_history[table_name] = []

        version = len(self._schema_history[table_name]) + 1
        schema = SchemaDefinition(
            schema_id=str(uuid4()),
            table_name=table_name,
            columns={col.column_name: col for col in columns},
            captured_at=datetime.now(UTC),
            version=version,
        )
        self._schema_history[table_name].append(schema)
        return schema

    def detect_drift(
        self,
        table_name: str,
        current_columns: list[ColumnDefinition],
    ) -> DriftReport | None:
        if table_name not in self._schema_history or not self._schema_history[table_name]:
            return None

        previous_schema = self._schema_history[table_name][-1]
        current_column_map = {col.column_name: col for col in current_columns}
        drift_items = []

        previous_cols = set(previous_schema.columns.keys())
        current_cols = set(current_column_map.keys())

        for col_name in previous_cols - current_cols:
            drift_items.append(
                DriftItem(
                    drift_id=str(uuid4()),
                    drift_type=DriftType.COLUMN_REMOVED,
                    severity=self._severity_rules[DriftType.COLUMN_REMOVED],
                    column_name=col_name,
                    description=f"Column '{col_name}' was removed",
                    previous_value=previous_schema.columns[col_name].data_type,
                    current_value=None,
                    detected_at=datetime.now(UTC),
                )
            )

        for col_name in current_cols - previous_cols:
            drift_items.append(
                DriftItem(
                    drift_id=str(uuid4()),
                    drift_type=DriftType.COLUMN_ADDED,
                    severity=self._severity_rules[DriftType.COLUMN_ADDED],
                    column_name=col_name,
                    description=f"Column '{col_name}' was added",
                    previous_value=None,
                    current_value=current_column_map[col_name].data_type,
                    detected_at=datetime.now(UTC),
                )
            )

        for col_name in previous_cols & current_cols:
            prev_col = previous_schema.columns[col_name]
            curr_col = current_column_map[col_name]

            if prev_col.data_type != curr_col.data_type:
                drift_items.append(
                    DriftItem(
                        drift_id=str(uuid4()),
                        drift_type=DriftType.TYPE_CHANGED,
                        severity=self._severity_rules[DriftType.TYPE_CHANGED],
                        column_name=col_name,
                        description=f"Column '{col_name}' type changed from {prev_col.data_type} to {curr_col.data_type}",
                        previous_value=prev_col.data_type,
                        current_value=curr_col.data_type,
                        detected_at=datetime.now(UTC),
                    )
                )

            if prev_col.is_nullable != curr_col.is_nullable:
                drift_items.append(
                    DriftItem(
                        drift_id=str(uuid4()),
                        drift_type=DriftType.NULLABLE_CHANGED,
                        severity=self._severity_rules[DriftType.NULLABLE_CHANGED],
                        column_name=col_name,
                        description=f"Column '{col_name}' nullable changed from {prev_col.is_nullable} to {curr_col.is_nullable}",
                        previous_value=str(prev_col.is_nullable),
                        current_value=str(curr_col.is_nullable),
                        detected_at=datetime.now(UTC),
                    )
                )

            if prev_col.max_length != curr_col.max_length:
                drift_items.append(
                    DriftItem(
                        drift_id=str(uuid4()),
                        drift_type=DriftType.LENGTH_CHANGED,
                        severity=self._severity_rules[DriftType.LENGTH_CHANGED],
                        column_name=col_name,
                        description=f"Column '{col_name}' length changed from {prev_col.max_length} to {curr_col.max_length}",
                        previous_value=str(prev_col.max_length),
                        current_value=str(curr_col.max_length),
                        detected_at=datetime.now(UTC),
                    )
                )

        if not drift_items:
            return None

        critical_count = len([d for d in drift_items if d.severity == DriftSeverity.CRITICAL])
        high_count = len([d for d in drift_items if d.severity == DriftSeverity.HIGH])
        medium_count = len([d for d in drift_items if d.severity == DriftSeverity.MEDIUM])
        low_count = len([d for d in drift_items if d.severity == DriftSeverity.LOW])

        return DriftReport(
            report_id=str(uuid4()),
            table_name=table_name,
            previous_schema_version=previous_schema.version,
            current_schema_version=previous_schema.version + 1,
            drift_items=drift_items,
            has_breaking_changes=critical_count > 0 or high_count > 0,
            total_drifts=len(drift_items),
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            low_count=low_count,
            generated_at=datetime.now(UTC),
        )

    def get_schema_history(self, table_name: str) -> list[SchemaDefinition]:
        return self._schema_history.get(table_name, [])

    def get_latest_schema(self, table_name: str) -> SchemaDefinition | None:
        history = self._schema_history.get(table_name, [])
        return history[-1] if history else None

    def set_severity_rule(self, drift_type: DriftType, severity: DriftSeverity) -> None:
        self._severity_rules[drift_type] = severity

    def clear_history(self, table_name: str | None = None) -> None:
        if table_name:
            self._schema_history.pop(table_name, None)
        else:
            self._schema_history.clear()


schema_drift_detector = SchemaDriftDetector()
