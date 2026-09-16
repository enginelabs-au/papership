"""Sqlite/file store. Survives process restart. Application-level isolation."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from functools import wraps
from pathlib import Path
from typing import Any, Iterator

CAPABILITY_IDS = [
    f"B{i:02d}.01" for i in range(1, 25)
] + [f"P{i:02d}.01" for i in range(1, 20)]

FOUNDER_GRANTS = [
    "org.admin",
    "ledger.read",
    "ledger.write",
    "run.start",
    "run.cancel",
    "registry.read",
    "memory.read",
    "memory.write",
    "usage.read",
    "records.read",
    "search.read",
    "aggregates.read",
    "attachments.read",
    "attachments.write",
    "notifications.read",
    "approval.release",
    "approval.erasure",
    "approval.billing",
    "approval.org.admin",
    "repo.branch",
    "repo.change",
    "repo.check",
    "comms.read",
    "comms.draft",
    "comms.send",
]

PROJECT_LEAD_GRANTS = [
    cls
    for cls in FOUNDER_GRANTS
    if cls
    not in {
        "org.admin",
        "approval.org.admin",
        "approval.billing",
        "approval.erasure",
        "approval.release",
        "comms.send",
    }
]

# Paid solo-operator / technical-operator seat: command-room work without org admin.
# Can queue Engine Labs loop jobs (needs ledger.write + run.start). No billing/erasure/release admin.
OPERATOR_GRANTS = [
    "ledger.read",
    "ledger.write",
    "run.start",
    "run.cancel",
    "registry.read",
    "usage.read",
    "records.read",
    "search.read",
    "aggregates.read",
    "attachments.read",
    "attachments.write",
    "notifications.read",
    "memory.read",
    "memory.write",
    "repo.branch",
    "repo.change",
    "repo.check",
    "comms.read",
    "comms.draft",
]

GUEST_GRANTS = [
    "ledger.read",
]

SEAT_TEMPLATES: dict[str, list[str]] = {
    "founder": list(FOUNDER_GRANTS),
    "project_lead": list(PROJECT_LEAD_GRANTS),
    "operator": list(OPERATOR_GRANTS),
    "guest": list(GUEST_GRANTS),
}

SURFACE_GRANTS = {
    "records": "records.read",
    "search": "search.read",
    "aggregates": "aggregates.read",
    "attachments": "attachments.read",
    "notifications": "notifications.read",
    "memory": "memory.read",
}

SELF_APPROVAL_REFUSED = frozenset(
    {"approval.release", "approval.erasure", "approval.billing", "approval.org.admin"}
)


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


class StoreError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class _ListCursor:
    def __init__(self, rows: list[Any], lastrowid: int | None = None, rowcount: int = -1) -> None:
        self._rows = list(rows)
        self._i = 0
        self.lastrowid = lastrowid
        self.rowcount = rowcount

    def fetchone(self):
        if self._i >= len(self._rows):
            return None
        row = self._rows[self._i]
        self._i += 1
        return row

    def fetchall(self):
        rest = self._rows[self._i :]
        self._i = len(self._rows)
        return rest

    def __iter__(self):
        return iter(self.fetchall())


class _LockedConn:
    def __init__(self, conn: sqlite3.Connection, lock: threading.RLock) -> None:
        self._conn = conn
        self._lock = lock

    def execute(self, *args, **kwargs):
        with self._lock:
            cursor = self._conn.execute(*args, **kwargs)
            return _ListCursor(cursor.fetchall(), cursor.lastrowid, cursor.rowcount)

    def executescript(self, sql: str):
        with self._lock:
            return self._conn.executescript(sql)

    def commit(self):
        with self._lock:
            return self._conn.commit()

    def close(self):
        with self._lock:
            return self._conn.close()

    def __getattr__(self, name: str):
        return getattr(self._conn, name)


def _serialize_store(cls):
    for name, attr in list(vars(cls).items()):
        if name.startswith("_") or not callable(attr):
            continue
        fn = attr

        @wraps(fn)
        def wrapped(self, *args, __fn=fn, **kwargs):  # type: ignore[misc]
            with self._lock:
                return __fn(self, *args, **kwargs)

        setattr(cls, name, wrapped)
    return cls


@_serialize_store
class Store:
    def __init__(self, path: str) -> None:
        self.path = str(Path(path))
        self._lock = threading.RLock()
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        raw = sqlite3.connect(self.path, check_same_thread=False, timeout=30)
        raw.row_factory = sqlite3.Row
        raw.execute("PRAGMA journal_mode=WAL")
        raw.execute("PRAGMA foreign_keys=ON")
        self.conn = _LockedConn(raw, self._lock)
        self._init_schema()
        self._migrate_phase5()
        self._migrate_oauth()
        self._migrate_engine_labs_job_loop()
        from app.phase7 import migrate_phase7

        migrate_phase7(self)
        self.flush()

    def flush(self) -> None:
        self.conn.commit()

    def close(self) -> None:
        self.flush()
        self.conn.close()

    def _init_schema(self) -> None:
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS principals (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              kind TEXT NOT NULL,
              seat_id TEXT,
              grant_version INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS seats (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              template TEXT NOT NULL,
              principal_id TEXT
            );
            CREATE TABLE IF NOT EXISTS grants (
              id TEXT PRIMARY KEY,
              principal_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              grant_class TEXT NOT NULL,
              scope TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS entitlements (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              feature TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS allowances (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              feature TEXT NOT NULL,
              band TEXT NOT NULL,
              plan_label TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS allowance_reservations (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              feature TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS organisations (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              name TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS registry (
              capability_id TEXT PRIMARY KEY,
              domain_id TEXT NOT NULL,
              payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS priorities (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              title TEXT NOT NULL,
              owner_principal_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS plans (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              title TEXT NOT NULL,
              priority_id TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS work_items (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              title TEXT NOT NULL,
              plan_id TEXT,
              stage TEXT NOT NULL,
              stage_changed_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS assignments (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              work_item_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dependencies (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              from_work_item_id TEXT NOT NULL,
              to_work_item_id TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS source_references (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              work_item_id TEXT,
              provider TEXT NOT NULL,
              installation_pointer TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS jobs (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              status TEXT NOT NULL,
              purpose TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS job_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              job_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              type TEXT NOT NULL,
              payload TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS runs (
              id TEXT PRIMARY KEY,
              job_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              sponsor TEXT NOT NULL,
              acting_identity TEXT NOT NULL,
              purpose TEXT NOT NULL,
              scope TEXT NOT NULL,
              policy_version TEXT NOT NULL,
              model_configuration TEXT NOT NULL,
              budget TEXT NOT NULL,
              deadline TEXT NOT NULL,
              accountable_owner TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS receipts (
              id TEXT PRIMARY KEY,
              job_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              step_name TEXT NOT NULL,
              idempotency_key TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit_records (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              actor_principal_id TEXT NOT NULL,
              action TEXT NOT NULL,
              target_type TEXT NOT NULL,
              target_id TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TRIGGER IF NOT EXISTS audit_no_update
              BEFORE UPDATE ON audit_records
            BEGIN
              SELECT RAISE(ABORT, 'audit is insert-only');
            END;
            CREATE TRIGGER IF NOT EXISTS audit_no_delete
              BEFORE DELETE ON audit_records
            BEGIN
              SELECT RAISE(ABORT, 'audit is insert-only');
            END;
            CREATE TABLE IF NOT EXISTS usage_events (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS notifications (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              body_kind TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS memory_items (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              kind TEXT NOT NULL,
              class TEXT NOT NULL,
              provenance TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS attachments (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              label TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS approvals (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              approval_class TEXT NOT NULL,
              requester_id TEXT NOT NULL,
              target_id TEXT NOT NULL,
              target_version TEXT NOT NULL,
              status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS loop_stage_events (
              id TEXT PRIMARY KEY,
              work_item_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              stage TEXT NOT NULL,
              evidence TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS conversations (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              title TEXT NOT NULL,
              mode TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS conversation_messages (
              id TEXT PRIMARY KEY,
              conversation_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS teams (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              name TEXT NOT NULL,
              department TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS connections (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              provider TEXT NOT NULL UNIQUE,
              status TEXT NOT NULL,
              destination_class TEXT NOT NULL,
              enabled INTEGER NOT NULL DEFAULT 0,
              last_sync TEXT,
              lineage TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS guests (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              scope TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS inbox_threads (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              subject TEXT NOT NULL,
              preview TEXT NOT NULL,
              channel TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS usage_baselines (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              captured_at TEXT NOT NULL,
              payload TEXT NOT NULL
            );
            """
        )
        self.flush()

    def _migrate_oauth(self) -> None:
        columns = {row["name"] for row in self.conn.execute("PRAGMA table_info(connections)").fetchall()}
        if "token_blob" not in columns:
            self.conn.execute("ALTER TABLE connections ADD COLUMN token_blob TEXT")
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS oauth_states (
              nonce TEXT PRIMARY KEY,
              provider TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              tenant_id TEXT NOT NULL,
              expires_at INTEGER NOT NULL,
              used INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            )
            """
        )

    def _migrate_engine_labs_job_loop(self) -> None:
        """First managed project + Engine Labs loop job wiring (P-009)."""
        from app.managed_projects import (
            ENGINE_LABS_PROJECT_ID,
            ENGINE_LABS_PROJECT_NAME,
            ENGINE_LABS_PROJECT_SLUG,
        )

        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS managed_projects (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              slug TEXT NOT NULL,
              name TEXT NOT NULL,
              kind TEXT NOT NULL,
              status TEXT NOT NULL,
              bound_repo TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        job_cols = {row["name"] for row in self.conn.execute("PRAGMA table_info(jobs)").fetchall()}
        for name, decl in (
            ("project_id", "TEXT"),
            ("work_item_id", "TEXT"),
        ):
            if name not in job_cols:
                self.conn.execute(f"ALTER TABLE jobs ADD COLUMN {name} {decl}")
        wi_cols = {row["name"] for row in self.conn.execute("PRAGMA table_info(work_items)").fetchall()}
        for name, decl in (
            ("project_id", "TEXT"),
            ("job_id", "TEXT"),
        ):
            if name not in wi_cols:
                self.conn.execute(f"ALTER TABLE work_items ADD COLUMN {name} {decl}")

        now = _now()
        if not self.conn.execute(
            "SELECT 1 FROM managed_projects WHERE id=?", (ENGINE_LABS_PROJECT_ID,)
        ).fetchone():
            self.conn.execute(
                """INSERT INTO managed_projects
                   (id, tenant_id, slug, name, kind, status, bound_repo, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ENGINE_LABS_PROJECT_ID,
                    "tenant-founder",
                    ENGINE_LABS_PROJECT_SLUG,
                    ENGINE_LABS_PROJECT_NAME,
                    "self",
                    "active",
                    "enginelabs-au/papership",
                    now,
                    now,
                ),
            )

        self._apply_engine_labs_registry_status()

    def _apply_engine_labs_registry_status(self) -> None:
        """Configured (not working) for B08/P01/P04; fill seed labels. Safe before or after seed."""
        from app.managed_projects import DOMAIN_LABELS, LOOP_CONFIGURED_CAPS

        now = _now()
        for cap_id, meta in LOOP_CONFIGURED_CAPS.items():
            row = self.conn.execute(
                "SELECT payload FROM registry WHERE capability_id=?", (cap_id,)
            ).fetchone()
            if not row:
                continue
            payload = json.loads(row["payload"])
            if payload.get("implementation_status") == "working":
                continue
            payload["user_outcome"] = meta["user_outcome"]
            payload["implementation_status"] = "configured"
            payload["acceptance_evidence"] = meta["acceptance_evidence"]
            payload["status_evidence"] = meta["status_evidence"]
            payload["status_changed_at"] = now
            payload["registry_version"] = "0.1.6-engine-labs-loop"
            payload["release_phase"] = meta["release_phase"]
            self.conn.execute(
                "UPDATE registry SET payload=? WHERE capability_id=?",
                (json.dumps(payload), cap_id),
            )

        for domain_id, label in DOMAIN_LABELS.items():
            cap_id = f"{domain_id}.01"
            row = self.conn.execute(
                "SELECT payload FROM registry WHERE capability_id=?", (cap_id,)
            ).fetchone()
            if not row:
                continue
            payload = json.loads(row["payload"])
            if payload.get("user_outcome", "").startswith("Seed row"):
                payload["user_outcome"] = label
                self.conn.execute(
                    "UPDATE registry SET payload=? WHERE capability_id=?",
                    (json.dumps(payload), cap_id),
                )

    def _migrate_phase5(self) -> None:
        existing = {
            row["name"]
            for row in self.conn.execute("PRAGMA table_info(memory_items)").fetchall()
        }
        additions = {
            "title": "TEXT NOT NULL DEFAULT ''",
            "owner_principal_id": "TEXT",
            "version": "INTEGER NOT NULL DEFAULT 1",
            "restriction_scope": "TEXT NOT NULL DEFAULT ''",
            "archived_at": "TEXT",
            "expires_at": "TEXT",
            "content_class": "TEXT NOT NULL DEFAULT 'source'",
            "parent_id": "TEXT",
            "content": "TEXT NOT NULL DEFAULT ''",
            "deleted_at": "TEXT",
        }
        for name, decl in additions.items():
            if name not in existing:
                self.conn.execute(f"ALTER TABLE memory_items ADD COLUMN {name} {decl}")
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS strategy_records (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              kind TEXT NOT NULL,
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              kpi_status TEXT NOT NULL,
              source_bound INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              archived_at TEXT
            );
            CREATE TABLE IF NOT EXISTS member_capacity (
              principal_id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              availability TEXT NOT NULL,
              workload TEXT NOT NULL,
              leave_reference TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS view_states (
              tenant_id TEXT NOT NULL,
              principal_id TEXT NOT NULL,
              definition TEXT NOT NULL,
              pins TEXT NOT NULL,
              history TEXT NOT NULL,
              enabled INTEGER NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL,
              PRIMARY KEY (tenant_id, principal_id)
            );
            CREATE TABLE IF NOT EXISTS schedules (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              mode TEXT NOT NULL,
              cadence TEXT NOT NULL,
              definition TEXT NOT NULL,
              fire_external INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );
            """
        )
        self.conn.execute(
            """UPDATE memory_items SET title=id, content_class=class
               WHERE title='' OR title IS NULL"""
        )
        self.flush()

    def row_to_dict(self, row: sqlite3.Row | None) -> dict[str, Any] | None:
        if row is None:
            return None
        return {k: row[k] for k in row.keys()}

    def seed_founder(self) -> None:
        if self.conn.execute("SELECT 1 FROM principals WHERE id='principal-founder'").fetchone():
            self._seed_registry()
            self._seed_phase4(tenant_id="tenant-founder")
            self._seed_phase5(tenant_id="tenant-founder")
            self._seed_paid_operator_seat(tenant_id="tenant-founder")
            self.flush()
            return
        now = _now()
        self.conn.execute(
            "INSERT INTO organisations (id, tenant_id, name) VALUES (?, ?, ?)",
            ("org-founder", "tenant-founder", "Engine Labs"),
        )
        self.conn.execute(
            "INSERT INTO seats (id, tenant_id, template, principal_id) VALUES (?, ?, ?, ?)",
            ("seat-founder", "tenant-founder", "founder", "principal-founder"),
        )
        self.conn.execute(
            "INSERT INTO principals (id, tenant_id, kind, seat_id, grant_version) VALUES (?, ?, ?, ?, ?)",
            ("principal-founder", "tenant-founder", "human", "seat-founder", 1),
        )
        self.conn.execute(
            "INSERT INTO principals (id, tenant_id, kind, seat_id, grant_version) VALUES (?, ?, ?, ?, ?)",
            ("principal-unpriv", "tenant-founder", "human", None, 1),
        )
        self.conn.execute(
            "INSERT INTO principals (id, tenant_id, kind, seat_id, grant_version) VALUES (?, ?, ?, ?, ?)",
            ("principal-agent", "tenant-founder", "agent", None, 1),
        )
        self.conn.execute(
            "INSERT INTO principals (id, tenant_id, kind, seat_id, grant_version) VALUES (?, ?, ?, ?, ?)",
            ("principal-other", "tenant-other", "human", None, 1),
        )
        for cls in FOUNDER_GRANTS:
            self.conn.execute(
                "INSERT INTO grants (id, principal_id, tenant_id, grant_class, scope) VALUES (?, ?, ?, ?, ?)",
                (_id("grant"), "principal-founder", "tenant-founder", cls, "org"),
            )
        self.conn.execute(
            "INSERT INTO notifications (id, tenant_id, principal_id, body_kind, created_at) VALUES (?, ?, ?, ?, ?)",
            ("notif-1", "tenant-founder", "principal-founder", "job_completed", now),
        )
        self.conn.execute(
            "INSERT INTO memory_items (id, tenant_id, kind, class, provenance, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            ("mem-1", "tenant-founder", "project", "approved", "seed", now),
        )
        self._seed_registry()
        self._seed_phase4(tenant_id="tenant-founder")
        self._seed_phase5(tenant_id="tenant-founder")
        self._seed_paid_operator_seat(tenant_id="tenant-founder")
        self.append_audit("principal-founder", "seed", "organisation", "org-founder")
        self.flush()

    def _seed_paid_operator_seat(self, *, tenant_id: str) -> None:
        """One paid founder/solo operator seat: all domain entitlements + command-room features.

        Entitlements are not grants — they mark which domains/capabilities the seat is set up
        for. Domains stay planned/configured shells; live write stays refused.
        """
        from app.managed_projects import ALL_DOMAIN_IDS

        features = [
            "seat.paid_operator",
            "product.hey_papership",
            "product.workflows",
            "product.hermes_host",
            "product.engine_labs.loop",
            *[f"domain.{domain_id}" for domain_id in ALL_DOMAIN_IDS],
        ]
        for feature in features:
            existing = self.conn.execute(
                "SELECT 1 FROM entitlements WHERE principal_id=? AND feature=?",
                ("principal-founder", feature),
            ).fetchone()
            if existing:
                continue
            self.conn.execute(
                "INSERT INTO entitlements (id, tenant_id, principal_id, feature) VALUES (?, ?, ?, ?)",
                (_id("ent"), tenant_id, "principal-founder", feature),
            )

    def list_seat_templates(self) -> list[dict[str, Any]]:
        return [
            {
                "id": name,
                "grants": list(grants),
                "sku": "paid_operator" if name in {"founder", "operator"} else name,
                "role": (
                    "Founder / solo paid operator"
                    if name == "founder"
                    else "Technical operator"
                    if name == "operator"
                    else name.replace("_", " ").title()
                ),
            }
            for name, grants in SEAT_TEMPLATES.items()
        ]

    def paid_operator_seat(self, principal_id: str) -> dict[str, Any]:
        """Describe the seeded paid operator seat for the command room."""
        principal = self.principal(principal_id)
        seat_row = self.conn.execute(
            "SELECT * FROM seats WHERE principal_id=?", (principal_id,)
        ).fetchone()
        template = seat_row["template"] if seat_row else None
        ents = self.entitlements(principal_id)
        domain_features = sorted(
            e["feature"].removeprefix("domain.")
            for e in ents
            if str(e.get("feature", "")).startswith("domain.")
        )
        return {
            "principal_id": principal_id,
            "tenant_id": principal["tenant_id"],
            "seat_id": seat_row["id"] if seat_row else None,
            "template": template,
            "sku": "paid_operator",
            "label": "Founder / solo paid operator",
            "plan_hint": "pro",
            "charges_enabled": False,
            "domain_count": len(domain_features),
            "domains": domain_features,
            "products": sorted(
                e["feature"].removeprefix("product.")
                for e in ents
                if str(e.get("feature", "")).startswith("product.")
            ),
            "grants": sorted(self.grant_classes(principal_id)),
            "context_music": False,
            "quark": False,
            "portability": False,
        }

    def create_invite(
        self,
        *,
        actor_id: str,
        tenant_id: str,
        template: str,
        label: str = "",
    ) -> dict[str, Any]:
        spec = SEAT_TEMPLATES.get(template)
        if spec is None or template == "founder":
            raise StoreError("unknown or forbidden seat template", 400)
        if template != "founder" and not self.oq_g2_recorded():
            raise StoreError("oq_g2_recorded is required before a non-founder seat", 403)
        actor_grants = self.grant_classes(actor_id)
        granted = [cls for cls in spec if cls in actor_grants]
        if not granted:
            raise StoreError("template has no grants inside the actor set", 403)
        principal_id = _id("principal")
        seat_id = _id("seat")
        self.conn.execute(
            "INSERT INTO seats (id, tenant_id, template, principal_id) VALUES (?, ?, ?, ?)",
            (seat_id, tenant_id, template, principal_id),
        )
        self.conn.execute(
            "INSERT INTO principals (id, tenant_id, kind, seat_id, grant_version) VALUES (?, ?, ?, ?, ?)",
            (principal_id, tenant_id, "human", seat_id, 1),
        )
        for cls in granted:
            self.conn.execute(
                "INSERT INTO grants (id, principal_id, tenant_id, grant_class, scope) VALUES (?, ?, ?, ?, ?)",
                (_id("grant"), principal_id, tenant_id, cls, "org"),
            )
        self.append_audit(actor_id, "member.invite", "principal", principal_id)
        self.flush()
        return {
            "status": "created",
            "mail": "not_sent",
            "principal_id": principal_id,
            "seat_id": seat_id,
            "template": template,
            "label": label,
            "grants": granted,
        }

    def _seed_registry(self) -> None:
        if self.conn.execute("SELECT COUNT(*) AS c FROM registry").fetchone()["c"] >= 43:
            self._apply_engine_labs_registry_status()
            return
        now = _now()
        for cap in CAPABILITY_IDS:
            domain = cap.split(".")[0]
            hermes_tool = False
            status = "planned"
            row = {
                "domain_id": domain,
                "capability_id": cap,
                "user_outcome": f"Seed row {cap}",
                "owner": "native",
                "read_actions": ["read"],
                "write_actions": ["write"],
                "data_authority": "native",
                "required_grants": ["registry.read"],
                "dependencies": [],
                "interface_components": ["registry"],
                "release_phase": "07 / R1",
                "implementation_status": status,
                "acceptance_evidence": "n/a — planned row",
                "registry_version": "0.1.0-phase0",
                "status_changed_at": now,
                "status_evidence": "phase-1-seed",
                "hermes_side_effecting_tool": hermes_tool,
                "hermes_side_effecting_tools": "catalogued",
            }
            self.conn.execute(
                "INSERT OR REPLACE INTO registry (capability_id, domain_id, payload) VALUES (?, ?, ?)",
                (cap, domain, json.dumps(row)),
            )
        self._apply_engine_labs_registry_status()

    def principal(self, principal_id: str) -> dict[str, Any]:
        row = self.conn.execute("SELECT * FROM principals WHERE id=?", (principal_id,)).fetchone()
        if not row:
            raise StoreError("unknown principal", 401)
        return self.row_to_dict(row)  # type: ignore[return-value]

    def grant_classes(self, principal_id: str) -> set[str]:
        rows = self.conn.execute(
            "SELECT grant_class FROM grants WHERE principal_id=?", (principal_id,)
        ).fetchall()
        return {r["grant_class"] for r in rows}

    def has_grant(self, principal_id: str, grant_class: str) -> bool:
        return grant_class in self.grant_classes(principal_id)

    def require_surface(self, principal_id: str, surface: str) -> None:
        needed = SURFACE_GRANTS[surface]
        classes = self.grant_classes(principal_id)
        if needed not in classes and "org.admin" not in classes:
            raise StoreError(f"denied: {surface}", 403)

    def add_grant(self, principal_id: str, grant_class: str, tenant_id: str) -> dict[str, Any]:
        principal = self.principal(principal_id)
        if principal["kind"] == "agent" and grant_class.startswith("approval."):
            raise StoreError("agent principals cannot hold approval.* grants", 400)
        self.conn.execute(
            "INSERT INTO grants (id, principal_id, tenant_id, grant_class, scope) VALUES (?, ?, ?, ?, ?)",
            (_id("grant"), principal_id, tenant_id, grant_class, "org"),
        )
        self.flush()
        return {"principal_id": principal_id, "grant_class": grant_class}

    def revoke_grant(self, principal_id: str, grant_class: str) -> int:
        cur = self.conn.execute(
            "DELETE FROM grants WHERE principal_id=? AND grant_class=?",
            (principal_id, grant_class),
        )
        self.flush()
        return cur.rowcount

    def require_live_approval(self, target_id: str, target_version: str) -> dict[str, Any]:
        row = self.conn.execute(
            """SELECT * FROM approvals
               WHERE target_id=? AND target_version=? AND status='approved'""",
            (target_id, target_version),
        ).fetchone()
        if not row:
            raise StoreError("approval not live", 403)
        return self.row_to_dict(row)  # type: ignore[return-value]

    def add_entitlement(self, principal_id: str, feature: str, tenant_id: str) -> dict[str, Any]:
        eid = _id("ent")
        self.conn.execute(
            "INSERT INTO entitlements (id, tenant_id, principal_id, feature) VALUES (?, ?, ?, ?)",
            (eid, tenant_id, principal_id, feature),
        )
        self.flush()
        return {"id": eid, "principal_id": principal_id, "feature": feature}

    def entitlements(self, principal_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM entitlements WHERE principal_id=?", (principal_id,)
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    ALLOWANCE_BANDS = frozenset({"unmeasured", "low", "standard", "high", "exhausted"})
    PLAN_LABELS = frozenset({"free", "basic", "professional", "enterprise"})

    def add_allowance(
        self, principal_id: str, feature: str, tenant_id: str, *, band: str, plan_label: str
    ) -> dict[str, Any]:
        if band not in self.ALLOWANCE_BANDS:
            raise StoreError("unknown allowance band", 400)
        if plan_label not in self.PLAN_LABELS:
            raise StoreError("unknown plan label", 400)
        aid = _id("alw")
        self.conn.execute(
            """INSERT INTO allowances (id, tenant_id, principal_id, feature, band, plan_label)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (aid, tenant_id, principal_id, feature, band, plan_label),
        )
        self.flush()
        return {
            "id": aid,
            "principal_id": principal_id,
            "feature": feature,
            "band": band,
            "plan_label": plan_label,
        }

    def allowances(self, principal_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT id, principal_id, feature, band, plan_label FROM allowances WHERE principal_id=?",
            (principal_id,),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def reserve_allowance(self, principal_id: str, feature: str, tenant_id: str) -> dict[str, Any]:
        row = self.conn.execute(
            "SELECT band FROM allowances WHERE principal_id=? AND feature=?",
            (principal_id, feature),
        ).fetchone()
        if row is None:
            raise StoreError("allowance missing", 404)
        band = str(row["band"] if isinstance(row, sqlite3.Row) else row[0])
        if band == "exhausted":
            raise StoreError("allowance exhausted; records and exports stay available", 403)
        open_res = self.conn.execute(
            """SELECT id FROM allowance_reservations
               WHERE principal_id=? AND feature=? AND status='reserved'""",
            (principal_id, feature),
        ).fetchone()
        if open_res:
            raise StoreError("duplicate reserve refused", 409)
        rid = _id("rsv")
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.conn.execute(
            """INSERT INTO allowance_reservations
               (id, tenant_id, principal_id, feature, status, created_at)
               VALUES (?, ?, ?, ?, 'reserved', ?)""",
            (rid, tenant_id, principal_id, feature, now),
        )
        self.flush()
        return {"id": rid, "feature": feature, "status": "reserved", "band": band}

    def reconcile_allowance(self, reservation_id: str, principal_id: str) -> dict[str, Any]:
        row = self.conn.execute(
            "SELECT * FROM allowance_reservations WHERE id=? AND principal_id=?",
            (reservation_id, principal_id),
        ).fetchone()
        if row is None:
            raise StoreError("reservation missing", 404)
        self.conn.execute(
            "UPDATE allowance_reservations SET status='reconciled' WHERE id=?",
            (reservation_id,),
        )
        self.flush()
        return {"id": reservation_id, "status": "reconciled"}

    def decide_approval(
        self,
        *,
        approval_class: str,
        requester_id: str,
        decider_id: str,
        target_id: str,
        target_version: str,
        tenant_id: str,
    ) -> dict[str, Any]:
        if (
            approval_class in SELF_APPROVAL_REFUSED
            or approval_class.removeprefix("approval.")
            in {"release", "erasure", "billing", "org.admin"}
        ) and requester_id == decider_id:
            raise StoreError("self-approval refused", 403)
        if not self.has_grant(decider_id, approval_class) and not self.has_grant(
            decider_id, "org.admin"
        ):
            raise StoreError("approval grant missing", 403)
        aid = _id("appr")
        self.conn.execute(
            """INSERT INTO approvals (id, tenant_id, approval_class, requester_id, target_id, target_version, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (aid, tenant_id, approval_class, requester_id, target_id, target_version, "approved"),
        )
        self.flush()
        return {"id": aid, "status": "approved"}

    def void_approval_if_changed(self, target_id: str, new_version: str) -> int:
        cur = self.conn.execute(
            "UPDATE approvals SET status='voided' WHERE target_id=? AND target_version!=? AND status='approved'",
            (target_id, new_version),
        )
        self.flush()
        return cur.rowcount

    def list_registry(self) -> list[dict[str, Any]]:
        rows = self.conn.execute("SELECT payload FROM registry ORDER BY capability_id").fetchall()
        items = [json.loads(r["payload"]) for r in rows]
        for item in items:
            if item.get("hermes_side_effecting_tool"):
                item["implementation_status"] = "unavailable"
        return items

    def append_audit(self, actor: str, action: str, target_type: str, target_id: str) -> str:
        tenant = self.principal(actor)["tenant_id"] if actor.startswith("principal-") else "tenant-founder"
        try:
            tenant = self.principal(actor)["tenant_id"]
        except StoreError:
            tenant = "tenant-founder"
        aid = _id("audit")
        self.conn.execute(
            """INSERT INTO audit_records (id, tenant_id, actor_principal_id, action, target_type, target_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (aid, tenant, actor, action, target_type, target_id, _now()),
        )
        self.flush()
        return aid

    def try_update_audit(self, audit_id: str) -> None:
        self.conn.execute("UPDATE audit_records SET action='tamper' WHERE id=?", (audit_id,))

    def create_priority(self, principal_id: str, title: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        p = self.principal(principal_id)
        now = _now()
        pid = _id("pri")
        self.conn.execute(
            """INSERT INTO priorities (id, tenant_id, title, owner_principal_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (pid, p["tenant_id"], title, principal_id, now, now),
        )
        self.append_audit(principal_id, "priority.create", "priority", pid)
        self.flush()
        return self.row_to_dict(self.conn.execute("SELECT * FROM priorities WHERE id=?", (pid,)).fetchone())  # type: ignore[return-value]

    def create_plan(self, principal_id: str, title: str, priority_id: str | None = None) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        p = self.principal(principal_id)
        now = _now()
        pid = _id("plan")
        self.conn.execute(
            """INSERT INTO plans (id, tenant_id, title, priority_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (pid, p["tenant_id"], title, priority_id, now, now),
        )
        self.append_audit(principal_id, "plan.create", "plan", pid)
        self.flush()
        return self.row_to_dict(self.conn.execute("SELECT * FROM plans WHERE id=?", (pid,)).fetchone())  # type: ignore[return-value]

    def create_work_item(self, principal_id: str, title: str, plan_id: str | None = None) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        p = self.principal(principal_id)
        now = _now()
        wid = _id("wi")
        self.conn.execute(
            """INSERT INTO work_items (id, tenant_id, title, plan_id, stage, stage_changed_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (wid, p["tenant_id"], title, plan_id, "request", now, now, now),
        )
        self.append_audit(principal_id, "work_item.create", "work_item", wid)
        self.flush()
        return self.row_to_dict(self.conn.execute("SELECT * FROM work_items WHERE id=?", (wid,)).fetchone())  # type: ignore[return-value]

    def get_work_item(self, principal_id: str, work_item_id: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.read") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        row = self.conn.execute("SELECT * FROM work_items WHERE id=?", (work_item_id,)).fetchone()
        if not row:
            raise StoreError("work item not found", 404)
        item = self.row_to_dict(row)
        item["loop"] = self.loop_history(work_item_id)
        return item  # type: ignore[return-value]

    def advance_stage(
        self,
        principal_id: str,
        work_item_id: str,
        stage: str,
        evidence: str | None = None,
    ) -> dict[str, Any]:
        from app.loop import LOOP_STAGES, can_advance

        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        if stage not in LOOP_STAGES:
            raise StoreError("unknown loop stage", 400)
        current = self.conn.execute("SELECT * FROM work_items WHERE id=?", (work_item_id,)).fetchone()
        if not current:
            raise StoreError("work item not found", 404)
        if not can_advance(current["stage"], stage):
            raise StoreError("loop stage cannot move backwards", 400)
        now = _now()
        self.conn.execute(
            "UPDATE work_items SET stage=?, stage_changed_at=?, updated_at=? WHERE id=?",
            (stage, now, now, work_item_id),
        )
        eid = _id("stg")
        self.conn.execute(
            """INSERT INTO loop_stage_events (id, work_item_id, tenant_id, stage, evidence, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (eid, work_item_id, current["tenant_id"], stage, evidence or "", now),
        )
        self.append_audit(principal_id, "work_item.stage", "work_item", work_item_id)
        self.flush()
        return self.get_work_item(principal_id, work_item_id)

    def loop_history(self, work_item_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM loop_stage_events WHERE work_item_id=? ORDER BY created_at",
            (work_item_id,),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def create_conversation(self, principal_id: str, title: str, mode: str = "Ask") -> dict[str, Any]:
        if not self.has_grant(principal_id, "run.start") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.start", 403)
        p = self.principal(principal_id)
        now = _now()
        cid = _id("convo")
        self.conn.execute(
            """INSERT INTO conversations (id, tenant_id, principal_id, title, mode, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (cid, p["tenant_id"], principal_id, title or "Hey Papership", mode or "Ask", now, now),
        )
        self.flush()
        return self.row_to_dict(self.conn.execute("SELECT * FROM conversations WHERE id=?", (cid,)).fetchone())  # type: ignore[return-value]

    def list_conversations(self, principal_id: str) -> list[dict[str, Any]]:
        if not self.has_grant(principal_id, "run.start") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.start", 403)
        p = self.principal(principal_id)
        rows = self.conn.execute(
            "SELECT * FROM conversations WHERE tenant_id=? AND principal_id=? ORDER BY updated_at DESC",
            (p["tenant_id"], principal_id),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def add_message(self, principal_id: str, conversation_id: str, role: str, content: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "run.start") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.start", 403)
        convo = self.conn.execute("SELECT * FROM conversations WHERE id=?", (conversation_id,)).fetchone()
        if not convo:
            raise StoreError("conversation not found", 404)
        mid = _id("msg")
        now = _now()
        self.conn.execute(
            """INSERT INTO conversation_messages (id, conversation_id, tenant_id, role, content, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (mid, conversation_id, convo["tenant_id"], role, content, now),
        )
        self.conn.execute(
            "UPDATE conversations SET updated_at=? WHERE id=?",
            (now, conversation_id),
        )
        self.flush()
        return {"id": mid, "conversation_id": conversation_id, "role": role, "content": content}

    def list_messages(self, principal_id: str, conversation_id: str) -> list[dict[str, Any]]:
        if not self.has_grant(principal_id, "run.start") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.start", 403)
        rows = self.conn.execute(
            "SELECT * FROM conversation_messages WHERE conversation_id=? ORDER BY created_at",
            (conversation_id,),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def create_assignment(self, principal_id: str, work_item_id: str, assignee: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        p = self.principal(principal_id)
        aid = _id("asg")
        now = _now()
        self.conn.execute(
            """INSERT INTO assignments (id, tenant_id, work_item_id, principal_id, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (aid, p["tenant_id"], work_item_id, assignee, now),
        )
        self.flush()
        return {"id": aid, "work_item_id": work_item_id, "principal_id": assignee}

    def create_dependency(self, principal_id: str, src: str, dst: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        p = self.principal(principal_id)
        did = _id("dep")
        self.conn.execute(
            """INSERT INTO dependencies (id, tenant_id, from_work_item_id, to_work_item_id, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (did, p["tenant_id"], src, dst, _now()),
        )
        self.flush()
        return {"id": did, "from_work_item_id": src, "to_work_item_id": dst}

    def create_source_reference(self, principal_id: str, provider: str, pointer: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)
        p = self.principal(principal_id)
        sid = _id("sref")
        self.conn.execute(
            """INSERT INTO source_references (id, tenant_id, provider, installation_pointer, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (sid, p["tenant_id"], provider, pointer, _now()),
        )
        self.flush()
        return {"id": sid, "provider": provider, "installation_pointer": pointer}

    def list_visible(self, table: str, principal_id: str) -> list[dict[str, Any]]:
        p = self.principal(principal_id)
        if table in {"priorities", "plans", "work_items", "assignments", "dependencies", "source_references", "jobs"}:
            if not self.has_grant(principal_id, "ledger.read") and not self.has_grant(principal_id, "org.admin"):
                raise StoreError(f"denied: {table}", 403)
        rows = self.conn.execute(f"SELECT * FROM {table} WHERE tenant_id=?", (p["tenant_id"],)).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_managed_projects(self, principal_id: str) -> list[dict[str, Any]]:
        if not self.has_grant(principal_id, "ledger.read") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: projects", 403)
        p = self.principal(principal_id)
        rows = self.conn.execute(
            "SELECT * FROM managed_projects WHERE tenant_id=? ORDER BY created_at",
            (p["tenant_id"],),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def get_managed_project(self, principal_id: str, project_id: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "ledger.read") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: projects", 403)
        p = self.principal(principal_id)
        row = self.conn.execute(
            "SELECT * FROM managed_projects WHERE id=? AND tenant_id=?",
            (project_id, p["tenant_id"]),
        ).fetchone()
        if not row:
            raise StoreError("project not found", 404)
        project = self.row_to_dict(row)
        from app.loop import LOOP_STAGES
        from app.managed_projects import ENGINE_LABS_JOB_PURPOSE

        jobs = self.conn.execute(
            """SELECT * FROM jobs WHERE tenant_id=? AND project_id=?
               ORDER BY created_at DESC LIMIT 20""",
            (p["tenant_id"], project_id),
        ).fetchall()
        enriched_jobs: list[dict[str, Any]] = []
        for j in jobs:
            job_row = self.row_to_dict(j)
            wid = job_row.get("work_item_id")
            if wid:
                wi = self.conn.execute(
                    "SELECT stage FROM work_items WHERE id=?",
                    (wid,),
                ).fetchone()
                if wi:
                    job_row["stage"] = wi["stage"]
            enriched_jobs.append(job_row)
        project["jobs"] = enriched_jobs
        project["loop_stages"] = list(LOOP_STAGES)
        project["job_purpose"] = ENGINE_LABS_JOB_PURPOSE
        project["live_github_open"] = False
        project["hermes_write"] = False
        return project  # type: ignore[return-value]

    def start_engine_labs_job(
        self,
        principal_id: str,
        project_id: str,
        title: str,
        *,
        purpose: str | None = None,
    ) -> dict[str, Any]:
        """Queue an Engine Labs loop job bound to the managed project. Leaves status queued."""
        from app.managed_projects import ENGINE_LABS_JOB_PURPOSE, ENGINE_LABS_PROJECT_ID

        if not self.has_grant(principal_id, "run.start") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.start", 403)
        if not self.has_grant(principal_id, "ledger.write") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: ledger", 403)

        p = self.principal(principal_id)
        project = self.conn.execute(
            "SELECT * FROM managed_projects WHERE id=? AND tenant_id=?",
            (project_id, p["tenant_id"]),
        ).fetchone()
        if not project:
            raise StoreError("project not found", 404)
        if project_id != ENGINE_LABS_PROJECT_ID:
            raise StoreError("only the Engine Labs managed project accepts loop jobs in this increment", 400)

        job_purpose = purpose or ENGINE_LABS_JOB_PURPOSE
        if job_purpose != ENGINE_LABS_JOB_PURPOSE:
            raise StoreError(f"unsupported purpose for Engine Labs job: {job_purpose}", 400)

        now = _now()
        wid = _id("wi")
        jid = _id("job")
        rid = _id("run")
        stage = "request"
        work_title = title or "Engine Labs loop"

        self.conn.execute(
            """INSERT INTO work_items
               (id, tenant_id, title, plan_id, stage, stage_changed_at, created_at, updated_at, project_id, job_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (wid, p["tenant_id"], work_title, None, stage, now, now, now, project_id, jid),
        )
        self.conn.execute(
            """INSERT INTO loop_stage_events (id, work_item_id, tenant_id, stage, evidence, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (_id("stg"), wid, p["tenant_id"], stage, "engine_labs.job.start", now),
        )
        self.conn.execute(
            """INSERT INTO jobs
               (id, tenant_id, status, purpose, created_at, updated_at, project_id, work_item_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (jid, p["tenant_id"], "queued", job_purpose, now, now, project_id, wid),
        )
        self.conn.execute(
            """INSERT INTO runs (
                 id, job_id, tenant_id, sponsor, acting_identity, purpose, scope,
                 policy_version, model_configuration, budget, deadline, accountable_owner, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rid,
                jid,
                p["tenant_id"],
                principal_id,
                principal_id,
                job_purpose,
                "tenant",
                "1",
                "none",
                "band:unpriced",
                "2026-12-31T00:00:00Z",
                principal_id,
                now,
            ),
        )
        self._add_event(
            jid,
            p["tenant_id"],
            "job.persisted",
            {
                "job_id": jid,
                "run_id": rid,
                "project_id": project_id,
                "work_item_id": wid,
                "stage": stage,
                "live_github_open": False,
                "hermes_write": False,
            },
        )
        self.append_audit(principal_id, "work_item.create", "work_item", wid)
        self.append_audit(principal_id, "job.create", "job", jid)
        self.flush()
        return {
            "id": jid,
            "run_id": rid,
            "status": "queued",
            "purpose": job_purpose,
            "project_id": project_id,
            "work_item_id": wid,
            "stage": stage,
            "live_github_open": False,
            "hermes_write": False,
        }

    def persist_job(self, principal_id: str, purpose: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "run.start") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.start", 403)
        p = self.principal(principal_id)
        now = _now()
        jid = _id("job")
        rid = _id("run")
        self.conn.execute(
            """INSERT INTO jobs (id, tenant_id, status, purpose, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (jid, p["tenant_id"], "queued", purpose, now, now),
        )
        self.conn.execute(
            """INSERT INTO runs (
                 id, job_id, tenant_id, sponsor, acting_identity, purpose, scope,
                 policy_version, model_configuration, budget, deadline, accountable_owner, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rid,
                jid,
                p["tenant_id"],
                principal_id,
                principal_id,
                purpose,
                "tenant",
                "1",
                "none",
                "none",
                "2026-12-31T00:00:00Z",
                principal_id,
                now,
            ),
        )
        self._add_event(jid, p["tenant_id"], "job.persisted", {"job_id": jid, "run_id": rid})
        self.append_audit(principal_id, "job.create", "job", jid)
        self.flush()
        return {"id": jid, "run_id": rid, "status": "queued", "purpose": purpose}

    def start_job(self, job_id: str, principal_id: str | None = None) -> None:
        if principal_id:
            if not self.has_grant(principal_id, "run.start") and not self.has_grant(
                principal_id, "org.admin"
            ):
                raise StoreError("denied: run.start", 403)
        self.conn.execute(
            "UPDATE jobs SET status='running', updated_at=? WHERE id=?",
            (_now(), job_id),
        )
        job = self.conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        self._add_event(job_id, job["tenant_id"], "job.started", {"job_id": job_id})
        self.flush()

    def complete_job(self, job_id: str) -> None:
        self.conn.execute(
            "UPDATE jobs SET status='completed', updated_at=? WHERE id=?",
            (_now(), job_id),
        )
        job = self.conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        self._add_event(job_id, job["tenant_id"], "job.completed", {"job_id": job_id})
        self.flush()

    def cancel_job(self, principal_id: str, job_id: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "run.cancel") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: run.cancel", 403)
        job = self.conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not job:
            raise StoreError("job not found", 404)
        self.conn.execute(
            "UPDATE jobs SET status='cancelled', updated_at=? WHERE id=?",
            (_now(), job_id),
        )
        self._add_event(job_id, job["tenant_id"], "job.cancelled", {"job_id": job_id})
        self.flush()
        return {"id": job_id, "status": "cancelled"}

    def get_job(self, job_id: str) -> dict[str, Any]:
        job = self.conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not job:
            raise StoreError("job not found", 404)
        run = self.conn.execute("SELECT * FROM runs WHERE job_id=?", (job_id,)).fetchone()
        data = self.row_to_dict(job)
        data["run"] = self.row_to_dict(run)
        return data  # type: ignore[return-value]

    def _add_event(self, job_id: str, tenant_id: str, typ: str, payload: dict[str, Any]) -> int:
        cur = self.conn.execute(
            """INSERT INTO job_events (job_id, tenant_id, type, payload, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (job_id, tenant_id, typ, json.dumps(payload), _now()),
        )
        return int(cur.lastrowid)

    def events_after(self, job_id: str, last_event_id: int = 0) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM job_events WHERE job_id=? AND id>? ORDER BY id",
            (job_id, last_event_id),
        ).fetchall()
        out = []
        for r in rows:
            item = self.row_to_dict(r)
            item["payload"] = json.loads(item["payload"])
            out.append(item)
        return out

    def add_receipt(self, job_id: str, step_name: str, idempotency_key: str) -> dict[str, Any]:
        existing = self.conn.execute(
            "SELECT * FROM receipts WHERE idempotency_key=?", (idempotency_key,)
        ).fetchone()
        if existing:
            return self.row_to_dict(existing)  # type: ignore[return-value]
        job = self.conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not job:
            raise StoreError("job not found", 404)
        rid = _id("rcpt")
        self.conn.execute(
            """INSERT INTO receipts (id, job_id, tenant_id, step_name, idempotency_key, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (rid, job_id, job["tenant_id"], step_name, idempotency_key, _now()),
        )
        self._add_event(job_id, job["tenant_id"], "step.receipt", {"receipt_id": rid, "step": step_name})
        self.flush()
        return {"id": rid, "job_id": job_id, "step_name": step_name, "idempotency_key": idempotency_key}

    def create_attachment(self, principal_id: str, label: str) -> dict[str, Any]:
        self.require_surface(principal_id, "attachments")
        if not self.has_grant(principal_id, "attachments.write") and not self.has_grant(
            principal_id, "org.admin"
        ):
            raise StoreError("denied: attachments", 403)
        p = self.principal(principal_id)
        aid = _id("att")
        self.conn.execute(
            "INSERT INTO attachments (id, tenant_id, label, created_at) VALUES (?, ?, ?, ?)",
            (aid, p["tenant_id"], label, _now()),
        )
        self.flush()
        return {"id": aid, "label": label}

    def get_attachment(self, attachment_id: str) -> dict[str, Any]:
        row = self.conn.execute("SELECT * FROM attachments WHERE id=?", (attachment_id,)).fetchone()
        if not row:
            raise StoreError("attachment not found", 404)
        return self.row_to_dict(row)  # type: ignore[return-value]

    def list_notifications(self, principal_id: str) -> list[dict[str, Any]]:
        self.require_surface(principal_id, "notifications")
        p = self.principal(principal_id)
        rows = self.conn.execute(
            "SELECT * FROM notifications WHERE tenant_id=?", (p["tenant_id"],)
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_memory(self, principal_id: str) -> list[dict[str, Any]]:
        from app.memory_ops import list_memory as list_memory_ops

        return list_memory_ops(self, principal_id)

    def list_records(self, principal_id: str) -> list[dict[str, Any]]:
        self.require_surface(principal_id, "records")
        return self.list_visible("work_items", principal_id) if self.has_grant(principal_id, "ledger.read") or self.has_grant(principal_id, "org.admin") else []

    def search(self, principal_id: str, query: str) -> list[dict[str, Any]]:
        self.require_surface(principal_id, "search")
        p = self.principal(principal_id)
        if not self.has_grant(principal_id, "ledger.read") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: search", 403)
        like = f"%{query}%"
        rows = self.conn.execute(
            "SELECT * FROM work_items WHERE tenant_id=? AND title LIKE ?",
            (p["tenant_id"], like),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def aggregates(self, principal_id: str) -> dict[str, int]:
        self.require_surface(principal_id, "aggregates")
        p = self.principal(principal_id)
        if not self.has_grant(principal_id, "ledger.read") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: aggregates", 403)
        count = self.conn.execute(
            "SELECT COUNT(*) AS c FROM work_items WHERE tenant_id=?", (p["tenant_id"],)
        ).fetchone()["c"]
        return {"work_items": int(count)}

    def insert_usage(self, payload: dict[str, Any]) -> str:
        uid = payload.get("event_id") or _id("use")
        self.conn.execute(
            "INSERT INTO usage_events (id, tenant_id, payload) VALUES (?, ?, ?)",
            (uid, payload.get("tenant_id", "tenant-founder"), json.dumps(payload)),
        )
        self.flush()
        return str(uid)

    def usage_count(self) -> int:
        return int(self.conn.execute("SELECT COUNT(*) AS c FROM usage_events").fetchone()["c"])

    def health_db(self) -> str:
        try:
            self.conn.execute("SELECT 1")
            return "ok"
        except sqlite3.Error:
            return "error"

    def get_setting(self, key: str, default: str = "") -> str:
        row = self.conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return str(row["value"]) if row else default

    def set_setting(self, key: str, value: str) -> dict[str, str]:
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        self.flush()
        return {"key": key, "value": value}

    def oq_g2_recorded(self) -> bool:
        return self.get_setting("oq_g2_recorded", "0") in {"1", "true", "yes"}

    def record_oq_g2(self, actor_id: str) -> dict[str, Any]:
        self.set_setting("oq_g2_recorded", "1")
        self.append_audit(actor_id, "settings.oq_g2", "setting", "oq_g2_recorded")
        return {"oq_g2_recorded": True}

    def measurement_notice(self) -> dict[str, Any]:
        return {
            "title": "What Papership measures",
            "owner": "Papership does not own your content. You do.",
            "items": [
                "First-party, in-tenant usage events only.",
                "Identifier and enum fields: event name, ids, seat template, outcome code, token counts, tool-class counts, duration, cost band.",
                "No prompt text, names, emails, file contents, repository diffs, or secrets.",
                "No third-party analytics SDK, pixel, or replay.",
                "Events stay in the tenant store. A second seat is blocked until this notice is accepted (OQ-G2).",
            ],
            "oq_g2_recorded": self.oq_g2_recorded(),
        }

    def list_members(self, principal_id: str) -> list[dict[str, Any]]:
        if not self.has_grant(principal_id, "org.admin") and not self.has_grant(principal_id, "ledger.read"):
            raise StoreError("denied: people", 403)
        p = self.principal(principal_id)
        rows = self.conn.execute(
            """SELECT principals.id, principals.kind, seats.template,
                      member_capacity.availability, member_capacity.workload,
                      member_capacity.leave_reference
               FROM principals
               LEFT JOIN seats ON seats.principal_id = principals.id
               LEFT JOIN member_capacity ON member_capacity.principal_id = principals.id
               WHERE principals.tenant_id=? AND principals.kind='human'
               ORDER BY principals.id""",
            (p["tenant_id"],),
        ).fetchall()
        out = []
        for row in rows:
            item = self.row_to_dict(row)
            item["availability"] = item.get("availability") or "unknown"
            item["workload"] = item.get("workload") or "unknown"
            item["leave_reference"] = item.get("leave_reference") or ""
            item["hr_connector"] = "planned"
            out.append(item)
        return out

    def list_teams(self, principal_id: str) -> list[dict[str, Any]]:
        p = self.principal(principal_id)
        rows = self.conn.execute(
            "SELECT * FROM teams WHERE tenant_id=? ORDER BY name", (p["tenant_id"],)
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def create_team(self, principal_id: str, name: str, department: str = "") -> dict[str, Any]:
        if not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: org.admin", 403)
        if not (name or "").strip():
            raise StoreError("team name is required", 400)
        p = self.principal(principal_id)
        tid = _id("team")
        self.conn.execute(
            "INSERT INTO teams (id, tenant_id, name, department, created_at) VALUES (?, ?, ?, ?, ?)",
            (tid, p["tenant_id"], name, department or name, _now()),
        )
        self.append_audit(principal_id, "team.create", "team", tid)
        self.flush()
        return self.row_to_dict(self.conn.execute("SELECT * FROM teams WHERE id=?", (tid,)).fetchone())  # type: ignore[return-value]

    def organisation(self, principal_id: str) -> dict[str, Any]:
        p = self.principal(principal_id)
        row = self.conn.execute(
            "SELECT * FROM organisations WHERE tenant_id=?", (p["tenant_id"],)
        ).fetchone()
        if not row:
            raise StoreError("organisation not found", 404)
        return self.row_to_dict(row)  # type: ignore[return-value]

    def list_connections(self, principal_id: str) -> list[dict[str, Any]]:
        from app.connectors import list_connectors

        p = self.principal(principal_id)
        stored = {
            r["provider"]: self.row_to_dict(r)
            for r in self.conn.execute(
                "SELECT * FROM connections WHERE tenant_id=?", (p["tenant_id"],)
            ).fetchall()
        }
        out: list[dict[str, Any]] = []
        for spec in list_connectors():
            row = stored.get(spec["id"]) or {}
            public = {k: row[k] for k in ("status", "enabled", "last_sync", "lineage") if row and k in row}
            item = {**spec, **public}
            if not row:
                item["enabled"] = False
                item["has_token"] = False
            else:
                item["enabled"] = bool(row.get("enabled"))
                item["has_token"] = bool(row.get("token_blob"))
            out.append(item)
        return out

    def connect_provider(self, principal_id: str, provider: str) -> dict[str, Any]:
        from app.connectors import get_connector

        spec = get_connector(provider)
        if spec is None:
            raise StoreError("unknown provider", 403)
        if not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: org.admin", 403)
        p = self.principal(principal_id)
        now = _now()
        status = "configured" if spec["id"] == "github" else "planned"
        enabled = 1 if spec["id"] == "github" else 0
        existing = self.conn.execute(
            "SELECT * FROM connections WHERE tenant_id=? AND provider=?",
            (p["tenant_id"], spec["id"]),
        ).fetchone()
        if existing:
            self.conn.execute(
                "UPDATE connections SET status=?, enabled=?, last_sync=? WHERE id=?",
                (status, enabled, now if spec["id"] == "github" else existing["last_sync"], existing["id"]),
            )
            cid = existing["id"]
        else:
            cid = _id("conn")
            self.conn.execute(
                """INSERT INTO connections
                   (id, tenant_id, provider, status, destination_class, enabled, last_sync, lineage, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (cid, p["tenant_id"], spec["id"], status, spec["destination_class"], enabled, now if spec["id"] == "github" else None, "", now),
            )
        self.append_audit(principal_id, "connection.connect", "connection", spec["id"])
        self.flush()
        return {"id": cid, "provider": spec["id"], "status": status, "enabled": bool(enabled), "destination_class": spec["destination_class"]}

    def begin_oauth(self, principal_id: str, spec: dict[str, Any]) -> None:
        if not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: org.admin", 403)
        p = self.principal(principal_id)
        now = _now()
        existing = self.conn.execute(
            "SELECT * FROM connections WHERE tenant_id=? AND provider=?",
            (p["tenant_id"], spec["id"]),
        ).fetchone()
        if existing:
            self.conn.execute(
                "UPDATE connections SET status=?, enabled=0 WHERE id=?",
                ("pending_oauth", existing["id"]),
            )
        else:
            self.conn.execute(
                """INSERT INTO connections
                   (id, tenant_id, provider, status, destination_class, enabled, last_sync, lineage, created_at)
                   VALUES (?, ?, ?, ?, ?, 0, NULL, '', ?)""",
                (_id("conn"), p["tenant_id"], spec["id"], "pending_oauth", spec["destination_class"], now),
            )
        self.append_audit(principal_id, "connection.oauth.start", "connection", spec["id"])
        self.flush()

    def save_oauth_state(
        self, nonce: str, provider: str, principal_id: str, tenant_id: str, expires_at: int
    ) -> None:
        self.conn.execute(
            """INSERT INTO oauth_states
               (nonce, provider, principal_id, tenant_id, expires_at, used, created_at)
               VALUES (?, ?, ?, ?, ?, 0, ?)""",
            (nonce, provider, principal_id, tenant_id, expires_at, _now()),
        )
        self.flush()

    def peek_oauth_state(self, nonce: str) -> dict[str, Any] | None:
        row = self.conn.execute("SELECT * FROM oauth_states WHERE nonce=?", (nonce,)).fetchone()
        if not row or row["used"] or int(row["expires_at"]) < int(time.time()):
            return None
        return self.row_to_dict(row)

    def consume_oauth_state(self, nonce: str) -> dict[str, Any] | None:
        row = self.peek_oauth_state(nonce)
        if row is None:
            return None
        self.conn.execute("UPDATE oauth_states SET used=1 WHERE nonce=?", (nonce,))
        self.flush()
        return row

    def store_oauth_token(self, principal_id: str, spec: dict[str, Any], token_blob: str) -> dict[str, Any]:
        p = self.principal(principal_id)
        now = _now()
        existing = self.conn.execute(
            "SELECT * FROM connections WHERE tenant_id=? AND provider=?",
            (p["tenant_id"], spec["id"]),
        ).fetchone()
        if existing:
            self.conn.execute(
                "UPDATE connections SET status=?, enabled=1, last_sync=?, token_blob=? WHERE id=?",
                ("configured", now, token_blob, existing["id"]),
            )
            cid = existing["id"]
        else:
            cid = _id("conn")
            self.conn.execute(
                """INSERT INTO connections
                   (id, tenant_id, provider, status, destination_class, enabled, last_sync, lineage, created_at, token_blob)
                   VALUES (?, ?, ?, 'configured', ?, 1, ?, '', ?, ?)""",
                (cid, p["tenant_id"], spec["id"], spec["destination_class"], now, now, token_blob),
            )
        self.append_audit(principal_id, "connection.oauth.connected", "connection", spec["id"])
        self.flush()
        return {"id": cid, "provider": spec["id"], "status": "configured", "enabled": True, "has_token": True}

    def record_sync_checkpoint(
        self, principal_id: str, provider: str, lineage: str, label: str = "incremental"
    ) -> dict[str, Any]:
        if provider != "github":
            raise StoreError("sync checkpoints are GitHub-only until another source is enabled", 403)
        p = self.principal(principal_id)
        now = _now()
        row = self.conn.execute(
            "SELECT * FROM connections WHERE tenant_id=? AND provider=?",
            (p["tenant_id"], provider),
        ).fetchone()
        if not row:
            self.connect_provider(principal_id, provider)
            row = self.conn.execute(
                "SELECT * FROM connections WHERE tenant_id=? AND provider=?",
                (p["tenant_id"], provider),
            ).fetchone()
        self.conn.execute(
            "UPDATE connections SET last_sync=?, lineage=? WHERE id=?",
            (now, f"{label}:{lineage}", row["id"]),
        )
        self.flush()
        return {"provider": provider, "last_sync": now, "lineage": f"{label}:{lineage}", "label": label}

    def create_guest(self, actor_id: str, tenant_id: str, scope: str) -> dict[str, Any]:
        if "guest" not in SEAT_TEMPLATES:
            raise StoreError("guest template missing", 403)
        if not self.oq_g2_recorded():
            raise StoreError("guest create refused until oq_g2_recorded", 403)
        invited = self.create_invite(actor_id=actor_id, tenant_id=tenant_id, template="guest", label=scope)
        gid = _id("guest")
        self.conn.execute(
            "INSERT INTO guests (id, tenant_id, principal_id, scope, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (gid, tenant_id, invited["principal_id"], scope or "assigned", "active", _now()),
        )
        self.flush()
        return {**invited, "guest_id": gid, "scope": scope or "assigned", "deny_by_default": True}

    def list_inbox(self, principal_id: str) -> list[dict[str, Any]]:
        p = self.principal(principal_id)
        rows = self.conn.execute(
            "SELECT * FROM inbox_threads WHERE tenant_id=? ORDER BY created_at DESC",
            (p["tenant_id"],),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def capture_usage_baseline(self, principal_id: str) -> dict[str, Any]:
        if not self.has_grant(principal_id, "usage.read") and not self.has_grant(principal_id, "org.admin"):
            raise StoreError("denied: usage", 403)
        p = self.principal(principal_id)
        count = self.usage_count()
        payload = {
            "label": "first-baseline",
            "event_count": count,
            "task_completion": "not_captured" if count == 0 else "recorded",
            "correctness": "not_captured",
            "recovery": "not_captured",
            "operator_intervention": "not_captured",
            "context_switching": "not_captured",
            "cost_per_completed_outcome": "not_captured",
            "reason_if_missing": "no events yet" if count == 0 else "",
        }
        bid = _id("base")
        self.conn.execute(
            "INSERT INTO usage_baselines (id, tenant_id, captured_at, payload) VALUES (?, ?, ?, ?)",
            (bid, p["tenant_id"], _now(), json.dumps(payload)),
        )
        self.flush()
        return {"id": bid, **payload}

    def latest_usage_baseline(self, principal_id: str) -> dict[str, Any] | None:
        p = self.principal(principal_id)
        row = self.conn.execute(
            "SELECT * FROM usage_baselines WHERE tenant_id=? ORDER BY captured_at DESC LIMIT 1",
            (p["tenant_id"],),
        ).fetchone()
        if not row:
            return None
        data = self.row_to_dict(row)
        data["payload"] = json.loads(data["payload"])
        return data  # type: ignore[return-value]

    def list_queued_jobs(self, limit: int = 8) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            """SELECT jobs.*, runs.id AS run_id FROM jobs
               LEFT JOIN runs ON runs.job_id = jobs.id
               WHERE jobs.status='queued' ORDER BY jobs.created_at LIMIT ?""",
            (limit,),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]  # type: ignore[misc]

    def claim_job(self, job_id: str) -> None:
        self.start_job(job_id)

    def _seed_phase4(self, tenant_id: str) -> None:
        now = _now()
        if not self.conn.execute("SELECT 1 FROM teams WHERE tenant_id=?", (tenant_id,)).fetchone():
            self.conn.execute(
                "INSERT INTO teams (id, tenant_id, name, department, created_at) VALUES (?, ?, ?, ?, ?)",
                ("team-platform", tenant_id, "Platform", "Platform", now),
            )
        if not self.conn.execute("SELECT 1 FROM connections WHERE provider='github'").fetchone():
            self.conn.execute(
                """INSERT INTO connections
                   (id, tenant_id, provider, status, destination_class, enabled, last_sync, lineage, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("conn-github", tenant_id, "github", "configured", "source_control", 1, None, "", now),
            )

    def _seed_phase5(self, tenant_id: str) -> None:
        now = _now()
        self.conn.execute(
            """UPDATE memory_items SET title=?, owner_principal_id=?, version=1, content_class='approved',
               content=? WHERE id='mem-1' AND (title='' OR title='mem-1')""",
            ("Seed retained knowledge", "principal-founder", "Governed store seed. No credentials."),
        )
        if not self.conn.execute(
            "SELECT 1 FROM strategy_records WHERE tenant_id=?", (tenant_id,)
        ).fetchone():
            self.conn.execute(
                """INSERT INTO strategy_records
                   (id, tenant_id, kind, title, body, kpi_status, source_bound, created_at, archived_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    "strat-r3",
                    tenant_id,
                    "goal",
                    "Company operations (R3)",
                    "Native goals and capacity. KPI sources are not bound.",
                    "not_captured",
                    0,
                    now,
                    None,
                ),
            )
        if not self.conn.execute(
            "SELECT 1 FROM member_capacity WHERE principal_id='principal-founder'"
        ).fetchone():
            self.conn.execute(
                """INSERT INTO member_capacity
                   (principal_id, tenant_id, availability, workload, leave_reference, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                ("principal-founder", tenant_id, "available", "normal", "", now),
            )


def effective_grants(sponsor: set[str], toolset: set[str], mode: set[str]) -> set[str]:
    return set(sponsor) & set(toolset) & set(mode)


@contextmanager
def open_store(path: str) -> Iterator[Store]:
    store = Store(path)
    try:
        yield store
    finally:
        store.close()
