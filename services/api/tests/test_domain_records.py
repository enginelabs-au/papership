from tests.conftest import make_token


def _unpriv() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token('principal-unpriv')}"}


def test_native_draft_is_stored_and_source_stays_unavailable(client, founder_headers) -> None:
    created = client.post(
        "/domains/B04/records",
        headers=founder_headers,
        json={"kind": "contact_draft", "title": "Northwind"},
    )
    assert created.status_code == 200
    assert created.json()["source_status"] == "native"
    listing = client.get("/domains/B04/records", headers=founder_headers)
    assert listing.status_code == 200
    assert listing.json()["source_status"] == "unavailable"
    assert listing.json()["live_write"] is False
    assert any(row["title"] == "Northwind" for row in listing.json()["items"])
    refused = client.post(
        "/domains/B04/records",
        headers=founder_headers,
        json={"kind": "opportunity_stage", "title": "Won"},
    )
    assert refused.status_code == 403
    assert client.post("/domains/B04/connect", headers=founder_headers).status_code == 403


def test_publish_and_signature_wait_for_a_person(client, founder_headers) -> None:
    publish = client.post(
        "/domains/B16/records",
        headers=founder_headers,
        json={"kind": "publish", "title": "Autumn note"},
    )
    assert publish.status_code == 200
    assert publish.json()["status"] == "pending_approval"
    signature = client.post(
        "/domains/B05/records",
        headers=founder_headers,
        json={"kind": "signature_request", "title": "Service agreement"},
    )
    assert signature.json()["status"] == "pending_approval"


def test_accounting_refuses_invented_amounts(client, founder_headers) -> None:
    draft = client.post(
        "/domains/B13/records",
        headers=founder_headers,
        json={"kind": "invoice_draft", "title": "October"},
    )
    assert draft.status_code == 200
    refused = client.post(
        "/domains/B13/records",
        headers=founder_headers,
        json={"kind": "invoice_draft", "title": "October", "amount": "10"},
    )
    assert refused.status_code == 422
    listing = client.get("/domains/B13/records", headers=founder_headers)
    assert listing.json()["balances"] == "not_captured"


def test_boundary_returns_names_only(client, founder_headers) -> None:
    body = client.get("/boundaries", headers=founder_headers)
    assert body.status_code == 200
    assert body.json()["secret_values_returned"] is False
    assert "HERMES_API_SERVER_KEY" in body.json()["credential_names"]
    assert client.post(
        "/domains/P12/records",
        headers=founder_headers,
        json={"kind": "reveal_secret", "title": "key"},
    ).status_code == 403
    assert client.get("/boundaries", headers=_unpriv()).status_code == 403


def test_metric_is_an_enum(client, founder_headers) -> None:
    ok = client.post(
        "/domains/P14/records",
        headers=founder_headers,
        json={"kind": "task_completion", "title": "Loop", "body": "not_captured"},
    )
    assert ok.status_code == 200
    bad = client.post(
        "/domains/P14/records",
        headers=founder_headers,
        json={"kind": "task_completion", "title": "Loop", "body": "about 40 hours"},
    )
    assert bad.status_code == 422


def test_knowledge_search_finds_a_document(client, founder_headers) -> None:
    client.post(
        "/domains/B11/records",
        headers=founder_headers,
        json={"kind": "document", "title": "Engine service manual"},
    )
    found = client.get("/knowledge/search", headers=founder_headers, params={"q": "service manual"})
    assert found.status_code == 200
    assert any(row["title"] == "Engine service manual" for row in found.json()["items"])


def test_catalogue_marks_previously_planned_rows_configured(client, founder_headers) -> None:
    catalogue = client.get("/domains/catalogue", headers=founder_headers)
    by_id = {row["id"]: row for row in catalogue.json()["items"]}
    for domain_id in ("B04", "B08", "B11", "P01", "P04", "P12", "P14"):
        assert by_id[domain_id]["status"] == "configured"
        assert by_id[domain_id]["live_write"] is False
    assert client.post(
        "/domains/B09/records",
        headers=_unpriv(),
        json={"kind": "work_order", "title": "Queue"},
    ).status_code == 403
