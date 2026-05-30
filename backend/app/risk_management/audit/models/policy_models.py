"""Policy Management Models"""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class PolicyStatus(StrEnum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    RETIRED = "retired"


class PolicyCategory(StrEnum):
    CORPORATE = "corporate"
    RISK = "risk"
    COMPLIANCE = "compliance"
    OPERATIONS = "operations"
    HR = "hr"
    IT = "it"
    FINANCE = "finance"
    SECURITY = "security"


class Policy(BaseModel):
    policy_id: UUID = Field(default_factory=uuid4)
    policy_code: str
    policy_name: str
    policy_category: PolicyCategory
    version: str
    description: str
    purpose: str
    scope: str
    policy_statement: str
    definitions: dict[str, str] = Field(default_factory=dict)
    roles_responsibilities: dict[str, list[str]] = Field(default_factory=dict)
    procedures: list[dict[str, Any]] = Field(default_factory=list)
    exceptions_process: str = ""
    owner: str
    approver: str
    effective_date: date
    review_date: date
    next_review_date: date
    status: PolicyStatus = PolicyStatus.DRAFT
    related_policies: list[str] = Field(default_factory=list)
    regulatory_references: list[str] = Field(default_factory=list)
    created_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_by: str = ""


class PolicyVersion(BaseModel):
    version_id: UUID = Field(default_factory=uuid4)
    policy_id: UUID
    version_number: str
    change_summary: str
    changes_made: list[str] = Field(default_factory=list)
    changed_by: str
    change_date: date
    approved_by: str | None = None
    approval_date: date | None = None
    effective_date: date
    supersedes_version: str | None = None
    document_reference: str = ""


class PolicyException(BaseModel):
    exception_id: UUID = Field(default_factory=uuid4)
    policy_id: UUID
    exception_reference: str
    requestor: str
    request_date: date
    business_unit: str
    exception_type: str
    description: str
    justification: str
    risk_assessment: str
    compensating_controls: list[str] = Field(default_factory=list)
    duration: str
    expiry_date: date
    approved_by: str | None = None
    approval_date: date | None = None
    status: str = "pending"
    review_required: bool = True
    review_date: date | None = None


class PolicyAttestation(BaseModel):
    attestation_id: UUID = Field(default_factory=uuid4)
    policy_id: UUID
    attestation_period: str
    employee_id: str
    employee_name: str
    department: str
    attestation_date: date
    acknowledged: bool = False
    understood: bool = False
    compliant: bool = False
    exceptions_noted: list[str] = Field(default_factory=list)
    comments: str = ""


class PolicyReview(BaseModel):
    review_id: UUID = Field(default_factory=uuid4)
    policy_id: UUID
    review_date: date
    reviewer: str
    review_type: str  # periodic, triggered, regulatory
    current_relevance: str
    regulatory_alignment: str
    operational_effectiveness: str
    gaps_identified: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    changes_required: bool = False
    priority: str = "normal"
    status: str = "completed"


class Procedure(BaseModel):
    procedure_id: UUID = Field(default_factory=uuid4)
    policy_id: UUID
    procedure_code: str
    procedure_name: str
    version: str
    description: str
    steps: list[dict[str, Any]] = Field(default_factory=list)
    responsible_role: str
    inputs_required: list[str] = Field(default_factory=list)
    outputs_produced: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)
    systems_used: list[str] = Field(default_factory=list)
    sla: str = ""
    owner: str
    effective_date: date
    status: str = "active"
