from __future__ import annotations

import inspect
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt

from app import knowledge_layer
from app.config import TEST_JWT_SECRET_VALUE


def _token(sub: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "iss": "http://engine.test/auth/v1",
        "aud": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
        "role": "authenticated",
        "grant_version": 1,
        "aal": "aal2",
    }
    return jwt.encode(payload, TEST_JWT_SECRET_VALUE, algorithm="HS256")


def _column(db: sqlite3.Connection, table: str, name: str) -> tuple:
    row = next(item for item in db.execute(f"PRAGMA table_info({table})") if item[1] == name)
    return row


def test_workspace_routes_are_tenant_scoped(client, founder_headers, unpriv_headers, tmp_path: Path):
    founder = client.get("/agents", headers=founder_headers)
    assert founder.status_code == 200
    body = founder.json()
    assert any(row["principal_id"] == "principal-agent" for row in body["agents"])
    assert all(row["context_plan_id"] is None for row in body["agents"])
    assert "org.admin" in body["caller_grants"]

    detail = client.get("/agents/principal-agent", headers=founder_headers)
    assert detail.status_code == 200
    assert detail.json()["task"] is None
    assert detail.json()["unavailable"] == ["trust", "impact", "cost", "missing"]
    assert client.get("/agents/principal-founder", headers=founder_headers).status_code == 404

    for path in ("/agents", "/knowledge/objects", "/approvals", "/audit"):
        denied = client.get(path, headers=unpriv_headers)
        assert denied.status_code == 403, path

    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title,
          owner_principal_id, version, content
        ) VALUES (
          'pref-hidden', 'tenant-founder', 'preferences', 'source',
          '{"source":"seat"}', '2026-10-06T00:00:00Z', 'Hidden preference',
          'principal-unpriv', 1, 'secret-body'
        )
        """
    )
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title,
          owner_principal_id, version, content
        ) VALUES (
          'pref-mine', 'tenant-founder', 'preferences', 'source',
          '{"source":"seat"}', '2026-10-06T00:00:01Z', 'Own preference',
          'principal-founder', 1, 'own-body'
        )
        """
    )
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title,
          owner_principal_id, version, content
        ) VALUES (
          'session-hidden', 'tenant-founder', 'sessions', 'source',
          '{"source":"seat"}', '2026-10-06T00:00:03Z', 'Hidden session',
          'principal-unpriv', 1, 'session-body'
        )
        """
    )
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title, version, content
        ) VALUES (
          'mem-other-tenant', 'tenant-other', 'project', 'approved',
          'seed', '2026-10-06T00:00:02Z', 'Other tenant', 1, 'other-body'
        )
        """
    )
    db.commit()

    knowledge = client.get("/knowledge/objects", headers=founder_headers)
    assert knowledge.status_code == 200
    objects = knowledge.json()["objects"]
    sources = {row["source_id"] for row in objects}
    assert "mem-1" in sources
    assert "pref-mine" in sources
    assert "pref-hidden" not in sources
    assert "session-hidden" not in sources
    assert "mem-other-tenant" not in sources
    assert all("content" not in row for row in objects)
    assert "secret-body" not in knowledge.text
    assert "session-body" not in knowledge.text

    ledger_only = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-unpriv", "grant_class": "ledger.read"},
    )
    assert ledger_only.status_code == 200
    assert client.get("/agents", headers=unpriv_headers).status_code == 403
    assert client.get("/approvals", headers=unpriv_headers).status_code == 403
    assert client.get("/audit", headers=unpriv_headers).status_code == 403
    records = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-unpriv", "grant_class": "records.read"},
    )
    assert records.status_code == 200
    assert client.get("/agents", headers=unpriv_headers).status_code == 200

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    other_headers = {"Authorization": f"Bearer {_token('principal-other')}"}
    other = client.get("/knowledge/objects", headers=other_headers)
    assert other.status_code == 200
    other_sources = {row["source_id"] for row in other.json()["objects"]}
    assert "mem-1" not in other_sources
    assert "pref-mine" not in other_sources
    assert "mem-other-tenant" in other_sources

    for table in ("work_items", "jobs", "runs"):
        column = _column(db, table, "context_plan_id")
        assert column[3] == 0
        assert column[4] is None
    refs = _column(db, "work_items", "context_refs")
    assert refs[3] == 0
    assert refs[4] is None
    profiles = {row[1] for row in db.execute("PRAGMA table_info(agent_profiles)")}
    assert "principal_id" in profiles


def test_knowledge_layer_does_not_emit_or_hardcode_tenant():
    source = inspect.getsource(knowledge_layer)
    assert "maybe_emit" not in source
    assert "tenant-founder" not in source
    assert "principal-founder" not in source
    assert "_visible_to" not in source
