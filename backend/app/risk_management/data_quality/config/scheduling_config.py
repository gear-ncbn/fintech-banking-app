"""Scheduling Configuration for Data Quality Jobs"""

from dataclasses import dataclass, field
from datetime import UTC, datetime, time
from enum import StrEnum
from typing import Any


class ScheduleFrequency(StrEnum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class JobPriority(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class JobType(StrEnum):
    VALIDATION = "validation"
    PROFILING = "profiling"
    RECONCILIATION = "reconciliation"
    ANOMALY_DETECTION = "anomaly_detection"
    REPORT_GENERATION = "report_generation"
    DATA_QUALITY_CHECK = "data_quality_check"


@dataclass
class ScheduleWindow:
    start_time: time
    end_time: time
    days_of_week: list[int] = field(default_factory=lambda: [0, 1, 2, 3, 4])


@dataclass
class JobSchedule:
    job_name: str
    job_type: JobType
    frequency: ScheduleFrequency
    cron_expression: str | None
    schedule_window: ScheduleWindow | None
    priority: JobPriority
    timeout_minutes: int
    retry_count: int
    retry_delay_minutes: int
    dependencies: list[str]
    is_active: bool = True


class SchedulingConfig:
    def __init__(self):
        self._schedules: dict[str, JobSchedule] = {}
        self._default_timeout = 60
        self._default_retry_count = 3
        self._default_retry_delay = 5
        self._max_concurrent_jobs = 10

        self._blackout_windows: list[ScheduleWindow] = []
        self._maintenance_windows: list[ScheduleWindow] = []

        self._priority_weights = {
            JobPriority.CRITICAL: 100,
            JobPriority.HIGH: 75,
            JobPriority.NORMAL: 50,
            JobPriority.LOW: 25,
        }

    def create_schedule(
        self,
        job_name: str,
        job_type: JobType,
        frequency: ScheduleFrequency,
        cron_expression: str | None = None,
        schedule_window: ScheduleWindow = None,
        priority: JobPriority = JobPriority.NORMAL,
        timeout_minutes: int | None = None,
        retry_count: int | None = None,
        retry_delay_minutes: int | None = None,
        dependencies: list[str] | None = None,
    ) -> JobSchedule:
        schedule = JobSchedule(
            job_name=job_name,
            job_type=job_type,
            frequency=frequency,
            cron_expression=cron_expression,
            schedule_window=schedule_window,
            priority=priority,
            timeout_minutes=timeout_minutes or self._default_timeout,
            retry_count=retry_count if retry_count is not None else self._default_retry_count,
            retry_delay_minutes=retry_delay_minutes or self._default_retry_delay,
            dependencies=dependencies or [],
        )
        self._schedules[job_name] = schedule
        return schedule

    def get_schedule(self, job_name: str) -> JobSchedule | None:
        return self._schedules.get(job_name)

    def get_schedules_by_type(self, job_type: JobType) -> list[JobSchedule]:
        return [s for s in self._schedules.values() if s.job_type == job_type]

    def get_active_schedules(self) -> list[JobSchedule]:
        return [s for s in self._schedules.values() if s.is_active]

    def toggle_schedule(self, job_name: str, is_active: bool) -> None:
        if job_name in self._schedules:
            self._schedules[job_name].is_active = is_active

    def add_blackout_window(self, window: ScheduleWindow) -> None:
        self._blackout_windows.append(window)

    def add_maintenance_window(self, window: ScheduleWindow) -> None:
        self._maintenance_windows.append(window)

    def is_in_blackout(self, check_time: datetime | None = None) -> bool:
        check_time = check_time or datetime.now(UTC)
        current_time = check_time.time()
        current_day = check_time.weekday()

        for window in self._blackout_windows:
            if current_day in window.days_of_week:
                if window.start_time <= current_time <= window.end_time:
                    return True
        return False

    def is_in_maintenance(self, check_time: datetime | None = None) -> bool:
        check_time = check_time or datetime.now(UTC)
        current_time = check_time.time()
        current_day = check_time.weekday()

        for window in self._maintenance_windows:
            if current_day in window.days_of_week:
                if window.start_time <= current_time <= window.end_time:
                    return True
        return False

    def can_run_job(self, job_name: str, check_time: datetime | None = None) -> bool:
        schedule = self._schedules.get(job_name)
        if not schedule or not schedule.is_active:
            return False

        if self.is_in_blackout(check_time) or self.is_in_maintenance(check_time):
            return False

        for dep in schedule.dependencies:
            dep_schedule = self._schedules.get(dep)
            if dep_schedule and not dep_schedule.is_active:
                return False

        return True

    def get_priority_weight(self, priority: JobPriority) -> int:
        return self._priority_weights.get(priority, 50)

    def set_max_concurrent_jobs(self, max_jobs: int) -> None:
        self._max_concurrent_jobs = max_jobs

    def get_max_concurrent_jobs(self) -> int:
        return self._max_concurrent_jobs

    def export_config(self) -> dict[str, Any]:
        return {
            "total_schedules": len(self._schedules),
            "active_schedules": len([s for s in self._schedules.values() if s.is_active]),
            "blackout_windows": len(self._blackout_windows),
            "maintenance_windows": len(self._maintenance_windows),
            "max_concurrent_jobs": self._max_concurrent_jobs,
            "default_timeout": self._default_timeout,
            "default_retry_count": self._default_retry_count,
        }


scheduling_config = SchedulingConfig()
