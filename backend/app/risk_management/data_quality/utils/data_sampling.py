"""Data Sampling Utilities"""

import random
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import uuid4


class SamplingMethod(StrEnum):
    RANDOM = "random"
    SYSTEMATIC = "systematic"
    STRATIFIED = "stratified"
    CLUSTER = "cluster"
    RESERVOIR = "reservoir"


@dataclass
class SamplingResult:
    sample_id: str
    method: SamplingMethod
    total_records: int
    sample_size: int
    sample_percentage: Decimal
    sample_records: list[dict[str, Any]]
    sampling_seed: int | None
    sampled_at: datetime


class DataSamplingUtilities:
    def __init__(self):
        self._default_seed = 42

    def random_sample(
        self,
        data: list[dict[str, Any]],
        sample_size: int | None = None,
        sample_percentage: Decimal | None = None,
        seed: int | None = None,
    ) -> SamplingResult:
        if seed is not None:
            random.seed(seed)
        elif self._default_seed is not None:
            random.seed(self._default_seed)

        total = len(data)

        if sample_size is None and sample_percentage is not None:
            sample_size = int(total * float(sample_percentage) / 100)
        elif sample_size is None:
            sample_size = min(1000, total)

        sample_size = min(sample_size, total)
        sample = random.sample(data, sample_size)

        return SamplingResult(
            sample_id=str(uuid4()),
            method=SamplingMethod.RANDOM,
            total_records=total,
            sample_size=len(sample),
            sample_percentage=Decimal(str(round(len(sample) / total * 100, 2))) if total > 0 else Decimal("0"),
            sample_records=sample,
            sampling_seed=seed or self._default_seed,
            sampled_at=datetime.now(UTC),
        )

    def systematic_sample(
        self,
        data: list[dict[str, Any]],
        sample_size: int,
        start_offset: int = 0,
    ) -> SamplingResult:
        total = len(data)
        if sample_size >= total:
            return SamplingResult(
                sample_id=str(uuid4()),
                method=SamplingMethod.SYSTEMATIC,
                total_records=total,
                sample_size=total,
                sample_percentage=Decimal("100"),
                sample_records=data.copy(),
                sampling_seed=None,
                sampled_at=datetime.now(UTC),
            )

        interval = total // sample_size
        sample = []

        index = start_offset % interval
        while len(sample) < sample_size and index < total:
            sample.append(data[index])
            index += interval

        return SamplingResult(
            sample_id=str(uuid4()),
            method=SamplingMethod.SYSTEMATIC,
            total_records=total,
            sample_size=len(sample),
            sample_percentage=Decimal(str(round(len(sample) / total * 100, 2))) if total > 0 else Decimal("0"),
            sample_records=sample,
            sampling_seed=None,
            sampled_at=datetime.now(UTC),
        )

    def stratified_sample(
        self,
        data: list[dict[str, Any]],
        stratify_field: str,
        sample_size: int,
        seed: int | None = None,
    ) -> SamplingResult:
        if seed is not None:
            random.seed(seed)
        elif self._default_seed is not None:
            random.seed(self._default_seed)

        strata: dict[Any, list[dict[str, Any]]] = {}
        for record in data:
            stratum_value = record.get(stratify_field)
            if stratum_value not in strata:
                strata[stratum_value] = []
            strata[stratum_value].append(record)

        total = len(data)
        sample = []

        for _stratum_value, stratum_records in strata.items():
            stratum_proportion = len(stratum_records) / total
            stratum_sample_size = max(1, int(sample_size * stratum_proportion))
            stratum_sample_size = min(stratum_sample_size, len(stratum_records))
            sample.extend(random.sample(stratum_records, stratum_sample_size))

        return SamplingResult(
            sample_id=str(uuid4()),
            method=SamplingMethod.STRATIFIED,
            total_records=total,
            sample_size=len(sample),
            sample_percentage=Decimal(str(round(len(sample) / total * 100, 2))) if total > 0 else Decimal("0"),
            sample_records=sample,
            sampling_seed=seed or self._default_seed,
            sampled_at=datetime.now(UTC),
        )

    def cluster_sample(
        self,
        data: list[dict[str, Any]],
        cluster_field: str,
        num_clusters: int,
        seed: int | None = None,
    ) -> SamplingResult:
        if seed is not None:
            random.seed(seed)
        elif self._default_seed is not None:
            random.seed(self._default_seed)

        clusters: dict[Any, list[dict[str, Any]]] = {}
        for record in data:
            cluster_value = record.get(cluster_field)
            if cluster_value not in clusters:
                clusters[cluster_value] = []
            clusters[cluster_value].append(record)

        total = len(data)
        cluster_keys = list(clusters.keys())
        num_clusters = min(num_clusters, len(cluster_keys))

        selected_clusters = random.sample(cluster_keys, num_clusters)
        sample = []
        for cluster_key in selected_clusters:
            sample.extend(clusters[cluster_key])

        return SamplingResult(
            sample_id=str(uuid4()),
            method=SamplingMethod.CLUSTER,
            total_records=total,
            sample_size=len(sample),
            sample_percentage=Decimal(str(round(len(sample) / total * 100, 2))) if total > 0 else Decimal("0"),
            sample_records=sample,
            sampling_seed=seed or self._default_seed,
            sampled_at=datetime.now(UTC),
        )

    def reservoir_sample(
        self,
        data_iterator,
        sample_size: int,
        seed: int | None = None,
    ) -> SamplingResult:
        if seed is not None:
            random.seed(seed)
        elif self._default_seed is not None:
            random.seed(self._default_seed)

        reservoir = []
        total_count = 0

        for record in data_iterator:
            total_count += 1
            if len(reservoir) < sample_size:
                reservoir.append(record)
            else:
                j = random.randint(0, total_count - 1)
                if j < sample_size:
                    reservoir[j] = record

        return SamplingResult(
            sample_id=str(uuid4()),
            method=SamplingMethod.RESERVOIR,
            total_records=total_count,
            sample_size=len(reservoir),
            sample_percentage=Decimal(str(round(len(reservoir) / total_count * 100, 2))) if total_count > 0 else Decimal("0"),
            sample_records=reservoir,
            sampling_seed=seed or self._default_seed,
            sampled_at=datetime.now(UTC),
        )

    def set_default_seed(self, seed: int) -> None:
        self._default_seed = seed


data_sampling_utilities = DataSamplingUtilities()
