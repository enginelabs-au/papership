"""Agent Registry: publish, version, discover, resolve, install and measure Agent Materials.

A package is a folder of text files plus `agent-package.json` (see docs/agent-registry/PACKAGE_SPEC.md).
Papership stores and serves packages. It never executes anything inside one (KL-D5: third-party
context is untrusted). Versions are immutable and content-addressed (KL-D1). Charges stay off:
licence class and pricing are metadata only (D-39).

Honest limits, visible in responses:
- Relevance is lexical (SQLite FTS5 BM25) plus measured lift, not semantic.
- Lift is an association with the baseline success rate of all resolved deliveries in the caller's
  organisation. It is not a causal before/after (that needs Eval Packs).
- Dependency resolution picks the highest version satisfying every constraint, with no backtracking.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from contextlib import contextmanager
from typing import Any, Iterator

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.auth import AuthContext, auth_dep
from app.hermes_runs import SECRET_VALUE_PATTERNS
from app.knowledge_loop import (
    MAX_TOKEN_BUDGET,
    MIN_LIFT_SAMPLES,
    OUTCOME_SOURCES,
    OUTCOMES,
    _has_secret,
    _is_secret_name,
    _now,
    _split,
    _terms,
    _tokens,
)
from app.store import StoreError, _id

SCHEMA = "papership.agent-package/1"
KINDS = (
    "skill", "context-pack", "workflow", "reference-pack", "eval-pack", "template-pack",
    "memory-pack", "persona", "policy-pack", "tool-pack", "dataset", "bundle",
)
LICENSE_CLASSES = ("open", "premium", "metered")
VISIBILITIES = ("private", "public")
MANIFEST_KEYS = {
    "schema", "name", "version", "kind", "description", "category", "tags", "jurisdiction",
    "compatible", "requires", "license", "visibility",
}
# ASCII only and fullmatch: `$` accepts a trailing newline and \d accepts non-ASCII digits.
NAME_PART = re.compile(r"[a-z0-9][a-z0-9-]{0,38}", re.ASCII)
VERSION_RE = re.compile(r"(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})", re.ASCII)
PARTIAL_RE = re.compile(r"[0-9]{1,9}(\.[0-9]{1,9}){0,2}", re.ASCII)
PATH_SEGMENT = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*", re.ASCII)
CODE_RE = re.compile(r"[A-Z]{2}(-[A-Z0-9]{1,3})?", re.ASCII)
RESERVED_SLUGS = frozenset(
    "papership official verified registry admin system root anthropic openai google microsoft cursor vercel "
    "supabase github aws gcp azure".split()
)
# Agent tools auto-load these names as instructions, which would defeat KL-D5 (third-party context is untrusted).
RESERVED_FILENAMES = frozenset(
    {"agents.md", "agents.override.md", "claude.md", "claude.local.md", "gemini.md", "qwen.md", "codex.md",
     "conventions.md", "copilot-instructions.md"}
)
DATA_EXTENSIONS = frozenset(".md .markdown .txt .json .yaml .yml .csv .tsv .toml .xml".split())
CREDENTIAL_NAME_SUFFIXES = (".env", ".tfvars", ".tfstate", ".jks", ".pem", ".key", ".p12", ".pfx", ".kdbx")
CREDENTIAL_NAMES = frozenset({"kubeconfig", "id_rsa", "id_ed25519", "id_ecdsa", ".npmrc", ".pypirc", ".netrc"})
EXTRA_SECRET_PATTERNS = tuple(
    re.compile(p)
    for p in (
        r"(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}",
        r"whsec_[A-Za-z0-9]{16,}",
        r"glpat-[A-Za-z0-9_-]{16,}",
        r"npm_[A-Za-z0-9]{30,}",
        r"SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}",
        r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
        # Every quantifier is bounded: an unbounded scheme run made this quadratic on a long word (a scan DoS).
        r"[a-z][a-z0-9+.-]{1,20}://[^\s/:@]{1,64}:[^\s/@]{3,128}@",
        r"(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b['\"]?\s*[:=]\s*['\"]?[A-Za-z0-9/+_.-]{12,}",
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    )
)
MAX_SECTIONS = 2000
MAX_BODY_BYTES = 2_500_000
MAX_PACKAGES_PER_TENANT = 200
MAX_VERSIONS_PER_TENANT = 2000
MAX_LOCK_PACKAGES = 50
MAX_TENANT_BYTES = 200 * 1024 * 1024


def credential_like(text: str) -> bool:
    """Credential scan after NFKC normalisation and zero-width removal, with registry-specific extra patterns."""
    clean = "".join(ch for ch in unicodedata.normalize("NFKC", text) if unicodedata.category(ch) != "Cf")
    return _has_secret(clean) or any(p.search(clean) for p in EXTRA_SECRET_PATTERNS)


def is_code_file(path: str) -> bool:
    """Anything that is not plain data or prose is treated as code: stored, flagged, never indexed or delivered."""
    if path.startswith(("scripts/", "bin/")):
        return True
    dot = path.rsplit("/", 1)[-1].rfind(".")
    ext = path.rsplit("/", 1)[-1][dot:].lower() if dot > 0 else ""
    return ext not in DATA_EXTENSIONS


@contextmanager
def transaction(store: Any) -> Iterator[None]:
    """Commit on success, roll back on any failure so a half-written publish is never committed later."""
    with store._lock:  # one connection is shared, so hold its RLock for the whole transaction; otherwise another request's commit or rollback lands in the middle
        try:
            yield
            store.flush()
        except BaseException:
            store.conn.rollback()
            raise
MAX_FILES = 200
MAX_TOTAL_BYTES = 1_048_576
MAX_FILE_BYTES = 200_000
MAX_INDEX_CHUNK = 4000
DEFAULT_BUDGET = 6000
MAX_PACKAGES = 8
MAX_PER_PACKAGE = 4
MANIFEST_FILE = "agent-package.json"
# Every column except the package files, so list and search paths never load up to 1 MiB per version.
VCOLS = (
    "v.id, v.name, v.version, v.ver_major, v.ver_minor, v.ver_patch, v.manifest_json, v.content_hash, "
    "v.tokens, v.has_scripts, v.status, v.visibility, v.published_by, v.created_at"
)


# ---- semver --------------------------------------------------------------------------------


def parse_version(text: str) -> tuple[int, int, int]:
    match = VERSION_RE.fullmatch(text or "")
    if not match:
        raise StoreError("version must be MAJOR.MINOR.PATCH", 422)
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def _partial(text: str) -> tuple[int, int, int]:
    if not PARTIAL_RE.fullmatch(text or ""):
        raise StoreError("invalid version constraint", 422)
    parts = text.split(".")
    nums = [int(p) for p in parts] + [0] * (3 - len(parts))
    return nums[0], nums[1], nums[2]


def parse_constraint(constraint: str) -> Any:
    """Return a predicate over version tuples. Raises 422 for anything it does not understand."""
    c = (constraint or "*").strip()
    if len(c) > 40:
        raise StoreError("version constraint too long", 422)
    if c in ("*", ""):
        return lambda v: True
    for op in (">=", "<=", "==", ">", "<", "^", "~"):
        if c.startswith(op):
            base = _partial(c[len(op):].strip())
            if op == ">=":
                return lambda v, b=base: v >= b
            if op == "<=":
                return lambda v, b=base: v <= b
            if op == ">":
                return lambda v, b=base: v > b
            if op == "<":
                return lambda v, b=base: v < b
            if op == "==":
                return lambda v, b=base: v == b
            if op == "^":
                upper = (base[0] + 1, 0, 0) if base[0] else (0, base[1] + 1, 0) if base[1] else (0, 0, base[2] + 1)
                return lambda v, b=base, u=upper: b <= v < u
            upper = (base[0], base[1] + 1, 0)
            return lambda v, b=base, u=upper: b <= v < u
    base = _partial(c)
    return lambda v, b=base: v == b


# ---- validation ----------------------------------------------------------------------------


def split_name(name: str) -> tuple[str, str]:
    parts = (name or "").split("/")
    if len(parts) != 2 or not all(NAME_PART.fullmatch(p) for p in parts):
        raise StoreError("name must be publisher/package, each part lowercase letters, digits and hyphens", 422)
    return parts[0], parts[1]


def _reject_control_characters(value: Any, depth: int = 0) -> None:
    """Manifest strings reach terminals and model prompts, so no control (Cc) or format (Cf) characters, including ESC."""
    if depth > 6:
        raise StoreError("manifest is nested too deeply", 422)
    if isinstance(value, str):
        if any(unicodedata.category(ch) in ("Cc", "Cf") for ch in value):
            raise StoreError("manifest text must not contain control or invisible formatting characters", 422)
    elif isinstance(value, dict):
        for k, v in value.items():
            _reject_control_characters(k, depth + 1)
            _reject_control_characters(v, depth + 1)
    elif isinstance(value, list):
        for v in value:
            _reject_control_characters(v, depth + 1)


def validate_manifest(raw: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise StoreError("manifest must be an object", 422)
    _reject_control_characters(raw)
    unknown = set(raw) - MANIFEST_KEYS
    if unknown:
        raise StoreError(f"unknown manifest fields: {', '.join(sorted(unknown))}", 422)
    if raw.get("schema") != SCHEMA:
        raise StoreError(f"manifest schema must be {SCHEMA}", 422)
    name = raw.get("name")
    split_name(name if isinstance(name, str) else "")
    version = raw.get("version")
    parse_version(version if isinstance(version, str) else "")
    kind = raw.get("kind")
    if kind not in KINDS:
        raise StoreError(f"kind must be one of: {', '.join(KINDS)}", 422)
    description = raw.get("description")
    if not isinstance(description, str) or not 10 <= len(description.strip()) <= 400 or len(description.splitlines()) != 1:
        raise StoreError("description must be one line of 10 to 400 characters", 422)
    category = raw.get("category", "")
    if not isinstance(category, str) or len(category) > 60 or len(category.splitlines()) > 1:
        raise StoreError("category must be a one-line string up to 60 characters", 422)

    def str_list(key: str, limit: int, item_max: int) -> list[str]:
        value = raw.get(key, [])
        if not isinstance(value, list) or len(value) > limit or not all(
            isinstance(v, str) and 0 < len(v) <= item_max and len(v.splitlines()) == 1 for v in value
        ):
            raise StoreError(f"{key} must be a list of at most {limit} short strings", 422)
        return list(dict.fromkeys(value))

    tags = list(dict.fromkeys(t.lower() for t in str_list("tags", 20, 40)))
    compatible = str_list("compatible", 20, 40)
    jurisdiction = [j.upper() for j in str_list("jurisdiction", 20, 8)]
    if not all(CODE_RE.fullmatch(j) for j in jurisdiction):
        raise StoreError("jurisdiction codes look like AU or AU-NSW", 422)
    requires = raw.get("requires", {})
    if not isinstance(requires, dict) or len(requires) > 30:
        raise StoreError("requires must be an object of at most 30 entries", 422)
    for dep, constraint in requires.items():
        split_name(dep)
        if dep == name:
            raise StoreError("a package cannot require itself", 422)
        if not isinstance(constraint, str):
            raise StoreError("a dependency constraint must be a string", 422)
        parse_constraint(constraint)
    licence = raw.get("license", {"class": "open"})
    if not isinstance(licence, dict) or licence.get("class") not in LICENSE_CLASSES:
        raise StoreError(f"license.class must be one of: {', '.join(LICENSE_CLASSES)}", 422)
    if set(licence) - {"class", "spdx", "pricing"}:
        raise StoreError("license may only contain class, spdx and pricing", 422)
    spdx = licence.get("spdx", "")
    if not isinstance(spdx, str) or len(spdx) > 40 or len(spdx.splitlines()) > 1:
        raise StoreError("license.spdx must be a short string", 422)
    pricing = licence.get("pricing")
    if pricing is not None:
        if licence["class"] == "open":
            raise StoreError("open materials cannot carry pricing", 422)
        if (
            not isinstance(pricing, dict)
            or set(pricing) - {"currency", "amount", "unit"}
            or not isinstance(pricing.get("amount"), (int, float))
            or isinstance(pricing.get("amount"), bool)
            or not 0 <= pricing["amount"] <= 100_000
            or pricing.get("unit") not in ("install", "invocation", "month")
            or pricing.get("currency", "AUD") not in ("AUD", "USD")
        ):
            raise StoreError("pricing must be {currency AUD|USD, amount >= 0, unit install|invocation|month}", 422)
    elif licence["class"] != "open":
        raise StoreError("premium and metered materials must declare pricing", 422)
    visibility = raw.get("visibility", "private")
    if visibility not in VISIBILITIES:
        raise StoreError("visibility must be private or public", 422)
    clean = {
        "schema": SCHEMA, "name": name, "version": version, "kind": kind, "description": description.strip(),
        "category": category, "tags": tags, "jurisdiction": jurisdiction, "compatible": compatible,
        "requires": dict(sorted(requires.items())),
        "license": {"class": licence["class"], "spdx": spdx, **({"pricing": pricing} if pricing else {})},
        "visibility": visibility,
    }
    if credential_like(json.dumps(clean, ensure_ascii=False)):
        raise StoreError("credential-shaped content is not allowed in a manifest", 422)
    return clean


def validate_files(files: dict[str, str]) -> dict[str, str]:
    if not isinstance(files, dict) or not files:
        raise StoreError("a package needs at least one file", 422)
    if len(files) > MAX_FILES:
        raise StoreError(f"a package may have at most {MAX_FILES} files", 422)
    total = 0
    for path, content in files.items():
        if not isinstance(path, str) or not isinstance(content, str):
            raise StoreError("files must map path to text", 422)
        segments = path.split("/")
        if len(path) > 180 or not all(PATH_SEGMENT.fullmatch(s) and s not in (".", "..") for s in segments):
            raise StoreError(f"unsafe or invalid file path: {path[:80]!r}", 422)
        if path == MANIFEST_FILE:
            raise StoreError("agent-package.json is the manifest, not a package file", 422)
        base = segments[-1].lower()
        if _is_secret_name(segments[-1]) or base in CREDENTIAL_NAMES or base.endswith(CREDENTIAL_NAME_SUFFIXES):
            raise StoreError(f"credential-named file is not allowed: {path}", 422)
        if base in RESERVED_FILENAMES:
            raise StoreError(
                f"{segments[-1]} is auto-loaded as instructions by agent tools and cannot ship in a package; use SKILL.md",
                422,
            )
        if credential_like(path):
            raise StoreError("credential-shaped content rejected in a file path", 422)
        if "\x00" in content:
            raise StoreError(f"binary content is not allowed: {path}", 422)
        size = len(content.encode("utf-8"))
        if size > MAX_FILE_BYTES:
            raise StoreError(f"file too large (max {MAX_FILE_BYTES} bytes): {path}", 422)
        total += size
        if credential_like(content):
            raise StoreError(f"credential-shaped content rejected in {path}", 422)
    if total > MAX_TOTAL_BYTES:
        raise StoreError(f"package too large (max {MAX_TOTAL_BYTES} bytes)", 422)
    if not any(p.endswith(".md") for p in files):
        raise StoreError("a package needs at least one markdown file (SKILL.md recommended)", 422)
    return dict(sorted(files.items()))


def content_hash(files: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(path.encode())
        digest.update(b"\x00")
        digest.update(files[path].encode())
        digest.update(b"\x00")
    return digest.hexdigest()


# ---- schema --------------------------------------------------------------------------------


def migrate(store: Any) -> None:
    store.conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ar_publishers (
          slug TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ar_packages (
          name TEXT PRIMARY KEY,
          publisher_slug TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          visibility TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ar_versions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          ver_major INTEGER NOT NULL,
          ver_minor INTEGER NOT NULL,
          ver_patch INTEGER NOT NULL,
          manifest_json TEXT NOT NULL,
          files_json TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          tokens INTEGER NOT NULL,
          has_scripts INTEGER NOT NULL,
          status TEXT NOT NULL,
          visibility TEXT NOT NULL DEFAULT 'private',
          published_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE (name, version)
        );
        CREATE TABLE IF NOT EXISTS ar_chunks (
          id TEXT PRIMARY KEY,
          version_id TEXT NOT NULL,
          path TEXT NOT NULL,
          heading TEXT NOT NULL,
          text TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ar_chunks_version ON ar_chunks (version_id);
        CREATE VIRTUAL TABLE IF NOT EXISTS ar_chunks_fts USING fts5(chunk_id UNINDEXED, name, kind, heading, path, text);
        CREATE TABLE IF NOT EXISTS ar_installs (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          constraint_text TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          installed_by TEXT NOT NULL,
          installed_at TEXT NOT NULL,
          UNIQUE (tenant_id, agent_id, name)
        );
        CREATE TABLE IF NOT EXISTS ar_deliveries (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          principal_id TEXT NOT NULL,
          task TEXT NOT NULL,
          runtime TEXT NOT NULL DEFAULT '',
          model TEXT NOT NULL DEFAULT '',
          version_ids TEXT NOT NULL,
          chunk_ids TEXT NOT NULL,
          gap TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ar_outcomes (
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
    columns = {r["name"] for r in store.conn.execute("PRAGMA table_info(ar_versions)").fetchall()}
    if "visibility" not in columns:  # databases created before per-version visibility
        store.conn.execute("ALTER TABLE ar_versions ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'")
        store.conn.execute(
            "UPDATE ar_versions SET visibility = COALESCE((SELECT visibility FROM ar_packages p WHERE p.name = ar_versions.name), 'private')"
        )
    store.flush()


# ---- publish -------------------------------------------------------------------------------


def _version_row_summary(row: Any, *, created: bool | None = None) -> dict[str, Any]:
    manifest = json.loads(row["manifest_json"])
    out = {
        "name": row["name"],
        "version": row["version"],
        "kind": manifest["kind"],
        "status": row["status"],
        "content_hash": row["content_hash"],
        "tokens": row["tokens"],
        "has_scripts": bool(row["has_scripts"]),
        "visibility": manifest["visibility"],
        "license": manifest["license"],
        "trust": "unreviewed",
        "published_at": row["created_at"],
    }
    if created is not None:
        out["created"] = created
    return out


def publish(
    store: Any, tenant_id: str, principal_id: str, raw_manifest: dict[str, Any], raw_files: dict[str, str]
) -> dict[str, Any]:
    manifest = validate_manifest(raw_manifest)
    files = validate_files(raw_files)
    name, version = manifest["name"], manifest["version"]
    slug, _ = split_name(name)
    digest = content_hash(files)

    owner = store.conn.execute("SELECT tenant_id FROM ar_publishers WHERE slug=?", (slug,)).fetchone()
    if owner is not None and owner["tenant_id"] != tenant_id:
        raise StoreError("that publisher namespace belongs to another organisation", 403)
    if owner is None and slug in RESERVED_SLUGS:
        raise StoreError("that publisher namespace is reserved", 403)
    with transaction(store):
        return _publish(store, tenant_id, principal_id, manifest, files, digest, slug, owner)


def _publish(
    store: Any, tenant_id: str, principal_id: str, manifest: dict[str, Any], files: dict[str, str],
    digest: str, slug: str, owner: Any,
) -> dict[str, Any]:
    name, version = manifest["name"], manifest["version"]

    # Re-read the namespace owner under the transaction lock so two organisations racing for a new slug cannot both pass.
    owner = store.conn.execute("SELECT tenant_id FROM ar_publishers WHERE slug=?", (slug,)).fetchone()
    if owner is not None and owner["tenant_id"] != tenant_id:
        raise StoreError("that publisher namespace belongs to another organisation", 403)
    package = store.conn.execute("SELECT * FROM ar_packages WHERE name=?", (name,)).fetchone()
    if package is not None:
        if package["visibility"] == "public" and manifest["visibility"] == "private":
            raise StoreError("a public package cannot be made private; yank the version instead", 409)
    existing = store.conn.execute("SELECT * FROM ar_versions WHERE name=? AND version=?", (name, version)).fetchone()
    if existing is not None:
        if existing["content_hash"] == digest:
            return _version_row_summary(existing, created=False)
        raise StoreError(f"{name}@{version} is already published with different content; versions are immutable", 409)

    counts = store.conn.execute(
        """SELECT (SELECT COUNT(*) FROM ar_packages WHERE tenant_id=?) AS packages,
                  (SELECT COUNT(*) FROM ar_versions v JOIN ar_packages p ON p.name=v.name WHERE p.tenant_id=?) AS versions,
                  (SELECT COALESCE(SUM(LENGTH(v.files_json)), 0) FROM ar_versions v JOIN ar_packages p ON p.name=v.name
                   WHERE p.tenant_id=?) AS stored""",
        (tenant_id, tenant_id, tenant_id),
    ).fetchone()
    if (
        (package is None and counts["packages"] >= MAX_PACKAGES_PER_TENANT)
        or counts["versions"] >= MAX_VERSIONS_PER_TENANT
        or counts["stored"] >= MAX_TENANT_BYTES
    ):
        raise StoreError("organisation quota reached for packages, versions or stored bytes", 429)

    now = _now()
    if owner is None:
        store.conn.execute("INSERT INTO ar_publishers (slug, tenant_id, created_at) VALUES (?, ?, ?)", (slug, tenant_id, now))
    if package is None:
        store.conn.execute(
            "INSERT INTO ar_packages (name, publisher_slug, tenant_id, visibility, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, slug, tenant_id, manifest["visibility"], now),
        )
    elif package["visibility"] != manifest["visibility"]:
        store.conn.execute("UPDATE ar_packages SET visibility=? WHERE name=?", (manifest["visibility"], name))

    has_scripts = any(is_code_file(p) for p in files)
    indexed: list[tuple[str, str, str]] = [
        (
            "agent-package.json",
            "About",
            f"{manifest['description']}\nCategory: {manifest['category']}\nTags: {', '.join(manifest['tags'])}\n"
            f"Jurisdiction: {', '.join(manifest['jurisdiction'])}",
        )
    ]
    for path, content in files.items():
        if is_code_file(path):
            continue  # code is stored and served on export, never indexed or delivered as context
        for heading, body in _split(content):
            indexed.append((path, heading, body[:MAX_INDEX_CHUNK]))
    if len(indexed) > MAX_SECTIONS:
        raise StoreError(f"too many sections to index ({len(indexed)}); the limit is {MAX_SECTIONS}", 422)
    tokens = sum(_tokens(t) for _, _, t in indexed)

    major, minor, patch = parse_version(version)
    version_id = _id("arv")
    store.conn.execute(
        """INSERT INTO ar_versions (id, name, version, ver_major, ver_minor, ver_patch, manifest_json, files_json,
           content_hash, tokens, has_scripts, status, visibility, published_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)""",
        (version_id, name, version, major, minor, patch, json.dumps(manifest), json.dumps(files), digest, tokens,
         int(has_scripts), manifest["visibility"], principal_id, now),
    )
    store.conn.executemany(
        "INSERT INTO ar_chunks (id, version_id, path, heading, text) VALUES (?, ?, ?, ?, ?)",
        [(_id("arc"), version_id, path, heading, body) for path, heading, body in indexed],
    )
    _reindex(store, name)
    row = store.conn.execute(f"SELECT {VCOLS} FROM ar_versions v WHERE v.id=?", (version_id,)).fetchone()
    return _version_row_summary(row, created=True)


def _reindex(store: Any, name: str) -> None:
    """Keep only the latest published version of a package in the search index, so stale or yanked
    versions can never crowd out or appear in results. Rows share the chunk table's rowid."""
    order = "ORDER BY ver_major DESC, ver_minor DESC, ver_patch DESC LIMIT 1"
    # Latest published version overall (what the owner sees) and latest public one (what everyone else sees).
    keep = [
        r for r in (
            store.conn.execute(f"SELECT id, manifest_json FROM ar_versions WHERE name=? AND status='published' {order}", (name,)).fetchone(),
            store.conn.execute(
                f"SELECT id, manifest_json FROM ar_versions WHERE name=? AND status='published' AND visibility='public' {order}", (name,)
            ).fetchone(),
        ) if r is not None
    ]
    keep_ids = list(dict.fromkeys(r["id"] for r in keep))
    marks = ",".join("?" for _ in keep_ids) or "''"
    store.conn.execute(
        f"""DELETE FROM ar_chunks_fts WHERE rowid IN
            (SELECT c.rowid FROM ar_chunks c JOIN ar_versions v ON v.id = c.version_id
             WHERE v.name=? AND v.id NOT IN ({marks}))""",
        (name, *keep_ids),
    )
    for row in {r["id"]: r for r in keep}.values():
        kind = json.loads(row["manifest_json"])["kind"]
        store.conn.execute(
            """INSERT INTO ar_chunks_fts (rowid, chunk_id, name, kind, heading, path, text)
               SELECT c.rowid, c.id, ?, ?, c.heading, c.path, c.text FROM ar_chunks c
               WHERE c.version_id=? AND c.rowid NOT IN (SELECT rowid FROM ar_chunks_fts)""",
            (name, kind, row["id"]),
        )


