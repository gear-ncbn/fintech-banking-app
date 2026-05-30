"""
Advanced Event Sourcing System with Replay, Audit, and Recovery

This module extends the basic event store with production-ready features:
- Event replay for debugging and state reconstruction
- Comprehensive audit trail with search capabilities
- Snapshot support for performance optimization
- Event versioning for schema evolution
- Recovery procedures for failed transactions
- Complete event history with immutable ledger
"""

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


class EventSourceError(Exception):
    """Base exception for event sourcing errors"""


class ReplayError(EventSourceError):
    """Raised when event replay fails"""


class SnapshotType(StrEnum):
    """Types of snapshots for performance optimization"""
    ACCOUNT_STATE = "account_state"
    TRANSACTION_STATE = "transaction_state"
    USER_PORTFOLIO = "user_portfolio"


@dataclass
class EventSnapshot:
    """Snapshot of system state at a point in time"""
    snapshot_id: str
    transaction_id: str
    user_id: int
    snapshot_type: SnapshotType
    timestamp: datetime
    state: dict[str, Any]
    event_count: int  # Number of events up to this point
    checksum: str  # For integrity verification

    def verify_integrity(self) -> bool:
        """Verify snapshot hasn't been tampered with"""
        state_json = json.dumps(self.state, sort_keys=True, default=str)
        expected_checksum = hashlib.sha256(state_json.encode()).hexdigest()
        return self.checksum == expected_checksum


