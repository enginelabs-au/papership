"""Agent Registry: untrusted uploads in, immutable versions, search, dependencies, install, resolve, outcomes."""

from __future__ import annotations

from pathlib import Path

import pytest

from app import knowledge_loop, registry
from app.store import Store, StoreError
from tests.conftest import make_token

FOUNDER = ("tenant-founder", "principal-founder")
OTHER = ("tenant-other", "principal-other")
CRED_FILE = ".en" + "v"  # built at runtime so no credential-looking filename sits in this source


def manifest(name="acme/leasing", version="1.0.0", **over):
    base = {
        "schema": registry.SCHEMA, "name": name, "version": version, "kind": "context-pack",
        "description": "Commercial property leasing procedure for agents working in Australia.",
        "category": "property", "tags": ["leasing", "property"], "jurisdiction": ["AU"],
        "compatible": ["agent-skills", "claude"], "license": {"class": "open", "spdx": "CC-BY-4.0"},
        "visibility": "public",
    }
    base.update(over)
    return base


def files(**over):
    base = {
        "SKILL.md": "# Leasing\n\n## Inspection process\n\nInspect the premises, record defects, and photograph "
        "the make-good condition before negotiating the lease incentive.\n\n## Negotiation\n\nOpen with the "
        "rent-free period, then outgoings caps, then the make-good clause and the bank guarantee amount.\n",
        "references/clauses.md": "# Common clauses\n\n## Make good\n\nMake-good clauses require the tenant to "
        "reinstate the premises on expiry. Check the reinstatement schedule against the condition report.\n",
    }
    base.update(over)
    return base


@pytest.fixture()
def store(tmp_path: Path) -> Store:
    s = Store(str(tmp_path / "ar.sqlite"))
    s.seed_founder()
    knowledge_loop.migrate(s)
    registry.migrate(s)
    return s


def pub(store, who=FOUNDER, m=None, f=None):
    return registry.publish(store, who[0], who[1], m or manifest(), f or files())


# ---- validation ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "over",
    [
        {"schema": "other/1"}, {"name": "Acme/Leasing"}, {"name": "leasing"}, {"name": "a/b/c"}, {"version": "1.0"},
        {"version": "v1.0.0"}, {"kind": "agent"}, {"description": "short"}, {"unknown_field": 1},
        {"jurisdiction": ["Australia"]}, {"requires": {"acme/x": "banana"}}, {"requires": {"acme/leasing": "*"}},
        {"license": {"class": "premium"}}, {"license": {"class": "open", "pricing": {"amount": 1, "unit": "install"}}},
        {"license": {"class": "premium", "pricing": {"amount": -1, "unit": "install"}}},
        {"license": {"class": "free"}}, {"visibility": "everyone"}, {"tags": "leasing"},
        {"description": "Use ghp_" + "a" * 30 + " for the release process."},
    ],
)
def test_bad_manifests_are_rejected(store, over) -> None:
    with pytest.raises(StoreError) as err:
        registry.validate_manifest(manifest(**over))
    assert err.value.status_code == 422


def test_good_manifest_normalises(store) -> None:
    clean = registry.validate_manifest(
        manifest(tags=["Leasing", "leasing"], jurisdiction=["au-nsw"], requires={"acme/z": "^1.2", "acme/a": ">=1"})
    )
    assert clean["tags"] == ["leasing"] and clean["jurisdiction"] == ["AU-NSW"]
    assert list(clean["requires"]) == ["acme/a", "acme/z"]
    paid = registry.validate_manifest(manifest(license={"class": "metered", "pricing": {"currency": "AUD", "amount": 0.04, "unit": "invocation"}}))
    assert paid["license"]["pricing"]["amount"] == 0.04


@pytest.mark.parametrize(
    "bad",
    [
        {"../evil.md": "# x\n\nsome text that is long enough to be a section"},
        {"/abs.md": "# x"}, {"a//b.md": "# x"}, {"a\\b.md": "# x"}, {".hidden.md": "# x"}, {"dir/.git/config.md": "# x"},
        {"agent-package.json": "{}"}, {CRED_FILE: "A=1", "ok.md": "# ok"},
        {"ok.md": "# Keys\n\nuse ghp_" + "b" * 30 + " here for everything"},
        {"ok.md": "# bin\n\n\x00\x01 binary"}, {"ok.md": "x" * (registry.MAX_FILE_BYTES + 1)},
        {"notes.txt": "no markdown anywhere in this package"}, {},
    ],
)
def test_unsafe_files_are_rejected(store, bad) -> None:
    with pytest.raises(StoreError) as err:
        registry.validate_files(bad)
    assert err.value.status_code == 422