def yank(store: Any, tenant_id: str, name: str, version: str) -> dict[str, Any]:
    package = store.conn.execute("SELECT * FROM ar_packages WHERE name=?", (name,)).fetchone()
    if package is None or package["tenant_id"] != tenant_id:
        raise StoreError("not found", 404)
    row = store.conn.execute("SELECT * FROM ar_versions WHERE name=? AND version=?", (name, version)).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    with transaction(store):
        store.conn.execute("UPDATE ar_versions SET status='yanked' WHERE id=?", (row["id"],))
        _reindex(store, name)  # falls back to the next-highest published version, if any
    return _version_row_summary(
        store.conn.execute(f"SELECT {VCOLS} FROM ar_versions v WHERE v.id=?", (row["id"],)).fetchone()
    )


# ---- reading -------------------------------------------------------------------------------


def _visible_package(store: Any, tenant_id: str, name: str) -> Any:
    """A package is visible to its owner, and to others only while it has a published public version.
    Visibility is per version: publishing a public version never exposes earlier private ones."""
    package = store.conn.execute("SELECT * FROM ar_packages WHERE name=?", (name,)).fetchone()
    if package is None:
        raise StoreError("not found", 404)
    if package["tenant_id"] != tenant_id and not store.conn.execute(
        "SELECT 1 FROM ar_versions WHERE name=? AND visibility='public' AND status='published' LIMIT 1", (name,)
    ).fetchone():
        raise StoreError("not found", 404)
    return package


