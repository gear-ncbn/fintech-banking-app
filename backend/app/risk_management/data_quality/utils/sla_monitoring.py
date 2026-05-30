"""SLA Monitoring Utilities for Data Quality"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import uuid4


class SLAStatus(StrEnum):
    MET = "met"
    AT_RISK = "at_risk"
    BREACHED = "breached"
    UNKNOWN = "unknown"


class SLAMetricType(StrEnum):
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    TIMELINESS = "timeliness"
    AVAILABILITY = "availability"
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"


@dataclass
class SLADefinition:
    sla_id: str
    sla_name: str
    metric_type: SLAMetricType
    target_value: Decimal
    warning_threshold: Decimal
    measurement_window_hours: int
    stakeholders: list[str]
    is_active: bool = True


@dataclass
class SLAMeasurement:
    measurement_id: str
    sla_id: str
    measured_value: Decimal
    target_value: Decimal
    status: SLAStatus
    measurement_time: datetime
    details: dict[str, Any]


@dataclass
class SLAReport:
    report_id: str
    sla_id: str
    sla_name: str
    period_start: datetime
    period_end: datetime
    measurements_count: int
    met_count: int
    breached_count: int
    compliance_rate: Decimal
    average_value: Decimal
    min_value: Decimal
    max_value: Decimal
    status: SLAStatus
    generated_at: datetime


class SLAMonitoringUtilities:
    def __init__(self):
        self._slas: dict[str, SLADefinition] = {}
        self._measurements: dict[str, list[SLAMeasurement]] = {}

    def create_sla(
        self,
        sla_name: str,
        metric_type: SLAMetricType,
        target_value: Decimal,
        warning_threshold: Decimal | None = None,
        measurement_window_hours: int = 24,
        stakeholders: list[str] | None = None,
    ) -> SLADefinition:
        sla = SLADefinition(
            sla_id=str(uuid4()),
            sla_name=sla_name,
            metric_type=metric_type,
            target_value=target_value,
            warning_threshold=warning_threshold or target_value * Decimal("0.95"),
            measurement_window_hours=measurement_window_hours,
            stakeholders=stakeholders or [],
        )
        self._slas[sla.sla_id] = sla
        self._measurements[sla.sla_id] = []
        return sla

    def record_measurement(
        self,
        sla_id: str,
        measured_value: Decimal,
        details: dict[str, Any] | None = None,
    ) -> SLAMeasurement | None:
        sla = self._slas.get(sla_id)
        if not sla:
            return None

        status = self._determine_status(measured_value, sla)

        measurement = SLAMeasurement(
            measurement_id=str(uuid4()),
            sla_id=sla_id,
            measured_value=measured_value,
            target_value=sla.target_value,
            status=status,
            measurement_time=datetime.now(UTC),
            details=details or {},
        )

        self._measurements[sla_id].append(measurement)
        return measurement

    def _determine_status(
        self, measured_value: Decimal, sla: SLADefinition
    ) -> SLAStatus:
        if measured_value >= sla.target_value:
            return SLAStatus.MET
        if measured_value >= sla.warning_threshold:
            return SLAStatus.AT_RISK
        return SLAStatus.BREACHED

    def get_current_status(self, sla_id: str) -> SLAStatus | None:
        measurements = self._measurements.get(sla_id, [])
        if not measurements:
            return SLAStatus.UNKNOWN

        latest = max(measurements, key=lambda m: m.measurement_time)
        return latest.status

    def generate_report(
        self,
        sla_id: str,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
    ) -> SLAReport | None:
        sla = self._slas.get(sla_id)
        if not sla:
            return None

        period_end = period_end or datetime.now(UTC)
        period_start = period_start or (period_end - timedelta(hours=sla.measurement_window_hours))

        measurements = [
            m for m in self._measurements.get(sla_id, [])
            if period_start <= m.measurement_time <= period_end
        ]

        if not measurements:
            return SLAReport(
                report_id=str(uuid4()),
                sla_id=sla_id,
                sla_name=sla.sla_name,
                period_start=period_start,
                period_end=period_end,
                measurements_count=0,
                met_count=0,
                breached_count=0,
                compliance_rate=Decimal("0"),
                average_value=Decimal("0"),
                min_value=Decimal("0"),
                max_value=Decimal("0"),
                status=SLAStatus.UNKNOWN,
                generated_at=datetime.now(UTC),
            )

        met_count = len([m for m in measurements if m.status == SLAStatus.MET])
        breached_count = len([m for m in measurements if m.status == SLAStatus.BREACHED])
        values = [m.measured_value for m in measurements]

        compliance_rate = Decimal(str(met_count / len(measurements) * 100))
        avg_value = sum(values) / Decimal(str(len(values)))

        if compliance_rate >= Decimal("100"):
            overall_status = SLAStatus.MET
        elif compliance_rate >= Decimal("95"):
            overall_status = SLAStatus.AT_RISK
        else:
            overall_status = SLAStatus.BREACHED

        return SLAReport(
            report_id=str(uuid4()),
            sla_id=sla_id,
            sla_name=sla.sla_name,
            period_start=period_start,
            period_end=period_end,
            measurements_count=len(measurements),
            met_count=met_count,
            breached_count=breached_count,
            compliance_rate=compliance_rate,
            average_value=avg_value,
            min_value=min(values),
            max_value=max(values),
            status=overall_status,
            generated_at=datetime.now(UTC),
        )

    def get_sla_trend(
        self,
        sla_id: str,
        period_hours: int = 168,
        bucket_hours: int = 24,
    ) -> list[dict[str, Any]]:
        measurements = self._measurements.get(sla_id, [])
        if not measurements:
            return []

        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(hours=period_hours)

        filtered = [
            m for m in measurements
            if start_time <= m.measurement_time <= end_time
        ]

        buckets = []
        current = start_time
        while current < end_time:
            bucket_end = current + timedelta(hours=bucket_hours)
            bucket_measurements = [
                m for m in filtered
                if current <= m.measurement_time < bucket_end
            ]

            if bucket_measurements:
                values = [m.measured_value for m in bucket_measurements]
                buckets.append({
                    "period_start": current.isoformat(),
                    "period_end": bucket_end.isoformat(),
                    "avg_value": float(sum(values) / len(values)),
                    "min_value": float(min(values)),
                    "max_value": float(max(values)),
                    "measurement_count": len(bucket_measurements),
                })

            current = bucket_end

        return buckets

    def get_breached_slas(self) -> list[SLADefinition]:
        breached = []
        for sla_id, sla in self._slas.items():
            status = self.get_current_status(sla_id)
            if status == SLAStatus.BREACHED:
                breached.append(sla)
        return breached

    def get_at_risk_slas(self) -> list[SLADefinition]:
        at_risk = []
        for sla_id, sla in self._slas.items():
            status = self.get_current_status(sla_id)
            if status == SLAStatus.AT_RISK:
                at_risk.append(sla)
        return at_risk

    def get_all_slas(self) -> dict[str, SLADefinition]:
        return self._slas.copy()

    def toggle_sla(self, sla_id: str, is_active: bool) -> None:
        if sla_id in self._slas:
            self._slas[sla_id].is_active = is_active


sla_monitoring_utilities = SLAMonitoringUtilities()
