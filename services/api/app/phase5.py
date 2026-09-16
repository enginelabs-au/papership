"""Phase 5 catalogue shells, canonical references, and usage envelopes."""

from __future__ import annotations

from typing import Any

from app.store import Store, StoreError, _id, _now
from app.usage import emit_usage, validate_usage_event

R3_SHELLS = (
    {"id": "B04", "label": "Customers and CRM", "status": "planned", "needs_connection": True},
    {"id": "B05", "label": "Sales and commercial scope", "status": "planned", "needs_connection": True},
    {"id": "B09", "label": "Service delivery and operations", "status": "planned", "needs_connection": True},
    {"id": "B10", "label": "Customer support and success", "status": "planned", "needs_connection": True},
    {"id": "B13", "label": "Finance and accounting", "status": "planned", "needs_connection": True},
    {"id": "B15", "label": "Procurement and vendors", "status": "planned", "needs_connection": True},
    {"id": "B16", "label": "Marketing and content", "status": "planned", "needs_connection": True},
    {"id": "B17", "label": "Legal and risk", "status": "planned", "needs_connection": True},
    {"id": "B18", "label": "IT and internal systems", "status": "planned", "needs_connection": True},
    {"id": "B22", "label": "Research and innovation", "status": "planned", "needs_connection": True},
)

CANONICAL_REFERENCES = {
    "currency": "AUD",
    "calendar": "en-AU",
    "timezone": "Australia/Sydney",
    "status_labels": ["planned", "configured", "working", "unavailable"],
    "kpi_default": "not_captured",
    "metrics": [],
}


def domain_catalogue(registry_items: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Full B01–B24 + P01–P19 catalogue. Live connector write stays refused."""
    from app.managed_projects import full_domain_catalogue

    if registry_items is not None:
        return full_domain_catalogue(registry_items)
    # Legacy shell-only view used by older call sites; prefer store-backed path.
    return [
        {
            **row,
            "live_write": False,
            "handoff": "Needs a later connection. Live write is refused.",
        }
        for row in R3_SHELLS
    ]


def refuse_domain_connect(domain_id: str) -> None:
    from app.managed_projects import ALL_DOMAIN_IDS
    from app.phase7 import known_shell_ids

    ids = set(ALL_DOMAIN_IDS) | {row["id"] for row in R3_SHELLS} | known_shell_ids()
    if domain_id not in ids:
        raise StoreError("unknown domain", 403)
    raise StoreError("live write refused: domain is a planned catalogue shell", 403)


def list_strategy(store: Store, principal_id: str) -> list[dict[str, Any]]:
    if not store.has_grant(principal_id, "ledger.read") and not store.has_grant(principal_id, "org.admin"):
        raise StoreError("denied: strategy", 403)
    p = store.principal(principal_id)
    rows = store.conn.execute(
        "SELECT * FROM strategy_records WHERE tenant_id=? AND archived_at IS NULL ORDER BY created_at DESC",
        (p["tenant_id"],),
    ).fetchall()
    return [store.row_to_dict(r) for r in rows]  # type: ignore[misc]


def create_strategy(store: Store, principal_id: str, body: dict[str, Any]) -> dict[str, Any]:
    if not store.has_grant(principal_id, "ledger.write") and not store.has_grant(principal_id, "org.admin"):
        raise StoreError("denied: strategy write", 403)
    kind = str(body.get("kind") or "")
    if kind not in {"goal", "initiative", "decision", "risk_appetite"}:
        raise StoreError("unknown strategy kind", 400)
    p = store.principal(principal_id)
    sid = _id("strat")
    store.conn.execute(
        """INSERT INTO strategy_records
           (id, tenant_id, kind, title, body, kpi_status, source_bound, created_at, archived_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            sid,
            p["tenant_id"],
            kind,
            str(body.get("title") or kind),
            str(body.get("body") or ""),
            "not_captured",
            0,
            _now(),
            None,
        ),
    )
    store.append_audit(principal_id, "strategy.create", "strategy", sid)
    store.flush()
    return store.row_to_dict(store.conn.execute("SELECT * FROM strategy_records WHERE id=?", (sid,)).fetchone())  # type: ignore[return-value]


