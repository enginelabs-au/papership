"""Papership view of the Hermes areas in docs/capabilities.md §5 (D-37: owner-approved, gated).

Every area is enabled. Nothing runs outside the D-17 gates: read = catalogue, write = receipt,
external/destructive = an approved Papership approval then a receipt. Unknown tools are denied.
No toolset, session, skill or file list is invented: live catalogues come from the worker and
report ``blocked_runtime`` when Hermes' API server is not reachable.
"""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from app.store import Store, StoreError

GATES = {
    "read": "none",
    "write": "receipt",
    "external": "approval_then_receipt",
    "destructive": "approval_then_receipt",
}

# area -> catalogued toolsets (policy_hooks/catalog.py) that a run in that area may declare.
AREA_TOOLSETS: dict[str, tuple[str, ...]] = {
    "toolsets": (),
    "profiles": (),
    "sessions": ("session_search",),
    "skills": ("skills",),
    "memory": ("memory",),
    "scheduling": ("cronjob",),
    "delegation": ("delegation",),
    "browser": ("browser",),
    "research": ("web",),
    "code_execution": ("code_execution", "terminal", "file"),
    "documents": ("file", "vision"),
    "media": ("vision", "video", "tts"),
    "runs": ("github", "email_send", "homeassistant", "computer_use", "todo", "clarify"),
    "health": (),
}

AREAS: tuple[dict[str, Any], ...] = (
    {
        "id": "toolsets",
        "label": "Tools and toolsets",
        "via": "query",
        "query_op": "toolsets",
        "local_surface": None,
        "reason": "The live toolset list is read through the worker. The governed catalogue below is what a run may declare.",
    },
    {
        "id": "profiles",
        "label": "Profiles",
        "via": "native",
        "local_surface": "/agents",
        "reason": "Papership agents are the profile record. A run carries a session id. No per-profile key is stored.",
    },
    {
        "id": "sessions",
        "label": "Sessions",
        "via": "query",
        "query_op": "session_create",
        "local_surface": None,
        "reason": "Sessions are created and read through the worker. Transcripts are read on request, not copied.",
    },
    {
        "id": "skills",
        "label": "Skills",
        "via": "query",
        "query_op": "skills",
        "local_surface": None,
        "reason": "The live skill catalogue is read through the worker. Changing a skill is a write run with a receipt.",
    },
    {
        "id": "memory",
        "label": "Memory",
        "via": "native",
        "local_surface": "/memory",
        "reason": "Governed memory lives in the Papership store. Hermes memory tools run as gated runs.",
    },
    {
        "id": "scheduling",
        "label": "Scheduling",
        "via": "native",
        "local_surface": "/schedules",
        "reason": "Papership owns schedules. A Hermes cron job is a write run with a receipt.",
    },
    {
        "id": "delegation",
        "label": "Delegation",
        "via": "run",
        "local_surface": None,
        "reason": "Subagent delegation is a write run with a receipt. Scope is the declared tool.",
    },
    {
        "id": "browser",
        "label": "Browser",
        "via": "run",
        "local_surface": None,
        "reason": "Browser tools run as gated runs. Private and cloud-metadata hosts are denied.",
    },
    {
        "id": "research",
        "label": "Research",
        "via": "run",
        "local_surface": None,
        "reason": "Web search and extract run as gated runs. Public https is allowed. Private hosts are denied.",
    },
    {
        "id": "code_execution",
        "label": "Code and file execution",
        "via": "run",
        "local_surface": None,
        "reason": "Terminal, file and code tools run as write runs with a receipt, scoped to the declared tool.",
    },
    {
        "id": "documents",
        "label": "Document handling",
        "via": "native",
        "local_surface": "/domains/B11/records",
        "reason": "Document intake is a native Papership record. File and vision tools run as gated runs.",
    },
    {
        "id": "media",
        "label": "Media",
        "via": "run",
        "local_surface": None,
        "reason": "Image, video and speech tools run as write runs with a receipt.",
    },
    {
        "id": "runs",
        "label": "Runs and control",
        "via": "run",
        "local_surface": "/hermes/runs",
        "reason": "Runs are queued here, started by the worker, and approved before any external action.",
    },
    {
        "id": "health",
        "label": "Health and usage",
        "via": "native",
        "local_surface": "/health",
        "reason": "Papership /health reports the Hermes probe. Live readiness is the worker probe.",
    },
)

AREA_IDS = tuple(area["id"] for area in AREAS)
QUERY_OPS = ("toolsets", "skills", "session_create", "session_messages")
SESSION_ID = re.compile(r"[A-Za-z0-9_-]{1,80}")


def _catalog() -> dict[str, tuple[str, str]]:
    path = Path(__file__).resolve().parents[2] / "worker" / "policy_hooks" / "catalog.py"
    if not path.is_file():
        return {}
    spec = importlib.util.spec_from_file_location("papership_worker_catalog", path)
    if spec is None or spec.loader is None:
        return {}
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return dict(module.TOOLS)


def area_tools(area_id: str) -> list[dict[str, str]]:
    toolsets = AREA_TOOLSETS.get(area_id, ())
    return [
        {"name": name, "toolset": toolset, "risk": risk, "gate": GATES[risk]}
        for name, (toolset, risk) in sorted(_catalog().items())
        if toolset in toolsets
    ]


def _can_read(store: Store, principal_id: str) -> None:
    if not any(store.has_grant(principal_id, grant) for grant in ("ledger.read", "org.admin", "usage.read")):
        raise StoreError("denied: hermes inventory", 403)


def can_run(store: Store, principal_id: str) -> None:
    if not (store.has_grant(principal_id, "run.start") or store.has_grant(principal_id, "org.admin")):
        raise StoreError("denied: run.start", 403)


def inventory(store: Store, principal_id: str, live: str = "unknown", pin: str = "") -> dict[str, Any]:
    _can_read(store, principal_id)
    areas = []
    for area in AREAS:
        tools = area_tools(area["id"])
        areas.append(
            {
                **area,
                "status": "configured",
                "tools": tools,
                "items": [],
                "write_accepted": True,
                "gates": GATES,
                "live_hermes": live,
            }
        )
    return {
        "areas": areas,
        "count": len(areas),
        "write_accepted": True,
        "decision": "D-37",
        "gates": GATES,
        "pin_recorded": bool(pin),
    }


def execute(
    store: Store,
    principal_id: str,
    tenant_id: str,
    area_id: str,
    tool: str,
    arguments: dict[str, Any] | None,
    session_id: str = "",
) -> dict[str, Any]:
    """Queue a gated run for a catalogued tool in this area. The worker starts it after policy and approval."""
    from app import hermes_runs

    if area_id not in AREA_IDS:
        raise StoreError("unknown hermes area", 404)
    can_run(store, principal_id)
    allowed = {t["name"]: t for t in area_tools(area_id)}
    if tool not in allowed:
        raise StoreError(f"tool {tool!r} is not catalogued for {area_id}", 422)
    if session_id and not SESSION_ID.fullmatch(session_id):
        raise StoreError("invalid session id", 422)
    job = store.persist_job(principal_id, f"hermes:{area_id}:{tool}")
    store.add_receipt(job["id"], "run.persist", f"{job['id']}:start")
    request = hermes_runs.record_request(
        store, job["id"], tenant_id, tool, arguments or {}, session_id, requester_id=principal_id
    )
    return {"job": job, "hermes_request": request, "gate": allowed[tool]["gate"], "risk": allowed[tool]["risk"]}
