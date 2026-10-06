"""KL-P10: a loop stage cites the work item's context plan and version ids."""

from __future__ import annotations

import inspect
import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.managed_projects import ENGINE_LABS_PROJECT_ID
from app.store import Store


@pytest.fixture(autouse=True)
def _mock_loop_hermes_dispatch(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake(**kwargs: object) -> dict:
        return {
            "status": "accepted",
            "run_id": "run_test_lifecycle",
            "http_status": 202,
            "tool": "memory_read",
            "idempotency_key": "lifecycle",
            "summary": "Hermes accepted (test dispatch).",
            "body": {"id": "run_test_lifecycle", "status": "queued"},
        }

    monkeypatch.setattr("app.loop_hermes_bridge.dispatch_loop_stage", _fake)


def _start(client: TestClient, founder_headers: dict[str, str]) -> dict:
    created = client.post(
        f"/projects/{ENGINE_LABS_PROJECT_ID}/jobs",
        json={"title": "Lifecycle loop"},
        headers=founder_headers,
    )
    assert created.status_code == 202
    return created.json()


def _events(db: sqlite3.Connection, job_id: str) -> list[dict]:
    rows = db.execute(
        "SELECT payload FROM job_events WHERE job_id = ? AND type = 'loop.stage.artifact' ORDER BY id",
        (job_id,),
    ).fetchall()
    return [json.loads(row[0]) for row in rows]


def _attach_plan(db: sqlite3.Connection, work_item_id: str, plan_id: str, version_ids: list[str], tenant_id: str) -> None:
    db.execute(
        """
        INSERT INTO context_plans (id, tenant_id, agent_principal_id, work_item_id, gap, created_at)
        VALUES (?, ?, 'principal-agent', ?, NULL, '2026-10-06T00:00:00Z')
        """,
        (plan_id, tenant_id, work_item_id),
    )
    for index, version_id in enumerate(version_ids):
        db.execute(
            """
            INSERT INTO context_plan_citations
              (id, tenant_id, plan_id, object_id, version_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                f"{plan_id}-{index}",
                tenant_id,
                plan_id,
                f"obj-{index}",
                version_id,
                f"2026-10-06T00:00:{index:02d}Z",
            ),
        )
    if tenant_id == "tenant-founder":
        db.execute(
            "UPDATE work_items SET context_plan_id = ? WHERE id = ?",
            (plan_id, work_item_id),
        )
    db.commit()


def test_stage_without_a_plan_cites_none(
    client: TestClient, founder_headers: dict[str, str], tmp_path: Path
) -> None:
    body = _start(client, founder_headers)
    assert body["current_artifact"]["context_plan_id"] is None
    assert body["current_artifact"]["version_ids"] == []
    work = client.get(f"/work-items/{body['work_item_id']}", headers=founder_headers)
    assert work.status_code == 200
    assert work.json()["current_artifact"]["context_plan_id"] is None
    assert work.json()["current_artifact"]["version_ids"] == []
    db = sqlite3.connect(tmp_path / "store.sqlite")
    payload = _events(db, body["id"])[-1]
    assert payload["context_plan_id"] is None
    assert payload["version_ids"] == []
    assert "content" not in payload
    assert "body" not in payload
    assert "body_markdown" not in payload
    assert "path" not in payload


def test_stage_cites_the_work_item_plan(
    client: TestClient, founder_headers: dict[str, str], tmp_path: Path
) -> None:
    body = _start(client, founder_headers)
    db = sqlite3.connect(tmp_path / "store.sqlite")
    _attach_plan(db, body["work_item_id"], "plan-live", ["ver-a", "ver-b"], "tenant-founder")
    advanced = client.post(
        f"/work-items/{body['work_item_id']}/stage",
        json={"stage": "research", "evidence": "lifecycle.research"},
        headers=founder_headers,
    )
    assert advanced.status_code == 200
    artifact = advanced.json()["current_artifact"]
    assert artifact["context_plan_id"] == "plan-live"
    assert artifact["version_ids"] == ["ver-a", "ver-b"]
    assert artifact["body_markdown"]
    assert "ver-a" not in artifact["body_markdown"]
    payload = _events(db, body["id"])[-1]
    assert payload["stage"] == "research"
    assert payload["context_plan_id"] == "plan-live"
    assert payload["version_ids"] == ["ver-a", "ver-b"]
    assert "content" not in payload
    assert "body" not in payload
    assert "body_markdown" not in payload
    assert "path" not in payload


def test_stage_caps_version_ids(
    client: TestClient, founder_headers: dict[str, str], tmp_path: Path
) -> None:
    body = _start(client, founder_headers)
    db = sqlite3.connect(tmp_path / "store.sqlite")
    versions = [f"ver-{index:02d}" for index in range(41)]
    _attach_plan(db, body["work_item_id"], "plan-cap", versions, "tenant-founder")
    advanced = client.post(
        f"/work-items/{body['work_item_id']}/stage",
        json={"stage": "research", "evidence": "lifecycle.cap"},
        headers=founder_headers,
    )
    assert advanced.status_code == 200
    cited = advanced.json()["current_artifact"]["version_ids"]
    assert cited == versions[:40]
    assert _events(db, body["id"])[-1]["version_ids"] == versions[:40]


def test_other_tenant_plan_is_not_cited(
    client: TestClient, founder_headers: dict[str, str], tmp_path: Path
) -> None:
    body = _start(client, founder_headers)
    db = sqlite3.connect(tmp_path / "store.sqlite")
    _attach_plan(db, body["work_item_id"], "plan-other", ["ver-secret"], "tenant-other")
    db.execute(
        "UPDATE work_items SET context_plan_id = ? WHERE id = ?",
        ("plan-other", body["work_item_id"]),
    )
    db.commit()
    advanced = client.post(
        f"/work-items/{body['work_item_id']}/stage",
        json={"stage": "research", "evidence": "lifecycle.other"},
        headers=founder_headers,
    )
    assert advanced.status_code == 200
    artifact = advanced.json()["current_artifact"]
    assert artifact["context_plan_id"] is None
    assert artifact["version_ids"] == []
    payload = _events(db, body["id"])[-1]
    assert payload["context_plan_id"] is None
    assert payload["version_ids"] == []
    assert "ver-secret" not in json.dumps(payload)


def test_citation_lookup_does_not_read_schedules_or_call_hermes() -> None:
    source = inspect.getsource(Store.lifecycle_citation)
    assert "schedules" not in source
    assert "strategy_records" not in source
    assert "dispatch_loop_stage" not in source
    assert "hermes" not in source.lower()
    writer = inspect.getsource(Store.run_engine_labs_stage_work)
    assert "lifecycle_citation" in writer
