"""Notification Configuration for Data Quality"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class NotificationChannel(StrEnum):
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"
    PAGERDUTY = "pagerduty"


class NotificationSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class NotificationTrigger(StrEnum):
    THRESHOLD_BREACH = "threshold_breach"
    VALIDATION_FAILURE = "validation_failure"
    ANOMALY_DETECTED = "anomaly_detected"
    SCHEMA_DRIFT = "schema_drift"
    PIPELINE_FAILURE = "pipeline_failure"
    SLA_VIOLATION = "sla_violation"
    RECONCILIATION_BREAK = "reconciliation_break"


@dataclass
class ChannelConfig:
    channel: NotificationChannel
    is_enabled: bool
    config: dict[str, Any]
    min_severity: NotificationSeverity = NotificationSeverity.MEDIUM


@dataclass
class NotificationRule:
    rule_name: str
    triggers: list[NotificationTrigger]
    channels: list[NotificationChannel]
    min_severity: NotificationSeverity
    recipients: list[str]
    cooldown_minutes: int = 60
    is_active: bool = True


class NotificationConfig:
    def __init__(self):
        self._channels: dict[NotificationChannel, ChannelConfig] = {}
        self._rules: dict[str, NotificationRule] = {}
        self._default_recipients: list[str] = []
        self._global_cooldown = 30

        self._severity_escalation = {
            NotificationSeverity.CRITICAL: [
                NotificationChannel.PAGERDUTY,
                NotificationChannel.SMS,
                NotificationChannel.EMAIL,
            ],
            NotificationSeverity.HIGH: [
                NotificationChannel.SLACK,
                NotificationChannel.EMAIL,
            ],
            NotificationSeverity.MEDIUM: [
                NotificationChannel.EMAIL,
            ],
            NotificationSeverity.LOW: [
                NotificationChannel.EMAIL,
            ],
            NotificationSeverity.INFO: [],
        }

    def configure_channel(
        self,
        channel: NotificationChannel,
        config: dict[str, Any],
        is_enabled: bool = True,
        min_severity: NotificationSeverity = NotificationSeverity.MEDIUM,
    ) -> None:
        self._channels[channel] = ChannelConfig(
            channel=channel,
            is_enabled=is_enabled,
            config=config,
            min_severity=min_severity,
        )

    def get_channel_config(self, channel: NotificationChannel) -> ChannelConfig | None:
        return self._channels.get(channel)

    def is_channel_enabled(self, channel: NotificationChannel) -> bool:
        channel_config = self._channels.get(channel)
        return channel_config.is_enabled if channel_config else False

    def create_rule(
        self,
        rule_name: str,
        triggers: list[NotificationTrigger],
        channels: list[NotificationChannel],
        min_severity: NotificationSeverity,
        recipients: list[str] | None = None,
        cooldown_minutes: int = 60,
    ) -> NotificationRule:
        rule = NotificationRule(
            rule_name=rule_name,
            triggers=triggers,
            channels=channels,
            min_severity=min_severity,
            recipients=recipients or self._default_recipients,
            cooldown_minutes=cooldown_minutes,
        )
        self._rules[rule_name] = rule
        return rule

    def get_rule(self, rule_name: str) -> NotificationRule | None:
        return self._rules.get(rule_name)

    def get_rules_for_trigger(
        self, trigger: NotificationTrigger, severity: NotificationSeverity
    ) -> list[NotificationRule]:
        matching_rules = []
        severity_order = list(NotificationSeverity)

        for rule in self._rules.values():
            if not rule.is_active:
                continue
            if trigger not in rule.triggers:
                continue
            if severity_order.index(severity) > severity_order.index(rule.min_severity):
                continue
            matching_rules.append(rule)

        return matching_rules

    def set_default_recipients(self, recipients: list[str]) -> None:
        self._default_recipients = recipients

    def get_default_recipients(self) -> list[str]:
        return self._default_recipients.copy()

    def set_global_cooldown(self, minutes: int) -> None:
        self._global_cooldown = minutes

    def get_escalation_channels(
        self, severity: NotificationSeverity
    ) -> list[NotificationChannel]:
        return self._severity_escalation.get(severity, [])

    def toggle_rule(self, rule_name: str, is_active: bool) -> None:
        if rule_name in self._rules:
            self._rules[rule_name].is_active = is_active

    def export_config(self) -> dict[str, Any]:
        return {
            "channels": {
                ch.value: {
                    "enabled": cfg.is_enabled,
                    "min_severity": cfg.min_severity.value,
                }
                for ch, cfg in self._channels.items()
            },
            "rules_count": len(self._rules),
            "active_rules": len([r for r in self._rules.values() if r.is_active]),
            "default_recipients": len(self._default_recipients),
            "global_cooldown": self._global_cooldown,
        }


notification_config = NotificationConfig()
