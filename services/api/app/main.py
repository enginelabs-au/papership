"""Engine Labs API — phase 1 foundation."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse

from app.auth import AuthContext, auth_dep, issue_local_founder_token, require_reauth
from app.config import load_settings
from app.connectors import get_connector, list_connectors
from app.oauth import annotate_connection, complete_oauth_callback, frontend_redirect, oauth_readiness, start_oauth_connect
from app.github_app import GithubError, installation_permissions, list_pulls, open_pull, probe_github
from app.github_grants import intersect_repo_grants, may_open_pull
from app.source_grants import intersect_source_grants, may_live_write
from app.hermes_health import probe_hermes
from app.loop import LOOP_STAGES
from app.grants import effective_grants
from app.logging_util import TraceMiddleware, configure_logging
from app.managed_projects import ENGINE_LABS_JOB_PURPOSE, ENGINE_LABS_PROJECT_ID
from app.store import Store, StoreError
from app.usage import emit_usage, validate_usage_event
from app import memory_ops, phase5, phase7, rate_card, view_defs

SIGNED_URL_TTL = 300

logger = configure_logging()


def create_app(store_path: str | None = None) -> FastAPI:
    settings = load_settings()
    if store_path:
        settings = type(settings)(**{**settings.__dict__, "store_path": store_path})
    store = Store(settings.store_path)
    store.seed_founder()

    app = FastAPI(title="Papership API", version="0.1.0")
    app.state.settings = settings
    app.state.store = store
    origins = list(settings.cors_origins) or [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
        "http://127.0.0.1:1420",
        "http://localhost:1420",
        "http://tauri.localhost",
        "https://tauri.localhost",
        "tauri://localhost",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(TraceMiddleware, logger=logger)

    @app.exception_handler(StoreError)
    async def store_error(_request: Request, exc: StoreError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)

    @app.exception_handler(GithubError)
    async def github_error(_request: Request, exc: GithubError) -> JSONResponse:
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

    @app.get("/health")
    def health() -> dict[str, Any]:
        db = store.health_db()
        dbos = "ok" if db == "ok" else "error"
        hermes = probe_hermes(settings.hermes_api_base_url)
        github = probe_github(
            settings.github_app_id,
            settings.github_installation_id,
            settings.github_private_key_path,
            live=not settings.test_hooks,
        )
        return {
            "status": "ok" if db == "ok" else "degraded",
            "db": db,
            "dbos": dbos,
            "worker_config": "ok",
            "hermes": hermes,
            "hermes_pin": settings.hermes_version_pin,
            "usage_emit": settings.usage_emit,
            "github": github,
            "oauth": oauth_readiness(settings),
        }

    @app.get("/registry")
    def registry(_ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        items = store.list_registry()
        return {
            "items": items,
            "count": len(items),
            "hermes_side_effecting_tools": "catalogued",
            "loop_stages": list(LOOP_STAGES),
            "first_managed_project_id": ENGINE_LABS_PROJECT_ID,
        }

    @app.get("/projects")
    def list_projects(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_managed_projects(ctx.principal_id)}

    @app.get("/projects/{project_id}")
    def get_project(project_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.get_managed_project(ctx.principal_id, project_id)

    @app.post("/projects/{project_id}/jobs")
    def start_project_job(
        project_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)
    ) -> JSONResponse:
        title = str(body.get("title") or "Engine Labs loop")
        purpose = str(body.get("purpose") or ENGINE_LABS_JOB_PURPOSE)
        result = store.start_engine_labs_job(ctx.principal_id, project_id, title, purpose=purpose)
        return JSONResponse(result, status_code=202)

    @app.get("/seats/templates")
    def seat_templates(_ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_seat_templates()}

    @app.get("/seats/operator")
    def paid_operator_seat(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        """Paid founder/solo operator seat: domains + command-room products. No Context Music."""
        return store.paid_operator_seat(ctx.principal_id)

    @app.get("/hermes/host")
    def hermes_host(_ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        """Always-on Hermes Host status box for technical operators. Probe only — no write tools."""
        status = probe_hermes(settings.hermes_api_base_url)
        configured = bool((settings.hermes_api_base_url or "").strip())
        return {
            "product": "Hermes Host",
            "role": "always-on agent box",
            "status": status,
            "configured": configured,
            "pin": settings.hermes_version_pin or None,
            "write_tools": False,
            "live_production_writes": False,
            "mock": status in {"not_configured", "unreachable", "error", "serve_ui"},
            "message": {
                "reachable": "Hermes Host is reachable. Papership mediates sessions; write tools stay blocked.",
                "serve_ui": "A Hermes login UI is answering — not the API server. Runs stay blocked.",
                "unreachable": "Hermes Host is unreachable. Configure HERMES_API_BASE_URL for a local/mock host.",
                "not_configured": "Hermes Host is not configured. Local mock mode — no Cam HostHatch secrets required.",
                "error": "Hermes Host probe failed. No write tools were invoked.",
            }.get(status, "Hermes Host status unknown."),
            "context_music": False,
        }

    @app.post("/members/invites")
    def create_member_invite(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return store.create_invite(
            actor_id=ctx.principal_id,
            tenant_id=ctx.tenant_id,
            template=str(body.get("template") or ""),
            label=str(body.get("label") or ""),
        )

    @app.get("/people")
    def list_people(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_members(ctx.principal_id), "state": "ready"}

    @app.get("/organisation")
    def get_organisation(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.organisation(ctx.principal_id)

    @app.get("/teams")
    def list_teams(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_teams(ctx.principal_id)}

    @app.post("/teams")
    def create_team(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_team(ctx.principal_id, str(body.get("name") or ""), str(body.get("department") or ""))

    @app.get("/inbox")
    def list_inbox(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        items = store.list_inbox(ctx.principal_id)
        return {"items": items, "state": "ready" if items else "empty"}

    @app.post("/auth/local-session")
    def local_session() -> dict[str, str]:
        if not settings.test_hooks:
            raise HTTPException(status_code=403, detail="local session disabled")
        return {
            "access_token": issue_local_founder_token(settings),
            "principal_id": "principal-founder",
        }

    @app.get("/settings/measurement")
    def measurement_notice(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.measurement_notice()

    @app.post("/settings/oq-g2")
    def record_oq_g2(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return store.record_oq_g2(ctx.principal_id)

    @app.get("/connections")
    def connections(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        items = [annotate_connection(row, settings) for row in store.list_connections(ctx.principal_id)]
        catalog = [annotate_connection(dict(row), settings) for row in list_connectors()]
        return {"items": items, "catalog": catalog}

    @app.get("/connections/{provider}")
    def connection_detail(provider: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        spec = get_connector(provider)
        if spec is None:
            raise HTTPException(status_code=403, detail="unknown provider")
        items = {row["id"]: row for row in store.list_connections(ctx.principal_id)}
        return items.get(provider, spec)

    @app.post("/connections/{provider}/connect")
    def connect_provider(provider: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        started = start_oauth_connect(store, settings, ctx.principal_id, provider)
        if started is not None:
            return started
        return store.connect_provider(ctx.principal_id, provider)

    @app.get("/oauth/{provider}/callback")
    def oauth_callback(
        provider: str,
        code: str = "",
        state: str = "",
        error: str = "",
    ) -> RedirectResponse:
        if error:
            outcome = {"result": "error", "reason": "provider_denied"}
        else:
            outcome = complete_oauth_callback(store, settings, provider, code, state)
        return RedirectResponse(
            frontend_redirect(settings, provider, outcome["result"], outcome.get("reason") or ""),
            status_code=302,
        )

    @app.post("/connections/{provider}/send")
    def send_via_provider(provider: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        spec = get_connector(provider)
        if spec is None:
            raise HTTPException(status_code=403, detail="unknown provider")
        if spec["actions"].get("send") != "approval_then_receipt":
            raise HTTPException(status_code=403, detail="send is not enabled for this provider")
        grants = store.grant_classes(ctx.principal_id)
        perms = body.get("source_perms") or {}
        if not may_live_write(provider, grants, perms):
            raise HTTPException(status_code=403, detail="empty source perms or missing comms.send intersection")
        if not body.get("approval_id"):
            raise HTTPException(status_code=403, detail="send needs approval then receipt")
        store.require_live_approval(str(body.get("target_id") or provider), str(body.get("target_version") or "1"))
        return {"status": "receipt", "provider": provider, "dry_run": True}

    @app.post("/connections/{provider}/sync")
    def sync_provider(provider: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.record_sync_checkpoint(
            ctx.principal_id,
            provider,
            lineage=str(body.get("lineage") or "list"),
            label=str(body.get("label") or "incremental"),
        )

    @app.post("/grants/intersect")
    def intersect_grants(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        grants = store.grant_classes(ctx.principal_id)
        provider = str(body.get("provider") or "github")
        source_perms = body.get("source_perms") or {}
        effective = sorted(intersect_source_grants(provider, grants, source_perms))
        return {
            "provider": provider,
            "papership": sorted(g for g in grants if g.startswith(("repo.", "comms."))),
            "source": source_perms,
            "effective": effective,
            "live_write": may_live_write(provider, grants, source_perms),
        }

    @app.post("/guests")
    def create_guest(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return store.create_guest(ctx.principal_id, ctx.tenant_id, str(body.get("scope") or "assigned"))

    @app.get("/jobs/queued")
    def queued_jobs(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "run.start") and not store.has_grant(
            ctx.principal_id, "org.admin"
        ):
            raise HTTPException(status_code=403, detail="denied")
        return {"items": store.list_queued_jobs()}

    @app.post("/usage/baseline")
    def post_usage_baseline(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.capture_usage_baseline(ctx.principal_id)

    @app.get("/usage/baseline")
    def get_usage_baseline(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        row = store.latest_usage_baseline(ctx.principal_id)
        if row is None:
            return {"label": "first-baseline", "event_count": store.usage_count(), "state": "not_captured"}
        return row

    @app.post("/grants")
    def create_grant(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return store.add_grant(body["principal_id"], body["grant_class"], ctx.tenant_id)

    @app.post("/grants/revoke")
    def revoke_grant(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return {
            "revoked": store.revoke_grant(body["principal_id"], body["grant_class"]),
            "principal_id": body["principal_id"],
            "grant_class": body["grant_class"],
        }

    @app.post("/entitlements")
    def create_entitlement(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return store.add_entitlement(body["principal_id"], body["feature"], ctx.tenant_id)

    @app.get("/entitlements/me")
    def my_entitlements(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.entitlements(ctx.principal_id)}

    @app.post("/allowances")
    def create_allowance(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin"):
            raise HTTPException(status_code=403, detail="denied")
        return store.add_allowance(
            body["principal_id"],
            body["feature"],
            ctx.tenant_id,
            band=str(body.get("band") or "unmeasured"),
            plan_label=str(body.get("plan_label") or "free"),
        )

    @app.get("/allowances/me")
    def my_allowances(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {
            "items": store.allowances(ctx.principal_id),
            "charges_enabled": settings.billing_charges_enabled,
        }

    @app.post("/allowances/reserve")
    def reserve_allowance(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.reserve_allowance(ctx.principal_id, str(body.get("feature") or ""), ctx.tenant_id)

    @app.post("/allowances/reconcile")
    def reconcile_allowance(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.reconcile_allowance(str(body.get("reservation_id") or ""), ctx.principal_id)

    @app.post("/billing/charge")
    def billing_charge(_body: dict[str, Any], _ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        raise HTTPException(status_code=403, detail="billing charges disabled")

    @app.get("/billing/rate-card")
    def billing_rate_card(_ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return rate_card.trial_rate_card(charges_enabled=settings.billing_charges_enabled)

    @app.get("/packs")
    def list_packs(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {
            "items": phase7.list_packs(store, ctx.tenant_id),
            "execution_enabled": settings.pack_execution_enabled,
        }

    @app.get("/packs/{pack_id}")
    def get_pack(pack_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.get_pack(store, ctx.tenant_id, pack_id)

    @app.post("/packs/install")
    def install_pack(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.install_pack(store, ctx.principal_id, ctx.tenant_id, str(body.get("pack_id") or ""))

    @app.post("/packs/{pack_id}/trust")
    def review_pack_trust(pack_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.review_pack_trust(
            store, ctx.principal_id, ctx.tenant_id, pack_id, str(body.get("verdict") or "")
        )

    @app.post("/packs/{pack_id}/custom-fields")
    def define_custom_field(pack_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.define_custom_field(
            store,
            ctx.principal_id,
            ctx.tenant_id,
            pack_id,
            str(body.get("field_id") or ""),
            str(body.get("field_type") or ""),
        )

    @app.post("/packs/{pack_id}/activate")
    def activate_pack(pack_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.activate_pack(
            store,
            ctx.principal_id,
            ctx.tenant_id,
            pack_id,
            execution_enabled=settings.pack_execution_enabled,
        )

    @app.get("/payments/proposals")
    def list_payment_proposals(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": phase7.list_proposals(store, ctx.principal_id), "payout": False}

    @app.post("/payments/proposals")
    def create_payment_proposal(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.create_proposal(store, ctx.principal_id, body)

    @app.post("/payments/proposals/{proposal_id}/approve")
    def approve_payment_proposal(proposal_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_reauth(ctx)
        return phase7.approve_proposal(store, ctx.principal_id, proposal_id)

    @app.post("/payments/bank-details")
    def change_bank_details(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_reauth(ctx)
        return phase7.change_bank_details(store, ctx.principal_id, str(body.get("note") or ""))

    @app.get("/field-evidence")
    def list_field_evidence(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": phase7.list_field_evidence(store, ctx.principal_id)}

    @app.post("/field-evidence")
    def capture_field_evidence(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.capture_field_evidence(store, ctx.principal_id, body)

    @app.post("/field-evidence/dispatch")
    def dispatch_field(_body: dict[str, Any], _ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        phase7.refuse_dispatch()
        return {}

    @app.get("/erasure/status")
    def get_erasure_status(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase7.erasure_status(store, ctx.principal_id, ctx.tenant_id)

    @app.post("/erasure/request")
    def post_erasure_request(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        require_reauth(ctx)
        return phase7.request_erasure(
            store, ctx.principal_id, ctx.tenant_id, list(body.get("confirmations") or [])
        )

    @app.get("/licenses")
    def licenses(_ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        root = Path(__file__).resolve().parents[3]
        return {
            "product_license": "SEE LICENSE IN LICENSE",
            "notice_present": (root / "NOTICE").is_file(),
            "license_present": (root / "LICENSE").is_file(),
            "policy": "proposed",
            "identifiers": ["LICENSE", "NOTICE", "docs/policies/licensing.md"],
            "hermes_pin_configured": bool(settings.hermes_version_pin),
            "charges_enabled": settings.billing_charges_enabled,
        }

    @app.post("/approvals")
    def create_approval(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.decide_approval(
            approval_class=body["approval_class"],
            requester_id=body.get("requester_id", ctx.principal_id),
            decider_id=ctx.principal_id,
            target_id=body["target_id"],
            target_version=body.get("target_version", "1"),
            tenant_id=ctx.tenant_id,
        )

    @app.post("/grants/effective")
    def compute_effective(body: dict[str, Any], _ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        grants = effective_grants(
            set(body.get("sponsor", [])),
            set(body.get("toolset", [])),
            set(body.get("mode", [])),
        )
        return {"effective": sorted(grants)}

    @app.post("/priorities")
    def post_priority(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_priority(ctx.principal_id, body["title"])

    @app.get("/priorities")
    def get_priorities(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_visible("priorities", ctx.principal_id)}

    @app.post("/plans")
    def post_plan(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_plan(ctx.principal_id, body["title"], body.get("priority_id"))

    @app.get("/plans")
    def get_plans(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_visible("plans", ctx.principal_id)}

    @app.post("/work-items")
    def post_work_item(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_work_item(ctx.principal_id, body["title"], body.get("plan_id"))

    @app.get("/work-items")
    def get_work_items(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_visible("work_items", ctx.principal_id)}

    @app.get("/work-items/{work_item_id}")
    def get_work_item(work_item_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.get_work_item(ctx.principal_id, work_item_id)

    @app.post("/work-items/{work_item_id}/stage")
    def post_work_item_stage(
        work_item_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)
    ) -> dict[str, Any]:
        return store.advance_stage(
            ctx.principal_id,
            work_item_id,
            str(body.get("stage") or ""),
            body.get("evidence"),
        )

    @app.post("/assignments")
    def post_assignment(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_assignment(ctx.principal_id, body["work_item_id"], body["principal_id"])

    @app.post("/dependencies")
    def post_dependency(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_dependency(ctx.principal_id, body["from_work_item_id"], body["to_work_item_id"])

    @app.post("/source-references")
    def post_source_ref(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_source_reference(
            ctx.principal_id, body["provider"], body["installation_pointer"]
        )

    @app.get("/records")
    def records(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_records(ctx.principal_id)}

    @app.get("/search")
    def search(q: str = "", ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.search(ctx.principal_id, q)}

    @app.get("/aggregates")
    def aggregates(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.aggregates(ctx.principal_id)

    @app.post("/attachments")
    def post_attachment(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        att = store.create_attachment(ctx.principal_id, body.get("label", "file"))
        expires = int(time.time()) + SIGNED_URL_TTL
        sig = _sign(settings.attachment_signing_key, att["id"], expires)
        return {
            **att,
            "signed_url": f"/attachments/{att['id']}?expires={expires}&sig={sig}",
            "ttl_seconds": SIGNED_URL_TTL,
        }

    @app.get("/attachments/{attachment_id}")
    def get_attachment(
        attachment_id: str,
        expires: int = Query(...),
        sig: str = Query(...),
        ctx: AuthContext = Depends(auth_dep),
    ) -> dict[str, Any]:
        store.require_surface(ctx.principal_id, "attachments")
        if int(time.time()) > expires:
            raise HTTPException(status_code=403, detail="signed url expired")
        expected = _sign(settings.attachment_signing_key, attachment_id, expires)
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=403, detail="signed url invalid")
        if expires - int(time.time()) > SIGNED_URL_TTL:
            raise HTTPException(status_code=403, detail="signed url ttl exceeds 300s")
        return store.get_attachment(attachment_id)

    @app.get("/notifications")
    def notifications(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_notifications(ctx.principal_id)}

    @app.get("/memory")
    def memory(q: str = Query(default=""), ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        items = memory_ops.list_memory(store, ctx.principal_id, q)
        phase5.maybe_emit(store, settings.usage_emit, "memory.search.executed", ctx.tenant_id, ctx.principal_id, "results_found" if items else "none")
        return {"items": items}

    @app.get("/memory/{item_id}")
    def inspect_memory(item_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        item = memory_ops.inspect_memory(store, ctx.principal_id, item_id)
        phase5.maybe_emit(store, settings.usage_emit, "memory.item.inspected", ctx.tenant_id, ctx.principal_id, "ok")
        return item

    @app.post("/memory")
    def create_memory(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.create_memory(store, ctx.principal_id, body)

    @app.post("/memory/{item_id}/correct")
    def correct_memory(item_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.correct_memory(store, ctx.principal_id, item_id, body)

    @app.post("/memory/merge")
    def merge_memory(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.merge_memory(store, ctx.principal_id, str(body.get("left_id") or ""), str(body.get("right_id") or ""))

    @app.post("/memory/{item_id}/restrict")
    def restrict_memory(item_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.restrict_memory(store, ctx.principal_id, item_id, str(body.get("scope") or "restricted"))

    @app.post("/memory/{item_id}/archive")
    def archive_memory(item_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.archive_memory(store, ctx.principal_id, item_id)

    @app.post("/memory/{item_id}/export")
    def export_memory(item_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.export_memory(store, ctx.principal_id, item_id)

    @app.post("/memory/{item_id}/delete")
    def delete_memory(item_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return memory_ops.delete_memory(store, ctx.principal_id, item_id)

    @app.get("/views/current")
    def current_view(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return view_defs.current_view(store, ctx.principal_id)

    @app.post("/views/preview")
    def preview_view(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        result = view_defs.preview_view(store, ctx.principal_id, body)
        phase5.maybe_emit(store, settings.usage_emit, "view.adaptation.previewed", ctx.tenant_id, ctx.principal_id, "ok")
        return result

    @app.post("/views/apply")
    def apply_view(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        result = view_defs.apply_view(store, ctx.principal_id, body)
        phase5.maybe_emit(store, settings.usage_emit, "view.adaptation.applied", ctx.tenant_id, ctx.principal_id, "ok" if result.get("applied") else "fallback")
        return result

    @app.post("/views/undo")
    def undo_view(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        result = view_defs.undo_view(store, ctx.principal_id)
        phase5.maybe_emit(store, settings.usage_emit, "view.adaptation.reverted", ctx.tenant_id, ctx.principal_id, "ok")
        return result

    @app.post("/views/reset")
    def reset_view(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        result = view_defs.reset_view(store, ctx.principal_id)
        phase5.maybe_emit(store, settings.usage_emit, "view.adaptation.reset", ctx.tenant_id, ctx.principal_id, "ok")
        return result

    @app.post("/views/pin")
    def pin_view(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return view_defs.pin_region(store, ctx.principal_id, str(body.get("region") or ""))

    @app.get("/settings/personalisation")
    def get_personalisation(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return view_defs.inspect_personalisation(store, ctx.principal_id)

    @app.post("/settings/personalisation")
    def set_personalisation(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return view_defs.set_personalisation(store, ctx.principal_id, bool(body.get("enabled")))

    @app.post("/settings/personalisation/reset")
    def reset_personalisation(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        view_defs.reset_view(store, ctx.principal_id)
        return view_defs.set_personalisation(store, ctx.principal_id, False)

    @app.get("/strategy")
    def list_strategy(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        items = phase5.list_strategy(store, ctx.principal_id)
        return {"items": items, "kpi_status": "not_captured"}

    @app.post("/strategy")
    def create_strategy(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase5.create_strategy(store, ctx.principal_id, body)

    @app.post("/people/{member_id}/capacity")
    def set_capacity(member_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase5.upsert_capacity(store, ctx.principal_id, member_id, body)

    @app.get("/domains/catalogue")
    def domain_catalogue(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        items = phase5.domain_catalogue(store.list_registry())
        return {
            "items": items,
            "count": len(items),
            "first_managed_project_id": ENGINE_LABS_PROJECT_ID,
            "live_write": False,
        }

    @app.post("/domains/{domain_id}/connect")
    def connect_domain(domain_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        phase5.refuse_domain_connect(domain_id)
        return {}

    @app.get("/references")
    def references(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase5.CANONICAL_REFERENCES

    @app.get("/schedules")
    def list_schedules(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": phase5.list_schedules(store, ctx.principal_id), "mode": "Automate", "fire_external": False}

    @app.post("/schedules")
    def create_schedule(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return phase5.create_schedule(store, ctx.principal_id, body)

    @app.post("/jobs")
    def post_job(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> JSONResponse:
        purpose = body.get("purpose", "dev.long_step")
        if purpose == ENGINE_LABS_JOB_PURPOSE or body.get("project_id") == ENGINE_LABS_PROJECT_ID:
            result = store.start_engine_labs_job(
                ctx.principal_id,
                str(body.get("project_id") or ENGINE_LABS_PROJECT_ID),
                str(body.get("title") or "Engine Labs loop"),
                purpose=ENGINE_LABS_JOB_PURPOSE,
            )
            return JSONResponse(result, status_code=202)
        job = store.persist_job(ctx.principal_id, purpose)
        # persist-before-202: job is on disk before this response is built
        if settings.test_hooks and os.environ.get("ENGINE_TEST_CRASH_AFTER_PERSIST") == "1":
            raise RuntimeError("crash after persist")
        store.start_job(job["id"], ctx.principal_id)
        if purpose == "dev.long_step":
            store.add_receipt(job["id"], "long_step", body.get("idempotency_key") or f"{job['id']}:long_step")
            store.complete_job(job["id"])
        refreshed = store.get_job(job["id"])
        return JSONResponse(refreshed, status_code=202)

    @app.get("/jobs/{job_id}")
    def get_job(job_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "run.start") and not store.has_grant(
            ctx.principal_id, "org.admin"
        ):
            raise HTTPException(status_code=403, detail="denied")
        return store.get_job(job_id)

    @app.post("/jobs/{job_id}/cancel")
    def cancel_job(job_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.cancel_job(ctx.principal_id, job_id)

    @app.post("/jobs/{job_id}/steps")
    def job_step(job_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "run.start") and not store.has_grant(
            ctx.principal_id, "org.admin"
        ):
            raise HTTPException(status_code=403, detail="denied")
        if body.get("target_id"):
            store.require_live_approval(str(body["target_id"]), str(body.get("target_version") or "1"))
            store.void_approval_if_changed(str(body["target_id"]), str(body.get("target_version") or "1"))
        return store.add_receipt(job_id, body["step_name"], body["idempotency_key"])

    @app.get("/jobs/{job_id}/events")
    def job_events(
        job_id: str,
        last_event_id: int = Query(default=0),
        ctx: AuthContext = Depends(auth_dep),
    ) -> StreamingResponse:
        if not store.has_grant(ctx.principal_id, "run.start") and not store.has_grant(
            ctx.principal_id, "org.admin"
        ):
            raise HTTPException(status_code=403, detail="denied")
        events = store.events_after(job_id, last_event_id)

        def stream() -> Any:
            for event in events:
                data = json.dumps({"type": event["type"], "payload": event["payload"]})
                yield f"id: {event['id']}\nevent: {event['type']}\ndata: {data}\n\n"
            # disconnect ≠ cancel: stream ends; job status unchanged

        return StreamingResponse(stream(), media_type="text/event-stream")

    @app.post("/usage")
    def post_usage(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        validate_usage_event(body)
        inserted = emit_usage(store, settings.usage_emit, body)
        return {"emitted": inserted is not None, "id": inserted}

    @app.get("/usage/count")
    def usage_count(ctx: AuthContext = Depends(auth_dep)) -> dict[str, int]:
        if not store.has_grant(ctx.principal_id, "usage.read") and not store.has_grant(
            ctx.principal_id, "org.admin"
        ):
            raise HTTPException(status_code=403, detail="denied")
        return {"count": store.usage_count()}

    @app.post("/admin/destructive")
    def destructive(ctx: AuthContext = Depends(auth_dep)) -> dict[str, str]:
        require_reauth(ctx)
        return {"status": "ok"}

    @app.get("/github/pulls")
    def github_list_pulls(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        result = list_pulls(
            settings.github_app_id,
            settings.github_installation_id,
            settings.github_private_key_path,
            owner=settings.github_owner,
            repo=settings.github_repo,
        )
        checkpoint = store.record_sync_checkpoint(
            ctx.principal_id,
            "github",
            lineage=f"list:{result.get('status', 'unknown')}",
            label="import",
        )
        return {**result, "checkpoint": checkpoint}

    @app.get("/github/grants")
    def github_grant_intersection(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        papership = {
            row["grant_class"]
            for row in store.conn.execute(
                "SELECT grant_class FROM grants WHERE principal_id=?",
                (ctx.principal_id,),
            ).fetchall()
        }
        perms = installation_permissions(
            settings.github_app_id,
            settings.github_installation_id,
            settings.github_private_key_path,
        )
        effective = sorted(intersect_repo_grants(papership, perms))
        repo_grants = sorted(g for g in papership if g.startswith("repo."))
        return {
            "papership": repo_grants,
            "installation": perms,
            "effective": effective,
        }

    @app.post("/assistant/sessions")
    def create_assistant_session(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return store.create_conversation(ctx.principal_id, str(body.get("title") or "Hey Papership"), str(body.get("mode") or "Ask"))

    @app.get("/assistant/sessions")
    def list_assistant_sessions(ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {"items": store.list_conversations(ctx.principal_id)}

    @app.get("/assistant/sessions/{session_id}")
    def get_assistant_session(session_id: str, ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        return {
            "id": session_id,
            "messages": store.list_messages(ctx.principal_id, session_id),
        }

    @app.post("/assistant/sessions/{session_id}/turns")
    def post_assistant_turn(
        session_id: str, body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)
    ) -> dict[str, Any]:
        text = str(body.get("content") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="content is required")
        user_msg = store.add_message(ctx.principal_id, session_id, "user", text)
        job = store.persist_job(ctx.principal_id, "assistant.turn")
        hermes = probe_hermes(settings.hermes_api_base_url)
        if hermes != "reachable":
            assistant = store.add_message(
                ctx.principal_id,
                session_id,
                "system",
                "Hermes API server is not reachable. Your message is saved. Closing this panel will not discard it.",
            )
            store.add_receipt(job["id"], "assistant.blocked_runtime", f"{job['id']}:blocked")
            runtime = {"status": "blocked_runtime", "hermes": hermes}
        else:
            assistant = store.add_message(
                ctx.principal_id,
                session_id,
                "system",
                "Message saved. The worker starts a Hermes run when the API server (not the login UI) is listening.",
            )
            store.add_receipt(job["id"], "assistant.queued", f"{job['id']}:queued")
            runtime = {"status": "queued", "hermes": hermes}
        return {"user": user_msg, "reply": assistant, "job": job, "runtime": runtime}

    @app.post("/runs")
    def post_run(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> JSONResponse:
        job = store.persist_job(ctx.principal_id, str(body.get("purpose") or "run"))
        store.add_receipt(job["id"], "run.persist", str(body.get("idempotency_key") or f"{job['id']}:start"))
        hermes = probe_hermes(settings.hermes_api_base_url)
        runtime = {
            "status": "queued" if hermes == "reachable" else "blocked_runtime",
            "hermes": hermes,
        }
        return JSONResponse({"job": job, "runtime": runtime}, status_code=202)

    @app.post("/github/pulls")
    def github_open_pull(body: dict[str, Any], ctx: AuthContext = Depends(auth_dep)) -> dict[str, Any]:
        if not store.has_grant(ctx.principal_id, "org.admin") and not store.has_grant(
            ctx.principal_id, "repo.change"
        ):
            raise HTTPException(status_code=403, detail="denied")
        dry_run = body.get("dry_run", True)
        if dry_run is False or dry_run == "false":
            require_reauth(ctx)
            dry = False
            configured = bool(
                (settings.github_app_id or "").strip()
                and (settings.github_installation_id or "").strip()
                and (settings.github_private_key_path or "").strip()
            )
            if configured:
                papership = {
                    row["grant_class"]
                    for row in store.conn.execute(
                        "SELECT grant_class FROM grants WHERE principal_id=?",
                        (ctx.principal_id,),
                    ).fetchall()
                }
                perms = installation_permissions(
                    settings.github_app_id,
                    settings.github_installation_id,
                    settings.github_private_key_path,
                )
                if not perms:
                    raise HTTPException(
                        status_code=403,
                        detail="installation permissions are empty; refuse live open",
                    )
                if not may_open_pull(papership, perms):
                    raise HTTPException(
                        status_code=403,
                        detail="repo.change is not in the installation intersection",
                    )
        else:
            dry = True
        result = open_pull(
            settings.github_app_id,
            settings.github_installation_id,
            settings.github_private_key_path,
            owner=str(body.get("owner") or settings.github_owner),
            repo=str(body.get("repo") or settings.github_repo),
            title=str(body.get("title") or ""),
            body=str(body.get("body") or ""),
            head=str(body.get("head") or ""),
            base=str(body.get("base") or "main"),
            dry_run=dry,
        )
        store.append_audit(
            ctx.principal_id,
            "github.pull.plan" if dry else "github.pull.open",
            "repo",
            f"{result.get('planned', {}).get('owner', '')}/{result.get('planned', {}).get('repo', '')}",
        )
        return result

    return app


def _sign(key: str, attachment_id: str, expires: int) -> str:
    return hmac.new(
        key.encode(), f"{attachment_id}:{expires}".encode(), hashlib.sha256
    ).hexdigest()


app = create_app()
