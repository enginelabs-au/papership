"""Seed data and the deterministic demo runtime for the platform foundation.

Everything here is fictional and labelled as such. The runtime is a pure function: it does not call a
model, a network, an email system or a CRM. It exists so the connected workflow (Studio, Registry,
Workspace, Exchange) can be exercised and tested without credentials, and so evaluation fixtures have
something deterministic to check. Its output is a template filled from the task input and the
materials installed on the agent; it is not evidence of model quality.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

ADAPTER = "papership-demo-runtime"
PUBLISHER = "engine-labs"
WORKFLOW = f"{PUBLISHER}/enquiry-response-workflow"
TERMINOLOGY = f"{PUBLISHER}/property-terminology"
POLICY_PACK = f"{PUBLISHER}/enquiry-approval-policy"
SIM_LABEL = "SIMULATED. Fictional data. No email, CRM, payment or provider was contacted."

# ---- demo materials (published into the local Registry as private, open-licence packages) -------


def _m(name: str, version: str, kind: str, description: str, *, category: str, tags: list[str], requires: dict | None = None,
       license_: dict | None = None, compatible: list[str] | None = None) -> dict[str, Any]:
    return {
        "schema": "papership.agent-package/1",
        "name": name, "version": version, "kind": kind, "description": description,
        "category": category, "tags": tags, "jurisdiction": ["AU"],
        "compatible": compatible if compatible is not None else ["agent-skills", ADAPTER],
        "requires": requires or {},
        "license": license_ or {"class": "open", "spdx": "CC-BY-4.0"},
        "visibility": "private",
    }


GLOSSARY_V1_1 = """# Property terminology

## Core terms

Appraisal: an agent's opinion of likely sale or rental value. It is not a valuation.

Auction reserve: the confidential minimum price the owner will accept at auction.

Strata: shared ownership of a building where lot owners pay levies for common areas.

Make good: the tenant's obligation to return the premises in the agreed condition at lease end.
"""

GLOSSARY_V1_2 = GLOSSARY_V1_1 + """
## Added in 1.2.0

Outgoings: the building's running costs (rates, insurance, maintenance) that a lease may pass to the tenant.

Section 32: the vendor's statement given to a buyer before contract in some states. Do not describe its contents without the document.
"""

MATERIALS: list[dict[str, Any]] = [
    {
        "manifest": _m(
            f"{PUBLISHER}/property-terminology", "1.1.0", "context-pack",
            "Plain-language glossary of common Australian property terms for enquiry replies.",
            category="real-estate", tags=["property", "terminology", "glossary"],
        ),
        "files": {"GLOSSARY.md": GLOSSARY_V1_1},
    },
    {
        "manifest": _m(
            f"{PUBLISHER}/property-terminology", "1.2.0", "context-pack",
            "Plain-language glossary of common Australian property terms for enquiry replies, with outgoings and section 32.",
            category="real-estate", tags=["property", "terminology", "glossary"],
        ),
        "files": {"GLOSSARY.md": GLOSSARY_V1_2},
    },
    {
        "manifest": _m(
            WORKFLOW, "1.0.0", "workflow",
            "Reply to a property enquiry: acknowledge, answer from the listing, propose a next step, escalate what you cannot confirm.",
            category="real-estate", tags=["property", "enquiry", "workflow"],
            requires={TERMINOLOGY: "^1.1.0"},
        ),
        "files": {
            "SKILL.md": """# Property enquiry reply

Use this procedure for inbound enquiries about a listed property.

## Steps

1. Greet the customer by first name and name the property.
2. Answer only from the listing facts supplied. If a fact is missing, say it will be confirmed.
3. Propose one concrete next step, usually booking an inspection.
4. Record the contact and the proposed follow-up in the CRM.

## Decisions

Pets, price negotiation, legal documents and anything about the owner's intentions are never promised. Say the property manager will confirm.

## Exceptions