def _published_versions(store: Any, tenant_id: str, name: str) -> list[Any]:
    """Published versions of one package that the tenant may see, highest first."""
    _visible_package(store, tenant_id, name)
    return store.conn.execute(
        f"""SELECT {VCOLS} FROM ar_versions v JOIN ar_packages p ON p.name = v.name
            WHERE v.name=? AND v.status='published' AND (v.visibility='public' OR p.tenant_id=?)
            ORDER BY v.ver_major DESC, v.ver_minor DESC, v.ver_patch DESC""",
        (name, tenant_id),
    ).fetchall()


def _latest_visible(store: Any, tenant_id: str) -> dict[str, Any]:
    """Latest published version of every package the tenant can see, keyed by version id."""
    rows = store.conn.execute(
        f"""SELECT * FROM (
              SELECT {VCOLS}, ROW_NUMBER() OVER (
                PARTITION BY v.name ORDER BY v.ver_major DESC, v.ver_minor DESC, v.ver_patch DESC) AS rn
              FROM ar_versions v JOIN ar_packages p ON p.name = v.name
              WHERE v.status='published' AND (v.visibility='public' OR p.tenant_id=?)
            ) WHERE rn = 1""",
        (tenant_id,),
    ).fetchall()
    return {row["id"]: row for row in rows}


