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
    monkeypatch.setattr("app.knowledge_layer.EXAMPLE_MATERIALS", ())
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


def _memory(db: sqlite3.Connection, item_id: str, item_class: str, created_at: str) -> None:
    db.execute(
        """
        INSERT INTO memory_items (
          id, tenant_id, kind, class, provenance, created_at, title,
          owner_principal_id, version, content
        ) VALUES (
          ?, 'tenant-founder', 'note', ?,
          '{"source":"seat"}', ?, ?,
          'principal-agent', 1, 'hidden-note'
        )
        """,
        (item_id, item_class, created_at, item_id),
    )


def test_organisation_context_precedes_packs(client, founder_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    _work_item(db, "work-bands", "tenant-founder")
    _memory(db, "org-note", "source", "2020-01-01T00:00:00Z")
    _memory(db, "inferred-note", "inferred", "2026-10-06T12:00:00Z")
    db.execute(
        """
        INSERT INTO context_objects (
          id, tenant_id, kind, title, class, source_kind, source_id, owner_principal_id, created_at
        ) VALUES (
          'local-obj', 'tenant-founder', 'file', 'On this machine', 'source',
          'local_file', 'local-1', 'principal-founder', '2026-10-06T00:00:00Z'
        )
        """
    )
    db.execute(
        """
        INSERT INTO context_objects (
          id, tenant_id, kind, title, class, source_kind, source_id, owner_principal_id, created_at
        ) VALUES (
          'foreign-obj', 'tenant-other', 'note', 'Other org', 'source',
          'memory', 'foreign-note', 'principal-agent', '2026-10-06T00:00:00Z'
        )
        """
    )
    db.execute(
        """
        INSERT INTO pack_trust_reviews (
          id, tenant_id, pack_id, install_id, verdict, reviewed_by, created_at, updated_at
        ) VALUES (
          'review-edu', 'tenant-founder', 'education-demo', 'install-edu', 'accepted',
          'principal-founder', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z'
        )
        """
    )
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-bands"},
    )
    assert created.status_code == 200
    body = created.json()
    bands = [row["band"] for row in body["citations"]]
    assert "organisation" in bands
    assert "pack" in bands
    assert bands.index("pack") > bands.index("organisation")
    assert all(band == "organisation" for band in bands[: bands.index("pack")])
    cited = {row["object_id"] for row in body["citations"]}
    assert "local-obj" not in cited
    assert "foreign-obj" not in cited
    assert "hidden-note" not in created.text
    pack = next(row for row in body["citations"] if row["object_id"] != "local-obj")
    education = db.execute(
        """
        SELECT o.id FROM context_objects o
        WHERE o.tenant_id = 'tenant-founder' AND o.source_kind = 'pack' AND o.source_id = 'education-demo'
        """
    ).fetchone()
    education_row = next(row for row in body["citations"] if row["object_id"] == education[0])
    assert education_row["band"] == "pack"
    inferred = db.execute(
        "SELECT id FROM context_objects WHERE source_id = 'inferred-note' AND tenant_id = 'tenant-founder'"
    ).fetchone()
    inferred_row = next(row for row in body["citations"] if row["object_id"] == inferred[0])
    assert inferred_row["band"] == "pack"
    assert body["citations"].index(inferred_row) > bands.index("pack") - 1 or inferred_row["band"] == "pack"
    org_positions = [index for index, band in enumerate(bands) if band == "organisation"]
    assert body["citations"].index(inferred_row) > max(org_positions)
    assert "scope" not in inspect.getsource(knowledge_layer.create_plan)

    db.execute(
        "UPDATE context_plan_citations SET band = NULL WHERE plan_id = ?",
        (body["id"],),
    )
    db.commit()
    again = client.get(f"/knowledge/plans/{body['id']}", headers=founder_headers)
    assert again.status_code == 200
    assert all(row["band"] == "pack" for row in again.json()["citations"])


def test_organisation_cap_omits_packs(client, founder_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute("DELETE FROM loop_stage_artifacts WHERE tenant_id = 'tenant-founder'")
    db.execute("DELETE FROM attachments WHERE tenant_id = 'tenant-founder'")
    _work_item(db, "work-cap", "tenant-founder")
    for index in range(40):
        _memory(db, f"org-{index}", "source", f"2020-01-01T00:{index:02d}:00Z")
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-cap"},
    )
    assert created.status_code == 200
    body = created.json()
    assert len(body["citations"]) == 40
    assert all(row["band"] == "organisation" for row in body["citations"])
    cited = [row["object_id"] for row in body["citations"]]
    kinds = db.execute(
        f"SELECT source_kind FROM context_objects WHERE id IN ({','.join('?' for _ in cited)})",
        cited,
    ).fetchall()
    assert all(kind[0] != "pack" for kind in kinds)


def _impact(db: sqlite3.Connection, observation_id: str, tenant_id: str, version_id: str, work_item_id: str, outcome: str, created_at: str) -> None:
    db.execute(
        """
        INSERT INTO context_impact_observations
          (id, tenant_id, version_id, work_item_id, outcome, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'principal-founder', ?)
        """,
        (observation_id, tenant_id, version_id, work_item_id, outcome, created_at),
    )


