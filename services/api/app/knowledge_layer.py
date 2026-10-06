"""Workspace foundation reads and the Context Graph overlay.

Tenant comes from the authenticated caller. These reads do not emit usage
events and do not run inside the founder-loop worker.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI
from pydantic import BaseModel, ConfigDict, Field

from app.auth import AuthContext, auth_dep
from app.store import StoreError

LIST_LIMIT = 80
KNOWLEDGE_RESOURCES = (
    {"name": "index", "method": "GET", "path": "/knowledge", "human_writer": False},
    {"name": "objects", "method": "GET", "path": "/knowledge/objects", "human_writer": False},
    {"name": "object", "method": "GET", "path": "/knowledge/objects/{object_id}", "human_writer": False},
    {"name": "version", "method": "POST", "path": "/knowledge/objects/{object_id}/versions", "human_writer": False},
    {"name": "relationship", "method": "POST", "path": "/knowledge/relationships", "human_writer": False},
    {"name": "materials", "method": "GET", "path": "/registry/materials", "human_writer": False},
    {"name": "economics", "method": "POST", "path": "/registry/materials/{object_id}/economics", "human_writer": False},
    {"name": "plans", "method": "POST", "path": "/knowledge/plans", "human_writer": False},
    {"name": "plan", "method": "GET", "path": "/knowledge/plans/{plan_id}", "human_writer": False},
    {"name": "signals", "method": "GET", "path": "/knowledge/plans/{plan_id}/signals", "human_writer": False},
    {"name": "trust", "method": "POST", "path": "/knowledge/trust", "human_writer": True},
    {"name": "impact", "method": "POST", "path": "/knowledge/impact", "human_writer": True},
    {"name": "local-files", "method": "POST", "path": "/knowledge/local-files", "human_writer": False},
    {"name": "local-file", "method": "GET", "path": "/knowledge/local-files/{object_id}", "human_writer": False},
)
PRIVATE_KINDS = ("preferences", "sessions")
RELATIONSHIPS = (
    "requires",
    "recommends",
    "conflicts_with",
    "supersedes",
    "derived_from",
    "validated_by",
    "used_with",
    "compatible_with",
    "scoped_to",
    "owned_by",
    "published_by",
    "retrieved_from",
    "invalidated_by",
    "improved",
    "degraded",
)
CONTEXT_CLASSES = ("source", "approved", "inferred")


def migrate_workspace(store: Any) -> None:
    store.conn.execute(
        """
        CREATE TABLE IF NOT EXISTS agent_profiles (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          principal_id TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          purpose TEXT NOT NULL DEFAULT '',
          sponsor_principal_id TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          context_plan_id TEXT
        )
        """
    )
    for table in ("work_items", "jobs", "runs"):
        columns = {row["name"] for row in store.conn.execute(f"PRAGMA table_info({table})").fetchall()}
        if "context_plan_id" not in columns:
            store.conn.execute(f"ALTER TABLE {table} ADD COLUMN context_plan_id TEXT")
    work_columns = {row["name"] for row in store.conn.execute("PRAGMA table_info(work_items)").fetchall()}
    if "context_refs" not in work_columns:
        store.conn.execute("ALTER TABLE work_items ADD COLUMN context_refs TEXT")
    store.conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS context_objects (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          class TEXT NOT NULL,
          source_kind TEXT NOT NULL,
          source_id TEXT NOT NULL,
          owner_principal_id TEXT,
          created_at TEXT NOT NULL,
          UNIQUE (tenant_id, source_kind, source_id)
        );
        CREATE TABLE IF NOT EXISTS context_versions (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          object_id TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          parent_version_id TEXT,
          digest TEXT NOT NULL,
          class TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE (object_id, version_number)
        );
        CREATE TRIGGER IF NOT EXISTS context_versions_no_update
          BEFORE UPDATE ON context_versions
        BEGIN
          SELECT RAISE(ABORT, 'context version is insert-only');
        END;
        CREATE TABLE IF NOT EXISTS context_relationships (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          from_object_id TEXT NOT NULL,
          to_object_id TEXT NOT NULL,
          relationship TEXT NOT NULL,
          from_version_id TEXT,
          to_version_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS context_sources (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          object_id TEXT NOT NULL,
          locator TEXT NOT NULL,
          retrieved_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS context_plans (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          agent_principal_id TEXT NOT NULL,
          work_item_id TEXT NOT NULL,
          gap TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS context_plan_citations (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          object_id TEXT NOT NULL,
          version_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS material_economics (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          object_id TEXT NOT NULL,
          economic_model TEXT NOT NULL,
          list_usd INTEGER,
          created_at TEXT NOT NULL,
          UNIQUE (tenant_id, object_id)
        );
        CREATE TABLE IF NOT EXISTS context_trust_assessments (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          version_id TEXT NOT NULL,
          verdict TEXT NOT NULL,
          assessed_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS context_impact_observations (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          version_id TEXT NOT NULL,
          work_item_id TEXT NOT NULL,
          outcome TEXT NOT NULL,
          recorded_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        """
    )


