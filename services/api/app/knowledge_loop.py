"""The knowledge loop: ingest -> resolve -> deliver -> measure -> learn.

This is the core of Papership. An agent describes a task, Papership returns the few pieces of
the organisation's own knowledge most likely to matter (read from real content, ranked against the
task text and against what measurably helped before), and a later outcome (CI, PR, human, agent)
is recorded against exactly what was delivered. Ranking then learns from those outcomes.

Honest limits, all visible in the responses:
- Relevance is lexical (SQLite FTS5 BM25), not semantic. It is a baseline to beat, not the end state.
- Lift is a small-sample correlation, shown with its sample size, and only influences ranking after
  `MIN_LIFT_SAMPLES` resolved deliveries.
- The index is a local copy of the owner's own documents for retrieval. It is tenant-scoped,
  never returned to another tenant, and secret-shaped chunks and secret-named files are never indexed.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI
from pydantic import BaseModel, ConfigDict, Field

from app.auth import AuthContext, auth_dep
from app.hermes_runs import SECRET_VALUE_PATTERNS
from app.store import StoreError, _id

DEFAULT_TOKEN_BUDGET = 3000
MAX_TOKEN_BUDGET = 12000
MAX_CHUNKS = 12
MAX_PER_DOC = 3
MAX_FILE_BYTES = 200_000
CHUNK_CHARS = 1600
MIN_LIFT_SAMPLES = 3
OUTCOMES = {"success": 1.0, "partial": 0.5, "failure": 0.0}
OUTCOME_SOURCES = ("ci", "pr", "human", "agent")
INGEST_GLOBS = (
    "README.md",
    "AGENTS.md",
    "docs/**/*.md",
    ".cursor/STATE.md",
    ".cursor/USER.md",
    ".cursor/memory/MEMORY.md",
    ".cursor/memory/runbooks/*.md",
    ".cursor/memory/blockers/*.md",
    ".cursor/instructions/*.md",
)
SKIP_DIR_PARTS = {"node_modules", ".git", "dist", ".venv", "ui-blueprint"}
STOPWORDS = frozenset(
    "the and for with that this from have has had are was were will would should could can not but "
    "you your our its into onto over under then than when what which who how why add make fix use "
    "get set new all any more most some per via out off too very just also".split()
)


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def migrate(store: Any) -> None:
    store.conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS kb_chunks (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          key TEXT NOT NULL,
          path TEXT NOT NULL,
          heading TEXT NOT NULL,
          text TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          status TEXT NOT NULL,
          supersedes TEXT NOT NULL DEFAULT '',
          ingested_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS kb_chunks_tenant_status ON kb_chunks (tenant_id, status, path);
        CREATE VIRTUAL TABLE IF NOT EXISTS kb_chunks_fts USING fts5(chunk_id UNINDEXED, heading, path, text);
        CREATE TABLE IF NOT EXISTS kb_deliveries (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          principal_id TEXT NOT NULL,
          task TEXT NOT NULL,
          runtime TEXT NOT NULL DEFAULT '',
          model TEXT NOT NULL DEFAULT '',
          repo TEXT NOT NULL DEFAULT '',
          chunk_ids TEXT NOT NULL,
          gap TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kb_outcomes (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          delivery_id TEXT NOT NULL,
          outcome TEXT NOT NULL,
          source TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          UNIQUE (delivery_id, source)
        );
        """
    )
    store.flush()


# ---- ingest --------------------------------------------------------------------------------


def _is_secret_name(name: str) -> bool:
    low = name.lower()
    return (
        low.startswith(".env")
        or low.endswith((".pem", ".key", ".p12", ".pfx"))
        or low in {"credentials.json", "secrets.json", ".netrc", ".npmrc", ".pypirc"}
    )


def _has_secret(text: str) -> bool:
    return any(p.search(text) for p in SECRET_VALUE_PATTERNS)


