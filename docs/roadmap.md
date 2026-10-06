---
document: roadmap
title: Engine Labs Company OS — Roadmap
status: r4_structure_complete
revision: 3
created: 2026-09-10
updated: 2026-09-12
task_id: 20260910-engine-labs-company-os
owner_role: orchestrating lead (T0-11); measurement and commercial sections drafted read-only by growth-marketing-subagent (T0-10)
sources:
  - docs/blueprints/company_agent_system_blueprint.md (Phases 01–18)
  - docs/blueprints/2026-09-10_engine_labs.md (§7, §13, §14, §15)
  - docs/product.md (§4 release map; §9 R1-ACC; §10 metrics; §12 open questions)
  - docs/capabilities.md (43 rows; buckets R1 = 19, R2 = 4, R3 = 14, R4 = 6)
  - docs/plans/phase_0_foundations_plan.md (§12 tasks; §16 env-var registry; §17 human-action queue; §22)
  - docs/policies/*.md (AUTH, DRR, MEM, ERA, LIC)
  - docs/workstreams/20260910-engine-labs-company-os/*/handoff.md (six roles)
---

# Engine Labs Company OS — Roadmap

This roadmap maps every intake phase (01–18) exactly once to an execution plan and a release, records the gates that must pass between plans, the dependencies between them, and the human-only actions deferred to each release's final checklist. It contains no prices, no dates beyond phase 0, and no metric values: every threshold without data is labelled `first-baseline` (NFR-4).

Forward planning for the Knowledge Layer mission is `docs/knowledge-layer/PHASE_ROADMAP.md` (D-36, 2026-10-06). This file remains the Company OS intake map. "No Phase 8" in state means this series ended at phase 7. It does not forbid Knowledge Layer phase KL-P8.

Rules that govern this document:

- Exactly one later phase plan is generated after each verified completion (`.cursor/instructions/PROJECT_PLANNING.md`); the plan names below are commitments to file names, not to content.
- Release R1 = intake phases 07–08 (`verified`, I-06). The phase-to-release mapping for 09–12 is `accepted` (D-28 / OQ-3): R2=09, R3=10, R4=11+12.
- Registry status discipline (PRD §3.2) applies at every gate: `project-lead-subagent` rejects any `working` row without demonstrated workflow, verified integration and linked evidence.
- Production, DNS, billing, publishing and credential actions are owner/CI actions; no role verdict or Build authorization confers them.

## 1. Phase → plan → release map

