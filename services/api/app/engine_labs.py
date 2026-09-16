"""Engine Labs operator loop: first managed project is Papership itself."""

from __future__ import annotations

from typing import Any

from app.loop import LOOP_STAGES
from app.store import Store, StoreError, _id, _now

PAPERSHIP_SLUG = "papership"
MCG_SLUG = "mcg"
FORBIDDEN_SLUGS = frozenset({"quark", "portability", "mvq", "p-008", "p-018"})

PAPERSHIP_PROJECT = {
    "slug": PAPERSHIP_SLUG,
    "name": "Papership / Engine Labs",
    "kind": "self",
    "status": "active",
    "note": "First managed project. The operator loop runs against this repository.",
}
MCG_PROJECT = {
    "slug": MCG_SLUG,
    "name": "MCG Property Shoalhaven",
    "kind": "client",
    "status": "paused",
    "note": "Paused — client has no budget. Do not start an Engine Labs job here.",
}


def migrate_engine_labs(store: Store) -> None:
    store.conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS managed_projects (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          slug TEXT NOT NULL,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          status TEXT NOT NULL,
          note TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE (tenant_id, slug)
        );
        CREATE TABLE IF NOT EXISTS engine_labs_jobs (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          work_item_id TEXT NOT NULL,
          title TEXT NOT NULL,
          request TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        """
    )
    store.flush()


def seed_managed_projects(store: Store, tenant_id: str) -> None:
    for spec in (PAPERSHIP_PROJECT, MCG_PROJECT):
        existing = store.conn.execute(
            "SELECT id FROM managed_projects WHERE tenant_id=? AND slug=?",
            (tenant_id, spec["slug"]),
        ).fetchone()
        if existing:
            store.conn.execute(
                "UPDATE managed_projects SET name=?, kind=?, status=?, note=? WHERE id=?",
                (spec["name"], spec["kind"], spec["status"], spec["note"], existing["id"]),
            )
            continue
        store.conn.execute(
            """INSERT INTO managed_projects
               (id, tenant_id, slug, name, kind, status, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                f"project-{spec['slug']}",
                tenant_id,
                spec["slug"],
                spec["name"],
                spec["kind"],
                spec["status"],
                spec["note"],
                _now(),
            ),
        )
    store.flush()


def readiness() -> dict[str, Any]:
    return {
        "loop_ready": True,
        "loop_stages": list(LOOP_STAGES),
        "first_project": PAPERSHIP_SLUG,
        "bound_repository": "enginelabs-au/papership",
        "mcg": "paused",
        "quark": "separate",
        "portability": "separate",
        "execute_release": False,
        "hermes_write_accepted": False,
        "note": "A job can be created and walked on the ledger. Live GitHub open stays dry-run. Hermes write/external accepted stays unauthorized.",
    }


def list_projects(store: Store, principal_id: str) -> list[dict[str, Any]]:
    p = store.principal(principal_id)
    rows = store.conn.execute(
        "SELECT * FROM managed_projects WHERE tenant_id=? ORDER BY slug",
        (p["tenant_id"],),
    ).fetchall()
    return [store.row_to_dict(row) for row in rows]  # type: ignore[misc]


def _project(store: Store, tenant_id: str, slug: str) -> dict[str, Any]:
    row = store.conn.execute(
        "SELECT * FROM managed_projects WHERE tenant_id=? AND slug=?",
        (tenant_id, slug),
    ).fetchone()
    if not row:
        raise StoreError("unknown managed project", 404)
    return store.row_to_dict(row)  # type: ignore[return-value]


