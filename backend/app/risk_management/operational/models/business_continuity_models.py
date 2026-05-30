"""Business Continuity Models - Data models for BCP/DR management"""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class BCPStatus(StrEnum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"
    RETIRED = "retired"


class CriticalityLevel(StrEnum):
    MISSION_CRITICAL = "mission_critical"
    CRITICAL = "critical"
    ESSENTIAL = "essential"
    NON_ESSENTIAL = "non_essential"


class DisasterType(StrEnum):
    NATURAL = "natural"
    TECHNOLOGY = "technology"
    CYBER = "cyber"
    PANDEMIC = "pandemic"
    CIVIL = "civil"
    UTILITY = "utility"
    SUPPLY_CHAIN = "supply_chain"


class RecoveryStrategy(StrEnum):
    HOT_SITE = "hot_site"
    WARM_SITE = "warm_site"
    COLD_SITE = "cold_site"
    CLOUD = "cloud"
    WORK_FROM_HOME = "work_from_home"
    MUTUAL_AID = "mutual_aid"


class TestType(StrEnum):
    TABLETOP = "tabletop"
    WALKTHROUGH = "walkthrough"
    SIMULATION = "simulation"
    PARALLEL = "parallel"
    FULL_INTERRUPTION = "full_interruption"


class BusinessProcess(BaseModel):
    process_id: UUID = Field(default_factory=uuid4)
    process_name: str
    process_description: str
    business_unit: str
    process_owner: str
    criticality: CriticalityLevel
    rto_hours: int  # Recovery Time Objective
    rpo_hours: int  # Recovery Point Objective
    mtpd_hours: int  # Maximum Tolerable Period of Disruption
    minimum_staff: int
    normal_staff: int
    dependencies: list[str] = Field(default_factory=list)
    systems_required: list[str] = Field(default_factory=list)
    vendors_required: list[str] = Field(default_factory=list)
    alternate_location: str | None = None
    recovery_strategy: RecoveryStrategy
    financial_impact_per_hour: Decimal
    regulatory_impact: bool = False
    customer_impact: bool = False
    is_active: bool = True


class BusinessContinuityPlan(BaseModel):
    plan_id: UUID = Field(default_factory=uuid4)
    plan_name: str
    plan_version: str
    business_unit: str
    plan_owner: str
    status: BCPStatus = BCPStatus.DRAFT
    effective_date: date | None = None
    expiry_date: date | None = None
    last_review_date: date | None = None
    next_review_date: date | None = None
    approved_by: str | None = None
    approval_date: date | None = None
    scope: str
    objectives: list[str]
    assumptions: list[str]
    processes_covered: list[UUID] = Field(default_factory=list)
    recovery_teams: list[dict[str, Any]] = Field(default_factory=list)
    communication_plan: dict[str, Any] = Field(default_factory=dict)
    activation_criteria: list[str] = Field(default_factory=list)
    deactivation_criteria: list[str] = Field(default_factory=list)
    document_location: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DisasterRecoveryPlan(BaseModel):
    dr_plan_id: UUID = Field(default_factory=uuid4)
    plan_name: str
    plan_version: str
    status: BCPStatus = BCPStatus.DRAFT
    system_name: str
    system_criticality: CriticalityLevel
    rto_hours: int
    rpo_hours: int
    recovery_site: str
    recovery_strategy: RecoveryStrategy
    backup_frequency: str
    backup_location: str
    backup_retention: str
    recovery_procedures: list[str] = Field(default_factory=list)
    verification_steps: list[str] = Field(default_factory=list)
    contact_list: list[dict[str, str]] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    last_test_date: date | None = None
    next_test_date: date | None = None
    test_result: str | None = None
    owner: str
    approved_by: str | None = None


class BCPTest(BaseModel):
    test_id: UUID = Field(default_factory=uuid4)
    plan_id: UUID
    test_name: str
    test_type: TestType
    test_date: date
    test_duration_hours: float
    scope: str
    objectives: list[str]
    participants: list[str]
    scenarios_tested: list[str]
    test_coordinator: str
    test_result: str  # pass, partial, fail
    rto_achieved: int | None = None
    rpo_achieved: int | None = None
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    action_items: list[dict[str, Any]] = Field(default_factory=list)
    lessons_learned: list[str] = Field(default_factory=list)
    report_date: date | None = None
    approved_by: str | None = None


class BCPIncident(BaseModel):
    incident_id: UUID = Field(default_factory=uuid4)
    incident_name: str
    disaster_type: DisasterType
    declaration_time: datetime
    declared_by: str
    affected_locations: list[str]
    affected_processes: list[UUID]
    impact_description: str
    plan_activated: UUID
    activation_time: datetime
    recovery_start_time: datetime | None = None
    recovery_end_time: datetime | None = None
    deactivation_time: datetime | None = None
    status: str = "active"
    actual_rto_hours: float | None = None
    actual_rpo_hours: float | None = None
    financial_impact: Decimal | None = None
    lessons_learned: list[str] = Field(default_factory=list)
    post_incident_review_date: date | None = None


class CrisisTeamMember(BaseModel):
    member_id: UUID = Field(default_factory=uuid4)
    team_name: str
    role: str
    primary_contact: str
    primary_phone: str
    primary_email: str
    alternate_contact: str | None = None
    alternate_phone: str | None = None
    backup_person: str | None = None
    backup_phone: str | None = None
    responsibilities: list[str]
    is_active: bool = True


class BCPMetrics(BaseModel):
    metrics_id: UUID = Field(default_factory=uuid4)
    metrics_date: date
    business_unit: str | None = None
    total_processes: int
    critical_processes: int
    plans_count: int
    plans_approved: int
    plans_expired: int
    tests_conducted_ytd: int
    tests_passed: int
    average_rto_achievement: Decimal
    average_rpo_achievement: Decimal
    incidents_ytd: int
    successful_recoveries: int
    open_action_items: int
    overdue_reviews: int
    coverage_percentage: Decimal
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