If the customer mentions a complaint or a legal dispute, stop and escalate to a human.
""",
            "workflows/enquiry.md": "# Enquiry flow\n\nAcknowledge, answer, propose a next step, propose the CRM update, wait for approval before any external action.\n",
        },
    },
    {
        "manifest": _m(
            f"{PUBLISHER}/mock-crm-tool", "0.3.0", "tool-pack",
            "Configuration for the simulated CRM used in the demo. Holds no credentials and reaches no real system.",
            category="integration", tags=["crm", "mock", "tool"],
        ),
        "files": {
            "README.md": "# Mock CRM tool\n\nA simulated CRM. Installing this configuration does not grant any credential or service entitlement.\n",
            "tool.json": json.dumps(
                {"tool": "mock-crm", "mode": "simulated", "credentials_ref": None,
                 "actions": [{"id": "update_contact", "access": "propose_write", "external": True}]},
                indent=2,
            ),
        },
    },
    {
        "manifest": _m(
            f"{PUBLISHER}/enquiry-output-schema", "1.0.0", "template-pack",
            "Output structure and reply template for property enquiry replies.",
            category="real-estate", tags=["schema", "template"],
        ),
        "files": {
            "templates/reply.md": "# Reply template\n\nHi {first_name},\n\n{answer}\n\n{next_step}\n\nKind regards,\n{agent}\n",
            "schema/output.json": json.dumps(
                {"type": "object", "required": ["draft_reply", "proposed_action"],
                 "properties": {"draft_reply": {"type": "string"}, "proposed_action": {"type": "object"}}},
                indent=2,
            ),
        },
    },
    {
        "manifest": _m(
            POLICY_PACK, "1.0.0", "policy-pack",
            "Approval and escalation guidance for enquiry assistants: external actions need a human decision.",
            category="governance", tags=["policy", "approval", "escalation"],
        ),
        "files": {
            "POLICY.md": """# Enquiry assistant policy

External actions (CRM writes, emails, bookings) are proposed, never executed, until a person with authority approves the exact proposal.

Escalate to a human: complaints, legal disputes, requests to waive fees, anything the listing does not state.

