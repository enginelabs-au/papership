"""B12 connector catalogue. Deny-by-default. No secrets in this module."""

from __future__ import annotations

from typing import Any

# Destination class is recorded before enablement (DRR-04, LIC-20).
CONNECTORS: dict[str, dict[str, Any]] = {
    "github": {
        "id": "github",
        "label": "GitHub",
        "kind": "Bound repository",
        "destination_class": "source_control",
        "status": "configured",
        "actions": {"read": True, "write": "dry_run_or_approval", "send": False},
        "handoff": "Authorise the GitHub App in the browser. Papership never embeds a provider sign-in.",
    },
    "gmail": {
        "id": "gmail",
        "label": "Gmail",
        "kind": "Comms channel",
        "destination_class": "mailbox",
        "status": "planned",
        "actions": {"read": "dry_run", "draft": "dry_run", "send": "approval_then_receipt"},
        "handoff": "Continue in Google’s browser after the client ID and secret are on the API host. Send stays approval-bound.",
    },
    "slack": {
        "id": "slack",
        "label": "Slack",
        "kind": "Comms channel",
        "destination_class": "chat",
        "status": "planned",
        "actions": {"read": "dry_run", "send": "approval_then_receipt"},
        "handoff": "Continue in Slack’s browser after the client ID and secret are on the API host. Messages stay approval-bound.",
    },
    "telegram": {
        "id": "telegram",
        "label": "Telegram",
        "kind": "Comms channel",
        "destination_class": "chat",
        "status": "planned",
        "actions": {"read": "webhook", "send": "approval_then_receipt"},
        "handoff": "Add TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET on the API host, then press Connect. Inbound lands in Inbox. Send needs an approval, then returns a receipt.",
    },
    "whatsapp": {
        "id": "whatsapp",
        "label": "WhatsApp",
        "kind": "Comms channel",
        "destination_class": "chat",
        "status": "planned",
        "actions": {"read": "webhook", "send": "approval_then_receipt"},
        "handoff": "Add WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET on the API host, then press Connect. Send needs an approval, then returns a receipt. Alternative (send-only): set WHATSAPP_BRIDGE_URL to the Hermes bridge on loopback.",
    },
}


def list_connectors() -> list[dict[str, Any]]:
    return [dict(row) for row in CONNECTORS.values()]


def get_connector(provider: str) -> dict[str, Any] | None:
    return CONNECTORS.get((provider or "").strip().lower())
