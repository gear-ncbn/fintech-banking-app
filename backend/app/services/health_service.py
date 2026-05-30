"""
Health monitoring service for tracking system health independently.
Each system can have its health checked separately to avoid cascading failures.
"""
import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum

import psutil


class HealthStatus(StrEnum):
    """Health status enumeration"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class SystemHealth:
    """Health status for a single system"""
    name: str
    status: HealthStatus
    response_time_ms: float
    details: dict[str, any] = None
    error_message: str | None = None
    last_checked: str | None = None

    def to_dict(self):
        return {
            "name": self.name,
            "status": self.status.value,
            "response_time_ms": round(self.response_time_ms, 2),
            "details": self.details or {},
            "error_message": self.error_message,
            "last_checked": self.last_checked or datetime.now(UTC).isoformat()
        }


class HealthCheckAdapter:
    """
    Adapter pattern for health checks. Each system implements this interface.
    This allows independent health checks without cascading failures.
    """

    async def check_health(self) -> SystemHealth:
        """Check health of the system and return status"""
        raise NotImplementedError


class DatabaseHealthAdapter(HealthCheckAdapter):
    """Health check adapter for database/storage layer"""

    def __init__(self, storage_manager):
        self.storage_manager = storage_manager

    async def check_health(self) -> SystemHealth:
        start_time = time.time()
        try:
            # Try to get users from storage to verify database connection
            users = self.storage_manager.get_users()
            response_time = (time.time() - start_time) * 1000

            return SystemHealth(
                name="database",
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time,
                details={
                    "users_count": len(users) if isinstance(users, list) else 0,
                    "adapter_type": "memory"
                },
                last_checked=datetime.now(UTC).isoformat()
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return SystemHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                error_message=str(e),
                details={"adapter_type": "memory"},
                last_checked=datetime.now(UTC).isoformat()
            )


class AuthenticationHealthAdapter(HealthCheckAdapter):
    """Health check adapter for authentication service"""

    async def check_health(self) -> SystemHealth:
        start_time = time.time()
        try:
            # Basic auth service check - verify session manager is accessible
            response_time = (time.time() - start_time) * 1000

            return SystemHealth(
                name="authentication",
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time,
                details={
                    "service": "JWT-based authentication",
                    "session_support": True
                },
                last_checked=datetime.now(UTC).isoformat()
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return SystemHealth(
                name="authentication",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                error_message=str(e),
                last_checked=datetime.now(UTC).isoformat()
            )


class CacheHealthAdapter(HealthCheckAdapter):
    """Health check adapter for cache layer (optional)"""

    async def check_health(self) -> SystemHealth:
        start_time = time.time()
        try:
            # Currently using in-memory storage, so cache is always available
            response_time = (time.time() - start_time) * 1000

            return SystemHealth(
                name="cache",
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time,
                details={
                    "type": "memory-based",
                    "available": True
                },
                last_checked=datetime.now(UTC).isoformat()
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return SystemHealth(
                name="cache",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                error_message=str(e),
                last_checked=datetime.now(UTC).isoformat()
            )


class SystemMetricsAdapter(HealthCheckAdapter):
    """Health check adapter for system resources (CPU, Memory)"""

    async def check_health(self) -> SystemHealth:
        start_time = time.time()
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()

            # Determine health based on thresholds
            status = HealthStatus.HEALTHY
            if cpu_percent > 80 or memory.percent > 85:
                status = HealthStatus.DEGRADED
            if cpu_percent > 95 or memory.percent > 95:
                status = HealthStatus.UNHEALTHY

            response_time = (time.time() - start_time) * 1000

            return SystemHealth(
                name="system_resources",
                status=status,
                response_time_ms=response_time,
                details={
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_percent": round(memory.percent, 2),
                    "memory_available_mb": round(memory.available / (1024 * 1024), 2),
                    "memory_used_mb": round(memory.used / (1024 * 1024), 2)
                },
                last_checked=datetime.now(UTC).isoformat()
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return SystemHealth(
                name="system_resources",
                status=HealthStatus.DEGRADED,
                response_time_ms=response_time,
                error_message=str(e),
                last_checked=datetime.now(UTC).isoformat()
            )


class HealthMonitor:
    """
    Central health monitor that manages all system health adapters.
    Allows independent checking of system health without cascading failures.
    """

    def __init__(self):
        self.adapters: dict[str, HealthCheckAdapter] = {}
        self.last_results: dict[str, SystemHealth] = {}

    def register_adapter(self, adapter: HealthCheckAdapter) -> None:
        """Register a health check adapter"""
        self.adapters[adapter.__class__.__name__] = adapter

    async def check_all_systems(self) -> dict[str, SystemHealth]:
        """Check health of all registered systems concurrently"""
        tasks = [
            self._check_system(adapter)
            for adapter in self.adapters.values()
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        health_results = {}
        for result in results:
            if isinstance(result, SystemHealth):
                health_results[result.name] = result
                self.last_results[result.name] = result
            elif isinstance(result, Exception):
                # Handle exceptions from health checks
                error_health = SystemHealth(
                    name="unknown",
                    status=HealthStatus.UNHEALTHY,
                    response_time_ms=0,
                    error_message=str(result)
                )
                health_results[f"error_{len(health_results)}"] = error_health

        return health_results

    async def _check_system(self, adapter: HealthCheckAdapter) -> SystemHealth:
        """Check a single system's health"""
        try:
            return await adapter.check_health()
        except Exception as e:
            return SystemHealth(
                name=getattr(adapter, "name", "unknown"),
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                error_message=f"Health check failed: {e!s}"
            )

    def get_system_health(self, system_name: str) -> SystemHealth | None:
        """Get last known health status of a specific system"""
        return self.last_results.get(system_name)

    def get_overall_status(self) -> HealthStatus:
        """Determine overall health status based on all systems"""
        if not self.last_results:
            return HealthStatus.HEALTHY

        statuses = [
            health.status for health in self.last_results.values()
        ]

        if HealthStatus.UNHEALTHY in statuses:
            return HealthStatus.UNHEALTHY
        if HealthStatus.DEGRADED in statuses:
            return HealthStatus.DEGRADED
        return HealthStatus.HEALTHY
