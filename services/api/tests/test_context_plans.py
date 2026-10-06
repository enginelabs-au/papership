from __future__ import annotations

import inspect
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt

from app import knowledge_layer
from app.config import TEST_JWT_SECRET_VALUE

GAP = "No visible context is attached to this agent and task."


def _token(sub: str) -> str:
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


def _work_item(db: sqlite3.Connection, item_id: str, tenant_id: str) -> None:
    db.execute(
        """
        INSERT INTO work_items
          (id, tenant_id, title, stage, stage_changed_at, created_at, updated_at)
        VALUES (?, ?, 'Plan task', 'request', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z')
        """,
        (item_id, tenant_id),
    )


def test_plan_cites_a_pack_version_and_keeps_it(client, founder_headers, unpriv_headers, tmp_path: Path):
    denied = client.post(
        "/knowledge/plans",
        headers=unpriv_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-plan"},
    )
    assert denied.status_code == 403
    assert client.get("/knowledge/plans/missing", headers=unpriv_headers).status_code == 403

    db = sqlite3.connect(tmp_path / "store.sqlite")
    _work_item(db, "work-plan", "tenant-founder")
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title,
          owner_principal_id, version, content
        ) VALUES (
          'pref-hidden', 'tenant-founder', 'preferences', 'source',
          '{"source":"seat"}', '2026-10-06T00:00:00Z', 'Hidden preference',
          'principal-agent', 1, 'secret-body'
        )
        """
    )
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-plan"},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["gap"] is None
    assert body["agent_principal_id"] == "principal-agent"
    assert body["work_item_id"] == "work-plan"
    assert body["citations"]
    assert "secret-body" not in created.text
    assert "content" not in created.text
    assert "trust" not in body
    assert "price" not in created.text

    pack = db.execute(
        """
        SELECT o.id, v.id
        FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id AND v.version_number = 1
        WHERE o.tenant_id = 'tenant-founder' AND o.source_kind = 'pack' AND o.source_id = 'education-demo'
        """
    ).fetchone()
    assert pack is not None
    assert any(row["version_id"] == pack[1] and row["object_id"] == pack[0] for row in body["citations"])
    cited_ids = [row["object_id"] for row in body["citations"]]
    kinds = db.execute(
        f"SELECT source_kind, source_id FROM context_objects WHERE id IN ({','.join('?' for _ in cited_ids)})",
        cited_ids,
    ).fetchall()
    assert all(kind != "registry" for kind, _source in kinds)
    assert all(source != "B01.01" for _kind, source in kinds)

    newer = client.post(
        f"/knowledge/objects/{pack[0]}/versions",
        headers=founder_headers,
        json={"class": "approved"},
    )
    assert newer.status_code == 200
    again = client.get(f"/knowledge/plans/{body['id']}", headers=founder_headers)
    assert again.status_code == 200
    assert any(row["version_id"] == pack[1] for row in again.json()["citations"])
    stored = db.execute(
        "SELECT version_id FROM context_plan_citations WHERE plan_id = ?",
        (body["id"],),
    ).fetchall()
    assert pack[1] in {row[0] for row in stored}
    assert db.execute(
        "SELECT MAX(version_number) FROM context_versions WHERE object_id = ?",
        (pack[0],),
    ).fetchone()[0] >= 2

    assert db.execute("SELECT context_plan_id FROM work_items WHERE id = 'work-plan'").fetchone()[0] == body["id"]
    assert db.execute("SELECT context_refs FROM work_items WHERE id = 'work-plan'").fetchone()[0] is None
    assert db.execute(
        "SELECT context_plan_id FROM agent_profiles WHERE principal_id = 'principal-agent'"
    ).fetchone()[0] == body["id"]
    assert all(row[0] is None for row in db.execute("SELECT context_plan_id FROM jobs"))
    assert all(row[0] is None for row in db.execute("SELECT context_plan_id FROM runs"))
    assert db.execute("SELECT COUNT(*) FROM registry").fetchone()[0] == 43

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    other = client.get(
        f"/knowledge/plans/{body['id']}",
        headers={"Authorization": f"Bearer {_token('principal-other')}"},
    )
    assert other.status_code == 404
    missing_agent = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-other", "work_item_id": "work-plan"},
    )
    assert missing_agent.status_code == 404


def test_empty_plan_records_the_gap(client, founder_headers, monkeypatch, tmp_path: Path):
    monkeypatch.setattr("app.phase7.PACKS", {})
    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute("DELETE FROM loop_stage_artifacts WHERE tenant_id = 'tenant-founder'")
    db.execute("DELETE FROM attachments WHERE tenant_id = 'tenant-founder'")
    _work_item(db, "work-gap", "tenant-founder")
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-gap"},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["citations"] == []
    assert body["gap"] == GAP
    assert db.execute("SELECT context_plan_id FROM work_items WHERE id = 'work-gap'").fetchone()[0] == body["id"]
    assert db.execute(
        "SELECT context_plan_id FROM agent_profiles WHERE principal_id = 'principal-agent'"
    ).fetchone()[0] == body["id"]


def test_plan_route_stays_out_of_the_worker():
    source = inspect.getsource(knowledge_layer)
    assert "maybe_emit" not in source
    assert "tenant-founder" not in source
    assert "principal-founder" not in source
    assert "_visible_to" not in source
    assert "run_engine_labs_stage_work" not in source
    assert "install_pack" not in source
    assert "activate_pack" not in source
