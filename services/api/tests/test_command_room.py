"""Paid operator seat, Hey Papership defaults, Hermes Host box, no Context Music."""

from fastapi.testclient import TestClient

from app.managed_projects import ALL_DOMAIN_IDS, ENGINE_LABS_JOB_PURPOSE, ENGINE_LABS_PROJECT_ID


def test_paid_operator_seat_has_all_domains(client: TestClient, founder_headers: dict[str, str]) -> None:
    response = client.get("/seats/operator", headers=founder_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["sku"] == "paid_operator"
    assert body["template"] == "founder"
    assert body["domain_count"] == 43
    assert body["domains"] == list(ALL_DOMAIN_IDS)
    assert "hey_papership" in body["products"]
    assert "workflows" in body["products"]
    assert "hermes_host" in body["products"]
    assert "engine_labs.loop" in body["products"]
    assert body["context_music"] is False
    assert body["quark"] is False
    assert body["portability"] is False
    assert "ledger.write" in body["grants"]
    assert "org.admin" in body["grants"]


def test_operator_template_can_start_loop(client: TestClient, founder_headers: dict[str, str]) -> None:
    assert client.post("/settings/oq-g2", headers=founder_headers).status_code == 200
    created = client.post(
        "/members/invites",
        headers=founder_headers,
        json={"template": "operator", "label": "solo-ops"},
    )
    assert created.status_code == 200
    grants = created.json()["grants"]
    assert "ledger.write" in grants
    assert "run.start" in grants
    assert "org.admin" not in grants
    assert "approval.billing" not in grants

    from tests.conftest import make_token

    headers = {"Authorization": f"Bearer {make_token(created.json()['principal_id'])}"}
    queued = client.post(
        f"/projects/{ENGINE_LABS_PROJECT_ID}/jobs",
        json={"title": "Operator loop", "purpose": ENGINE_LABS_JOB_PURPOSE},
        headers=headers,
    )
    assert queued.status_code == 202
    assert queued.json()["status"] in {"queued", "running"}
    assert queued.json()["hermes_write"] is False
    assert queued.json().get("current_artifact")


def test_hermes_host_is_probe_only(client: TestClient, founder_headers: dict[str, str]) -> None:
    response = client.get("/hermes/host", headers=founder_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["product"] == "Hermes Host"
    assert body["write_tools"] is False
    assert body["live_production_writes"] is False
    assert body["context_music"] is False
    assert body["status"] in {"reachable", "serve_ui", "unreachable", "not_configured", "error"}
    assert "message" in body


def test_assistant_defaults_to_hey_papership(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    created = client.post("/assistant/sessions", json={}, headers=founder_headers)
    assert created.status_code == 200
    assert created.json()["title"] == "Hey Papership"


def test_rate_card_names_paid_operator_and_hey_papership(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    card = client.get("/billing/rate-card", headers=founder_headers)
    assert card.status_code == 200
    plans = {row["id"]: row for row in card.json()["plans"]}
    assert "Hey Papership" in plans["free"]["note"]
    assert "Paid operator seat" in plans["pro"]["note"]
    assert "Context Music" not in plans["pro"]["note"]
