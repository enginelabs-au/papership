from datetime import datetime, timezone

from fastapi.testclient import TestClient

from tests.conftest import make_token


def test_packs_list_and_unknown(client: TestClient, founder_headers: dict[str, str]) -> None:
    listing = client.get("/packs", headers=founder_headers)
    assert listing.status_code == 200
    ids = {row["id"] for row in listing.json()["items"]}
    assert {"education-demo", "example-executable"} <= ids
    assert listing.json()["execution_enabled"] is False
    assert all(row["kind"] in {"declarative", "executable"} for row in listing.json()["items"])
    assert all(row["execution"] == "denied" for row in listing.json()["items"])
    unknown = client.get("/packs/not-a-pack", headers=founder_headers)
    assert unknown.status_code == 404


def test_install_creates_pending_trust_and_is_not_a_grant(
    client: TestClient, founder_headers: dict[str, str], unpriv_headers: dict[str, str]
) -> None:
    denied = client.post("/packs/install", json={"pack_id": "education-demo"}, headers=unpriv_headers)
    assert denied.status_code == 403
    installed = client.post("/packs/install", json={"pack_id": "education-demo"}, headers=founder_headers)
    assert installed.status_code == 200
    body = installed.json()
    assert body["installed"] is True
    assert body["trust_verdict"] == "pending"
    assert body["executable"] is False
    still_denied = client.get("/records", headers=unpriv_headers)
    assert still_denied.status_code == 403
    grants = client.get("/people", headers=unpriv_headers)
    assert grants.status_code == 403