def _split(text: str) -> list[tuple[str, str]]:
    """Markdown into (heading, body) sections, long ones cut at paragraph breaks."""
    sections: list[tuple[str, list[str]]] = [("(top)", [])]
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        match = None if in_fence else re.match(r"^(#{1,4})\s+(.+)$", line)  # no lazy `.+?` before `\s*$`: that was quadratic on a long run of spaces
        if match:
            sections.append((match.group(2).strip()[:120], []))
        else:
            sections[-1][1].append(line)
    out: list[tuple[str, str]] = []
    for heading, lines in sections:
        body = "\n".join(lines).strip()
        if len(body) < 40:
            continue
        paragraphs = re.split(r"\n\s*\n", body)
        buf = ""
        for para in paragraphs:
            if buf and len(buf) + len(para) > CHUNK_CHARS:
                out.append((heading, buf.strip()))
                buf = ""
            buf += para + "\n\n"
        if buf.strip():
            out.append((heading, buf.strip()))
    return out


def _files(root: Path) -> list[Path]:
    seen: dict[str, Path] = {}
    for pattern in INGEST_GLOBS:
        for path in root.glob(pattern):
            if not path.is_file() or path.is_symlink():
                continue
            rel = path.relative_to(root)
            if SKIP_DIR_PARTS.intersection(rel.parts) or _is_secret_name(path.name):
                continue
            if path.stat().st_size > MAX_FILE_BYTES:
                continue
            seen[str(rel)] = path
    return [seen[k] for k in sorted(seen)]


def ingest(store: Any, tenant_id: str, root: Path) -> dict[str, Any]:
    """Index the repo's own documents. Changed text becomes a new immutable version; the old one is superseded."""
    root = root.resolve()
    now = _now()
    added = unchanged = superseded = skipped_secret = 0
    live_keys: set[str] = set()
    paths_seen: set[str] = set()
    for path in _files(root):
        rel = str(path.relative_to(root))
        paths_seen.add(rel)
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        counts: dict[str, int] = {}
        for heading, body in _split(text):
            if _has_secret(body):
                skipped_secret += 1
                continue
            slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")[:60] or "top"
            counts[slug] = counts.get(slug, 0) + 1
            key = f"{rel}#{slug}-{counts[slug]}"
            live_keys.add(key)
            digest = hashlib.sha256(body.encode()).hexdigest()
            current = store.conn.execute(
                "SELECT id, content_hash FROM kb_chunks WHERE tenant_id=? AND key=? AND status='current'",
                (tenant_id, key),
            ).fetchone()
            if current and current["content_hash"] == digest:
                unchanged += 1
                continue
            cid = hashlib.sha256(f"{tenant_id}|{key}|{digest}".encode()).hexdigest()[:32]
            if current:
                store.conn.execute("UPDATE kb_chunks SET status='superseded' WHERE id=?", (current["id"],))
                store.conn.execute("DELETE FROM kb_chunks_fts WHERE chunk_id=?", (current["id"],))
                superseded += 1
            store.conn.execute(
                """INSERT OR IGNORE INTO kb_chunks
                   (id, tenant_id, key, path, heading, text, content_hash, status, supersedes, ingested_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'current', ?, ?)""",
                (cid, tenant_id, key, rel, heading, body, digest, current["id"] if current else "", now),
            )
            store.conn.execute(
                "INSERT INTO kb_chunks_fts (chunk_id, heading, path, text) VALUES (?, ?, ?, ?)",
                (cid, heading, rel, body),
            )
            added += 1
    # Anything that disappeared from the sources is no longer current knowledge.
    gone = [
        r
        for r in store.conn.execute(
            "SELECT id, key FROM kb_chunks WHERE tenant_id=? AND status='current'", (tenant_id,)
        ).fetchall()
        if r["key"] not in live_keys
    ]
    for row in gone:
        store.conn.execute("UPDATE kb_chunks SET status='superseded' WHERE id=?", (row["id"],))
        store.conn.execute("DELETE FROM kb_chunks_fts WHERE chunk_id=?", (row["id"],))
    store.flush()
    return {
        "documents": len(paths_seen),
        "chunks_added": added,
        "chunks_unchanged": unchanged,
        "chunks_superseded": superseded + len(gone),
        "chunks_skipped_secret_shaped": skipped_secret,
        "ingested_at": now,
    }


