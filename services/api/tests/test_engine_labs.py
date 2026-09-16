from app.loop import LOOP_STAGES
from fastapi.testclient import TestClient


def test_readiness_and_first_project(client: TestClient, founder_headers: dict[str, str]) -> None:
    ready = client.get("/engine-labs/ready", headers=founder_headers)
    assert ready.status_code == 200
    body = ready.json()
    assert body["loop_ready"] is True
    assert body["first_project"] == "papership"
    assert body["mcg"] == "paused"
    assert body["quark"] == "separate"
    assert body["portability"] == "separate"
    assert body["execute_release"] is False
    assert body["hermes_write_accepted"] is False
    assert body["loop_stages"] == list(LOOP_STAGES)
    projects = client.get("/engine-labs/projects", headers=founder_headers)
    slugs = {row["slug"]: row for row in projects.json()["items"]}
    assert slugs["papership"]["status"] == "active"
    assert slugs["papership"]["kind"] == "self"
    assert slugs["mcg"]["status"] == "paused"
    assert "quark" not in slugs
    assert "portability" not in slugs


def test_create_and_walk_papership_job(client: TestClient, founder_headers: dict[str, str]) -> None:
    created = client.post(
        "/engine-labs/jobs",
        headers=founder_headers,
        json={"title": "Wire operator loop", "request": "Walk the Papership self-job on the ledger."},
    )
    assert created.status_code == 200
    job = created.json()
    assert job["status"] == "ready"
    assert job["project"]["slug"] == "papership"
    assert job["work_item"]["stage"] == "request"
    assert job["execute_release"] is False
    assert job["hermes_write_accepted"] is False
    started = client.post(f"/engine-labs/jobs/{job['id']}/start", headers=founder_headers)
    assert started.status_code == 200
    assert started.json()["status"] == "in_progress"
    for stage in LOOP_STAGES[1:]:
        stepped = client.post(
            f"/engine-labs/jobs/{job['id']}/stage",
            headers=founder_headers,
            json={"stage": stage, "evidence": f"el:{stage}"},
        )
        assert stepped.status_code == 200, stage
        assert stepped.json()["work_item"]["stage"] == stage
    closed = client.get(f"/engine-labs/jobs/{job['id']}", headers=founder_headers)
    assert closed.json()["status"] == "closed"
    assert closed.json()["work_item"]["stage"] == "retained_knowledge"
    refused = client.post(f"/engine-labs/jobs/{job['id']}/execute-release", headers=founder_headers)
    assert refused.status_code == 403


def test_mcg_and_quark_are_refused(client: TestClient, founder_headers: dict[str, str]) -> None:
    mcg = client.post(
        "/engine-labs/jobs",
        headers=founder_headers,
        json={"project": "mcg", "request": "Resume MCG inbound"},
    )
    assert mcg.status_code == 403
    assert "budget" in mcg.json()["detail"]
    quark = client.post(
        "/engine-labs/jobs",
        headers=founder_headers,
        json={"project": "quark", "request": "Start MVQ"},
    )
    assert quark.status_code == 403
    assert "separate" in quark.json()["detail"]
    unauth = client.post("/engine-labs/jobs", json={"request": "nope"})
    assert unauth.status_code == 401


def test_unpriv_cannot_create_job(client: TestClient, unpriv_headers: dict[str, str]) -> None:
    denied = client.post(
        "/engine-labs/jobs",
        headers=unpriv_headers,
        json={"request": "Should not create"},
    )
    assert denied.status_code == 403
