"""D-37: Papership-owned Hermes run requests and tool approvals.

The API stores what was asked for (a catalogued ``tool`` plus its arguments) and the human
approval for it. The worker, which alone holds ``HERMES_API_SERVER_KEY``, reads this table,
refuses unknown tools, and only calls Hermes once the Papership approval is ``approved``.
No secret value is stored or returned here.
"""

from __future__ import annotations

import json
import re
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.store import Store

APPROVAL_CLASS = "approval.hermes.tool"
MAX_ARGUMENT_BYTES = 8_000
MAX_PURPOSE_CHARS = 4_000
MAX_PENDING_PER_TENANT = 25
SECRET_KEY_HINTS = (
    "secret", "token", "password", "passwd", "api_key", "apikey", "api-key", "authorization",
    "private_key", "credential", "cookie", "bearer", "access_key",
)
SECRET_VALUE_PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\b(sk|rk|pk)-[A-Za-z0-9_-]{16,}"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_-]{30,}"),
    # Lookbehind, not \b: the class contains "-", so \b restarted the scan inside every hyphen run (quadratic on "ey-ey-...").
    re.compile(r"(?<![A-Za-z0-9_-])ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{16,}"),
    re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{30,}"),
)


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def migrate(store: Store) -> None:
    store.conn.execute(
        """
        CREATE TABLE IF NOT EXISTS hermes_run_requests (
          job_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          tool TEXT NOT NULL,
          arguments TEXT NOT NULL,
          session_id TEXT NOT NULL DEFAULT '',
          hermes_run_id TEXT NOT NULL DEFAULT '',
          state TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
        """
    )
    cols = {r["name"] for r in store.conn.execute("PRAGMA table_info(hermes_run_requests)").fetchall()}
    if "requester_id" not in cols:
        store.conn.execute("ALTER TABLE hermes_run_requests ADD COLUMN requester_id TEXT NOT NULL DEFAULT ''")
    store.conn.execute(
        """
        CREATE TABLE IF NOT EXISTS hermes_sessions (
          session_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          principal_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
        """
    )


def _contains_secret(value: Any) -> bool:
    """Reject secret-looking keys and secret-shaped values anywhere in a nested structure."""
    if isinstance(value, dict):
        for key, inner in value.items():
            if any(hint in str(key).lower() for hint in SECRET_KEY_HINTS) or _contains_secret(inner):
                return True
    elif isinstance(value, (list, tuple)):
        return any(_contains_secret(item) for item in value)
    elif isinstance(value, str):
        return any(p.search(value) for p in SECRET_VALUE_PATTERNS)
    return False


def register_session(store: Store, tenant_id: str, principal_id: str, session_id: str) -> None:
    store.conn.execute(
        "INSERT OR IGNORE INTO hermes_sessions (session_id, tenant_id, principal_id, created_at) VALUES (?, ?, ?, ?)",
        (session_id, tenant_id, principal_id, _now()),
    )
    store.flush()


def session_owned(store: Store, tenant_id: str, session_id: str) -> bool:
    row = store.conn.execute(
        "SELECT 1 FROM hermes_sessions WHERE session_id=? AND tenant_id=?", (session_id, tenant_id)
    ).fetchone()
    return row is not None


def record_request(
    store: Store,
    job_id: str,
    tenant_id: str,
    tool: str,
    arguments: dict[str, Any] | None,
    session_id: str = "",
    requester_id: str = "",
    purpose: str = "",
) -> dict[str, Any]:
    from app.store import StoreError

    if len(purpose or "") > MAX_PURPOSE_CHARS:
        raise StoreError("purpose is too long", 413)
    if _contains_secret(purpose):
        raise StoreError("secret values never travel in a run prompt", 403)
    session_id = (session_id or "").strip()
    if session_id and not session_owned(store, tenant_id, session_id):
        raise StoreError("unknown session", 404)
    pending = store.conn.execute(
        "SELECT COUNT(*) AS n FROM hermes_run_requests WHERE tenant_id=? AND state IN ('queued','awaiting_approval','blocked_runtime')",
        (tenant_id,),
    ).fetchone()["n"]
    if pending >= MAX_PENDING_PER_TENANT:
        raise StoreError("too many Hermes runs are waiting; resolve or cancel some first", 429)

    tool = (tool or "").strip()
    if not tool or len(tool) > 80 or not all(c.isalnum() or c in "_-." for c in tool):
        raise StoreError("tool name is invalid", 422)
    args = arguments or {}
    if not isinstance(args, dict):
        raise StoreError("arguments must be an object", 422)
    if _contains_secret(args):
        raise StoreError("secret values never travel in tool arguments", 403)
    encoded = json.dumps(args, sort_keys=True, default=str)
    if len(encoded.encode()) > MAX_ARGUMENT_BYTES:
        raise StoreError("arguments too large", 413)
    now = _now()
    store.conn.execute(
        """INSERT OR REPLACE INTO hermes_run_requests
           (job_id, tenant_id, tool, arguments, session_id, requester_id, state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)""",
        (job_id, tenant_id, tool, encoded, session_id[:80], requester_id, now, now),
    )
    store.flush()
    return {"job_id": job_id, "tool": tool, "state": "queued"}


