"""Loss Event Models - Data models for operational loss tracking"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class LossEventType(StrEnum):
    INTERNAL_FRAUD = "internal_fraud"
    EXTERNAL_FRAUD = "external_fraud"
    EMPLOYMENT_PRACTICES = "employment_practices"
    CLIENTS_PRODUCTS_PRACTICES = "clients_products_practices"
    DAMAGE_TO_ASSETS = "damage_to_assets"
    BUSINESS_DISRUPTION = "business_disruption"
    EXECUTION_DELIVERY = "execution_delivery"


class LossEventStatus(StrEnum):
    REPORTED = "reported"
    UNDER_INVESTIGATION = "under_investigation"
    VALIDATED = "validated"
    APPROVED = "approved"
    CLOSED = "closed"
    REJECTED = "rejected"


class RecoveryType(StrEnum):
    INSURANCE = "insurance"
    LITIGATION = "litigation"
    INTERNAL_RECOVERY = "internal_recovery"
    VENDOR_RECOVERY = "vendor_recovery"
    OTHER = "other"


class LossEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_reference: str
    event_type: LossEventType
    status: LossEventStatus = LossEventStatus.REPORTED
    event_description: str
    discovery_date: date
    occurrence_date: date
    accounting_date: date
    business_line: str
    business_unit: str
    legal_entity: str
    country: str
    gross_loss: Decimal
    recoveries: Decimal = Decimal("0")
    net_loss: Decimal = Decimal("0")
    near_miss: bool = False
    near_miss_amount: Decimal | None = None
    related_incident_id: UUID | None = None
    root_cause: str | None = None
    reported_by: str
    reported_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    validated_by: str | None = None
    validation_date: datetime | None = None
    approved_by: str | None = None
    approval_date: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class LossRecovery(BaseModel):
    recovery_id: UUID = Field(default_factory=uuid4)
    event_id: UUID
    recovery_type: RecoveryType
    recovery_amount: Decimal
    recovery_date: date
    expected_date: date | None = None
    source: str
    reference_number: str | None = None
    status: str = "pending"
    received_date: date | None = None
    notes: str | None = None


class LossProvision(BaseModel):
    provision_id: UUID = Field(default_factory=uuid4)
    event_id: UUID
    provision_type: str
    provision_amount: Decimal
    provision_date: date
    release_date: date | None = None
    release_amount: Decimal | None = None
    status: str = "active"
    approved_by: str
    notes: str | None = None


class LossEventCausality(BaseModel):
    causality_id: UUID = Field(default_factory=uuid4)
    event_id: UUID
    cause_category: str
    cause_subcategory: str
    cause_description: str
    contributing_factor: bool = False
    control_failure: bool = False
    failed_control_id: UUID | None = None


class LossDistribution(BaseModel):
    distribution_id: UUID = Field(default_factory=uuid4)
    analysis_date: date
    event_type: LossEventType
    frequency: int
    mean_loss: Decimal
    median_loss: Decimal
    percentile_95: Decimal
    percentile_99: Decimal
    max_loss: Decimal
    standard_deviation: Decimal
    total_loss: Decimal
    period_start: date
    period_end: date


class OperationalLossCapital(BaseModel):
    capital_id: UUID = Field(default_factory=uuid4)
    calculation_date: date
    methodology: str  # BIA, TSA, AMA
    business_indicator: Decimal
    loss_component: Decimal
    internal_loss_multiplier: Decimal
    regulatory_capital: Decimal
    economic_capital: Decimal
    confidence_level: Decimal
    time_horizon: int
    metadata: dict[str, Any] = Field(default_factory=dict)


class LossEventReport(BaseModel):
    report_id: UUID = Field(default_factory=uuid4)
    report_date: date
    report_period: str
    period_start: date
    period_end: date
    total_events: int
    events_by_type: dict[str, int]
    events_by_status: dict[str, int]
    total_gross_loss: Decimal
    total_recoveries: Decimal
    total_net_loss: Decimal
    total_near_misses: int
    near_miss_amount: Decimal
    average_loss: Decimal
    largest_loss_event: dict[str, Any]
    business_line_breakdown: dict[str, Decimal]
    generated_by: str
