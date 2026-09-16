from app.memory_ops import scan_credentials
from app.store import StoreError
from app.view_defs import FALLBACK, STABLE_CHROME, validate_view_definition
from tests.conftest import make_token


def _invite(client, founder_headers, template: str) -> dict:
    client.post("/settings/oq-g2", headers=founder_headers)
    created = client.post(
        "/members/invites",
        headers=founder_headers,
        json={"template": template, "label": template},
    )
    assert created.status_code == 200
    return created.json()


def _headers(principal_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(principal_id)}"}


def test_memory_eight_operations_and_credential_scan(client, founder_headers) -> None:
    created = client.post(
        "/memory",
        headers=founder_headers,
        json={"title": "Source note", "kind": "projects", "class": "source", "content": "loop decision"},
    )
    assert created.status_code == 200
    source_id = created.json()["id"]
    inspect = client.get(f"/memory/{source_id}", headers=founder_headers)
    assert inspect.status_code == 200
    assert inspect.json()["provenance"]["owner"] == "principal-founder"
    search = client.get("/memory", headers=founder_headers, params={"q": "loop"})
    assert search.status_code == 200
    assert any(row["id"] == source_id for row in search.json()["items"])
    corrected = client.post(
        f"/memory/{source_id}/correct",
        headers=founder_headers,
        json={"content": "loop decision v2"},
    )
    assert corrected.status_code == 200
    assert corrected.json()["version"] == 2
    other = client.post(
        "/memory",
        headers=founder_headers,
        json={"title": "Second", "kind": "projects", "class": "source", "content": "pair"},
    ).json()
    merged = client.post(
        "/memory/merge",
        headers=founder_headers,
        json={"left_id": source_id, "right_id": other["id"]},
    )
    assert merged.status_code == 200
    assert merged.json()["content_class"] == "inferred"
    derived_id = merged.json()["id"]
    restricted = client.post(
        f"/memory/{source_id}/restrict",
        headers=founder_headers,
        json={"scope": "founder"},
    )
    assert restricted.status_code == 200
    hidden = client.get("/memory", headers=founder_headers)
    assert derived_id not in {row["id"] for row in hidden.json()["items"]}
    archived = client.post(f"/memory/{other['id']}/archive", headers=founder_headers)
    assert archived.status_code == 200
    assert archived.json()["archived_at"]
    exported = client.post(f"/memory/{other['id']}/export", headers=founder_headers)
    assert exported.status_code == 200
    assert exported.json()["scope"] == "item"
    deleted = client.post(f"/memory/{other['id']}/delete", headers=founder_headers)
    assert deleted.status_code == 200
    assert deleted.json()["erasure"] == "not_org_wide"
    refused = client.post(
        "/memory",
        headers=founder_headers,
        json={"title": "leak", "kind": "projects", "content": "sk-abcdefghijklmnopqrstuvwxyz123456"},
    )
    assert refused.status_code == 422


def test_operator_cannot_delete_or_correct(client, founder_headers) -> None:
    item = client.post(
        "/memory",
        headers=founder_headers,
        json={"title": "Ops see own only", "kind": "sessions", "class": "source", "content": "session"},
    ).json()
    invited = _invite(client, founder_headers, "operator")
    ops = _headers(invited["principal_id"])
    assert client.post(f"/memory/{item['id']}/delete", headers=ops).status_code == 403
    assert client.post(f"/memory/{item['id']}/correct", headers=ops, json={"content": "x"}).status_code == 403
    listing = client.get("/memory", headers=ops)
    assert listing.status_code == 200
    assert listing.json()["items"] == []


def test_unpriv_memory_forbidden(client, unpriv_headers) -> None:
    assert client.get("/memory", headers=unpriv_headers).status_code == 403


def test_adaptive_views_fallback_pin_undo_reset(client, founder_headers) -> None:
    enabled = client.post("/settings/personalisation", headers=founder_headers, json={"enabled": True})
    assert enabled.status_code == 200
    assert enabled.json()["enabled"] is True
    preview = client.post(
        "/views/preview",
        headers=founder_headers,
        json={"schema_version": 1, "intent": "strategy", "regions": [{"id": "main", "component": "today"}]},
    )
    assert preview.status_code == 200
    assert preview.json()["accepted"] is True
    applied = client.post(
        "/views/apply",
        headers=founder_headers,
        json={"schema_version": 1, "intent": "strategy", "regions": [{"id": "main", "component": "memory"}]},
    )
    assert applied.json()["applied"] is True
    invalid = client.post(
        "/views/apply",
        headers=founder_headers,
        json={"schema_version": 1, "regions": [{"id": "main", "component": "shell"}], "filesystem": "/tmp"},
    )
    assert invalid.json()["fallback"] is True
    assert invalid.json()["definition"]["intent"] == FALLBACK["intent"]
    pinned = client.post("/views/pin", headers=founder_headers, json={"region": "tabs"})
    assert "tabs" in pinned.json()["pins"]
    undone = client.post("/views/undo", headers=founder_headers)
    assert undone.status_code == 200
    reset = client.post("/views/reset", headers=founder_headers)
    assert reset.json()["fallback"] is True
    assert reset.json()["stable_chrome"] == list(STABLE_CHROME)