| Intake phase | Title (intake) | Execution plan | Release | Status (2026-09-10) |
|---|---|---|---|---|
| 01 | Launch from the supplied blueprint | `docs/plans/phase_0_foundations_plan.md` (T0-1…T0-5) | R1 | complete — manifest, blueprint, plan, charters |
| 02 | Plan the product and its complete capability registry | `phase_0_foundations_plan.md` (T0-6 PM gate) | R1 | complete — `docs/product.md`, `docs/capabilities.md` (43 rows); PM CONDITIONAL |
| 03 | Plan the member experience and authority model | `phase_0_foundations_plan.md` (T0-7 UI/UX; T0-9 Security D-03) | R1 | complete — `docs/blueprints/ui-blueprint.md` (52 states, 122 captures), `docs/policies/authority-model.md`; UI/UX and Security CONDITIONAL |
| 04 | Plan cloud architecture and connections | `phase_0_foundations_plan.md` (T0-8 SE; T0-9 Security) | R1 | complete — `docs/architecture.md`, D-01, D-04; SE CONDITIONAL |
| 05 | Plan agents, memory, lifecycle and commercial controls | `phase_0_foundations_plan.md` (T0-6, T0-9, T0-10) | R1 | complete — `docs/policies/{memory-governance,data-residency-and-retention,erasure-and-offboarding,licensing}.md`; §3–§4 below; Growth CONDITIONAL |
| 06 | Plan release scope, dependencies and acceptance gates | `phase_0_foundations_plan.md` (T0-11 this roadmap; T0-12 PL gate; T0-13) | R1 | complete — this document; PL gate CONDITIONAL 2026-09-10T18:22Z; T0-13 reconciled |
| 07 | Build the foundation | `docs/plans/phase_1_foundation_plan.md` | R1 | G1 CONDITIONAL 2026-09-11 — local venue; see phase-1 PL handoff |
| 08 | Build the development loop | `docs/plans/phase_2_development_loop_plan.md` | R1 | G2 CONDITIONAL 2026-09-11 — catalog enabled (D-17); live ACC-6 deferred |
| 13 | Verify functional and domain coverage | `docs/plans/phase_3_release_verification_plan.md` | R1 (re-run each release) | G3 PASS-with-residuals 2026-09-11 — see `docs/verification.md` r3 |
| 14 | Verify authority, memory and data lifecycle | `phase_3_release_verification_plan.md` | R1 (re-run each release) | G3 closed — V14-3 VERIFIED; remaining PARTIAL/N/A |
| 15 | Verify integrations, recovery and backups | `phase_3_release_verification_plan.md` | R1 (re-run each release) | G3 closed — live `accepted` N/A; V15-2 N/A |
| 16 | Verify the desktop and adaptive experience | `phase_3_release_verification_plan.md` | R1 (adaptive views R3) | G3 closed — V16 PARTIAL |
| 17 | Verify usage, deployment and commercial operations | `phase_3_release_verification_plan.md` | R1 (usage measurement); R4 (commercial) | G3 closed — emit off; first-baseline not_captured |
| 18 | Verify release readiness and complete the owner handoff | `phase_3_release_verification_plan.md` + `docs/plans/final_implementation_checklist.md` | R1 (repeated per release) | R1 V18-5 APPROVE 2026-09-11; R4 closeout checklist 2026-09-12 |
| 09 | Build collaboration and connections | `docs/plans/phase_4_collaboration_connections_plan.md` | R2 (`accepted`) | G5 PASS 2026-09-12 — seats, wizard, intersection, B12 contract, GitHub checkpoints, People/Inbox API overlay. Live Gmail/Slack OAuth owner-gated. |
| 10 | Expand company operations | `docs/plans/phase_5_company_operations_plan.md` | R3 (`accepted`) | G7 PASS 2026-09-12 — memory ops, adaptive views, native B01/B03, R3 shells |
| 11 | Build commercial delivery | `docs/plans/phase_6_commercial_delivery_plan.md` | R4 (`accepted`) | G9 PASS 2026-09-12 — commercial structure/test-mode; CA-10 still gates published rates/charges |
| 12 | Expand the ecosystem and mobile clients | `docs/plans/phase_7_ecosystem_mobile_plan.md` | R4 (`accepted`) | G11 PASS 2026-09-12 — P19/packs, R4 shells, PWA + mobile wrap; store submit and CA-10 still owner |

Verification phases 13–18 are executed for the enabled scope of every release (I-06, I-13); the R2–R4 rows above inherit their own verification and closure plans when generated.

## 2. Release plan, gates and dependencies

### 2.1 Release 1 — governed development loop (phases 07 + 08)

Scope boundary (D-05): the 19 R1-bucketed registry rows in `docs/capabilities.md`; views home, work item, assistant, agent run and a minimal permissions editor (PRD-A.15 `proposal`, OQ-5); Hey Engine persistent control on the shell (PRD-E.13) showing an honest `unavailable` state in phase 1; single-tenant self-hosted deployment on one Droplet (architecture §10); GitHub as the only permissioned source; usage measurement `configured` (P14); commercial controls measured, not enforced. Everything else remains `planned` and visible (PRD-C.5). Wake-word listening and user-equivalent autonomous execution ship with the phase-2 runtime (G2), not G1.

