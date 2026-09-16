"""Synchronous stage work for engine_labs.loop — produces ledger artifacts (mock-safe)."""

from __future__ import annotations

import hashlib
from typing import Any

from app.loop import LOOP_STAGES

STAGE_ARTIFACT_TYPES: dict[str, str] = {
    "request": "intake_brief",
    "research": "research_brief",
    "specification": "spec_outline",
    "plan": "task_list",
    "assignment": "assignment_record",
    "isolated_change": "change_stub",
    "tests": "test_plan",
    "review": "review_checklist",
    "release_proposal": "pr_draft_stub",
    "monitoring": "monitoring_note",
    "retained_knowledge": "knowledge_summary",
}


def _slug(stage: str) -> str:
    return stage.replace("_", "-")


def build_stage_artifact(
    *,
    stage: str,
    work_item_id: str,
    job_id: str,
    work_title: str,
    bound_repo: str = "enginelabs-au/papership",
    hermes_status: str = "not_configured",
) -> dict[str, Any]:
    if stage not in LOOP_STAGES:
        raise ValueError(f"unknown loop stage {stage!r}")

    artifact_type = STAGE_ARTIFACT_TYPES[stage]
    digest = hashlib.sha256(f"{work_item_id}:{stage}:{job_id}".encode()).hexdigest()[:12]
    title = f"Loop · {stage.replace('_', ' ')} · {work_title}"

    hermes_run_id: str | None = None
    if stage in {"assignment", "isolated_change", "tests"}:
        hermes_run_id = f"run_stub_{digest}"
        if hermes_status == "reachable":
            hermes_run_id = f"run_probe_{digest}"

    lines: list[str] = [
        f"# {title}",
        "",
        f"- **Stage:** `{stage}`",
        f"- **Work item:** `{work_item_id}`",
        f"- **Job:** `{job_id}`",
        f"- **Repository:** `{bound_repo}`",
        "",
    ]

    if stage == "request":
        lines.extend(
            [
                "## Intake",
                "",
                f"Founder queued **{work_title}** on the Engine Labs governed loop.",
                "",
                "### Success criteria",
                "- Each stage leaves a readable artifact in the work ledger.",
                "- Hermes write tools and live GitHub open stay blocked until release grants.",
                "",
            ]
        )
    elif stage == "research":
        lines.extend(
            [
                "## Research brief",
                "",
                "Sources (read-only):",
                "- `docs/blueprints/2026-09-10_engine_labs.md`",
                "- `docs/plans/phase_2_development_loop_plan.md`",
                "- `services/api/app/loop.py` (PRD-B.1 stages)",
                "",
                "### Findings",
                "- Loop jobs must persist work items and produce stage evidence, not only POST stage.",
                "- Vercel preview runs without Hermes; local worker stubs still write artifacts.",
                "",
            ]
        )
    elif stage == "specification":
        lines.extend(
            [
                "## Specification outline",
                "",
                "1. `start_engine_labs_job` creates job + work item + runs request-stage work.",
                "2. `advance_stage` moves forward and runs work for the new stage.",
                "3. Artifacts land in `loop_stage_artifacts` and a governed memory row.",
                "4. UI surfaces `current_artifact` markdown on Work → Workflows.",
                "",
            ]
        )
    elif stage == "plan":
        lines.extend(
            [
                "## Task list",
                "",
                "- [ ] Wire `loop_stage_work` into store start/advance paths",
                "- [ ] Extend work-item API payload with artifacts",
                "- [ ] Mirror stage work in browser offline mock",
                "- [ ] Show artifact panel in WorkWorkflows",
                "- [ ] Extend API tests for artifact contracts",
                "",
            ]
        )
    elif stage == "assignment":
        lines.extend(
            [
                "## Assignment",
                "",
                "- **Assignee:** Papership agent (user-equivalent, read-only Hermes)",
                f"- **Hermes run (stub):** `{hermes_run_id}`",
                "- Worker pool: local synchronous stub (no live terminal on Vercel).",
                "",
            ]
        )
    elif stage == "isolated_change":
        lines.extend(
            [
                "## Isolated change stub",
                "",
                f"- Branch: `loop/{digest}` (dry-run — not pushed)",
                f"- Patch file: `.papership/loop/{digest}.md`",
                f"- Hermes run (stub): `{hermes_run_id}`",
                "",
                "```markdown",
                f"# Loop change note {digest}",
                "",
                "Placeholder isolated change for founder review.",
                "```",
                "",
            ]
        )
    elif stage == "tests":
        lines.extend(
            [
                "## Test plan",
                "",
                "- `services/api/tests/test_engine_labs_job.py` — start + advance produce artifacts",
                "- `services/api/tests/test_loop_stage_work.py` — markdown contracts per stage",
                f"- Hermes run (stub): `{hermes_run_id}`",
                "",
            ]
        )
    elif stage == "review":
        lines.extend(
            [
                "## Review checklist",
                "",
                "- [ ] Stage artifact visible in UI",
                "- [ ] Loop history shows work evidence, not only `founder.advance`",
                "- [ ] Job events include `loop.stage.artifact`",
                "- [ ] Offline mock writes the same shape to localStorage",
                "",
            ]
        )
    elif stage == "release_proposal":
        lines.extend(
            [
                "## Release proposal (dry-run)",
                "",
                f"- **PR title:** `[loop] {work_title}`",
                f"- **Head:** `loop/{digest}` → **base:** `main`",
                "- **Live open:** false (GitHub App dry-run default)",
                "",
                "### Body stub",
                "",
                "Automated loop reached release_proposal with linked ledger artifacts.",
                "",
            ]
        )
    elif stage == "monitoring":
        lines.extend(
            [
                "## Monitoring note",
                "",
                "- Watch deployment health after a real release (not activated in R1).",
                "- Capture first-baseline metrics in verification.md when live.",
                "",
            ]
        )
    elif stage == "retained_knowledge":
        lines.extend(
            [
                "## Retained knowledge",
                "",
                "Decision: stage transitions without artifacts are rejected — Cam sees markdown",
                "briefs, task lists, and PR stubs in the ledger for every stage.",
                "",
            ]
        )

    body_markdown = "\n".join(lines)
    ledger_path = f".papership/loop/{work_item_id}/{_slug(stage)}.md"

    meta: dict[str, Any] = {
        "stage": stage,
        "artifact_type": artifact_type,
        "ledger_path": ledger_path,
        "hermes_status": hermes_status,
        "live_github_open": False,
        "hermes_write": False,
    }
    if hermes_run_id:
        meta["hermes_run_id"] = hermes_run_id

    return {
        "stage": stage,
        "artifact_type": artifact_type,
        "title": title,
        "body_markdown": body_markdown,
        "ledger_path": ledger_path,
        "meta": meta,
    }
