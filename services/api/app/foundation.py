"""Papership platform foundation: Workspace tasks, Studio blueprints, Exchange (simulated), one connected flow.

Four products share one application and one store:

- Registry (`registry.py`, `ar_*`): versioned Agent Materials, resolver, installs. Reused here, not duplicated.
- Studio (this module, `fd_blueprints*`): a blueprint is reusable configuration with an exact, locked set of
  materials. Saving a version resolves dependencies; versions are immutable.
- Workspace (this module, `fd_agents`, `fd_tasks`, `fd_runs`, `fd_approvals`, `fd_activity`): an agent is an
  organisation-owned instance of a blueprint version; a run is one execution; an approval decides one exact
  proposed action.
- Exchange (this module, `fd_quotes`, `fd_jobs`): a demo market for performed work. Every amount, provider and
  result is simulated. No wallet, payment processor, provider or external execution exists.

Honest limits, all stated in responses and docs/platform: the runtime is deterministic and calls no model; the
CRM is a local table; demo identity is the seeded local founder; concurrency is one SQLite connection guarded by
the store lock; amounts are integer minor units with a currency, never real money.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Path, Query
from pydantic import BaseModel, ConfigDict, Field

from app import foundation_demo as demo
from app import registry
from app.auth import AuthContext, auth_dep
from app.store import StoreError, _id

QUOTE_TTL_SECONDS = 15 * 60
MAX_BLUEPRINTS = 100
MAX_AGENTS = 100
MAX_TASKS = 1000
MAX_RESULT_CHARS = 8000
SLUG_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,38}", re.ASCII)
FIELD_RE = re.compile(r"[a-z][a-z0-9_]{0,40}", re.ASCII)
FIELD_TYPES = ("string", "number", "boolean", "object", "array")
SUPPORTED_ADAPTERS = (demo.ADAPTER,)
PLANNED_ADAPTERS = ("hermes", "claude-code", "openai-agents", "langgraph")
SUPPORTED_DEPLOY_TARGETS = ("export-only",)
PLANNED_DEPLOY_TARGETS = ("papership-cloud", "self-hosted", "vercel")
TOOLS = {
    "mock-crm": {
        "label": "Mock CRM",
        "mode": "simulated",
        "accesses": ["read", "propose_write"],
        "note": "A local table. No real CRM is reachable and no credential is used.",
    }
}
CHECK_TYPES = ("has_field", "contains", "not_contains", "action_requires_approval", "uses_material")
PRODUCTS = ("workspace", "registry", "studio", "exchange")

TASK_TRANSITIONS = {
    "open": {"in_progress", "cancelled"},
    "in_progress": {"awaiting_approval", "done", "open", "cancelled"},
    "awaiting_approval": {"done", "open", "cancelled"},
    "done": set(),
    "cancelled": set(),
}
RUN_TRANSITIONS = {
    "queued": {"running", "cancelled"},
    "running": {"awaiting_approval", "completed", "failed", "cancelled"},
    "awaiting_approval": {"completed", "cancelled", "failed"},
    "completed": set(),
    "failed": set(),
    "cancelled": set(),
}
JOB_TRANSITIONS = {
    "accepted": {"running", "cancelled"},
    "running": {"delivered", "cancelled"},
    "delivered": {"validated", "validation_failed"},
    "validated": set(),
    "validation_failed": set(),
    "cancelled": set(),
}

CAPABILITY_MATRIX: list[dict[str, str]] = [
    {"product": "workspace", "id": "agents-tasks", "label": "Agents, tasks, runs, activity", "status": "implemented", "note": "Persisted, org-scoped, explicit state transitions."},
    {"product": "workspace", "id": "demo-runtime", "label": "Deterministic demo runtime", "status": "simulated", "note": "Template output. No model inference."},
    {"product": "workspace", "id": "approvals", "label": "Approvals for exact proposals", "status": "implemented", "note": "Stale and duplicate decisions rejected; enforced in the service path."},
    {"product": "workspace", "id": "external-actions", "label": "Email and CRM actions", "status": "simulated", "note": "A local CRM table is updated after approval. No email is sent."},
    {"product": "workspace", "id": "external-agents", "label": "Supervising third-party agents", "status": "unsupported", "note": "No integration exposes observe, invoke, pause or cancel yet."},
    {"product": "registry", "id": "materials", "label": "Publish, search, version, install materials", "status": "implemented", "note": "Local registry, immutable versions, semver ranges, dependencies."},
    {"product": "registry", "id": "resolver", "label": "Deterministic resolver", "status": "implemented", "note": "Constraints and dependencies only. No semantic search, no verification scores."},
    {"product": "registry", "id": "paid-materials", "label": "Paid and metered installs", "status": "unsupported", "note": "Price is metadata. No live purchase."},
    {"product": "registry", "id": "tested-compatibility", "label": "Tested compatibility", "status": "planned", "note": "Only publisher-declared compatibility exists."},
    {"product": "studio", "id": "builder", "label": "Blueprint builder, locks, versions", "status": "implemented", "note": "Immutable versions with a saved resolver lock."},
    {"product": "studio", "id": "fixture-evals", "label": "Fixture evaluation runner", "status": "implemented", "note": "Deterministic structure and policy checks. Not model task success."},
    {"product": "studio", "id": "publish-local", "label": "Publish blueprint to local Registry", "status": "implemented", "note": "Private bundle by default."},
    {"product": "studio", "id": "deploy", "label": "Deployment and external publication", "status": "unsupported", "note": "Export only. No deploy backend."},
    {"product": "exchange", "id": "catalogue-quotes-jobs", "label": "Catalogue, quotes, jobs, budgets", "status": "simulated", "note": "Whole transaction is simulated, including providers and results."},
    {"product": "exchange", "id": "disputes-refunds", "label": "Disputes and refunds", "status": "planned", "note": "Status placeholders only."},
    {"product": "exchange", "id": "payments", "label": "Wallet, payments, payouts, escrow", "status": "unsupported", "note": "Behind a future settlement adapter. Not built."},
]
INTEGRATIONS = [
    {"id": demo.ADAPTER, "label": "Papership demo runtime", "kind": "runtime", "status": "implemented",
     "controls": {"observe": True, "invoke": True, "pause": True, "cancel": True, "enforce_approval": True}},
    {"id": "mock-crm", "label": "Mock CRM", "kind": "tool", "status": "simulated",
     "controls": {"observe": True, "invoke": True, "pause": False, "cancel": False, "enforce_approval": True}},
    {"id": "third-party-agent", "label": "Third-party agent (any)", "kind": "runtime", "status": "unsupported",
     "controls": {"observe": False, "invoke": False, "pause": False, "cancel": False, "enforce_approval": False}},
]


# ---- small helpers -------------------------------------------------------------------------------


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _plus(ts: str, seconds: int) -> str:
    base = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    return (base + timedelta(seconds=seconds)).strftime("%Y-%m-%dT%H:%M:%SZ")


def canon(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(obj: Any) -> str:
    return hashlib.sha256(canon(obj).encode("utf-8")).hexdigest()


def disabled_products() -> set[str]:
    raw = os.environ.get("PAPERSHIP_DISABLED_PRODUCTS", "")
    return {p.strip().lower() for p in raw.split(",") if p.strip()}


def guard(product: str) -> None:
    if product in disabled_products():
        raise StoreError(f"{product} is disabled in this deployment", 404)


def _loads(text: str | None, default: Any = None) -> Any:
    return json.loads(text) if text else default


def _check_transition(table: dict[str, set[str]], current: str, new: str, what: str) -> None:
    if new not in table.get(current, set()):
        raise StoreError(f"{what} cannot move from {current} to {new}", 409)


MAX_JSON_BYTES = 20_000
MAX_VERSIONS = 200
MAX_QUOTES = 500


def _plain(value: Any, label: str, depth: int = 0) -> None:
    """Reject invisible formatting (bidi, zero width) and control characters other than newline and tab."""
    if depth > 6:
        raise StoreError(f"{label} is nested too deeply", 422)
    if isinstance(value, str):
        if any(unicodedata.category(ch) == "Cf" or (unicodedata.category(ch) == "Cc" and ch not in "\n\t") for ch in value):
            raise StoreError(f"{label} must not contain control or invisible formatting characters", 422)
    elif isinstance(value, dict):
        for k, v in value.items():
            _plain(k, label, depth + 1)
            _plain(v, label, depth + 1)
    elif isinstance(value, list):
        for v in value:
            _plain(v, label, depth + 1)


def _bounded(value: Any, label: str) -> None:
    if len(canon(value)) > MAX_JSON_BYTES:
        raise StoreError(f"{label} is too large (limit {MAX_JSON_BYTES} bytes)", 422)
    _plain(value, label)


def _text(value: Any, label: str, limit: int, *, minimum: int = 1) -> str:
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= limit:
        raise StoreError(f"{label} must be text of {minimum} to {limit} characters", 422)
    _plain(value, label)
    return value.strip()


def _strings(value: Any, out: list[str]) -> None:
    if isinstance(value, str):
        out.append(value)
    elif isinstance(value, dict):
        for k, v in value.items():
            _strings(k, out)
            _strings(v, out)
    elif isinstance(value, list):
        for v in value:
            _strings(v, out)


def _scan(value: Any, what: str) -> None:
    """Scan each string on its own (JSON escaping would hide quoted assignments) and the whole value."""
    parts: list[str] = []
    _strings(value, parts)
    if any(registry.credential_like(s) for s in parts) or registry.credential_like(json.dumps(value, ensure_ascii=False)):
        raise StoreError(f"{what} must not contain credentials", 422)


# ---- storage -------------------------------------------------------------------------------------


def migrate(store: Any) -> None:
    store.conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS fd_blueprints (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL,
          created_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (tenant_id, slug)
        );
        CREATE TABLE IF NOT EXISTS fd_blueprint_versions (
          id TEXT PRIMARY KEY, blueprint_id TEXT NOT NULL, tenant_id TEXT NOT NULL, version INTEGER NOT NULL,
          config_json TEXT NOT NULL, lock_json TEXT NOT NULL, content_hash TEXT NOT NULL,
          created_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (blueprint_id, version)
        );
        CREATE TABLE IF NOT EXISTS fd_eval_runs (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, blueprint_version_id TEXT NOT NULL, method TEXT NOT NULL,
          scope TEXT NOT NULL, results_json TEXT NOT NULL, passed INTEGER NOT NULL, total INTEGER NOT NULL,
          created_by TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_agents (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, blueprint_id TEXT NOT NULL, blueprint_version_id TEXT NOT NULL,
          name TEXT NOT NULL, runtime TEXT NOT NULL, status TEXT NOT NULL, created_by TEXT NOT NULL,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_installs (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, agent_id TEXT NOT NULL, package_name TEXT NOT NULL,
          version TEXT NOT NULL, content_hash TEXT NOT NULL, source TEXT NOT NULL, requested_constraint TEXT NOT NULL,
          installed_by TEXT NOT NULL, installed_at TEXT NOT NULL, UNIQUE (agent_id, package_name)
        );
        CREATE TABLE IF NOT EXISTS fd_contacts (
          tenant_id TEXT NOT NULL, contact_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
          stage TEXT NOT NULL, notes_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL,
          PRIMARY KEY (tenant_id, contact_id)
        );
        CREATE TABLE IF NOT EXISTS fd_tasks (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, title TEXT NOT NULL, input_json TEXT NOT NULL,
          agent_id TEXT NOT NULL, status TEXT NOT NULL, result_text TEXT NOT NULL DEFAULT '',
          result_version INTEGER NOT NULL DEFAULT 0, result_run_id TEXT NOT NULL DEFAULT '', result_edited_by TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_runs (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, task_id TEXT NOT NULL, agent_id TEXT NOT NULL,
          status TEXT NOT NULL, adapter TEXT NOT NULL, outputs_json TEXT NOT NULL DEFAULT '{}',
          note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_approvals (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, task_id TEXT NOT NULL, run_id TEXT NOT NULL,
          kind TEXT NOT NULL, payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL, status TEXT NOT NULL,
          requested_by TEXT NOT NULL, decided_by TEXT NOT NULL DEFAULT '', decided_at TEXT NOT NULL DEFAULT '',
          decision_note TEXT NOT NULL DEFAULT '', action_result_json TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_activity (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, task_id TEXT NOT NULL DEFAULT '', entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL, kind TEXT NOT NULL, actor TEXT NOT NULL, detail_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS fd_activity_task ON fd_activity (tenant_id, task_id, created_at);
        CREATE TABLE IF NOT EXISTS fd_exchange_policy (
          tenant_id TEXT PRIMARY KEY, currency TEXT NOT NULL, budget_limit_minor INTEGER NOT NULL,
          approval_threshold_minor INTEGER NOT NULL, reserved_minor INTEGER NOT NULL DEFAULT 0,
          spent_simulated_minor INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_quotes (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, capability_id TEXT NOT NULL, task_id TEXT NOT NULL DEFAULT '',
          input_json TEXT NOT NULL, estimate_minor INTEGER NOT NULL, currency TEXT NOT NULL, expires_at TEXT NOT NULL,
          status TEXT NOT NULL, policy_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS fd_jobs (
          id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, quote_id TEXT NOT NULL UNIQUE, capability_id TEXT NOT NULL,
          task_id TEXT NOT NULL DEFAULT '', approval_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
          authorised_minor INTEGER NOT NULL, usage_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL,
          result_json TEXT NOT NULL DEFAULT '', validation_json TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        """
    )
    store.flush()


