"""Data Anomaly Detection Utilities"""

import math
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4


class AnomalyType(StrEnum):
    OUTLIER = "outlier"
    MISSING_PATTERN = "missing_pattern"
    DUPLICATE = "duplicate"
    FORMAT_VIOLATION = "format_violation"
    RANGE_VIOLATION = "range_violation"
    DISTRIBUTION_SHIFT = "distribution_shift"
    TEMPORAL_ANOMALY = "temporal_anomaly"
    CARDINALITY_ANOMALY = "cardinality_anomaly"


class AnomalySeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class DetectedAnomaly:
    anomaly_id: str
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    field_name: str
    description: str
    affected_records: int
    sample_values: list[Any]
    detection_method: str
    detected_at: datetime


@dataclass
class AnomalyDetectionResult:
    result_id: str
    total_records_analyzed: int
    anomalies_detected: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    anomalies: list[DetectedAnomaly]
    analysis_time_ms: int
    analyzed_at: datetime


class AnomalyDetectionUtilities:
    def __init__(self):
        self._iqr_multiplier = 1.5
        self._zscore_threshold = 3.0

    def detect_numeric_outliers_iqr(
        self,
        data: list[dict[str, Any]],
        field_name: str,
    ) -> list[DetectedAnomaly]:
        values = [
            float(r.get(field_name))
            for r in data
            if r.get(field_name) is not None and self._is_numeric(r.get(field_name))
        ]

        if len(values) < 4:
            return []

        sorted_values = sorted(values)
        n = len(sorted_values)
        q1 = sorted_values[n // 4]
        q3 = sorted_values[(3 * n) // 4]
        iqr = q3 - q1

        lower_bound = q1 - self._iqr_multiplier * iqr
        upper_bound = q3 + self._iqr_multiplier * iqr

        outliers = [v for v in values if v < lower_bound or v > upper_bound]

        anomalies = []
        if outliers:
            severity = AnomalySeverity.HIGH if len(outliers) > len(values) * 0.05 else AnomalySeverity.MEDIUM

            anomalies.append(
                DetectedAnomaly(
                    anomaly_id=str(uuid4()),
                    anomaly_type=AnomalyType.OUTLIER,
                    severity=severity,
                    field_name=field_name,
                    description=f"Found {len(outliers)} outliers using IQR method (bounds: {lower_bound:.2f} - {upper_bound:.2f})",
                    affected_records=len(outliers),
                    sample_values=outliers[:5],
                    detection_method="iqr",
                    detected_at=datetime.now(UTC),
                )
            )

        return anomalies

    def detect_numeric_outliers_zscore(
        self,
        data: list[dict[str, Any]],
        field_name: str,
    ) -> list[DetectedAnomaly]:
        values = [
            float(r.get(field_name))
            for r in data
            if r.get(field_name) is not None and self._is_numeric(r.get(field_name))
        ]

        if len(values) < 3:
            return []

        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std_dev = math.sqrt(variance) if variance > 0 else 0

        if std_dev == 0:
            return []

        outliers = [v for v in values if abs((v - mean) / std_dev) > self._zscore_threshold]

        anomalies = []
        if outliers:
            severity = AnomalySeverity.HIGH if len(outliers) > len(values) * 0.05 else AnomalySeverity.MEDIUM

            anomalies.append(
                DetectedAnomaly(
                    anomaly_id=str(uuid4()),
                    anomaly_type=AnomalyType.OUTLIER,
                    severity=severity,
                    field_name=field_name,
                    description=f"Found {len(outliers)} outliers using Z-score method (threshold: {self._zscore_threshold})",
                    affected_records=len(outliers),
                    sample_values=outliers[:5],
                    detection_method="zscore",
                    detected_at=datetime.now(UTC),
                )
            )

        return anomalies

    def detect_missing_patterns(
        self,
        data: list[dict[str, Any]],
        fields: list[str],
    ) -> list[DetectedAnomaly]:
        anomalies = []

        for field_name in fields:
            null_count = sum(1 for r in data if r.get(field_name) is None or r.get(field_name) == "")
            null_percentage = null_count / len(data) * 100 if data else 0

            if null_percentage > 50:
                severity = AnomalySeverity.HIGH
            elif null_percentage > 20:
                severity = AnomalySeverity.MEDIUM
            elif null_percentage > 5:
                severity = AnomalySeverity.LOW
            else:
                continue

            anomalies.append(
                DetectedAnomaly(
                    anomaly_id=str(uuid4()),
                    anomaly_type=AnomalyType.MISSING_PATTERN,
                    severity=severity,
                    field_name=field_name,
                    description=f"{null_percentage:.1f}% of values are missing/null",
                    affected_records=null_count,
                    sample_values=[],
                    detection_method="null_analysis",
                    detected_at=datetime.now(UTC),
                )
            )

        return anomalies

    def detect_cardinality_anomalies(
        self,
        data: list[dict[str, Any]],
        field_name: str,
        expected_cardinality: str | None = None,
    ) -> list[DetectedAnomaly]:
        values = [r.get(field_name) for r in data if r.get(field_name) is not None]
        total = len(values)
        distinct = len({str(v) for v in values})

        if total == 0:
            return []

        cardinality_ratio = distinct / total

        anomalies = []

        if expected_cardinality == "unique" and cardinality_ratio < 1:
            duplicates = total - distinct
            anomalies.append(
                DetectedAnomaly(
                    anomaly_id=str(uuid4()),
                    anomaly_type=AnomalyType.CARDINALITY_ANOMALY,
                    severity=AnomalySeverity.HIGH,
                    field_name=field_name,
                    description=f"Expected unique values but found {duplicates} duplicates",
                    affected_records=duplicates,
                    sample_values=[],
                    detection_method="cardinality_check",
                    detected_at=datetime.now(UTC),
                )
            )

        elif expected_cardinality == "low" and cardinality_ratio > 0.5:
            anomalies.append(
                DetectedAnomaly(
                    anomaly_id=str(uuid4()),
                    anomaly_type=AnomalyType.CARDINALITY_ANOMALY,
                    severity=AnomalySeverity.MEDIUM,
                    field_name=field_name,
                    description=f"Expected low cardinality but ratio is {cardinality_ratio:.2f}",
                    affected_records=distinct,
                    sample_values=[],
                    detection_method="cardinality_check",
                    detected_at=datetime.now(UTC),
                )
            )

        return anomalies

    def detect_all_anomalies(
        self,
        data: list[dict[str, Any]],
        numeric_fields: list[str] | None = None,
        check_missing: bool = True,
    ) -> AnomalyDetectionResult:
        start_time = datetime.now(UTC)
        all_anomalies = []

        if not data:
            return AnomalyDetectionResult(
                result_id=str(uuid4()),
                total_records_analyzed=0,
                anomalies_detected=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
                anomalies=[],
                analysis_time_ms=0,
                analyzed_at=datetime.now(UTC),
            )

        all_fields = list(data[0].keys()) if data else []

        if numeric_fields is None:
            numeric_fields = [
                f for f in all_fields
                if data and any(self._is_numeric(r.get(f)) for r in data if r.get(f) is not None)
            ]

        for field in numeric_fields:
            all_anomalies.extend(self.detect_numeric_outliers_iqr(data, field))

        if check_missing:
            all_anomalies.extend(self.detect_missing_patterns(data, all_fields))

        end_time = datetime.now(UTC)
        analysis_time = int((end_time - start_time).total_seconds() * 1000)

        return AnomalyDetectionResult(
            result_id=str(uuid4()),
            total_records_analyzed=len(data),
            anomalies_detected=len(all_anomalies),
            critical_count=len([a for a in all_anomalies if a.severity == AnomalySeverity.CRITICAL]),
            high_count=len([a for a in all_anomalies if a.severity == AnomalySeverity.HIGH]),
            medium_count=len([a for a in all_anomalies if a.severity == AnomalySeverity.MEDIUM]),
            low_count=len([a for a in all_anomalies if a.severity == AnomalySeverity.LOW]),
            anomalies=all_anomalies,
            analysis_time_ms=analysis_time,
            analyzed_at=end_time,
        )

    def _is_numeric(self, value: Any) -> bool:
        if value is None:
            return False
        try:
            float(value)
            return True
        except (ValueError, TypeError):
            return False

    def set_iqr_multiplier(self, multiplier: float) -> None:
        self._iqr_multiplier = multiplier

    def set_zscore_threshold(self, threshold: float) -> None:
        self._zscore_threshold = threshold


anomaly_detection_utilities = AnomalyDetectionUtilities()
