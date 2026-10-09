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


def test_materials_are_tenant_scoped_and_leave_the_catalogue(client, founder_headers, unpriv_headers, tmp_path: Path):
    denied = client.get("/registry/materials", headers=unpriv_headers)
    assert denied.status_code == 403

    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute(
        """
        INSERT INTO loop_stage_artifacts (
          id, tenant_id, work_item_id, job_id, stage, artifact_type, title,
          body_markdown, ledger_path, meta_json, memory_item_id, created_at
        ) VALUES (
          'art-founder', 'tenant-founder', 'work-1', 'job-1', 'research', 'note', 'Founder note',
          'do-not-copy-body', 'ledger/art-founder.md', '{}', 'mem-1', '2026-10-06T00:00:00Z'
        )
        """
    )
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

    listed = client.get("/registry/materials", headers=founder_headers)
    assert listed.status_code == 200
    materials = listed.json()["materials"]
    locators = {row["locator"] for row in materials}
    assert "education-demo" in locators
    assert "example-executable" in locators
    assert "ledger/art-founder.md" in locators
    assert "B01.01" not in locators
    packs = [row for row in materials if row["locator"] == "education-demo"]
    assert packs[0]["class"] == "inferred"
    assert packs[0]["object_id"] == packs[0]["id"]
    assert all(row["class"] == "inferred" for row in materials if row["kind"] == "pack")
    assert "secret-body" not in listed.text
    assert "do-not-copy-body" not in listed.text
    assert "content" not in listed.text
    assert "price" not in listed.text
    assert db.execute("SELECT COUNT(*) FROM registry").fetchone()[0] == 43
    assert all(row[0] is None for row in db.execute("SELECT context_plan_id FROM work_items"))

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert granted.status_code == 200
    other = client.get(
        "/registry/materials",
        headers={"Authorization": f"Bearer {_token('principal-other')}"},
    )
    assert other.status_code == 200
    assert "ledger/art-founder.md" not in {row["locator"] for row in other.json()["materials"]}
    assert "education-demo" in {row["locator"] for row in other.json()["materials"]}
    assert "example-skill" in {row["locator"] for row in other.json()["materials"]}


def test_example_pointers_are_listed_and_not_installable(client, founder_headers, tmp_path: Path):
    listed = client.get("/registry/materials", headers=founder_headers)
    assert listed.status_code == 200
    materials = {row["locator"]: row for row in listed.json()["materials"]}
    assert materials["example-skill"]["title"] == "Example skill"
    assert materials["example-mcp"]["title"] == "Example MCP server"
    assert materials["example-skill"]["class"] == "inferred"
    assert materials["example-mcp"]["kind"] == "pack"
    assert "SKILL.md" not in listed.text
    assert "/" not in materials["example-skill"]["locator"]
    assert "/" not in materials["example-mcp"]["locator"]

    packs = client.get("/packs", headers=founder_headers)
    assert packs.status_code == 200
    ids = {row["id"] for row in packs.json()["items"]}
    assert ids == {"education-demo", "example-executable"}
    assert "example-skill" not in ids

    for pack_id in ("example-skill", "example-mcp"):
        denied = client.post("/packs/install", headers=founder_headers, json={"pack_id": pack_id})
        assert denied.status_code == 404

    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute(
        """
        INSERT INTO work_items
          (id, tenant_id, title, stage, stage_changed_at, created_at, updated_at)
        VALUES ('work-example', 'tenant-founder', 'Examples', 'request', '2026-10-09T00:00:00Z', '2026-10-09T00:00:00Z', '2026-10-09T00:00:00Z')
        """
    )
    db.commit()
    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-example"},
    )
    assert created.status_code == 200
    cited = next(row for row in created.json()["citations"] if row["object_id"] == materials["example-skill"]["object_id"])
    assert cited["band"] == "pack"
    assert "SKILL.md" not in created.text


def test_material_route_does_not_install_or_hardcode_tenant():
    source = inspect.getsource(knowledge_layer)
    assert "install_pack" not in source
    assert "activate_pack" not in source
    assert "maybe_emit" not in source
    assert "tenant-founder" not in source
    assert "principal-founder" not in source
    assert "_visible_to" not in source