| Gate | Passes when | Owner | Depends on |
|---|---|---|---|
| G0 Phase-0 PL verdict | all six role handoffs PASS/CONDITIONAL with bounded items; D-01…D-06 recorded; validators pass; `phase_1_foundation_plan.md` prompt executable | `project-lead-subagent` → lead | T0-1…T0-11 |
| G1 Foundation exit (phase 07) | monorepo per D-01 builds in CI; Tauri 2 shell renders the ported primitives (NFR-3 fidelity check vs `docs/ui-blueprint/`); Supabase Auth + owner seat + grant checks server-side (AUTH-01…AUTH-20 phase-1 tests); DBOS system DB configured; Compose networks `edge`/`app`/`data`/`worker` with only API + Auth published (F-SEC-02); registry service returns 43 rows; usage-event schema passes Security review (GM-11, F-SEC-16); fail-closed worker config (AUTH-25); keychain-only tokens (AUTH-26); capability files reviewed (AUTH-30); `LICENSE`/`NOTICE`, lockfiles, `npm ci --ignore-scripts`, audits, secret scanner (LIC-01, 09, 10, 12, 14) | SE (build), Security (re-review), PL | G0; owner: branch decision, toolchain confirmed |
| G2 Development-loop exit (phase 08) | Hermes interception spike SP-1…SP-7 passes Security re-review before any side-effecting toolset is enabled (F-SEC-01, D-S1); one real Engine Labs change completes the 11-stage loop with sponsored, scoped, budgeted run, action-bound approval, receipts and linked evidence (R1-ACC-6); interruption trials show zero duplicated external effects (V3, PRD-B.7); V4 capture per change (four measures + `not_captured` rule, §3); GitHub App scoped grants (AUTH-12 intersection) | SE, Security, PL | G1; owner: model-provider account, GitHub App, Hermes licence verified (H-5), provider terms recorded (H-4) |
| G3 Release verification (phases 13–18) | verification index `docs/verification.md` rows for the R1 scope VERIFIED or NOT_APPLICABLE with evidence; fixture-tenant erasure test (ERA-20) and backup restore drill (DRR); desktop fidelity and a11y (including F-S7 tab-order fix, `#617083` contrast token if adopted); V5 usability pass over built views with zero technical-trace exposures; first-baseline report (§3); release artefacts signed from protected CI (LIC-16); owner handoff prepared | PL, Security, SE, UI/UX | G2; owner: DigitalOcean, Apple signing, backup target, CI secrets (names in phase plan §16) |
| G4 Owner release decision | owner records `APPROVE` / `REQUEST_CHANGES` / `DO_NOT_PROCEED` on the owner handoff | owner | G3 |

Dependency order inside R1: contracts (`packages/contracts`, D-02 schema) → API + auth + grants → `packages/ui` port → desktop views → worker adapter (read-only toolset first) → interception spike → development loop → verification.

### 2.2 Release 2 — collaboration and connections (phase 09, `accepted`)

Entry: G4 APPROVE for R1; OQ-G2 member measurement notice decided (D-23); OQ-5 remaining views scheduled (connection setup B.5). Content delivered in Phase 4: Project Lead / Operator / guest templates, connection wizard, source-permission intersection, B12 deny-by-default catalogue, GitHub P07 checkpoints, People/Inbox API overlay. Live Gmail/Slack OAuth and a second human user remain owner-gated. Gates: destination class + intersection (D-25); member notice before first non-founder seat (OQ-G2, F-G6).

### 2.3 Release 3 — company operations (phase 10, `accepted`)

Entry: R2 G5. Content: memory manager view (B.6), adaptive views (§D; AUTH-29 constraints binding from R1), personalisation (MEM policy), first R3 domains B01 and B03 (D-27), the 14 R3-bucketed rows. Gates: usability targets set from the R1/R2 first-baseline before R3 tests (NFR-4); adaptive-view screenshot-diff enforcement (PRD-A.11).

### 2.4 Release 4 — commercial delivery, ecosystem and mobile (phases 11 + 12, `accepted`)

Entry: R3 closure and the commercial decision gate in §4 (CA-1…CA-10 all evidenced). Content: entitlements, allowances, reservations and limit enforcement in billing test mode before any charge (PRD-G.12), tier UI after OQ-4, licensing state (ERA-17), connector SDK/domain packs (P19), mobile clients, remaining market domains (I-12); the six R4-bucketed rows. Gates: two separate owner decisions — publish rates; activate charges (CA-10); Security review of billing reconciliation (CA-4); decommissioning drill (ERA-15).

