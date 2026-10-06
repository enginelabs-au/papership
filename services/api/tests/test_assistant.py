from fastapi.testclient import TestClient


def test_assistant_persists_without_inventing_reply(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    created = client.post("/assistant/sessions", json={"title": "Hey Papership", "mode": "Ask"}, headers=founder_headers)
    assert created.status_code == 200
    sid = created.json()["id"]
    turn = client.post(
        f"/assistant/sessions/{sid}/turns",
        json={"content": "What is the loop status?"},
        headers=founder_headers,
    )
    assert turn.status_code == 200
    body = turn.json()
    assert body["user"]["content"] == "What is the loop status?"
    assert body["reply"]["role"] == "system"
    assert "saved" in body["reply"]["content"].lower()
    assert body["runtime"]["status"] == "blocked_runtime"
    listed = client.get(f"/assistant/sessions/{sid}", headers=founder_headers)
    assert len(listed.json()["messages"]) == 2


def test_runs_persist_before_runtime(client: TestClient, founder_headers: dict[str, str]) -> None:
    first = client.post("/runs", json={"purpose": "loop", "idempotency_key": "k1"}, headers=founder_headers)
    second = client.post("/runs", json={"purpose": "loop", "idempotency_key": "k1"}, headers=founder_headers)
    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["job"]["id"] != second.json()["job"]["id"]
    assert first.json()["runtime"]["status"] == "blocked_runtime"