def test_package_size_limits(store) -> None:
    many = {f"f{i}.md": "# t\n\nbody body body" for i in range(registry.MAX_FILES + 1)}
    with pytest.raises(StoreError):
        registry.validate_files(many)
    big = {f"f{i}.md": "x" * 190_000 for i in range(7)}
    with pytest.raises(StoreError):
        registry.validate_files(big)


# ---- publish, immutability, ownership ------------------------------------------------------


def test_publish_is_immutable_and_idempotent(store) -> None:
    first = pub(store)
    assert first["created"] is True and first["status"] == "published" and first["trust"] == "unreviewed"
    again = pub(store)
    assert again["created"] is False and again["content_hash"] == first["content_hash"]
    with pytest.raises(StoreError) as err:
        pub(store, f=files(**{"SKILL.md": "# Leasing\n\nChanged text that is long enough to be indexed as a section."}))
    assert err.value.status_code == 409
    assert pub(store, m=manifest(version="1.1.0"))["created"] is True


def test_namespace_belongs_to_the_first_organisation(store) -> None:
    pub(store)
    with pytest.raises(StoreError) as err:
        pub(store, who=OTHER, m=manifest(name="acme/other-thing"))
    assert err.value.status_code == 403
    assert pub(store, who=OTHER, m=manifest(name="rival/leasing"))["created"] is True


def test_visibility_rules(store) -> None:
    pub(store, m=manifest(visibility="private"))
    assert registry.search(store, OTHER[0], "leasing")["items"] == []
    with pytest.raises(StoreError) as err:
        registry.get_package(store, OTHER[0], "acme/leasing")
    assert err.value.status_code == 404
    assert registry.search(store, FOUNDER[0], "leasing")["items"]
    pub(store, m=manifest(version="1.0.1", visibility="public"))  # private -> public is an explicit choice
    assert registry.search(store, OTHER[0], "leasing")["items"]
    with pytest.raises(StoreError) as err:
        pub(store, m=manifest(version="1.0.2", visibility="private"))
    assert err.value.status_code == 409


def test_scripts_are_stored_flagged_and_never_indexed(store) -> None:
    out = pub(store, f=files(**{"scripts/run.sh": "#!/bin/sh\necho make-good clause banana-split-unique\n"}))
    assert out["has_scripts"] is True
    assert registry.search(store, FOUNDER[0], "banana-split-unique")["items"] == []
    got = registry.get_version(store, FOUNDER[0], "acme/leasing", "1.0.0")
    assert "scripts/run.sh" in got["files"] and "never executes" in got["notice"]


# ---- semver and dependencies ---------------------------------------------------------------


@pytest.mark.parametrize(
    "constraint,version,ok",
    [
        ("*", "9.9.9", True), ("1.2.3", "1.2.3", True), ("1.2.3", "1.2.4", False), (">=1.2", "1.2.0", True),
        (">=1.2", "1.1.9", False), (">1.2.3", "1.2.3", False), ("<2", "1.99.0", True), ("<=1.0.0", "1.0.1", False),
        ("^1.2.3", "1.9.0", True), ("^1.2.3", "2.0.0", False), ("^0.2.3", "0.2.9", True), ("^0.2.3", "0.3.0", False),
        ("~1.2.3", "1.2.9", True), ("~1.2.3", "1.3.0", False), ("==1.0.0", "1.0.0", True),
    ],
)
def test_constraints(constraint, version, ok) -> None:
    assert registry.parse_constraint(constraint)(registry.parse_version(version)) is ok


def test_dependency_resolution_picks_highest_satisfying(store) -> None:
    for v in ("1.0.0", "2.0.0", "2.1.0"):
        pub(store, m=manifest(name="acme/base", version=v))
    pub(store, m=manifest(name="acme/app", requires={"acme/base": "^2.0.0"}))
    lock = registry.install(store, *FOUNDER, "acme/app")["lock"]
    assert {i["name"]: i["version"] for i in lock} == {"acme/app": "1.0.0", "acme/base": "2.1.0"}


