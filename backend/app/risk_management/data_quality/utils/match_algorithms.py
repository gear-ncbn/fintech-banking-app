"""Master Data Match Algorithms"""

import re
from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from typing import Any


class MatchType(StrEnum):
    EXACT = "exact"
    FUZZY = "fuzzy"
    PHONETIC = "phonetic"
    PROBABILISTIC = "probabilistic"
    COMPOSITE = "composite"


@dataclass
class MatchResult:
    record_1_id: str
    record_2_id: str
    match_score: Decimal
    match_type: MatchType
    matched_fields: dict[str, Decimal]
    is_match: bool
    confidence_level: str


class MatchAlgorithms:
    def __init__(self):
        self._default_threshold = Decimal("0.85")
        self._field_weights: dict[str, Decimal] = {}

    def exact_match(self, value1: str, value2: str) -> Decimal:
        if value1 is None or value2 is None:
            return Decimal("0")
        return Decimal("1") if self._normalize(value1) == self._normalize(value2) else Decimal("0")

    def levenshtein_distance(self, s1: str, s2: str) -> int:
        s1 = self._normalize(s1) or ""
        s2 = self._normalize(s2) or ""

        if len(s1) < len(s2):
            s1, s2 = s2, s1

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def fuzzy_match(self, value1: str, value2: str) -> Decimal:
        if value1 is None or value2 is None:
            return Decimal("0")

        s1 = self._normalize(value1) or ""
        s2 = self._normalize(value2) or ""

        if not s1 and not s2:
            return Decimal("1")
        if not s1 or not s2:
            return Decimal("0")

        distance = self.levenshtein_distance(s1, s2)
        max_len = max(len(s1), len(s2))
        similarity = 1 - (distance / max_len)
        return Decimal(str(round(similarity, 4)))

    def jaro_similarity(self, s1: str, s2: str) -> Decimal:
        s1 = self._normalize(s1) or ""
        s2 = self._normalize(s2) or ""

        if s1 == s2:
            return Decimal("1")

        len1, len2 = len(s1), len(s2)
        if len1 == 0 or len2 == 0:
            return Decimal("0")

        match_distance = max(len1, len2) // 2 - 1
        match_distance = max(match_distance, 0)

        s1_matches = [False] * len1
        s2_matches = [False] * len2
        matches = 0
        transpositions = 0

        for i in range(len1):
            start = max(0, i - match_distance)
            end = min(i + match_distance + 1, len2)

            for j in range(start, end):
                if s2_matches[j] or s1[i] != s2[j]:
                    continue
                s1_matches[i] = True
                s2_matches[j] = True
                matches += 1
                break

        if matches == 0:
            return Decimal("0")

        k = 0
        for i in range(len1):
            if not s1_matches[i]:
                continue
            while not s2_matches[k]:
                k += 1
            if s1[i] != s2[k]:
                transpositions += 1
            k += 1

        jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
        return Decimal(str(round(jaro, 4)))

    def jaro_winkler_similarity(self, s1: str, s2: str, prefix_weight: float = 0.1) -> Decimal:
        jaro = float(self.jaro_similarity(s1, s2))

        s1 = self._normalize(s1) or ""
        s2 = self._normalize(s2) or ""

        prefix_len = 0
        for i in range(min(len(s1), len(s2), 4)):
            if s1[i] == s2[i]:
                prefix_len += 1
            else:
                break

        jaro_winkler = jaro + prefix_len * prefix_weight * (1 - jaro)
        return Decimal(str(round(min(jaro_winkler, 1.0), 4)))

    def soundex(self, s: str) -> str:
        s = self._normalize(s) or ""
        if not s:
            return ""

        s = re.sub(r"[^a-z]", "", s.lower())
        if not s:
            return ""

        soundex_mapping = {
            "b": "1", "f": "1", "p": "1", "v": "1",
            "c": "2", "g": "2", "j": "2", "k": "2", "q": "2", "s": "2", "x": "2", "z": "2",
            "d": "3", "t": "3",
            "l": "4",
            "m": "5", "n": "5",
            "r": "6",
        }

        first_letter = s[0].upper()
        coded = first_letter

        prev_code = soundex_mapping.get(s[0], "")
        for char in s[1:]:
            code = soundex_mapping.get(char, "")
            if code and code != prev_code:
                coded += code
            prev_code = code if code else prev_code

        return coded[:4].ljust(4, "0")

    def phonetic_match(self, value1: str, value2: str) -> Decimal:
        soundex1 = self.soundex(value1)
        soundex2 = self.soundex(value2)

        if not soundex1 or not soundex2:
            return Decimal("0")

        if soundex1 == soundex2:
            return Decimal("1")

        matches = sum(c1 == c2 for c1, c2 in zip(soundex1, soundex2, strict=False))
        return Decimal(str(matches / 4))

    def composite_match(
        self,
        record1: dict[str, Any],
        record2: dict[str, Any],
        field_configs: list[dict[str, Any]],
    ) -> MatchResult:
        field_scores = {}
        weighted_sum = Decimal("0")
        total_weight = Decimal("0")

        for config in field_configs:
            field_name = config["field"]
            match_type = config.get("match_type", "exact")
            weight = Decimal(str(config.get("weight", 1.0)))

            value1 = record1.get(field_name)
            value2 = record2.get(field_name)

            if match_type == "exact":
                score = self.exact_match(str(value1) if value1 else "", str(value2) if value2 else "")
            elif match_type == "fuzzy":
                score = self.fuzzy_match(str(value1) if value1 else "", str(value2) if value2 else "")
            elif match_type == "jaro_winkler":
                score = self.jaro_winkler_similarity(str(value1) if value1 else "", str(value2) if value2 else "")
            elif match_type == "phonetic":
                score = self.phonetic_match(str(value1) if value1 else "", str(value2) if value2 else "")
            else:
                score = self.exact_match(str(value1) if value1 else "", str(value2) if value2 else "")

            field_scores[field_name] = score
            weighted_sum += score * weight
            total_weight += weight

        overall_score = weighted_sum / total_weight if total_weight > 0 else Decimal("0")
        is_match = overall_score >= self._default_threshold

        if overall_score >= Decimal("0.95"):
            confidence = "high"
        elif overall_score >= Decimal("0.85"):
            confidence = "medium"
        elif overall_score >= Decimal("0.70"):
            confidence = "low"
        else:
            confidence = "no_match"

        return MatchResult(
            record_1_id=str(record1.get("id", "")),
            record_2_id=str(record2.get("id", "")),
            match_score=overall_score,
            match_type=MatchType.COMPOSITE,
            matched_fields=field_scores,
            is_match=is_match,
            confidence_level=confidence,
        )

    def _normalize(self, value: str) -> str | None:
        if value is None:
            return None
        return re.sub(r"\s+", " ", str(value).strip().lower())

    def set_threshold(self, threshold: Decimal) -> None:
        self._default_threshold = threshold

    def get_threshold(self) -> Decimal:
        return self._default_threshold


match_algorithms = MatchAlgorithms()
