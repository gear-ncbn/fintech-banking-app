"""Quality Thresholds Configuration"""

from dataclasses import dataclass, field
from decimal import Decimal
from enum import StrEnum
from typing import Any


class ThresholdLevel(StrEnum):
    CRITICAL = "critical"
    WARNING = "warning"
    ACCEPTABLE = "acceptable"


@dataclass
class DimensionThreshold:
    dimension: str
    critical_threshold: Decimal
    warning_threshold: Decimal
    acceptable_threshold: Decimal
    is_mandatory: bool = True


@dataclass
class DatasetThreshold:
    dataset_name: str
    overall_threshold: Decimal
    dimension_thresholds: dict[str, DimensionThreshold] = field(default_factory=dict)


class QualityThresholds:
    def __init__(self):
        self._global_thresholds = {
            "completeness": DimensionThreshold(
                dimension="completeness",
                critical_threshold=Decimal("90"),
                warning_threshold=Decimal("95"),
                acceptable_threshold=Decimal("99"),
            ),
            "accuracy": DimensionThreshold(
                dimension="accuracy",
                critical_threshold=Decimal("85"),
                warning_threshold=Decimal("90"),
                acceptable_threshold=Decimal("98"),
            ),
            "consistency": DimensionThreshold(
                dimension="consistency",
                critical_threshold=Decimal("90"),
                warning_threshold=Decimal("95"),
                acceptable_threshold=Decimal("99"),
            ),
            "timeliness": DimensionThreshold(
                dimension="timeliness",
                critical_threshold=Decimal("80"),
                warning_threshold=Decimal("90"),
                acceptable_threshold=Decimal("95"),
            ),
            "uniqueness": DimensionThreshold(
                dimension="uniqueness",
                critical_threshold=Decimal("95"),
                warning_threshold=Decimal("98"),
                acceptable_threshold=Decimal("100"),
            ),
            "validity": DimensionThreshold(
                dimension="validity",
                critical_threshold=Decimal("90"),
                warning_threshold=Decimal("95"),
                acceptable_threshold=Decimal("99"),
            ),
        }
        self._dataset_thresholds: dict[str, DatasetThreshold] = {}

    def get_dimension_threshold(self, dimension: str) -> DimensionThreshold | None:
        return self._global_thresholds.get(dimension)

    def set_dimension_threshold(
        self,
        dimension: str,
        critical: Decimal,
        warning: Decimal,
        acceptable: Decimal,
        is_mandatory: bool = True,
    ) -> None:
        self._global_thresholds[dimension] = DimensionThreshold(
            dimension=dimension,
            critical_threshold=critical,
            warning_threshold=warning,
            acceptable_threshold=acceptable,
            is_mandatory=is_mandatory,
        )

    def evaluate_score(self, dimension: str, score: Decimal) -> ThresholdLevel:
        threshold = self._global_thresholds.get(dimension)
        if not threshold:
            return ThresholdLevel.ACCEPTABLE

        if score < threshold.critical_threshold:
            return ThresholdLevel.CRITICAL
        if score < threshold.warning_threshold:
            return ThresholdLevel.WARNING
        return ThresholdLevel.ACCEPTABLE

    def get_dataset_threshold(self, dataset_name: str) -> DatasetThreshold | None:
        return self._dataset_thresholds.get(dataset_name)

    def set_dataset_threshold(
        self,
        dataset_name: str,
        overall_threshold: Decimal,
        dimension_overrides: dict[str, DimensionThreshold] | None = None,
    ) -> None:
        self._dataset_thresholds[dataset_name] = DatasetThreshold(
            dataset_name=dataset_name,
            overall_threshold=overall_threshold,
            dimension_thresholds=dimension_overrides or {},
        )

    def get_effective_threshold(
        self, dataset_name: str, dimension: str
    ) -> DimensionThreshold | None:
        dataset_threshold = self._dataset_thresholds.get(dataset_name)
        if dataset_threshold and dimension in dataset_threshold.dimension_thresholds:
            return dataset_threshold.dimension_thresholds[dimension]
        return self._global_thresholds.get(dimension)

    def get_all_dimensions(self) -> dict[str, DimensionThreshold]:
        return self._global_thresholds.copy()

    def export_config(self) -> dict[str, Any]:
        return {
            "global_thresholds": {
                dim: {
                    "critical": float(t.critical_threshold),
                    "warning": float(t.warning_threshold),
                    "acceptable": float(t.acceptable_threshold),
                    "mandatory": t.is_mandatory,
                }
                for dim, t in self._global_thresholds.items()
            },
            "dataset_count": len(self._dataset_thresholds),
        }


quality_thresholds = QualityThresholds()
