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
        VALUES (?, ?, 'Impact task', 'request', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z')
        """,
        (item_id, tenant_id),
    )


def test_trust_and_impact_cite_a_version(client, founder_headers, unpriv_headers, tmp_path: Path):
    denied = client.post(
        "/knowledge/trust",
        headers=unpriv_headers,
        json={"version_id": "a" * 64, "verdict": "accepted"},
    )
    assert denied.status_code == 403
    assert client.post(
        "/knowledge/impact",
        headers=unpriv_headers,
        json={"version_id": "a" * 64, "work_item_id": "work-impact", "outcome": "helped"},
    ).status_code == 403
    assert client.get("/knowledge/plans/missing/signals", headers=unpriv_headers).status_code == 403

    for grant_class in ("memory.write", "org.admin"):
        granted = client.post(
            "/grants",
            headers=founder_headers,
            json={"principal_id": "principal-agent", "grant_class": grant_class},
        )
        assert granted.status_code == 200
    agent_headers = {"Authorization": f"Bearer {_token('principal-agent')}"}
    assert client.post(
        "/knowledge/trust",
        headers=agent_headers,
        json={"version_id": "a" * 64, "verdict": "accepted"},
    ).status_code == 403
    assert client.post(
        "/knowledge/impact",
        headers=agent_headers,
        json={"version_id": "a" * 64, "work_item_id": "work-impact", "outcome": "helped"},
    ).status_code == 403

    db = sqlite3.connect(tmp_path / "store.sqlite")
    _work_item(db, "work-impact", "tenant-founder")
    pref_object = "c" * 64
    pref_version = "d" * 64
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title,
          owner_principal_id, version, content
        ) VALUES (
          'pref-secret', 'tenant-founder', 'preferences', 'source',
          '{"source":"seat"}', '2026-10-06T00:00:00Z', 'Hidden preference',
          'principal-unpriv', 1, 'secret-body'
        )
        """
    )
    db.execute(
        """
        INSERT INTO context_objects (
          id, tenant_id, kind, title, class, source_kind, source_id, owner_principal_id, created_at
        ) VALUES (?, 'tenant-founder', 'preferences', 'Hidden preference', 'source', 'memory', 'pref-secret', 'principal-unpriv', '2026-10-06T00:00:00Z')
        """,
        (pref_object,),
    )
    db.execute(
        """
        INSERT INTO context_versions (
          id, tenant_id, object_id, version_number, parent_version_id, digest, class, created_at
        ) VALUES (?, 'tenant-founder', ?, 1, NULL, ?, 'source', '2026-10-06T00:00:00Z')
        """,
        (pref_version, pref_object, "e" * 64),
    )
    other_object = "f" * 64
    other_version = "1" * 64
    db.execute(
        """
        INSERT INTO context_objects (
          id, tenant_id, kind, title, class, source_kind, source_id, owner_principal_id, created_at
        ) VALUES (?, 'tenant-other', 'project', 'Other', 'source', 'memory', 'mem-other', NULL, '2026-10-06T00:00:00Z')
        """,
        (other_object,),
    )
    db.execute(
        """
        INSERT INTO context_versions (
          id, tenant_id, object_id, version_number, parent_version_id, digest, class, created_at
        ) VALUES (?, 'tenant-other', ?, 1, NULL, ?, 'source', '2026-10-06T00:00:00Z')
        """,
        (other_version, other_object, "2" * 64),
    )
    db.commit()

    private = client.post(
        "/knowledge/trust",
        headers=founder_headers,
        json={"version_id": pref_version, "verdict": "accepted"},
    )
    assert private.status_code == 403
    assert "secret-body" not in private.text

    foreign = client.post(
        "/knowledge/trust",
        headers=founder_headers,
        json={"version_id": other_version, "verdict": "accepted"},
    )
    assert foreign.status_code == 404

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-impact"},
    )
    assert created.status_code == 200
    plan_id = created.json()["id"]
    demo = db.execute(
        """
        SELECT v.id, v.class FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id AND v.version_number = 1
        WHERE o.tenant_id = 'tenant-founder' AND o.source_id = 'education-demo'
        """
    ).fetchone()
    executable = db.execute(
        """
        SELECT v.id FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id AND v.version_number = 1
        WHERE o.tenant_id = 'tenant-founder' AND o.source_id = 'example-executable'
        """
    ).fetchone()
    assert demo is not None and executable is not None

    recorded = client.post(
        "/knowledge/trust",
        headers=founder_headers,
        json={"version_id": demo[0], "verdict": "accepted"},
    )
    assert recorded.status_code == 200
    assert recorded.json()["verdict"] == "accepted"
    assert "content" not in recorded.text
    assert "prompt" not in recorded.text
    assert db.execute("SELECT class FROM context_versions WHERE id = ?", (demo[0],)).fetchone()[0] == demo[1]

    extra = client.post(
        "/knowledge/impact",
        headers=founder_headers,
        json={"version_id": demo[0], "work_item_id": "work-impact", "outcome": "helped", "prompt": "hidden"},
    )
    assert extra.status_code == 422
    helped = client.post(
        "/knowledge/impact",
        headers=founder_headers,
        json={"version_id": demo[0], "work_item_id": "work-impact", "outcome": "helped"},
    )
    assert helped.status_code == 200
    unknown = client.post(
        "/knowledge/impact",
        headers=founder_headers,
        json={"version_id": demo[0], "work_item_id": "work-impact", "outcome": "unknown"},
    )
    assert unknown.status_code == 200
    assert "content" not in unknown.text

    db.execute(
        """
        INSERT INTO pack_trust_reviews (
          id, tenant_id, pack_id, install_id, verdict, reviewed_by, created_at, updated_at
        ) VALUES (
          'review-exec', 'tenant-founder', 'example-executable', 'install-none',
          'pending', 'principal-founder', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z'
        )
        """
    )
    db.commit()
    before = db.execute(
        "SELECT COUNT(*) FROM context_trust_assessments WHERE version_id = ?",
        (executable[0],),
    ).fetchone()[0]
    signals = client.get(f"/knowledge/plans/{plan_id}/signals", headers=founder_headers)
    assert signals.status_code == 200
    body = signals.json()
    assert body["plan_id"] == plan_id
    by_version = {row["version_id"]: row for row in body["signals"]}
    assert by_version[demo[0]]["trust"] == {"verdict": "accepted", "source": "assessment"}
    assert by_version[demo[0]]["impact"] == "unknown"
    assert by_version[executable[0]]["trust"] == {"verdict": "pending", "source": "pack_review"}
    after = db.execute(
        "SELECT COUNT(*) FROM context_trust_assessments WHERE version_id = ?",
        (executable[0],),
    ).fetchone()[0]
    assert after == before

    plan = client.get(f"/knowledge/plans/{plan_id}", headers=founder_headers)
    assert plan.status_code == 200
    assert "trust" not in plan.json()
    assert "impact" not in plan.json()
    assert db.execute("SELECT COUNT(*) FROM registry").fetchone()[0] == 43

    other_grant = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert other_grant.status_code == 200
    other = client.get(
        f"/knowledge/plans/{plan_id}/signals",
        headers={"Authorization": f"Bearer {_token('principal-other')}"},
    )
    assert other.status_code == 404
    other_write = client.post(
        "/knowledge/trust",
        headers={"Authorization": f"Bearer {_token('principal-other')}"},
        json={"version_id": demo[0], "verdict": "refused"},
    )
    assert other_write.status_code == 404


def test_trust_routes_stay_out_of_the_worker():
    source = inspect.getsource(knowledge_layer)
    assert "maybe_emit" not in source
    assert "tenant-founder" not in source
    assert "principal-founder" not in source
    assert "run_engine_labs_stage_work" not in source
    assert "review_pack_trust" not in source
    assert "install_pack" not in source
    assert "activate_pack" not in source