def register_routes(app: FastAPI, store: Any) -> None:
    def require_any(ctx: AuthContext, *classes: str) -> None:
        if any(store.has_grant(ctx.principal_id, name) for name in classes):
            return
        raise StoreError("missing grant", 403)

    def require_ledger_reader(ctx: AuthContext) -> None:
        if store.has_grant(ctx.principal_id, "org.admin"):
            return
        if store.has_grant(ctx.principal_id, "ledger.read") and store.has_grant(
            ctx.principal_id, "records.read"
        ):
            return
        raise StoreError("missing grant", 403)

    def require_human(ctx: AuthContext) -> None:
        row = store.conn.execute(
            "SELECT kind FROM principals WHERE id = ? AND tenant_id = ?",
            (ctx.principal_id, ctx.tenant_id),
        ).fetchone()
        if row is None or row["kind"] != "human":
            raise StoreError("missing grant", 403)

    @app.get("/agents")
    def list_agents_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_ledger_reader(ctx)
        return {
            "agents": list_agents(store, ctx.tenant_id),
            "caller_grants": sorted(store.grant_classes(ctx.principal_id)),
        }

    @app.get("/agents/{principal_id}")
    def get_agent_route(principal_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_ledger_reader(ctx)
        return get_agent(store, ctx.tenant_id, principal_id)

    @app.get("/knowledge")
    def knowledge_index_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return {"resources": [dict(row) for row in KNOWLEDGE_RESOURCES]}

    @app.get("/knowledge/objects")
    def list_knowledge_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return {"objects": list_knowledge(store, ctx.tenant_id, ctx.principal_id)}

    @app.get("/registry/materials")
    def list_materials_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return {"materials": list_materials(store, ctx.tenant_id, ctx.principal_id)}

    @app.post("/registry/materials/{object_id}/economics")
    def set_economics_route(
        object_id: str, body: EconomicsBody, ctx: AuthContext = Depends(auth_dep)
    ) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        require_human(ctx)
        return set_material_economics(
            store,
            ctx.tenant_id,
            object_id,
            body.economic_model,
            body.list_usd,
        )

    @app.get("/knowledge/objects/{object_id}")
    def get_knowledge_route(object_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return get_knowledge(store, ctx.tenant_id, ctx.principal_id, object_id)

    @app.post("/knowledge/objects/{object_id}/versions")
    def supersede_route(
        object_id: str, body: SupersedeBody, ctx: AuthContext = Depends(auth_dep)
    ) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        return supersede_version(
            store,
            ctx.tenant_id,
            ctx.principal_id,
            object_id,
            item_class=body.item_class,
            external=body.external,
            can_approve=store.has_grant(ctx.principal_id, "memory.write")
            or store.has_grant(ctx.principal_id, "org.admin"),
        )

    @app.post("/knowledge/relationships")
    def relate_route(body: RelationshipBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        return relate(store, ctx.tenant_id, ctx.principal_id, body)

    @app.post("/knowledge/plans")
    def create_plan_route(body: PlanCreateBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        return create_plan(
            store, ctx.tenant_id, ctx.principal_id, body.agent_principal_id, body.work_item_id
        )

    @app.get("/knowledge/plans/{plan_id}")
    def get_plan_route(plan_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return get_plan(store, ctx.tenant_id, plan_id)

    @app.post("/knowledge/trust")
    def record_trust_route(body: TrustBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        require_human(ctx)
        return record_trust(store, ctx.tenant_id, ctx.principal_id, body.version_id, body.verdict)

    @app.post("/knowledge/local-files")
    def register_local_file_route(body: LocalFileBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        return register_local_file(store, ctx.tenant_id, ctx.principal_id, body.title, body.digest, body.byte_size)

    @app.get("/knowledge/local-files/{object_id}")
    def get_local_file_route(object_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return get_local_file(store, ctx.tenant_id, ctx.principal_id, object_id)

    @app.post("/knowledge/impact")
    def record_impact_route(body: ImpactBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.write", "org.admin")
        require_human(ctx)
        return record_impact(
            store, ctx.tenant_id, ctx.principal_id, body.version_id, body.work_item_id, body.outcome
        )

    @app.get("/knowledge/plans/{plan_id}/signals")
    def plan_signals_route(plan_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_any(ctx, "memory.read", "org.admin")
        return plan_signals(store, ctx.tenant_id, plan_id)

    @app.get("/approvals")
    def list_approvals_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_ledger_reader(ctx)
        return {"approvals": list_approvals(store, ctx.tenant_id)}

    @app.get("/audit")
    def list_audit_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_ledger_reader(ctx)
        return {"records": list_audit(store, ctx.tenant_id)}


def list_agents(store: Any, tenant_id: str) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        """
        SELECT p.id, p.kind, ap.display_name, ap.purpose, ap.status, ap.context_plan_id
        FROM principals p
        LEFT JOIN agent_profiles ap
          ON ap.principal_id = p.id AND ap.tenant_id = p.tenant_id
        WHERE p.tenant_id = ? AND p.kind = 'agent'
        ORDER BY p.id
        """,
        (tenant_id,),
    ).fetchall()
    return [_agent_payload(store, tenant_id, row) for row in rows]


def get_agent(store: Any, tenant_id: str, principal_id: str) -> dict[str, Any]:
    row = store.conn.execute(
        """
        SELECT p.id, p.kind, ap.display_name, ap.purpose, ap.status, ap.context_plan_id
        FROM principals p
        LEFT JOIN agent_profiles ap
          ON ap.principal_id = p.id AND ap.tenant_id = p.tenant_id
        WHERE p.id = ? AND p.tenant_id = ? AND p.kind = 'agent'
        """,
        (principal_id, tenant_id),
    ).fetchone()
    if row is None:
        raise StoreError("agent not found", 404)
    return _agent_payload(store, tenant_id, row)


def _agent_payload(store: Any, tenant_id: str, row: Any) -> dict[str, Any]:
    principal_id = row["id"]
    run = store.conn.execute(
        """
        SELECT id, purpose, created_at FROM runs
        WHERE tenant_id = ? AND acting_identity = ?
        ORDER BY created_at DESC LIMIT 1
        """,
        (tenant_id, principal_id),
    ).fetchone()
    return {
        "principal_id": principal_id,
        "kind": row["kind"],
        "display_name": row["display_name"] or principal_id,
        "purpose": row["purpose"] or "",
        "status": row["status"] or "active",
        "context_plan_id": row["context_plan_id"],
        "grants": sorted(store.grant_classes(principal_id)),
        "task": None
        if run is None
        else {"id": run["id"], "purpose": run["purpose"], "created_at": run["created_at"]},
        "unavailable": ["trust", "impact", "cost", "missing"],
    }


PLAN_GAP = "No visible context is attached to this agent and task."
PLAN_CITATION_CAP = 40


class PlanCreateBody(BaseModel):
    agent_principal_id: str
    work_item_id: str


class TrustBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version_id: str
    verdict: str


class ImpactBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version_id: str
    work_item_id: str
    outcome: str


class LocalFileBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    byte_size: int = Field(ge=0)


class EconomicsBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    economic_model: str = Field(min_length=1)
    list_usd: int | None = Field(default=None, ge=0)


class SupersedeBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    item_class: str = Field(default="", alias="class")
    external: bool = False


class RelationshipBody(BaseModel):
    from_object_id: str
    to_object_id: str
    relationship: str
    from_version_id: str | None = None
    to_version_id: str | None = None


def create_plan(
    store: Any, tenant_id: str, caller_id: str, agent_id: str, work_item_id: str
) -> dict[str, Any]:
    agent = store.conn.execute(
        "SELECT id FROM principals WHERE id = ? AND tenant_id = ? AND kind = 'agent'",
        (agent_id, tenant_id),
    ).fetchone()
    work = store.conn.execute(
        "SELECT id FROM work_items WHERE id = ? AND tenant_id = ?",
        (work_item_id, tenant_id),
    ).fetchone()
    if agent is None or work is None:
        raise StoreError("not found", 404)
    ensure_projected(store, tenant_id, caller_id)
    ensure_pack_pointers(store, tenant_id)
    rows = store.conn.execute(
        """
        SELECT o.id AS object_id, v.id AS version_id
        FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id
          AND v.version_number = (
            SELECT MAX(version_number) FROM context_versions WHERE object_id = o.id
          )
        WHERE o.tenant_id = ?
          AND v.tenant_id = ?
          AND o.kind NOT IN ('preferences', 'sessions')
          AND o.source_kind NOT IN ('registry', 'connection')
          AND (
            o.source_kind IN ('pack', 'artifact', 'attachment')
            OR (o.source_kind = 'memory' AND o.owner_principal_id = ?)
          )
        ORDER BY o.created_at DESC
        LIMIT ?
        """,
        (tenant_id, tenant_id, agent_id, PLAN_CITATION_CAP),
    ).fetchall()
    now = _now()
    plan_id = _digest(tenant_id, agent_id, work_item_id, now)
    gap = None if rows else PLAN_GAP
    store.conn.execute(
        """
        INSERT INTO context_plans
          (id, tenant_id, agent_principal_id, work_item_id, gap, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (plan_id, tenant_id, agent_id, work_item_id, gap, now),
    )
    for row in rows:
        store.conn.execute(
            """
            INSERT INTO context_plan_citations
              (id, tenant_id, plan_id, object_id, version_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (_digest(plan_id, row["version_id"]), tenant_id, plan_id, row["object_id"], row["version_id"], now),
        )
    store.conn.execute(
        "UPDATE work_items SET context_plan_id = ? WHERE id = ? AND tenant_id = ?",
        (plan_id, work_item_id, tenant_id),
    )
    profile = store.conn.execute(
        "SELECT id FROM agent_profiles WHERE principal_id = ? AND tenant_id = ?",
        (agent_id, tenant_id),
    ).fetchone()
    if profile is None:
        store.conn.execute(
            """
            INSERT INTO agent_profiles
              (id, tenant_id, principal_id, display_name, purpose, status, created_at, context_plan_id)
            VALUES (?, ?, ?, ?, '', 'active', ?, ?)
            """,
            (_digest(tenant_id, "profile", agent_id), tenant_id, agent_id, agent_id, now, plan_id),
        )
    else:
        store.conn.execute(
            "UPDATE agent_profiles SET context_plan_id = ? WHERE principal_id = ? AND tenant_id = ?",
            (plan_id, agent_id, tenant_id),
        )
    store.flush()
    return get_plan(store, tenant_id, plan_id)


def get_plan(store: Any, tenant_id: str, plan_id: str) -> dict[str, Any]:
    row = store.conn.execute(
        """
        SELECT id, agent_principal_id, work_item_id, gap
        FROM context_plans WHERE id = ? AND tenant_id = ?
        """,
        (plan_id, tenant_id),
    ).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    citations = store.conn.execute(
        """
        SELECT object_id, version_id FROM context_plan_citations
        WHERE plan_id = ? AND tenant_id = ?
        ORDER BY created_at ASC
        """,
        (plan_id, tenant_id),
    ).fetchall()
    return {
        "id": row["id"],
        "agent_principal_id": row["agent_principal_id"],
        "work_item_id": row["work_item_id"],
        "gap": row["gap"],
        "citations": [{"object_id": item["object_id"], "version_id": item["version_id"]} for item in citations],
    }


TRUST_VERDICTS = {"accepted", "refused"}
IMPACT_OUTCOMES = {"helped", "harmed", "unknown"}
PACK_REVIEW_VERDICTS = {"none", "pending", "accepted", "refused"}


def _visible_version(store: Any, tenant_id: str, caller_id: str, version_id: str) -> Any:
    row = store.conn.execute(
        """
        SELECT v.id, v.class AS version_class, o.kind, o.owner_principal_id, o.source_kind, o.source_id
        FROM context_versions v
        JOIN context_objects o ON o.id = v.object_id AND o.tenant_id = v.tenant_id
        WHERE v.id = ? AND v.tenant_id = ?
        """,
        (version_id, tenant_id),
    ).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    if row["kind"] in PRIVATE_KINDS and row["owner_principal_id"] != caller_id:
        raise StoreError("missing grant", 403)
    return row


def record_trust(store: Any, tenant_id: str, caller_id: str, version_id: str, verdict: str) -> dict[str, Any]:
    if verdict not in TRUST_VERDICTS:
        raise StoreError("unknown verdict", 400)
    _visible_version(store, tenant_id, caller_id, version_id)
    now = _now()
    store.conn.execute(
        """
        INSERT INTO context_trust_assessments
          (id, tenant_id, version_id, verdict, assessed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (_digest(tenant_id, version_id, verdict, now, datetime.now(timezone.utc).timestamp()), tenant_id, version_id, verdict, caller_id, now),
    )
    store.flush()
    return {"version_id": version_id, "verdict": verdict}


def record_impact(
    store: Any,
    tenant_id: str,
    caller_id: str,
    version_id: str,
    work_item_id: str,
    outcome: str,
) -> dict[str, Any]:
    if outcome not in IMPACT_OUTCOMES:
        raise StoreError("unknown outcome", 400)
    _visible_version(store, tenant_id, caller_id, version_id)
    work = store.conn.execute(
        "SELECT id FROM work_items WHERE id = ? AND tenant_id = ?",
        (work_item_id, tenant_id),
    ).fetchone()
    if work is None:
        raise StoreError("not found", 404)
    now = _now()
    store.conn.execute(
        """
        INSERT INTO context_impact_observations
          (id, tenant_id, version_id, work_item_id, outcome, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            _digest(tenant_id, version_id, work_item_id, outcome, now, datetime.now(timezone.utc).timestamp()),
            tenant_id,
            version_id,
            work_item_id,
            outcome,
            caller_id,
            now,
        ),
    )
    store.flush()
    return {"version_id": version_id, "work_item_id": work_item_id, "outcome": outcome}


def plan_signals(store: Any, tenant_id: str, plan_id: str) -> dict[str, Any]:
    plan = get_plan(store, tenant_id, plan_id)
    rows = store.conn.execute(
        """
        SELECT c.version_id, o.source_kind, o.source_id
        FROM context_plan_citations c
        JOIN context_objects o ON o.id = c.object_id AND o.tenant_id = c.tenant_id
        WHERE c.plan_id = ? AND c.tenant_id = ?
        ORDER BY c.created_at ASC
        """,
        (plan_id, tenant_id),
    ).fetchall()
    signals = []
    for row in rows:
        assessment = store.conn.execute(
            """
            SELECT verdict FROM context_trust_assessments
            WHERE tenant_id = ? AND version_id = ?
            ORDER BY created_at DESC, rowid DESC
            LIMIT 1
            """,
            (tenant_id, row["version_id"]),
        ).fetchone()
        trust = None
        if assessment is not None:
            trust = {"verdict": assessment["verdict"], "source": "assessment"}
        elif row["source_kind"] == "pack":
            review = store.conn.execute(
                """
                SELECT verdict FROM pack_trust_reviews
                WHERE tenant_id = ? AND pack_id = ?
                ORDER BY updated_at DESC, rowid DESC
                LIMIT 1
                """,
                (tenant_id, row["source_id"]),
            ).fetchone()
            if review is not None and review["verdict"] in PACK_REVIEW_VERDICTS:
                trust = {"verdict": review["verdict"], "source": "pack_review"}
        impact = store.conn.execute(
            """
            SELECT outcome FROM context_impact_observations
            WHERE tenant_id = ? AND version_id = ? AND work_item_id = ?
            ORDER BY created_at DESC, rowid DESC
            LIMIT 1
            """,
            (tenant_id, row["version_id"], plan["work_item_id"]),
        ).fetchone()
        signals.append(
            {
                "version_id": row["version_id"],
                "trust": trust,
                "impact": None if impact is None else impact["outcome"],
            }
        )
    return {"plan_id": plan_id, "signals": signals}


def list_materials(store: Any, tenant_id: str, caller_id: str) -> list[dict[str, Any]]:
    ensure_projected(store, tenant_id, caller_id)
    ensure_pack_pointers(store, tenant_id)
    rows = store.conn.execute(
        """
        SELECT o.id, o.kind, o.class, o.title, s.locator, e.economic_model, e.list_usd
        FROM context_objects o
        JOIN context_sources s ON s.object_id = o.id
        LEFT JOIN material_economics e ON e.object_id = o.id AND e.tenant_id = o.tenant_id
        WHERE o.tenant_id = ?
          AND o.source_kind IN ('pack', 'artifact', 'attachment')
          AND (o.kind NOT IN ('preferences', 'sessions') OR o.owner_principal_id = ?)
        ORDER BY o.created_at DESC
        LIMIT ?
        """,
        (tenant_id, caller_id, LIST_LIMIT),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "kind": row["kind"],
            "class": row["class"],
            "locator": row["locator"],
            "object_id": row["id"],
            "economic_model": row["economic_model"],
            "list_usd": row["list_usd"],
        }
        for row in rows
    ]


ECONOMIC_MODELS = ("free", "listed", "unavailable")


def set_material_economics(
    store: Any,
    tenant_id: str,
    object_id: str,
    economic_model: str,
    list_usd: int | None,
) -> dict[str, Any]:
    if economic_model not in ECONOMIC_MODELS:
        raise StoreError("unknown economic model", 422)
    if economic_model == "listed":
        if list_usd is None:
            raise StoreError("listed model needs a list amount", 422)
    elif list_usd is not None:
        raise StoreError("this model stores no amount", 422)
    material = store.conn.execute(
        """
        SELECT id FROM context_objects
        WHERE id = ? AND tenant_id = ? AND source_kind IN ('pack', 'artifact', 'attachment')
        """,
        (object_id, tenant_id),
    ).fetchone()
    if material is None:
        raise StoreError("not found", 404)
    now = _now()
    existing = store.conn.execute(
        "SELECT id FROM material_economics WHERE tenant_id = ? AND object_id = ?",
        (tenant_id, object_id),
    ).fetchone()
    if existing is None:
        store.conn.execute(
            """
            INSERT INTO material_economics
              (id, tenant_id, object_id, economic_model, list_usd, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (_digest(tenant_id, object_id, economic_model), tenant_id, object_id, economic_model, list_usd, now),
        )
    else:
        store.conn.execute(
            """
            UPDATE material_economics
            SET economic_model = ?, list_usd = ?
            WHERE id = ? AND tenant_id = ?
            """,
            (economic_model, list_usd, existing["id"], tenant_id),
        )
    store.flush()
    return {"object_id": object_id, "economic_model": economic_model, "list_usd": list_usd}


def ensure_pack_pointers(store: Any, tenant_id: str) -> None:
    from app.phase7 import PACKS

    now = _now()
    for pack in PACKS.values():
        _project(
            store,
            tenant_id,
            kind="pack",
            title=str(pack.get("label") or pack["id"]),
            item_class="inferred",
            source_kind="pack",
            source_id=str(pack["id"]),
            owner_principal_id=None,
            locator=str(pack["id"]),
            created_at=now,
        )
    store.flush()


def list_knowledge(store: Any, tenant_id: str, caller_id: str) -> list[dict[str, Any]]:
    ensure_projected(store, tenant_id, caller_id)
    rows = store.conn.execute(
        """
        SELECT o.id, o.kind, o.class, o.title, o.source_kind, o.source_id,
               o.owner_principal_id, v.version_number, v.id AS version_id, s.locator,
               (SELECT COUNT(*) FROM context_relationships r
                 WHERE r.tenant_id = o.tenant_id
                   AND (r.from_object_id = o.id OR r.to_object_id = o.id)) AS relationship_count
        FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id
          AND v.version_number = (
            SELECT MAX(version_number) FROM context_versions WHERE object_id = o.id
          )
        JOIN context_sources s ON s.object_id = o.id
        WHERE o.tenant_id = ?
          AND (o.kind NOT IN ('preferences', 'sessions') OR o.owner_principal_id = ?)
          AND (o.source_kind != 'local_file' OR o.owner_principal_id = ?)
        ORDER BY o.created_at DESC
        LIMIT ?
        """,
        (tenant_id, caller_id, caller_id, LIST_LIMIT),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "kind": row["kind"],
            "class": row["class"],
            "version": row["version_number"],
            "version_id": row["version_id"],
            "title": row["title"],
            "source": "" if row["source_kind"] == "local_file" and not str(row["locator"]).isdigit() else row["locator"],
            "source_kind": row["source_kind"],
            "source_id": row["source_id"],
            "owner_principal_id": row["owner_principal_id"],
            "relationship_count": row["relationship_count"],
        }
        for row in rows
    ]


def get_knowledge(store: Any, tenant_id: str, caller_id: str, object_id: str) -> dict[str, Any]:
    ensure_projected(store, tenant_id, caller_id)
    row = store.conn.execute(
        "SELECT * FROM context_objects WHERE id = ? AND tenant_id = ?",
        (object_id, tenant_id),
    ).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    if row["kind"] in PRIVATE_KINDS and row["owner_principal_id"] != caller_id:
        raise StoreError("missing grant", 403)
    if row["source_kind"] == "local_file" and row["owner_principal_id"] != caller_id:
        raise StoreError("not found", 404)
    versions = store.conn.execute(
        """
        SELECT id, version_number, parent_version_id, digest, class, created_at
        FROM context_versions WHERE object_id = ? ORDER BY version_number ASC
        """,
        (object_id,),
    ).fetchall()
    relationships = store.conn.execute(
        """
        SELECT id, from_object_id, to_object_id, relationship, from_version_id, to_version_id
        FROM context_relationships
        WHERE tenant_id = ? AND (from_object_id = ? OR to_object_id = ?)
        ORDER BY created_at ASC
        """,
        (tenant_id, object_id, object_id),
    ).fetchall()
    source = store.conn.execute(
        "SELECT locator, retrieved_at FROM context_sources WHERE object_id = ?",
        (object_id,),
    ).fetchone()
    return {
        "object": {
            "id": row["id"],
            "kind": row["kind"],
            "class": row["class"],
            "title": row["title"],
            "source_kind": row["source_kind"],
            "source_id": row["source_id"],
            "owner_principal_id": row["owner_principal_id"],
        },
        "versions": [dict(item) for item in versions],
        "relationships": [dict(item) for item in relationships],
        "source": None if source is None else {
            "locator": ""
            if row["source_kind"] == "local_file" and not str(source["locator"]).isdigit()
            else source["locator"],
            "retrieved_at": source["retrieved_at"],
        },
    }


def register_local_file(
    store: Any,
    tenant_id: str,
    caller_id: str,
    title: str,
    digest: str,
    byte_size: int,
) -> dict[str, Any]:
    source_id = f"{caller_id}:{digest}"
    found = store.conn.execute(
        """
        SELECT id FROM context_objects
        WHERE tenant_id = ? AND source_kind = 'local_file' AND source_id = ?
        """,
        (tenant_id, source_id),
    ).fetchone()
    if found is None:
        now = _now()
        object_id = _object_id(tenant_id, "local_file", source_id)
        version_id = _version_id(tenant_id, object_id, 1, "source", "local_file", source_id, digest)
        store.conn.execute(
            """
            INSERT INTO context_objects
              (id, tenant_id, kind, title, class, source_kind, source_id, owner_principal_id, created_at)
            VALUES (?, ?, 'local_file', ?, 'source', 'local_file', ?, ?, ?)
            """,
            (object_id, tenant_id, title.strip(), source_id, caller_id, now),
        )
        store.conn.execute(
            """
            INSERT INTO context_versions
              (id, tenant_id, object_id, version_number, parent_version_id, digest, class, created_at)
            VALUES (?, ?, ?, 1, NULL, ?, 'source', ?)
            """,
            (version_id, tenant_id, object_id, digest, now),
        )
        store.conn.execute(
            """
            INSERT INTO context_sources (id, tenant_id, object_id, locator, retrieved_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (_object_id(tenant_id, "locator", object_id), tenant_id, object_id, str(byte_size), now),
        )
        store.flush()
    return get_local_file(store, tenant_id, caller_id, found["id"] if found is not None else object_id)


def get_local_file(store: Any, tenant_id: str, caller_id: str, object_id: str) -> dict[str, Any]:
    row = store.conn.execute(
        """
        SELECT o.id, o.title, o.owner_principal_id, v.digest, v.id AS version_id, s.locator
        FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id AND v.version_number = 1
        JOIN context_sources s ON s.object_id = o.id
        WHERE o.id = ? AND o.tenant_id = ? AND o.source_kind = 'local_file'
        """,
        (object_id, tenant_id),
    ).fetchone()
    if row is None or row["owner_principal_id"] != caller_id or not str(row["locator"]).isdigit():
        raise StoreError("not found", 404)
    return {
        "id": row["id"],
        "title": row["title"],
        "digest": row["digest"],
        "byte_size": int(row["locator"]),
        "version_id": row["version_id"],
    }


def supersede_version(
    store: Any,
    tenant_id: str,
    caller_id: str,
    object_id: str,
    *,
    item_class: str,
    external: bool,
    can_approve: bool,
) -> dict[str, Any]:
    ensure_projected(store, tenant_id, caller_id)
    row = store.conn.execute(
        "SELECT * FROM context_objects WHERE id = ? AND tenant_id = ?",
        (object_id, tenant_id),
    ).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    if row["kind"] in PRIVATE_KINDS and row["owner_principal_id"] != caller_id:
        raise StoreError("missing grant", 403)
    chosen = item_class.strip()
    if external and chosen != "approved":
        chosen = "inferred"
    elif not chosen:
        chosen = row["class"]
    if chosen not in CONTEXT_CLASSES:
        raise StoreError("unknown class", 400)
    if chosen == "approved" and not can_approve:
        raise StoreError("missing grant", 403)
    current = store.conn.execute(
        """
        SELECT id, version_number FROM context_versions
        WHERE object_id = ? ORDER BY version_number DESC LIMIT 1
        """,
        (object_id,),
    ).fetchone()
    source = store.conn.execute(
        "SELECT locator FROM context_sources WHERE object_id = ?",
        (object_id,),
    ).fetchone()
    locator = source["locator"] if source else row["source_id"]
    number = int(current["version_number"]) + 1 if current else 1
    digest = _digest(row["title"], row["kind"], chosen, row["source_kind"], row["source_id"], locator)
    version_id = _version_id(
        tenant_id, object_id, number, chosen, row["source_kind"], row["source_id"], digest
    )
    now = _now()
    store.conn.execute(
        """
        INSERT INTO context_versions
          (id, tenant_id, object_id, version_number, parent_version_id, digest, class, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            version_id,
            tenant_id,
            object_id,
            number,
            None if current is None else current["id"],
            digest,
            chosen,
            now,
        ),
    )
    store.conn.execute(
        "UPDATE context_objects SET class = ? WHERE id = ? AND tenant_id = ?",
        (chosen, object_id, tenant_id),
    )
    store.flush()
    return {"id": version_id, "version": number, "class": chosen, "digest": digest}


def relate(store: Any, tenant_id: str, caller_id: str, body: RelationshipBody) -> dict[str, Any]:
    if body.relationship not in RELATIONSHIPS:
        raise StoreError("unknown relationship", 400)
    ensure_projected(store, tenant_id, caller_id)
    for object_id in (body.from_object_id, body.to_object_id):
        row = store.conn.execute(
            "SELECT kind, owner_principal_id FROM context_objects WHERE id = ? AND tenant_id = ?",
            (object_id, tenant_id),
        ).fetchone()
        if row is None:
            raise StoreError("not found", 404)
        if row["kind"] in PRIVATE_KINDS and row["owner_principal_id"] != caller_id:
            raise StoreError("missing grant", 403)
    for version_id, object_id in (
        (body.from_version_id, body.from_object_id),
        (body.to_version_id, body.to_object_id),
    ):
        if not version_id:
            continue
        found = store.conn.execute(
            "SELECT 1 FROM context_versions WHERE id = ? AND object_id = ? AND tenant_id = ?",
            (version_id, object_id, tenant_id),
        ).fetchone()
        if found is None:
            raise StoreError("not found", 404)
    now = _now()
    edge_id = _digest(tenant_id, body.from_object_id, body.to_object_id, body.relationship, now)
    store.conn.execute(
        """
        INSERT INTO context_relationships
          (id, tenant_id, from_object_id, to_object_id, relationship,
           from_version_id, to_version_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            edge_id,
            tenant_id,
            body.from_object_id,
            body.to_object_id,
            body.relationship,
            body.from_version_id,
            body.to_version_id,
            now,
        ),
    )
    store.flush()
    return {"id": edge_id, "relationship": body.relationship}


def ensure_projected(store: Any, tenant_id: str, caller_id: str) -> None:
    memory = store.conn.execute(
        """
        SELECT id, kind, class, title, owner_principal_id, provenance, created_at
        FROM memory_items
        WHERE tenant_id = ? AND (deleted_at IS NULL OR deleted_at = '')
        """,
        (tenant_id,),
    ).fetchall()
    for row in memory:
        if row["kind"] in PRIVATE_KINDS and row["owner_principal_id"] != caller_id:
            continue
        _project(
            store,
            tenant_id,
            kind=row["kind"],
            title=row["title"] or row["id"],
            item_class=row["class"] if row["class"] in CONTEXT_CLASSES else "source",
            source_kind="memory",
            source_id=row["id"],
            owner_principal_id=row["owner_principal_id"],
            locator=_source(row["provenance"]) or row["id"],
            created_at=row["created_at"],
        )
    artifacts = store.conn.execute(
        """
        SELECT id, title, ledger_path, created_at
        FROM loop_stage_artifacts WHERE tenant_id = ?
        """,
        (tenant_id,),
    ).fetchall()
    for row in artifacts:
        _project(
            store,
            tenant_id,
            kind="artifact",
            title=row["title"],
            item_class="source",
            source_kind="artifact",
            source_id=row["id"],
            owner_principal_id=None,
            locator=row["ledger_path"] or row["id"],
            created_at=row["created_at"],
        )
    attachments = store.conn.execute(
        "SELECT id, label, created_at FROM attachments WHERE tenant_id = ?",
        (tenant_id,),
    ).fetchall()
    for row in attachments:
        _project(
            store,
            tenant_id,
            kind="attachment",
            title=row["label"],
            item_class="source",
            source_kind="attachment",
            source_id=row["id"],
            owner_principal_id=None,
            locator=row["id"],
            created_at=row["created_at"],
        )
    connections = store.conn.execute(
        "SELECT id, provider, created_at FROM connections WHERE tenant_id = ?",
        (tenant_id,),
    ).fetchall()
    for row in connections:
        _project(
            store,
            tenant_id,
            kind="connection",
            title=row["provider"],
            item_class="source",
            source_kind="connection",
            source_id=row["id"],
            owner_principal_id=None,
            locator=row["id"],
            created_at=row["created_at"],
        )
    registry = store.conn.execute("SELECT capability_id FROM registry").fetchall()
    now = _now()
    for row in registry:
        _project(
            store,
            tenant_id,
            kind="registry",
            title=row["capability_id"],
            item_class="source",
            source_kind="registry",
            source_id=row["capability_id"],
            owner_principal_id=None,
            locator=row["capability_id"],
            created_at=now,
        )
    store.flush()


def _project(
    store: Any,
    tenant_id: str,
    *,
    kind: str,
    title: str,
    item_class: str,
    source_kind: str,
    source_id: str,
    owner_principal_id: str | None,
    locator: str,
    created_at: str,
) -> None:
    found = store.conn.execute(
        """
        SELECT id FROM context_objects
        WHERE tenant_id = ? AND source_kind = ? AND source_id = ?
        """,
        (tenant_id, source_kind, source_id),
    ).fetchone()
    if found is not None:
        return
    object_id = _object_id(tenant_id, source_kind, source_id)
    digest = _digest(title, kind, item_class, source_kind, source_id, locator)
    version_id = _version_id(tenant_id, object_id, 1, item_class, source_kind, source_id, digest)
    store.conn.execute(
        """
        INSERT INTO context_objects
          (id, tenant_id, kind, title, class, source_kind, source_id, owner_principal_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (object_id, tenant_id, kind, title, item_class, source_kind, source_id, owner_principal_id, created_at),
    )
    store.conn.execute(
        """
        INSERT INTO context_versions
          (id, tenant_id, object_id, version_number, parent_version_id, digest, class, created_at)
        VALUES (?, ?, ?, 1, NULL, ?, ?, ?)
        """,
        (version_id, tenant_id, object_id, digest, item_class, created_at),
    )
    store.conn.execute(
        """
        INSERT INTO context_sources (id, tenant_id, object_id, locator, retrieved_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (_object_id(tenant_id, "locator", object_id), tenant_id, object_id, locator, created_at),
    )


def list_approvals(store: Any, tenant_id: str) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        """
        SELECT id, approval_class, requester_id, target_id, target_version, status
        FROM approvals
        WHERE tenant_id = ?
        ORDER BY rowid DESC
        LIMIT ?
        """,
        (tenant_id, LIST_LIMIT),
    ).fetchall()
    return [dict(row) for row in rows]


def list_audit(store: Any, tenant_id: str) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        """
        SELECT actor_principal_id, action, target_type, target_id, created_at
        FROM audit_records
        WHERE tenant_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (tenant_id, LIST_LIMIT),
    ).fetchall()
    return [
        {
            "actor_id": row["actor_principal_id"],
            "action": row["action"],
            "target_type": row["target_type"],
            "target_id": row["target_id"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _object_id(tenant_id: str, source_kind: str, source_id: str) -> str:
    return hashlib.sha256(f"{tenant_id}\n{source_kind}\n{source_id}".encode()).hexdigest()


def _digest(*parts: object) -> str:
    text = "\n".join("" if part is None else str(part) for part in parts)
    return hashlib.sha256(text.encode()).hexdigest()


def _version_id(
    tenant_id: str,
    object_id: str,
    version_number: int,
    item_class: str,
    source_kind: str,
    source_id: str,
    digest: str,
) -> str:
    return _digest(tenant_id, object_id, version_number, item_class, source_kind, source_id, digest)


def _source(provenance: str) -> str:
    raw = provenance or ""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return raw[:120]
    if isinstance(parsed, dict):
        return str(parsed.get("source") or parsed.get("kind") or "recorded")[:120]
    return raw[:120]