# ---- lift ----------------------------------------------------------------------------------


def _delivery_scores(store: Any, tenant_id: str) -> dict[str, float]:
    """One score per delivery that has an outcome: any failure wins, otherwise the mean of what was reported."""
    rows = store.conn.execute(
        "SELECT delivery_id, outcome FROM kb_outcomes WHERE tenant_id=?", (tenant_id,)
    ).fetchall()
    grouped: dict[str, list[float]] = {}
    for row in rows:
        grouped.setdefault(row["delivery_id"], []).append(OUTCOMES.get(row["outcome"], 0.0))
    return {did: (0.0 if 0.0 in vals else sum(vals) / len(vals)) for did, vals in grouped.items()}


def lift_table(store: Any, tenant_id: str) -> dict[str, Any]:
    scores = _delivery_scores(store, tenant_id)
    baseline = sum(scores.values()) / len(scores) if scores else None
    by_key: dict[str, list[float]] = {}
    keymap = {
        r["id"]: r["key"]
        for r in store.conn.execute("SELECT id, key FROM kb_chunks WHERE tenant_id=?", (tenant_id,)).fetchall()
    }
    for row in store.conn.execute(
        "SELECT id, chunk_ids FROM kb_deliveries WHERE tenant_id=?", (tenant_id,)
    ).fetchall():
        if row["id"] not in scores:
            continue
        for cid in json.loads(row["chunk_ids"]):
            key = keymap.get(cid)
            if key:
                by_key.setdefault(key, []).append(scores[row["id"]])
    items = []
    for key, vals in by_key.items():
        rate = sum(vals) / len(vals)
        items.append(
            {
                "key": key,
                "n": len(vals),
                "success_rate": round(rate, 3),
                "lift": round(rate - baseline, 3) if baseline is not None else None,
                "reliable": len(vals) >= MIN_LIFT_SAMPLES,
            }
        )
    items.sort(key=lambda i: (not i["reliable"], -(i["lift"] or 0), -i["n"]))
    return {
        "baseline_success_rate": None if baseline is None else round(baseline, 3),
        "resolved_deliveries": len(scores),
        "min_samples": MIN_LIFT_SAMPLES,
        "items": items,
    }


def _lift_by_key(store: Any, tenant_id: str) -> dict[str, dict[str, Any]]:
    return {i["key"]: i for i in lift_table(store, tenant_id)["items"]}


# ---- resolve -------------------------------------------------------------------------------


def _terms(task: str) -> list[str]:
    seen: list[str] = []
    for tok in re.findall(r"[a-z0-9_]{3,}", task.lower()):
        if tok in STOPWORDS or tok in seen:
            continue
        seen.append(tok)
    return seen[:24]