def test_pack_order_cites_impact_and_organisation_stays_ahead(client, founder_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    _work_item(db, "work-impact-order", "tenant-founder")
    _memory(db, "org-impact", "source", "2020-01-01T00:00:00Z")
    db.commit()

    listed = client.get("/registry/materials", headers=founder_headers)
    assert listed.status_code == 200

    def version_for(source_kind: str, source_id: str) -> str:
        row = db.execute(
            """
            SELECT v.id FROM context_objects o
            JOIN context_versions v ON v.object_id = o.id AND v.tenant_id = o.tenant_id
            WHERE o.tenant_id = 'tenant-founder' AND o.source_kind = ? AND o.source_id = ?
            """,
            (source_kind, source_id),
        ).fetchone()
        assert row is not None
        return row[0]

    org_version = version_for("memory", "org-impact")
    helped = version_for("pack", "education-demo")
    harmed = version_for("pack", "example-executable")
    unknown = version_for("pack", "example-skill")
    untouched = version_for("pack", "example-mcp")
    _impact(db, "org-harmed", "tenant-founder", org_version, "work-impact-order", "harmed", "2026-10-09T00:00:00Z")
    _impact(db, "pack-old-harm", "tenant-founder", helped, "work-impact-order", "harmed", "2020-01-01T00:00:00Z")
    _impact(db, "pack-new-help", "tenant-founder", helped, "work-impact-order", "helped", "2026-10-09T00:00:00Z")
    _impact(db, "pack-harmed", "tenant-founder", harmed, "work-impact-order", "harmed", "2026-10-09T00:00:00Z")
    _impact(db, "pack-unknown", "tenant-founder", unknown, "work-impact-order", "unknown", "2026-10-09T00:00:00Z")
    _impact(db, "other-helped", "tenant-other", untouched, "work-impact-order", "helped", "2026-10-09T00:00:00Z")
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-impact-order"},
    )
    assert created.status_code == 200
    body = created.json()
    assert "score" not in created.text
    assert "hidden-note" not in created.text
    citations = body["citations"]
    assert citations[0]["band"] == "organisation"
    assert citations[0]["version_id"] == org_version
    pack_ids = [row["version_id"] for row in citations if row["band"] == "pack"]
    assert pack_ids.index(helped) < pack_ids.index(unknown)
    assert pack_ids.index(unknown) < pack_ids.index(harmed)
    assert pack_ids.index(untouched) < pack_ids.index(harmed)
    assert pack_ids.index(helped) < pack_ids.index(untouched)
    assert all("score" not in row for row in citations)


def test_helped_pack_does_not_enter_a_full_organisation_cap(client, founder_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute("DELETE FROM loop_stage_artifacts WHERE tenant_id = 'tenant-founder'")
    db.execute("DELETE FROM attachments WHERE tenant_id = 'tenant-founder'")
    _work_item(db, "work-impact-cap", "tenant-founder")
    for index in range(40):
        _memory(db, f"cap-{index}", "source", f"2020-01-01T00:{index:02d}:00Z")
    db.commit()
    listed = client.get("/registry/materials", headers=founder_headers)
    assert listed.status_code == 200
    helped = db.execute(
        """
        SELECT v.id FROM context_objects o
        JOIN context_versions v ON v.object_id = o.id AND v.tenant_id = o.tenant_id
        WHERE o.tenant_id = 'tenant-founder' AND o.source_kind = 'pack' AND o.source_id = 'education-demo'
        """
    ).fetchone()
    assert helped is not None
    _impact(db, "cap-helped", "tenant-founder", helped[0], "work-impact-cap", "helped", "2026-10-09T00:00:00Z")
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-impact-cap"},
    )
    assert created.status_code == 200
    body = created.json()
    assert len(body["citations"]) == 40
    assert all(row["band"] == "organisation" for row in body["citations"])
    assert helped[0] not in {row["version_id"] for row in body["citations"]}


def test_resolve_payload_is_not_a_graph_copy(client, founder_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    _work_item(db, "work-resolve", "tenant-founder")
    _memory(db, "resolve-note", "source", "2020-01-01T00:00:00Z")
    db.commit()

    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-resolve"},
    )
    assert created.status_code == 200
    body = created.json()
    assert set(body) == {"id", "agent_principal_id", "work_item_id", "gap", "citations"}
    assert body["gap"] in (None, GAP)
    assert body["citations"]
    assert all(set(row) == {"object_id", "version_id", "band"} for row in body["citations"])
    text = created.text
    assert "hidden-note" not in text
    assert "score" not in text
    assert "locator" not in text
    assert "content" not in text
    assert "/tmp" not in text

    signals = client.get(f"/knowledge/plans/{body['id']}/signals", headers=founder_headers)
    assert signals.status_code == 200
    signal_body = signals.json()
    assert set(signal_body) == {"plan_id", "signals"}
    assert signal_body["signals"]
    for row in signal_body["signals"]:
        assert set(row) == {"version_id", "trust", "impact"}
        if row["trust"] is not None:
            assert set(row["trust"]) == {"verdict", "source"}
    signal_text = signals.text
    assert "hidden-note" not in signal_text
    assert "score" not in signal_text
    assert "locator" not in signal_text
    assert "content" not in signal_text

    listed = client.get("/knowledge", headers=founder_headers)
    assert listed.status_code == 200
    assert {row["path"] for row in listed.json()["resources"]} == {row["path"] for row in knowledge_layer.KNOWLEDGE_RESOURCES}


def test_plan_route_stays_out_of_the_worker():
    source = inspect.getsource(knowledge_layer)
    assert "maybe_emit" not in source
    assert "tenant-founder" not in source
    assert "principal-founder" not in source
    assert "_visible_to" not in source
    assert "run_engine_labs_stage_work" not in source
    assert "install_pack" not in source
    assert "activate_pack" not in source
