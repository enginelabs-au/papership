"""Agent Registry hardening tests (AR-P1 security review remediation)."""

from __future__ import annotations

import time

import pytest

from app import registry
from app.store import StoreError
from tests.conftest import make_token
from tests.test_agent_registry import FOUNDER, files, manifest, pub, store  # noqa: F401  (store is a fixture)


def grant(client, principal: str, tenant: str, *classes: str) -> dict[str, str]:
    db = client.app.state.store
    for cls in classes:
        db.conn.execute(
            "INSERT INTO grants (id, principal_id, tenant_id, grant_class, scope) VALUES (?, ?, ?, ?, ?)",
            (f"g-{principal}-{cls}", principal, tenant, cls, "org"),
        )
    db.flush()
    return {"Authorization": f"Bearer {make_token(principal)}"}


@pytest.mark.parametrize(
    "over",
    [
        {"name": "acme/leasing\n"},
        {"name": "acme/leasing\u200b"},
        {"version": "1.0.\u0661"},
        {"version": "1.0.0\n"},
        {"description": "Deploy with postgres://admin:hunter22pw@db.internal/prod then migrate the schema."},
        {"description": "pass\u200bword = " + "a1B2c3D4e5F6g7"},
    ],
)
def test_hardened_manifest_rejections(store, over) -> None:  # noqa: F811
    with pytest.raises(StoreError):
        registry.validate_manifest(manifest(**over))


@pytest.mark.parametrize("name", ["papership/official", "anthropic/skills", "verified/acme"])
def test_reserved_publisher_slugs_cannot_be_claimed(store, name) -> None:  # noqa: F811
    with pytest.raises(StoreError) as err:
        pub(store, m=manifest(name=name))
    assert err.value.status_code == 403


@pytest.mark.parametrize("path", ["AGENTS.md", "docs/CLAUDE.md", "gemini.md", "x/.cursorrules.env", "kubeconfig", "deploy.pem"])
def test_reserved_and_credential_filenames_rejected(store, path) -> None:  # noqa: F811
    with pytest.raises(StoreError):
        registry.validate_files(files(**{path: "# t\n\nsome harmless prose for the file body."}))


def test_credential_split_by_zero_width_characters_is_still_caught(store) -> None:  # noqa: F811
    sneaky = "# t\n\nuse g\u200bhp_" + "a" * 30 + " to publish"
    with pytest.raises(StoreError):
        registry.validate_files(files(**{"references/x.md": sneaky}))


@pytest.mark.parametrize("filler", ["a", "ey-", "sk-a-", "ey.", "xoxb-", "a://", "password "])
def test_credential_scan_is_linear_on_adversarial_input(store, filler) -> None:  # noqa: F811
    start = time.monotonic()
    registry.credential_like((filler * 190_000)[:190_000])  # the verdict does not matter here, only the time
    assert time.monotonic() - start < 5


def test_json_quoted_assignments_and_invisible_characters_are_caught(store) -> None:  # noqa: F811
    quoted = '# t\n\n{"api_key": "abcd1234efgh5678"}'
    with pytest.raises(StoreError):
        registry.validate_files(files(**{"references/x.md": quoted}))
    bidi = "# t\n\nuse g\u200ehp_" + "a" * 30
    with pytest.raises(StoreError):
        registry.validate_files(files(**{"references/y.md": bidi}))


@pytest.mark.parametrize("field,value", [("description", "Leasing procedure \x1b]0;pwned\x07 for agents"), ("category", "prop\u202eerty"), ("tags", ["ok", "a\x1b[31mred"])])
def test_control_characters_in_the_manifest_are_rejected(store, field, value) -> None:  # noqa: F811
    with pytest.raises(StoreError):
        registry.validate_manifest(manifest(**{field: value}))


@pytest.mark.parametrize("path", ["AGENTS.override.md", "CLAUDE.local.md", "QWEN.md", "sub/CONVENTIONS.md"])
def test_more_auto_loaded_filenames_are_rejected(store, path) -> None:  # noqa: F811
    with pytest.raises(StoreError):
        registry.validate_files(files(**{path: "# t\n\nharmless prose for the body of this file."}))


