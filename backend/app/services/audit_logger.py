"""
Comprehensive audit logging system for banking operations.
Tracks all financial activities, security events, and user actions for compliance.
"""
import json
import time
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from fastapi import Request


class AuditEventType(StrEnum):
    """Types of audit events for categorization."""
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    MFA_VERIFICATION = "mfa_verification"

    # Account Operations
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_UPDATED = "account_updated"
    ACCOUNT_DELETED = "account_deleted"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"

    # Financial Transactions
    TRANSACTION_CREATED = "transaction_created"
    TRANSACTION_UPDATED = "transaction_updated"
    TRANSACTION_DELETED = "transaction_deleted"
    TRANSFER_INITIATED = "transfer_initiated"
    TRANSFER_COMPLETED = "transfer_completed"
    TRANSFER_FAILED = "transfer_failed"

    # Payment Operations
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_METHOD_ADDED = "payment_method_added"
    PAYMENT_METHOD_DELETED = "payment_method_deleted"

    # Security Events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    INVALID_ACCESS_ATTEMPT = "invalid_access_attempt"
    PERMISSION_DENIED = "permission_denied"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"

    # Administrative Actions
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    ROLE_CHANGED = "role_changed"
    SETTINGS_CHANGED = "settings_changed"

    # Data Access
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"
    REPORT_GENERATED = "report_generated"
    SENSITIVE_DATA_ACCESSED = "sensitive_data_accessed"