def get_request(store: Store, job_id: str) -> dict[str, Any] | None:
    row = store.conn.execute("SELECT * FROM hermes_run_requests WHERE job_id=?", (job_id,)).fetchone()
    if not row:
        return None
    data = store.row_to_dict(row)
    data["arguments"] = json.loads(data["arguments"] or "{}")
    return data


def set_state(store: Store, job_id: str, state: str, detail: str = "", hermes_run_id: str = "") -> None:
    now = _now()
    store.conn.execute(
        """UPDATE hermes_run_requests
           SET state=?, detail=?, hermes_run_id=CASE WHEN ?<>'' THEN ? ELSE hermes_run_id END, updated_at=?
           WHERE job_id=?""",
        (state, detail[:300], hermes_run_id, hermes_run_id, now, job_id),
    )
    if state in {"awaiting_approval", "blocked_runtime"}:
        store.conn.execute("UPDATE jobs SET updated_at=? WHERE id=?", (now, job_id))
    store.flush()


def tool_approval(store: Store, job_id: str, tool: str, digest: str) -> dict[str, Any]:
    """Return the approval for this exact (job, tool, action hash). Create a pending one if absent.

    ``target_version`` is the AUTH-10 binding hash, so a changed argument is a different approval.
    """
    row = store.conn.execute("SELECT tenant_id FROM jobs WHERE id=?", (job_id,)).fetchone()
    if not row:
        return {"status": "missing"}
    tenant_id = row["tenant_id"]
    req = store.conn.execute("SELECT requester_id FROM hermes_run_requests WHERE job_id=?", (job_id,)).fetchone()
    requester = (req["requester_id"] if req else "") or "worker"
    target_id = f"hermes:{job_id}:{tool}"
    found = store.conn.execute(
        """SELECT id, status FROM approvals
           WHERE tenant_id=? AND approval_class=? AND target_id=? AND target_version=?
           ORDER BY rowid DESC LIMIT 1""",
        (tenant_id, APPROVAL_CLASS, target_id, digest),
    ).fetchone()
    if found:
        return {"id": found["id"], "status": found["status"], "auth10": digest, "target_id": target_id}
    from app.store import _id

    aid = _id("appr")
    store.conn.execute(
        """INSERT INTO approvals (id, tenant_id, approval_class, requester_id, target_id, target_version, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
        (aid, tenant_id, APPROVAL_CLASS, requester, target_id, digest),
    )
    store.flush()
    return {"id": aid, "status": "pending", "auth10": digest, "target_id": target_id}


def list_requests(store: Store, tenant_id: str, limit: int = 50) -> list[dict[str, Any]]:
    rows = store.conn.execute(
        "SELECT * FROM hermes_run_requests WHERE tenant_id=? ORDER BY created_at DESC LIMIT ?",
        (tenant_id, limit),
    ).fetchall()
    out = []
    for row in rows:
        data = store.row_to_dict(row)
        data["arguments"] = json.loads(data["arguments"] or "{}")
        approval = store.conn.execute(
            """SELECT id, status, target_id, target_version FROM approvals
               WHERE tenant_id=? AND approval_class=? AND target_id=? ORDER BY rowid DESC LIMIT 1""",
            (tenant_id, APPROVAL_CLASS, f"hermes:{data['job_id']}:{data['tool']}"),
        ).fetchone()
        data["approval"] = store.row_to_dict(approval) if approval else None
        out.append(data)
    return out
