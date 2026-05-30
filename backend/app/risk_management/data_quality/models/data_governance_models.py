"""Data Governance Models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class DataClassification(StrEnum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    PII = "pii"
    PCI = "pci"


class DataDomain(BaseModel):
    domain_id: UUID = Field(default_factory=uuid4)
    domain_name: str
    domain_code: str
    description: str
    business_owner: str
    data_steward: str
    technical_owner: str
    parent_domain_id: UUID | None = None
    sub_domains: list[str] = Field(default_factory=list)
    critical_data_elements: list[str] = Field(default_factory=list)
    policies: list[str] = Field(default_factory=list)
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_active: bool = True


class DataOwnership(BaseModel):
    ownership_id: UUID = Field(default_factory=uuid4)
    asset_id: UUID
    asset_name: str
    business_owner: str
    data_steward: str
    technical_owner: str
    custodian: str = ""
    effective_date: date
    expiry_date: date | None = None
    responsibilities: dict[str, list[str]] = Field(default_factory=dict)
    escalation_path: list[str] = Field(default_factory=list)
    status: str = "active"


class DataPolicy(BaseModel):
    policy_id: UUID = Field(default_factory=uuid4)
    policy_code: str
    policy_name: str
    policy_type: str  # quality, security, retention, usage, sharing
    description: str
    scope: str
    requirements: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)
    exceptions_process: str = ""
    owner: str
    approver: str
    effective_date: date
    review_date: date
    version: str = "1.0"
    status: str = "active"


class DataStandard(BaseModel):
    standard_id: UUID = Field(default_factory=uuid4)
    standard_code: str
    standard_name: str
    standard_type: str  # naming, format, encoding, modeling
    description: str
    domain_applicability: list[str] = Field(default_factory=list)
    rules: list[dict[str, Any]] = Field(default_factory=list)
    examples: list[dict[str, Any]] = Field(default_factory=list)
    owner: str
    effective_date: date
    is_mandatory: bool = True
    status: str = "active"


class BusinessGlossary(BaseModel):
    term_id: UUID = Field(default_factory=uuid4)
    term_name: str
    term_definition: str
    domain_id: UUID
    synonyms: list[str] = Field(default_factory=list)
    related_terms: list[str] = Field(default_factory=list)
    business_rules: list[str] = Field(default_factory=list)
    owner: str
    steward: str
    status: str = "approved"
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_updated: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DataAccessRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    requestor: str
    requestor_department: str
    asset_id: UUID
    asset_name: str
    access_type: str  # read, write, full
    purpose: str
    duration: str
    justification: str
    approver: str = ""
    approval_date: datetime | None = None
    status: str = "pending"
    expiry_date: date | None = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DataPrivacyAssessment(BaseModel):
    assessment_id: UUID = Field(default_factory=uuid4)
    asset_id: UUID
    asset_name: str
    assessment_date: date
    assessor: str
    contains_pii: bool = False
    pii_categories: list[str] = Field(default_factory=list)
    data_subjects: list[str] = Field(default_factory=list)
    processing_purposes: list[str] = Field(default_factory=list)
    retention_period: str = ""
    sharing_partners: list[str] = Field(default_factory=list)
    security_controls: list[str] = Field(default_factory=list)
    risk_level: str = "low"
    recommendations: list[str] = Field(default_factory=list)
    status: str = "completed"


class GovernanceMetric(BaseModel):
    metric_id: UUID = Field(default_factory=uuid4)
    metric_date: date
    domain_id: UUID | None = None
    metric_name: str
    metric_type: str
    current_value: float
    target_value: float
    threshold_value: float
    trend: str = "stable"
    status: str = "green"
    calculated_by: str = "system"
