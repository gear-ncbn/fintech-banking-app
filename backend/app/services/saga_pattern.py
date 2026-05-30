"""
Saga Pattern Implementation for Distributed Transactions

This module implements the saga pattern for multi-step operations that
span multiple services or accounts. It provides:

- Orchestration-based saga management
- Automatic compensation (rollback) logic
- Transaction status tracking
- Failure recovery and retry logic
- Dead letter queue for poison messages
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any


class SagaStatus(StrEnum):
    """Status of a saga"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class StepStatus(StrEnum):
    """Status of a step in a saga"""
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATING = "compensating"
    COMPENSATED = "compensated"


@dataclass
class SagaStep:
    """A single step in a saga"""
    step_id: str
    name: str
    action: Callable
    compensation: Callable
    timeout: int = 30  # seconds
    max_retries: int = 3
    retry_delay: int = 1  # seconds

    status: StepStatus = StepStatus.PENDING
    attempt: int = 0
    error: str | None = None
    result: Any | None = None
    timestamp: datetime | None = None


@dataclass
class SagaContext:
    """Context for a saga execution"""
    saga_id: str
    user_id: int
    transaction_type: str
    amount: Decimal
    metadata: dict[str, Any] = field(default_factory=dict)

    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    started_at: datetime | None = None
    completed_at: datetime | None = None

    status: SagaStatus = SagaStatus.PENDING
    steps: list[SagaStep] = field(default_factory=list)
    completed_steps: list[SagaStep] = field(default_factory=list)


class SagaOrchestrator:
    """
    Orchestrates multi-step transactions using the saga pattern.

    Example: Investment trade
    1. Reserve buying power
    2. Place order at exchange
    3. Update portfolio
    (Compensations: Release buying power, Cancel order, Remove from portfolio)
    """

    def __init__(self):
        """Initialize saga orchestrator"""
        self._sagas: dict[str, SagaContext] = {}
        self._deadletter: list[SagaContext] = []

    def create_saga(
        self,
        user_id: int,
        transaction_type: str,
        amount: Decimal,
        metadata: dict[str, Any] | None = None,
    ) -> SagaContext:
        """
        Create a new saga.

        Args:
            user_id: User ID
            transaction_type: Type of transaction
            amount: Transaction amount
            metadata: Additional context

        Returns:
            SagaContext
        """
        saga_id = str(uuid.uuid4())
        context = SagaContext(
            saga_id=saga_id,
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            metadata=metadata or {},
        )

        self._sagas[saga_id] = context
        return context

    def add_step(
        self,
        saga_id: str,
        step_name: str,
        action: Callable,
        compensation: Callable,
        timeout: int = 30,
        max_retries: int = 3,
    ) -> SagaStep:
        """
        Add a step to a saga.

        Args:
            saga_id: Saga ID
            step_name: Name of the step
            action: Function to execute
            compensation: Compensation function if step fails
            timeout: Timeout in seconds
            max_retries: Maximum retries

        Returns:
            SagaStep
        """
        if saga_id not in self._sagas:
            raise ValueError(f"Saga {saga_id} not found")

        step = SagaStep(
            step_id=str(uuid.uuid4()),
            name=step_name,
            action=action,
            compensation=compensation,
            timeout=timeout,
            max_retries=max_retries,
        )

        self._sagas[saga_id].steps.append(step)
        return step

    def execute(self, saga_id: str) -> bool:
        """
        Execute a saga with automatic compensation on failure.

        Args:
            saga_id: Saga ID

        Returns:
            True if successful, False if failed/rolled back
        """
        if saga_id not in self._sagas:
            raise ValueError(f"Saga {saga_id} not found")

        saga = self._sagas[saga_id]
        saga.status = SagaStatus.IN_PROGRESS
        saga.started_at = datetime.now(UTC)

        try:
            # Execute all steps in order
            for step in saga.steps:
                if not self._execute_step(saga, step):
                    # Step failed, start compensation
                    return self._compensate(saga)

            # All steps completed successfully
            saga.status = SagaStatus.COMPLETED
            saga.completed_at = datetime.now(UTC)
            return True

        except Exception:
            saga.status = SagaStatus.FAILED
            saga.completed_at = datetime.now(UTC)
            self._deadletter.append(saga)
            raise

    def _execute_step(self, saga: SagaContext, step: SagaStep) -> bool:
        """
        Execute a single step with retries.

        Args:
            saga: Saga context
            step: Step to execute

        Returns:
            True if successful, False if all retries failed
        """
        step.status = StepStatus.EXECUTING
        step.timestamp = datetime.now(UTC)

        for attempt in range(step.max_retries):
            try:
                step.attempt = attempt + 1
                result = step.action(saga)
                step.status = StepStatus.COMPLETED
                step.result = result
                saga.completed_steps.append(step)
                return True

            except Exception as e:
                step.error = str(e)

                if attempt < step.max_retries - 1:
                    # Retry
                    import time
                    time.sleep(step.retry_delay)
                else:
                    # All retries exhausted
                    step.status = StepStatus.FAILED
                    return False

        return False

    def _compensate(self, saga: SagaContext) -> bool:
        """
        Execute compensation for all completed steps.

        Args:
            saga: Saga context

        Returns:
            True if compensation successful, False otherwise
        """
        saga.status = SagaStatus.COMPENSATING

        # Compensate in reverse order
        for step in reversed(saga.completed_steps):
            try:
                step.status = StepStatus.COMPENSATING
                step.compensation(saga)
                step.status = StepStatus.COMPENSATED

            except Exception:
                # Compensation failed - go to dead letter queue
                saga.status = SagaStatus.FAILED
                self._deadletter.append(saga)
                return False

        saga.status = SagaStatus.ROLLED_BACK
        saga.completed_at = datetime.now(UTC)
        return False

    def get_saga(self, saga_id: str) -> SagaContext | None:
        """Get saga by ID"""
        return self._sagas.get(saga_id)

    def get_deadletter(self) -> list[SagaContext]:
        """Get failed sagas"""
        return self._deadletter.copy()

    def retry_saga(self, saga_id: str) -> bool:
        """Retry a failed saga"""
        saga = self._sagas.get(saga_id)
        if not saga:
            raise ValueError(f"Saga {saga_id} not found")

        # Reset saga state
        saga.status = SagaStatus.PENDING
        saga.started_at = None
        saga.completed_at = None
        saga.completed_steps = []

        for step in saga.steps:
            step.status = StepStatus.PENDING
            step.attempt = 0
            step.error = None
            step.result = None

        # Remove from dead letter if present
        self._deadletter = [s for s in self._deadletter if s.saga_id != saga_id]

        # Execute again
        return self.execute(saga_id)

    def get_statistics(self) -> dict[str, Any]:
        """Get orchestrator statistics"""
        completed = sum(
            1 for s in self._sagas.values()
            if s.status == SagaStatus.COMPLETED
        )
        failed = sum(
            1 for s in self._sagas.values()
            if s.status == SagaStatus.FAILED
        )

        return {
            'total_sagas': len(self._sagas),
            'completed': completed,
            'failed': failed,
            'deadletter_size': len(self._deadletter),
        }


# Global saga orchestrator instance
_orchestrator: SagaOrchestrator | None = None


def get_saga_orchestrator() -> SagaOrchestrator:
    """Get global saga orchestrator"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = SagaOrchestrator()
    return _orchestrator


def reset_saga_orchestrator() -> None:
    """Reset orchestrator (for testing)"""
    global _orchestrator
    _orchestrator = SagaOrchestrator()
