from app.capability_registry import load_capability_rows, parse_capabilities_markdown
from app.store import CAPABILITY_IDS
from fastapi.testclient import TestClient


def test_capabilities_markdown_has_exactly_43_rows() -> None:
    rows = load_capability_rows()
    assert [row["capability_id"] for row in rows] == CAPABILITY_IDS
    assert not any(row["implementation_status"] == "working" for row in rows)
    statuses = {row["capability_id"]: row["implementation_status"] for row in rows}
    assert statuses["B08.01"] == "configured"
    assert statuses["B04.01"] == "planned"


def test_parser_rejects_wrong_count() -> None:
    try:
        parse_capabilities_markdown("| B01 | B01.01 | outcome | native | r | w | native | g | d | i | 07 | planned | n/a | 0 | t | e |\n")
    except ValueError as exc:
        assert "missing rows" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_registry_serves_documented_statuses(client: TestClient, founder_headers: dict[str, str]) -> None:
    response = client.get("/registry", headers=founder_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 43
    assert body["loop_stages"][0] == "request"
    assert body["loop_stages"][-1] == "retained_knowledge"
    by_id = {row["capability_id"]: row for row in body["items"]}
    assert by_id["B08.01"]["implementation_status"] == "configured"
    assert by_id["B08.01"]["user_outcome"].startswith("Founder completes request")
    assert "working" not in {row["implementation_status"] for row in body["items"]}
    catalogue = client.get("/domains/catalogue", headers=founder_headers)
    assert catalogue.status_code == 200
    items = catalogue.json()["items"]
    assert len(items) == 43
    assert {row["id"] for row in items} == {cap.split(".")[0] for cap in CAPABILITY_IDS}
    assert all(row["live_write"] is False for row in items)
    b08 = next(row for row in items if row["id"] == "B08")
    assert b08["status"] == "configured"
    assert b08["needs_connection"] is True
