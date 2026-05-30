"""
AML Workflow Service

Orchestrates AML workflows and processes.
"""

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4


class WorkflowType(StrEnum):
    """Types of AML workflows"""
    ALERT_INVESTIGATION = "alert_investigation"
    CASE_INVESTIGATION = "case_investigation"
    SAR_PREPARATION = "sar_preparation"
    KYC_REFRESH = "kyc_refresh"
    EDD_REVIEW = "edd_review"
    PERIODIC_REVIEW = "periodic_review"
    SANCTIONS_REMEDIATION = "sanctions_remediation"


class WorkflowStatus(StrEnum):
    """Workflow status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkflowStep:
    """Individual step in a workflow"""
    def __init__(
        self, step_id: str, step_name: str, step_type: str,
        required: bool = True, order: int = 0
    ):
        self.step_id = step_id
        self.step_name = step_name
        self.step_type = step_type
        self.required = required
        self.order = order
        self.status = "pending"
        self.completed_at: datetime | None = None
        self.completed_by: str | None = None
        self.result: dict[str, Any] | None = None


class Workflow:
    """AML Workflow entity"""
    def __init__(
        self, workflow_type: WorkflowType, entity_id: str, entity_type: str, created_by: str
    ):
        self.workflow_id = uuid4()
        self.workflow_type = workflow_type
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.status = WorkflowStatus.PENDING
        self.steps: list[WorkflowStep] = []
        self.current_step_index = 0
        self.created_by = created_by
        self.created_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)
        self.completed_at: datetime | None = None
        self.due_date: datetime | None = None
        self.assigned_to: str | None = None
        self.metadata: dict[str, Any] = {}


class AMLWorkflowService:
    """Service for orchestrating AML workflows"""

    def __init__(self):
        self._workflows: dict[UUID, Workflow] = {}
        self._workflow_templates: dict[WorkflowType, list[dict[str, Any]]] = {}
        self._initialize_templates()

    def _initialize_templates(self):
        """Initialize workflow templates"""
        self._workflow_templates[WorkflowType.ALERT_INVESTIGATION] = [
            {"step_id": "review_alert", "step_name": "Review Alert Details", "step_type": "review", "order": 1},
            {"step_id": "gather_info", "step_name": "Gather Additional Information", "step_type": "investigation", "order": 2},
            {"step_id": "analyze_transactions", "step_name": "Analyze Transactions", "step_type": "analysis", "order": 3},
            {"step_id": "document_findings", "step_name": "Document Findings", "step_type": "documentation", "order": 4},
            {"step_id": "make_decision", "step_name": "Make Decision", "step_type": "decision", "order": 5},
            {"step_id": "supervisor_review", "step_name": "Supervisor Review", "step_type": "approval", "order": 6},
        ]

        self._workflow_templates[WorkflowType.CASE_INVESTIGATION] = [
            {"step_id": "case_setup", "step_name": "Case Setup & Planning", "step_type": "setup", "order": 1},
            {"step_id": "data_collection", "step_name": "Data Collection", "step_type": "collection", "order": 2},
            {"step_id": "analysis", "step_name": "Deep Analysis", "step_type": "analysis", "order": 3},
            {"step_id": "network_analysis", "step_name": "Network Analysis", "step_type": "analysis", "order": 4},
            {"step_id": "document_findings", "step_name": "Document Findings", "step_type": "documentation", "order": 5},
            {"step_id": "risk_assessment", "step_name": "Risk Assessment", "step_type": "assessment", "order": 6},
            {"step_id": "recommendation", "step_name": "Prepare Recommendation", "step_type": "decision", "order": 7},
            {"step_id": "qc_review", "step_name": "QC Review", "step_type": "review", "order": 8},
            {"step_id": "manager_approval", "step_name": "Manager Approval", "step_type": "approval", "order": 9},
        ]

        self._workflow_templates[WorkflowType.SAR_PREPARATION] = [
            {"step_id": "gather_info", "step_name": "Gather Case Information", "step_type": "collection", "order": 1},
            {"step_id": "identify_subjects", "step_name": "Identify Subjects", "step_type": "identification", "order": 2},
            {"step_id": "prepare_narrative", "step_name": "Prepare Narrative", "step_type": "documentation", "order": 3},
            {"step_id": "compile_transactions", "step_name": "Compile Transactions", "step_type": "compilation", "order": 4},
            {"step_id": "qc_review", "step_name": "QC Review", "step_type": "review", "order": 5},
            {"step_id": "compliance_approval", "step_name": "Compliance Officer Approval", "step_type": "approval", "order": 6},
            {"step_id": "bsa_officer_approval", "step_name": "BSA Officer Approval", "step_type": "approval", "order": 7},
            {"step_id": "file_sar", "step_name": "File SAR", "step_type": "filing", "order": 8},
        ]

        self._workflow_templates[WorkflowType.KYC_REFRESH] = [
            {"step_id": "request_documents", "step_name": "Request Updated Documents", "step_type": "request", "order": 1},
            {"step_id": "verify_documents", "step_name": "Verify Documents", "step_type": "verification", "order": 2},
            {"step_id": "update_profile", "step_name": "Update Customer Profile", "step_type": "update", "order": 3},
            {"step_id": "run_checks", "step_name": "Run KYC Checks", "step_type": "screening", "order": 4},
            {"step_id": "risk_assessment", "step_name": "Update Risk Assessment", "step_type": "assessment", "order": 5},
            {"step_id": "approval", "step_name": "Approval", "step_type": "approval", "order": 6},
        ]

        self._workflow_templates[WorkflowType.EDD_REVIEW] = [
            {"step_id": "identify_requirements", "step_name": "Identify EDD Requirements", "step_type": "identification", "order": 1},
            {"step_id": "collect_information", "step_name": "Collect Additional Information", "step_type": "collection", "order": 2},
            {"step_id": "source_of_funds", "step_name": "Verify Source of Funds", "step_type": "verification", "order": 3},
            {"step_id": "source_of_wealth", "step_name": "Verify Source of Wealth", "step_type": "verification", "order": 4},
            {"step_id": "adverse_media", "step_name": "Adverse Media Review", "step_type": "review", "order": 5},
            {"step_id": "risk_assessment", "step_name": "Enhanced Risk Assessment", "step_type": "assessment", "order": 6},
            {"step_id": "recommendation", "step_name": "Prepare Recommendation", "step_type": "decision", "order": 7},
            {"step_id": "committee_review", "step_name": "Risk Committee Review", "step_type": "approval", "order": 8},
        ]

        self._workflow_templates[WorkflowType.PERIODIC_REVIEW] = [
            {"step_id": "gather_data", "step_name": "Gather Review Data", "step_type": "collection", "order": 1},
            {"step_id": "activity_review", "step_name": "Review Account Activity", "step_type": "review", "order": 2},
            {"step_id": "risk_review", "step_name": "Review Risk Assessment", "step_type": "assessment", "order": 3},
            {"step_id": "kyc_validation", "step_name": "Validate KYC Information", "step_type": "validation", "order": 4},
            {"step_id": "update_profile", "step_name": "Update Profile if Needed", "step_type": "update", "order": 5},
            {"step_id": "approval", "step_name": "Review Approval", "step_type": "approval", "order": 6},
        ]

        self._workflow_templates[WorkflowType.SANCTIONS_REMEDIATION] = [
            {"step_id": "confirm_match", "step_name": "Confirm Sanctions Match", "step_type": "confirmation", "order": 1},
            {"step_id": "freeze_accounts", "step_name": "Freeze Related Accounts", "step_type": "action", "order": 2},
            {"step_id": "notify_compliance", "step_name": "Notify Compliance", "step_type": "notification", "order": 3},
            {"step_id": "document_exposure", "step_name": "Document Sanctions Exposure", "step_type": "documentation", "order": 4},
            {"step_id": "regulatory_report", "step_name": "Prepare Regulatory Report", "step_type": "reporting", "order": 5},
            {"step_id": "legal_review", "step_name": "Legal Review", "step_type": "review", "order": 6},
            {"step_id": "management_approval", "step_name": "Senior Management Approval", "step_type": "approval", "order": 7},
            {"step_id": "file_report", "step_name": "File Regulatory Report", "step_type": "filing", "order": 8},
        ]

    async def create_workflow(
        self, workflow_type: WorkflowType, entity_id: str, entity_type: str, created_by: str,
        due_date: datetime | None = None, assigned_to: str | None = None
    ) -> Workflow:
        """Create a new workflow"""
        workflow = Workflow(workflow_type, entity_id, entity_type, created_by)
        workflow.due_date = due_date or datetime.now(UTC) + timedelta(days=30)
        workflow.assigned_to = assigned_to

        # Add steps from template
        template = self._workflow_templates.get(workflow_type, [])
        for step_config in template:
            step = WorkflowStep(
                step_id=step_config["step_id"],
                step_name=step_config["step_name"],
                step_type=step_config["step_type"],
                order=step_config["order"]
            )
            workflow.steps.append(step)

        self._workflows[workflow.workflow_id] = workflow
        return workflow

    async def get_workflow(self, workflow_id: UUID) -> Workflow | None:
        """Get workflow by ID"""
        return self._workflows.get(workflow_id)

    async def start_workflow(self, workflow_id: UUID, started_by: str) -> Workflow | None:
        """Start a workflow"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        workflow.status = WorkflowStatus.IN_PROGRESS
        if workflow.steps:
            workflow.steps[0].status = "in_progress"

        workflow.updated_at = datetime.now(UTC)
        return workflow

    async def complete_step(
        self, workflow_id: UUID, step_id: str, completed_by: str, result: dict[str, Any] | None = None
    ) -> Workflow | None:
        """Complete a workflow step"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        for i, step in enumerate(workflow.steps):
            if step.step_id == step_id:
                step.status = "completed"
                step.completed_at = datetime.now(UTC)
                step.completed_by = completed_by
                step.result = result

                # Move to next step
                if i + 1 < len(workflow.steps):
                    workflow.current_step_index = i + 1
                    workflow.steps[i + 1].status = "in_progress"
                else:
                    # All steps completed
                    workflow.status = WorkflowStatus.COMPLETED
                    workflow.completed_at = datetime.now(UTC)

                workflow.updated_at = datetime.now(UTC)
                return workflow

        return workflow

    async def skip_step(
        self, workflow_id: UUID, step_id: str, skipped_by: str, reason: str
    ) -> Workflow | None:
        """Skip a workflow step"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        for i, step in enumerate(workflow.steps):
            if step.step_id == step_id:
                if step.required:
                    raise ValueError(f"Cannot skip required step: {step.step_name}")

                step.status = "skipped"
                step.result = {"skipped_by": skipped_by, "reason": reason}

                # Move to next step
                if i + 1 < len(workflow.steps):
                    workflow.current_step_index = i + 1
                    workflow.steps[i + 1].status = "in_progress"

                workflow.updated_at = datetime.now(UTC)
                return workflow

        return workflow

    async def request_approval(
        self, workflow_id: UUID, requested_by: str, approvers: list[str]
    ) -> Workflow | None:
        """Request approval for current workflow step"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        workflow.status = WorkflowStatus.AWAITING_APPROVAL
        workflow.metadata["pending_approvers"] = approvers
        workflow.metadata["approval_requested_by"] = requested_by
        workflow.metadata["approval_requested_at"] = datetime.now(UTC).isoformat()
        workflow.updated_at = datetime.now(UTC)

        return workflow

    async def approve_step(
        self, workflow_id: UUID, approver: str, comments: str | None = None
    ) -> Workflow | None:
        """Approve a workflow step"""
        workflow = self._workflows.get(workflow_id)
        if not workflow or workflow.status != WorkflowStatus.AWAITING_APPROVAL:
            return None

        pending_approvers = workflow.metadata.get("pending_approvers", [])
        if approver in pending_approvers:
            pending_approvers.remove(approver)

            if not workflow.metadata.get("approvals"):
                workflow.metadata["approvals"] = []

            workflow.metadata["approvals"].append({
                "approver": approver,
                "approved_at": datetime.now(UTC).isoformat(),
                "comments": comments
            })

            if not pending_approvers:
                # All approvals received
                workflow.status = WorkflowStatus.IN_PROGRESS
                await self.complete_step(
                    workflow_id,
                    workflow.steps[workflow.current_step_index].step_id,
                    approver
                )

            workflow.metadata["pending_approvers"] = pending_approvers

        workflow.updated_at = datetime.now(UTC)
        return workflow

    async def reject_step(
        self, workflow_id: UUID, rejected_by: str, reason: str
    ) -> Workflow | None:
        """Reject a workflow step"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        workflow.status = WorkflowStatus.REJECTED
        workflow.metadata["rejection"] = {
            "rejected_by": rejected_by,
            "rejected_at": datetime.now(UTC).isoformat(),
            "reason": reason
        }
        workflow.updated_at = datetime.now(UTC)
        return workflow

    async def cancel_workflow(
        self, workflow_id: UUID, cancelled_by: str, reason: str
    ) -> Workflow | None:
        """Cancel a workflow"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        workflow.status = WorkflowStatus.CANCELLED
        workflow.metadata["cancellation"] = {
            "cancelled_by": cancelled_by,
            "cancelled_at": datetime.now(UTC).isoformat(),
            "reason": reason
        }
        workflow.updated_at = datetime.now(UTC)
        return workflow

    async def reassign_workflow(
        self, workflow_id: UUID, new_assignee: str, reassigned_by: str
    ) -> Workflow | None:
        """Reassign a workflow to a different user"""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return None

        old_assignee = workflow.assigned_to
        workflow.assigned_to = new_assignee

        if not workflow.metadata.get("reassignment_history"):
            workflow.metadata["reassignment_history"] = []

        workflow.metadata["reassignment_history"].append({
            "from": old_assignee,
            "to": new_assignee,
            "by": reassigned_by,
            "at": datetime.now(UTC).isoformat()
        })

        workflow.updated_at = datetime.now(UTC)
        return workflow

    async def get_workflows_by_entity(
        self, entity_id: str, entity_type: str
    ) -> list[Workflow]:
        """Get all workflows for an entity"""
        return [
            w for w in self._workflows.values()
            if w.entity_id == entity_id and w.entity_type == entity_type
        ]

    async def get_assigned_workflows(self, assignee: str) -> list[Workflow]:
        """Get all workflows assigned to a user"""
        return [
            w for w in self._workflows.values()
            if w.assigned_to == assignee and w.status not in [
                WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED
            ]
        ]

    async def get_overdue_workflows(self) -> list[Workflow]:
        """Get all overdue workflows"""
        now = datetime.now(UTC)
        return [
            w for w in self._workflows.values()
            if w.due_date and w.due_date < now and w.status not in [
                WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED
            ]
        ]

    async def get_workflow_statistics(self) -> dict[str, Any]:
        """Get workflow statistics"""
        stats = {
            "total": len(self._workflows),
            "by_status": {},
            "by_type": {},
            "overdue": 0,
            "awaiting_approval": 0
        }

        now = datetime.now(UTC)

        for workflow in self._workflows.values():
            # By status
            status_key = workflow.status.value
            stats["by_status"][status_key] = stats["by_status"].get(status_key, 0) + 1

            # By type
            type_key = workflow.workflow_type.value
            stats["by_type"][type_key] = stats["by_type"].get(type_key, 0) + 1

            # Overdue
            if workflow.due_date and workflow.due_date < now and workflow.status not in [
                WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED
            ]:
                stats["overdue"] += 1

            # Awaiting approval
            if workflow.status == WorkflowStatus.AWAITING_APPROVAL:
                stats["awaiting_approval"] += 1

        return stats


# Global service instance
aml_workflow_service = AMLWorkflowService()
