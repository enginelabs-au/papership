"""Load the 43-row capability registry from docs/capabilities.md."""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.store import CAPABILITY_IDS

ROW_RE = re.compile(r"^\| (B|P)[0-9]{2} \| (B|P)[0-9]{2}\.[0-9]{2} \|")

DOMAIN_LABELS = {
    "B01": "Strategy, goals, KPIs, initiatives, board",
    "B02": "Organisation, entities, teams, reporting lines",
    "B03": "People, HR, leave, payroll references",
    "B04": "CRM, accounts, opportunities, consent",
    "B05": "Enquiries, proposals, contracts, signatures",
    "B06": "Plans, milestones, dependencies, acceptance",
    "B07": "Priorities, assignments, blockers, approvals",
    "B08": "Development loop — isolated change, review, release proposal",
    "B09": "Operations, SOPs, work orders, SLAs",
    "B10": "Support tickets, adoption, retention",
    "B11": "Knowledge, decisions, evidence, document intake",
    "B12": "Comms — email, chat, calendar, transcripts",
    "B13": "Finance, invoices, budgets (source system)",
    "B14": "Treasury, payments (designated authority + reauth)",
    "B15": "Procurement, vendors, subscriptions",
    "B16": "Marketing, campaigns, publishing",
    "B17": "Legal, risk, compliance, privacy requests",
    "B18": "IT, devices, access, cloud",
    "B19": "Inventory, facilities",
    "B20": "Field, dispatch, offline capture",
    "B21": "Quality, BOM, inspections",
    "B22": "Research, experiments, IP",
    "B23": "Guests, partners, scoped review",
    "B24": "Sector packs — care, grants, education",
    "P01": "Agent record — sponsor, skills, budget, status",
    "P02": "Identity, membership, seats",
    "P03": "Hey Engine, modes, persisted sessions",
    "P04": "Runs, steps, receipts, pause / cancel / recover",
    "P05": "Durable jobs — close never cancels",
    "P06": "Capability registry and connector catalogue",
    "P07": "Sync, lineage, freshness",
    "P08": "Canonical metrics and deterministic reports",
    "P09": "Governed memory",
    "P10": "Grants — row, field and action control",
    "P11": "Retention, export, erasure",
    "P12": "Secrets off desktop, isolated workers",
    "P13": "Audit and provenance",
    "P14": "Outcome metrics — completion, correctness, recovery",
    "P15": "Desktop shell and locale en-AU",
    "P16": "Adaptive views — pin, undo, reset, fallback",
    "P17": "Health, queues, backups",
    "P18": "Usage events (no published prices)",
    "P19": "Connector SDK and domain packs",
}

COLUMNS = (
    "domain_id",
    "capability_id",
    "user_outcome",
    "owner",
    "read_actions",
    "write_actions",
    "data_authority",
    "required_grants",
    "dependencies",
    "interface_components",
    "release_phase",
    "implementation_status",
    "acceptance_evidence",
    "registry_version",
    "status_changed_at",
    "status_evidence",
)


def capabilities_path() -> Path:
    return Path(__file__).resolve().parents[3] / "docs" / "capabilities.md"


def parse_capabilities_markdown(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in text.splitlines():
        if not ROW_RE.match(line):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < len(COLUMNS):
            continue
        data = dict(zip(COLUMNS, cells, strict=False))
        data["hermes_side_effecting_tool"] = False
        data["hermes_side_effecting_tools"] = "catalogued"
        rows.append(data)
    by_id = {row["capability_id"]: row for row in rows}
    missing = [cap for cap in CAPABILITY_IDS if cap not in by_id]
    if missing:
        raise ValueError(f"capabilities.md missing rows: {missing}")
    extra = [cap for cap in by_id if cap not in CAPABILITY_IDS]
    if extra:
        raise ValueError(f"capabilities.md extra rows: {extra}")
    return [by_id[cap] for cap in CAPABILITY_IDS]


@lru_cache(maxsize=1)
def load_capability_rows() -> tuple[dict[str, Any], ...]:
    path = capabilities_path()
    return tuple(parse_capabilities_markdown(path.read_text(encoding="utf-8")))


def domain_catalogue_items(rows: list[dict[str, Any]] | tuple[dict[str, Any], ...] | None = None) -> list[dict[str, Any]]:
    source = list(rows) if rows is not None else list(load_capability_rows())
    items = []
    for row in source:
        domain_id = row["domain_id"]
        owner = row.get("owner") or ""
        status = row.get("implementation_status") or "planned"
        needs_connection = "connector:" in owner
        items.append(
            {
                "id": domain_id,
                "capability_id": row["capability_id"],
                "label": DOMAIN_LABELS.get(domain_id, row.get("user_outcome") or domain_id),
                "status": status,
                "owner": owner,
                "live_write": False,
                "needs_connection": needs_connection,
                "handoff": (
                    "Needs a later connection. Live write is refused."
                    if needs_connection
                    else "Native capability. Live source connect is still refused."
                ),
            }
        )
    return items