def test_dependency_conflict_missing_and_cycle(store) -> None:
    pub(store, m=manifest(name="acme/base", version="1.0.0"))
    pub(store, m=manifest(name="acme/a", requires={"acme/base": "^2.0.0"}))
    with pytest.raises(StoreError) as err:
        registry.resolve_dependencies(store, FOUNDER[0], {"acme/a": "*"})
    assert err.value.status_code == 409 and "acme/base" in str(err.value)
    pub(store, m=manifest(name="acme/b", requires={"acme/ghost": "*"}))
    with pytest.raises(StoreError) as err:
        registry.resolve_dependencies(store, FOUNDER[0], {"acme/b": "*"})
    assert err.value.status_code == 404
    pub(store, m=manifest(name="acme/c1", requires={"acme/c2": "*"}))
    pub(store, m=manifest(name="acme/c2", requires={"acme/c1": "*"}))
    assert len(registry.resolve_dependencies(store, FOUNDER[0], {"acme/c1": "*"})) == 2


def test_install_records_per_agent_and_guards_scripts(store) -> None:
    pub(store, m=manifest(name="acme/scripted"), f=files(**{"scripts/x.py": "print(1)\n"}))
    with pytest.raises(StoreError) as err:
        registry.install(store, FOUNDER[0], FOUNDER[1], "acme/scripted")
    assert err.value.status_code == 409 and "never runs" in str(err.value)
    out = registry.install(store, FOUNDER[0], FOUNDER[1], "acme/scripted", agent_id="principal-agent", allow_scripts=True)
    assert out["agent_id"] == "principal-agent" and out["charged"] == 0
    rows = registry.list_installs(store, FOUNDER[0], "principal-agent")
    assert rows[0]["name"] == "acme/scripted" and registry.list_installs(store, FOUNDER[0], FOUNDER[1]) == []
    with pytest.raises(StoreError) as err:
        registry.install(store, FOUNDER[0], FOUNDER[1], "acme/scripted", agent_id="principal-other", allow_scripts=True)
    assert err.value.status_code == 404  # another organisation's principal


def test_yank_hides_from_search_and_resolution_but_not_exact_download(store) -> None:
    pub(store)
    registry.yank(store, FOUNDER[0], "acme/leasing", "1.0.0")
    assert registry.search(store, FOUNDER[0], "leasing")["items"] == []
    assert registry.resolve(store, *FOUNDER, "negotiate the make-good clause")["gap"] is not None
    with pytest.raises(StoreError):
        registry.install(store, FOUNDER[0], FOUNDER[1], "acme/leasing")
    assert registry.get_version(store, FOUNDER[0], "acme/leasing", "1.0.0")["status"] == "yanked"
    with pytest.raises(StoreError) as err:
        registry.yank(store, OTHER[0], "acme/leasing", "1.0.0")
    assert err.value.status_code == 404


# ---- search and resolve --------------------------------------------------------------------


def seed_two(store):
    pub(store)
    pub(
        store,
        m=manifest(name="acme/touring", kind="workflow", description="Advancing a live music show: riders, settlement and show-day.", jurisdiction=[], tags=["touring"]),
        f={"SKILL.md": "# Touring\n\n## Settlement\n\nSettle the show against the rider and the guarantee after the "
           "last band leaves the stage. Record the door split and the merchandise percentage.\n"},
    )


def test_search_ranks_by_relevance_and_filters_kind(store) -> None:
    seed_two(store)
    assert registry.search(store, FOUNDER[0], "commercial property leasing")["items"][0]["name"] == "acme/leasing"
    assert registry.search(store, FOUNDER[0], "show settlement rider")["items"][0]["name"] == "acme/touring"
    assert [i["name"] for i in registry.search(store, FOUNDER[0], "", kind="workflow")["items"]] == ["acme/touring"]
    assert registry.search(store, FOUNDER[0], "")["total"] == 2
    assert registry.search(store, FOUNDER[0], "quantum lattice")["items"] == []
    with pytest.raises(StoreError):
        registry.search(store, FOUNDER[0], "x", kind="agent")


def test_resolve_reads_the_task_and_returns_an_install_plan(store) -> None:
    seed_two(store)
    out = registry.resolve(store, *FOUNDER, "review the make-good clause before negotiating a lease", runtime="cursor")
    assert out["packages"][0]["name"] == "acme/leasing" and all(p["name"] != "acme/touring" for p in out["packages"])
    assert out["chunks"][0]["package"] == "acme/leasing" and out["delivery_id"].startswith("ard-")
    assert out["install"]["ok"] and out["install"]["lock"][0]["name"] == "acme/leasing"
    assert out["cost"] == {"charged": 0, "charges_enabled": False}
    other = registry.resolve(store, *FOUNDER, "settle the show against the rider")
    assert other["packages"][0]["name"] == "acme/touring"