## 3. Measurement and validation

Source of truth: `docs/workstreams/20260910-engine-labs-company-os/growth-marketing-subagent/handoff.md` §5.2–§5.5 (T0-10, CONDITIONAL). No analytics source exists and no baseline has been measured; every threshold below without data is labelled `first-baseline` (NFR-4, PRD §10, blueprint §16). Absence of data is reported as absence, never interpolated (GM-2, DRR-21).

### Baseline definition (single-user pilot)

n=1 founder, one release revision, ≥3 completed changes (V4) and one usability pass (V5). Baseline = recorded per-item values and min/median/max stored as `MetricRecord` rows and reported in `docs/verification.md` (R1-ACC-11) with the revision SHA. Purpose is first-baseline capture, not optimisation; R2 targets are set from these records before R2 tests. Missing measures are recorded `not_captured` with a reason. Fixed values are requirements, not targets: zero duplicated external effects (PRD-B.7), zero successful authority violations, zero technical-trace exposures for operators (PRD-A.14).

### Validation thresholds V4/V5 (blueprint §7, restated)

| # | Experiment | Pass threshold | Label | Phase |
|---|---|---|---|---|
| V4 | Three real Engine Labs changes through the loop; measure interventions, context switches, wall time, cost per completed outcome | ≥1 change fully reviewed with linked evidence (binary, R1-ACC-6); all four measures recorded per change | `first-baseline`; comparator to current IDE-agent workflow not testable in R1 (no data) | 2 |
| V5 | Usability pass with Founder seat over built views (4+1 per OQ-5; B.5/B.6 NOT_APPLICABLE until R2/R3) using the routine-task list in handoff §5.2 | every routine task completable; technical-trace exposures = 0 (requirement) | task time/errors `first-baseline` | 3 |

### Metric taxonomy

Privacy class C2, personal-data flag true (pseudonymous) for all rows (DRR-01, DRR-20). Owners: definition Growth; instrumentation/derivation SE; schema review Security (GM-11); gate reporting PL. Consent: first-party, in-tenant, disclosed in Settings → Data; no third-party SDK (GM-4).

| Metric | Definition | Unit | Event source | First-baseline rule | PRD |
|---|---|---|---|---|---|
| Task completion | Stages of the 11 PRD-B.1 stages reached/completed per item; end-to-end yes/no; wall time | stages; boolean; s | `work.stage.completed`, `work.item.closed`, `agent.run.completed` | record per item | B.1, §10 |
| Correctness | Review outcome; check pass ratio; defects linked after review | enum; ratio; count | `work.stage.completed` (review), check records | record per change | B.3, §10 |
| Recovery | Retries, diagnostic attempts, escalations; failure→resume seconds; duplicated effects | counts; s; count (=0 required) | `agent.run.retried/recovered/escalated`, receipts | record per run | E.7, E.8 |
| Operator intervention | Approvals, corrections, clarifications, escalations answered, mid-work grants per completed outcome | count by reason enum | `approval.decision.*`, `work.item.edited`, `agent.run.escalated`, `permission.grant.changed` | record per item | D.9, E.8 |
| Context switching | Distinct views, view changes, source-app handoffs, assistant opens per item | counts | `nav.view.opened`, `handoff.source_app.opened`, `assistant.panel.opened` | record per item | A.5, §10 |
| Cost per completed outcome | Tokens by model band, tool calls by class, execution seconds, cost band (external) / ledger cost (internal), no double counting | tokens; count; s; band | `usage.provider_event.recorded` (dedupe), `usage.budget.reserved/reconciled` | record per item; ledger = provider usage (G.3) | G.3, G.11 |
| Guardrail: authority violations | Refused attempts; successful unauthorised actions (=0 required) | counts | AuditEvent | requirement | D.5, D.11 |
| Usability (R3+) | Completion time/errors adaptive vs fixed; no technical traces | s; count | `view.adaptation.*`, `nav.view.opened` | targets from pilot baseline | A.11, A.12 |
| Infra recovery/performance | Restore time, data-loss window, resource headroom | s; s; % | operations measurement (NFR-5/6) | set before testing (V6, V17-5) | NFR-4, NFR-6 |

