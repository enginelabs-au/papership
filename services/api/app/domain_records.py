"""Native records for catalogue rows that were still planned.

Live connectors stay unavailable. No invented source balances, messages, or secret values.
"""

from __future__ import annotations

from typing import Any

from app.store import Store, StoreError, _id, _now

MONEY_KEYS = frozenset({"amount", "price", "balance", "total", "cost", "revenue", "margin"})
METRIC_KINDS = frozenset(
    {
        "task_completion",
        "correctness",
        "recovery",
        "operator_intervention",
        "context_switching",
        "cost_per_outcome",
    }
)
METRIC_VALUES = frozenset({"met", "missed", "not_captured"})

# native: stored here. approval: stored as pending, never executed.
# refused: a live source action. source: the missing provider.
SPECS: dict[str, dict[str, Any]] = {
    "B04": {"native": ("contact_draft",), "approval": (), "refused": ("account", "contact", "opportunity", "consent", "opportunity_stage"), "source": "crm"},
    "B05": {"native": ("change_request", "proposal_draft"), "approval": ("signature_request",), "refused": ("enquiry", "contract"), "source": "sales"},
    "B08": {
        "native": ("request", "research", "specification", "plan_note", "assignment", "isolated_change", "test_note", "review", "release_proposal"),
        "approval": (),
        "refused": ("execute_release", "open_pr", "push_change"),
        "source": "github",
    },
    "B09": {"native": ("work_order", "quality_check", "handoff"), "approval": (), "refused": ("sla",), "source": "service_desk"},
    "B10": {"native": ("ticket_draft",), "approval": ("escalate",), "refused": ("reply_send",), "source": "support"},
    "B11": {"native": ("document", "decision", "evidence", "version"), "approval": (), "refused": (), "source": ""},
    "B13": {"native": ("invoice_draft", "expense_claim"), "approval": (), "refused": ("payment", "ledger_balance"), "source": "accounting"},
    "B15": {"native": ("request", "vendor"), "approval": ("purchase",), "refused": (), "source": "procurement"},
    "B16": {"native": ("content_draft", "calendar_item"), "approval": ("publish",), "refused": (), "source": "marketing"},
    "B17": {"native": ("obligation", "acknowledgement", "incident", "privacy_request"), "approval": (), "refused": (), "source": "contract_repository"},
    "B18": {"native": ("access_request",), "approval": (), "refused": ("provision_account",), "source": "it"},
    "B22": {"native": ("experiment", "hypothesis", "evidence"), "approval": (), "refused": (), "source": "experiment_tracker"},
    "P01": {"native": ("agent_profile",), "approval": (), "refused": ("retire_runtime",), "source": ""},
    "P04": {"native": ("run_observation",), "approval": (), "refused": ("hermes_write",), "source": "hermes"},
    "P12": {"native": (), "approval": (), "refused": ("rotate_credential", "reveal_secret"), "source": ""},
    "P14": {"native": tuple(sorted(METRIC_KINDS)), "approval": (), "refused": (), "source": ""},
}

CONFIGURED_EVIDENCE = {
    "B08.01": ("services/api/tests/test_engine_labs_job.py", "EV-EL-B08"),
    "P01.01": ("services/api/tests/test_engine_labs_job.py", "EV-EL-P01"),
    "P04.01": ("services/api/tests/test_engine_labs_job.py", "EV-EL-P04"),
}
for domain_id in SPECS:
    cap = f"{domain_id}.01"
    CONFIGURED_EVIDENCE.setdefault(cap, ("services/api/tests/test_domain_records.py", "EV-DOM-2026-10-13"))


def migrate(store: Store) -> None:
    store.conn.execute(
        """
        CREATE TABLE IF NOT EXISTS domain_records (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          domain_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT NOT NULL,
          source_status TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
        """
    )


def apply_registry(store: Store) -> None:
    now = _now()
    for cap_id, (evidence, status_evidence) in CONFIGURED_EVIDENCE.items():
        row = store.conn.execute("SELECT payload FROM registry WHERE capability_id=?", (cap_id,)).fetchone()
        if not row:
            continue
        import json

        payload = json.loads(row["payload"])
        if payload.get("implementation_status") == "working":
            continue
        payload["implementation_status"] = "configured"
        payload["acceptance_evidence"] = evidence
        payload["status_evidence"] = status_evidence
        payload["status_changed_at"] = now
        payload["registry_version"] = "0.1.7-domain-records"
        store.conn.execute(
            "UPDATE registry SET payload=? WHERE capability_id=?",
            (json.dumps(payload), cap_id),
        )


def _can_read(store: Store, principal_id: str, domain_id: str) -> None:
    if domain_id == "P12":
        if not store.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: boundary inventory", 403)
        return
    allowed = ("ledger.read", "org.admin", "memory.read", "usage.read")
    if not any(store.has_grant(principal_id, grant) for grant in allowed):
        raise StoreError("denied: domain records", 403)


def _can_write(store: Store, principal_id: str) -> None:
    if not store.has_grant(principal_id, "ledger.write") and not store.has_grant(principal_id, "org.admin"):
        raise StoreError("denied: domain record write", 403)


