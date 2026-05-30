"""
Immutable Event Store for Transaction Management

This module implements an event sourcing pattern for all financial transactions.
Each transaction is recorded as an immutable event before processing.
This provides:
- Complete audit trail
- Ability to replay transactions
- Consistency guarantees
- Debugging and forensics capabilities
"""

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum


class TransactionEventType(StrEnum):
    """Types of transaction events that can occur"""

    # Basic transactions
    TRANSFER_INITIATED = "transfer_initiated"
    TRANSFER_COMPLETED = "transfer_completed"
    TRANSFER_FAILED = "transfer_failed"
    TRANSFER_CANCELLED = "transfer_cancelled"

    # Payments
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REVERSED = "payment_reversed"

    # Investments
    BUY_ORDER_INITIATED = "buy_order_initiated"
    BUY_ORDER_FILLED = "buy_order_filled"
    BUY_ORDER_FAILED = "buy_order_failed"
    SELL_ORDER_INITIATED = "sell_order_initiated"
    SELL_ORDER_FILLED = "sell_order_filled"
    SELL_ORDER_FAILED = "sell_order_failed"

    # Balance operations
    BALANCE_RESERVED = "balance_reserved"
    BALANCE_RELEASED = "balance_released"
    BALANCE_MODIFIED = "balance_modified"

    # Crypto operations
    CRYPTO_SENT = "crypto_sent"
    CRYPTO_RECEIVED = "crypto_received"

    # Goal operations
    GOAL_CONTRIBUTION = "goal_contribution"
    GOAL_WITHDRAWAL = "goal_withdrawal"


