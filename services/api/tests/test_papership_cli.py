"""scripts/papership.py installs text safely and refuses unsafe servers and URLs."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

from tests.test_agent_registry import files, manifest

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "papership.py"


@pytest.fixture()
def cli(client, founder_headers, monkeypatch):
    spec = importlib.util.spec_from_file_location("papership_cli", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    def via_client(method: str, path: str, body: dict | None = None) -> dict:
        response = client.request(method, path, headers=founder_headers, json=body)
        if response.status_code != 200:
            raise SystemExit(f"Papership API {response.status_code}: {response.json().get('detail')}")
        return response.json()

    monkeypatch.setattr(module, "api", via_client)
    return module


def run(cli, *argv: str) -> None:
    cli.main(list(argv))


def test_install_writes_text_skips_code_and_writes_a_lock(client, founder_headers, cli, tmp_path, capsys) -> None:
    pkg = files(**{"helper.py": "print('x')\n"})
    client.post("/registry/packages", headers=founder_headers, json={"manifest": manifest(), "files": pkg})
    dest = tmp_path / "m"
    with pytest.raises(SystemExit):  # the package has code, so a plain install is refused by the server
        run(cli, "install", "acme/leasing", "--to", str(dest))
    run(cli, "install", "acme/leasing", "--to", str(dest), "--allow-scripts")
    assert (dest / "acme__leasing@1.0.0" / "helper.py").is_file()
    assert json.loads((dest / "papership.lock.json").read_text())["packages"][0]["name"] == "acme/leasing"


def test_code_is_not_written_without_allow_scripts(cli) -> None:
    for rel in ("scripts/x.md", "run.sh", "helper.py", "Makefile", "bin/t.txt"):
        assert cli.is_code_file(rel), rel
    for rel in ("SKILL.md", "refs/a.json", "notes.txt"):
        assert not cli.is_code_file(rel), rel


def test_a_hostile_server_cannot_steer_paths(cli, monkeypatch, tmp_path) -> None:
    def evil(method: str, path: str, body: dict | None = None) -> dict:
        return {"lock": [{"name": "../../etc", "version": "1.0.0", "has_scripts": False}]}

    monkeypatch.setattr(cli, "api", evil)
    with pytest.raises(SystemExit):
        run(cli, "install", "acme/leasing", "--to", str(tmp_path / "m"))
    assert not list(tmp_path.glob("**/etc*"))


def test_bad_name_and_plain_http_are_refused(cli, monkeypatch) -> None:
    with pytest.raises(SystemExit):
        run(cli, "install", "../../x")
    spec = importlib.util.spec_from_file_location("papership_cli2", SCRIPT)
    raw = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(raw)
    monkeypatch.setenv("PAPERSHIP_API_URL", "http://registry.example.com")
    monkeypatch.setenv("PAPERSHIP_TOKEN", "t")
    with pytest.raises(SystemExit, match="https"):
        raw.api("GET", "/registry/loop")
