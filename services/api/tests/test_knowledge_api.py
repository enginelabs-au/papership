from __future__ import annotations

import inspect
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt

from app import knowledge_layer
from app.config import TEST_JWT_SECRET_VALUE

DOC = Path(__file__).resolve().parents[3] / "docs" / "knowledge-layer" / "KNOWLEDGE_API.md"
WEB = Path(__file__).resolve().parents[3] / "apps" / "web" / "src"


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


def _documented_routes() -> list[tuple[str, str]]:
    routes = []
    for line in DOC.read_text().splitlines():
        parts = line.strip().split()
        if len(parts) == 2 and parts[0] in {"GET", "POST"} and parts[1].startswith("/"):
            routes.append((parts[0], parts[1]))
    return routes


def test_index_matches_the_documented_routes(client, founder_headers, unpriv_headers):
    assert client.get("/knowledge", headers=unpriv_headers).status_code == 403

    listed = client.get("/knowledge", headers=founder_headers)
    assert listed.status_code == 200
    body = listed.json()
    assert "resources" in body
    assert "citations" not in listed.text
    assert "score" not in listed.text
    assert "content" not in listed.text
    pairs = {(row["method"], row["path"]) for row in body["resources"]}
    documented = set(_documented_routes())
    assert pairs == documented
    assert {row["path"] for row in body["resources"] if row["human_writer"]} == {
        "/knowledge/trust",
        "/knowledge/impact",
    }
    source = inspect.getsource(knowledge_layer)
    for method, path in documented:
        assert f'@app.{method.lower()}("{path}")' in source


def test_agent_can_read_signals_and_cannot_write_them(client, founder_headers, tmp_path: Path):
    db = sqlite3.connect(tmp_path / "store.sqlite")
    db.execute(
        """
        INSERT INTO work_items
          (id, tenant_id, title, stage, stage_changed_at, created_at, updated_at)
        VALUES ('work-api', 'tenant-founder', 'API task', 'request', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z')
        """
    )
    db.commit()
    created = client.post(
        "/knowledge/plans",
        headers=founder_headers,
        json={"agent_principal_id": "principal-agent", "work_item_id": "work-api"},
    )
    assert created.status_code == 200
    plan_id = created.json()["id"]
    version_id = created.json()["citations"][0]["version_id"]

    granted = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-agent", "grant_class": "memory.read"},
    )
    assert granted.status_code == 200
    agent_headers = {"Authorization": f"Bearer {_token('principal-agent')}"}
    signals = client.get(f"/knowledge/plans/{plan_id}/signals", headers=agent_headers)
    assert signals.status_code == 200
    assert signals.json()["plan_id"] == plan_id
    assert client.post(
        "/knowledge/trust",
        headers=agent_headers,
        json={"version_id": version_id, "verdict": "accepted"},
    ).status_code == 403
    assert client.post(
        "/knowledge/impact",
        headers=agent_headers,
        json={"version_id": version_id, "work_item_id": "work-api", "outcome": "helped"},
    ).status_code == 403

    other = client.post(
        "/grants",
        headers=founder_headers,
        json={"principal_id": "principal-other", "grant_class": "org.admin"},
    )
    assert other.status_code == 200
    other_headers = {"Authorization": f"Bearer {_token('principal-other')}"}
    assert client.get(f"/knowledge/plans/{plan_id}", headers=other_headers).status_code == 404
    assert client.get(f"/knowledge/plans/{plan_id}/signals", headers=other_headers).status_code == 404


def test_workspace_fetches_index_paths_and_routes_stay_local():
    app = (WEB / "blueprint2" / "App.jsx").read_text()
    overlay = (WEB / "api" / "papership.js").read_text()
    assert "/knowledge/objects/" in app
    assert "/knowledge/plans/" in app
    assert "/signals" in app
    assert "/knowledge/objects" in overlay
    assert "/registry/materials" in overlay
    source = inspect.getsource(knowledge_layer)
    assert "maybe_emit" not in source
    assert "tenant-founder" not in source
    assert "principal-founder" not in source
    assert "run_engine_labs_stage_work" not in source
