#!/usr/bin/env python3
"""papership: command line for the Agent Registry.

  papership search "commercial property leasing" [--kind workflow]
  papership resolve "prepare a retail lease review" [--jurisdiction AU-NSW] [--budget 6000] [--max-age 180]
  papership install acme/leasing [--constraint "^1.2"] [--agent principal-id] [--to .papership/materials]
  papership publish ./independent-tour-manager        (folder with agent-package.json)
  papership publish ./some-skill --manifest m.json     (manifest kept outside the folder)
  papership report ard-123 success [--source ci]

Configuration comes from the environment only: PAPERSHIP_API_URL and PAPERSHIP_TOKEN (never printed).
Install writes text files and a papership.lock.json. It never runs anything inside a package, and it
skips code files (anything that is not plain data or prose, and all of scripts/ and bin/) unless you pass
--allow-scripts. It refuses plain-http URLs (except localhost) and never follows redirects. Standard library only.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SKIP_NAMES = {"node_modules", "__pycache__"}
NAME_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,38}/[a-z0-9][a-z0-9-]{0,38}", re.ASCII)
VERSION_RE = re.compile(r"[0-9]{1,9}\.[0-9]{1,9}\.[0-9]{1,9}", re.ASCII)
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
DATA_EXTENSIONS = {".md", ".markdown", ".txt", ".json", ".yaml", ".yml", ".csv", ".tsv", ".toml", ".xml"}


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """A redirect would carry the bearer token to another host, so refuse to follow any."""

    def redirect_request(self, *args, **kwargs):  # noqa: ANN002, ANN003
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def safe(text: object) -> str:
    """Third-party text printed to a terminal must not carry escape sequences or other control characters."""
    return "".join(ch if ch.isprintable() else "?" for ch in str(text))


def is_code_file(rel: str) -> bool:
    """Same rule as the Registry: anything that is not plain data or prose counts as code."""
    if rel.startswith(("scripts/", "bin/")):
        return True
    leaf = rel.rsplit("/", 1)[-1]
    dot = leaf.rfind(".")
    return (leaf[dot:].lower() if dot > 0 else "") not in DATA_EXTENSIONS


def api(method: str, path: str, body: dict | None = None) -> dict:
    base = os.environ.get("PAPERSHIP_API_URL", "").rstrip("/")
    token = os.environ.get("PAPERSHIP_TOKEN", "")
    if not base or not token:
        raise SystemExit("Set PAPERSHIP_API_URL and PAPERSHIP_TOKEN first.")
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in LOCAL_HOSTS):
        raise SystemExit("PAPERSHIP_API_URL must be https (plain http is only allowed for localhost).")
    request = urllib.request.Request(
        base + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={"content-type": "application/json", "authorization": f"Bearer {token}"},
        method=method,
    )
    try:
        with _OPENER.open(request, timeout=30) as response:  # noqa: S310 - operator-configured URL, redirects refused
            return json.loads(response.read(8_000_000).decode())
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read().decode()).get("detail")
        except Exception:  # noqa: BLE001
            detail = None
        raise SystemExit(f"Papership API {error.code}: {detail or 'request refused'}") from None
    except urllib.error.URLError as error:
        raise SystemExit(f"Papership API unreachable: {error.reason}") from None


def read_folder(folder: Path, manifest_file: str | None = None) -> tuple[dict, dict[str, str]]:
    """Folder contents become the package files. The manifest is folder/agent-package.json unless one is given,
    which lets an existing skill folder be published without copying it."""
    manifest_path = Path(manifest_file) if manifest_file else folder / "agent-package.json"
    if not manifest_path.is_file():
        raise SystemExit(f"{manifest_path} not found (a package needs agent-package.json)")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    files: dict[str, str] = {}
    for path in sorted(folder.rglob("*")):
        rel = path.relative_to(folder)
        if not path.is_file() or path.is_symlink() or rel.name == "agent-package.json":
            continue
        if any(part.startswith(".") or part in SKIP_NAMES for part in rel.parts):
            continue
        try:
            files[rel.as_posix()] = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise SystemExit(f"{rel} is not UTF-8 text; packages are text only") from None
    return manifest, files


def cmd_search(args: argparse.Namespace) -> None:
    query = urllib.parse.urlencode({"q": args.query, **({"kind": args.kind} if args.kind else {})})
    out = api("GET", f"/registry/packages?{query}")
    for item in out["items"]:
        price = item["license"]["class"] if item["license"]["class"] == "open" else f"{item['license']['class']} (metadata only)"
        print(safe(f"{item['name']}@{item['version']}  [{item['kind']}]  {price}  trust:{item['trust']}"))
        print(safe(f"    {item['description']}"))
    print(f"{out['total']} found")


def cmd_resolve(args: argparse.Namespace) -> None:
    body = {"task": args.task, "token_budget": args.budget, "runtime": "papership-cli"}
    if args.jurisdiction:
        body["jurisdiction"] = args.jurisdiction
    if args.max_age is not None:
        body["max_age_days"] = args.max_age
    if args.kind:
        body["kinds"] = args.kind
    out = api("POST", "/registry/resolve", body)
    if out["gap"]:
        print(f"[{out['delivery_id']}] gap: {out['gap']}")
        return
    print(f"[{out['delivery_id']}] {len(out['packages'])} packages, {out['tokens']} of {out['token_budget']} tokens")
    for pkg in out["packages"]:
        print(safe(f"  {pkg['name']}@{pkg['version']}  [{pkg['kind']}]  {pkg['delivered_passages']} passages"))
    if out["install"] and out["install"]["ok"]:
        print("  install: " + ", ".join(f"{i['name']}@{i['version']}" for i in out["install"]["lock"]))


def cmd_install(args: argparse.Namespace) -> None:
    body = {"name": args.name, "constraint": args.constraint, "allow_scripts": args.allow_scripts}
    if args.agent:
        body["agent_id"] = args.agent
    if not NAME_RE.fullmatch(args.name):
        raise SystemExit("name must look like publisher/package")
    out = api("POST", "/registry/install", body)
    target = Path(args.to)
    target.mkdir(parents=True, exist_ok=True)
    root = target.resolve()
    lock = []
    for item in out["lock"]:
        # Names and versions come from the server, so check them before they become path components.
        if not NAME_RE.fullmatch(str(item["name"])) or not VERSION_RE.fullmatch(str(item["version"])):
            raise SystemExit("the server returned an invalid package name or version; refusing to write files")
        pkg_path = urllib.parse.quote(item["name"], safe="/")
        version = api("GET", f"/registry/packages/{pkg_path}/versions/{item['version']}")
        folder = target / f"{item['name'].replace('/', '__')}@{item['version']}"
        if root not in folder.resolve().parents:
            raise SystemExit("refusing to write outside the install folder")
        written = 0
        for rel, text in version["files"].items():
            if is_code_file(rel) and not args.allow_scripts:
                continue
            dest = (folder / rel).resolve()
            if folder.resolve() not in dest.parents:
                raise SystemExit(f"refusing to write outside the install folder: {rel}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text, encoding="utf-8")
            written += 1
        lock.append({**item, "path": str(folder), "files_written": written})
        print(f"installed {item['name']}@{item['version']} -> {folder} ({written} files)")
    (target / "papership.lock.json").write_text(json.dumps({"packages": lock}, indent=2) + "\n", encoding="utf-8")


def cmd_publish(args: argparse.Namespace) -> None:
    manifest, files = read_folder(Path(args.folder), args.manifest)
    out = api("POST", "/registry/packages", {"manifest": manifest, "files": files})
    state = "published" if out.get("created") else "already published (identical content)"
    print(f"{out['name']}@{out['version']} {state}; {len(files)} files, {out['tokens']} tokens, visibility {out['visibility']}")


def cmd_report(args: argparse.Namespace) -> None:
    out = api("POST", "/registry/outcomes", {"delivery_id": args.delivery_id, "outcome": args.outcome, "source": args.source})
    print(f"recorded {out['outcome']} for {out['delivery_id']}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="papership", description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("query", nargs="?", default="")
    s.add_argument("--kind")
    s.set_defaults(fn=cmd_search)
    r = sub.add_parser("resolve")
    r.add_argument("task")
    r.add_argument("--jurisdiction")
    r.add_argument("--budget", type=int, default=6000)
    r.add_argument("--max-age", type=int)
    r.add_argument("--kind", action="append")
    r.set_defaults(fn=cmd_resolve)
    i = sub.add_parser("install")
    i.add_argument("name")
    i.add_argument("--constraint", default="*")
    i.add_argument("--agent")
    i.add_argument("--to", default=".papership/materials")
    i.add_argument("--allow-scripts", action="store_true")
    i.set_defaults(fn=cmd_install)
    p = sub.add_parser("publish")
    p.add_argument("folder")
    p.add_argument("--manifest", help="manifest file to use instead of folder/agent-package.json")
    p.set_defaults(fn=cmd_publish)
    o = sub.add_parser("report")
    o.add_argument("delivery_id")
    o.add_argument("outcome", choices=["success", "partial", "failure"])
    o.add_argument("--source", default="human", choices=["ci", "pr", "human", "agent"])
    o.set_defaults(fn=cmd_report)
    args = parser.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    try:
        main()
    except SystemExit as error:
        if isinstance(error.code, str):
            print(error.code, file=sys.stderr)
            sys.exit(1)
        raise
