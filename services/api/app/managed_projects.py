"""First managed project: Papership / Engine Labs (P-009). Quark and portability stay out of scope."""

from __future__ import annotations

from typing import Any

# Intake Phase 02 labels — B01–B24 and P01–P19 (exactly 43).
DOMAIN_LABELS: dict[str, str] = {
    "B01": "Strategy and governance",
    "B02": "Organisation structure",
    "B03": "People and capacity",
    "B04": "Customers and CRM",
    "B05": "Sales and commercial scope",
    "B06": "Projects and programmes",
    "B07": "Tasks and personal work",
    "B08": "Software and product delivery",
    "B09": "Service delivery and operations",
    "B10": "Customer support and success",
    "B11": "Knowledge and documents",
    "B12": "Communications and meetings",
    "B13": "Finance and accounting",
    "B14": "Treasury and payments",
    "B15": "Procurement and vendors",
    "B16": "Marketing and content",
    "B17": "Legal and risk",
    "B18": "IT and internal systems",
    "B19": "Inventory and physical assets",
    "B20": "Supply chain and field work",
    "B21": "Manufacturing and quality",
    "B22": "Research and innovation",
    "B23": "Stakeholders and external portals",
    "B24": "Sector-specific operations",
    "P01": "Agent workforce",
    "P02": "Profiles and identities",
    "P03": "Conversations and modes",
    "P04": "Agent execution",
    "P05": "Workflow orchestration",
    "P06": "Tools and connectors",
    "P07": "Data ingestion and synchronisation",
    "P08": "Business meaning and analytics",
    "P09": "Memory and retrieval",
    "P10": "Identity and authorisation",
    "P11": "Privacy and lifecycle",
    "P12": "Secrets and boundaries",
    "P13": "Audit and provenance",
    "P14": "Evaluation and improvement",
    "P15": "Member experience",
    "P16": "Adaptive views",
    "P17": "Health, reliability and recovery",
    "P18": "Usage and commercial controls",
    "P19": "Extensibility and domain packs",
}

ALL_DOMAIN_IDS = tuple(DOMAIN_LABELS.keys())

ENGINE_LABS_PROJECT_ID = "proj-engine-labs"
ENGINE_LABS_PROJECT_SLUG = "engine-labs"
ENGINE_LABS_PROJECT_NAME = "Papership / Engine Labs"
ENGINE_LABS_JOB_PURPOSE = "engine_labs.loop"

# Domains that still need a live connector before write — catalogue shells.
CONNECTOR_HEAVY_DOMAINS = frozenset(
    {
        "B04",
        "B05",
        "B09",
        "B10",
        "B12",
        "B13",
        "B14",
        "B15",
        "B16",
        "B17",
        "B18",
        "B19",
        "B20",
        "B21",
        "B22",
        "B24",
    }
)

# Capability rows this increment moves to configured (not working — no live GitHub open).
LOOP_CONFIGURED_CAPS: dict[str, dict[str, str]] = {
    "B08.01": {
        "user_outcome": (
            "Founder runs request → research → specification → plan → assignment → "
            "isolated change → tests → review → release proposal → monitoring → retained knowledge "
            "for the Papership/Engine Labs managed project"
        ),
        "acceptance_evidence": "services/api/tests/test_engine_labs_job.py",
        "status_evidence": "EV-EL-B08",
        "release_phase": "08 / R1",
    },
    "P01.01": {
        "user_outcome": "Founder sponsors an Engine Labs loop job with purpose, budget band and status",
        "acceptance_evidence": "services/api/tests/test_engine_labs_job.py",
        "status_evidence": "EV-EL-P01",
        "release_phase": "08 / R1",
    },
    "P04.01": {
        "user_outcome": "Founder starts, observes and cancels Engine Labs loop jobs with receipts; Hermes remains blocked for write tools",
        "acceptance_evidence": "services/api/tests/test_engine_labs_job.py",
        "status_evidence": "EV-EL-P04",
        "release_phase": "08 / R1",
    },
}


def domain_row_from_registry(domain_id: str, registry_row: dict[str, Any] | None) -> dict[str, Any]:
    label = DOMAIN_LABELS.get(domain_id, domain_id)
    status = (registry_row or {}).get("implementation_status") or "planned"
    return {
        "id": domain_id,
        "label": label,
        "status": status,
        "capability_id": (registry_row or {}).get("capability_id") or f"{domain_id}.01",
        "live_write": False,
        "needs_connection": domain_id in CONNECTOR_HEAVY_DOMAINS,
        "handoff": (
            "Needs a later connection. Live write is refused."
            if domain_id in CONNECTOR_HEAVY_DOMAINS
            else "Native or configured without inventing a live connector write."
        ),
    }


def full_domain_catalogue(registry_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_domain = {row.get("domain_id"): row for row in registry_items}
    return [domain_row_from_registry(domain_id, by_domain.get(domain_id)) for domain_id in ALL_DOMAIN_IDS]