def _tokens(text: str) -> int:
    return max(1, len(text) // 4)


def resolve(
    store: Any,
    tenant_id: str,
    principal_id: str,
    task: str,
    *,
    runtime: str = "",
    model: str = "",
    repo: str = "",
    token_budget: int = DEFAULT_TOKEN_BUDGET,
) -> dict[str, Any]:
    task = (task or "").strip()
    if not task or len(task) > 4000:
        raise StoreError("task is required and must be under 4000 characters", 422)
    budget = max(200, min(int(token_budget), MAX_TOKEN_BUDGET))
    terms = _terms(task)
    candidates: list[dict[str, Any]] = []
    if terms:
        query = " OR ".join(f'"{t}"' for t in terms)
        rows = store.conn.execute(
            """SELECT f.chunk_id AS id, bm25(kb_chunks_fts, 0.0, 4.0, 1.0, 1.0) AS rank
               FROM kb_chunks_fts f WHERE kb_chunks_fts MATCH ? ORDER BY rank LIMIT 80""",
            (query,),
        ).fetchall()
        lifts = _lift_by_key(store, tenant_id)
        for row in rows:
            chunk = store.conn.execute(
                "SELECT * FROM kb_chunks WHERE id=? AND tenant_id=? AND status='current'", (row["id"], tenant_id)
            ).fetchone()
            if chunk is None:
                continue
            base = -float(row["rank"])  # bm25 is lower-is-better and negative
            info = lifts.get(chunk["key"])
            multiplier = 1.0
            if info and info["reliable"] and info["lift"] is not None:
                multiplier += max(-0.5, min(0.5, info["lift"]))
            text_low = (chunk["heading"] + " " + chunk["path"] + " " + chunk["text"]).lower()
            candidates.append(
                {
                    "chunk": chunk,
                    "score": base * multiplier,
                    "matched": [t for t in terms if t in text_low][:8],
                    "lift": info,
                }
            )
    candidates.sort(key=lambda c: -c["score"])
    chosen: list[dict[str, Any]] = []
    per_doc: dict[str, int] = {}
    used = 0
    for cand in candidates:
        chunk = cand["chunk"]
        cost = _tokens(chunk["text"])
        if per_doc.get(chunk["path"], 0) >= MAX_PER_DOC or used + cost > budget:
            continue
        chosen.append(cand)
        per_doc[chunk["path"]] = per_doc.get(chunk["path"], 0) + 1
        used += cost
        if len(chosen) >= MAX_CHUNKS:
            break
    gap = "" if chosen else ("no_indexed_knowledge" if not _indexed(store, tenant_id) else "no_matching_context")
    delivery_id = _id("dlv")
    store.conn.execute(
        """INSERT INTO kb_deliveries (id, tenant_id, principal_id, task, runtime, model, repo, chunk_ids, gap, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            delivery_id, tenant_id, principal_id, task[:500], runtime[:60], model[:60], repo[:120],
            json.dumps([c["chunk"]["id"] for c in chosen]), gap, _now(),
        ),
    )
    store.flush()
    return {
        "delivery_id": delivery_id,
        "gap": gap or None,
        "tokens": used,
        "token_budget": budget,
        "chunks": [
            {
                "id": c["chunk"]["id"],
                "path": c["chunk"]["path"],
                "heading": c["chunk"]["heading"],
                "text": c["chunk"]["text"],
                "score": round(c["score"], 3),
                "matched_terms": c["matched"],
                "lift": c["lift"],
            }
            for c in chosen
        ],
        "how": "lexical BM25 over indexed documents, boosted or damped by measured lift after "
        f"{MIN_LIFT_SAMPLES}+ resolved deliveries. Report the outcome with POST /knowledge/outcomes.",
    }


def _indexed(store: Any, tenant_id: str) -> int:
    return store.conn.execute(
        "SELECT COUNT(*) AS n FROM kb_chunks WHERE tenant_id=? AND status='current'", (tenant_id,)
    ).fetchone()["n"]


# ---- measure -------------------------------------------------------------------------------


def record_outcome(
    store: Any, tenant_id: str, delivery_id: str, outcome: str, source: str, detail: str = ""
) -> dict[str, Any]:
    if outcome not in OUTCOMES:
        raise StoreError("outcome must be success, partial or failure", 422)
    if source not in OUTCOME_SOURCES:
        raise StoreError("source must be ci, pr, human or agent", 422)
    row = store.conn.execute(
        "SELECT id FROM kb_deliveries WHERE id=? AND tenant_id=?", (delivery_id, tenant_id)
    ).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    if _has_secret(detail):
        raise StoreError("secret values never belong in an outcome", 403)
    store.conn.execute(
        """INSERT INTO kb_outcomes (id, tenant_id, delivery_id, outcome, source, detail, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (delivery_id, source) DO UPDATE SET outcome=excluded.outcome, detail=excluded.detail""",
        (_id("out"), tenant_id, delivery_id, outcome, source, detail[:300], _now()),
    )
    store.flush()
    return {"delivery_id": delivery_id, "outcome": outcome, "source": source, "recorded": True}


def summary(store: Any, tenant_id: str) -> dict[str, Any]:
    docs = store.conn.execute(
        "SELECT COUNT(DISTINCT path) AS n FROM kb_chunks WHERE tenant_id=? AND status='current'", (tenant_id,)
    ).fetchone()["n"]
    last = store.conn.execute(
        "SELECT MAX(ingested_at) AS t FROM kb_chunks WHERE tenant_id=?", (tenant_id,)
    ).fetchone()["t"]
    deliveries = store.conn.execute(
        "SELECT COUNT(*) AS n FROM kb_deliveries WHERE tenant_id=?", (tenant_id,)
    ).fetchone()["n"]
    recent = store.conn.execute(
        """SELECT d.id, d.task, d.runtime, d.model, d.gap, d.created_at, d.chunk_ids
           FROM kb_deliveries d WHERE d.tenant_id=? ORDER BY d.created_at DESC, d.rowid DESC LIMIT 12""",
        (tenant_id,),
    ).fetchall()
    scores = _delivery_scores(store, tenant_id)
    items = []
    for row in recent:
        items.append(
            {
                "id": row["id"],
                "task": row["task"],
                "runtime": row["runtime"],
                "model": row["model"],
                "gap": row["gap"] or None,
                "chunks": len(json.loads(row["chunk_ids"])),
                "outcome_score": scores.get(row["id"]),
                "created_at": row["created_at"],
            }
        )
    return {
        "indexed_chunks": _indexed(store, tenant_id),
        "indexed_documents": docs,
        "last_ingested_at": last,
        "deliveries": deliveries,
        "recent": items,
        "lift": lift_table(store, tenant_id),
    }


# ---- routes --------------------------------------------------------------------------------


class ResolveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task: str = Field(min_length=1, max_length=4000)
    runtime: str = Field(default="", max_length=60)
    model: str = Field(default="", max_length=60)
    repo: str = Field(default="", max_length=120)
    token_budget: int = Field(default=DEFAULT_TOKEN_BUDGET, ge=200, le=MAX_TOKEN_BUDGET)


class OutcomeBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    delivery_id: str = Field(min_length=1, max_length=80)
    outcome: str
    source: str
    detail: str = Field(default="", max_length=300)


def register_routes(app: FastAPI, store: Any, root: Path) -> None:
    migrate(store)

    def need(ctx: AuthContext, *classes: str) -> None:
        if not any(store.has_grant(ctx.principal_id, c) for c in classes):
            raise StoreError("missing grant", 403)

    @app.post("/knowledge/ingest")
    def ingest_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        need(ctx, "memory.write", "org.admin")
        result = ingest(store, ctx.tenant_id, root)
        store.append_audit(ctx.principal_id, "knowledge.ingest", "knowledge", "index")
        return result

    @app.post("/knowledge/resolve")
    def resolve_route(body: ResolveBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        need(ctx, "memory.read", "org.admin")
        return resolve(
            store, ctx.tenant_id, ctx.principal_id, body.task,
            runtime=body.runtime, model=body.model, repo=body.repo, token_budget=body.token_budget,
        )

    @app.post("/knowledge/outcomes")
    def outcome_route(body: OutcomeBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        need(ctx, "memory.read", "org.admin")
        return record_outcome(store, ctx.tenant_id, body.delivery_id, body.outcome, body.source, body.detail)

    @app.get("/knowledge/loop")
    def loop_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        need(ctx, "memory.read", "org.admin")
        return summary(store, ctx.tenant_id)