def _reject_money(body: dict[str, Any]) -> None:
    found = MONEY_KEYS.intersection(body)
    if found:
        raise StoreError("amounts stay not_captured until a source system is connected", 422)


def boundary_inventory() -> dict[str, Any]:
    return {
        "domain_id": "P12",
        "credentials_on_desktop": False,
        "secret_values_returned": False,
        "credential_names": ["ENGINE_STORE_PATH", "HERMES_API_SERVER_KEY"],
        "live_rotation": "unavailable",
        "source_status": "unavailable",
        "live_write": False,
    }


def list_records(store: Store, principal_id: str, domain_id: str) -> dict[str, Any]:
    spec = SPECS.get(domain_id)
    if spec is None:
        raise StoreError("unknown domain", 404)
    _can_read(store, principal_id, domain_id)
    principal = store.principal(principal_id)
    rows = store.conn.execute(
        """SELECT * FROM domain_records
           WHERE tenant_id=? AND domain_id=? ORDER BY created_at DESC""",
        (principal["tenant_id"], domain_id),
    ).fetchall()
    payload: dict[str, Any] = {
        "domain_id": domain_id,
        "items": [store.row_to_dict(row) for row in rows],
        "native_kinds": list(spec["native"]),
        "source": spec["source"] or None,
        "source_status": "unavailable" if spec["source"] else "native",
        "live_write": False,
        "balances": "not_captured",
    }
    if domain_id == "P12":
        payload["boundary"] = boundary_inventory()
    if domain_id == "P04":
        payload["execution"] = "Engine Labs loop jobs. Hermes write stays unauthorized."
    return payload


def list_all(store: Store, principal_id: str) -> dict[str, Any]:
    _can_read(store, principal_id, "B11")
    principal = store.principal(principal_id)
    rows = store.conn.execute(
        "SELECT * FROM domain_records WHERE tenant_id=? ORDER BY created_at DESC",
        (principal["tenant_id"],),
    ).fetchall()
    return {
        "items": [store.row_to_dict(row) for row in rows],
        "live_write": False,
        "source_status": "unavailable",
    }


def create_record(store: Store, principal_id: str, domain_id: str, body: dict[str, Any]) -> dict[str, Any]:
    spec = SPECS.get(domain_id)
    if spec is None:
        raise StoreError("unknown domain", 404)
    if domain_id == "P12":
        raise StoreError("secret values are not stored on this record", 403)
    _can_write(store, principal_id)
    _reject_money(body)
    kind = str(body.get("kind") or "")
    if kind in spec["refused"]:
        source = spec["source"] or "source"
        raise StoreError(f"live {source} write is unavailable", 403)
    if kind in spec["approval"]:
        status = "pending_approval"
    elif kind in spec["native"]:
        status = "recorded"
    else:
        raise StoreError("unknown record kind", 400)
    title = str(body.get("title") or "").strip()
    detail = str(body.get("body") or "").strip()
    if domain_id == "P14" and detail not in METRIC_VALUES:
        raise StoreError("metric value must be met, missed, or not_captured", 422)
    if domain_id == "P01" and detail not in {"active", "paused", ""}:
        raise StoreError("agent profile status must be active or paused", 422)
    if not title:
        raise StoreError("title is required", 400)
    principal = store.principal(principal_id)
    record_id = _id("dom")
    source_status = "pending_approval" if status == "pending_approval" else "native"
    store.conn.execute(
        """INSERT INTO domain_records
           (id, tenant_id, domain_id, kind, title, body, status, source_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (record_id, principal["tenant_id"], domain_id, kind, title, detail, status, source_status, _now()),
    )
    store.append_audit(principal_id, "domain_record.create", domain_id, record_id)
    store.flush()
    row = store.conn.execute("SELECT * FROM domain_records WHERE id=?", (record_id,)).fetchone()
    return store.row_to_dict(row)  # type: ignore[return-value]


def search_knowledge(store: Store, principal_id: str, query: str) -> dict[str, Any]:
    _can_read(store, principal_id, "B11")
    principal = store.principal(principal_id)
    needle = f"%{query.strip()}%"
    if not query.strip():
        return {"items": [], "query": ""}
    memory = store.conn.execute(
        """SELECT id, title, content_class FROM memory_items
           WHERE tenant_id=? AND deleted_at IS NULL AND (title LIKE ? OR content LIKE ?)
           ORDER BY created_at DESC LIMIT 20""",
        (principal["tenant_id"], needle, needle),
    ).fetchall()
    records = store.conn.execute(
        """SELECT id, domain_id, kind, title FROM domain_records
           WHERE tenant_id=? AND (title LIKE ? OR body LIKE ?)
           ORDER BY created_at DESC LIMIT 20""",
        (principal["tenant_id"], needle, needle),
    ).fetchall()
    items = [{"kind": "memory", "id": row["id"], "title": row["title"]} for row in memory]
    items.extend(
        {"kind": row["kind"], "id": row["id"], "title": row["title"], "domain_id": row["domain_id"]}
        for row in records
    )
    return {"items": items, "query": query.strip(), "source_status": "native"}