def test_resolve_filters_budget_and_gaps(store) -> None:
    assert registry.resolve(store, *FOUNDER, "anything at all")["gap"] == "registry_empty"
    seed_two(store)
    task = "make-good clause lease inspection settlement rider show"
    assert registry.resolve(store, *FOUNDER, "zzqx vorpal frobnicate")["gap"] == "no_matching_material"
    nsw = registry.resolve(store, *FOUNDER, task, jurisdiction="AU-NSW")  # AU pack matches an AU-NSW request
    assert any(p["name"] == "acme/leasing" for p in nsw["packages"])
    uk = registry.resolve(store, *FOUNDER, task, jurisdiction="GB")
    assert all(p["name"] != "acme/leasing" for p in uk["packages"])  # AU-only pack excluded; global pack kept
    assert registry.resolve(store, *FOUNDER, "settle the show against the rider", kinds=["workflow"])["packages"][0]["name"] == "acme/touring"
    assert registry.resolve(store, *FOUNDER, "settle the show against the rider", kinds=["skill"])["gap"] == "filtered_out"
    assert registry.resolve(store, *FOUNDER, task, trust="verified")["gap"] == "filtered_out"  # no review process yet
    assert registry.resolve(store, *FOUNDER, task, max_age_days=30)["packages"]
    store.conn.execute("UPDATE ar_versions SET created_at='2020-01-01T00:00:00Z' WHERE name='acme/leasing'")
    store.flush()
    stale = registry.resolve(store, *FOUNDER, task, max_age_days=30)
    assert all(p["name"] != "acme/leasing" for p in stale["packages"])  # too old for this request
    assert any(p["name"] == "acme/leasing" for p in registry.resolve(store, *FOUNDER, task)["packages"])
    small = registry.resolve(store, *FOUNDER, task, token_budget=200)
    assert small["tokens"] <= 200
    with pytest.raises(StoreError):
        registry.resolve(store, *FOUNDER, task, trust="gold")
    with pytest.raises(StoreError):
        registry.resolve(store, *FOUNDER, task, kinds=["agent"])


def test_one_shared_word_is_not_relevance(store) -> None:
    seed_two(store)
    # "commercial" appears in the leasing pack, but the task is about something the pack does not cover.
    out = registry.resolve(store, *FOUNDER, "commercial kitchen hygiene audit schedule")
    assert out["packages"] == [] and out["gap"] == "no_matching_material"
    assert registry.resolve(store, *FOUNDER, "commercial lease")["packages"][0]["name"] == "acme/leasing"


def test_resolve_respects_visibility(store) -> None:
    pub(store, m=manifest(visibility="private"))
    assert registry.resolve(store, *OTHER, "negotiate the make-good clause")["packages"] == []
    assert registry.resolve(store, *FOUNDER, "negotiate the make-good clause")["packages"]


# ---- measure and learn ---------------------------------------------------------------------


def test_outcomes_drive_lift_and_ranking_after_the_floor(store) -> None:
    seed_two(store)
    task = "negotiate the make-good clause on the lease"
    for _ in range(4):
        d = registry.resolve(store, *FOUNDER, task)
        registry.record_outcome(store, FOUNDER[0], d["delivery_id"], "failure", "ci", "tests red")
    for _ in range(4):
        d = registry.resolve(store, *FOUNDER, "settle the show against the rider")
        registry.record_outcome(store, FOUNDER[0], d["delivery_id"], "success", "pr", "merged")
    table = registry.lift_table(store, FOUNDER[0])
    assert table["resolved_deliveries"] == 8 and table["baseline_success_rate"] == 0.5
    by_key = {i["key"]: i for i in table["items"]}
    assert by_key["acme/leasing@1.0.0"]["lift"] < 0 < by_key["acme/touring@1.0.0"]["lift"]
    assert all(i["reliable"] for i in table["items"])
    after = registry.resolve(store, *FOUNDER, task)
    assert after["packages"][0]["lift"]["lift"] < 0  # damped and shown, with its sample size
    assert "association" in table["note"].lower()


def test_lift_is_not_trusted_below_the_floor_and_outcomes_validate(store) -> None:
    pub(store)
    d = registry.resolve(store, *FOUNDER, "negotiate the make-good clause")
    registry.record_outcome(store, FOUNDER[0], d["delivery_id"], "failure", "human")
    assert not any(i["reliable"] for i in registry.lift_table(store, FOUNDER[0])["items"])
    for args in (("great", "ci"), ("success", "vibes")):
        with pytest.raises(StoreError):
            registry.record_outcome(store, FOUNDER[0], d["delivery_id"], *args)
    with pytest.raises(StoreError) as err:
        registry.record_outcome(store, OTHER[0], d["delivery_id"], "success", "ci")
    assert err.value.status_code == 404
    with pytest.raises(StoreError) as err:
        registry.record_outcome(store, FOUNDER[0], d["delivery_id"], "success", "ci", "key ghp_" + "c" * 30)
    assert err.value.status_code == 403
    registry.record_outcome(store, FOUNDER[0], d["delivery_id"], "success", "human")  # same source updates
    assert store.conn.execute("SELECT COUNT(*) AS n FROM ar_outcomes").fetchone()["n"] == 1