def create_job(store: Store, principal_id: str, body: dict[str, Any]) -> dict[str, Any]:
    if not store.has_grant(principal_id, "ledger.write") and not store.has_grant(principal_id, "org.admin"):
        raise StoreError("denied: engine labs job", 403)
    p = store.principal(principal_id)
    slug = str(body.get("project") or PAPERSHIP_SLUG).strip().lower()
    if slug in FORBIDDEN_SLUGS:
        raise StoreError("keep separate: quark and portability are not Papership jobs", 403)
    if slug == MCG_SLUG:
        raise StoreError("paused: client has no budget", 403)
    project = _project(store, p["tenant_id"], slug)
    if project["status"] != "active":
        raise StoreError(f"project {slug} is {project['status']}", 403)
    request = str(body.get("request") or body.get("title") or "").strip()
    if not request:
        raise StoreError("request is required", 400)
    title = str(body.get("title") or request)[:200]
    plan = store.create_plan(principal_id, "Papership / Engine Labs")
    work = store.create_work_item(principal_id, title, plan["id"])
    jid = _id("eljob")
    now = _now()
    store.conn.execute(
        """INSERT INTO engine_labs_jobs
           (id, tenant_id, project_id, work_item_id, title, request, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (jid, p["tenant_id"], project["id"], work["id"], title, request, "ready", now, now),
    )
    store.append_audit(principal_id, "engine_labs.job.create", "engine_labs_job", jid)
    store.flush()
    return get_job(store, principal_id, jid)


def list_jobs(store: Store, principal_id: str) -> list[dict[str, Any]]:
    p = store.principal(principal_id)
    rows = store.conn.execute(
        "SELECT * FROM engine_labs_jobs WHERE tenant_id=? ORDER BY created_at DESC",
        (p["tenant_id"],),
    ).fetchall()
    return [_serialize(store, principal_id, store.row_to_dict(row)) for row in rows]  # type: ignore[arg-type]


def get_job(store: Store, principal_id: str, job_id: str) -> dict[str, Any]:
    p = store.principal(principal_id)
    row = store.conn.execute(
        "SELECT * FROM engine_labs_jobs WHERE id=? AND tenant_id=?",
        (job_id, p["tenant_id"]),
    ).fetchone()
    if not row:
        raise StoreError("engine labs job not found", 404)
    return _serialize(store, principal_id, store.row_to_dict(row))  # type: ignore[arg-type]


def start_job(store: Store, principal_id: str, job_id: str) -> dict[str, Any]:
    job = get_job(store, principal_id, job_id)
    if job["status"] not in {"ready", "in_progress"}:
        raise StoreError("job cannot start from this status", 400)
    store.conn.execute(
        "UPDATE engine_labs_jobs SET status=?, updated_at=? WHERE id=?",
        ("in_progress", _now(), job_id),
    )
    store.append_audit(principal_id, "engine_labs.job.start", "engine_labs_job", job_id)
    store.flush()
    return get_job(store, principal_id, job_id)


def advance_job(store: Store, principal_id: str, job_id: str, stage: str, evidence: str | None) -> dict[str, Any]:
    job = get_job(store, principal_id, job_id)
    if job["status"] == "ready":
        start_job(store, principal_id, job_id)
    item = store.advance_stage(principal_id, job["work_item_id"], stage, evidence)
    next_status = "in_progress"
    if item["stage"] == "release_proposal":
        next_status = "waiting_approval"
    elif item["stage"] == "retained_knowledge":
        next_status = "closed"
    store.conn.execute(
        "UPDATE engine_labs_jobs SET status=?, updated_at=? WHERE id=?",
        (next_status, _now(), job_id),
    )
    store.flush()
    return get_job(store, principal_id, job_id)


def refuse_execute_release() -> None:
    raise StoreError("execute_release stays designated authority only", 403)


def _serialize(store: Store, principal_id: str, row: dict[str, Any]) -> dict[str, Any]:
    work = store.get_work_item(principal_id, row["work_item_id"])
    project = store.row_to_dict(
        store.conn.execute("SELECT * FROM managed_projects WHERE id=?", (row["project_id"],)).fetchone()
    )
    return {
        **row,
        "project": project,
        "work_item": work,
        "loop_stages": list(LOOP_STAGES),
        "execute_release": False,
        "hermes_write_accepted": False,
        "dry_run_release": True,
    }
