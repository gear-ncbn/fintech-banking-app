"""
Device Fingerprinting Models

Defines data structures for device identification and trust scoring.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class DeviceTrustLevel(StrEnum):
    TRUSTED = "trusted"
    KNOWN = "known"
    NEW = "new"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"


class DeviceType(StrEnum):
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"
    UNKNOWN = "unknown"


class DeviceFingerprint(BaseModel):
    fingerprint_id: UUID = Field(default_factory=uuid4)
    device_hash: str

    device_type: DeviceType
    os_name: str | None = None
    os_version: str | None = None
    browser_name: str | None = None
    browser_version: str | None = None

    screen_resolution: str | None = None
    timezone: str | None = None
    language: str | None = None

    user_agent: str
    plugins_hash: str | None = None
    fonts_hash: str | None = None
    canvas_hash: str | None = None
    webgl_hash: str | None = None

    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    metadata: dict[str, Any] = Field(default_factory=dict)


class DeviceProfile(BaseModel):
    device_id: UUID = Field(default_factory=uuid4)
    fingerprint_id: UUID

    trust_level: DeviceTrustLevel = DeviceTrustLevel.NEW
    trust_score: float = Field(ge=0, le=100, default=50)

    associated_customers: list[str] = Field(default_factory=list)
    primary_customer_id: str | None = None

    ip_addresses: list[str] = Field(default_factory=list)
    locations: list[dict[str, Any]] = Field(default_factory=list)

    total_sessions: int = 0
    total_transactions: int = 0
    successful_transactions: int = 0
    failed_transactions: int = 0
    fraud_incidents: int = 0

    is_blocked: bool = False
    block_reason: str | None = None
    blocked_at: datetime | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    risk_flags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DeviceSession(BaseModel):
    session_id: UUID = Field(default_factory=uuid4)
    device_id: UUID
    customer_id: str

    ip_address: str
    location: dict[str, Any] | None = None

    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    ended_at: datetime | None = None
    last_activity_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    is_active: bool = True
    session_type: str = "web"

    activities: list[dict[str, Any]] = Field(default_factory=list)
    risk_events: list[str] = Field(default_factory=list)


class DeviceRiskAssessment(BaseModel):
    assessment_id: UUID = Field(default_factory=uuid4)
    device_id: UUID

    risk_score: float = Field(ge=0, le=100)
    risk_level: str

    risk_factors: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

    assessed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DeviceStatistics(BaseModel):
    total_devices: int = 0
    by_trust_level: dict[str, int] = Field(default_factory=dict)
    by_device_type: dict[str, int] = Field(default_factory=dict)
    blocked_devices: int = 0
    new_devices_today: int = 0
    suspicious_devices: int = 0
