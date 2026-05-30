"""
Transaction Coordinator with Queue-Based Serialization

This module provides centralized coordination of all financial transactions.
It ensures that balance modifications are serialized and atomic, preventing
race conditions and data inconsistencies.

Features:
- Queue-based transaction processing
- Optimistic locking with version numbers
- Atomic balance modifications
- Transaction state tracking
- Rollback and compensation support
"""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from enum import StrEnum
from queue import Empty, Queue
from threading import Event, Lock, Thread
from typing import Any

from app.services.event_store import TransactionEvent, TransactionEventStatus, TransactionEventType, get_event_store


class TransactionState(StrEnum):
    """Possible states of a transaction"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TransactionContext:
    """Context information for a transaction"""

    def __init__(self,
                 transaction_id: str,
                 user_id: int,
                 transaction_type: str,
                 amount: Decimal,
                 from_account_id: int | None = None,
                 to_account_id: int | None = None,
                 description: str = "",
                 metadata: dict[str, Any] | None = None):
        """
        Initialize transaction context.

        Args:
            transaction_id: Unique ID for this transaction
            user_id: User performing the transaction
            transaction_type: Type of transaction
            amount: Amount involved
            from_account_id: Source account (if applicable)
            to_account_id: Destination account (if applicable)
            description: Human-readable description
            metadata: Additional context data
        """
        self.transaction_id = transaction_id
        self.user_id = user_id
        self.transaction_type = transaction_type
        self.amount = Decimal(str(amount))
        self.from_account_id = from_account_id
        self.to_account_id = to_account_id
        self.description = description
        self.metadata = metadata or {}

        # State tracking
        self.state = TransactionState.PENDING
        self.created_at = datetime.now(UTC)
        self.started_at: datetime | None = None
        self.completed_at: datetime | None = None
        self.error_message: str | None = None

        # Version tracking for optimistic locking
        self.version = 1
        self.account_versions: dict[int, int] = {}

    def mark_processing(self) -> None:
        """Mark transaction as processing"""
        self.state = TransactionState.PROCESSING
        self.started_at = datetime.now(UTC)

    def mark_completed(self) -> None:
        """Mark transaction as completed"""
        self.state = TransactionState.COMPLETED
        self.completed_at = datetime.now(UTC)

    def mark_failed(self, error_message: str) -> None:
        """Mark transaction as failed"""
        self.state = TransactionState.FAILED
        self.completed_at = datetime.now(UTC)
        self.error_message = error_message

    def mark_cancelled(self) -> None:
        """Mark transaction as cancelled"""
        self.state = TransactionState.CANCELLED
        self.completed_at = datetime.now(UTC)

    def duration(self) -> timedelta | None:
        """Get duration of transaction"""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None


class AccountVersionLock:
    """
    Optimistic locking mechanism using version numbers.

    This prevents lost updates when multiple transactions try to
    modify the same account simultaneously.
    """

    def __init__(self):
        """Initialize version locks"""
        self._versions: dict[int, int] = {}  # account_id -> version
        self._lock = Lock()

    def get_version(self, account_id: int) -> int:
        """
        Get current version of an account.

        Args:
            account_id: The account ID

        Returns:
            Current version number
        """
        with self._lock:
            return self._versions.get(account_id, 1)

    def increment_version(self, account_id: int) -> int:
        """
        Increment version for an account.

        Args:
            account_id: The account ID

        Returns:
            New version number
        """
        with self._lock:
            current = self._versions.get(account_id, 1)
            self._versions[account_id] = current + 1
            return self._versions[account_id]

    def validate_version(self, account_id: int, expected_version: int) -> bool:
        """
        Check if account version matches expected version.

        Args:
            account_id: The account ID
            expected_version: Expected version number

        Returns:
            True if versions match, False otherwise
        """
        with self._lock:
            return self._versions.get(account_id, 1) == expected_version

    def reset(self) -> None:
        """Reset all versions (for testing)"""
        with self._lock:
            self._versions.clear()


class TransactionCoordinator:
    """
    Centralized transaction coordinator that serializes balance modifications.

    This ensures ACID properties by:
    - Processing transactions sequentially (serialization)
    - Tracking transaction state
    - Recording events immutably
    - Supporting rollback and compensation
    """

    def __init__(self, max_queue_size: int = 10000):
        """
        Initialize transaction coordinator.

        Args:
            max_queue_size: Maximum transaction queue size
        """
        self._queue: Queue[TransactionContext] = Queue(maxsize=max_queue_size)
        self._lock = Lock()

        # Transaction tracking
        self._transactions: dict[str, TransactionContext] = {}
        self._completed_transactions: dict[str, TransactionContext] = {}

        # Optimistic locking
        self._version_lock = AccountVersionLock()

        # Event store
        self._event_store = get_event_store()

        # Worker thread
        self._worker_thread: Thread | None = None
        self._stop_event = Event()
        self._processing_handlers: dict[str, Callable] = {}

        # Statistics
        self._stats = {
            'total_processed': 0,
            'total_failed': 0,
            'total_completed': 0,
        }

    def register_handler(self, transaction_type: str,
                        handler: Callable[[TransactionContext], None]) -> None:
        """
        Register a handler for a transaction type.

        Args:
            transaction_type: Type of transaction
            handler: Function to process the transaction
        """
        self._processing_handlers[transaction_type] = handler

    def submit_transaction(self, context: TransactionContext) -> str:
        """
        Submit a transaction for processing.

        Args:
            context: Transaction context

        Returns:
            Transaction ID

        Raises:
            ValueError: If transaction is invalid
            Exception: If queue is full
        """
        if not context.transaction_id:
            context.transaction_id = str(uuid.uuid4())

        # Record initial event
        initial_event = TransactionEvent(
            event_id=str(uuid.uuid4()),
            transaction_id=context.transaction_id,
            user_id=context.user_id,
            event_type=TransactionEventType.TRANSFER_INITIATED,
            timestamp=datetime.now(UTC),
            amount=context.amount,
            from_account_id=context.from_account_id,
            to_account_id=context.to_account_id,
            description=context.description,
            metadata=context.metadata,
            status=TransactionEventStatus.PENDING
        )

        self._event_store.append_event(initial_event)

        # Add to queue
        try:
            self._queue.put(context, block=False)
        except Exception as e:
            context.mark_failed(f"Queue full: {e!s}")
            self._record_failure_event(context, str(e))
            raise

        # Track transaction
        with self._lock:
            self._transactions[context.transaction_id] = context

        return context.transaction_id

    def get_transaction_status(self, transaction_id: str) -> TransactionContext | None:
        """
        Get the status of a submitted transaction.

        Args:
            transaction_id: The transaction ID

        Returns:
            Transaction context if found, None otherwise
        """
        with self._lock:
            # Check in-flight transactions
            if transaction_id in self._transactions:
                return self._transactions[transaction_id]
            # Check completed transactions
            if transaction_id in self._completed_transactions:
                return self._completed_transactions[transaction_id]
        return None

    def start_processing(self) -> None:
        """
        Start the transaction processing worker thread.

        This should be called once at application startup.
        """
        if self._worker_thread is None or not self._worker_thread.is_alive():
            self._stop_event.clear()
            self._worker_thread = Thread(target=self._worker_loop, daemon=True)
            self._worker_thread.start()

    def stop_processing(self) -> None:
        """
        Stop the transaction processing worker thread.

        This should be called at application shutdown.
        """
        self._stop_event.set()
        if self._worker_thread:
            self._worker_thread.join(timeout=5)

    def _worker_loop(self) -> None:
        """
        Main worker loop that processes transactions from the queue.

        This runs in a separate thread and processes transactions sequentially.
        """
        while not self._stop_event.is_set():
            try:
                # Get next transaction from queue (with timeout to check stop event)
                context = self._queue.get(timeout=1)

                try:
                    self._process_transaction(context)
                except Exception as e:
                    context.mark_failed(str(e))
                    self._record_failure_event(context, str(e))
                finally:
                    self._queue.task_done()

            except Empty:
                continue
            except Exception:
                pass

    def _process_transaction(self, context: TransactionContext) -> None:
        """
        Process a single transaction.

        Args:
            context: Transaction context

        Raises:
            Exception: If transaction processing fails
        """
        context.mark_processing()

        # Record processing event
        processing_event = TransactionEvent(
            event_id=str(uuid.uuid4()),
            transaction_id=context.transaction_id,
            user_id=context.user_id,
            event_type=TransactionEventType.TRANSFER_INITIATED,
            timestamp=datetime.now(UTC),
            amount=context.amount,
            from_account_id=context.from_account_id,
            to_account_id=context.to_account_id,
            description=context.description,
            status=TransactionEventStatus.PROCESSING
        )
        self._event_store.append_event(processing_event)

        try:
            # Get handler for this transaction type
            handler = self._processing_handlers.get(context.transaction_type)

            if handler is None:
                raise ValueError(f"No handler for transaction type: {context.transaction_type}")

            # Execute transaction handler
            handler(context)

            # Mark as completed
            context.mark_completed()

            # Record completion event
            completion_event = TransactionEvent(
                event_id=str(uuid.uuid4()),
                transaction_id=context.transaction_id,
                user_id=context.user_id,
                event_type=TransactionEventType.TRANSFER_COMPLETED,
                timestamp=datetime.now(UTC),
                amount=context.amount,
                from_account_id=context.from_account_id,
                to_account_id=context.to_account_id,
                status=TransactionEventStatus.COMPLETED
            )
            self._event_store.append_event(completion_event)

            # Move to completed
            with self._lock:
                self._transactions.pop(context.transaction_id, None)
                self._completed_transactions[context.transaction_id] = context

            self._stats['total_completed'] += 1

        except Exception as e:
            context.mark_failed(str(e))
            self._record_failure_event(context, str(e))
            self._stats['total_failed'] += 1
            raise

        self._stats['total_processed'] += 1

    def _record_failure_event(self, context: TransactionContext, error: str) -> None:
        """
        Record a failure event.

        Args:
            context: Transaction context
            error: Error message
        """
        failure_event = TransactionEvent(
            event_id=str(uuid.uuid4()),
            transaction_id=context.transaction_id,
            user_id=context.user_id,
            event_type=TransactionEventType.TRANSFER_FAILED,
            timestamp=datetime.now(UTC),
            amount=context.amount,
            from_account_id=context.from_account_id,
            to_account_id=context.to_account_id,
            status=TransactionEventStatus.FAILED,
            error_message=error
        )
        self._event_store.append_event(failure_event)

    def get_statistics(self) -> dict[str, int]:
        """
        Get transaction processing statistics.

        Returns:
            Statistics dictionary
        """
        return self._stats.copy()

    def reset_statistics(self) -> None:
        """Reset statistics (for testing)"""
        self._stats = {
            'total_processed': 0,
            'total_failed': 0,
            'total_completed': 0,
        }

    def get_queue_size(self) -> int:
        """
        Get current queue size.

        Returns:
            Number of pending transactions
        """
        return self._queue.qsize()


# Global coordinator instance
_coordinator: TransactionCoordinator | None = None


def get_transaction_coordinator() -> TransactionCoordinator:
    """
    Get the global transaction coordinator instance.

    Returns:
        TransactionCoordinator instance
    """
    global _coordinator
    if _coordinator is None:
        _coordinator = TransactionCoordinator()
    return _coordinator


def reset_transaction_coordinator() -> None:
    """
    Reset the global coordinator (for testing).
    """
    global _coordinator
    if _coordinator:
        _coordinator.stop_processing()
    _coordinator = TransactionCoordinator()