def log(store: Any, tenant: str, actor: str, kind: str, entity_type: str, entity_id: str,
        detail: dict[str, Any] | None = None, task_id: str = "") -> None:
    store.conn.execute(
        """INSERT INTO fd_activity (id, tenant_id, task_id, entity_type, entity_id, kind, actor, detail_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (_id("act"), tenant, task_id, entity_type, entity_id, kind, actor, canon(detail or {}), now()),
    )


# ---- Studio: blueprint validation and resolver ---------------------------------------------------


def _field_list(raw: Any, label: str) -> list[dict[str, Any]]:
    if not isinstance(raw, list) or len(raw) > 20:
        raise StoreError(f"{label} must be a list of at most 20 fields", 422)
    out = []
    for f in raw:
        if not isinstance(f, dict) or set(f) - {"name", "type", "required"}:
            raise StoreError(f"each {label} entry is {{name, type, required}}", 422)
        if not isinstance(f.get("name"), str) or not FIELD_RE.fullmatch(f["name"]) or f.get("type") not in FIELD_TYPES:
            raise StoreError(f"{label} fields need a lowercase name and a type of {', '.join(FIELD_TYPES)}", 422)
        out.append({"name": f["name"], "type": f["type"], "required": bool(f.get("required", False))})
    return out


def validate_blueprint(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise StoreError("blueprint config must be an object", 422)
    registry._reject_control_characters(raw)
    allowed = {"purpose", "boundaries", "inputs", "outputs", "runtime", "tools", "materials", "policy", "eval_cases", "deployment"}
    if set(raw) - allowed:
        raise StoreError(f"unknown blueprint fields: {', '.join(sorted(set(raw) - allowed))}", 422)
    purpose = _text(raw.get("purpose"), "purpose", 600, minimum=10)
    boundaries = raw.get("boundaries", [])
    if not isinstance(boundaries, list) or len(boundaries) > 10 or not all(isinstance(b, str) and 0 < len(b) <= 200 for b in boundaries):
        raise StoreError("boundaries must be a list of at most 10 short statements", 422)
    runtime = raw.get("runtime", {})
    if not isinstance(runtime, dict) or set(runtime) - {"adapter", "model"}:
        raise StoreError("runtime is {adapter, model}", 422)
    adapter = runtime.get("adapter", demo.ADAPTER)
    if adapter in PLANNED_ADAPTERS:
        raise StoreError(f"runtime adapter {adapter} is planned, not implemented. Supported: {', '.join(SUPPORTED_ADAPTERS)}", 422)
    if adapter not in SUPPORTED_ADAPTERS:
        raise StoreError(f"unknown runtime adapter. Supported: {', '.join(SUPPORTED_ADAPTERS)}", 422)
    model = _text(runtime.get("model", "deterministic-demo"), "model", 60)
    tools = raw.get("tools", [])
    if not isinstance(tools, list) or len(tools) > 10:
        raise StoreError("tools must be a list of at most 10", 422)
    clean_tools = []
    for t in tools:
        if not isinstance(t, dict) or set(t) - {"id", "access"} or t.get("id") not in TOOLS or t.get("access") not in TOOLS[t["id"]]["accesses"]:
            raise StoreError(f"each tool is {{id, access}}. Available tools: {', '.join(TOOLS)}", 422)
        clean_tools.append({"id": t["id"], "access": t["access"]})
    materials = raw.get("materials", [])
    if not isinstance(materials, list) or len(materials) > 20:
        raise StoreError("materials must be a list of at most 20", 422)
    clean_materials, seen = [], set()
    for m in materials:
        if not isinstance(m, dict) or set(m) - {"name", "constraint"} or not isinstance(m.get("name"), str):
            raise StoreError("each material is {name, constraint}", 422)
        registry.split_name(m["name"])
        constraint = m.get("constraint", "*")
        if not isinstance(constraint, str):
            raise StoreError("a material constraint must be text", 422)
        registry.parse_constraint(constraint)
        if m["name"] in seen:
            raise StoreError(f"material listed twice: {m['name']}", 422)
        seen.add(m["name"])
        clean_materials.append({"name": m["name"], "constraint": constraint})
    policy = raw.get("policy", {})
    if not isinstance(policy, dict) or set(policy) - {"external_actions", "spend_limit_minor", "currency"}:
        raise StoreError("policy is {external_actions, spend_limit_minor, currency}", 422)
    if policy.get("external_actions", "require_approval") != "require_approval":
        raise StoreError("external_actions must be require_approval. Other modes are not supported yet", 422)
    limit = policy.get("spend_limit_minor", 0)
    if not isinstance(limit, int) or isinstance(limit, bool) or not 0 <= limit <= 10_000_000:
        raise StoreError("spend_limit_minor is an integer number of minor units", 422)
    if policy.get("currency", "AUD") != "AUD":
        raise StoreError("only AUD is supported in the foundation", 422)
    cases = raw.get("eval_cases", [])
    if not isinstance(cases, list) or len(cases) > 20:
        raise StoreError("eval_cases must be a list of at most 20", 422)
    clean_cases = []
    for c in cases:
        if not isinstance(c, dict) or set(c) - {"id", "name", "input", "checks"} or not isinstance(c.get("input"), dict):
            raise StoreError("each eval case is {id, name, input, checks}", 422)
        checks = c.get("checks", [])
        if not isinstance(checks, list) or not checks or len(checks) > 20 or not all(isinstance(k, dict) and k.get("type") in CHECK_TYPES for k in checks):
            raise StoreError(f"checks must use these types: {', '.join(CHECK_TYPES)}", 422)
        for k in checks:
            if set(k) - {"type", "field", "text", "name"} or not all(isinstance(v, str) and len(v) <= 200 for v in k.values()):
                raise StoreError("a check is {type, field, text, name} with short text", 422)
        clean_cases.append({"id": _text(c.get("id"), "case id", 60), "name": _text(c.get("name", c.get("id")), "case name", 120),
                            "input": _clean_enquiry(c["input"]), "checks": checks})
    deployment = raw.get("deployment")
    if deployment is not None:
        if not isinstance(deployment, dict) or set(deployment) - {"target", "notes"}:
            raise StoreError("deployment is {target, notes}", 422)
        target = deployment.get("target", "export-only")
        if target in PLANNED_DEPLOY_TARGETS:
            raise StoreError(f"deployment target {target} is planned, not implemented. Supported: {', '.join(SUPPORTED_DEPLOY_TARGETS)}", 422)
        if target not in SUPPORTED_DEPLOY_TARGETS:
            raise StoreError(f"unknown deployment target. Supported: {', '.join(SUPPORTED_DEPLOY_TARGETS)}", 422)
        deployment = {"target": target, "notes": _text(deployment.get("notes", "none"), "deployment notes", 300)}
    config = {
        "purpose": purpose, "boundaries": boundaries,
        "inputs": _field_list(raw.get("inputs", []), "inputs"), "outputs": _field_list(raw.get("outputs", []), "outputs"),
        "runtime": {"adapter": adapter, "model": model}, "tools": clean_tools, "materials": clean_materials,
        "policy": {"external_actions": "require_approval", "spend_limit_minor": limit, "currency": "AUD"},
        "eval_cases": clean_cases,
    }
    if deployment is not None:
        config["deployment"] = deployment
    if len(canon(config)) > 100_000:
        raise StoreError("the blueprint is too large (limit 100000 bytes)", 422)
    _scan(config, "a blueprint")
    return config


def _graph_cycle(edges: dict[str, list[str]]) -> list[str] | None:
    state: dict[str, int] = {}
    stack: list[str] = []

    def visit(node: str) -> list[str] | None:
        state[node] = 1
        stack.append(node)
        for nxt in edges.get(node, []):
            if state.get(nxt) == 1:
                return stack[stack.index(nxt):] + [nxt]
            if state.get(nxt) is None:
                found = visit(nxt)
                if found:
                    return found
        stack.pop()
        state[node] = 2
        return None

    for n in list(edges):
        if state.get(n) is None:
            found = visit(n)
            if found:
                return found
    return None


def resolve_selection(store: Any, tenant: str, materials: list[dict[str, str]], adapter: str = demo.ADAPTER) -> dict[str, Any]:
    """Deterministic resolver foundation: exact versions, dependencies, reasons, warnings, unsupported conditions.

    Highest published version satisfying every constraint; no backtracking, no semantic ranking, no scores.
    """
    out: dict[str, Any] = {
        "ok": False, "lock": [], "reasons": [], "warnings": [], "unsupported": [], "errors": [],
        "method": "Constraint and dependency resolution only. Highest satisfying version, no backtracking, no semantic search.",
    }
    roots = {m["name"]: m.get("constraint", "*") for m in materials}
    if not roots:
        out["ok"] = True
        return out
    try:
        lock = registry.resolve_dependencies(store, tenant, roots)
    except StoreError as exc:
        code = "missing_dependency" if exc.status_code == 404 else "version_conflict"
        out["errors"].append({"code": code, "message": str(exc)})
        return out
    details: dict[str, dict[str, Any]] = {}
    edges: dict[str, list[str]] = {}
    required_by: dict[str, list[str]] = {}
    for item in lock:
        version = registry.get_version(store, tenant, item["name"], item["version"])
        details[item["name"]] = version
        reqs = sorted(version["manifest"].get("requires", {}))
        edges[item["name"]] = reqs
        for dep in reqs:
            required_by.setdefault(dep, []).append(f"{item['name']}@{item['version']}")
    cycle = _graph_cycle(edges)
    if cycle:
        out["errors"].append({"code": "dependency_cycle", "message": "dependency cycle: " + " -> ".join(cycle)})
    for item in lock:
        manifest = details[item["name"]]["manifest"]
        license_class = manifest["license"]["class"]
        declared = manifest.get("compatible", [])
        entry = {
            "name": item["name"], "version": item["version"], "content_hash": item["content_hash"], "kind": manifest["kind"],
            "license_class": license_class, "source": "registry:local",
            "declared_compatibility": declared, "tested_compatibility": [],
        }
        if item["name"] in roots:
            entry["reason"] = f"requested {roots[item['name']]}; highest published version satisfying it is {item['version']}"
        else:
            entry["reason"] = f"required by {', '.join(required_by.get(item['name'], ['a dependency']))}; selected {item['version']}"
        out["lock"].append(entry)
        out["reasons"].append(f"{item['name']}@{item['version']}: {entry['reason']}")
        if license_class != "open":
            out["unsupported"].append({"name": item["name"], "code": "paid_not_installable",
                                       "message": f"{item['name']} is {license_class}. Paid and metered installs are not available; price is metadata only."})
        if item.get("has_scripts"):
            out["unsupported"].append({"name": item["name"], "code": "contains_code",
                                       "message": f"{item['name']} contains code files. Papership never runs package code, so it cannot be installed here."})
        if not declared:
            out["warnings"].append(f"{item['name']}@{item['version']} declares no compatibility (publisher assertion).")
        elif adapter not in declared:
            out["warnings"].append(f"{item['name']}@{item['version']} declares compatibility with {', '.join(declared)} but not {adapter}.")
    out["warnings"].append("Compatibility shown is what publishers declare. No platform compatibility tests exist yet.")
    out["warnings"].append("All materials are third-party and unreviewed. Installing supplies instructions and references. It grants no permission.")
    out["ok"] = not out["errors"] and not out["unsupported"]
    return out


# ---- Studio: blueprints, versions, evaluation, publish, export -----------------------------------


def _blueprint(store: Any, tenant: str, blueprint_id: str) -> Any:
    row = store.conn.execute("SELECT * FROM fd_blueprints WHERE id=? AND tenant_id=?", (blueprint_id, tenant)).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    return row


def _version(store: Any, tenant: str, blueprint_id: str, version: int) -> Any:
    _blueprint(store, tenant, blueprint_id)
    row = store.conn.execute(
        "SELECT * FROM fd_blueprint_versions WHERE blueprint_id=? AND version=? AND tenant_id=?", (blueprint_id, version, tenant)
    ).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    return row


def _version_json(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "blueprint_id": row["blueprint_id"], "version": row["version"], "content_hash": row["content_hash"],
        "config": json.loads(row["config_json"]), "lock": json.loads(row["lock_json"]), "created_by": row["created_by"],
        "created_at": row["created_at"],
    }


def save_blueprint(store: Any, tenant: str, principal: str, slug: str, title: str, raw_config: Any) -> dict[str, Any]:
    if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
        raise StoreError("slug is lowercase letters, digits and hyphens (up to 39 characters)", 422)
    title = _text(title, "title", 120)
    _scan(title, "a title")
    config = validate_blueprint(raw_config)
    selection = resolve_selection(store, tenant, config["materials"], config["runtime"]["adapter"])
    if not selection["ok"]:
        problems = [e["message"] for e in selection["errors"]] + [u["message"] for u in selection["unsupported"]]
        raise StoreError("the materials cannot be resolved: " + "; ".join(problems), 422)
    content = digest({"config": config, "lock": [(i["name"], i["version"], i["content_hash"]) for i in selection["lock"]]})
    with registry.transaction(store):
        bp = store.conn.execute("SELECT * FROM fd_blueprints WHERE tenant_id=? AND slug=?", (tenant, slug)).fetchone()
        if bp is None:
            if store.conn.execute("SELECT COUNT(*) AS n FROM fd_blueprints WHERE tenant_id=?", (tenant,)).fetchone()["n"] >= MAX_BLUEPRINTS:
                raise StoreError("blueprint quota reached", 429)
            bid = _id("bp")
            store.conn.execute("INSERT INTO fd_blueprints (id, tenant_id, slug, title, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                               (bid, tenant, slug, title, principal, now()))
            nxt = 1
        else:
            bid = bp["id"]
            latest = store.conn.execute(
                "SELECT version, content_hash FROM fd_blueprint_versions WHERE blueprint_id=? ORDER BY version DESC LIMIT 1", (bid,)
            ).fetchone()
            if latest and latest["content_hash"] == content:
                row = _version(store, tenant, bid, latest["version"])
                return {**_version_json(row), "created": False, "slug": slug, "selection": selection}
            nxt = (latest["version"] if latest else 0) + 1
            if nxt > MAX_VERSIONS:
                raise StoreError("version limit reached for this blueprint", 429)
        vid = _id("bpv")
        store.conn.execute(
            """INSERT INTO fd_blueprint_versions (id, blueprint_id, tenant_id, version, config_json, lock_json, content_hash, created_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (vid, bid, tenant, nxt, canon(config), canon(selection["lock"]), content, principal, now()),
        )
        log(store, tenant, principal, "studio.blueprint_saved", "blueprint", bid, {"slug": slug, "version": nxt, "lock": len(selection["lock"])})
    row = _version(store, tenant, bid, nxt)
    return {**_version_json(row), "created": True, "slug": slug, "selection": selection}


def list_blueprints(store: Any, tenant: str) -> list[dict[str, Any]]:
    out = []
    for bp in store.conn.execute("SELECT * FROM fd_blueprints WHERE tenant_id=? ORDER BY created_at", (tenant,)).fetchall():
        versions = store.conn.execute(
            "SELECT version, content_hash, created_at FROM fd_blueprint_versions WHERE blueprint_id=? ORDER BY version DESC", (bp["id"],)
        ).fetchall()
        out.append({"id": bp["id"], "slug": bp["slug"], "title": bp["title"], "created_at": bp["created_at"],
                    "versions": [dict(v) for v in versions],
                    "agents": store.conn.execute("SELECT COUNT(*) AS n FROM fd_agents WHERE blueprint_id=?", (bp["id"],)).fetchone()["n"]})
    return out


def get_blueprint(store: Any, tenant: str, blueprint_id: str) -> dict[str, Any]:
    bp = _blueprint(store, tenant, blueprint_id)
    rows = store.conn.execute(
        "SELECT * FROM fd_blueprint_versions WHERE blueprint_id=? ORDER BY version DESC", (blueprint_id,)
    ).fetchall()
    versions = []
    for r in rows:
        ev = store.conn.execute(
            "SELECT * FROM fd_eval_runs WHERE blueprint_version_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (r["id"],)
        ).fetchone()
        versions.append({**_version_json(r), "latest_evaluation": _eval_json(ev) if ev else None})
    return {"id": bp["id"], "slug": bp["slug"], "title": bp["title"], "versions": versions}


def _eval_json(row: Any) -> dict[str, Any]:
    return {"id": row["id"], "method": row["method"], "scope": row["scope"], "passed": row["passed"], "total": row["total"],
            "results": json.loads(row["results_json"]), "created_at": row["created_at"]}


def _installed_map(lock: list[dict[str, Any]]) -> dict[str, str]:
    return {i["name"]: i["version"] for i in lock}


def evaluate_version(store: Any, tenant: str, principal: str, blueprint_id: str, version: int) -> dict[str, Any]:
    row = _version(store, tenant, blueprint_id, version)
    config, lock = json.loads(row["config_json"]), json.loads(row["lock_json"])
    org = _org_name(store, tenant)
    results, passed, total = [], 0, 0
    for case in config["eval_cases"]:
        outputs = demo.demo_runtime(config, _installed_map(lock), case["input"], "Evaluation agent", org)
        checks = []
        for check in case["checks"]:
            ok, detail = demo.run_check(check, outputs, case["input"], config)
            checks.append({"type": check["type"], "passed": ok, "detail": detail})
            passed += 1 if ok else 0
            total += 1
        results.append({"case_id": case["id"], "name": case["name"], "checks": checks, "passed": all(c["passed"] for c in checks)})
    method = "Deterministic fixture checks against the demo runtime. Not a model task-success score."
    scope = f"{len(config['eval_cases'])} cases, {total} checks, blueprint version {version}; structure and approval-policy behaviour only."
    with registry.transaction(store):
        eid = _id("eval")
        store.conn.execute(
            """INSERT INTO fd_eval_runs (id, tenant_id, blueprint_version_id, method, scope, results_json, passed, total, created_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (eid, tenant, row["id"], method, scope, canon(results), passed, total, principal, now()),
        )
        log(store, tenant, principal, "studio.evaluated", "blueprint_version", row["id"], {"passed": passed, "total": total})
    return {"id": eid, "method": method, "scope": scope, "passed": passed, "total": total, "results": results}


def export_blueprint(store: Any, tenant: str, blueprint_id: str, version: int) -> dict[str, Any]:
    bp = _blueprint(store, tenant, blueprint_id)
    row = _version(store, tenant, blueprint_id, version)
    export = {
        "schema": "papership.blueprint/1",
        "note": "Papership-specific format, not an industry standard. Credentials are never exported; tools list references only.",
        "blueprint": bp["slug"], "title": bp["title"], "version": version, "content_hash": row["content_hash"],
        "config": json.loads(row["config_json"]),
        "lock": [{k: v for k, v in i.items() if k in ("name", "version", "content_hash", "kind", "license_class", "source")}
                 for i in json.loads(row["lock_json"])],
        "credentials": "references only; none included",
    }
    _scan(export, "an export")
    return export


def publish_blueprint(store: Any, tenant: str, principal: str, blueprint_id: str, version: int,
                      publisher: str = demo.PUBLISHER, visibility: str = "private") -> dict[str, Any]:
    export = export_blueprint(store, tenant, blueprint_id, version)
    config = export["config"]
    requires = {i["name"]: i["version"] for i in export["lock"] if i["name"] in {m["name"] for m in config["materials"]}}
    manifest = {
        "schema": registry.SCHEMA, "name": f"{publisher}/{export['blueprint']}", "version": f"{version}.0.0", "kind": "bundle",
        "description": config["purpose"][:300].replace("\n", " "),
        "category": "blueprint", "tags": ["blueprint", "studio"], "jurisdiction": [], "compatible": [config["runtime"]["adapter"]],
        "requires": requires, "license": {"class": "open", "spdx": "CC-BY-4.0"}, "visibility": visibility,
    }
    files = {
        "SKILL.md": f"# {export['title']}\n\nAgent blueprint exported from Papership Studio, version {version}.\n\nPurpose: {config['purpose']}\n",
        "blueprint.json": json.dumps(export, indent=2, sort_keys=True),
    }
    out = registry.publish(store, tenant, principal, manifest, files)
    with registry.transaction(store):
        log(store, tenant, principal, "studio.published_local", "blueprint_version", _version(store, tenant, blueprint_id, version)["id"],
            {"package": f"{manifest['name']}@{manifest['version']}", "visibility": visibility})
    return {**out, "package": manifest["name"], "note": "Published to the local Registry only. Nothing was published externally."}


# ---- Workspace: agents, installs, tasks, runs, approvals -----------------------------------------


def _org_name(store: Any, tenant: str) -> str:
    row = store.conn.execute("SELECT name FROM organisations WHERE tenant_id=?", (tenant,)).fetchone()
    return row["name"] if row else "Organisation"


def _agent(store: Any, tenant: str, agent_id: str) -> Any:
    row = store.conn.execute("SELECT * FROM fd_agents WHERE id=? AND tenant_id=?", (agent_id, tenant)).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    return row


def _write_installs(store: Any, tenant: str, principal: str, agent_id: str, lock: list[dict[str, Any]], roots: dict[str, str], source: str) -> None:
    for item in lock:
        store.conn.execute(
            """INSERT INTO fd_installs (id, tenant_id, agent_id, package_name, version, content_hash, source, requested_constraint, installed_by, installed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (agent_id, package_name) DO UPDATE SET version=excluded.version, content_hash=excluded.content_hash,
                 source=excluded.source, requested_constraint=excluded.requested_constraint,
                 installed_by=excluded.installed_by, installed_at=excluded.installed_at""",
            (_id("fdi"), tenant, agent_id, item["name"], item["version"], item["content_hash"], source,
             roots.get(item["name"], "dependency"), principal, now()),
        )


def instantiate_agent(store: Any, tenant: str, principal: str, blueprint_id: str, version: int, name: str) -> dict[str, Any]:
    row = _version(store, tenant, blueprint_id, version)
    bp = _blueprint(store, tenant, blueprint_id)
    name = _text(name, "agent name", 80)
    _scan(name, "an agent name")
    config, lock = json.loads(row["config_json"]), json.loads(row["lock_json"])
    with registry.transaction(store):
        if store.conn.execute("SELECT COUNT(*) AS n FROM fd_agents WHERE tenant_id=?", (tenant,)).fetchone()["n"] >= MAX_AGENTS:
            raise StoreError("agent quota reached", 429)
        aid, ts = _id("agt"), now()
        store.conn.execute(
            """INSERT INTO fd_agents (id, tenant_id, blueprint_id, blueprint_version_id, name, runtime, status, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)""",
            (aid, tenant, blueprint_id, row["id"], name, config["runtime"]["adapter"], principal, ts, ts),
        )
        roots = {m["name"]: m["constraint"] for m in config["materials"]}
        _write_installs(store, tenant, principal, aid, lock, roots, f"studio-blueprint:{bp['slug']}@{version}")
        log(store, tenant, principal, "workspace.agent_created", "agent", aid, {"blueprint": bp["slug"], "version": version, "materials": len(lock)})
    return get_agent(store, tenant, aid)


def install_material(store: Any, tenant: str, principal: str, agent_id: str, name: str, constraint: str) -> dict[str, Any]:
    _agent(store, tenant, agent_id)
    registry.split_name(name)
    registry.parse_constraint(constraint)
    selection = resolve_selection(store, tenant, [{"name": name, "constraint": constraint}])
    if selection["unsupported"] or selection["errors"]:
        problems = [e["message"] for e in selection["errors"]] + [u["message"] for u in selection["unsupported"]]
        raise StoreError("not installed: " + "; ".join(problems), 409)
    with registry.transaction(store):
        _write_installs(store, tenant, principal, agent_id, selection["lock"], {name: constraint}, "registry:local (manual install)")
        log(store, tenant, principal, "registry.installed", "agent", agent_id, {"package": name, "locked": [f"{i['name']}@{i['version']}" for i in selection["lock"]]})
    return {"agent_id": agent_id, "selection": selection, "charged": 0, "note": "Installing supplies instructions and references. It grants no permission."}


def _installs(store: Any, tenant: str, agent_id: str) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        "SELECT * FROM fd_installs WHERE tenant_id=? AND agent_id=? ORDER BY package_name", (tenant, agent_id)
    ).fetchall()
    return [{k: r[k] for k in ("package_name", "version", "content_hash", "source", "requested_constraint", "installed_at")} for r in rows]


def get_agent(store: Any, tenant: str, agent_id: str) -> dict[str, Any]:
    a = _agent(store, tenant, agent_id)
    bp = store.conn.execute("SELECT slug, title FROM fd_blueprints WHERE id=?", (a["blueprint_id"],)).fetchone()
    ver = store.conn.execute("SELECT version FROM fd_blueprint_versions WHERE id=?", (a["blueprint_version_id"],)).fetchone()
    ev = store.conn.execute(
        "SELECT * FROM fd_eval_runs WHERE blueprint_version_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", (a["blueprint_version_id"],)
    ).fetchone()
    integration = next((i for i in INTEGRATIONS if i["id"] == a["runtime"]), None)
    return {
        "id": a["id"], "name": a["name"], "status": a["status"], "runtime": a["runtime"], "created_at": a["created_at"],
        "controls": integration["controls"] if integration else {},
        "blueprint": {"id": a["blueprint_id"], "slug": bp["slug"] if bp else "", "title": bp["title"] if bp else "", "version": ver["version"] if ver else None},
        "installs": _installs(store, tenant, agent_id),
        "latest_evaluation": _eval_json(ev) if ev else None,
        "autonomy": "Every external action waits for a human decision (the only supported policy).",
    }


def agent_passport(store: Any, tenant: str, agent_id: str) -> dict[str, Any]:
    """A portable description of identity and capabilities. It grants nothing and carries no secrets."""
    a = get_agent(store, tenant, agent_id)
    ver = store.conn.execute(
        "SELECT content_hash FROM fd_blueprint_versions WHERE id=(SELECT blueprint_version_id FROM fd_agents WHERE id=?)", (agent_id,)
    ).fetchone()
    passport = {
        "schema": "papership.agent-passport/0",
        "note": "Papership-specific draft format, not an industry standard. A passport describes an agent. It grants no access: authority comes from the owning organisation and the enforced runtime policy.",
        "grants_access": False,
        "agent": {"id": a["id"], "name": a["name"], "status": a["status"], "created_at": a["created_at"]},
        "owner": {"organisation_id": tenant, "organisation": _org_name(store, tenant)},
        "role": {"persona": a["blueprint"]["title"], "note": "A persona is not an organisational access role."},
        "origin": {"blueprint": a["blueprint"]["slug"], "version": a["blueprint"]["version"], "content_hash": ver["content_hash"] if ver else None},
        "runtime": {"adapter": a["runtime"], "controls": a["controls"]},
        "capabilities": [{"material": i["package_name"], "version": i["version"], "content_hash": i["content_hash"], "installed_from": i["source"]} for i in a["installs"]],
        "autonomy": a["autonomy"],
        "credentials": "references only; none included",
    }
    _scan(passport, "an agent passport")
    return passport


def _version_tuple(v: str) -> tuple[int, int, int]:
    return registry.parse_version(v)


def list_updates(store: Any, tenant: str, agent_id: str) -> dict[str, Any]:
    """Newer published versions of installed materials, with what would change. Nothing is applied."""
    _agent(store, tenant, agent_id)
    items = []
    for inst in _installs(store, tenant, agent_id):
        try:
            versions = registry._published_versions(store, tenant, inst["package_name"])
        except StoreError:
            continue
        if not versions or _version_tuple(versions[0]["version"]) <= _version_tuple(inst["version"]):
            continue
        new = registry.get_version(store, tenant, inst["package_name"], versions[0]["version"])
        try:
            old = registry.get_version(store, tenant, inst["package_name"], inst["version"])
        except StoreError:
            old = None
        old_files, new_files = (old["files"] if old else {}), new["files"]
        old_req, new_req = (old["manifest"].get("requires", {}) if old else {}), new["manifest"].get("requires", {})
        pred = registry.parse_constraint(inst["requested_constraint"] if inst["requested_constraint"] != "dependency" else "*")
        items.append({
            "name": inst["package_name"], "from_version": inst["version"], "to_version": new["version"],
            "reviewed_hash": new["content_hash"], "installed_hash": inst["content_hash"],
            "within_requested_constraint": bool(pred(_version_tuple(new["version"]))), "requested_constraint": inst["requested_constraint"],
            "files_added": sorted(set(new_files) - set(old_files)), "files_removed": sorted(set(old_files) - set(new_files)),
            "files_changed": sorted(f for f in set(new_files) & set(old_files) if new_files[f] != old_files[f]),
            "dependencies_added": sorted(set(new_req) - set(old_req)), "dependencies_removed": sorted(set(old_req) - set(new_req)),
            "dependency_ranges_changed": sorted(d for d in set(new_req) & set(old_req) if new_req[d] != old_req[d]),
            "has_scripts": new["has_scripts"], "licence": new["manifest"]["license"],
        })
    return {"agent_id": agent_id, "updates": items,
            "note": "Updates are explicit. Review the changes, then apply with the reviewed content hash. The installed version stays until you do."}


def apply_update(store: Any, tenant: str, principal: str, agent_id: str, name: str, to_version: str, reviewed_hash: str) -> dict[str, Any]:
    _agent(store, tenant, agent_id)
    registry.split_name(name)
    registry.parse_version(to_version)
    current = next((i for i in _installs(store, tenant, agent_id) if i["package_name"] == name), None)
    if current is None:
        raise StoreError("that material is not installed on this agent", 404)
    if _version_tuple(to_version) <= _version_tuple(current["version"]):
        raise StoreError("only a newer version can be applied", 409)
    target = registry.get_version(store, tenant, name, to_version)
    if target["status"] != "published":
        raise StoreError("that version is not published", 409)
    if target["has_scripts"]:
        raise StoreError("this version contains scripts; install it by hand after reading them", 409)
    if target["content_hash"] != reviewed_hash:
        raise StoreError("stale review: the content changed since you reviewed it. Review the update again.", 409)
    selection = resolve_selection(store, tenant, [{"name": name, "constraint": f"=={to_version}"}])
    if selection["unsupported"] or selection["errors"]:
        problems = [e["message"] for e in selection["errors"]] + [u["message"] for u in selection["unsupported"]]
        raise StoreError("not updated: " + "; ".join(problems), 409)
    with registry.transaction(store):
        # Keep the original request constraint so a later review still shows whether the update is inside it.
        _write_installs(store, tenant, principal, agent_id, selection["lock"], {name: current["requested_constraint"]}, "registry:local (reviewed update)")
        log(store, tenant, principal, "registry.updated", "agent", agent_id,
            {"package": name, "from": current["version"], "to": to_version, "content_hash": reviewed_hash})
    return {"agent_id": agent_id, "package": name, "from_version": current["version"], "to_version": to_version, "selection": selection, "charged": 0}


def list_agents(store: Any, tenant: str) -> list[dict[str, Any]]:
    ids = [r["id"] for r in store.conn.execute("SELECT id FROM fd_agents WHERE tenant_id=? ORDER BY created_at", (tenant,)).fetchall()]
    return [get_agent(store, tenant, i) for i in ids]


def _task(store: Any, tenant: str, task_id: str) -> Any:
    row = store.conn.execute("SELECT * FROM fd_tasks WHERE id=? AND tenant_id=?", (task_id, tenant)).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    return row


def _clean_enquiry(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise StoreError("task input must be an object", 422)
    out: dict[str, Any] = {}
    for key, limit in (("customer_name", 80), ("customer_email", 120), ("property_address", 160), ("contact_id", 40)):
        out[key] = _text(raw.get(key), key, limit)
    out["question"] = _text(raw.get("question"), "question", 1000)
    listing = raw.get("listing", {})
    if not isinstance(listing, dict) or len(listing) > 10 or not all(isinstance(v, (str, int, float)) and len(str(v)) <= 120 for v in listing.values()):
        raise StoreError("listing is a small object of facts", 422)
    out["listing"] = listing
    _bounded(out, "the task input")
    _scan(out, "a task")
    return out


def create_task(store: Any, tenant: str, principal: str, title: str, agent_id: str, raw_input: Any) -> dict[str, Any]:
    title = _text(title, "title", 160)
    _scan(title, "a title")
    agent = _agent(store, tenant, agent_id)
    enquiry = _clean_enquiry(raw_input)
    with registry.transaction(store):
        known = store.conn.execute("SELECT name, email FROM fd_contacts WHERE tenant_id=? AND contact_id=?", (tenant, enquiry["contact_id"])).fetchone()
        if known is not None and (known["name"] != enquiry["customer_name"] or known["email"] != enquiry["customer_email"]):
            raise StoreError("that CRM contact id belongs to a different customer name or email", 422)
        if store.conn.execute("SELECT COUNT(*) AS n FROM fd_tasks WHERE tenant_id=? AND status NOT IN ('done','cancelled')", (tenant,)).fetchone()["n"] >= MAX_TASKS:
            raise StoreError("task quota reached", 429)
        tid, ts = _id("tsk"), now()
        store.conn.execute(
            """INSERT INTO fd_tasks (id, tenant_id, title, input_json, agent_id, status, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)""",
            (tid, tenant, title, canon(enquiry), agent["id"], principal, ts, ts),
        )
        store.conn.execute(
            """INSERT OR IGNORE INTO fd_contacts (tenant_id, contact_id, name, email, stage, updated_at) VALUES (?, ?, ?, ?, 'new_enquiry', ?)""",
            (tenant, enquiry["contact_id"], enquiry["customer_name"], enquiry["customer_email"], ts),
        )
        log(store, tenant, principal, "workspace.task_created", "task", tid, {"agent": agent["name"]}, tid)
    return get_task(store, tenant, tid)


TASK_COLUMNS = {"result_text", "result_version", "result_run_id", "result_edited_by"}
RUN_COLUMNS = {"note", "outputs_json"}


def _set_task(store: Any, tid: str, old: str, new: str, tenant: str, **fields: Any) -> None:
    _check_transition(TASK_TRANSITIONS, old, new, "task")
    if set(fields) - TASK_COLUMNS:
        raise StoreError("internal: unexpected task column", 500)
    sets = ["status=?", "updated_at=?"] + [f"{k}=?" for k in fields]
    cur = store.conn.execute(f"UPDATE fd_tasks SET {', '.join(sets)} WHERE id=? AND tenant_id=? AND status=?",
                             (new, now(), *fields.values(), tid, tenant, old))
    if cur.rowcount != 1:
        raise StoreError("the task changed while this was happening. Reload and try again", 409)


def _set_run(store: Any, rid: str, old: str, new: str, tenant: str, **fields: Any) -> None:
    _check_transition(RUN_TRANSITIONS, old, new, "run")
    if set(fields) - RUN_COLUMNS:
        raise StoreError("internal: unexpected run column", 500)
    sets = ["status=?", "updated_at=?"] + [f"{k}=?" for k in fields]
    cur = store.conn.execute(f"UPDATE fd_runs SET {', '.join(sets)} WHERE id=? AND tenant_id=? AND status=?",
                             (new, now(), *fields.values(), rid, tenant, old))
    if cur.rowcount != 1:
        raise StoreError("the run changed while this was happening. Reload and try again", 409)


def start_run(store: Any, tenant: str, principal: str, task_id: str) -> dict[str, Any]:
    with registry.transaction(store):
        task = _task(store, tenant, task_id)  # read inside the lock so a concurrent run or approval cannot slip between check and write
        if task["status"] != "open":
            raise StoreError(f"a run can start only on an open task (this one is {task['status']})", 409)
        agent = _agent(store, tenant, task["agent_id"])
        if agent["status"] != "active":
            raise StoreError("the agent is not active", 409)
        ver = store.conn.execute("SELECT * FROM fd_blueprint_versions WHERE id=? AND tenant_id=?", (agent["blueprint_version_id"], tenant)).fetchone()
        config = json.loads(ver["config_json"])
        installed = {r["package_name"]: r["version"] for r in store.conn.execute(
            "SELECT package_name, version FROM fd_installs WHERE agent_id=? AND tenant_id=?", (agent["id"], tenant)).fetchall()}
        enquiry = json.loads(task["input_json"])
        contact = store.conn.execute("SELECT name FROM fd_contacts WHERE tenant_id=? AND contact_id=?", (tenant, enquiry["contact_id"])).fetchone()
        rid, ts = _id("run"), now()
        store.conn.execute(
            "INSERT INTO fd_runs (id, tenant_id, task_id, agent_id, status, adapter, created_at, updated_at) VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)",
            (rid, tenant, task_id, agent["id"], agent["runtime"], ts, ts),
        )
        _set_task(store, task_id, "open", "in_progress", tenant)
        _set_run(store, rid, "queued", "running", tenant)
        log(store, tenant, principal, "workspace.run_started", "run", rid, {"adapter": agent["runtime"]}, task_id)
        outputs = demo.demo_runtime(config, installed, enquiry, agent["name"], _org_name(store, tenant))
        action = outputs["proposed_action"]
        verdict = demo.policy_gate(config, action)
        if verdict != "pending_approval":
            _set_run(store, rid, "running", "failed", tenant, note="policy blocked the proposed action", outputs_json=canon(outputs))
            _set_task(store, task_id, "in_progress", "open", tenant)
            log(store, tenant, principal, "workspace.run_failed", "run", rid, {"reason": "policy"}, task_id)
        else:
            store.conn.execute("UPDATE fd_approvals SET status='superseded' WHERE task_id=? AND tenant_id=? AND status='pending' AND kind='crm.update_contact'", (task_id, tenant))
            version = (task["result_version"] or 0) + 1
            payload = {"run_id": rid, "tool": action["tool"], "action": action["action"], **action["payload"],
                       "contact_name": contact["name"] if contact else "", "draft_version": version, "draft_sha256": hashlib.sha256(outputs["draft_reply"].encode()).hexdigest()}
            aid = _id("apr")
            store.conn.execute(
                """INSERT INTO fd_approvals (id, tenant_id, task_id, run_id, kind, payload_json, payload_hash, status, requested_by, created_at)
                   VALUES (?, ?, ?, ?, 'crm.update_contact', ?, ?, 'pending', ?, ?)""",
                (aid, tenant, task_id, rid, canon(payload), digest(payload), agent["id"], now()),
            )
            _set_run(store, rid, "running", "awaiting_approval", tenant, outputs_json=canon(outputs))
            _set_task(store, task_id, "in_progress", "awaiting_approval", tenant, result_text=outputs["draft_reply"], result_version=version,
                      result_run_id=rid, result_edited_by=agent["id"])
            log(store, tenant, agent["id"], "workspace.draft_produced", "run", rid, {"method": outputs["method"], "materials": len(outputs["materials_used"])}, task_id)
            log(store, tenant, agent["id"], "workspace.approval_requested", "approval", aid, {"kind": "crm.update_contact", "payload_hash": digest(payload)}, task_id)
    return get_task(store, tenant, task_id)


def edit_result(store: Any, tenant: str, principal: str, task_id: str, text: str, base_version: int) -> dict[str, Any]:
    text = _text(text, "result", MAX_RESULT_CHARS)
    _scan(text, "a result")
    with registry.transaction(store):
        task = _task(store, tenant, task_id)
        if task["status"] in ("cancelled", "done"):
            raise StoreError(f"a {task['status']} task cannot be edited", 409)
        if not task["result_version"]:
            raise StoreError("this task has no result yet", 409)
        current = task["result_version"]
        if base_version != current:
            raise StoreError(f"stale edit: the result is at version {current}, you edited version {base_version}", 409)
        store.conn.execute(
            "UPDATE fd_tasks SET result_text=?, result_version=?, result_edited_by=?, updated_at=? WHERE id=? AND tenant_id=?",
            (text, current + 1, principal, now(), task_id, tenant),
        )
        # An approval is bound to the exact draft it was requested for. Editing the draft retires the old request and raises a new one.
        pending = store.conn.execute(
            "SELECT * FROM fd_approvals WHERE task_id=? AND tenant_id=? AND status='pending' AND kind='crm.update_contact'", (task_id, tenant)).fetchall()
        for old in pending:
            payload = {**json.loads(old["payload_json"]), "draft_version": current + 1, "draft_sha256": hashlib.sha256(text.encode()).hexdigest()}
            store.conn.execute("UPDATE fd_approvals SET status='superseded' WHERE id=? AND tenant_id=?", (old["id"], tenant))
            aid = _id("apr")
            store.conn.execute(
                """INSERT INTO fd_approvals (id, tenant_id, task_id, run_id, kind, payload_json, payload_hash, status, requested_by, created_at)
                   VALUES (?, ?, ?, ?, 'crm.update_contact', ?, ?, 'pending', ?, ?)""",
                (aid, tenant, task_id, old["run_id"], canon(payload), digest(payload), principal, now()))
            log(store, tenant, principal, "workspace.approval_requested", "approval", aid, {"kind": "crm.update_contact", "reason": "draft edited", "payload_hash": digest(payload)}, task_id)
        log(store, tenant, principal, "workspace.result_edited", "task", task_id, {"version": current + 1, "run_id": task["result_run_id"]}, task_id)
    return get_task(store, tenant, task_id)


def cancel_task(store: Any, tenant: str, principal: str, task_id: str) -> dict[str, Any]:
    with registry.transaction(store):
        task = _task(store, tenant, task_id)
        _set_task(store, task_id, task["status"], "cancelled", tenant)
        for run in store.conn.execute("SELECT id, status FROM fd_runs WHERE task_id=? AND tenant_id=? AND status IN ('queued','running','awaiting_approval')", (task_id, tenant)).fetchall():
            _set_run(store, run["id"], run["status"], "cancelled", tenant, note="task cancelled")
        store.conn.execute("UPDATE fd_approvals SET status='superseded' WHERE task_id=? AND tenant_id=? AND status='pending'", (task_id, tenant))
        log(store, tenant, principal, "workspace.task_cancelled", "task", task_id, {}, task_id)
    return get_task(store, tenant, task_id)


def _approval_json(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "task_id": row["task_id"], "run_id": row["run_id"], "kind": row["kind"],
        "payload": json.loads(row["payload_json"]), "payload_hash": row["payload_hash"], "status": row["status"],
        "requested_by": row["requested_by"], "decided_by": row["decided_by"] or None, "decided_at": row["decided_at"] or None,
        "decision_note": row["decision_note"], "action_result": _loads(row["action_result_json"]), "created_at": row["created_at"],
        "simulated": True,
    }


def list_approvals(store: Any, tenant: str, status: str | None = None) -> list[dict[str, Any]]:
    sql, args = "SELECT * FROM fd_approvals WHERE tenant_id=?", [tenant]
    if status:
        sql += " AND status=?"
        args.append(status)
    return [_approval_json(r) for r in store.conn.execute(sql + " ORDER BY created_at DESC, rowid DESC", args).fetchall()]


def _apply_crm_action(store: Any, tenant: str, approval: Any, actor: str) -> dict[str, Any]:
    """The only path that changes the (simulated) CRM. It refuses anything that is not an approved, unmodified, unapplied proposal in this tenant."""
    if approval["tenant_id"] != tenant or approval["kind"] != "crm.update_contact":
        raise StoreError("policy: this approval does not authorise a CRM action here", 403)
    if approval["status"] != "approved":
        raise StoreError("policy: the action has no approved decision", 403)
    if approval["action_result_json"]:
        raise StoreError("policy: this approval has already been applied", 409)
    payload = json.loads(approval["payload_json"])
    if digest(payload) != approval["payload_hash"]:
        raise StoreError("policy: the stored proposal no longer matches its approved hash", 409)
    contact = store.conn.execute("SELECT * FROM fd_contacts WHERE tenant_id=? AND contact_id=?", (tenant, payload["contact_id"])).fetchone()
    if contact is None:
        raise StoreError("the contact does not exist in the simulated CRM", 404)
    notes = json.loads(contact["notes_json"]) + [payload["note"]]
    store.conn.execute(
        "UPDATE fd_contacts SET stage=?, notes_json=?, updated_at=? WHERE tenant_id=? AND contact_id=?",
        (payload["stage"], canon(notes), now(), tenant, payload["contact_id"]),
    )
    return {"simulated": True, "label": demo.SIM_LABEL, "contact_id": payload["contact_id"], "before": {"stage": contact["stage"]},
            "after": {"stage": payload["stage"], "note": payload["note"]}}


def _human_with_authority(store: Any, ctx: AuthContext) -> None:
    principal = store.principal(ctx.principal_id)
    if principal["kind"] != "human":
        raise StoreError("agents cannot decide approvals", 403)
    classes = store.grant_classes(ctx.principal_id)
    if "approval.org.admin" not in classes and "org.admin" not in classes:
        raise StoreError("deciding an external action needs the Owner or Founder role (approval.org.admin)", 403)


def decide_approval(store: Any, ctx: AuthContext, approval_id: str, decision: str, payload_hash: str, note: str = "") -> dict[str, Any]:
    _human_with_authority(store, ctx)
    if decision not in ("approved", "rejected"):
        raise StoreError("decision must be approved or rejected", 422)
    tenant = ctx.tenant_id
    note = (note or "")[:300]
    _scan(note, "a decision note")
    _plain(note, "a decision note")
    with registry.transaction(store):
        row = store.conn.execute("SELECT * FROM fd_approvals WHERE id=? AND tenant_id=?", (approval_id, tenant)).fetchone()
        if row is None:
            raise StoreError("not found", 404)
        if row["kind"] == "exchange.accept_quote":
            guard("exchange")
        if row["status"] != "pending":
            raise StoreError(f"duplicate or late decision: this approval is already {row['status']}", 409)
        if payload_hash != row["payload_hash"] or digest(json.loads(row["payload_json"])) != row["payload_hash"]:
            raise StoreError("stale decision: the proposal changed since you opened it. Reload and review the current proposal", 409)
        store.conn.execute(
            "UPDATE fd_approvals SET status=?, decided_by=?, decided_at=?, decision_note=? WHERE id=? AND tenant_id=? AND status='pending'",
            (decision, ctx.principal_id, now(), note, approval_id, tenant),
        )
        row = store.conn.execute("SELECT * FROM fd_approvals WHERE id=? AND tenant_id=?", (approval_id, tenant)).fetchone()
        log(store, tenant, ctx.principal_id, f"workspace.approval_{decision}", "approval", approval_id,
            {"kind": row["kind"], "payload_hash": row["payload_hash"]}, row["task_id"])
        result: dict[str, Any] | None = None
        if row["kind"] == "crm.update_contact":
            run = store.conn.execute("SELECT * FROM fd_runs WHERE id=? AND tenant_id=?", (row["run_id"], tenant)).fetchone()
            task = store.conn.execute("SELECT * FROM fd_tasks WHERE id=? AND tenant_id=?", (row["task_id"], tenant)).fetchone()
            if decision == "approved":
                result = _apply_crm_action(store, tenant, row, ctx.principal_id)
                _set_run(store, run["id"], run["status"], "completed", tenant, note="approved action applied to the simulated CRM")
                _set_task(store, task["id"], task["status"], "done", tenant)
                log(store, tenant, ctx.principal_id, "crm.simulated_write", "contact", result["contact_id"], result, row["task_id"])
            else:
                _set_run(store, run["id"], run["status"], "cancelled", tenant, note="proposed action rejected")
                _set_task(store, task["id"], task["status"], "open", tenant)
        elif row["kind"] == "exchange.accept_quote":
            payload = json.loads(row["payload_json"])
            if decision == "approved":
                result = _finish_acceptance(store, tenant, ctx.principal_id, payload["quote_id"], row["id"])
                if result["outcome"] == "not_accepted":  # the decision could not take effect, so it must not stay reusable
                    store.conn.execute("UPDATE fd_approvals SET status='superseded' WHERE id=? AND tenant_id=?", (approval_id, tenant))
                    store.conn.execute("UPDATE fd_quotes SET status='declined' WHERE id=? AND tenant_id=? AND status='open'", (payload["quote_id"], tenant))
            else:
                store.conn.execute("UPDATE fd_quotes SET status='declined' WHERE id=? AND tenant_id=? AND status='open'", (payload["quote_id"], tenant))
        if result is not None:
            store.conn.execute("UPDATE fd_approvals SET action_result_json=? WHERE id=? AND tenant_id=?", (canon(result), approval_id, tenant))
        final = store.conn.execute("SELECT * FROM fd_approvals WHERE id=? AND tenant_id=?", (approval_id, tenant)).fetchone()
    store.append_audit(ctx.principal_id, f"foundation.approval_{decision}", "approval", approval_id)
    return _approval_json(final)


def _task_json(store: Any, tenant: str, row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "title": row["title"], "status": row["status"], "agent_id": row["agent_id"], "input": json.loads(row["input_json"]),
        "result": {"text": row["result_text"], "version": row["result_version"], "run_id": row["result_run_id"] or None,
                   "last_edited_by": row["result_edited_by"] or None},
        "created_at": row["created_at"], "updated_at": row["updated_at"],
    }


def get_task(store: Any, tenant: str, task_id: str) -> dict[str, Any]:
    row = _task(store, tenant, task_id)
    out = _task_json(store, tenant, row)
    agent = get_agent(store, tenant, row["agent_id"])
    runs = store.conn.execute("SELECT * FROM fd_runs WHERE task_id=? ORDER BY created_at, rowid", (task_id,)).fetchall()
    out["agent"] = {k: agent[k] for k in ("id", "name", "runtime", "controls", "blueprint", "installs", "latest_evaluation")}
    out["runs"] = [{"id": r["id"], "status": r["status"], "adapter": r["adapter"], "note": r["note"], "outputs": _loads(r["outputs_json"], {}),
                    "created_at": r["created_at"], "updated_at": r["updated_at"]} for r in runs]
    out["approvals"] = [_approval_json(r) for r in store.conn.execute(
        "SELECT * FROM fd_approvals WHERE task_id=? AND tenant_id=? ORDER BY created_at, rowid", (task_id, tenant)).fetchall()]
    out["exchange"] = {
        "quotes": [_quote_json(r) for r in store.conn.execute(
            "SELECT * FROM fd_quotes WHERE task_id=? AND tenant_id=? ORDER BY created_at, rowid", (task_id, tenant)).fetchall()],
        "jobs": [_job_json(r) for r in store.conn.execute(
            "SELECT * FROM fd_jobs WHERE task_id=? AND tenant_id=? ORDER BY created_at, rowid", (task_id, tenant)).fetchall()],
    }
    contact = store.conn.execute("SELECT * FROM fd_contacts WHERE tenant_id=? AND contact_id=?", (tenant, out["input"].get("contact_id", ""))).fetchone()
    out["contact"] = ({"contact_id": contact["contact_id"], "name": contact["name"], "stage": contact["stage"],
                       "notes": json.loads(contact["notes_json"]), "simulated": True} if contact else None)
    out["activity"] = list_activity(store, tenant, task_id)
    out["simulated_cost_minor"] = sum(j["usage_minor"] for j in out["exchange"]["jobs"])
    out["currency"] = "AUD"
    out["provenance"] = [{"name": i["package_name"], "version": i["version"], "content_hash": i["content_hash"], "source": i["source"]}
                         for i in agent["installs"]]
    return out


def list_tasks(store: Any, tenant: str) -> list[dict[str, Any]]:
    rows = store.conn.execute("SELECT * FROM fd_tasks WHERE tenant_id=? ORDER BY created_at DESC, rowid DESC", (tenant,)).fetchall()
    out = []
    for r in rows:
        t = _task_json(store, tenant, r)
        t["pending_approvals"] = store.conn.execute(
            "SELECT COUNT(*) AS n FROM fd_approvals WHERE task_id=? AND status='pending'", (r["id"],)).fetchone()["n"]
        out.append(t)
    return out


def list_activity(store: Any, tenant: str, task_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    sql, args = "SELECT * FROM fd_activity WHERE tenant_id=?", [tenant]
    if task_id:
        sql += " AND task_id=?"
        args.append(task_id)
    rows = store.conn.execute(sql + " ORDER BY created_at DESC, rowid DESC LIMIT ?", (*args, max(1, min(limit, 300)))).fetchall()
    return [{"id": r["id"], "kind": r["kind"], "entity_type": r["entity_type"], "entity_id": r["entity_id"], "actor": r["actor"],
             "task_id": r["task_id"] or None, "detail": json.loads(r["detail_json"]), "created_at": r["created_at"]} for r in rows]


# ---- Exchange (simulated) -------------------------------------------------------------------------


def ensure_policy(store: Any, tenant: str) -> None:
    """Create the default policy row in its own short transaction. Call outside any other transaction."""
    with registry.transaction(store):
        store.conn.execute(
            """INSERT OR IGNORE INTO fd_exchange_policy (tenant_id, currency, budget_limit_minor, approval_threshold_minor, updated_at)
               VALUES (?, 'AUD', 5000, 200, ?)""", (tenant, now()))


def policy_row(store: Any, tenant: str) -> dict[str, Any]:
    """Read only. Without a stored row this reports the defaults, which are also what ensure_policy stores."""
    row = store.conn.execute("SELECT * FROM fd_exchange_policy WHERE tenant_id=?", (tenant,)).fetchone()
    cur, limit, threshold, reserved, spent = (
        (row["currency"], row["budget_limit_minor"], row["approval_threshold_minor"], row["reserved_minor"], row["spent_simulated_minor"])
        if row else ("AUD", 5000, 200, 0, 0))
    return {"currency": cur, "budget_limit_minor": limit,
            "approval_threshold_minor": threshold, "reserved_minor": reserved,
            "spent_simulated_minor": spent,
            "remaining_minor": limit - reserved - spent,
            "simulated": True, "note": "Illustrative limits. Amounts are integer minor units. Nothing is charged."}


def set_policy(store: Any, tenant: str, principal: str, budget_limit_minor: int, approval_threshold_minor: int) -> dict[str, Any]:
    ensure_policy(store, tenant)
    before = policy_row(store, tenant)
    with registry.transaction(store):
        store.conn.execute("UPDATE fd_exchange_policy SET budget_limit_minor=?, approval_threshold_minor=?, updated_at=? WHERE tenant_id=?",
                           (budget_limit_minor, approval_threshold_minor, now(), tenant))
        log(store, tenant, principal, "exchange.policy_changed", "policy", tenant,
            {"budget_limit_minor": [before["budget_limit_minor"], budget_limit_minor],
             "approval_threshold_minor": [before["approval_threshold_minor"], approval_threshold_minor]})
    store.append_audit(principal, "foundation.exchange_policy_changed", "policy", tenant)
    return policy_row(store, tenant)


def _cap(capability_id: str) -> dict[str, Any]:
    cap = next((c for c in demo.CAPABILITIES if c["id"] == capability_id), None)
    if cap is None:
        raise StoreError("unknown capability", 404)
    return cap


def catalogue() -> dict[str, Any]:
    return {"label": "Demo catalogue. Providers, prices, ratings and results are fictional.", "simulated": True, "items": demo.CAPABILITIES}


def _quote_json(row: Any) -> dict[str, Any]:
    job = None
    return {"id": row["id"], "capability_id": row["capability_id"], "task_id": row["task_id"] or None, "input": json.loads(row["input_json"]),
            "estimate_minor": row["estimate_minor"], "currency": row["currency"], "expires_at": row["expires_at"],
            "status": row["status"], "policy_preview": json.loads(row["policy_json"]), "created_at": row["created_at"],
            "simulated": True, "job": job}


def _job_json(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "quote_id": row["quote_id"], "capability_id": row["capability_id"], "task_id": row["task_id"] or None,
        "approval_id": row["approval_id"] or None, "status": row["status"], "currency": row["currency"],
        "estimate_minor": row["authorised_minor"], "authorised_minor": row["authorised_minor"] if row["status"] in ("accepted", "running", "delivered") else 0,
        "usage_minor": row["usage_minor"], "result": _loads(row["result_json"]), "validation": _loads(row["validation_json"]),
        "simulated": True, "label": demo.SIM_LABEL, "created_at": row["created_at"], "updated_at": row["updated_at"],
        "dispute": {"state": "unavailable", "refund": "unavailable", "note": "Placeholders. Disputes and refunds are not implemented."},
    }


def request_quote(store: Any, tenant: str, principal: str, capability_id: str, task_id: str | None, raw_input: Any) -> dict[str, Any]:
    cap = _cap(capability_id)
    if task_id:
        _task(store, tenant, task_id)
    if not isinstance(raw_input, dict):
        raise StoreError("input must be an object", 422)
    _bounded(raw_input, "the quote input")
    missing = [k for k in cap["input_schema"]["required"] if not raw_input.get(k)]
    if missing:
        raise StoreError(f"input is missing: {', '.join(missing)}", 422)
    _scan(raw_input, "a quote request")
    ensure_policy(store, tenant)
    policy = policy_row(store, tenant)
    estimate = int(cap["price_minor"])
    preview = {
        "requires_approval": estimate > policy["approval_threshold_minor"], "within_budget": estimate <= policy["remaining_minor"],
        "evaluated_at": now(), "note": "Preview only. Policy is checked again, with the policy in force then, when the quote is accepted.",
    }
    with registry.transaction(store):
        if store.conn.execute("SELECT COUNT(*) AS n FROM fd_quotes WHERE tenant_id=? AND status='open' AND expires_at > ?", (tenant, now())).fetchone()["n"] >= MAX_QUOTES:
            raise StoreError("quote quota reached", 429)
        qid, ts = _id("qte"), now()
        store.conn.execute(
            """INSERT INTO fd_quotes (id, tenant_id, capability_id, task_id, input_json, estimate_minor, currency, expires_at, status, policy_json, created_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)""",
            (qid, tenant, capability_id, task_id or "", canon(raw_input), estimate, cap["currency"], _plus(ts, QUOTE_TTL_SECONDS), canon(preview), principal, ts),
        )
        log(store, tenant, principal, "exchange.quote_requested", "quote", qid, {"capability": capability_id, "estimate_minor": estimate, "simulated": True}, task_id or "")
    return _quote_json(store.conn.execute("SELECT * FROM fd_quotes WHERE id=?", (qid,)).fetchone())


def list_quotes(store: Any, tenant: str) -> list[dict[str, Any]]:
    out = []
    for r in store.conn.execute("SELECT * FROM fd_quotes WHERE tenant_id=? ORDER BY created_at DESC, rowid DESC", (tenant,)).fetchall():
        q = _quote_json(r)
        job = store.conn.execute("SELECT id, status FROM fd_jobs WHERE quote_id=?", (r["id"],)).fetchone()
        q["job"] = {"id": job["id"], "status": job["status"]} if job else None
        out.append(q)
    return out


def _quote_payload(q: Any) -> dict[str, Any]:
    return {"quote_id": q["id"], "capability_id": q["capability_id"], "estimate_minor": q["estimate_minor"], "currency": q["currency"],
            "task_id": q["task_id"], "simulated": True}


def _finish_acceptance(store: Any, tenant: str, principal: str, quote_id: str, approval_id: str) -> dict[str, Any]:
    """Create the job only if every condition holds now. Caller holds the transaction. Idempotent per quote.

    Enforced here, not in the route: expiry, budget under the policy in force now, and (above the threshold) an approved
    decision bound to this exact quote payload. Returns outcome job_created, job_exists or not_accepted (with a reason)."""
    existing = store.conn.execute("SELECT * FROM fd_jobs WHERE quote_id=? AND tenant_id=?", (quote_id, tenant)).fetchone()
    if existing is not None:
        return {"outcome": "job_exists", "job": _job_json(existing), "idempotent": True}
    q = store.conn.execute("SELECT * FROM fd_quotes WHERE id=? AND tenant_id=?", (quote_id, tenant)).fetchone()
    if q is None:
        raise StoreError("not found", 404)
    policy = policy_row(store, tenant)
    reason = None
    if q["status"] != "open":
        reason = f"quote is {q['status']}"
    elif now() > q["expires_at"]:
        store.conn.execute("UPDATE fd_quotes SET status='expired' WHERE id=? AND tenant_id=?", (quote_id, tenant))
        reason = "quote expired"
    elif q["estimate_minor"] > policy["remaining_minor"]:
        reason = f"over budget: estimate {q['estimate_minor']} exceeds remaining {policy['remaining_minor']} minor units"
    elif q["estimate_minor"] > policy["approval_threshold_minor"]:
        ap = store.conn.execute("SELECT * FROM fd_approvals WHERE id=? AND tenant_id=?", (approval_id, tenant)).fetchone() if approval_id else None
        if (ap is None or ap["kind"] != "exchange.accept_quote" or ap["status"] != "approved"
                or ap["payload_hash"] != digest(_quote_payload(q)) or digest(json.loads(ap["payload_json"])) != ap["payload_hash"]):
            reason = "approval required: no approved decision matches this exact quote"
    if reason:
        log(store, tenant, principal, "exchange.policy_denied", "quote", quote_id, {"reason": reason}, q["task_id"])
        return {"outcome": "not_accepted", "reason": reason}
    jid, ts = _id("job"), now()
    store.conn.execute(
        """INSERT INTO fd_jobs (id, tenant_id, quote_id, capability_id, task_id, approval_id, status, authorised_minor, currency, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'accepted', ?, ?, ?, ?)""",
        (jid, tenant, quote_id, q["capability_id"], q["task_id"], approval_id, q["estimate_minor"], q["currency"], ts, ts),
    )
    store.conn.execute("UPDATE fd_quotes SET status='accepted' WHERE id=? AND tenant_id=?", (quote_id, tenant))
    store.conn.execute("UPDATE fd_exchange_policy SET reserved_minor = reserved_minor + ?, updated_at=? WHERE tenant_id=?",
                       (q["estimate_minor"], ts, tenant))
    log(store, tenant, principal, "exchange.job_accepted", "job", jid,
        {"quote_id": quote_id, "authorised_minor": q["estimate_minor"], "approval_id": approval_id or None, "simulated": True}, q["task_id"])
    return {"outcome": "job_created", "job": _job_json(store.conn.execute("SELECT * FROM fd_jobs WHERE id=? AND tenant_id=?", (jid, tenant)).fetchone()), "idempotent": False}


def accept_quote(store: Any, tenant: str, principal: str, quote_id: str) -> dict[str, Any]:
    with registry.transaction(store):
        out = _accept_inner(store, tenant, principal, quote_id)
    if out["outcome"] == "not_accepted":  # raised after commit, so the denial and any expiry stay on record
        raise StoreError(f"not accepted: {out['reason']}", 409)
    return out


def _accept_inner(store: Any, tenant: str, principal: str, quote_id: str) -> dict[str, Any]:
    q = store.conn.execute("SELECT * FROM fd_quotes WHERE id=? AND tenant_id=?", (quote_id, tenant)).fetchone()
    if q is None:
        raise StoreError("not found", 404)
    existing = store.conn.execute("SELECT * FROM fd_jobs WHERE quote_id=? AND tenant_id=?", (quote_id, tenant)).fetchone()
    if existing is not None:
        return {"outcome": "job_exists", "job": _job_json(existing), "idempotent": True}
    policy = policy_row(store, tenant)  # the policy in force now, not the one at quote time
    needs_approval = (q["status"] == "open" and now() <= q["expires_at"] and q["estimate_minor"] <= policy["remaining_minor"]
                      and q["estimate_minor"] > policy["approval_threshold_minor"])
    if not needs_approval:
        return _finish_acceptance(store, tenant, principal, quote_id, "")
    payload = _quote_payload(q)
    h = digest(payload)
    approvals = store.conn.execute(
        "SELECT * FROM fd_approvals WHERE tenant_id=? AND kind='exchange.accept_quote' AND payload_hash=? ORDER BY created_at DESC, rowid DESC",
        (tenant, h)).fetchall()
    approved = next((a for a in approvals if a["status"] == "approved"), None)
    if approved is not None:
        return _finish_acceptance(store, tenant, principal, quote_id, approved["id"])
    pending = next((a for a in approvals if a["status"] == "pending"), None)
    if pending is None:
        aid = _id("apr")
        store.conn.execute(
            """INSERT INTO fd_approvals (id, tenant_id, task_id, run_id, kind, payload_json, payload_hash, status, requested_by, created_at)
               VALUES (?, ?, ?, '', 'exchange.accept_quote', ?, ?, 'pending', ?, ?)""",
            (aid, tenant, q["task_id"], canon(payload), h, principal, now()))
        log(store, tenant, principal, "workspace.approval_requested", "approval", aid,
            {"kind": "exchange.accept_quote", "estimate_minor": q["estimate_minor"], "threshold_minor": policy["approval_threshold_minor"]}, q["task_id"])
        pending = store.conn.execute("SELECT * FROM fd_approvals WHERE id=? AND tenant_id=?", (aid, tenant)).fetchone()
    return {"outcome": "awaiting_approval", "approval": _approval_json(pending),
            "decision": {"requires_approval": True, "reason": f"estimate {q['estimate_minor']} is above the approval threshold {policy['approval_threshold_minor']} (minor units)"}}


def _one(cursor: Any) -> None:
    if cursor.rowcount != 1:
        raise StoreError("the job changed while this was happening. Reload and try again", 409)


def _job(store: Any, tenant: str, job_id: str) -> Any:
    row = store.conn.execute("SELECT * FROM fd_jobs WHERE id=? AND tenant_id=?", (job_id, tenant)).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    return row


def advance_job(store: Any, tenant: str, principal: str, job_id: str) -> dict[str, Any]:
    with registry.transaction(store):
        job = _job(store, tenant, job_id)
        status = job["status"]
        ts = now()
        if status == "accepted":
            _check_transition(JOB_TRANSITIONS, status, "running", "job")
            _one(store.conn.execute("UPDATE fd_jobs SET status='running', updated_at=? WHERE id=? AND tenant_id=? AND status='accepted'", (ts, job_id, tenant)))
            log(store, tenant, principal, "exchange.job_running", "job", job_id, {"simulated": True}, job["task_id"])
        elif status == "running":
            quote = store.conn.execute("SELECT input_json FROM fd_quotes WHERE id=? AND tenant_id=?", (job["quote_id"], tenant)).fetchone()
            result = {**demo.generic_result(job["capability_id"], json.loads(quote["input_json"])), "label": demo.SIM_LABEL}
            _check_transition(JOB_TRANSITIONS, status, "delivered", "job")
            _one(store.conn.execute("UPDATE fd_jobs SET status='delivered', result_json=?, updated_at=? WHERE id=? AND tenant_id=? AND status='running'", (canon(result), ts, job_id, tenant)))
            log(store, tenant, principal, "exchange.job_delivered", "job", job_id, {"simulated": True}, job["task_id"])
        elif status == "delivered":
            cap = _cap(job["capability_id"])
            result = json.loads(job["result_json"])
            missing = [k for k in cap["output_schema"]["required"] if k not in result]
            validation = {"passed": not missing, "method": "Fixture check: required output fields present. Not a quality assessment.", "missing": missing}
            final = "validated" if not missing else "validation_failed"
            _check_transition(JOB_TRANSITIONS, status, final, "job")
            usage = job["authorised_minor"] if not missing else 0
            _one(store.conn.execute("UPDATE fd_jobs SET status=?, usage_minor=?, validation_json=?, updated_at=? WHERE id=? AND tenant_id=? AND status='delivered'",
                                    (final, usage, canon(validation), ts, job_id, tenant)))
            store.conn.execute(
                "UPDATE fd_exchange_policy SET reserved_minor = reserved_minor - ?, spent_simulated_minor = spent_simulated_minor + ?, updated_at=? WHERE tenant_id=?",
                (job["authorised_minor"], usage, ts, tenant))
            log(store, tenant, principal, f"exchange.job_{final}", "job", job_id,
                {"usage_minor": usage, "simulated": True, "returned_to_task": bool(job["task_id"] and not missing)}, job["task_id"])
        else:
            raise StoreError(f"a {status} job cannot advance", 409)
    return _job_json(_job(store, tenant, job_id))


def cancel_job(store: Any, tenant: str, principal: str, job_id: str) -> dict[str, Any]:
    with registry.transaction(store):
        job = _job(store, tenant, job_id)
        _check_transition(JOB_TRANSITIONS, job["status"], "cancelled", "job")
        ts = now()
        _one(store.conn.execute("UPDATE fd_jobs SET status='cancelled', updated_at=? WHERE id=? AND tenant_id=? AND status IN ('accepted','running')", (ts, job_id, tenant)))
        store.conn.execute("UPDATE fd_exchange_policy SET reserved_minor = reserved_minor - ?, updated_at=? WHERE tenant_id=?",
                           (job["authorised_minor"], ts, tenant))
        log(store, tenant, principal, "exchange.job_cancelled", "job", job_id, {"released_minor": job["authorised_minor"]}, job["task_id"])
    return _job_json(_job(store, tenant, job_id))


def list_jobs(store: Any, tenant: str) -> list[dict[str, Any]]:
    return [_job_json(r) for r in store.conn.execute("SELECT * FROM fd_jobs WHERE tenant_id=? ORDER BY created_at DESC, rowid DESC", (tenant,)).fetchall()]


# ---- platform: context, flags, overview, seed ------------------------------------------------------


def context(store: Any, ctx: AuthContext) -> dict[str, Any]:
    principal = store.principal(ctx.principal_id)
    classes = store.grant_classes(ctx.principal_id)
    seat = store.conn.execute("SELECT template FROM seats WHERE principal_id=?", (ctx.principal_id,)).fetchone()
    if principal["kind"] == "agent":
        role = "Agent"
    elif "org.admin" in classes:
        role = "Owner / Founder"
    elif seat and seat["template"] == "project_lead":
        role = "Project Lead"
    elif "memory.write" in classes:
        role = "Operator"
    else:
        role = "Member"
    return {
        "organisation": {"id": ctx.tenant_id, "name": _org_name(store, ctx.tenant_id)},
        "member": {"principal_id": ctx.principal_id, "kind": principal["kind"], "role": role, "can_decide_approvals": principal["kind"] == "human" and ("approval.org.admin" in classes or "org.admin" in classes),
            "permissions": {
                "view": "memory.read" in classes or "org.admin" in classes,
                "write": "memory.write" in classes or "org.admin" in classes,
                "admin": "org.admin" in classes,
                "decide": principal["kind"] == "human" and ("approval.org.admin" in classes or "org.admin" in classes),
                "policy": "org.admin" in classes,
            },
        },
        "identity_note": "Seeded local demo identity. This is not production authentication and must not be exposed publicly.",
        "permission_mapping": {
            "view": "memory.read or org.admin", "create_and_run": "memory.write or org.admin",
            "decide_approvals": "human principal holding approval.org.admin or org.admin (Owner/Founder)",
            "seed_and_reset": "org.admin", "exchange_policy": "org.admin",
        },
        "disabled_products": sorted(disabled_products()),
    }


ACCESS_SURFACES = [
    {"name": "Papership API", "classification": "Access surface for external systems", "status": "implemented",
     "note": "HTTP routes under /registry, /platform, /workspace, /studio and /exchange. Sample contracts: docs/platform/API_CONTRACTS.md. Authenticated, org-scoped."},
    {"name": "Papership SDK", "classification": "Access surface for external systems", "status": "planned", "note": "Not built."},
    {"name": "Papership CLI", "classification": "Access surface for external systems", "status": "planned", "note": "Not built."},
    {"name": "Papership MCP server", "classification": "Access surface for external systems", "status": "planned", "note": "Not built."},
    {"name": "Papership Cloud", "classification": "Managed hosting offering", "status": "planned", "note": "Nothing is hosted for you."},
    {"name": "Papership Enterprise", "classification": "Commercial offering with organisational capabilities", "status": "planned", "note": "No plans or billing."},
    {"name": "Agent Passport", "classification": "Portable identity and capabilities", "status": "implemented",
     "note": "Draft Papership format, exportable per agent. Describes an agent, grants no access."},
    {"name": "Materials marketplace", "classification": "Commercial functionality within Registry", "status": "unsupported", "note": "Price is metadata. No live purchase."},
    {"name": "Work marketplace", "classification": "Commercial functionality within Exchange", "status": "simulated", "note": "Entirely simulated."},
]


def capabilities() -> dict[str, Any]:
    off = disabled_products()
    products = [
        {"id": "workspace", "label": "Workspace", "promise": "One place for your people, agents, tools, and work.", "status": "implemented"},
        {"id": "registry", "label": "Registry", "promise": "Make expertise installable.", "status": "implemented"},
        {"id": "studio", "label": "Studio", "promise": "From agent idea to working deployment.", "status": "preview"},
        {"id": "exchange", "label": "Exchange", "promise": "Find and purchase the capability to get a task done.", "status": "demo"},
    ]
    for p in products:
        if p["id"] in off:
            p["status"] = "disabled"
    return {"products": products, "capabilities": CAPABILITY_MATRIX, "integrations": INTEGRATIONS, "access_surfaces": ACCESS_SURFACES,
            "deploy_targets": [{"id": i, "status": "implemented"} for i in SUPPORTED_DEPLOY_TARGETS] + [{"id": i, "status": "planned"} for i in PLANNED_DEPLOY_TARGETS], "tools": [{"id": k, **v} for k, v in TOOLS.items()],
            "status_meaning": {"implemented": "Works and is tested.", "simulated": "Works locally with fictional data and no external effect.",
                               "preview": "Works, but the surrounding product is not complete.", "demo": "Entirely simulated.",
                               "planned": "Not built.", "unsupported": "Not possible with the current integrations.", "disabled": "Turned off by configuration."}}


def overview(store: Any, tenant: str) -> dict[str, Any]:
    counts = {r["status"]: r["n"] for r in store.conn.execute(
        "SELECT status, COUNT(*) AS n FROM fd_tasks WHERE tenant_id=? GROUP BY status", (tenant,)).fetchall()}
    pending = list_approvals(store, tenant, "pending")
    return {
        "agents": store.conn.execute("SELECT COUNT(*) AS n FROM fd_agents WHERE tenant_id=?", (tenant,)).fetchone()["n"],
        "tasks_by_status": counts, "pending_approvals": pending, "exchange": policy_row(store, tenant),
        "recent_activity": list_activity(store, tenant, None, 12),
        "seeded": bool(store.conn.execute("SELECT 1 FROM fd_blueprints WHERE tenant_id=? AND slug=?", (tenant, demo.DEMO_BLUEPRINT["slug"])).fetchone()),
    }


def seed_demo(store: Any, ctx: AuthContext) -> dict[str, Any]:
    tenant, principal = ctx.tenant_id, ctx.principal_id
    published = []
    for m in demo.MATERIALS:
        out = registry.publish(store, tenant, principal, m["manifest"], m["files"])
        published.append(f"{out['name']}@{out['version']}")
    ensure_policy(store, tenant)
    with registry.transaction(store):
        for c in demo.DEMO_CONTACTS:
            store.conn.execute(
                "INSERT OR IGNORE INTO fd_contacts (tenant_id, contact_id, name, email, stage, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (tenant, c["contact_id"], c["name"], c["email"], c["stage"], now()))
    bp = demo.DEMO_BLUEPRINT
    saved = save_blueprint(store, tenant, principal, bp["slug"], bp["title"], bp["config"])
    steps = {"materials": published, "blueprint": {"id": saved["blueprint_id"], "version": saved["version"], "created": saved["created"]}}
    if not store.conn.execute("SELECT 1 FROM fd_agents WHERE tenant_id=? AND blueprint_id=?", (tenant, saved["blueprint_id"])).fetchone():
        steps["evaluation"] = {k: v for k, v in evaluate_version(store, tenant, principal, saved["blueprint_id"], saved["version"]).items() if k in ("passed", "total", "scope")}
        agent = instantiate_agent(store, tenant, principal, saved["blueprint_id"], saved["version"], "Enquiry Assistant")
        task = create_task(store, tenant, principal, "Reply to Priya Raman's enquiry about 14 Wattle Street", agent["id"], demo.DEMO_ENQUIRY)
        task = start_run(store, tenant, principal, task["id"])
        quote = request_quote(store, tenant, principal, "property-data-enrichment", task["id"], {"address": demo.DEMO_ENQUIRY["property_address"]})
        steps.update({"agent_id": agent["id"], "task_id": task["id"], "quote_id": quote["id"]})
    return {"seeded": True, "steps": steps, "note": "Fictional data only. Nothing was sent, purchased or published externally."}


def reset_demo(store: Any, tenant: str, principal: str = "") -> dict[str, Any]:
    tables = ["fd_activity", "fd_jobs", "fd_quotes", "fd_approvals", "fd_runs", "fd_tasks", "fd_installs", "fd_agents", "fd_eval_runs",
              "fd_blueprint_versions", "fd_blueprints", "fd_contacts", "fd_exchange_policy"]
    counts: dict[str, int] = {}
    with registry.transaction(store):
        for t in tables:
            counts[t] = store.conn.execute(f"DELETE FROM {t} WHERE tenant_id=?", (tenant,)).rowcount
        log(store, tenant, principal, "platform.demo_reset", "organisation", tenant, {"deleted_rows": sum(counts.values())})
    if principal:
        store.append_audit(principal, "foundation.demo_reset", "organisation", tenant)
    return {"reset": True, "deleted": counts,
            "note": "Registry packages are immutable and are kept. Seed again to recreate the blueprint, agent, task and quote."}


# ---- routes ------------------------------------------------------------------------------------------


class BlueprintBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str = Field(max_length=39)
    title: str = Field(max_length=120)
    config: dict[str, Any]


class ResolveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    materials: list[dict[str, str]] = Field(max_length=20)
    adapter: str = Field(default=demo.ADAPTER, max_length=60)


class InstantiateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(max_length=80)


class PublishBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    publisher: str = Field(default=demo.PUBLISHER, max_length=39)
    visibility: str = Field(default="private", max_length=10)


class InstallBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    agent_id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    constraint: str = Field(default="*", max_length=40)


class UpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    agent_id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    to_version: str = Field(max_length=20)
    reviewed_hash: str = Field(max_length=100)


class TaskBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(max_length=160)
    agent_id: str = Field(max_length=80)
    input: dict[str, Any]


class ResultBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(max_length=MAX_RESULT_CHARS)
    base_version: int = Field(ge=0)


class DecisionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: str = Field(max_length=10)
    payload_hash: str = Field(min_length=64, max_length=64)
    note: str = Field(default="", max_length=300)


class QuoteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    capability_id: str = Field(max_length=60)
    task_id: str | None = Field(default=None, max_length=80)
    input: dict[str, Any]


class PolicyBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    budget_limit_minor: int = Field(ge=0, le=10_000_000)
    approval_threshold_minor: int = Field(ge=0, le=10_000_000)


def register_routes(app: FastAPI, store: Any) -> None:
    migrate(store)

    def need(ctx: AuthContext, *classes: str) -> None:
        if not any(store.has_grant(ctx.principal_id, c) for c in classes):
            raise StoreError("missing grant", 403)

    def read(ctx: AuthContext) -> None:
        need(ctx, "memory.read", "org.admin")

    def write(ctx: AuthContext) -> None:
        need(ctx, "memory.write", "org.admin")

    def human_admin(ctx: AuthContext) -> None:
        need(ctx, "org.admin")
        if store.principal(ctx.principal_id)["kind"] != "human":
            raise StoreError("only a human Owner or Founder can do this", 403)

    # platform
    @app.get("/platform/context")
    def platform_context(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return context(store, ctx)

    @app.get("/platform/capabilities")
    def platform_capabilities(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return capabilities()

    @app.post("/platform/demo/seed")
    def platform_seed(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        human_admin(ctx)
        return seed_demo(store, ctx)

    @app.post("/platform/demo/reset")
    def platform_reset(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        human_admin(ctx)
        return reset_demo(store, ctx.tenant_id, ctx.principal_id)

    @app.post("/platform/resolve")
    def platform_resolve(body: ResolveBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("registry")
        if body.adapter not in SUPPORTED_ADAPTERS:
            raise StoreError(f"adapter not supported. Supported: {', '.join(SUPPORTED_ADAPTERS)}", 422)
        for m in body.materials:
            registry.split_name(m.get("name", ""))
            registry.parse_constraint(m.get("constraint", "*"))
        return resolve_selection(store, ctx.tenant_id, [{"name": m["name"], "constraint": m.get("constraint", "*")} for m in body.materials], body.adapter)

    @app.post("/platform/installs")
    def platform_install(body: InstallBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("registry")
        return install_material(store, ctx.tenant_id, ctx.principal_id, body.agent_id, body.name, body.constraint)

    @app.get("/platform/installs/updates")
    def platform_updates(agent_id: Annotated[str, Query(max_length=80)] = "", ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("registry")
        return list_updates(store, ctx.tenant_id, agent_id)

    @app.post("/platform/installs/update")
    def platform_apply_update(body: UpdateBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("registry")
        return apply_update(store, ctx.tenant_id, ctx.principal_id, body.agent_id, body.name, body.to_version, body.reviewed_hash)

    @app.get("/workspace/agents/{agent_id}/passport")
    def ws_agent_passport(agent_id: Annotated[str, Path(max_length=80)], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return agent_passport(store, ctx.tenant_id, agent_id)

    # workspace
    @app.get("/workspace/overview")
    def ws_overview(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return overview(store, ctx.tenant_id)

    @app.get("/workspace/agents")
    def ws_agents(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return {"items": list_agents(store, ctx.tenant_id)}

    @app.get("/workspace/agents/{agent_id}")
    def ws_agent(agent_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return get_agent(store, ctx.tenant_id, agent_id)

    @app.post("/workspace/tasks")
    def ws_create_task(body: TaskBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("workspace")
        return create_task(store, ctx.tenant_id, ctx.principal_id, body.title, body.agent_id, body.input)

    @app.get("/workspace/tasks")
    def ws_tasks(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return {"items": list_tasks(store, ctx.tenant_id)}

    @app.get("/workspace/tasks/{task_id}")
    def ws_task(task_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return get_task(store, ctx.tenant_id, task_id)

    @app.post("/workspace/tasks/{task_id}/run")
    def ws_run(task_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("workspace")
        return start_run(store, ctx.tenant_id, ctx.principal_id, task_id)

    @app.put("/workspace/tasks/{task_id}/result")
    def ws_result(task_id: str, body: ResultBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("workspace")
        return edit_result(store, ctx.tenant_id, ctx.principal_id, task_id, body.text, body.base_version)

    @app.post("/workspace/tasks/{task_id}/cancel")
    def ws_cancel(task_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("workspace")
        return cancel_task(store, ctx.tenant_id, ctx.principal_id, task_id)

    @app.get("/workspace/approvals")
    def ws_approvals(status: str | None = None, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return {"items": list_approvals(store, ctx.tenant_id, status)}

    @app.post("/workspace/approvals/{approval_id}/decision")
    def ws_decide(approval_id: str, body: DecisionBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        guard("workspace")
        return decide_approval(store, ctx, approval_id, body.decision, body.payload_hash, body.note)

    @app.get("/workspace/activity")
    def ws_activity(task_id: str | None = None, limit: int = 100, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        return {"items": list_activity(store, ctx.tenant_id, task_id, limit)}

    @app.get("/workspace/team")
    def ws_team(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        rows = store.conn.execute("SELECT id, kind, seat_id FROM principals WHERE tenant_id=? ORDER BY id", (ctx.tenant_id,)).fetchall()
        members = []
        for r in rows:
            classes = store.grant_classes(r["id"])
            role = "Agent" if r["kind"] == "agent" else "Owner / Founder" if "org.admin" in classes else "Operator or Lead" if "memory.write" in classes else "Member"
            members.append({"principal_id": r["id"], "kind": r["kind"], "role": role})
        return {"organisation": _org_name(store, ctx.tenant_id), "members": members, "note": "An agent role is not an access role. Authority comes from grants."}

    @app.get("/workspace/knowledge")
    def ws_knowledge(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("workspace")
        try:
            private = store.conn.execute("SELECT COUNT(*) AS n FROM kb_chunks WHERE tenant_id=?", (ctx.tenant_id,)).fetchone()["n"]
        except Exception:  # noqa: BLE001 - the knowledge loop tables may not exist in a minimal deployment
            private = 0
        return {"private_context_passages": private,
                "installed_materials": store.conn.execute("SELECT COUNT(*) AS n FROM fd_installs WHERE tenant_id=?", (ctx.tenant_id,)).fetchone()["n"],
                "note": "Private organisation knowledge is kept apart from Registry packages and is never published with a blueprint."}

    # studio
    @app.get("/studio/blueprints")
    def studio_list(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("studio")
        return {"items": list_blueprints(store, ctx.tenant_id)}

    @app.post("/studio/blueprints")
    def studio_save(body: BlueprintBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("studio")
        return save_blueprint(store, ctx.tenant_id, ctx.principal_id, body.slug, body.title, body.config)

    @app.post("/studio/resolve")
    def studio_resolve(body: ResolveBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("studio")
        if body.adapter not in SUPPORTED_ADAPTERS:
            raise StoreError(f"adapter not supported. Supported: {', '.join(SUPPORTED_ADAPTERS)}", 422)
        for m in body.materials:
            registry.split_name(m.get("name", ""))
            registry.parse_constraint(m.get("constraint", "*"))
        return resolve_selection(store, ctx.tenant_id, [{"name": m["name"], "constraint": m.get("constraint", "*")} for m in body.materials], body.adapter)

    @app.get("/studio/blueprints/{blueprint_id}")
    def studio_get(blueprint_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("studio")
        return get_blueprint(store, ctx.tenant_id, blueprint_id)

    @app.post("/studio/blueprints/{blueprint_id}/versions/{version}/evaluate")
    def studio_eval(blueprint_id: str, version: Annotated[int, Path(ge=1, le=1_000_000)], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("studio")
        return evaluate_version(store, ctx.tenant_id, ctx.principal_id, blueprint_id, version)

    @app.post("/studio/blueprints/{blueprint_id}/versions/{version}/instantiate")
    def studio_instantiate(blueprint_id: str, version: Annotated[int, Path(ge=1, le=1_000_000)], body: InstantiateBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("studio")
        guard("workspace")
        return instantiate_agent(store, ctx.tenant_id, ctx.principal_id, blueprint_id, version, body.name)

    @app.get("/studio/blueprints/{blueprint_id}/versions/{version}/export")
    def studio_export(blueprint_id: str, version: Annotated[int, Path(ge=1, le=1_000_000)], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("studio")
        return export_blueprint(store, ctx.tenant_id, blueprint_id, version)

    @app.post("/studio/blueprints/{blueprint_id}/versions/{version}/publish")
    def studio_publish(blueprint_id: str, version: Annotated[int, Path(ge=1, le=1_000_000)], body: PublishBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("studio")
        guard("registry")
        if body.visibility not in ("private", "public"):
            raise StoreError("visibility must be private or public", 422)
        if body.visibility == "public":
            human_admin(ctx)  # a public bundle can carry eval inputs, so only a human Owner or Founder may release one
        return publish_blueprint(store, ctx.tenant_id, ctx.principal_id, blueprint_id, version, body.publisher, body.visibility)

    # exchange (all simulated)
    @app.get("/exchange/capabilities")
    def ex_caps(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("exchange")
        return catalogue()

    @app.get("/exchange/policy")
    def ex_policy(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("exchange")
        return policy_row(store, ctx.tenant_id)

    @app.post("/exchange/policy")
    def ex_set_policy(body: PolicyBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        human_admin(ctx)
        guard("exchange")
        return set_policy(store, ctx.tenant_id, ctx.principal_id, body.budget_limit_minor, body.approval_threshold_minor)

    @app.post("/exchange/quotes")
    def ex_quote(body: QuoteBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("exchange")
        return request_quote(store, ctx.tenant_id, ctx.principal_id, body.capability_id, body.task_id, body.input)

    @app.get("/exchange/quotes")
    def ex_quotes(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("exchange")
        return {"items": list_quotes(store, ctx.tenant_id)}

    @app.post("/exchange/quotes/{quote_id}/accept")
    def ex_accept(quote_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("exchange")
        return accept_quote(store, ctx.tenant_id, ctx.principal_id, quote_id)

    @app.get("/exchange/jobs")
    def ex_jobs(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("exchange")
        return {"items": list_jobs(store, ctx.tenant_id)}

    @app.get("/exchange/jobs/{job_id}")
    def ex_job(job_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        guard("exchange")
        return _job_json(_job(store, ctx.tenant_id, job_id))

    @app.post("/exchange/jobs/{job_id}/advance")
    def ex_advance(job_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("exchange")
        return advance_job(store, ctx.tenant_id, ctx.principal_id, job_id)

    @app.post("/exchange/jobs/{job_id}/cancel")
    def ex_cancel(job_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("exchange")
        return cancel_job(store, ctx.tenant_id, ctx.principal_id, job_id)

    @app.post("/exchange/jobs/{job_id}/dispute")
    def ex_dispute(job_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        guard("exchange")
        raise StoreError("unsupported: disputes and refunds are placeholders in this foundation", 501)