def test_gaps_are_reported_as_publisher_demand(store) -> None:
    pub(store)
    registry.resolve(store, *FOUNDER, "iso27001 implementation roadmap")
    gaps = registry.summary(store, FOUNDER[0])["demand_gaps"]
    assert gaps and gaps[0]["task"].startswith("iso27001") and gaps[0]["gap"] == "no_matching_material"


# ---- routes --------------------------------------------------------------------------------


def test_routes_end_to_end_and_grants(client, founder_headers, unpriv_headers) -> None:
    body = {"manifest": manifest(), "files": files()}
    assert client.post("/registry/packages", headers=unpriv_headers, json=body).status_code == 403
    assert client.get("/registry/packages", headers=unpriv_headers).status_code == 403
    out = client.post("/registry/packages", headers=founder_headers, json=body)
    assert out.status_code == 200 and out.json()["created"] is True
    assert client.post("/registry/packages", headers=founder_headers, json={**body, "extra": 1}).status_code == 422
    bad = client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(version="x"), "files": files()})
    assert bad.status_code == 422
    found = client.get("/registry/packages", headers=founder_headers, params={"q": "commercial leasing"}).json()
    assert found["items"][0]["name"] == "acme/leasing"
    assert client.get("/registry/packages/acme/leasing", headers=founder_headers).json()["versions"][0]["version"] == "1.0.0"
    v = client.get("/registry/packages/acme/leasing/versions/1.0.0", headers=founder_headers).json()
    assert v["files"]["SKILL.md"].startswith("# Leasing") and v["manifest"]["license"]["class"] == "open"
    inst = client.post("/registry/install", headers=founder_headers, json={"name": "acme/leasing", "agent_id": "principal-agent"})
    assert inst.status_code == 200 and inst.json()["lock"][0]["version"] == "1.0.0"
    assert client.get("/registry/installs", headers=founder_headers, params={"agent_id": "principal-agent"}).json()["items"]
    pack = client.post("/registry/resolve", headers=founder_headers, json={"task": "negotiate the make-good clause", "jurisdiction": "AU-NSW"}).json()
    assert pack["packages"][0]["name"] == "acme/leasing"
    done = client.post("/registry/outcomes", headers=founder_headers, json={"delivery_id": pack["delivery_id"], "outcome": "success", "source": "human"})
    assert done.status_code == 200
    loop = client.get("/registry/loop", headers=founder_headers).json()
    assert loop["visible_packages"] == 1 and loop["deliveries"] == 1 and loop["installs"] == 1 and loop["charges"] == "off"
    assert client.post("/registry/packages/acme/leasing/versions/1.0.0/yank", headers=unpriv_headers).status_code == 403
    assert client.post("/registry/packages/acme/leasing/versions/1.0.0/yank", headers=founder_headers).json()["status"] == "yanked"


def test_another_organisation_sees_public_only(client, founder_headers) -> None:
    store = client.app.state.store
    for cls in ("memory.read", "memory.write"):
        store.conn.execute(
            "INSERT INTO grants (id, principal_id, tenant_id, grant_class, scope) VALUES (?, ?, ?, ?, ?)",
            (f"g-{cls}", "principal-other", "tenant-other", cls, "org"),
        )
    store.flush()
    other = {"Authorization": f"Bearer {make_token('principal-other')}"}
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(visibility="public"), "files": files()})
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(name="acme/hidden", visibility="private"), "files": files()})
    names = [i["name"] for i in client.get("/registry/packages", headers=other).json()["items"]]
    assert names == ["acme/leasing"]
    assert client.get("/registry/packages/acme/hidden", headers=other).status_code == 404
    squat = client.post("/registry/packages", headers=other, json={"manifest": manifest(name="acme/evil"), "files": files()})
    assert squat.status_code == 403
    mine = client.post("/registry/packages", headers=other, json={"manifest": manifest(name="rival/pack"), "files": files()})
    assert mine.status_code == 200
    assert client.get("/registry/loop", headers=other).json()["own_packages"] == 1
