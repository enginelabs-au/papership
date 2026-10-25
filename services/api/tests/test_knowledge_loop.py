"""The knowledge loop: ingest real documents, resolve against a task, measure outcomes, learn from them."""

from __future__ import annotations

from pathlib import Path

import pytest

from app import knowledge_loop as kl
from app.store import Store

SECRET_FILE = ".en" + "v"  # built at runtime so no secret-looking filename sits in the source


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "billing.md").write_text(
        "# Billing\n\n## Charges\n\nCharges stay off until the owner sets ENGINE_BILLING_CHARGES_ENABLED. "
        "Never charge a card in tests.\n\n## Invoices\n\nInvoices are generated monthly from the rate card."
        " Invoice numbers are sequential per organisation.\n"
    )
    (tmp_path / "docs" / "deploy.md").write_text(
        "# Deploy\n\n## Vercel\n\nDeploy by pushing to main. Vercel builds the web app from the monorepo root "
        "and the API is not a Vercel project.\n"
    )
    (tmp_path / "docs" / "secret.md").write_text(
        "# Keys\n\n## Token\n\nUse ghp_" + "a" * 30 + " for the release script and never share it with anyone.\n"
    )
    (tmp_path / SECRET_FILE).write_text("TOKEN=abc\n")
    (tmp_path / "README.md").write_text("# Readme\n\nPapership is the knowledge layer for agents and their tasks.\n")
    return tmp_path


@pytest.fixture()
def store(tmp_path: Path) -> Store:
    s = Store(str(tmp_path / "kl.sqlite"))
    s.seed_founder()
    kl.migrate(s)
    return s


def test_ingest_indexes_real_content_and_never_secrets(store, repo) -> None:
    out = kl.ingest(store, "tenant-founder", repo)
    assert out["documents"] == 4 and out["chunks_added"] >= 4
    assert out["chunks_skipped_secret_shaped"] == 1
    texts = " ".join(r["text"] for r in store.conn.execute("SELECT text FROM kb_chunks").fetchall())
    assert "ghp_" not in texts and "TOKEN=abc" not in texts
    again = kl.ingest(store, "tenant-founder", repo)
    assert again["chunks_added"] == 0 and again["chunks_unchanged"] == out["chunks_added"]  # idempotent


def test_changed_text_becomes_a_new_version_and_old_one_is_not_served(store, repo) -> None:
    kl.ingest(store, "tenant-founder", repo)
    (repo / "docs" / "deploy.md").write_text("# Deploy\n\n## Vercel\n\nDeploy with the Vercel CLI to production only.\n")
    out = kl.ingest(store, "tenant-founder", repo)
    assert out["chunks_superseded"] >= 1
    pack = kl.resolve(store, "tenant-founder", "principal-founder", "how do I deploy to vercel")
    text = " ".join(c["text"] for c in pack["chunks"])
    assert "Vercel CLI" in text and "pushing to main" not in text
    (repo / "docs" / "deploy.md").unlink()
    kl.ingest(store, "tenant-founder", repo)
    assert kl.resolve(store, "tenant-founder", "principal-founder", "how do I deploy to vercel")["gap"] == "no_matching_context"


def test_resolve_reads_the_task_not_just_the_tenant(store, repo) -> None:
    kl.ingest(store, "tenant-founder", repo)
    pack = kl.resolve(store, "tenant-founder", "principal-founder", "fix the invoice numbering for the monthly rate card")
    assert pack["chunks"][0]["path"] == "docs/billing.md" and pack["chunks"][0]["heading"] == "Invoices"
    other = kl.resolve(store, "tenant-founder", "principal-founder", "push the web app to vercel")
    assert other["chunks"][0]["path"] == "docs/deploy.md"


def test_honest_gaps_and_budget(store, repo) -> None:
    empty = kl.resolve(store, "tenant-founder", "principal-founder", "anything at all")
    assert empty["gap"] == "no_indexed_knowledge" and empty["chunks"] == []
    kl.ingest(store, "tenant-founder", repo)
    assert kl.resolve(store, "tenant-founder", "principal-founder", "quantum chromodynamics lattice")["gap"] == "no_matching_context"
    small = kl.resolve(store, "tenant-founder", "principal-founder", "billing invoices charges vercel deploy", token_budget=200)
    assert small["tokens"] <= 200