def test_code_files_are_anything_that_is_not_data(store) -> None:  # noqa: F811
    for path in ("helper.py", "Makefile", "run.sh", "scripts/x.md", "bin/tool.txt", "page.html"):
        assert registry.is_code_file(path), path
    for path in ("SKILL.md", "refs/a.json", "data.csv", "notes.txt", "x.yaml"):
        assert not registry.is_code_file(path), path
    out = pub(store, f=files(**{"helper.py": "print('hi')\n"}))
    assert out["has_scripts"] is True


def test_per_tenant_quotas(store, monkeypatch) -> None:  # noqa: F811
    monkeypatch.setattr(registry, "MAX_PACKAGES_PER_TENANT", 1)
    pub(store)
    with pytest.raises(StoreError) as err:
        pub(store, m=manifest(name="acme/second"))
    assert err.value.status_code == 429
    monkeypatch.setattr(registry, "MAX_PACKAGES_PER_TENANT", 200)
    monkeypatch.setattr(registry, "MAX_VERSIONS_PER_TENANT", 1)
    with pytest.raises(StoreError) as err:
        pub(store, m=manifest(version="1.0.1"))
    assert err.value.status_code == 429


def test_visibility_is_per_version(client, founder_headers) -> None:
    other = grant(client, "principal-other", "tenant-other", "memory.read", "memory.write")
    private_files = files(
        **{"SKILL.md": "# Leasing\n\n## Secret playbook\n\nZebracorn internal negotiation floor numbers."}
    )
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(visibility="private"), "files": private_files})
    assert client.get("/registry/packages/acme/leasing", headers=other).status_code == 404
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(version="1.1.0", visibility="public"), "files": files()})
    pkg = client.get("/registry/packages/acme/leasing", headers=other).json()
    assert [v["version"] for v in pkg["versions"]] == ["1.1.0"]
    assert client.get("/registry/packages/acme/leasing/versions/1.0.0", headers=other).status_code == 404
    assert client.get("/registry/packages/acme/leasing/versions/1.1.0", headers=other).status_code == 200
    assert client.get("/registry/packages/acme/leasing/versions/1.0.0", headers=founder_headers).status_code == 200
    seen = client.post("/registry/resolve", headers=other, json={"task": "zebracorn negotiation floor numbers"}).json()
    assert "Zebracorn" not in str(seen)
    assert client.post("/registry/install", headers=other, json={"name": "acme/leasing", "constraint": "1.0.0"}).status_code in (404, 409)


def test_installs_count_distinct_organisations(client, founder_headers) -> None:
    other = grant(client, "principal-other", "tenant-other", "memory.read", "memory.write")
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(), "files": files()})
    for agent in ("principal-agent", "principal-founder"):
        client.post("/registry/install", headers=founder_headers, json={"name": "acme/leasing", "agent_id": agent})
    assert client.get("/registry/packages", headers=founder_headers).json()["items"][0]["installs"] == 1
    client.post("/registry/install", headers=other, json={"name": "acme/leasing"})
    assert client.get("/registry/packages", headers=founder_headers).json()["items"][0]["installs"] == 2


def test_dependency_graph_is_capped(store, monkeypatch) -> None:  # noqa: F811
    monkeypatch.setattr(registry, "MAX_LOCK_PACKAGES", 2)
    pub(store, m=manifest(name="acme/a"))
    pub(store, m=manifest(name="acme/b"))
    pub(store, m=manifest(name="acme/c"))
    pub(store, m=manifest(name="acme/root", requires={"acme/a": "*", "acme/b": "*"}))
    with pytest.raises(StoreError) as err:
        registry.resolve_dependencies(store, FOUNDER[0], {"acme/root": "*"})
    assert err.value.status_code == 409


def test_resolve_rejects_credentials_in_the_task(store) -> None:  # noqa: F811
    pub(store)
    with pytest.raises(StoreError):
        registry.resolve(store, FOUNDER[0], FOUNDER[1], "deploy using ghp_" + "a" * 30)


def test_publish_body_is_capped(client, founder_headers) -> None:
    huge = {"manifest": manifest(), "files": {"SKILL.md": "# t\n\n" + "a" * 3_000_000}}
    assert client.post("/registry/packages", headers=founder_headers, json=huge).status_code == 413