class TransactionEventStatus(StrEnum):
    """Status of an event"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TransactionEvent:
    """Immutable representation of a transaction event"""

    # Unique identifiers
    event_id: str  # UUID for this event
    transaction_id: str  # UUID for the overall transaction
    user_id: int  # User performing the transaction

    # Event metadata
    event_type: TransactionEventType
    timestamp: datetime
    amount: Decimal

    # Transaction details (with defaults)
    version: int = 1  # Event format version for backward compatibility
    currency: str = "USD"

    # Accounts involved
    from_account_id: int | None = None
    to_account_id: int | None = None

    # Additional context
    description: str = ""
    metadata: dict = None  # Additional JSON-serializable data

    # Status tracking
    status: TransactionEventStatus = TransactionEventStatus.PENDING
    error_message: str | None = None

    # Reference to related events
    previous_event_id: str | None = None  # For event chaining

    def __post_init__(self):
        """Post-initialization processing"""
        if self.metadata is None:
            self.metadata = {}
        # Convert Decimal to string for JSON serialization
        if isinstance(self.amount, (int, float)):
            self.amount = Decimal(str(self.amount))

    def to_dict(self) -> dict:
        """Convert to dictionary for storage"""
        data = asdict(self)
        # Convert non-JSON-serializable types
        data['event_type'] = self.event_type.value
        data['status'] = self.status.value
        data['amount'] = str(self.amount)
        data['timestamp'] = self.timestamp.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: dict) -> 'TransactionEvent':
        """Create event from dictionary"""
        # Convert types back
        data['event_type'] = TransactionEventType(data['event_type'])
        data['status'] = TransactionEventStatus(data['status'])
        data['amount'] = Decimal(data['amount'])
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)

    def to_json(self) -> str:
        """Serialize to JSON string"""
        return json.dumps(self.to_dict(), default=str)


class EventStore:
    """
    In-memory event store for transaction events.

    In production, this should be backed by a database to ensure durability.
    The current implementation uses in-memory storage for demonstration.

    Features:
    - Append-only log (immutable)
    - Transaction grouping
    - Event replay capabilities
    - Atomicity guarantees
    """

    def __init__(self):
        """Initialize event store"""
        self._events: list[TransactionEvent] = []
        self._transaction_index: dict[str, list[TransactionEvent]] = {}
        self._account_index: dict[int, list[TransactionEvent]] = {}
        self._user_index: dict[int, list[TransactionEvent]] = {}

    def append_event(self, event: TransactionEvent) -> None:
        """
        Append an event to the store (immutable operation).

        This is the only way to add events. Once added, events cannot be modified.

        Args:
            event: The event to append

        Raises:
            ValueError: If event is invalid
        """
        if not isinstance(event, TransactionEvent):
            raise ValueError("Only TransactionEvent instances can be appended")

        # Validate event
        if not event.event_id:
            event.event_id = str(uuid.uuid4())

        # Ensure timestamp is set
        if event.timestamp is None:
            event.timestamp = datetime.now(UTC)

        # Append to main log
        self._events.append(event)

        # Update indices for efficient querying
        if event.transaction_id not in self._transaction_index:
            self._transaction_index[event.transaction_id] = []
        self._transaction_index[event.transaction_id].append(event)

        # Index by account
        if event.from_account_id is not None:
            if event.from_account_id not in self._account_index:
                self._account_index[event.from_account_id] = []
            self._account_index[event.from_account_id].append(event)

        if event.to_account_id is not None:
            if event.to_account_id not in self._account_index:
                self._account_index[event.to_account_id] = []
            self._account_index[event.to_account_id].append(event)

        # Index by user
        if event.user_id not in self._user_index:
            self._user_index[event.user_id] = []
        self._user_index[event.user_id].append(event)

    def get_transaction_events(self, transaction_id: str) -> list[TransactionEvent]:
        """
        Get all events for a specific transaction.

        Args:
            transaction_id: The transaction ID

        Returns:
            List of events in order
        """
        return self._transaction_index.get(transaction_id, [])

    def get_account_events(self, account_id: int,
                          start_time: datetime | None = None,
                          end_time: datetime | None = None) -> list[TransactionEvent]:
        """
        Get all events for an account within a time range.

        Args:
            account_id: The account ID
            start_time: Optional start timestamp
            end_time: Optional end timestamp

        Returns:
            List of events
        """
        events = self._account_index.get(account_id, [])

        if start_time or end_time:
            events = [e for e in events
                     if (not start_time or e.timestamp >= start_time) and
                        (not end_time or e.timestamp <= end_time)]

        return events

    def get_user_events(
        self,
        user_id: int,
        event_type: TransactionEventType | None = None
    ) -> list[TransactionEvent]:
        """
        Get all events for a user.

        Args:
            user_id: The user ID
            event_type: Optional filter by event type

        Returns:
            List of events
        """
        events = self._user_index.get(user_id, [])

        if event_type:
            events = [e for e in events if e.event_type == event_type]

        return events

    def replay_transaction(self, transaction_id: str) -> dict:
        """
        Replay a transaction to verify its current state.

        Args:
            transaction_id: The transaction ID

        Returns:
            Calculated state of the transaction
        """
        events = self.get_transaction_events(transaction_id)

        state = {
            'transaction_id': transaction_id,
            'status': 'unknown',
            'amount': Decimal('0'),
            'events': len(events),
            'timeline': []
        }

        for event in events:
            state['timeline'].append({
                'timestamp': event.timestamp,
                'type': event.event_type.value,
                'status': event.status.value,
                'amount': str(event.amount)
            })

            # Update status based on event type
            if 'completed' in event.event_type.value:
                state['status'] = 'completed'
            elif 'failed' in event.event_type.value:
                state['status'] = 'failed'
            elif 'initiated' in event.event_type.value:
                state['status'] = 'pending'

        return state

    def get_all_events(self) -> list[TransactionEvent]:
        """
        Get all events (for testing and debugging).

        Returns:
            Complete list of events
        """
        return self._events.copy()

    def clear(self) -> None:
        """
        Clear all events (for testing).

        WARNING: This is destructive and should only be used in tests.
        """
        self._events.clear()
        self._transaction_index.clear()
        self._account_index.clear()
        self._user_index.clear()

    def export_for_audit(self, user_id: int) -> str:
        """
        Export all events for a user as JSON for audit purposes.

        Args:
            user_id: The user ID

        Returns:
            JSON string of all user events
        """
        events = self.get_user_events(user_id)
        event_dicts = [e.to_dict() for e in events]
        return json.dumps(event_dicts, indent=2, default=str)


# Global event store instance
_event_store: EventStore | None = None


def get_event_store() -> EventStore:
    """
    Get the global event store instance.

    Returns:
        EventStore instance
    """
    global _event_store
    if _event_store is None:
        _event_store = EventStore()
    return _event_store


def reset_event_store() -> None:
    """
    Reset the global event store (for testing).
    """
    global _event_store
    _event_store = EventStore()