### Event convention and schema

- Name: `<domain>.<object>.<action>` — lowercase, dot-separated, snake_case segments, past-tense action. Domains: `work`, `agent`, `approval`, `assistant`, `nav`, `handoff`, `connection`, `memory`, `view`, `permission`, `usage`, `auth`.
- Required properties (GM-1 / DRR-20 permitted set): `event_name`, `event_id`, `occurred_at`, `tenant_id`, `member_pseudonymous_id`, `run_id`, `mode`, `model_band`, token counts, `tool_call_counts_by_class`, `duration_ms`, `estimated_cost_band`, `outcome_code`, `schema_version`.
- Proposed extension properties (identifiers/enums only; **Security schema review required before implementation — GM-11, F-SEC-16, DRR-26**): `work_item_id`, `stage_id`, `view_id`, `approval_class`, `tool_class`, `seat_template`, `provider_event_id`, `intervention_reason`, `recovery_kind`, `handoff_target`, `adaptation_version`.
- Prohibited by schema: prompt/message text; conversation, file, document or memory content (counts by kind/class only, MEM-20); external individuals' personal data; names, emails, auth ids, IPs, fingerprints; full model configuration; credentials (C3); free text; repository paths or diffs.

### Initial event catalogue (R1 unless stated)

| Event family | Surface (`docs/blueprints/ui-blueprint.md`) | Metric | Release |
|---|---|---|---|
| `work.item.created/edited/closed`, `work.stage.completed` | B.2 Work item, Home | task completion, correctness, intervention | R1 |
| `agent.run.started/paused/resumed/cancelled/completed/failed`, `agent.run.retried/recovered/escalated` | B.4 Agent run, B.3 run card, Home | task completion, recovery, cost | R1 |
| `approval.request.created/voided`, `approval.decision.approved/rejected` | Home decisions, B.4, B.3, notifications | intervention, guardrail | R1 |
| `assistant.session.started`, `assistant.mode.switched`, `assistant.panel.opened`, `assistant.message.sent` (count only) | B.3 Assistant | context switching, mode usage | R1 |
| `nav.view.opened`, `nav.tab.switched`, `nav.palette.used` | §C tabs, palette | context switching | R1 |
| `handoff.source_app.opened` | B.2, B.5 | context switching | R1/R2 |
| `connection.api.disconnected/reconnected`, `connection.provider.unavailable/restored`, `connection.setup.completed` | §C status bar, B.5 | reliability, connector demand | R1/R2 |
| `memory.search.executed`, `memory.item.inspected` | B.3 (R1), B.6 (R3) | usability, MEM-20 counts | R1/R3 |
| `permission.grant.changed` | B.7 Permissions editor | intervention | R1 |
| `view.adaptation.previewed/applied/reverted/reset` | §D adaptive views | usability | R3 |
| `usage.provider_event.recorded`, `usage.budget.reserved/reconciled` | B.4 Usage/Budget, ledger | cost | R1 measure, R4 enforce |
| `auth.session.signed_in/signed_out` | §C Auth | activation (R2) | R1 |

Server-side transitions are the single source for run/approval/usage events; UI emits only navigation, panel, handoff, connection-state and adaptation events.

### Retention, destination and consent constraints

- Events retained 365 days then aggregated; not individually erasable; excluded from exports after organisation erasure and aggregated within 30 days (GM-3, ERA-14).
- Destination: tenant Postgres only; no external measurement destination, SDK, pixel, replay or fingerprinting (GM-4, GM-12, DRR-22, DRR-26); optional telemetry opt-in and scrubbed.
- No cross-tenant learning or benchmarking (GM-5, DRR-23); preference learning never feeds segmentation (GM-6, MEM-19).
- Disclosure: "What Papership measures" list in Settings → Data; member notice before first non-founder seat (R2, OQ-G2 accepted D-23). Lifecycle messaging only via consented channels; no contact harvesting (GM-7, DRR-25); first-party consented attribution only (GM-10).
- Experiments never vary authorization, approval, retention, safety or pricing disclosure (GM-9, DRR-27).
- Gate: Security schema review in phase 1 before any event is emitted (GM-11; F-SEC-16 re-verification).