def test_agents_cannot_publish_public_or_forge_outcome_sources(client, founder_headers) -> None:
    agent = grant(client, "principal-agent", "tenant-founder", "memory.read", "memory.write")
    assert client.post("/registry/packages", headers=agent, json={"manifest": manifest(), "files": files()}).status_code == 403
    draft = {"manifest": manifest(visibility="private"), "files": files()}
    assert client.post("/registry/packages", headers=agent, json=draft).status_code == 200
    pack = client.post("/registry/resolve", headers=agent, json={"task": "negotiate the make-good clause"}).json()
    done = client.post(
        "/registry/outcomes", headers=agent,
        json={"delivery_id": pack["delivery_id"], "outcome": "success", "source": "human"},
    )
    assert done.json()["source"] == "agent"
    other_agent = client.post("/registry/install", headers=agent, json={"name": "acme/leasing", "agent_id": "principal-founder"})
    assert other_agent.status_code == 403
    assert client.post("/registry/install", headers=agent, json={"name": "acme/leasing"}).status_code == 200


def test_install_is_audited_with_its_target_agent(client, founder_headers) -> None:
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(), "files": files()})
    client.post("/registry/install", headers=founder_headers, json={"name": "acme/leasing", "agent_id": "principal-agent"})
    rows = client.app.state.store.conn.execute("SELECT target_id FROM audit_records WHERE action='registry.install'").fetchall()
    assert any("principal-agent" in r["target_id"] for r in rows)


def test_heading_parser_is_linear_on_a_long_whitespace_line() -> None:
    from app import knowledge_loop

    start = time.monotonic()
    knowledge_loop._split("# a" + " " * 190_000 + "b\n\n" + "body text that is long enough to keep as a section. " * 3)
    assert time.monotonic() - start < 5


def test_old_private_draft_does_not_hide_a_newer_public_version(client, founder_headers) -> None:
    other = grant(client, "principal-other", "tenant-other", "memory.read", "memory.write")
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(version="1.2.0"), "files": files()})
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(version="99.0.0", visibility="public"), "files": files()})
    # version 99.0.0 is the only visible-and-latest public one here; now a private 100.0.0 draft must not hide it
    draft = {"manifest": manifest(version="100.0.0", visibility="private"), "files": files()}
    client.post("/registry/packages", headers=founder_headers, json=draft)
    found = client.get("/registry/packages", headers=other, params={"q": "commercial leasing"}).json()["items"]
    assert found and found[0]["version"] == "99.0.0"


def test_stored_byte_quota(store, monkeypatch) -> None:  # noqa: F811
    pub(store)
    monkeypatch.setattr(registry, "MAX_TENANT_BYTES", 10)
    with pytest.raises(StoreError) as err:
        pub(store, m=manifest(version="1.0.1"))
    assert err.value.status_code == 429


def test_agents_cannot_yank_what_a_human_published(client, founder_headers) -> None:
    agent = grant(client, "principal-agent", "tenant-founder", "memory.read", "memory.write")
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(), "files": files()})
    assert client.post("/registry/packages/acme/leasing/versions/1.0.0/yank", headers=agent).status_code == 403
    assert client.post("/registry/packages/acme/leasing/versions/1.0.0/yank", headers=founder_headers).status_code == 200


def test_migration_adds_version_visibility_to_an_older_database(tmp_path) -> None:
    from app.store import Store

    s = Store(str(tmp_path / "old.sqlite"))
    s.seed_founder()
    s.conn.executescript(
        """CREATE TABLE ar_packages (name TEXT PRIMARY KEY, publisher_slug TEXT NOT NULL, tenant_id TEXT NOT NULL,
             visibility TEXT NOT NULL, created_at TEXT NOT NULL);
           CREATE TABLE ar_versions (id TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL, ver_major INTEGER NOT NULL,
             ver_minor INTEGER NOT NULL, ver_patch INTEGER NOT NULL, manifest_json TEXT NOT NULL, files_json TEXT NOT NULL,
             content_hash TEXT NOT NULL, tokens INTEGER NOT NULL, has_scripts INTEGER NOT NULL, status TEXT NOT NULL,
             published_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (name, version));
           INSERT INTO ar_packages VALUES ('a/b', 'a', 'tenant-founder', 'public', 'x');
           INSERT INTO ar_versions VALUES ('v1', 'a/b', '1.0.0', 1, 0, 0, '{}', '{}', 'h', 1, 0, 'published', 'p', 'x');"""
    )
    registry.migrate(s)
    assert s.conn.execute("SELECT visibility FROM ar_versions WHERE id='v1'").fetchone()["visibility"] == "public"
