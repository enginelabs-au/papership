"""Platform foundation: resolver, blueprint locks, approvals, quotes and jobs, org isolation, one connected flow."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app import foundation, registry
from app.main import create_app
from tests.conftest import make_token


def grant(client, principal, tenant, *classes):
    store = client.app.state.store
    for cls in classes:
        store.conn.execute(
            "INSERT INTO grants (id, principal_id, tenant_id, grant_class, scope) VALUES (?, ?, ?, ?, ?)",
            (f"g-{principal}-{cls}", principal, tenant, cls, "org"),
        )
    store.flush()


def hdr(sub):
    return {"Authorization": f"Bearer {make_token(sub)}"}


@pytest.fixture
def seeded(client, founder_headers):
    r = client.post("/platform/demo/seed", headers=founder_headers)
    assert r.status_code == 200, r.text
    return r.json()["steps"]


def mf(name, version="1.0.0", requires=None, **over):
    base = {
        "schema": registry.SCHEMA, "name": name, "version": version, "kind": "context-pack",
        "description": "A test material used to exercise the resolver in the foundation tests.",
        "category": "test", "tags": ["test"], "jurisdiction": [], "compatible": ["papership-demo-runtime"],
        "license": {"class": "open", "spdx": "MIT"}, "visibility": "private",
    }
    if requires:
        base["requires"] = requires
    base.update(over)
    return base


def pub(client, headers, manifest):
    r = client.post("/registry/packages", headers=headers, json={"manifest": manifest, "files": {"SKILL.md": "# Test\n\nSome plain test guidance for agents."}})
    assert r.status_code == 200, r.text


def decide(client, headers, approval, decision="approved", payload_hash=None):
    return client.post(f"/workspace/approvals/{approval['id']}/decision", headers=headers,
                       json={"decision": decision, "payload_hash": payload_hash or approval["payload_hash"]})


# ---- resolver --------------------------------------------------------------------------------------


def test_resolver_selects_exact_versions_with_reasons_and_separate_compatibility(seeded, client, founder_headers) -> None:
    r = client.post("/platform/resolve", headers=founder_headers,
                    json={"materials": [{"name": "engine-labs/enquiry-response-workflow", "constraint": "^1.0.0"}]}).json()
    assert r["ok"] is True
    lock = {i["name"]: i for i in r["lock"]}
    assert lock["engine-labs/property-terminology"]["version"] == "1.2.0"  # highest satisfying ^1.1.0
    assert "required by engine-labs/enquiry-response-workflow@1.0.0" in lock["engine-labs/property-terminology"]["reason"]
    assert all(i["tested_compatibility"] == [] and i["declared_compatibility"] for i in r["lock"])
    assert any("No platform compatibility tests" in w for w in r["warnings"])
    assert all(len(i["content_hash"]) == 64 for i in r["lock"])


def test_resolver_reports_missing_unsupported_and_cycles(seeded, client, founder_headers) -> None:
    missing = client.post("/platform/resolve", headers=founder_headers, json={"materials": [{"name": "engine-labs/nope", "constraint": "*"}]}).json()
    assert missing["ok"] is False and missing["errors"][0]["code"] == "missing_dependency"
    paid = client.post("/platform/resolve", headers=founder_headers, json={"materials": [{"name": "engine-labs/premium-market-reports", "constraint": "*"}]}).json()
    assert paid["ok"] is False and paid["unsupported"][0]["code"] == "paid_not_installable"
    unsatisfiable = client.post("/platform/resolve", headers=founder_headers, json={"materials": [{"name": "engine-labs/property-terminology", "constraint": "^9.0.0"}]}).json()
    assert unsatisfiable["ok"] is False and unsatisfiable["errors"]
    # a requires cycle cannot be published through the normal path, so the graph check is exercised directly
    assert foundation._graph_cycle({"a": ["b"], "b": ["c"], "c": ["a"]}) == ["a", "b", "c", "a"]
    assert foundation._graph_cycle({"a": ["b"], "b": []}) is None
    bad = client.post("/platform/resolve", headers=founder_headers, json={"materials": [{"name": "Bad Name", "constraint": "*"}]})
    assert bad.status_code == 422
    unsupported_adapter = client.post("/platform/resolve", headers=founder_headers, json={"materials": [], "adapter": "hermes"})
    assert unsupported_adapter.status_code == 422


def test_blueprint_save_refuses_unresolvable_and_is_immutable_and_idempotent(seeded, client, founder_headers) -> None:
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    detail = client.get(f"/studio/blueprints/{bp['id']}", headers=founder_headers).json()
    config = detail["versions"][0]["config"]
    same = client.post("/studio/blueprints", headers=founder_headers, json={"slug": bp["slug"], "title": bp["title"], "config": config}).json()
    assert same["created"] is False and same["version"] == 1
    bad = json.loads(json.dumps(config))
    bad["materials"].append({"name": "engine-labs/premium-market-reports", "constraint": "*"})
    r = client.post("/studio/blueprints", headers=founder_headers, json={"slug": bp["slug"], "title": bp["title"], "config": bad})
    assert r.status_code == 422 and "cannot be resolved" in r.json()["detail"]
    changed = json.loads(json.dumps(config))
    changed["purpose"] = changed["purpose"] + " Also summarise the enquiry."
    v2 = client.post("/studio/blueprints", headers=founder_headers, json={"slug": bp["slug"], "title": bp["title"], "config": changed}).json()
    assert v2["version"] == 2 and v2["created"] is True
    v1 = client.get(f"/studio/blueprints/{bp['id']}", headers=founder_headers).json()["versions"][-1]
    assert v1["version"] == 1 and v1["config"]["purpose"] == config["purpose"]


@pytest.mark.parametrize("mutate,fragment", [
    (lambda c: c["runtime"].update(adapter="hermes"), "planned"),
    (lambda c: c["runtime"].update(adapter="made-up"), "unknown runtime adapter"),
    (lambda c: c["policy"].update(external_actions="auto"), "require_approval"),
    (lambda c: c["policy"].update(spend_limit_minor=1.5), "integer"),
    (lambda c: c.update(tools=[{"id": "real-crm", "access": "write"}]), "Available tools"),
    (lambda c: c.update(purpose="sk-" + "a" * 40), "credentials"),
    (lambda c: c.update(unknown=1), "unknown blueprint fields"),
])
def test_blueprint_validation(seeded, client, founder_headers, mutate, fragment) -> None:
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    config = json.loads(json.dumps(client.get(f"/studio/blueprints/{bp['id']}", headers=founder_headers).json()["versions"][0]["config"]))
    mutate(config)
    r = client.post("/studio/blueprints", headers=founder_headers, json={"slug": "other", "title": "Other", "config": config})
    assert r.status_code == 422 and fragment in r.json()["detail"], r.text


# ---- evaluation and export ------------------------------------------------------------------------


def test_fixture_evaluation_is_honestly_labelled_and_checks_real_behaviour(seeded, client, founder_headers) -> None:
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    ev = client.post(f"/studio/blueprints/{bp['id']}/versions/1/evaluate", headers=founder_headers).json()
    assert "Not a model task-success score" in ev["method"]
    assert ev["total"] == ev["passed"] > 0
    assert "score" not in json.dumps(ev).lower().replace("task-success score", "")
    # remove the terminology material and the fixture reply must change, so checks are not vacuous
    detail = client.get(f"/studio/blueprints/{bp['id']}", headers=founder_headers).json()["versions"][0]["config"]
    stripped = json.loads(json.dumps(detail))
    stripped["materials"] = [m for m in stripped["materials"] if m["name"].endswith("mock-crm-tool")]
    saved = client.post("/studio/blueprints", headers=founder_headers, json={"slug": "bare", "title": "Bare", "config": stripped}).json()
    ev2 = client.post(f"/studio/blueprints/{saved['blueprint_id']}/versions/1/evaluate", headers=founder_headers).json()
    assert ev2["passed"] < ev2["total"]


def test_export_and_publish_carry_no_credentials_and_stay_private(seeded, client, founder_headers) -> None:
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    export = client.get(f"/studio/blueprints/{bp['id']}/versions/1/export", headers=founder_headers).json()
    assert export["credentials"] == "references only; none included"
    assert not registry.credential_like(json.dumps(export))
    pubd = client.post(f"/studio/blueprints/{bp['id']}/versions/1/publish", headers=founder_headers, json={}).json()
    assert pubd["package"] == "engine-labs/enquiry-assistant" and "locally" in pubd["note"].lower() or "local" in pubd["note"].lower()
    card = client.get("/registry/packages/engine-labs/enquiry-assistant", headers=founder_headers).json()
    assert card["visibility"] == "private" and card["provenance"]["source"] == "registry:local" and card["tested_compatibility"] == []


# ---- approvals --------------------------------------------------------------------------------------


def test_crm_is_untouched_until_the_exact_proposal_is_approved(seeded, client, founder_headers) -> None:
    task = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    assert task["status"] == "awaiting_approval" and task["contact"]["stage"] == "new_enquiry"
    assert task["result"]["text"] and task["result"]["last_edited_by"] == task["agent_id"]
    approval = next(a for a in task["approvals"] if a["status"] == "pending")
    assert approval["payload"]["stage"] == "replied" and approval["simulated"] is True
    ok = decide(client, founder_headers, approval)
    assert ok.status_code == 200 and ok.json()["status"] == "approved"
    after = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    assert after["status"] == "done" and after["contact"]["stage"] == "replied" and after["runs"][-1]["status"] == "completed"
    kinds = [a["kind"] for a in after["activity"]]
    assert "crm.simulated_write" in kinds and "workspace.approval_approved" in kinds


def test_stale_duplicate_and_unauthorised_decisions_are_rejected(seeded, client, founder_headers) -> None:
    approval = client.get("/workspace/approvals?status=pending", headers=founder_headers).json()["items"][0]
    assert decide(client, founder_headers, approval, payload_hash="0" * 64).status_code == 409  # stale hash
    grant(client, "principal-unpriv", "tenant-founder", "memory.read", "memory.write")
    grant(client, "principal-agent", "tenant-founder", "memory.read", "memory.write")
    assert decide(client, hdr("principal-unpriv"), approval).status_code == 403  # operator, not owner
    assert decide(client, hdr("principal-agent"), approval).status_code == 403  # agent
    still = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    assert still["contact"]["stage"] == "new_enquiry"
    assert decide(client, founder_headers, approval).status_code == 200
    assert decide(client, founder_headers, approval).status_code == 409  # duplicate
    assert decide(client, founder_headers, approval, "rejected").status_code == 409  # contradictory late decision


def test_rejecting_reopens_the_task_and_a_rerun_supersedes_the_old_proposal(seeded, client, founder_headers) -> None:
    approval = client.get("/workspace/approvals?status=pending", headers=founder_headers).json()["items"][0]
    assert decide(client, founder_headers, approval, "rejected").status_code == 200
    task = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    assert task["status"] == "open" and task["contact"]["stage"] == "new_enquiry"
    rerun = client.post(f"/workspace/tasks/{seeded['task_id']}/run", headers=founder_headers).json()
    assert rerun["status"] == "awaiting_approval" and len(rerun["runs"]) == 2
    states = [a["status"] for a in rerun["approvals"]]
    assert states == ["rejected", "pending"]
    # approving the first (rejected) proposal's hash is impossible: it is no longer pending
    assert decide(client, founder_headers, rerun["approvals"][0]).status_code == 409


def test_crm_executor_refuses_without_an_approved_decision(seeded, client) -> None:
    store = client.app.state.store
    row = store.conn.execute("SELECT * FROM fd_approvals WHERE status='pending' AND kind='crm.update_contact'").fetchone()
    with pytest.raises(Exception) as exc:
        foundation._apply_crm_action(store, "tenant-founder", row, "x")
    assert "no approved decision" in str(exc.value)


def test_state_transitions_are_explicit(seeded, client, founder_headers) -> None:
    task_id = seeded["task_id"]
    assert client.post(f"/workspace/tasks/{task_id}/run", headers=founder_headers).status_code == 409  # not open
    done = client.post(f"/workspace/tasks/{task_id}/cancel", headers=founder_headers).json()
    assert done["status"] == "cancelled" and done["approvals"][0]["status"] == "superseded"
    assert client.post(f"/workspace/tasks/{task_id}/cancel", headers=founder_headers).status_code == 409
    assert client.put(f"/workspace/tasks/{task_id}/result", headers=founder_headers, json={"text": "x", "base_version": 1}).status_code == 409
    with pytest.raises(Exception):
        foundation._check_transition(foundation.JOB_TRANSITIONS, "validated", "running", "job")


def test_result_edit_is_versioned_and_rejects_stale_edits(seeded, client, founder_headers) -> None:
    task = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    v = task["result"]["version"]
    edited = client.put(f"/workspace/tasks/{task['id']}/result", headers=founder_headers, json={"text": "Hi Priya, thanks for asking.", "base_version": v}).json()
    assert edited["result"]["version"] == v + 1 and edited["result"]["last_edited_by"] == "principal-founder"
    stale = client.put(f"/workspace/tasks/{task['id']}/result", headers=founder_headers, json={"text": "other", "base_version": v})
    assert stale.status_code == 409


# ---- exchange ---------------------------------------------------------------------------------------


def accept(client, headers, quote_id):
    return client.post(f"/exchange/quotes/{quote_id}/accept", headers=headers)


def run_job(client, headers, job_id):
    for _ in range(3):
        job = client.post(f"/exchange/jobs/{job_id}/advance", headers=headers).json()
    return job


def test_small_quote_accepts_idempotently_and_accounts_estimate_reserved_and_recorded(seeded, client, founder_headers) -> None:
    quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    assert quote["estimate_minor"] == 450 and quote["currency"] == "AUD"
    client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 5000, "approval_threshold_minor": 1000})
    first = accept(client, founder_headers, quote["id"]).json()
    again = accept(client, founder_headers, quote["id"]).json()
    assert first["outcome"] == "job_created" and again["outcome"] == "job_exists" and again["job"]["id"] == first["job"]["id"]
    assert len(client.get("/exchange/jobs", headers=founder_headers).json()["items"]) == 1
    pol = client.get("/exchange/policy", headers=founder_headers).json()
    assert pol["reserved_minor"] == 450 and pol["spent_simulated_minor"] == 0
    job = run_job(client, founder_headers, first["job"]["id"])
    assert job["status"] == "validated" and job["usage_minor"] == 450 and job["simulated"] is True
    assert "Fixture check" in job["validation"]["method"]
    pol = client.get("/exchange/policy", headers=founder_headers).json()
    assert pol["reserved_minor"] == 0 and pol["spent_simulated_minor"] == 450 and pol["remaining_minor"] == 4550
    assert client.post(f"/exchange/jobs/{job['id']}/advance", headers=founder_headers).status_code == 409
    task = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    assert task["simulated_cost_minor"] == 450 and task["exchange"]["jobs"][0]["result"]["label"]


def test_quote_above_threshold_needs_an_exact_approval_then_creates_one_job(seeded, client, founder_headers) -> None:
    quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    first = accept(client, founder_headers, quote["id"]).json()
    assert first["outcome"] == "awaiting_approval" and first["approval"]["kind"] == "exchange.accept_quote"
    second = accept(client, founder_headers, quote["id"]).json()
    assert second["approval"]["id"] == first["approval"]["id"]  # no duplicate approval request
    assert client.get("/exchange/jobs", headers=founder_headers).json()["items"] == []
    assert decide(client, founder_headers, first["approval"], payload_hash="f" * 64).status_code == 409
    done = decide(client, founder_headers, first["approval"])
    assert done.status_code == 200 and done.json()["action_result"]["outcome"] == "job_created"
    jobs = client.get("/exchange/jobs", headers=founder_headers).json()["items"]
    assert len(jobs) == 1 and jobs[0]["approval_id"] == first["approval"]["id"]
    assert accept(client, founder_headers, quote["id"]).json()["outcome"] == "job_exists"


def test_budget_policy_is_checked_at_acceptance_time(seeded, client, founder_headers) -> None:
    quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 100, "approval_threshold_minor": 1000})
    denied = accept(client, founder_headers, quote["id"])
    assert denied.status_code == 409 and "over budget" in denied.json()["detail"]
    assert client.get("/exchange/jobs", headers=founder_headers).json()["items"] == []
    assert client.get("/exchange/policy", headers=founder_headers).json()["reserved_minor"] == 0


def test_expired_quote_cannot_be_accepted_and_cancel_releases_the_reservation(seeded, client, founder_headers) -> None:
    store = client.app.state.store
    quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    store.conn.execute("UPDATE fd_quotes SET expires_at='2000-01-01T00:00:00Z' WHERE id=?", (quote["id"],))
    store.flush()
    expired = accept(client, founder_headers, quote["id"])
    assert expired.status_code == 409 and "expired" in expired.json()["detail"]
    fresh = client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "property-data-enrichment", "task_id": seeded["task_id"],
                                                                         "input": {"address": "14 Wattle Street, Fitzroy VIC"}}).json()
    client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 5000, "approval_threshold_minor": 1000})
    job = accept(client, founder_headers, fresh["id"]).json()["job"]
    assert client.get("/exchange/policy", headers=founder_headers).json()["reserved_minor"] == 450
    cancelled = client.post(f"/exchange/jobs/{job['id']}/cancel", headers=founder_headers).json()
    assert cancelled["status"] == "cancelled"
    pol = client.get("/exchange/policy", headers=founder_headers).json()
    assert pol["reserved_minor"] == 0 and pol["spent_simulated_minor"] == 0
    assert client.post(f"/exchange/jobs/{job['id']}/cancel", headers=founder_headers).status_code == 409


def test_exchange_input_validation_and_placeholders(seeded, client, founder_headers) -> None:
    assert client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "nope", "input": {}}).status_code == 404
    assert client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "property-data-enrichment", "input": {}}).status_code == 422
    job_quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 5000, "approval_threshold_minor": 1000})
    job = accept(client, founder_headers, job_quote["id"]).json()["job"]
    assert job["dispute"]["state"] == "unavailable"
    assert client.post(f"/exchange/jobs/{job['id']}/dispute", headers=founder_headers).status_code == 501
    caps = client.get("/exchange/capabilities", headers=founder_headers).json()
    assert caps["simulated"] is True and "fictional" in caps["label"].lower()


# ---- organisation isolation and flags -----------------------------------------------------------------


def test_another_organisation_cannot_see_or_touch_anything(seeded, client, founder_headers) -> None:
    grant(client, "principal-other", "tenant-other", "memory.read", "memory.write")
    other = hdr("principal-other")
    for path in ("/workspace/agents", "/workspace/tasks", "/workspace/approvals", "/studio/blueprints", "/exchange/quotes", "/exchange/jobs"):
        assert client.get(path, headers=other).json()["items"] == [], path
    assert client.get(f"/workspace/tasks/{seeded['task_id']}", headers=other).status_code == 404
    assert client.get(f"/workspace/agents/{seeded['agent_id']}", headers=other).status_code == 404
    approval = client.get("/workspace/approvals", headers=founder_headers).json()["items"][0]
    assert client.post(f"/workspace/approvals/{approval['id']}/decision", headers=other, json={"decision": "approved", "payload_hash": approval["payload_hash"]}).status_code == 403
    assert accept(client, other, seeded["quote_id"]).status_code == 404
    assert client.post(f"/workspace/tasks/{seeded['task_id']}/run", headers=other).status_code == 404
    assert client.post("/platform/demo/seed", headers=other).status_code == 403
    assert client.get("/workspace/overview", headers=other).json()["seeded"] is False
    # private registry packages from the founder organisation are not resolvable by the other
    r = client.post("/platform/resolve", headers=other, json={"materials": [{"name": "engine-labs/property-terminology", "constraint": "*"}]}).json()
    assert r["ok"] is False


def test_unprivileged_caller_is_denied_and_seed_is_idempotent_and_reset_works(seeded, client, founder_headers) -> None:
    assert client.get("/workspace/overview", headers=hdr("principal-unpriv")).status_code == 403
    assert client.post("/workspace/tasks/x/run", headers=hdr("principal-unpriv")).status_code == 403
    again = client.post("/platform/demo/seed", headers=founder_headers).json()["steps"]
    assert "task_id" not in again  # no second agent or task
    assert len(client.get("/workspace/tasks", headers=founder_headers).json()["items"]) == 1
    reset = client.post("/platform/demo/reset", headers=founder_headers).json()
    assert reset["reset"] is True
    assert client.get("/workspace/tasks", headers=founder_headers).json()["items"] == []
    assert client.get("/registry/packages", headers=founder_headers).json()["items"], "immutable registry packages are kept"
    assert client.post("/platform/demo/seed", headers=founder_headers).status_code == 200


def test_disabled_product_flag_hides_routes_and_context_reports_it(client, founder_headers, monkeypatch) -> None:
    monkeypatch.setenv("PAPERSHIP_DISABLED_PRODUCTS", "exchange")
    assert client.get("/exchange/capabilities", headers=founder_headers).status_code == 404
    assert client.get("/workspace/overview", headers=founder_headers).status_code == 200
    caps = client.get("/platform/capabilities", headers=founder_headers).json()
    assert {p["id"]: p["status"] for p in caps["products"]}["exchange"] == "disabled"
    assert client.get("/platform/context", headers=founder_headers).json()["disabled_products"] == ["exchange"]


def test_capabilities_never_imply_universal_control(client, founder_headers) -> None:
    caps = client.get("/platform/capabilities", headers=founder_headers).json()
    third = next(i for i in caps["integrations"] if i["id"] == "third-party-agent")
    assert third["status"] == "unsupported" and not any(third["controls"].values())
    statuses = {c["status"] for c in caps["capabilities"]}
    assert {"implemented", "simulated", "planned", "unsupported"} <= statuses
    ctx = client.get("/platform/context", headers=founder_headers).json()
    assert ctx["member"]["role"] == "Owner / Founder" and ctx["member"]["can_decide_approvals"] is True
    assert "not production authentication" in ctx["identity_note"]
    assert ctx["member"]["permissions"] == {"view": True, "write": True, "admin": True, "decide": True, "policy": True}


def test_context_permissions_follow_the_callers_grants(client, unpriv_headers) -> None:
    grant(client, "principal-unpriv", "tenant-founder", "memory.read")
    perms = client.get("/platform/context", headers=unpriv_headers).json()["member"]
    assert perms["permissions"] == {"view": True, "write": False, "admin": False, "decide": False, "policy": False}
    assert perms["role"] == "Member"


def test_install_onto_agent_records_exact_version_and_source_and_refuses_paid(seeded, client, founder_headers) -> None:
    ok = client.post("/platform/installs", headers=founder_headers,
                     json={"agent_id": seeded["agent_id"], "name": "engine-labs/property-terminology", "constraint": "^1.0.0"}).json()
    assert ok["selection"]["lock"][0]["version"] == "1.2.0" and ok["charged"] == 0
    agent = client.get(f"/workspace/agents/{seeded['agent_id']}", headers=founder_headers).json()
    row = next(i for i in agent["installs"] if i["package_name"] == "engine-labs/property-terminology")
    assert row["version"] == "1.2.0" and row["source"].startswith("registry:local") and row["requested_constraint"] == "^1.0.0"
    paid = client.post("/platform/installs", headers=founder_headers,
                       json={"agent_id": seeded["agent_id"], "name": "engine-labs/premium-market-reports", "constraint": "*"})
    assert paid.status_code == 409 and "Paid" in paid.json()["detail"]


def test_updates_are_listed_reviewed_and_applied_only_with_the_reviewed_hash(seeded, client, founder_headers) -> None:
    aid, pkg = seeded["agent_id"], "engine-labs/property-terminology"
    pinned = client.post("/platform/installs", headers=founder_headers, json={"agent_id": aid, "name": pkg, "constraint": "==1.1.0"})
    assert pinned.status_code == 200
    review = client.get(f"/platform/installs/updates?agent_id={aid}", headers=founder_headers).json()
    item = next(u for u in review["updates"] if u["name"] == pkg)
    assert (item["from_version"], item["to_version"]) == ("1.1.0", "1.2.0")
    assert item["within_requested_constraint"] is False and item["files_changed"] == ["GLOSSARY.md"]
    body = {"agent_id": aid, "name": pkg, "to_version": "1.2.0", "reviewed_hash": item["reviewed_hash"]}
    stale = client.post("/platform/installs/update", headers=founder_headers, json={**body, "reviewed_hash": "sha256:" + "0" * 64})
    assert stale.status_code == 409 and "stale review" in stale.json()["detail"]
    installed = next(i for i in client.get(f"/workspace/agents/{aid}", headers=founder_headers).json()["installs"] if i["package_name"] == pkg)
    assert installed["version"] == "1.1.0"  # nothing changed on refusal
    ok = client.post("/platform/installs/update", headers=founder_headers, json=body)
    assert ok.status_code == 200 and ok.json()["charged"] == 0
    after = next(i for i in client.get(f"/workspace/agents/{aid}", headers=founder_headers).json()["installs"] if i["package_name"] == pkg)
    assert after["version"] == "1.2.0" and "reviewed update" in after["source"] and after["requested_constraint"] == "==1.1.0"
    again = client.post("/platform/installs/update", headers=founder_headers, json=body)
    assert again.status_code == 409  # only a newer version can be applied
    kinds = [a["kind"] for a in client.get("/workspace/activity", headers=founder_headers).json()["items"]]
    assert "registry.updated" in kinds
    assert client.post("/platform/installs/update", headers=hdr("principal-unpriv"), json=body).status_code == 403
    grant(client, "principal-other", "tenant-other", "memory.read")
    assert client.get(f"/platform/installs/updates?agent_id={aid}", headers=hdr("principal-other")).status_code == 404


def test_blueprint_deployment_target_is_export_only_and_planned_targets_are_refused(seeded, client, founder_headers) -> None:
    caps = client.get("/platform/capabilities", headers=founder_headers).json()
    assert {t["id"]: t["status"] for t in caps["deploy_targets"]} == {"export-only": "implemented", "papership-cloud": "planned", "self-hosted": "planned", "vercel": "planned"}
    assert {s["name"]: s["status"] for s in caps["access_surfaces"]}["Papership MCP server"] == "planned"
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    cfg = client.get(f"/studio/blueprints/{bp['id']}", headers=founder_headers).json()["versions"][0]["config"]
    bad = client.post("/studio/blueprints", headers=founder_headers, json={"slug": "deploy-test", "title": "Deploy test", "config": {**cfg, "deployment": {"target": "vercel"}}})
    assert bad.status_code == 422 and "planned" in bad.json()["detail"]
    ok = client.post("/studio/blueprints", headers=founder_headers, json={"slug": "deploy-test", "title": "Deploy test", "config": {**cfg, "deployment": {"target": "export-only", "notes": "hand over"}}})
    assert ok.status_code == 200
    version = client.get(f"/studio/blueprints/{ok.json()['blueprint_id']}", headers=founder_headers).json()["versions"][0]
    assert version["config"]["deployment"] == {"target": "export-only", "notes": "hand over"}


def test_agent_passport_describes_the_agent_and_grants_nothing(seeded, client, founder_headers) -> None:
    p = client.get(f"/workspace/agents/{seeded['agent_id']}/passport", headers=founder_headers)
    assert p.status_code == 200
    body = p.json()
    assert body["grants_access"] is False and body["credentials"] == "references only; none included"
    assert body["origin"]["blueprint"] == "enquiry-assistant" and body["origin"]["content_hash"]
    assert {c["material"] for c in body["capabilities"]} >= {"engine-labs/property-terminology"}
    assert "not an industry standard" in body["note"]
    assert client.get(f"/workspace/agents/{seeded['agent_id']}/passport", headers=hdr("principal-unpriv")).status_code == 403
    grant(client, "principal-other", "tenant-other", "memory.read")
    assert client.get(f"/workspace/agents/{seeded['agent_id']}/passport", headers=hdr("principal-other")).status_code == 404


# ---- connected flow and persistence -----------------------------------------------------------------------


def test_full_connected_flow_survives_a_restart(env_jwt, tmp_path) -> None:
    path = str(tmp_path / "flow.sqlite")
    client = TestClient(create_app(path))
    h = hdr("principal-founder")
    steps = client.post("/platform/demo/seed", headers=h).json()["steps"]
    task = client.get(f"/workspace/tasks/{steps['task_id']}", headers=h).json()
    assert {i["package_name"] for i in task["agent"]["installs"]} >= {"engine-labs/enquiry-response-workflow", "engine-labs/property-terminology"}
    assert task["agent"]["blueprint"]["slug"] == "enquiry-assistant" and task["agent"]["latest_evaluation"]["passed"]
    edited = client.put(f"/workspace/tasks/{task['id']}/result", headers=h, json={"text": "Edited reply for Priya.", "base_version": task["result"]["version"]}).json()
    approval = next(a for a in edited["approvals"] if a["status"] == "pending")
    assert decide(client, h, approval).status_code == 200
    client.post("/exchange/policy", headers=h, json={"budget_limit_minor": 5000, "approval_threshold_minor": 1000})
    job = accept(client, h, steps["quote_id"]).json()["job"]
    run_job(client, h, job["id"])
    client.close()

    reopened = TestClient(create_app(path))
    task = reopened.get(f"/workspace/tasks/{steps['task_id']}", headers=h).json()
    assert task["status"] == "done" and task["result"]["text"] == "Edited reply for Priya." and task["contact"]["stage"] == "replied"
    assert task["exchange"]["jobs"][0]["status"] == "validated" and task["simulated_cost_minor"] == 450
    kinds = {a["kind"] for a in task["activity"]}
    assert {"workspace.task_created", "workspace.draft_produced", "workspace.result_edited", "workspace.approval_approved",
            "crm.simulated_write", "exchange.job_accepted", "exchange.job_validated"} <= kinds
    assert task["provenance"] and all(len(p["content_hash"]) == 64 for p in task["provenance"])
    assert reopened.get("/workspace/overview", headers=h).json()["seeded"] is True
    reopened.close()


# ---- security review regressions (round 1) ------------------------------------------------------------


def test_exchange_job_creation_enforces_approval_in_the_service_not_the_router(seeded, client) -> None:
    store = client.app.state.store
    quote = store.conn.execute("SELECT id FROM fd_quotes").fetchone()["id"]
    with store._lock:
        out = foundation._finish_acceptance(store, "tenant-founder", "p", quote, "")
    assert out["outcome"] == "not_accepted" and "approval required" in out["reason"]
    assert store.conn.execute("SELECT COUNT(*) AS n FROM fd_jobs").fetchone()["n"] == 0
    assert store.conn.execute("SELECT reserved_minor FROM fd_exchange_policy").fetchone()["reserved_minor"] == 0


def test_editing_the_draft_retires_the_old_approval_and_done_tasks_are_frozen(seeded, client, founder_headers) -> None:
    task = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()
    old = next(a for a in task["approvals"] if a["status"] == "pending")
    edited = client.put(f"/workspace/tasks/{task['id']}/result", headers=founder_headers,
                        json={"text": "A different reply.", "base_version": task["result"]["version"]}).json()
    states = {a["id"]: a["status"] for a in edited["approvals"]}
    assert states[old["id"]] == "superseded"
    new = next(a for a in edited["approvals"] if a["status"] == "pending")
    assert new["payload_hash"] != old["payload_hash"] and new["payload"]["draft_version"] == task["result"]["version"] + 1
    assert decide(client, founder_headers, old).status_code == 409  # approving the old draft is impossible
    assert decide(client, founder_headers, new).status_code == 200
    frozen = client.put(f"/workspace/tasks/{task['id']}/result", headers=founder_headers, json={"text": "late", "base_version": new["payload"]["draft_version"]})
    assert frozen.status_code == 409


def test_denied_acceptance_stays_on_record_and_expiry_persists(seeded, client, founder_headers) -> None:
    store = client.app.state.store
    quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    store.conn.execute("UPDATE fd_quotes SET expires_at='2000-01-01T00:00:00Z' WHERE id=?", (quote["id"],))
    store.flush()
    assert accept(client, founder_headers, quote["id"]).status_code == 409
    assert store.conn.execute("SELECT status FROM fd_quotes WHERE id=?", (quote["id"],)).fetchone()["status"] == "expired"
    kinds = [a["kind"] for a in client.get("/workspace/activity", headers=founder_headers).json()["items"]]
    assert "exchange.policy_denied" in kinds


def test_disabling_exchange_also_blocks_approving_a_quote(seeded, client, founder_headers, monkeypatch) -> None:
    first = accept(client, founder_headers, client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]["id"]).json()
    monkeypatch.setenv("PAPERSHIP_DISABLED_PRODUCTS", "exchange")
    assert decide(client, founder_headers, first["approval"]).status_code == 404
    monkeypatch.delenv("PAPERSHIP_DISABLED_PRODUCTS")
    assert client.get("/exchange/jobs", headers=founder_headers).json()["items"] == []


def test_crm_executor_is_single_use_and_tenant_bound(seeded, client, founder_headers) -> None:
    store = client.app.state.store
    approval = client.get("/workspace/approvals?status=pending", headers=founder_headers).json()["items"][0]
    assert decide(client, founder_headers, approval).status_code == 200
    row = store.conn.execute("SELECT * FROM fd_approvals WHERE id=?", (approval["id"],)).fetchone()
    with pytest.raises(Exception, match="already been applied"):
        foundation._apply_crm_action(store, "tenant-founder", row, "x")
    with pytest.raises(Exception, match="does not authorise"):
        foundation._apply_crm_action(store, "tenant-other", row, "x")
    notes = client.get(f"/workspace/tasks/{seeded['task_id']}", headers=founder_headers).json()["contact"]["notes"]
    assert len(notes) == 1


def test_stale_transition_loses_the_race(seeded, client) -> None:
    store = client.app.state.store
    with pytest.raises(Exception, match="changed while"):
        foundation._set_task(store, seeded["task_id"], "open", "in_progress", "tenant-founder")  # the task is actually awaiting_approval


def test_fixture_checks_do_not_treat_author_text_as_a_format_string(seeded, client, founder_headers) -> None:
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    config = json.loads(json.dumps(client.get(f"/studio/blueprints/{bp['id']}", headers=founder_headers).json()["versions"][0]["config"]))
    config["eval_cases"][0]["checks"] = [{"type": "not_contains", "field": "draft_reply", "text": "{nope} {0} {customer_name.__class__}"}]
    saved = client.post("/studio/blueprints", headers=founder_headers, json={"slug": "fmt", "title": "Fmt", "config": config})
    assert saved.status_code == 200
    ev = client.post(f"/studio/blueprints/{saved.json()['blueprint_id']}/versions/1/evaluate", headers=founder_headers)
    assert ev.status_code == 200 and ev.json()["total"] >= 1
    config["eval_cases"][0]["input"] = {"question": "x"}
    assert client.post("/studio/blueprints", headers=founder_headers, json={"slug": "fmt2", "title": "Fmt", "config": config}).status_code == 422


def test_inputs_are_bounded_scanned_and_contact_ids_cannot_be_hijacked(seeded, client, founder_headers) -> None:
    big = client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "property-data-enrichment", "input": {"address": "x" * 30000}})
    assert big.status_code == 422
    bidi = client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "property-data-enrichment", "input": {"address": "1 Street\u202e evil"}})
    assert bidi.status_code == 422
    base = {"customer_name": "Someone Else", "customer_email": "else@example.test", "property_address": "1 A St", "contact_id": "c-1001", "question": "Hello?", "listing": {}}
    hijack = client.post("/workspace/tasks", headers=founder_headers, json={"title": "t", "agent_id": seeded["agent_id"], "input": base})
    assert hijack.status_code == 422 and "different customer" in hijack.json()["detail"]
    quoted = {**base, "contact_id": "c-9", "question": "my " + "pass" + 'word: "hunter2hunter2" thanks'}
    assert client.post("/workspace/tasks", headers=founder_headers, json={"title": "t", "agent_id": seeded["agent_id"], "input": quoted}).status_code == 422
    assert client.post(f"/studio/blueprints/x/versions/99999999999999999999/evaluate", headers=founder_headers).status_code == 422


def test_policy_and_reset_are_human_only_and_audited(seeded, client, founder_headers) -> None:
    grant(client, "principal-agent", "tenant-founder", "org.admin")
    agent = hdr("principal-agent")
    assert client.post("/exchange/policy", headers=agent, json={"budget_limit_minor": 10_000_000, "approval_threshold_minor": 10_000_000}).status_code == 403
    assert client.post("/platform/demo/reset", headers=agent).status_code == 403
    assert client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 4000, "approval_threshold_minor": 100}).status_code == 200
    kinds = [a["kind"] for a in client.get("/workspace/activity", headers=founder_headers).json()["items"]]
    assert "exchange.policy_changed" in kinds
    assert client.post("/platform/demo/reset", headers=founder_headers).status_code == 200
    assert "platform.demo_reset" in [a["kind"] for a in client.get("/workspace/activity", headers=founder_headers).json()["items"]]


def test_public_bundles_need_a_human_admin_and_provenance_hides_principal_ids(seeded, client, founder_headers) -> None:
    bp = client.get("/studio/blueprints", headers=founder_headers).json()["items"][0]
    grant(client, "principal-unpriv", "tenant-founder", "memory.read", "memory.write")
    denied = client.post(f"/studio/blueprints/{bp['id']}/versions/1/publish", headers=hdr("principal-unpriv"), json={"visibility": "public"})
    assert denied.status_code == 403
    assert client.post(f"/studio/blueprints/{bp['id']}/versions/1/publish", headers=founder_headers, json={"visibility": "public"}).status_code == 200
    grant(client, "principal-other", "tenant-other", "memory.read")
    seen = client.get("/registry/packages/engine-labs/enquiry-assistant", headers=hdr("principal-other")).json()
    assert seen["provenance"]["published_by"] is None


def test_approved_but_unacceptable_quote_does_not_leave_a_reusable_approval(seeded, client, founder_headers) -> None:
    quote = client.get("/exchange/quotes", headers=founder_headers).json()["items"][0]
    first = accept(client, founder_headers, quote["id"]).json()
    client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 100, "approval_threshold_minor": 200})
    done = decide(client, founder_headers, first["approval"])
    assert done.status_code == 200 and done.json()["status"] == "superseded"
    assert done.json()["action_result"]["outcome"] == "not_accepted"
    client.post("/exchange/policy", headers=founder_headers, json={"budget_limit_minor": 5000, "approval_threshold_minor": 1000})
    assert accept(client, founder_headers, quote["id"]).status_code == 409  # quote declined; nothing creates a job
    assert client.get("/exchange/jobs", headers=founder_headers).json()["items"] == []


def test_quota_counts_only_live_quotes_and_policy_reads_do_not_write(seeded, client, founder_headers, monkeypatch) -> None:
    monkeypatch.setattr(foundation, "MAX_QUOTES", 1)
    again = client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "property-data-enrichment", "input": {"address": "2 B St"}})
    assert again.status_code == 429  # the seeded quote is open and counts
    store = client.app.state.store
    store.conn.execute("UPDATE fd_quotes SET expires_at='2000-01-01T00:00:00Z'")
    store.flush()
    assert client.post("/exchange/quotes", headers=founder_headers, json={"capability_id": "property-data-enrichment", "input": {"address": "2 B St"}}).status_code == 200
    client.post("/platform/demo/reset", headers=founder_headers)
    assert client.get("/exchange/policy", headers=founder_headers).json()["remaining_minor"] == 5000
    assert store.conn.execute("SELECT COUNT(*) AS n FROM fd_exchange_policy").fetchone()["n"] == 0