## 4. Commercial activation

Source of truth: `docs/workstreams/20260910-engine-labs-company-os/growth-marketing-subagent/handoff.md` §5.5–§5.7. Commercial activation is a decision gate at R4 / blueprint phase 11 (I-05, I-11, PRD-G.10). No price, allowance quantity, seat count or rate appears in this document or in any release before that gate. Public labels are Free / Basic / Professional / Enterprise (D-29 / OQ-4). Intake names Tier 1–4 remain the internal ids.

### Tier communication principles (binding for any UI or document that mentions tiers)

1. Non-billing views show only remaining allowance and estimated action cost band; detail lives in the billing view (PRD-G.6).
2. Tokens and money are separate figures; model band named, full configuration never shown (PRD-G.2, GM-1).
3. Reservation before dispatch is visible; limits are never a surprise (PRD-G.4).
4. A reached limit pauses new chargeable work only; records, exports and pending decisions stay accessible and the copy says so (PRD-G.4).
5. Cross-tier guarantees always stated: isolation, permissions, essential audit, export, deletion (PRD-G.7).
6. Hosted capacity, backup storage and support are separate named line items; customer tool subscriptions separate unless authorised (PRD-G.8).
7. No dark patterns: no "most popular" nudges, countdowns, fake scarcity, pre-selected upgrades or obstructed downgrade/export.
8. No certification, compliance, "zero retention" or provider-guarantee claims without a decision record with evidence (GM-8, DRR-06).
9. Pricing-disclosure behaviour is never experimented on (GM-9, DRR-27).

### Activation prerequisites (all required before publication or charge)

| # | Prerequisite | Evidence | Owner |
|---|---|---|---|
| CA-1 | Measured infrastructure, model/tool and support costs under realistic concurrency (NFR-6, V17-5) | measurement report | SE / PL |
| CA-2 | First-baseline cost per completed outcome from the R1 pilot | `MetricRecord` set | SE / PL |
| CA-3 | Versioned rate card; every charge references rate-card version + ledger entry (PRD-G.5) | artefact + schema | SE / owner |
| CA-4 | Four entitlement/usage models validated in billing test mode incl. no duplicate charges (PRD-G.12, V17-2/3) | test results | SE / Security |
| CA-5 | Licensing: LICENSE/NOTICE, inventory, Hermes licence verified (LIC-01/02/05/07, H-5); SDK licence decision (LIC-03) | artefacts, decisions | SE / owner |
| CA-6 | Provider data-use terms recorded (DRR-06, H-4) | decision record | owner |
| CA-7 | Export at all tiers; erasure/offboarding exercised (PRD-F.7–F.9) | test evidence | SE |
| CA-8 | Tier labels decided (OQ-4) | decision | owner |
| CA-9 | Support ownership and service targets from measured behaviour (phase 11) | runbook | owner / PL |
| CA-10 | Separate owner decisions to publish rates and to activate charges | decision records | owner |

### Pilot learning plan (what R1 records to inform R2 scope and later pricing)

| Learning question | R1 record | Informs |
|---|---|---|
| Cost of one completed change by component | tokens by band, cached vs fresh, tool calls by class, execution seconds, retries, ledger cost | allowance structure and rate-card line items (R4 only) |
| Where and why the founder intervenes | `intervention_reason` distribution; approvals by class; escalations | R2 delegation/seat design; policy-defaultable approvals |
| Recovery failures and durations | recovery kinds, failure→resume seconds, incidents, V3 trials | R2 reliability priorities; hosting line item |
| Outcomes needing a missing connection | `connection.provider.unavailable`; PRD-A.4 explanations shown by provider | R2 connector order (B02, B12, B23, P07) |
| Modes and views carrying the work | mode usage; `view_id` opens; assistant opens | OQ-5, OQ-6, R3 adaptive priorities |
| Allowance/cost display comprehension | V5 walkthrough item | PRD-G.6 copy; tier communication |
| Pilot resource consumption | NFR-6/V6 report | VPS sizing; hosted-capacity item |
| Unmet needs | qualitative ledger decisions (content stays in ledger, not events) | R2 scope; positioning objections |

