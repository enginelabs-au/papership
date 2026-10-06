"""Synchronous stage work for engine_labs.loop — ledger artifacts backed by Hermes Host runs."""

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
    hermes_dispatch: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if stage not in LOOP_STAGES:
        raise ValueError(f"unknown loop stage {stage!r}")

    artifact_type = STAGE_ARTIFACT_TYPES[stage]
    digest = hashlib.sha256(f"{work_item_id}:{stage}:{job_id}".encode()).hexdigest()[:12]
    title = f"Loop · {stage.replace('_', ' ')} · {work_title}"

    dispatch = hermes_dispatch or {}
    hermes_run_id = dispatch.get("run_id")
    hermes_summary = dispatch.get("summary") or ""
    hermes_tool = dispatch.get("tool")

    lines: list[str] = [
        f"# {title}",
        "",
        f"- **Stage:** `{stage}`",
        f"- **Work item:** `{work_item_id}`",
        f"- **Job:** `{job_id}`",
        f"- **Repository:** `{bound_repo}`",
        "",
    ]

    if hermes_run_id:
        lines.extend(
            [
                "## Hermes Host",
                "",
                f"- **Run id:** `{hermes_run_id}`",
                f"- **Tool:** `{hermes_tool or 'memory_read'}` (read-only catalog)",
                f"- **Host status:** `{hermes_status}`",
                "",
            ]
        )
        if hermes_summary:
            lines.extend(["### Response", "", hermes_summary, ""])
    else:
        lines.extend(
            [
                "## Hermes Host",
                "",
                "_No Hermes run id was returned for this stage._",
                "",
            ]
        )

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
            ]
        )
    elif stage == "specification":
        lines.extend(
            [
                "## Specification outline",
                "",
                "1. `start_engine_labs_job` creates job + work item + runs request-stage work via Hermes.",
                "2. `advance_stage` moves forward and dispatches a catalogued read run for the new stage.",
                "3. Artifacts land in `loop_stage_artifacts` with `hermes_run_id` in meta.",
                "4. UI surfaces `current_artifact` markdown on Work → Workflows.",
                "",
            ]
        )
    elif stage == "plan":
        lines.extend(
            [
                "## Task list",
                "",
                "- [x] Wire loop stages to Hermes Host API (`POST /v1/runs` + `memory_read`)",
                "- [x] Fail Start/Advance when Hermes is unset (no stub runs)",
                "- [ ] Mirror Hermes errors in browser offline path",
                "- [ ] Show run id + response in Stage output panel",
                "",
            ]
        )
    elif stage == "assignment":
        lines.extend(
            [
                "## Assignment",
                "",
                "- **Assignee:** Papership agent (user-equivalent, read-only Hermes)",
                "- **Hermes:** HostHatch gateway via `HERMES_API_BASE_URL` tunnel",
                "",
            ]
        )
    elif stage == "isolated_change":
        lines.extend(
            [
                "## Isolated change",
                "",
                f"- Branch: `loop/{digest}` (dry-run — not pushed)",
                f"- Patch file: `.papership/loop/{digest}.md`",
                "- Hermes run captures read-only context for the proposed change.",
                "",
            ]
        )
    elif stage == "tests":
        lines.extend(
            [
                "## Test plan",
                "",
                "- `services/api/tests/test_engine_labs_job.py` — start + advance with mocked Hermes dispatch",
                "- `services/api/tests/test_loop_hermes_required.py` — 503 when Host unset",
                "",
            ]
        )
    elif stage == "review":
        lines.extend(
            [
                "## Review checklist",
                "",
                "- [ ] Stage artifact shows real `hermes_run_id`",
                "- [ ] Loop history shows work evidence, not only `founder.advance`",
                "- [ ] Job events include `loop.stage.artifact`",
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
            ]
        )
    elif stage == "monitoring":
        lines.extend(
            [
                "## Monitoring note",
                "",
                "- Watch deployment health after a real release (not activated in R1).",
                "",
            ]
        )
    elif stage == "retained_knowledge":
        lines.extend(
            [
                "## Retained knowledge",
                "",
                "Founder loop stages dispatch real Hermes Host runs; unset Host fails loudly in the UI.",
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
    if hermes_tool:
        meta["hermes_tool"] = hermes_tool
    if dispatch.get("http_status") is not None:
        meta["hermes_http_status"] = dispatch.get("http_status")
    if dispatch.get("idempotency_key"):
        meta["hermes_idempotency_key"] = dispatch.get("idempotency_key")

    return {
        "stage": stage,
        "artifact_type": artifact_type,
        "title": title,
        "body_markdown": body_markdown,
        "ledger_path": ledger_path,
        "meta": meta,
    }
