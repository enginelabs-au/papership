"""Engine Labs managed project + loop job wiring (P-009 increment)."""

import pytest
from fastapi.testclient import TestClient

from app.loop import LOOP_STAGES
from app.managed_projects import (
    ALL_DOMAIN_IDS,
    ENGINE_LABS_JOB_PURPOSE,
    ENGINE_LABS_PROJECT_ID,
    ENGINE_LABS_PROJECT_NAME,
)


@pytest.fixture(autouse=True)
def _mock_loop_hermes_dispatch(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake(**kwargs: object) -> dict:
        job_id = str(kwargs.get("job_id") or "job")
        stage = str(kwargs.get("stage") or "request")
        work_item_id = str(kwargs.get("work_item_id") or "wi")
        run_id = f"run_test_{job_id}_{stage}"
        return {
            "status": "accepted",
            "run_id": run_id,
            "http_status": 202,
            "tool": "memory_read",
            "idempotency_key": f"{job_id}:{stage}:{work_item_id}",
            "summary": "Hermes accepted (test dispatch).",
            "body": {"id": run_id, "status": "queued"},
        }

    monkeypatch.setattr("app.loop_hermes_bridge.dispatch_loop_stage", _fake)


def test_full_domain_catalogue_is_43(client: TestClient, founder_headers: dict[str, str]) -> None:
    catalogue = client.get("/domains/catalogue", headers=founder_headers)
    assert catalogue.status_code == 200
    body = catalogue.json()
    assert body["count"] == 43
    assert body["first_managed_project_id"] == ENGINE_LABS_PROJECT_ID
    assert body["live_write"] is False
    ids = [row["id"] for row in body["items"]]
    assert ids == list(ALL_DOMAIN_IDS)
    assert all(row["live_write"] is False for row in body["items"])


def test_loop_caps_configured_not_working(client: TestClient, founder_headers: dict[str, str]) -> None:
    registry = client.get("/registry", headers=founder_headers)
    assert registry.status_code == 200
    assert registry.json()["first_managed_project_id"] == ENGINE_LABS_PROJECT_ID
    by_id = {row["capability_id"]: row for row in registry.json()["items"]}
    for cap_id in ("B08.01", "P01.01", "P04.01"):
        assert by_id[cap_id]["implementation_status"] == "configured"
        assert by_id[cap_id]["implementation_status"] != "working"


def test_managed_project_seeded(client: TestClient, founder_headers: dict[str, str]) -> None:
    listing = client.get("/projects", headers=founder_headers)
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert any(row["id"] == ENGINE_LABS_PROJECT_ID for row in items)
    detail = client.get(f"/projects/{ENGINE_LABS_PROJECT_ID}", headers=founder_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["name"] == ENGINE_LABS_PROJECT_NAME
    assert body["bound_repo"] == "enginelabs-au/papership"
    assert body["loop_stages"] == list(LOOP_STAGES)
    assert body["job_purpose"] == ENGINE_LABS_JOB_PURPOSE
    assert body["live_github_open"] is False
    assert body["hermes_write"] is False


def test_start_engine_labs_job_queues_with_work_item(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    created = client.post(
        f"/projects/{ENGINE_LABS_PROJECT_ID}/jobs",
        json={"title": "First Engine Labs loop"},
        headers=founder_headers,
    )
    assert created.status_code == 202
    body = created.json()
    assert body["status"] in {"queued", "running"}
    assert body["purpose"] == ENGINE_LABS_JOB_PURPOSE
    assert body["project_id"] == ENGINE_LABS_PROJECT_ID
    assert body["work_item_id"]
    assert body["stage"] == "request"
    assert body["live_github_open"] is False
    assert body["hermes_write"] is False
    assert body.get("current_artifact")
    assert body["current_artifact"]["stage"] == "request"
    assert body["current_artifact"]["body_markdown"]
    assert body["current_artifact"]["meta"]["hermes_run_id"]

    job = client.get(f"/jobs/{body['id']}", headers=founder_headers)
    assert job.status_code == 200
    assert job.json()["status"] == "running"
    assert job.json()["project_id"] == ENGINE_LABS_PROJECT_ID
    assert job.json()["work_item_id"] == body["work_item_id"]
    assert job.json()["run"]["purpose"] == ENGINE_LABS_JOB_PURPOSE

    work = client.get(f"/work-items/{body['work_item_id']}", headers=founder_headers)
    assert work.status_code == 200
    assert work.json()["stage"] == "request"
    assert work.json()["project_id"] == ENGINE_LABS_PROJECT_ID
    assert work.json()["job_id"] == body["id"]
    assert len(work.json()["loop"]) >= 1
    assert work.json()["current_artifact"]["artifact_type"] == "intake_brief"
    assert len(work.json()["artifacts"]) >= 1

    detail = client.get(f"/projects/{ENGINE_LABS_PROJECT_ID}", headers=founder_headers)
    assert detail.status_code == 200
    latest = detail.json()["jobs"][0]
    assert latest["id"] == body["id"]
    assert latest["stage"] == "request"

    advanced = client.post(
        f"/work-items/{body['work_item_id']}/stage",
        json={"stage": "research", "evidence": "founder.advance.research"},
        headers=founder_headers,
    )
    assert advanced.status_code == 200
    assert advanced.json()["stage"] == "research"
    assert advanced.json()["current_artifact"]["stage"] == "research"
    assert advanced.json()["current_artifact"]["artifact_type"] == "research_brief"

    detail2 = client.get(f"/projects/{ENGINE_LABS_PROJECT_ID}", headers=founder_headers)
    assert detail2.json()["jobs"][0]["stage"] == "research"


def test_post_jobs_routes_engine_labs_purpose(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    created = client.post(
        "/jobs",
        json={"purpose": ENGINE_LABS_JOB_PURPOSE, "title": "Via /jobs"},
        headers=founder_headers,
    )
    assert created.status_code == 202
    body = created.json()
    assert body["purpose"] == ENGINE_LABS_JOB_PURPOSE
    assert body["status"] in {"queued", "running"}
    assert body.get("current_artifact")
    assert body["project_id"] == ENGINE_LABS_PROJECT_ID


def test_unknown_project_rejected(client: TestClient, founder_headers: dict[str, str]) -> None:
    response = client.post(
        "/projects/proj-missing/jobs",
        json={"title": "Nope"},
        headers=founder_headers,
    )
    assert response.status_code == 404


def test_unpriv_cannot_start_engine_labs_job(
    client: TestClient, unpriv_headers: dict[str, str]
) -> None:
    response = client.post(
        f"/projects/{ENGINE_LABS_PROJECT_ID}/jobs",
        json={"title": "Denied"},
        headers=unpriv_headers,
    )
    assert response.status_code == 403