def test_personalisation_off_refuses_apply(client, founder_headers) -> None:
    inspect = client.get("/settings/personalisation", headers=founder_headers)
    assert inspect.status_code == 200
    assert inspect.json()["enabled"] is False
    assert inspect.json()["default"] is False
    refused = client.post(
        "/views/apply",
        headers=founder_headers,
        json={"schema_version": 1, "intent": "x", "regions": [{"id": "main", "component": "today"}]},
    )
    assert refused.status_code == 403
    client.post("/settings/personalisation", headers=founder_headers, json={"enabled": True})
    client.post(
        "/views/apply",
        headers=founder_headers,
        json={"schema_version": 1, "intent": "x", "regions": [{"id": "main", "component": "today"}]},
    )
    reset = client.post("/settings/personalisation/reset", headers=founder_headers)
    assert reset.json()["enabled"] is False


def test_strategy_kpis_not_captured(client, founder_headers, unpriv_headers) -> None:
    created = client.post(
        "/strategy",
        headers=founder_headers,
        json={"kind": "decision", "title": "No invented KPI", "body": "Native only"},
    )
    assert created.status_code == 200
    assert created.json()["kpi_status"] == "not_captured"
    listing = client.get("/strategy", headers=founder_headers)
    assert listing.status_code == 200
    assert listing.json()["kpi_status"] == "not_captured"
    assert any(row["kind"] == "goal" for row in listing.json()["items"])
    assert client.post("/strategy", headers=unpriv_headers, json={"kind": "goal", "title": "x"}).status_code == 403


def test_capacity_native_not_hr(client, founder_headers) -> None:
    updated = client.post(
        "/people/principal-founder/capacity",
        headers=founder_headers,
        json={"availability": "available", "workload": "normal"},
    )
    assert updated.status_code == 200
    assert updated.json()["hr_connector"] == "planned"
    people = client.get("/people", headers=founder_headers)
    founder = next(row for row in people.json()["items"] if row["id"] == "principal-founder")
    assert founder["availability"] == "available"
    assert founder["hr_connector"] == "planned"


def test_r3_shells_deny_live_write(client, founder_headers) -> None:
    catalogue = client.get("/domains/catalogue", headers=founder_headers)
    assert catalogue.status_code == 200
    items = catalogue.json()["items"]
    ids = {row["id"] for row in items}
    assert len(items) == 43
    assert {"B04", "B13", "B22", "B08", "P01"} <= ids
    assert all(row["live_write"] is False for row in items)
    refused = client.post("/domains/B04/connect", headers=founder_headers)
    assert refused.status_code == 403
    unknown = client.post("/domains/B99/connect", headers=founder_headers)
    assert unknown.status_code == 403


def test_references_and_schedules_configured(client, founder_headers) -> None:
    refs = client.get("/references", headers=founder_headers)
    assert refs.status_code == 200
    assert refs.json()["kpi_default"] == "not_captured"
    assert refs.json()["metrics"] == []
    assert "price" not in str(refs.json()).lower()
    created = client.post("/schedules", headers=founder_headers, json={"cadence": "weekly", "definition": "digest"})
    assert created.status_code == 200
    assert created.json()["fire_external"] in {0, False}
    listing = client.get("/schedules", headers=founder_headers)
    assert listing.json()["fire_external"] is False
    assert listing.json()["mode"] == "Automate"


def test_view_schema_unit() -> None:
    ok, accepted = validate_view_definition(
        {"schema_version": 1, "intent": "work", "regions": [{"id": "main", "component": "work"}]}
    )
    assert accepted is True
    assert ok["fallback"] is False
    bad, accepted_bad = validate_view_definition({"schema_version": 2, "shell": True})
    assert accepted_bad is False
    assert bad["fallback"] is True


def test_scan_credentials_unit() -> None:
    try:
        scan_credentials("-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----")
    except StoreError as exc:
        assert exc.status_code == 422
    else:
        raise AssertionError("expected credential refusal")
