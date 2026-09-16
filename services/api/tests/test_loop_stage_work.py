"""Contracts for loop stage work artifacts."""

from app.loop_stage_work import STAGE_ARTIFACT_TYPES, build_stage_artifact


def test_every_stage_has_artifact_type() -> None:
    from app.loop import LOOP_STAGES

    for stage in LOOP_STAGES:
        assert stage in STAGE_ARTIFACT_TYPES


def test_build_stage_artifact_markdown() -> None:
    art = build_stage_artifact(
        stage="research",
        work_item_id="wi_test",
        job_id="job_test",
        work_title="First Engine Labs loop",
        hermes_dispatch={
            "run_id": "run_live_abc",
            "tool": "memory_read",
            "summary": "Research paragraph from Hermes.",
        },
    )
    assert art["artifact_type"] == "research_brief"
    assert "Research brief" in art["body_markdown"]
    assert art["ledger_path"].startswith(".papership/loop/wi_test/")
    assert art["meta"]["hermes_run_id"] == "run_live_abc"
    assert "run_stub" not in art["body_markdown"]


def test_assignment_includes_real_hermes_run_id() -> None:
    art = build_stage_artifact(
        stage="assignment",
        work_item_id="wi_a",
        job_id="job_a",
        work_title="Loop",
        hermes_status="reachable",
        hermes_dispatch={"run_id": "run_ee41560dd3ee46eb9bef3fcd6615e6ba", "tool": "memory_read"},
    )
    assert art["meta"]["hermes_run_id"] == "run_ee41560dd3ee46eb9bef3fcd6615e6ba"
    assert "run_stub" not in str(art["meta"])