class AuditSeverity(StrEnum):
    """Severity levels for audit events."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditLogger:
    """Comprehensive audit logging system for financial compliance."""

    def __init__(self):
        # In production, this should write to a secure, tamper-proof database
        self.audit_logs: list[dict[str, Any]] = []
        self.max_logs = 10000  # Rotate logs after this many entries

        # Define severity mappings
        self.event_severity_map = {
            # Critical security events
            AuditEventType.LOGIN_FAILURE: AuditSeverity.HIGH,
            AuditEventType.SUSPICIOUS_ACTIVITY: AuditSeverity.CRITICAL,
            AuditEventType.DATA_BREACH_ATTEMPT: AuditSeverity.CRITICAL,
            AuditEventType.INVALID_ACCESS_ATTEMPT: AuditSeverity.HIGH,
            AuditEventType.PERMISSION_DENIED: AuditSeverity.MEDIUM,

            # Financial operations
            AuditEventType.TRANSFER_INITIATED: AuditSeverity.HIGH,
            AuditEventType.PAYMENT_INITIATED: AuditSeverity.HIGH,
            AuditEventType.TRANSACTION_CREATED: AuditSeverity.MEDIUM,

            # Default severity
            "default": AuditSeverity.LOW
        }

    def _get_client_info(self, request: Request | None = None) -> dict[str, Any]:
        """Extract client information from request."""
        if not request:
            return {
                "ip_address": "unknown",
                "user_agent": "unknown",
                "referer": None,
                "x_forwarded_for": None
            }

        headers = request.headers
        return {
            "ip_address": str(request.client.host) if request.client else "unknown",
            "user_agent": headers.get("user-agent", "unknown"),
            "referer": headers.get("referer"),
            "x_forwarded_for": headers.get("x-forwarded-for"),
            "x_real_ip": headers.get("x-real-ip"),
            "accept_language": headers.get("accept-language"),
            "host": headers.get("host")
        }

    def _sanitize_sensitive_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """Remove or mask sensitive data from audit logs."""
        sensitive_fields = {
            "password", "password_hash", "secret", "token", "ssn", "tax_id",
            "account_number", "routing_number", "card_number", "cvv", "pin"
        }

        sanitized = {}
        for key, value in data.items():
            if key.lower() in sensitive_fields:
                if key.lower() in ["account_number", "card_number"]:
                    # Mask account/card numbers, show only last 4 digits
                    sanitized[key] = f"****{str(value)[-4:]}" if len(str(value)) >= 4 else "****"
                else:
                    sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_sensitive_data(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_sensitive_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value

        return sanitized

    def log_event(
        self,
        event_type: AuditEventType,
        user_id: int | None = None,
        session_id: str | None = None,
        request: Request | None = None,
        details: dict[str, Any] | None = None,
        severity: AuditSeverity | None = None,
        amount: float | None = None,
        account_id: int | None = None,
        target_user_id: int | None = None,
        success: bool = True,
        error_message: str | None = None
    ) -> str:
        """Log an audit event with comprehensive details."""

        # Generate unique audit ID
        audit_id = f"{int(time.time() * 1000000)}-{len(self.audit_logs)}"

        # Determine severity
        if not severity:
            severity = self.event_severity_map.get(event_type, AuditSeverity.LOW)

        # Prepare audit entry
        audit_entry = {
            "audit_id": audit_id,
            "timestamp": datetime.now(UTC).isoformat(),
            "event_type": event_type.value,
            "severity": severity.value,
            "success": success,
            "user_id": user_id,
            "session_id": session_id,
            "target_user_id": target_user_id,
            "account_id": account_id,
            "amount": amount,
            "error_message": error_message,
            "client_info": self._get_client_info(request),
            "details": self._sanitize_sensitive_data(details or {}),
            "created_at": time.time()
        }

        # Add to audit log
        self.audit_logs.append(audit_entry)

        # Rotate logs if needed
        if len(self.audit_logs) > self.max_logs:
            # In production, archive old logs to long-term storage
            self.audit_logs = self.audit_logs[-self.max_logs // 2:]

        # For critical events, trigger immediate alerts
        if severity == AuditSeverity.CRITICAL:
            self._trigger_security_alert(audit_entry)

        return audit_id

    def _trigger_security_alert(self, audit_entry: dict[str, Any]):
        """Trigger immediate security alert for critical events."""
        # In production, this would send alerts to security team

    def log_financial_transaction(
        self,
        user_id: int,
        transaction_type: str,
        amount: float,
        account_id: int,
        request: Request | None = None,
        details: dict[str, Any] | None = None
    ) -> str:
        """Log financial transaction with enhanced details."""
        return self.log_event(
            event_type=AuditEventType.TRANSACTION_CREATED,
            user_id=user_id,
            account_id=account_id,
            amount=amount,
            request=request,
            details={
                "transaction_type": transaction_type,
                **(details or {})
            },
            severity=AuditSeverity.HIGH if amount > 10000 else AuditSeverity.MEDIUM
        )

    def log_transfer(
        self,
        user_id: int,
        from_account_id: int,
        to_account_id: int,
        amount: float,
        request: Request | None = None,
        success: bool = True,
        error_message: str | None = None
    ) -> str:
        """Log money transfer operations."""
        event_type = AuditEventType.TRANSFER_COMPLETED if success else AuditEventType.TRANSFER_FAILED

        return self.log_event(
            event_type=event_type,
            user_id=user_id,
            account_id=from_account_id,
            amount=amount,
            request=request,
            success=success,
            error_message=error_message,
            details={
                "from_account_id": from_account_id,
                "to_account_id": to_account_id,
                "transfer_type": "internal"
            },
            severity=AuditSeverity.HIGH
        )

    def log_authentication(
        self,
        event_type: AuditEventType,
        user_id: int | None = None,
        username: str | None = None,
        request: Request | None = None,
        success: bool = True,
        failure_reason: str | None = None,
        mfa_used: bool = False
    ) -> str:
        """Log authentication events."""
        return self.log_event(
            event_type=event_type,
            user_id=user_id,
            request=request,
            success=success,
            error_message=failure_reason,
            details={
                "username": username,
                "mfa_used": mfa_used,
                "authentication_method": "password" + ("+mfa" if mfa_used else "")
            },
            severity=AuditSeverity.HIGH if not success else AuditSeverity.MEDIUM
        )

    def log_security_event(
        self,
        event_type: AuditEventType,
        user_id: int | None = None,
        request: Request | None = None,
        details: dict[str, Any] | None = None,
        severity: AuditSeverity = AuditSeverity.HIGH
    ) -> str:
        """Log security-related events."""
        return self.log_event(
            event_type=event_type,
            user_id=user_id,
            request=request,
            details=details,
            severity=severity,
            success=False  # Security events usually indicate problems
        )

    def get_user_audit_trail(
        self,
        user_id: int,
        start_time: float | None = None,
        end_time: float | None = None,
        event_types: list[AuditEventType] | None = None,
        limit: int = 100
    ) -> list[dict[str, Any]]:
        """Get audit trail for a specific user."""
        events = []

        for log_entry in reversed(self.audit_logs):  # Most recent first
            if log_entry["user_id"] != user_id:
                continue

            if start_time and log_entry["created_at"] < start_time:
                continue

            if end_time and log_entry["created_at"] > end_time:
                continue

            if event_types and AuditEventType(log_entry["event_type"]) not in event_types:
                continue

            events.append(log_entry)

            if len(events) >= limit:
                break

        return events

    def get_security_summary(self, hours: int = 24) -> dict[str, Any]:
        """Get security summary for the specified time period."""
        cutoff_time = time.time() - (hours * 3600)

        failed_logins = 0
        suspicious_activities = 0
        rate_limit_hits = 0
        high_value_transactions = 0
        unique_ips = set()

        for log_entry in self.audit_logs:
            if log_entry["created_at"] < cutoff_time:
                continue

            unique_ips.add(log_entry["client_info"]["ip_address"])

            event_type = log_entry["event_type"]
            if event_type == AuditEventType.LOGIN_FAILURE.value:
                failed_logins += 1
            elif event_type == AuditEventType.SUSPICIOUS_ACTIVITY.value:
                suspicious_activities += 1
            elif event_type == AuditEventType.RATE_LIMIT_EXCEEDED.value:
                rate_limit_hits += 1
            elif log_entry.get("amount", 0) > 10000:
                high_value_transactions += 1

        return {
            "time_period_hours": hours,
            "total_events": len([log for log in self.audit_logs if log["created_at"] >= cutoff_time]),
            "failed_logins": failed_logins,
            "suspicious_activities": suspicious_activities,
            "rate_limit_hits": rate_limit_hits,
            "high_value_transactions": high_value_transactions,
            "unique_ips": len(unique_ips),
            "generated_at": datetime.now(UTC).isoformat()
        }

    def export_audit_logs(
        self,
        start_time: float | None = None,
        end_time: float | None = None,
        user_id: int | None = None,
        format: str = "json"
    ) -> str:
        """Export audit logs for compliance reporting."""
        filtered_logs = []

        for log_entry in self.audit_logs:
            if start_time and log_entry["created_at"] < start_time:
                continue
            if end_time and log_entry["created_at"] > end_time:
                continue
            if user_id and log_entry["user_id"] != user_id:
                continue

            filtered_logs.append(log_entry)

        if format.lower() == "json":
            return json.dumps(filtered_logs, indent=2, default=str)
        # In production, support CSV, PDF formats
        raise ValueError(f"Unsupported export format: {format}")


# Global audit logger instance
audit_logger = AuditLogger()