def test_activate_stays_denied_even_after_trust(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    client.post("/packs/install", json={"pack_id": "example-executable"}, headers=founder_headers)
    client.post(
        "/packs/example-executable/trust",
        json={"verdict": "accepted"},
        headers=founder_headers,
    )
    activated = client.post("/packs/example-executable/activate", headers=founder_headers)
    assert activated.status_code == 403
    declarative = client.post("/packs/install", json={"pack_id": "education-demo"}, headers=founder_headers)
    assert declarative.status_code == 200
    client.post("/packs/education-demo/trust", json={"verdict": "accepted"}, headers=founder_headers)
    still = client.post("/packs/education-demo/activate", headers=founder_headers)
    assert still.status_code == 403


def test_custom_field_tenant_scoped(client: TestClient, founder_headers: dict[str, str]) -> None:
    client.post("/packs/install", json={"pack_id": "education-demo"}, headers=founder_headers)
    created = client.post(
        "/packs/education-demo/custom-fields",
        json={"field_id": "enrolment_ref", "field_type": "string"},
        headers=founder_headers,
    )
    assert created.status_code == 200
    fields = created.json()["tenant_custom_fields"]
    assert any(row["field_id"] == "enrolment_ref" for row in fields)


def test_r4_shells_deny_live_write(client: TestClient, founder_headers: dict[str, str]) -> None:
    catalogue = client.get("/domains/catalogue", headers=founder_headers)
    ids = {row["id"] for row in catalogue.json()["items"]}
    assert {"B14", "B19", "B20", "B21", "B24"} <= ids
    assert len(catalogue.json()["items"]) == 43
    assert all(row["live_write"] is False for row in catalogue.json()["items"])
    refused = client.post("/domains/B14/connect", headers=founder_headers)
    assert refused.status_code == 403


def test_payment_proposal_requires_reauth_and_never_pays(
    client: TestClient, founder_headers: dict[str, str], unpriv_headers: dict[str, str]
) -> None:
    created = client.post(
        "/payments/proposals",
        json={"payee_label": "Test payee", "amount_entered": "12.50", "currency": "AUD"},
        headers=founder_headers,
    )
    assert created.status_code == 200
    assert created.json()["payout"] is False
    assert created.json()["status"] == "draft"
    proposal_id = created.json()["id"]
    missing = client.post(f"/payments/proposals/{proposal_id}/approve", headers=founder_headers)
    assert missing.status_code == 401
    unpriv = client.post(
        f"/payments/proposals/{proposal_id}/approve",
        headers={
            "Authorization": f"Bearer {make_token('principal-unpriv', extra={'reauth_at': datetime.now(timezone.utc).timestamp()})}"
        },
    )
    assert unpriv.status_code == 403
    approved = client.post(
        f"/payments/proposals/{proposal_id}/approve",
        headers={
            "Authorization": f"Bearer {make_token('principal-founder', extra={'reauth_at': datetime.now(timezone.utc).timestamp()})}"
        },
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["payout"] is False
    listed = client.get("/payments/proposals", headers=founder_headers)
    assert listed.json()["payout"] is False


def test_bank_details_need_reauth(client: TestClient, founder_headers: dict[str, str]) -> None:
    missing = client.post("/payments/bank-details", json={"note": "update"}, headers=founder_headers)
    assert missing.status_code == 401
    ok = client.post(
        "/payments/bank-details",
        json={"note": "update"},
        headers={
            "Authorization": f"Bearer {make_token('principal-founder', extra={'reauth_at': datetime.now(timezone.utc).timestamp()})}"
        },
    )
    assert ok.status_code == 200
    assert ok.json()["provider_write"] is False


def test_field_evidence_idempotent_and_dispatch_unavailable(
    client: TestClient, founder_headers: dict[str, str]
) -> None:
    first = client.post(
        "/field-evidence",
        json={"idempotency_key": "ev-1", "label": "site photo", "captured_offline": True},
        headers=founder_headers,
    )
    assert first.status_code == 200
    replay = client.post(
        "/field-evidence",
        json={"idempotency_key": "ev-1", "label": "site photo", "captured_offline": True},
        headers=founder_headers,
    )
    assert replay.status_code == 200
    assert replay.json()["id"] == first.json()["id"]
    assert replay.json()["replayed"] is True
    dispatch = client.post("/field-evidence/dispatch", json={"order_id": "x"}, headers=founder_headers)
    assert dispatch.status_code == 403
    assert "unavailable" in dispatch.json()["detail"]


def test_erasure_records_intent_and_never_destroys(
    client: TestClient, founder_headers: dict[str, str], unpriv_headers: dict[str, str]
) -> None:
    denied = client.post(
        "/erasure/request",
        json={"confirmations": ["erase", "tenant", "irreversible"]},
        headers=unpriv_headers,
    )
    assert denied.status_code in {401, 403}
    missing = client.post(
        "/erasure/request",
        json={"confirmations": ["erase", "tenant", "irreversible"]},
        headers=founder_headers,
    )
    assert missing.status_code == 401
    incomplete = client.post(
        "/erasure/request",
        json={"confirmations": ["erase"]},
        headers={
            "Authorization": f"Bearer {make_token('principal-founder', extra={'reauth_at': datetime.now(timezone.utc).timestamp()})}"
        },
    )
    assert incomplete.status_code == 400
    recorded = client.post(
        "/erasure/request",
        json={"confirmations": ["erase", "tenant", "irreversible"]},
        headers={
            "Authorization": f"Bearer {make_token('principal-founder', extra={'reauth_at': datetime.now(timezone.utc).timestamp()})}"
        },
    )
    assert recorded.status_code == 200
    assert recorded.json()["destroyed"] is False
    assert recorded.json()["status"] == "recorded"
    status = client.get("/erasure/status", headers=founder_headers)
    assert status.status_code == 200
    assert status.json()["destroyed"] is False
    assert status.json()["status"] == "recorded"


def test_phase7_responses_have_no_prices(client: TestClient, founder_headers: dict[str, str]) -> None:
    blob = ""
    for path in ("/packs", "/domains/catalogue", "/payments/proposals", "/field-evidence", "/allowances/me", "/erasure/status"):
        blob += str(client.get(path, headers=founder_headers).json())
    assert "$" not in blob
    assert "184640" not in blob