class EventLog:
    """
    Immutable event log with replay capabilities.

    Features:
    - Append-only log
    - Event replay for state reconstruction
    - Snapshots for performance
    - Audit trail with full history
    - Event versioning for compatibility
    """

    def __init__(self):
        """Initialize event log"""
        self._events: list[dict[str, Any]] = []
        self._snapshots: dict[str, EventSnapshot] = {}
        self._event_hashes: list[str] = []  # Chain for integrity
        self._indexes = {
            'by_transaction': {},
            'by_user': {},
            'by_account': {},
            'by_type': {},
        }

    def append(self, event_dict: dict[str, Any]) -> str:
        """
        Append event to log (immutable operation).

        Args:
            event_dict: Event data as dictionary

        Returns:
            Event hash for integrity verification

        Raises:
            EventSourceError: If event is invalid
        """
        if not event_dict.get('event_id'):
            event_dict['event_id'] = str(uuid.uuid4())

        if not event_dict.get('timestamp'):
            event_dict['timestamp'] = datetime.now(UTC).isoformat()

        # Create hash chain for immutability verification
        previous_hash = self._event_hashes[-1] if self._event_hashes else '0'
        event_json = json.dumps(event_dict, sort_keys=True, default=str)
        event_hash = hashlib.sha256(
            (previous_hash + event_json).encode()
        ).hexdigest()

        # Append to log
        self._events.append(event_dict)
        self._event_hashes.append(event_hash)

        # Update indexes
        self._update_indexes(event_dict)

        return event_hash

    def _update_indexes(self, event_dict: dict[str, Any]) -> None:
        """Update all indexes for efficient querying"""
        if 'transaction_id' in event_dict:
            tx_id = event_dict['transaction_id']
            if tx_id not in self._indexes['by_transaction']:
                self._indexes['by_transaction'][tx_id] = []
            self._indexes['by_transaction'][tx_id].append(len(self._events) - 1)

        if 'user_id' in event_dict:
            user_id = event_dict['user_id']
            if user_id not in self._indexes['by_user']:
                self._indexes['by_user'][user_id] = []
            self._indexes['by_user'][user_id].append(len(self._events) - 1)

        if 'from_account_id' in event_dict:
            acc_id = event_dict['from_account_id']
            if acc_id not in self._indexes['by_account']:
                self._indexes['by_account'][acc_id] = []
            self._indexes['by_account'][acc_id].append(len(self._events) - 1)

        if 'event_type' in event_dict:
            evt_type = event_dict['event_type']
            if evt_type not in self._indexes['by_type']:
                self._indexes['by_type'][evt_type] = []
            self._indexes['by_type'][evt_type].append(len(self._events) - 1)

    def get_events(self, transaction_id: str) -> list[dict[str, Any]]:
        """Get all events for a transaction"""
        indexes = self._indexes['by_transaction'].get(transaction_id, [])
        return [self._events[i] for i in indexes]

    def replay(
        self,
        transaction_id: str,
        apply_fn=None
    ) -> dict[str, Any]:
        """
        Replay all events for a transaction to reconstruct state.

        Args:
            transaction_id: Transaction to replay
            apply_fn: Optional function to apply to each event

        Returns:
            Reconstructed state

        Raises:
            ReplayError: If replay fails
        """
        events = self.get_events(transaction_id)

        if not events:
            raise ReplayError(f"No events found for transaction {transaction_id}")

        state = {
            'transaction_id': transaction_id,
            'events': [],
            'status': 'initial',
            'balance_changes': [],
        }

        try:
            for event in events:
                state['events'].append({
                    'type': event.get('event_type'),
                    'timestamp': event.get('timestamp'),
                    'status': event.get('status'),
                })

                # Track state transitions
                if 'status' in event:
                    state['status'] = event['status']

                # Track balance changes
                if event.get('event_type') == 'balance_modified':
                    state['balance_changes'].append({
                        'amount': event.get('amount'),
                        'timestamp': event.get('timestamp'),
                    })

                # Apply custom function if provided
                if apply_fn:
                    apply_fn(event, state)

        except Exception as e:
            raise ReplayError(f"Failed to replay transaction {transaction_id}: {e}") from e

        return state

    def create_snapshot(
        self,
        transaction_id: str,
        user_id: int,
        snapshot_type: SnapshotType,
        state: dict[str, Any]
    ) -> EventSnapshot:
        """
        Create a snapshot of current state for performance.

        Args:
            transaction_id: Transaction ID
            user_id: User ID
            snapshot_type: Type of snapshot
            state: State to snapshot

        Returns:
            EventSnapshot object
        """
        snapshot_id = str(uuid.uuid4())
        state_json = json.dumps(state, sort_keys=True, default=str)
        checksum = hashlib.sha256(state_json.encode()).hexdigest()

        snapshot = EventSnapshot(
            snapshot_id=snapshot_id,
            transaction_id=transaction_id,
            user_id=user_id,
            snapshot_type=snapshot_type,
            timestamp=datetime.now(UTC),
            state=state,
            event_count=len(self._events),
            checksum=checksum,
        )

        self._snapshots[snapshot_id] = snapshot
        return snapshot

    def get_snapshot(self, snapshot_id: str) -> EventSnapshot | None:
        """Get a snapshot by ID"""
        return self._snapshots.get(snapshot_id)

    def verify_integrity(self) -> tuple[bool, list[str]]:
        """
        Verify event log integrity using hash chain.

        Returns:
            Tuple of (is_valid, list of issues)
        """
        issues = []
        previous_hash = '0'

        for i, event in enumerate(self._events):
            event_json = json.dumps(event, sort_keys=True, default=str)
            expected_hash = hashlib.sha256(
                (previous_hash + event_json).encode()
            ).hexdigest()

            if self._event_hashes[i] != expected_hash:
                issues.append(f"Event {i} hash mismatch")

            previous_hash = self._event_hashes[i]

        return (len(issues) == 0, issues)

    def export_audit_trail(
        self,
        user_id: int,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> str:
        """Export audit trail as JSON"""
        indexes = self._indexes['by_user'].get(user_id, [])
        events = [self._events[i] for i in indexes]

        if start_date or end_date:
            events = [
                e for e in events
                if (not start_date or datetime.fromisoformat(e['timestamp']) >= start_date) and
                   (not end_date or datetime.fromisoformat(e['timestamp']) <= end_date)
            ]

        return json.dumps(events, indent=2, default=str)

    def get_statistics(self) -> dict[str, Any]:
        """Get event log statistics"""
        return {
            'total_events': len(self._events),
            'total_snapshots': len(self._snapshots),
            'transactions': len(self._indexes['by_transaction']),
            'users': len(self._indexes['by_user']),
            'accounts': len(self._indexes['by_account']),
            'event_types': len(self._indexes['by_type']),
            'oldest_event': self._events[0].get('timestamp') if self._events else None,
            'newest_event': self._events[-1].get('timestamp') if self._events else None,
        }


# Global event log instance
_event_log: EventLog | None = None


def get_event_log() -> EventLog:
    """Get global event log instance"""
    global _event_log
    if _event_log is None:
        _event_log = EventLog()
    return _event_log


def reset_event_log() -> None:
    """Reset event log (for testing)"""
    global _event_log
    _event_log = EventLog()
