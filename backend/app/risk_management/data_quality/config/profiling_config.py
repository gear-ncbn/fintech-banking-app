"""Profiling Configuration"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ProfilingDepth(StrEnum):
    BASIC = "basic"
    STANDARD = "standard"
    DEEP = "deep"
    COMPREHENSIVE = "comprehensive"


class SamplingStrategy(StrEnum):
    FULL = "full"
    RANDOM = "random"
    SYSTEMATIC = "systematic"
    STRATIFIED = "stratified"


@dataclass
class ColumnProfilingConfig:
    column_name: str
    include_distribution: bool = True
    include_patterns: bool = True
    include_statistics: bool = True
    custom_patterns: list[str] = field(default_factory=list)


@dataclass
class DatasetProfilingConfig:
    dataset_name: str
    depth: ProfilingDepth
    sampling_strategy: SamplingStrategy
    sample_size: int
    column_configs: dict[str, ColumnProfilingConfig]
    include_relationships: bool = True
    max_distinct_values: int = 1000


class ProfilingConfig:
    def __init__(self):
        self._default_depth = ProfilingDepth.STANDARD
        self._default_sampling = SamplingStrategy.FULL
        self._default_sample_size = 100000
        self._max_rows_full_profile = 1000000
        self._dataset_configs: dict[str, DatasetProfilingConfig] = {}

        self._depth_settings = {
            ProfilingDepth.BASIC: {
                "include_distribution": False,
                "include_patterns": False,
                "include_statistics": True,
                "include_relationships": False,
            },
            ProfilingDepth.STANDARD: {
                "include_distribution": True,
                "include_patterns": False,
                "include_statistics": True,
                "include_relationships": False,
            },
            ProfilingDepth.DEEP: {
                "include_distribution": True,
                "include_patterns": True,
                "include_statistics": True,
                "include_relationships": True,
            },
            ProfilingDepth.COMPREHENSIVE: {
                "include_distribution": True,
                "include_patterns": True,
                "include_statistics": True,
                "include_relationships": True,
            },
        }

    def get_default_depth(self) -> ProfilingDepth:
        return self._default_depth

    def set_default_depth(self, depth: ProfilingDepth) -> None:
        self._default_depth = depth

    def get_default_sampling(self) -> SamplingStrategy:
        return self._default_sampling

    def set_default_sampling(self, strategy: SamplingStrategy) -> None:
        self._default_sampling = strategy

    def get_default_sample_size(self) -> int:
        return self._default_sample_size

    def set_default_sample_size(self, size: int) -> None:
        self._default_sample_size = size

    def configure_dataset(
        self,
        dataset_name: str,
        depth: ProfilingDepth = None,
        sampling_strategy: SamplingStrategy = None,
        sample_size: int | None = None,
        include_relationships: bool = True,
        max_distinct_values: int = 1000,
    ) -> DatasetProfilingConfig:
        config = DatasetProfilingConfig(
            dataset_name=dataset_name,
            depth=depth or self._default_depth,
            sampling_strategy=sampling_strategy or self._default_sampling,
            sample_size=sample_size or self._default_sample_size,
            column_configs={},
            include_relationships=include_relationships,
            max_distinct_values=max_distinct_values,
        )
        self._dataset_configs[dataset_name] = config
        return config

    def add_column_config(
        self,
        dataset_name: str,
        column_name: str,
        include_distribution: bool = True,
        include_patterns: bool = True,
        include_statistics: bool = True,
        custom_patterns: list[str] | None = None,
    ) -> None:
        if dataset_name not in self._dataset_configs:
            self.configure_dataset(dataset_name)

        column_config = ColumnProfilingConfig(
            column_name=column_name,
            include_distribution=include_distribution,
            include_patterns=include_patterns,
            include_statistics=include_statistics,
            custom_patterns=custom_patterns or [],
        )
        self._dataset_configs[dataset_name].column_configs[column_name] = column_config

    def get_dataset_config(self, dataset_name: str) -> DatasetProfilingConfig | None:
        return self._dataset_configs.get(dataset_name)

    def get_column_config(
        self, dataset_name: str, column_name: str
    ) -> ColumnProfilingConfig | None:
        dataset_config = self._dataset_configs.get(dataset_name)
        if dataset_config:
            return dataset_config.column_configs.get(column_name)
        return None

    def get_depth_settings(self, depth: ProfilingDepth) -> dict[str, bool]:
        return self._depth_settings.get(depth, self._depth_settings[ProfilingDepth.STANDARD])

    def should_sample(self, total_rows: int) -> bool:
        return total_rows > self._max_rows_full_profile

    def get_recommended_sample_size(self, total_rows: int) -> int:
        if total_rows <= self._default_sample_size:
            return total_rows
        return min(self._default_sample_size, max(10000, total_rows // 100))

    def export_config(self) -> dict[str, Any]:
        return {
            "default_depth": self._default_depth.value,
            "default_sampling": self._default_sampling.value,
            "default_sample_size": self._default_sample_size,
            "max_rows_full_profile": self._max_rows_full_profile,
            "dataset_count": len(self._dataset_configs),
        }


profiling_config = ProfilingConfig()