Reporting: PL includes first-baseline records (min/median/max, `not_captured`) in the phase-3 verification index (R1-ACC-11) and the owner handoff; R2 targets are set afterwards (NFR-4).

### Go-to-market posture — DRAFTS ONLY (owner approval required before any publication)

- Positioning (draft, 57 words; publishable only after R1-ACC-3/6/7/8 are VERIFIED): "Engine Labs is the company operating system for founders who run work through agents they must be able to hold accountable: every run is sponsored, scoped, budgeted and receipted; approvals bind to the exact action and version; jobs survive a closed laptop; and every decision is retained as governed company memory — starting with shipping your own software."
- Audience and communities (blueprint §14): founder/indie-hacker, AI-agent builder and open-source orchestration communities; community rules must be fetched and recorded before any draft is considered.
- Trust assets: verified development-loop evidence; adopted authority-model and recovery documentation; honest capability claims on the handoff §5.1 dimensions, re-verified against primary sources with fetch dates.
- Sequence: founder pilot (R1) → invited seats (R2) → design partners in one sector (R3) → activation with published rates (R4, after CA-1…CA-10).
- Content concepts (drafts): timeout-after-write problem post; interruption-trial build journey (after V3 results exist); credential-scoping checklist.
- Open questions: OQ-G1 owner appetite for a public build-log; OQ-G2 member measurement notice/legal basis before R2 seats.

### Ethics constraints (binding)

No astroturfing, sockpuppets or undisclosed promotion; no deceptive scarcity or dark patterns; no rule evasion; affiliation disclosed in every post; claims traceable to evidence and matching verified architecture (GM-8); lifecycle messaging only via consented channels, no contact harvesting from connected sources (GM-7); experiments never vary authorization, approval, retention, safety or pricing disclosure (GM-9); first-party consented attribution only, no cross-site tracking (GM-10); no exploitative targeting; no publication or spend without an explicit owner decision.

## 5. Security gates carried across releases

From `docs/workstreams/20260910-engine-labs-company-os/security-engineer-subagent/handoff.md` (CONDITIONAL, 19 findings):

| Gate | Findings / policy | Release / phase |
|---|---|---|
| Fail-closed worker configuration; side-effecting toolsets `unavailable` until spike | F-SEC-01, AUTH-25, D-S1 | phase 1 (config) → phase 2 (spike SP-1…SP-7 + Security re-review) |
| Public exposure limited to API + Auth | F-SEC-02, AUTH-20 | phase 1 (Compose assertion + external port scan) |
| Approval as `approval.<class>` grant; agents never approvers; Engine Labs API owns the approval record | F-SEC-04, AUTH-09…AUTH-11a | phase 1 (schema constraint + tests) |
| RLS + non-superuser API role; service-role key admin-only | F-SEC-03, AUTH-19 | phase 1 |
| Token lifetimes, rotation, revocation ≤ 60 s; desktop purge | F-SEC-06, AUTH-13, AUTH-14 | phase 1 |
| Usage-event schema review (identifier/enum extension fields) | F-SEC-16, GM-11, F-G1 | phase 1, before any event is emitted |
| Tauri capability review; keychain-only tokens; no reference auth patterns | F-SEC-17, AUTH-26, AUTH-27, AUTH-30 | phase 1 |
| Supply chain: lockfiles, audits, `--ignore-scripts`, secret scanner, pinned Actions, Dependabot | F-SEC-10…12, LIC-09…LIC-15, H-2 | phase 1 (CI) |
| Fixture-tenant erasure test; receipt format; workflow resumption | F-SEC-14, ERA-08, ERA-12, ERA-19, ERA-20 | phase 2/3 |
| Backup expiry, pre-erasure restore procedure, signing-key placement, provenance | ERA-13, LIC-16, LIC-17 | phase 3 |
| Hermes licence and digest pin | LIC-05, LIC-08, H-5 | before phase-2 spike |

