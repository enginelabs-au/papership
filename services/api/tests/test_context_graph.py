from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app.store import Store


def test_context_graph_tables_are_idempotent_and_versions_are_insert_only(tmp_path: Path):
    path = tmp_path / "graph.sqlite"
    Store(str(path)).close()
    Store(str(path)).close()
    db = sqlite3.connect(path)
    names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"context_objects", "context_versions", "context_relationships", "context_sources"} <= names
    nullable = {
        "context_objects": "owner_principal_id",
        "context_versions": "parent_version_id",
        "context_relationships": "from_version_id",
    }
    for table, column in nullable.items():
        info = next(row for row in db.execute(f"PRAGMA table_info({table})") if row[1] == column)
        assert info[3] == 0
    source = next(row for row in db.execute("PRAGMA table_info(context_sources)") if row[1] == "retrieved_at")
    assert source[3] == 1
    db.execute(
        """
        INSERT INTO context_versions
          (id, tenant_id, object_id, version_number, parent_version_id, digest, class, created_at)
        VALUES ('v1', 'tenant-a', 'object-a', 1, NULL, 'digest-1', 'source', '2026-10-06T00:00:00Z')
        """
    )
    db.commit()
    with pytest.raises(sqlite3.DatabaseError):
        db.execute("UPDATE context_versions SET class = 'approved' WHERE id = 'v1'")
        db.commit()


def test_projection_keeps_sources_and_versions_immutable(client, founder_headers, unpriv_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute(
        """
        INSERT INTO attachments (id, tenant_id, label, created_at)
        VALUES ('att-1', 'tenant-founder', 'Brief', '2026-10-06T00:00:00Z')
        """
    )
    db.execute(
        """
        INSERT INTO loop_stage_artifacts (
          id, tenant_id, work_item_id, job_id, stage, artifact_type, title,
          body_markdown, ledger_path, meta_json, memory_item_id, created_at
        ) VALUES (
          'art-1', 'tenant-founder', 'work-1', 'job-1', 'research', 'note', 'Stage note',
          'do-not-copy-body', 'ledger/art-1.md', '{}', 'mem-1', '2026-10-06T00:00:00Z'
        )
        """
    )
    db.execute("UPDATE memory_items SET content = 'secret-body' WHERE id = 'mem-1'")
    db.commit()

    listed = client.get("/knowledge/objects", headers=founder_headers)
    assert listed.status_code == 200
    objects = listed.json()["objects"]
    mem = next(row for row in objects if row["source_id"] == "mem-1")
    assert mem["source_kind"] == "memory"
    assert "content" not in mem
    assert "secret-body" not in listed.text
    assert "do-not-copy-body" not in listed.text
    payload = db.execute("SELECT payload FROM registry LIMIT 1").fetchone()[0]
    assert payload not in listed.text
    assert db.execute("SELECT COUNT(*) FROM registry").fetchone()[0] == 43
    projected = dict(
        db.execute(
            """
            SELECT source_kind, COUNT(*) FROM context_objects
            WHERE tenant_id = 'tenant-founder' GROUP BY source_kind
            """
        ).fetchall()
    )
    assert projected["registry"] == 43
    assert projected["memory"] >= 1
    assert projected["artifact"] >= 1
    assert projected["attachment"] >= 1
    assert projected.get("connection", 0) == db.execute(
        "SELECT COUNT(*) FROM connections WHERE tenant_id = 'tenant-founder'"
    ).fetchone()[0]

    before = db.execute(
        """
        SELECT id, digest, class, version_number, parent_version_id
        FROM context_versions WHERE object_id = ? AND version_number = 1
        """,
        (mem["id"],),
    ).fetchone()
    external = client.post(
        f"/knowledge/objects/{mem['id']}/versions",
        headers=founder_headers,
        json={"external": True},
    )
    assert external.status_code == 200
    assert external.json()["class"] == "inferred"
    after = db.execute(
        """
        SELECT id, digest, class, version_number, parent_version_id
        FROM context_versions WHERE object_id = ? AND version_number = 1
        """,
        (mem["id"],),
    ).fetchone()
    assert after == before
    approved = client.post(
        f"/knowledge/objects/{mem['id']}/versions",
        headers=founder_headers,
        json={"external": True, "class": "approved"},
    )
    assert approved.status_code == 200
    assert approved.json()["class"] == "approved"
    detail = client.get(f"/knowledge/objects/{mem['id']}", headers=founder_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert [row["version_number"] for row in body["versions"]][:1] == [1]
    assert body["versions"][0]["digest"] == before[1]
    assert len(body["versions"]) >= 2
    assert "secret-body" not in detail.text
    assert all(
        row[0] is None
        for row in db.execute("SELECT context_plan_id FROM work_items")
    )

    target = next(row for row in objects if row["source_kind"] == "registry")
    bad = client.post(
        "/knowledge/relationships",
        headers=founder_headers,
        json={
            "from_object_id": mem["id"],
            "to_object_id": target["id"],
            "relationship": "trusts",
        },
    )
    assert bad.status_code == 400
    linked = client.post(
        "/knowledge/relationships",
        headers=founder_headers,
        json={
            "from_object_id": mem["id"],
            "to_object_id": target["id"],
            "relationship": "derived_from",
        },
    )
    assert linked.status_code == 200
    linked_detail = client.get(f"/knowledge/objects/{mem['id']}", headers=founder_headers)
    assert any(row["relationship"] == "derived_from" for row in linked_detail.json()["relationships"])

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    other_headers = {"Authorization": f"Bearer {_token('principal-other')}"}
    other = client.get("/knowledge/objects", headers=other_headers)
    assert other.status_code == 200
    foreign = other.json()["objects"][0]["id"]
    crossed = client.post(
        "/knowledge/relationships",
        headers=founder_headers,
        json={
            "from_object_id": mem["id"],
            "to_object_id": foreign,
            "relationship": "requires",
        },
    )
    assert crossed.status_code == 404
    assert db.execute("SELECT COUNT(*) FROM registry").fetchone()[0] == 43
    assert db.execute(
        """
        SELECT COUNT(*) FROM context_objects
        WHERE tenant_id = 'tenant-other' AND source_kind = 'registry'
        """
    ).fetchone()[0] == 43

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
    db.commit()
    founder_again = client.get("/knowledge/objects", headers=founder_headers)
    assert "pref-hidden" not in {row["source_id"] for row in founder_again.json()["objects"]}
    assert "secret-body" not in founder_again.text
    readable = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-unpriv", "grant_class": "memory.read"},
    )
    assert readable.status_code == 200
    hidden_list = client.get("/knowledge/objects", headers=unpriv_headers)
    hidden = next(row for row in hidden_list.json()["objects"] if row["source_id"] == "pref-hidden")
    denied = client.get(f"/knowledge/objects/{hidden['id']}", headers=founder_headers)
    assert denied.status_code == 403


def _token(sub: str) -> str:
    from datetime import datetime, timedelta, timezone

    import jwt

    from app.config import TEST_JWT_SECRET_VALUE

    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": sub,
            "iss": "http://engine.test/auth/v1",
            "aud": "authenticated",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=15)).timestamp()),
            "role": "authenticated",
            "grant_version": 1,
            "aal": "aal2",
        },
        TEST_JWT_SECRET_VALUE,
        algorithm="HS256",
    )