def _install_counts(store: Any) -> dict[str, int]:
    """Organisations that have installed each package. Distinct organisations, so one tenant cannot inflate it."""
    return {
        r["name"]: r["n"]
        for r in store.conn.execute("SELECT name, COUNT(DISTINCT tenant_id) AS n FROM ar_installs GROUP BY name").fetchall()
    }


VISIBLE_HITS = """
    FROM ar_chunks_fts f
    JOIN ar_chunks c ON c.rowid = f.rowid
    JOIN ar_versions v ON v.id = c.version_id
    JOIN ar_packages p ON p.name = v.name
    WHERE ar_chunks_fts MATCH ? AND (v.visibility='public' OR p.tenant_id=?)
    ORDER BY rank LIMIT {limit}"""


def _card(row: Any, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    manifest = json.loads(row["manifest_json"])
    card = {
        "name": row["name"],
        "version": row["version"],
        "kind": manifest["kind"],
        "description": manifest["description"],
        "category": manifest["category"],
        "tags": manifest["tags"],
        "jurisdiction": manifest["jurisdiction"],
        "compatible": manifest["compatible"],
        "requires": manifest["requires"],
        "license": manifest["license"],
        "visibility": manifest["visibility"],
        "trust": "unreviewed",
        "publisher_verified": False,
        "tokens": row["tokens"],
        "has_scripts": bool(row["has_scripts"]),
        "published_at": row["created_at"],
    }
    card.update(extra or {})
    return card


def _fts_query(terms: list[str]) -> str:
    return " OR ".join(f'"{t}"' for t in terms)


def search(
    store: Any, tenant_id: str, q: str = "", *, kind: str = "", limit: int = 20
) -> dict[str, Any]:
    limit = max(1, min(int(limit), 50))
    latest = _latest_visible(store, tenant_id)
    installs = _install_counts(store)
    q = (q or "").strip()
    if kind and kind not in KINDS:
        raise StoreError(f"kind must be one of: {', '.join(KINDS)}", 422)
    pool = {vid: row for vid, row in latest.items() if not kind or json.loads(row["manifest_json"])["kind"] == kind}
    if not q:
        rows = sorted(pool.values(), key=lambda r: r["created_at"], reverse=True)[:limit]
        return {"query": "", "total": len(pool), "items": [_card(r, {"installs": installs.get(r["name"], 0)}) for r in rows]}
    terms = _terms(q)
    scored: dict[str, dict[str, Any]] = {}
    if terms:
        hits = store.conn.execute(
            "SELECT c.id AS chunk_id, c.version_id AS version_id, bm25(ar_chunks_fts, 0.0, 5.0, 2.0, 3.0, 1.0, 1.0) AS rank"
            + VISIBLE_HITS.format(limit=400),
            (_fts_query(terms), tenant_id),
        ).fetchall()
        for hit in hits:
            if hit["version_id"] not in pool:
                continue
            entry = scored.setdefault(hit["version_id"], {"scores": []})
            entry["scores"].append(-float(hit["rank"]))
    items = []
    for vid, entry in scored.items():
        top = sorted(entry["scores"], reverse=True)[:3]
        score = top[0] + 0.5 * sum(top[1:2]) + 0.25 * sum(top[2:3])
        row = pool[vid]
        blob = (row["name"] + " " + json.loads(row["manifest_json"])["description"]).lower()
        items.append(
            (score, _card(row, {"installs": installs.get(row["name"], 0), "score": round(score, 3),
                                "matched_terms": [t for t in terms if t in blob][:8]}))
        )
    items.sort(key=lambda pair: -pair[0])
    return {"query": q, "total": len(items), "items": [card for _, card in items[:limit]]}


def get_package(store: Any, tenant_id: str, name: str) -> dict[str, Any]:
    package = _visible_package(store, tenant_id, name)
    rows = store.conn.execute(
        f"""SELECT {VCOLS} FROM ar_versions v WHERE v.name=? AND (v.visibility='public' OR ?)
            ORDER BY v.ver_major DESC, v.ver_minor DESC, v.ver_patch DESC""",
        (name, package["tenant_id"] == tenant_id),
    ).fetchall()
    published = [r for r in rows if r["status"] == "published"]
    if not published:
        raise StoreError("not found", 404)
    latest_files = store.conn.execute("SELECT files_json FROM ar_versions WHERE id=?", (published[0]["id"],)).fetchone()
    return {
        **_card(published[0], {"installs": _install_counts(store).get(name, 0)}),
        "publisher": package["publisher_slug"],
        "owned_by_caller": package["tenant_id"] == tenant_id,
        "versions": [
            {"version": r["version"], "status": r["status"], "content_hash": r["content_hash"], "published_at": r["created_at"]}
            for r in rows
        ],
        "files": sorted(json.loads(latest_files["files_json"])),
        "provenance": {
            "source": "registry:local", "published_by": published[0]["published_by"] if package["tenant_id"] == tenant_id else None, "content_hash": published[0]["content_hash"],
            "assertion": "Publisher-declared. Papership has not verified the publisher or the content.",
        },
        "declared_compatibility": json.loads(published[0]["manifest_json"])["compatible"],
        "tested_compatibility": [],
        "tested_compatibility_note": "No platform compatibility tests exist yet. Declared compatibility is a publisher assertion.",
    }


def get_version(store: Any, tenant_id: str, name: str, version: str) -> dict[str, Any]:
    package = _visible_package(store, tenant_id, name)
    row = store.conn.execute("SELECT * FROM ar_versions WHERE name=? AND version=?", (name, version)).fetchone()
    if row is None or (row["visibility"] != "public" and package["tenant_id"] != tenant_id):
        raise StoreError("not found", 404)
    return {
        **_card(row),
        "status": row["status"],
        "content_hash": row["content_hash"],
        "manifest": json.loads(row["manifest_json"]),
        "files": json.loads(row["files_json"]),
        "notice": "Third-party content, trust unreviewed. Papership never executes package files.",
    }


# ---- dependencies and install --------------------------------------------------------------


def resolve_dependencies(store: Any, tenant_id: str, roots: dict[str, str]) -> list[dict[str, Any]]:
    """Highest version satisfying every constraint reached from the roots. No backtracking."""
    chosen: dict[str, Any] = {}
    for _ in range(8):
        constraints: dict[str, list[tuple[str, str]]] = {n: [(c, "request")] for n, c in roots.items()}
        for row in chosen.values():
            for dep, constraint in json.loads(row["manifest_json"])["requires"].items():
                constraints.setdefault(dep, []).append((constraint, f"{row['name']}@{row['version']}"))
        if len(constraints) > MAX_LOCK_PACKAGES:
            raise StoreError(f"dependency graph is too large (more than {MAX_LOCK_PACKAGES} packages)", 409)
        nxt: dict[str, Any] = {}
        for name, wanted in constraints.items():
            try:
                versions = _published_versions(store, tenant_id, name)
            except StoreError:
                raise StoreError(f"package not found: {name} (required by {wanted[0][1]})", 404) from None
            predicates = [(parse_constraint(c), c, who) for c, who in wanted]
            pick = next(
                (v for v in versions if all(p((v["ver_major"], v["ver_minor"], v["ver_patch"])) for p, _, _ in predicates)),
                None,
            )
            if pick is None:
                have = ", ".join(v["version"] for v in versions) or "none published"
                need = "; ".join(f"{c} from {who}" for _, c, who in predicates)
                raise StoreError(f"dependency conflict for {name}: need {need}; available {have}", 409)
            nxt[name] = pick
        if {n: r["id"] for n, r in nxt.items()} == {n: r["id"] for n, r in chosen.items()}:
            return [
                {"name": r["name"], "version": r["version"], "content_hash": r["content_hash"],
                 "has_scripts": bool(r["has_scripts"]), "license": json.loads(r["manifest_json"])["license"]}
                for r in sorted(chosen.values(), key=lambda r: r["name"])
            ]
        chosen = nxt
    raise StoreError("dependency resolution did not converge", 409)


def install(
    store: Any, tenant_id: str, principal_id: str, name: str, constraint: str = "*", *,
    agent_id: str | None = None, allow_scripts: bool = False,
) -> dict[str, Any]:
    split_name(name)
    parse_constraint(constraint)
    target = agent_id or principal_id
    try:
        principal = store.principal(target)
    except StoreError:
        raise StoreError("agent not found", 404) from None
    if principal["tenant_id"] != tenant_id:
        raise StoreError("agent not found", 404)
    lock = resolve_dependencies(store, tenant_id, {name: constraint})
    scripted = [item["name"] for item in lock if item["has_scripts"]]
    if scripted and not allow_scripts:
        raise StoreError(
            f"these packages contain scripts that Papership never runs but your agent runtime might: {', '.join(scripted)}. "
            "Re-run with allow_scripts to accept.",
            409,
        )
    now = _now()
    with transaction(store):
        for item in lock:
            store.conn.execute(
                """INSERT INTO ar_installs (id, tenant_id, agent_id, name, version, constraint_text, content_hash, installed_by, installed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (tenant_id, agent_id, name) DO UPDATE SET version=excluded.version,
                     constraint_text=excluded.constraint_text, content_hash=excluded.content_hash,
                     installed_by=excluded.installed_by, installed_at=excluded.installed_at""",
                (_id("ari"), tenant_id, target, item["name"], item["version"], constraint if item["name"] == name else "dependency",
                 item["content_hash"], principal_id, now),
            )
        # Audit after every row is written: append_audit commits, so it must not interleave with the inserts.
        for item in lock:
            store.append_audit(principal_id, "registry.install", "package", f"{item['name']}@{item['version']} -> {target}")
    return {"agent_id": target, "installed": name, "lock": lock, "charged": 0}


def list_installs(store: Any, tenant_id: str, agent_id: str | None = None) -> list[dict[str, Any]]:
    sql = "SELECT * FROM ar_installs WHERE tenant_id=?"
    args: list[Any] = [tenant_id]
    if agent_id:
        sql += " AND agent_id=?"
        args.append(agent_id)
    rows = store.conn.execute(sql + " ORDER BY installed_at DESC, name", args).fetchall()
    return [
        {"agent_id": r["agent_id"], "name": r["name"], "version": r["version"], "constraint": r["constraint_text"],
         "content_hash": r["content_hash"], "installed_at": r["installed_at"]}
        for r in rows
    ]


# ---- resolve (task -> material set) --------------------------------------------------------


def _jurisdiction_ok(requested: str, offered: list[str]) -> bool:
    if not offered or not requested:
        return True
    req = requested.upper()
    return any(req == o or req.startswith(o + "-") for o in offered)


def _delivery_scores(store: Any, tenant_id: str) -> dict[str, float]:
    best: dict[str, list[float]] = {}
    for row in store.conn.execute("SELECT delivery_id, outcome FROM ar_outcomes WHERE tenant_id=?", (tenant_id,)).fetchall():
        best.setdefault(row["delivery_id"], []).append(OUTCOMES[row["outcome"]])
    return {k: sum(v) / len(v) for k, v in best.items()}


def lift_table(store: Any, tenant_id: str) -> dict[str, Any]:
    scores = _delivery_scores(store, tenant_id)
    baseline = sum(scores.values()) / len(scores) if scores else None
    version_names = {
        r["id"]: f"{r['name']}@{r['version']}" for r in store.conn.execute("SELECT id, name, version FROM ar_versions").fetchall()
    }
    by_version: dict[str, list[float]] = {}
    for row in store.conn.execute("SELECT id, version_ids FROM ar_deliveries WHERE tenant_id=?", (tenant_id,)).fetchall():
        if row["id"] not in scores:
            continue
        for vid in json.loads(row["version_ids"]):
            if vid in version_names:
                by_version.setdefault(version_names[vid], []).append(scores[row["id"]])
    items = []
    for key, vals in by_version.items():
        rate = sum(vals) / len(vals)
        items.append({
            "key": key, "n": len(vals), "success_rate": round(rate, 3),
            "lift": None if baseline is None else round(rate - baseline, 3),
            "reliable": len(vals) >= MIN_LIFT_SAMPLES,
        })
    items.sort(key=lambda i: (not i["reliable"], -(i["lift"] or 0), -i["n"]))
    return {
        "baseline_success_rate": None if baseline is None else round(baseline, 3),
        "resolved_deliveries": len(scores),
        "min_samples": MIN_LIFT_SAMPLES,
        "items": items,
        "note": "Association with the baseline success rate in this organisation, not a causal before/after.",
    }


def resolve(
    store: Any, tenant_id: str, principal_id: str, task: str, *, runtime: str = "", model: str = "",
    jurisdiction: str = "", max_age_days: int | None = None, trust: str = "any", kinds: list[str] | None = None,
    token_budget: int = DEFAULT_BUDGET, max_packages: int = 4,
) -> dict[str, Any]:
    task = (task or "").strip()
    if not task or len(task) > 4000:
        raise StoreError("task is required and must be under 4000 characters", 422)
    if credential_like(task):
        raise StoreError("a task description must not contain credentials", 422)
    if trust not in ("any", "verified"):
        raise StoreError("trust must be any or verified", 422)
    kinds = kinds or []
    if any(k not in KINDS for k in kinds):
        raise StoreError(f"kinds must be among: {', '.join(KINDS)}", 422)
    budget = max(200, min(int(token_budget), MAX_TOKEN_BUDGET))
    max_packages = max(1, min(int(max_packages), MAX_PACKAGES))
    latest = _latest_visible(store, tenant_id)
    terms = _terms(task)
    cutoff = None
    if max_age_days is not None:
        cutoff = _now_minus_days(max_age_days)

    def eligible(row: Any) -> bool:
        manifest = json.loads(row["manifest_json"])
        if trust == "verified":
            return False  # no review process exists yet; honest empty result rather than a fake badge
        if kinds and manifest["kind"] not in kinds:
            return False
        if not _jurisdiction_ok(jurisdiction, manifest["jurisdiction"]):
            return False
        return not (cutoff and row["created_at"] < cutoff)

    pool = {vid: row for vid, row in latest.items() if eligible(row)}
    lifts = {i["key"]: i for i in lift_table(store, tenant_id)["items"]}
    candidates: list[dict[str, Any]] = []
    if terms and pool:
        hits = store.conn.execute(
            """SELECT c.id AS chunk_id, c.version_id AS version_id, c.path AS path, c.heading AS heading, c.text AS text,
                      bm25(ar_chunks_fts, 0.0, 5.0, 2.0, 3.0, 1.0, 1.0) AS rank"""
            + VISIBLE_HITS.format(limit=300),
            (_fts_query(terms), tenant_id),
        ).fetchall()
        for hit in hits:
            row = pool.get(hit["version_id"])
            if row is None:
                continue
            info = lifts.get(f"{row['name']}@{row['version']}")
            multiplier = 1.0
            if info and info["reliable"] and info["lift"] is not None:
                multiplier += max(-0.5, min(0.5, info["lift"]))
            text_low = (hit["heading"] + " " + hit["path"] + " " + hit["text"]).lower()
            candidates.append({
                "hit": hit, "row": row, "score": -float(hit["rank"]) * multiplier, "lift": info,
                "matched": [t for t in terms if t in text_low][:8],
            })
    candidates.sort(key=lambda c: -c["score"])

    per_package: dict[str, float] = {}
    seen_count: dict[str, int] = {}
    covered: dict[str, set[str]] = {}
    for cand in candidates:
        vid = cand["row"]["id"]
        covered.setdefault(vid, set()).update(cand["matched"])
        n = seen_count.get(vid, 0)
        if n < 3:
            per_package[vid] = per_package.get(vid, 0.0) + cand["score"] * (0.5 ** n)
            seen_count[vid] = n + 1
    # A package must speak to at least half of what the task asks about; one shared word is not relevance.
    floor = 0.5 if len(terms) >= 2 else 0.0
    ranked = sorted(
        ((vid, s) for vid, s in per_package.items() if len(covered[vid]) / len(terms) >= floor),
        key=lambda kv: -kv[1],
    )
    chosen_ids: list[str] = []
    for vid, score in ranked:
        if len(chosen_ids) >= max_packages or score < 0.35 * ranked[0][1]:
            break
        chosen_ids.append(vid)

    chunks: list[dict[str, Any]] = []
    used = 0
    count: dict[str, int] = {}
    for cand in candidates:
        vid = cand["row"]["id"]
        if vid not in chosen_ids or count.get(vid, 0) >= MAX_PER_PACKAGE:
            continue
        cost = _tokens(cand["hit"]["text"])
        if used + cost > budget:
            continue
        chunks.append({
            "package": cand["row"]["name"], "version": cand["row"]["version"], "path": cand["hit"]["path"],
            "heading": cand["hit"]["heading"], "text": cand["hit"]["text"], "score": round(cand["score"], 3),
            "matched_terms": cand["matched"], "lift": cand["lift"],
        })
        count[vid] = count.get(vid, 0) + 1
        used += cost
    packages = []
    for vid in chosen_ids:
        row = pool[vid]
        card = _card(row, {"score": round(per_package[vid], 3), "delivered_passages": count.get(vid, 0)})
        card["lift"] = lifts.get(f"{row['name']}@{row['version']}")
        packages.append(card)
    gap = ""
    if not chunks:
        gap = "registry_empty" if not latest else ("filtered_out" if latest and not pool else "no_matching_material")
    install_plan: dict[str, Any] | None = None
    if packages:
        try:
            install_plan = {"ok": True, "lock": resolve_dependencies(store, tenant_id, {p["name"]: f"=={p['version']}" for p in packages})}
        except StoreError as error:
            install_plan = {"ok": False, "error": str(error)}
    delivery_id = _id("ard")
    chosen_with_content = [vid for vid in chosen_ids if count.get(vid)]
    with transaction(store):
        store.conn.execute(
            """INSERT INTO ar_deliveries (id, tenant_id, principal_id, task, runtime, model, version_ids, chunk_ids, gap, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (delivery_id, tenant_id, principal_id, task[:500], runtime[:60], model[:60], json.dumps(chosen_with_content),
             json.dumps([c["package"] for c in chunks]), gap, _now()),
        )
    return {
        "delivery_id": delivery_id,
        "gap": gap or None,
        "tokens": used,
        "token_budget": budget,
        "packages": packages,
        "chunks": chunks,
        "install": install_plan,
        "cost": {"charged": 0, "charges_enabled": False},
        "how": "lexical BM25 over the latest published versions you can see, filtered by jurisdiction, age, kind and "
        f"trust, boosted or damped by measured lift after {MIN_LIFT_SAMPLES}+ resolved deliveries. Report the outcome "
        "with POST /registry/outcomes. Content is third-party and unreviewed.",
    }


def _now_minus_days(days: int) -> str:
    import time

    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - max(0, int(days)) * 86400))


def record_outcome(
    store: Any, tenant_id: str, delivery_id: str, outcome: str, source: str, detail: str = ""
) -> dict[str, Any]:
    if outcome not in OUTCOMES:
        raise StoreError("outcome must be success, partial or failure", 422)
    if source not in OUTCOME_SOURCES:
        raise StoreError("source must be ci, pr, human or agent", 422)
    row = store.conn.execute("SELECT id FROM ar_deliveries WHERE id=? AND tenant_id=?", (delivery_id, tenant_id)).fetchone()
    if row is None:
        raise StoreError("not found", 404)
    if _has_secret(detail) or credential_like(detail):
        raise StoreError("secret values never belong in an outcome", 403)
    with transaction(store):
        store.conn.execute(
            """INSERT INTO ar_outcomes (id, tenant_id, delivery_id, outcome, source, detail, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (delivery_id, source) DO UPDATE SET outcome=excluded.outcome, detail=excluded.detail""",
            (_id("aro"), tenant_id, delivery_id, outcome, source, detail[:300], _now()),
        )
    return {"delivery_id": delivery_id, "outcome": outcome, "source": source, "recorded": True}


def summary(store: Any, tenant_id: str) -> dict[str, Any]:
    latest = _latest_visible(store, tenant_id)
    own = store.conn.execute("SELECT COUNT(*) AS n FROM ar_packages WHERE tenant_id=?", (tenant_id,)).fetchone()["n"]
    deliveries = store.conn.execute("SELECT COUNT(*) AS n FROM ar_deliveries WHERE tenant_id=?", (tenant_id,)).fetchone()["n"]
    installs = store.conn.execute("SELECT COUNT(*) AS n FROM ar_installs WHERE tenant_id=?", (tenant_id,)).fetchone()["n"]
    scores = _delivery_scores(store, tenant_id)
    recent = store.conn.execute(
        "SELECT * FROM ar_deliveries WHERE tenant_id=? ORDER BY created_at DESC, rowid DESC LIMIT 12", (tenant_id,)
    ).fetchall()
    gaps = store.conn.execute(
        """SELECT task, gap, created_at FROM ar_deliveries WHERE tenant_id=? AND gap!='' AND gap!='registry_empty'
           ORDER BY created_at DESC, rowid DESC LIMIT 10""",
        (tenant_id,),
    ).fetchall()
    return {
        "visible_packages": len(latest),
        "own_packages": own,
        "installs": installs,
        "deliveries": deliveries,
        "recent": [
            {"id": r["id"], "task": r["task"], "runtime": r["runtime"], "gap": r["gap"] or None,
             "packages": len(json.loads(r["version_ids"])), "outcome_score": scores.get(r["id"]), "created_at": r["created_at"]}
            for r in recent
        ],
        "demand_gaps": [{"task": g["task"], "gap": g["gap"], "at": g["created_at"]} for g in gaps],
        "lift": lift_table(store, tenant_id),
        "charges": "off",
    }


# ---- routes --------------------------------------------------------------------------------


class PublishBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    manifest: dict[str, Any]
    files: dict[str, str]


class InstallBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=3, max_length=80)
    constraint: str = Field(default="*", max_length=40)
    agent_id: str | None = Field(default=None, max_length=80)
    allow_scripts: bool = False


class ResolveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task: str = Field(min_length=1, max_length=4000)
    runtime: str = Field(default="", max_length=60)
    model: str = Field(default="", max_length=60)
    jurisdiction: str = Field(default="", max_length=8)
    max_age_days: int | None = Field(default=None, ge=0, le=36500)
    trust: str = Field(default="any", max_length=10)
    kinds: list[str] = Field(default_factory=list, max_length=12)
    token_budget: int = Field(default=DEFAULT_BUDGET, ge=200, le=MAX_TOKEN_BUDGET)
    max_packages: int = Field(default=4, ge=1, le=MAX_PACKAGES)


class OutcomeBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    delivery_id: str = Field(min_length=1, max_length=80)
    outcome: str
    source: str
    detail: str = Field(default="", max_length=300)


def register_routes(app: FastAPI, store: Any) -> None:
    migrate(store)

    def need(ctx: AuthContext, *classes: str) -> None:
        if not any(store.has_grant(ctx.principal_id, c) for c in classes):
            raise StoreError("missing grant", 403)

    def read(ctx: AuthContext) -> None:
        need(ctx, "memory.read", "org.admin")

    def write(ctx: AuthContext) -> None:
        need(ctx, "memory.write", "org.admin")

    def is_agent(ctx: AuthContext) -> bool:
        try:
            return store.principal(ctx.principal_id)["kind"] == "agent"
        except StoreError:
            return False

    @app.middleware("http")
    async def cap_publish_body(request: Request, call_next: Any) -> Any:
        if request.method == "POST" and request.url.path == "/registry/packages":
            declared = request.headers.get("content-length", "")
            if not declared.isdigit() or int(declared) > MAX_BODY_BYTES:
                return JSONResponse({"detail": f"publish body must declare a size under {MAX_BODY_BYTES} bytes"}, status_code=413)
        return await call_next(request)

    @app.post("/registry/packages")
    def publish_route(body: PublishBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        # An agent may publish private drafts into its own organisation. Going public is a human decision.
        if is_agent(ctx) and str(body.manifest.get("visibility", "private")).lower() != "private":
            raise StoreError("agents publish private drafts only; a human publishes publicly", 403)
        out = publish(store, ctx.tenant_id, ctx.principal_id, body.manifest, body.files)
        if out.get("created"):
            store.append_audit(
                ctx.principal_id, "registry.publish", "package",
                f"{out['name']}@{out['version']} visibility={out['visibility']}",
            )
        return out

    @app.get("/registry/packages")
    def search_route(q: str = "", kind: str = "", limit: int = 20, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return search(store, ctx.tenant_id, q[:200], kind=kind, limit=limit)

    @app.get("/registry/packages/{publisher}/{package}")
    def package_route(publisher: str, package: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return get_package(store, ctx.tenant_id, f"{publisher}/{package}")

    @app.get("/registry/packages/{publisher}/{package}/versions/{version}")
    def version_route(publisher: str, package: str, version: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return get_version(store, ctx.tenant_id, f"{publisher}/{package}", version)

    @app.post("/registry/packages/{publisher}/{package}/versions/{version}/yank")
    def yank_route(publisher: str, package: str, version: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        if is_agent(ctx):  # an agent may withdraw its own drafts, not what a human published
            row = store.conn.execute(
                "SELECT published_by FROM ar_versions WHERE name=? AND version=?", (f"{publisher}/{package}", version)
            ).fetchone()
            if row is not None and row["published_by"] != ctx.principal_id:
                need(ctx, "org.admin")
        out = yank(store, ctx.tenant_id, f"{publisher}/{package}", version)
        store.append_audit(ctx.principal_id, "registry.yank", "package", f"{out['name']}@{out['version']}")
        return out

    @app.post("/registry/install")
    def install_route(body: InstallBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        write(ctx)
        if body.agent_id and body.agent_id != ctx.principal_id:
            need(ctx, "org.admin")  # equipping someone else's agent is an administrative act
        return install(
            store, ctx.tenant_id, ctx.principal_id, body.name, body.constraint,
            agent_id=body.agent_id, allow_scripts=body.allow_scripts,
        )

    @app.get("/registry/installs")
    def installs_route(agent_id: str | None = None, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return {"items": list_installs(store, ctx.tenant_id, agent_id)}

    @app.post("/registry/resolve")
    def resolve_route(body: ResolveBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return resolve(
            store, ctx.tenant_id, ctx.principal_id, body.task, runtime=body.runtime, model=body.model,
            jurisdiction=body.jurisdiction, max_age_days=body.max_age_days, trust=body.trust, kinds=body.kinds,
            token_budget=body.token_budget, max_packages=body.max_packages,
        )

    @app.post("/registry/outcomes")
    def outcome_route(body: OutcomeBody, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        # An agent cannot claim a ci/pr/human verdict; its own reports are always recorded as source=agent.
        source = "agent" if is_agent(ctx) else body.source
        return record_outcome(store, ctx.tenant_id, body.delivery_id, body.outcome, source, body.detail)

    @app.get("/registry/loop")
    def loop_route(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        read(ctx)
        return summary(store, ctx.tenant_id)