def test_tenants_never_see_each_others_knowledge(store, repo) -> None:
    kl.ingest(store, "tenant-founder", repo)
    assert kl.resolve(store, "tenant-other", "principal-x", "invoice numbers")["chunks"] == []


def test_outcomes_drive_lift_and_lift_is_carried_into_ranking(store, repo) -> None:
    kl.ingest(store, "tenant-founder", repo)
    task = "invoice charges rate card billing"
    for _ in range(4):
        d = kl.resolve(store, "tenant-founder", "principal-founder", task)
        kl.record_outcome(store, "tenant-founder", d["delivery_id"], "failure", "ci", "tests red")
    for _ in range(4):
        d = kl.resolve(store, "tenant-founder", "principal-founder", "deploy vercel main")
        kl.record_outcome(store, "tenant-founder", d["delivery_id"], "success", "pr", "merged")
    table = kl.lift_table(store, "tenant-founder")
    assert table["resolved_deliveries"] == 8 and table["baseline_success_rate"] == 0.5
    worst = [i for i in table["items"] if i["reliable"] and i["lift"] < 0]
    assert worst and all(i["n"] >= kl.MIN_LIFT_SAMPLES for i in worst)
    after = kl.resolve(store, "tenant-founder", "principal-founder", task)
    carried = [c for c in after["chunks"] if c["lift"] and c["lift"]["lift"] < 0]
    assert carried and carried[0]["lift"]["n"] >= kl.MIN_LIFT_SAMPLES


def test_lift_is_not_trusted_below_the_sample_floor(store, repo) -> None:
    kl.ingest(store, "tenant-founder", repo)
    d = kl.resolve(store, "tenant-founder", "principal-founder", "invoice charges")
    kl.record_outcome(store, "tenant-founder", d["delivery_id"], "failure", "human")
    table = kl.lift_table(store, "tenant-founder")
    assert table["items"] and not any(i["reliable"] for i in table["items"])


def test_outcome_validation(store, repo) -> None:
    kl.ingest(store, "tenant-founder", repo)
    d = kl.resolve(store, "tenant-founder", "principal-founder", "invoice")
    for bad in (("great", "ci"), ("success", "vibes")):
        with pytest.raises(Exception):
            kl.record_outcome(store, "tenant-founder", d["delivery_id"], *bad)
    with pytest.raises(Exception):
        kl.record_outcome(store, "tenant-other", d["delivery_id"], "success", "ci")  # another tenant's delivery
    with pytest.raises(Exception):
        kl.record_outcome(store, "tenant-founder", d["delivery_id"], "success", "ci", "key ghp_" + "b" * 30)
    kl.record_outcome(store, "tenant-founder", d["delivery_id"], "failure", "ci")
    kl.record_outcome(store, "tenant-founder", d["delivery_id"], "success", "ci")  # same source updates, no duplicate
    assert store.conn.execute("SELECT COUNT(*) AS n FROM kb_outcomes").fetchone()["n"] == 1


def test_routes_and_grants(client, founder_headers, unpriv_headers) -> None:
    assert client.post("/knowledge/resolve", headers=unpriv_headers, json={"task": "x"}).status_code == 403
    assert client.post("/knowledge/ingest", headers=unpriv_headers).status_code == 403
    ing = client.post("/knowledge/ingest", headers=founder_headers)
    assert ing.status_code == 200 and ing.json()["documents"] > 5  # this repository's own docs
    pack = client.post(
        "/knowledge/resolve",
        headers=founder_headers,
        json={"task": "How do we deploy the web app to Vercel?", "runtime": "cursor", "model": "claude"},
    ).json()
    assert pack["chunks"] and pack["delivery_id"]
    out = client.post(
        "/knowledge/outcomes",
        headers=founder_headers,
        json={"delivery_id": pack["delivery_id"], "outcome": "success", "source": "human"},
    )
    assert out.status_code == 200
    loop = client.get("/knowledge/loop", headers=founder_headers).json()
    assert loop["deliveries"] == 1 and loop["lift"]["resolved_deliveries"] == 1 and loop["indexed_chunks"] > 20
    assert client.post("/knowledge/resolve", headers=founder_headers, json={"task": "x", "extra": 1}).status_code == 422
