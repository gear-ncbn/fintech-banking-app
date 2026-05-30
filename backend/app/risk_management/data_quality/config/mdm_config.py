"""Master Data Management Configuration"""

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from typing import Any


class MatchingStrategy(StrEnum):
    EXACT = "exact"
    FUZZY = "fuzzy"
    PROBABILISTIC = "probabilistic"
    HYBRID = "hybrid"


class SurvivorshipStrategy(StrEnum):
    MOST_RECENT = "most_recent"
    MOST_COMPLETE = "most_complete"
    SOURCE_PRIORITY = "source_priority"
    MOST_TRUSTED = "most_trusted"
    GOLDEN_RECORD = "golden_record"


class MergeAction(StrEnum):
    AUTO_MERGE = "auto_merge"
    MANUAL_REVIEW = "manual_review"
    REJECT = "reject"


@dataclass
class MatchFieldConfig:
    field_name: str
    match_type: str
    weight: Decimal
    threshold: Decimal
    is_blocking: bool = False
    phonetic_matching: bool = False


@dataclass
class DomainMatchConfig:
    domain_name: str
    matching_strategy: MatchingStrategy
    match_threshold: Decimal
    auto_merge_threshold: Decimal
    review_threshold: Decimal
    field_configs: dict[str, MatchFieldConfig]
    blocking_fields: list[str]


@dataclass
class SurvivorshipConfig:
    domain_name: str
    default_strategy: SurvivorshipStrategy
    field_strategies: dict[str, SurvivorshipStrategy]
    source_priority: list[str]
    trust_scores: dict[str, Decimal]


class MDMConfig:
    def __init__(self):
        self._default_match_threshold = Decimal("0.85")
        self._default_auto_merge_threshold = Decimal("0.95")
        self._default_review_threshold = Decimal("0.70")
        self._default_survivorship = SurvivorshipStrategy.MOST_COMPLETE

        self._domain_match_configs: dict[str, DomainMatchConfig] = {}
        self._survivorship_configs: dict[str, SurvivorshipConfig] = {}

        self._source_systems: dict[str, dict[str, Any]] = {}

    def get_default_match_threshold(self) -> Decimal:
        return self._default_match_threshold

    def set_default_match_threshold(self, threshold: Decimal) -> None:
        self._default_match_threshold = threshold

    def get_default_auto_merge_threshold(self) -> Decimal:
        return self._default_auto_merge_threshold

    def set_default_auto_merge_threshold(self, threshold: Decimal) -> None:
        self._default_auto_merge_threshold = threshold

    def configure_domain_matching(
        self,
        domain_name: str,
        matching_strategy: MatchingStrategy = MatchingStrategy.HYBRID,
        match_threshold: Decimal | None = None,
        auto_merge_threshold: Decimal | None = None,
        review_threshold: Decimal | None = None,
        blocking_fields: list[str] | None = None,
    ) -> DomainMatchConfig:
        config = DomainMatchConfig(
            domain_name=domain_name,
            matching_strategy=matching_strategy,
            match_threshold=match_threshold or self._default_match_threshold,
            auto_merge_threshold=auto_merge_threshold or self._default_auto_merge_threshold,
            review_threshold=review_threshold or self._default_review_threshold,
            field_configs={},
            blocking_fields=blocking_fields or [],
        )
        self._domain_match_configs[domain_name] = config
        return config

    def add_match_field(
        self,
        domain_name: str,
        field_name: str,
        match_type: str,
        weight: Decimal,
        threshold: Decimal | None = None,
        is_blocking: bool = False,
        phonetic_matching: bool = False,
    ) -> None:
        if domain_name not in self._domain_match_configs:
            self.configure_domain_matching(domain_name)

        field_config = MatchFieldConfig(
            field_name=field_name,
            match_type=match_type,
            weight=weight,
            threshold=threshold or self._default_match_threshold,
            is_blocking=is_blocking,
            phonetic_matching=phonetic_matching,
        )
        self._domain_match_configs[domain_name].field_configs[field_name] = field_config

    def get_domain_match_config(self, domain_name: str) -> DomainMatchConfig | None:
        return self._domain_match_configs.get(domain_name)

    def configure_survivorship(
        self,
        domain_name: str,
        default_strategy: SurvivorshipStrategy = None,
        source_priority: list[str] | None = None,
        trust_scores: dict[str, Decimal] | None = None,
    ) -> SurvivorshipConfig:
        config = SurvivorshipConfig(
            domain_name=domain_name,
            default_strategy=default_strategy or self._default_survivorship,
            field_strategies={},
            source_priority=source_priority or [],
            trust_scores=trust_scores or {},
        )
        self._survivorship_configs[domain_name] = config
        return config

    def set_field_survivorship(
        self,
        domain_name: str,
        field_name: str,
        strategy: SurvivorshipStrategy,
    ) -> None:
        if domain_name not in self._survivorship_configs:
            self.configure_survivorship(domain_name)
        self._survivorship_configs[domain_name].field_strategies[field_name] = strategy

    def get_survivorship_config(self, domain_name: str) -> SurvivorshipConfig | None:
        return self._survivorship_configs.get(domain_name)

    def register_source_system(
        self,
        source_name: str,
        trust_score: Decimal,
        is_authoritative: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._source_systems[source_name] = {
            "trust_score": trust_score,
            "is_authoritative": is_authoritative,
            "metadata": metadata or {},
        }

    def get_source_trust_score(self, source_name: str) -> Decimal:
        source = self._source_systems.get(source_name)
        return source["trust_score"] if source else Decimal("0.5")

    def determine_merge_action(
        self, domain_name: str, match_score: Decimal
    ) -> MergeAction:
        config = self._domain_match_configs.get(domain_name)
        if not config:
            if match_score >= self._default_auto_merge_threshold:
                return MergeAction.AUTO_MERGE
            if match_score >= self._default_review_threshold:
                return MergeAction.MANUAL_REVIEW
            return MergeAction.REJECT

        if match_score >= config.auto_merge_threshold:
            return MergeAction.AUTO_MERGE
        if match_score >= config.review_threshold:
            return MergeAction.MANUAL_REVIEW
        return MergeAction.REJECT

    def export_config(self) -> dict[str, Any]:
        return {
            "default_match_threshold": float(self._default_match_threshold),
            "default_auto_merge_threshold": float(self._default_auto_merge_threshold),
            "default_review_threshold": float(self._default_review_threshold),
            "default_survivorship": self._default_survivorship.value,
            "domain_count": len(self._domain_match_configs),
            "source_systems": list(self._source_systems.keys()),
        }


mdm_config = MDMConfig()