## 6. Deferred human actions by release

Actions the agent cannot perform; recorded, not requested, until they become strict blockers. Environment-variable names live in `docs/plans/phase_0_foundations_plan.md` §16 (no values anywhere).

| Release / phase | Action | Source |
|---|---|---|
| Before first push | Decide default branch (`master` vs `main`); decide whether to commit the control plane and docs | phase-0 plan §17; H-1 |
| Phase-0 PL gate | Ratify D-01 monorepo layout and D-04 Hermes adapter contract; adopt D-02, D-03, D-05, D-06 and the five `proposed` policies via decision records (H-6); answer OQ-5 (R1 view set); acknowledge D-3 contrast token `#617083` and D-11 default theme | manifest §14; UI/UX §12; Security §12 |
| Phase 1 | Confirm toolchain on the workstation; pin GitHub Actions by SHA and enable Dependabot in the protected workflow (H-2); branch protection on product repositories (H-3) | phase-0 plan §17; Security H-2/H-3 |
| Phase 2 | Provision model-provider account (`MODEL_PROVIDER_API_KEY`); create the GitHub App; confirm this repository as the phase-08 development repository (OQ-1); record provider data-use terms (H-4); verify Hermes licence (H-5) | phase-0 plan §17; Security H-4/H-5 |
| Phase 3 | DigitalOcean account/Droplet and token; Apple developer account for signing/notarization; backup target; CI signing secrets in a protected environment (H-7); release decision `APPROVE` / `REQUEST_CHANGES` / `DO_NOT_PROCEED` | phase-0 plan §17; LIC-16 |
| R2 | Gmail/Slack developer apps (OAuth names wired, secrets missing); Telegram/WhatsApp still planned; OQ-G2 accepted in product (D-23); OQ-G1 no public build-log (D-30) | `docs/handover/phase-4-owner-actions.md` |
| R4 | Publish rates; activate charges (two separate decisions, CA-10); approve any GTM draft before publication. Tier labels already accepted (D-29). | Growth §12; PRD §12 |

All of these are consolidated into `docs/plans/final_implementation_checklist.md` at each release's closure phase.

## 7. Open questions carried

| ID | Question | Owner | Needed by |
|---|---|---|---|
| OQ-1 | Confirm this repository as the founder development repository for phase 08 | owner | phase 2 |
| OQ-2 | First R3 domains | owner | **accepted D-27** — B01, B03 + memory/adaptive views |
| OQ-3 | Phase-to-release numbering for 09–12 | owner | **accepted D-28** — R2=09, R3=10, R4=11+12 |
| OQ-4 | Tier public labels | owner | **accepted D-29** — Free / Basic / Professional / Enterprise; no prices |
| OQ-5 | R1 view set (proposal: home, work item, assistant, agent run, minimal permissions editor) | owner | before `phase_1_foundation_plan.md` |
| OQ-6 | Assistant modes exposed in R1 | owner | phase 1 |
| OQ-U1…OQ-U4 | UI/UX questions (Board in R1; fonts Inter/JetBrains Mono vendoring; others per UI/UX handoff §12) | owner | phase 1 |
| OQ-G1 | Public build-log appetite | owner | **accepted D-30** — no public build-log until a later publish decision |
| OQ-G2 | Member measurement notice / legal basis | owner (legal) | **accepted D-23** — notice + `oq_g2_recorded` gate; live second seat still owner action |

## 8. Maintenance

- Update §1 status column and §2 gate results at every phase-plan closure; never delete rows.
- Any change to the phase-to-release mapping requires a decision record superseding D-05.
- Re-run the price scan from Growth evidence EV-G09 (currency symbols followed by digits, and three-letter currency codes; expected `rg` exit 1) on this file after every edit to §3–§4.