def upsert_capacity(store: Store, actor_id: str, member_id: str, body: dict[str, Any]) -> dict[str, Any]:
    if not store.has_grant(actor_id, "org.admin") and not store.has_grant(actor_id, "ledger.write"):
        raise StoreError("denied: capacity", 403)
    p = store.principal(actor_id)
    store.principal(member_id)
    store.conn.execute(
        """INSERT INTO member_capacity (principal_id, tenant_id, availability, workload, leave_reference, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(principal_id) DO UPDATE SET
             availability=excluded.availability, workload=excluded.workload,
             leave_reference=excluded.leave_reference, updated_at=excluded.updated_at""",
        (
            member_id,
            p["tenant_id"],
            str(body.get("availability") or "unknown"),
            str(body.get("workload") or "unknown"),
            str(body.get("leave_reference") or ""),
            _now(),
        ),
    )
    store.append_audit(actor_id, "capacity.upsert", "principal", member_id)
    store.flush()
    return capacity_for(store, member_id)


def capacity_for(store: Store, member_id: str) -> dict[str, Any]:
    row = store.conn.execute("SELECT * FROM member_capacity WHERE principal_id=?", (member_id,)).fetchone()
    if not row:
        return {
            "principal_id": member_id,
            "availability": "unknown",
            "workload": "unknown",
            "leave_reference": "",
            "hr_connector": "planned",
        }
    data = store.row_to_dict(row)
    data["hr_connector"] = "planned"
    return data  # type: ignore[return-value]


def list_schedules(store: Store, principal_id: str) -> list[dict[str, Any]]:
    p = store.principal(principal_id)
    rows = store.conn.execute(
        "SELECT * FROM schedules WHERE tenant_id=? ORDER BY created_at DESC",
        (p["tenant_id"],),
    ).fetchall()
    return [store.row_to_dict(r) for r in rows]  # type: ignore[misc]


def create_schedule(store: Store, principal_id: str, body: dict[str, Any]) -> dict[str, Any]:
    if not store.has_grant(principal_id, "org.admin") and not store.has_grant(principal_id, "run.start"):
        raise StoreError("denied: schedule", 403)
    p = store.principal(principal_id)
    sid = _id("sched")
    store.conn.execute(
        """INSERT INTO schedules (id, tenant_id, mode, cadence, definition, fire_external, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            sid,
            p["tenant_id"],
            "Automate",
            str(body.get("cadence") or "manual"),
            str(body.get("definition") or "configured"),
            0,
            _now(),
        ),
    )
    store.append_audit(principal_id, "schedule.create", "schedule", sid)
    store.flush()
    return store.row_to_dict(store.conn.execute("SELECT * FROM schedules WHERE id=?", (sid,)).fetchone())  # type: ignore[return-value]


def usage_envelope(event_name: str, tenant_id: str, principal_id: str, outcome: str) -> dict[str, Any]:
    payload = {
        "event_name": event_name,
        "event_id": _id("use"),
        "occurred_at": _now(),
        "tenant_id": tenant_id,
        "member_pseudonymous_id": principal_id,
        "run_id": "none",
        "mode": "none",
        "model_band": "none",
        "tokens_input": 0,
        "tokens_output": 0,
        "tokens_cached": 0,
        "tool_call_counts_by_class": {},
        "duration_ms": 0,
        "estimated_cost_band": "none",
        "outcome_code": outcome,
        "schema_version": "1",
    }
    validate_usage_event(payload)
    return payload


def maybe_emit(store: Store, enabled: bool, event_name: str, tenant_id: str, principal_id: str, outcome: str) -> None:
    emit_usage(store, enabled, usage_envelope(event_name, tenant_id, principal_id, outcome))