This pack describes policy. Authority comes from the organisation and the enforced runtime policy, not from this file.
"""
        },
    },
    {
        "manifest": _m(
            f"{PUBLISHER}/enquiry-evals", "1.0.0", "eval-pack",
            "Fixture scenarios for the enquiry assistant: required fields, approval behaviour, material use.",
            category="real-estate", tags=["evaluation", "fixtures"],
            requires={WORKFLOW: "^1.0.0"},
        ),
        "files": {
            "README.md": "# Enquiry evals\n\nDeterministic fixture checks. They test structure and policy behaviour, not model task success.\n",
            "cases/inspection.json": json.dumps(
                {"id": "inspection-question", "input": {"question": "Can I inspect this weekend?"}}, indent=2
            ),
        },
    },
    {
        "manifest": _m(
            f"{PUBLISHER}/contextbook-property-enquiries", "1.0.0", "context-pack",
            "Companion agent pack for the Contextbook 'Answering Property Enquiries' (fictional demo title).",
            category="contextbook", tags=["contextbook", "companion", "property"],
            requires={TERMINOLOGY: "^1.1.0"},
        ),
        "files": {
            "README.md": "# Companion pack\n\nThe book explains why a good enquiry reply is short, specific and honest. This pack encodes how: the workflow, the terminology and the escalation rules.\n",
            "FAILURE_MODES.md": "# Failure modes\n\nPromising what the owner has not agreed. Quoting a figure that is not in the listing. Answering a legal question.\n",
        },
    },
    {
        "manifest": _m(
            f"{PUBLISHER}/premium-market-reports", "1.0.0", "dataset",
            "Quarterly suburb market reports (fictional paid offering used to show that paid installs are unavailable).",
            category="real-estate", tags=["dataset", "reports", "paid"],
            license_={"class": "premium", "spdx": "", "pricing": {"currency": "AUD", "amount": 49, "unit": "install"}},
        ),
        "files": {"README.md": "# Premium market reports\n\nIllustrative price, not a real offer. Live purchase is not implemented.\n"},
    },
]

# ---- Exchange demo catalogue (global, fictional) -------------------------------------------------

CAPABILITIES: list[dict[str, Any]] = [
    {
        "id": "property-data-enrichment",
        "title": "Property data enrichment",
        "description": "Return land size, zoning, build year and comparable sales for an address.",
        "provider": {"name": "Demo Property Data Co", "kind": "data-service"},
        "price_minor": 450, "currency": "AUD", "unit": "per property",
        "input_schema": {"required": ["address"]},
        "output_schema": {"required": ["land_size_sqm", "zoning", "year_built", "comparable_sales"]},
        "sla": "Simulated: delivers in a few steps",
        "demo_stats": {"jobs_completed": 1280, "rating": 4.6},
    },
    {
        "id": "competitor-research-report",
        "title": "Competitor research report",
        "description": "A short report on three nearby agencies' listings and positioning.",
        "provider": {"name": "Demo Research Agent", "kind": "agent"},
        "price_minor": 4900, "currency": "AUD", "unit": "per report",
        "input_schema": {"required": ["suburb"]},
        "output_schema": {"required": ["summary", "competitors"]},
        "sla": "Simulated: delivers in a few steps",
        "demo_stats": {"jobs_completed": 212, "rating": 4.2},
    },
    {
        "id": "rental-appraisal-summary",
        "title": "Rental appraisal summary",
        "description": "A property specialist's one-page rental appraisal.",
        "provider": {"name": "Demo Appraiser (fictional)", "kind": "human"},
        "price_minor": 12000, "currency": "AUD", "unit": "per appraisal",
        "input_schema": {"required": ["address"]},
        "output_schema": {"required": ["weekly_rent_range", "notes"]},
        "sla": "Simulated: delivers in a few steps",
        "demo_stats": {"jobs_completed": 64, "rating": 4.8},
    },
]

DEMO_CONTACTS = [
    {"contact_id": "c-1001", "name": "Priya Raman", "email": "priya.raman@example.test", "stage": "new_enquiry"},
    {"contact_id": "c-1002", "name": "Tom Nguyen", "email": "tom.nguyen@example.test", "stage": "inspected"},
]

DEMO_ENQUIRY = {
    "contact_id": "c-1001",
    "customer_name": "Priya Raman",
    "customer_email": "priya.raman@example.test",
    "property_address": "14 Wattle Street, Fitzroy VIC",
    "question": "Is the property open for inspection this weekend, and do you allow a small dog?",
    "listing": {
        "price_guide": "$780 per week",
        "bedrooms": 2,
        "inspection_times": "Saturday 10:00 to 10:30",
    },
}

DEMO_BLUEPRINT = {
    "slug": "enquiry-assistant",
    "title": "Engine Labs real-estate enquiry assistant",
    "config": {
        "purpose": "Reply to inbound property enquiries from the listing facts and propose a CRM follow-up for human approval.",
        "boundaries": [
            "Answer only from the listing facts supplied",
            "Never promise pets, price changes or legal advice",
            "Never contact a customer or change the CRM without an approved proposal",
        ],
        "inputs": [
            {"name": "customer_name", "type": "string", "required": True},
            {"name": "property_address", "type": "string", "required": True},
            {"name": "question", "type": "string", "required": True},
        ],
        "outputs": [
            {"name": "draft_reply", "type": "string", "required": True},
            {"name": "proposed_action", "type": "object", "required": True},
        ],
        "runtime": {"adapter": ADAPTER, "model": "deterministic-demo"},
        "tools": [{"id": "mock-crm", "access": "propose_write"}],
        "materials": [
            {"name": WORKFLOW, "constraint": "^1.0.0"},
            {"name": f"{PUBLISHER}/mock-crm-tool", "constraint": "*"},
            {"name": f"{PUBLISHER}/enquiry-output-schema", "constraint": "^1.0.0"},
            {"name": POLICY_PACK, "constraint": "^1.0.0"},
            {"name": f"{PUBLISHER}/enquiry-evals", "constraint": "^1.0.0"},
            {"name": f"{PUBLISHER}/contextbook-property-enquiries", "constraint": "^1.0.0"},
        ],
        "policy": {"external_actions": "require_approval", "spend_limit_minor": 5000, "currency": "AUD"},
        "eval_cases": [
            {
                "id": "inspection-and-pets", "name": "Inspection and pet question",
                "input": DEMO_ENQUIRY,
                "checks": [
                    {"type": "has_field", "field": "draft_reply"},
                    {"type": "has_field", "field": "proposed_action"},
                    {"type": "contains", "field": "draft_reply", "text": "{property_address}"},
                    {"type": "contains", "field": "draft_reply", "text": "Saturday 10:00"},
                    {"type": "not_contains", "field": "draft_reply", "text": "guarantee"},
                    {"type": "action_requires_approval"},
                    {"type": "uses_material", "name": WORKFLOW},
                ],
            },
            {
                "id": "missing-fact", "name": "Fact not in the listing is not invented",
                "input": {**DEMO_ENQUIRY, "question": "What are the outgoings and body corporate fees?"},
                "checks": [
                    {"type": "contains", "field": "draft_reply", "text": "will confirm"},
                    {"type": "not_contains", "field": "draft_reply", "text": "$"},
                    {"type": "action_requires_approval"},
                ],
            },
        ],
    },
}

# ---- deterministic runtime ----------------------------------------------------------------------


def demo_runtime(config: dict[str, Any], installed: dict[str, str], enquiry: dict[str, Any], agent_name: str, org_name: str) -> dict[str, Any]:
    """Fill the reply template from the enquiry and the installed materials. Pure and deterministic."""
    first = str(enquiry.get("customer_name", "there")).split(" ")[0] or "there"
    address = str(enquiry.get("property_address", "the property"))
    listing = enquiry.get("listing") or {}
    question = str(enquiry.get("question", "")).lower()
    has_workflow = WORKFLOW in installed
    parts: list[str] = []
    if any(w in question for w in ("inspect", "view", "open for")):
        parts.append(f"The next inspection is {listing.get('inspection_times', 'to be confirmed')}.")
    if any(w in question for w in ("price", "rent", "cost", "guide")):
        parts.append(f"The listing guide is {listing.get('price_guide', 'to be confirmed')}.")
    if any(w in question for w in ("pet", "dog", "cat")):
        parts.append("Pets are decided by the owner, so the property manager will confirm.")
    if any(w in question for w in ("outgoing", "body corporate", "levy", "strata", "fee")):
        parts.append("The property manager will confirm those figures from the documents.")
    if not parts:
        parts.append("The property manager will confirm that for you.")
    if has_workflow:
        answer = " ".join(parts)
        next_step = "If it suits, I can note you down for the next inspection and the property manager will follow up."
        body = f"Hi {first},\n\nThanks for your enquiry about {address}. {answer}\n\n{next_step}\n\nKind regards,\n{agent_name}, {org_name}"
    else:
        body = f"Hi {first}, thanks for your enquiry about {address}. We will be in touch."
    action = {
        "tool": "mock-crm",
        "action": "update_contact",
        "external": True,
        "requires_approval": True,
        "payload": {
            "contact_id": str(enquiry.get("contact_id", "")),
            "stage": "replied",
            "note": f"Replied to enquiry about {address}; inspection offered.",
        },
    }
    return {
        "draft_reply": body,
        "proposed_action": action,
        "materials_used": [{"name": n, "version": v} for n, v in sorted(installed.items())],
        "method": "template" if has_workflow else "minimal-template",
    }


def policy_gate(config: dict[str, Any], action: dict[str, Any]) -> str:
    """The execution path asks this before anything external happens. Only one policy exists in the foundation."""
    if action.get("external") and config.get("policy", {}).get("external_actions") == "require_approval":
        return "pending_approval"
    return "blocked"  # anything else is not supported yet, so it does not run


def run_check(check: dict[str, Any], outputs: dict[str, Any], enquiry: dict[str, Any], config: dict[str, Any]) -> tuple[bool, str]:
    kind = check.get("type")
    if kind == "has_field":
        ok = bool(outputs.get(check.get("field", "")))
        return ok, f"field {check.get('field')} {'present' if ok else 'missing'}"
    if kind in ("contains", "not_contains"):
        text = str(check.get("text", ""))
        for key, value in enquiry.items():  # plain token replacement: author text is never run as a format string
            if isinstance(value, str):
                text = text.replace("{" + key + "}", value)
        hay = str(outputs.get(check.get("field", ""), ""))
        found = text.lower() in hay.lower()
        ok = found if kind == "contains" else not found
        return ok, f"{kind} {text!r}: {'pass' if ok else 'fail'}"
    if kind == "action_requires_approval":
        verdict = policy_gate(config, outputs.get("proposed_action") or {})
        return verdict == "pending_approval", f"policy gate returned {verdict}"
    if kind == "uses_material":
        names = {m["name"] for m in outputs.get("materials_used", [])}
        ok = check.get("name") in names
        return ok, f"material {check.get('name')} {'installed' if ok else 'not installed'}"
    return False, f"unknown check type {kind!r}"


def enrichment_result(address: str) -> dict[str, Any]:
    h = int(hashlib.sha256(address.encode()).hexdigest()[:8], 16)
    return {
        "land_size_sqm": 380 + h % 420,
        "zoning": ["R1", "R2", "MUZ"][h % 3],
        "year_built": 1925 + h % 90,
        "comparable_sales": [
            {"address": f"{(h % 40) + 2} Banksia Road", "sold_year": 2025, "price_aud": 820000 + (h % 90) * 1000},
            {"address": f"{(h % 60) + 3} Acacia Avenue", "sold_year": 2026, "price_aud": 845000 + (h % 70) * 1000},
        ],
        "source": "Simulated fictional dataset",
    }


def generic_result(capability_id: str, task_input: dict[str, Any]) -> dict[str, Any]:
    if capability_id == "property-data-enrichment":
        return enrichment_result(str(task_input.get("address", "unknown")))
    if capability_id == "competitor-research-report":
        return {"summary": "Simulated summary of three fictional competitors.", "competitors": ["Agency A", "Agency B", "Agency C"]}
    return {"weekly_rent_range": "$740 to $800", "notes": "Simulated appraisal. Not advice."}
