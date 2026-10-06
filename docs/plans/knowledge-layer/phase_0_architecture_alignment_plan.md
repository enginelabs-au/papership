---
plan: phase_0_architecture_alignment
status: complete_conditional
created: 2026-10-06
updated: 2026-10-06
owner: lead-agent
source_phase: owner Knowledge Layer roadmap, 2026-10-06
workstream: docs/workstreams/20261006-knowledge-layer/manifest.md
decision: docs/decisions/2026-10-06-knowledge-layer-mission.md
---

# Phase 0: Knowledge Layer architecture and repository alignment

## 1. Objective

Record how the existing Papership Workspace becomes the Knowledge Layer for agents, without changing the running product. Produce the architecture set, the repository verdicts, the phase dependency path, and a readiness verdict. Stop before KL-P1.

## 2. Relation to project end-state

End state: one platform, one knowledge network, four client modes, with Context Graph, Resolver, Trust, Impact, Knowledge API, and Lifecycle Fabric. Commerce is optional. This phase only fixes the map and the guards so later phases do not dead-end. The map is `docs/knowledge-layer/PHASE_ROADMAP.md`.

## 3. Entry criteria and inherited evidence

- Company OS phases 0–7 are closed (G11 PASS). Checklist: `docs/plans/final_implementation_checklist.md`.
- Live Workspace is blueprint-2 at `/papership`. Desktop Tauri loads that build.
- Owner authorized this roadmap and then authorized Phase 0 implementation.
- Read-only audits of API, web, and desktop/infra completed 2026-10-06 and are distilled in `docs/knowledge-layer/REPOSITORY_AUDIT.md`.

## 4. Scope

- `docs/knowledge-layer/` architecture set.
- This plan, workstream manifest, decision D-36.
- Index lines in `docs/README.md`, `docs/plans/README.md`, `docs/roadmap.md`.
- State, memory, outstanding-tasks, and continuation log.
- Read-only security review of the security and ownership docs.
- Control-plane link for the existing git-safety script so bootstrap can validate.

## 5. Non-goals

- No Papership Registry marketplace.
- No Resolver.
- No desktop Bridge feature work and no mobile app.
- No payments and no charge flag change.
- No broad refactor, schema migration, or UI edit.
- No new package or plugin standard.
- No KL-P1 implementation.

## 6. Current-state audit

See `docs/knowledge-layer/REPOSITORY_AUDIT.md`. Summary: keep the blueprint-2 shell, authority core, memory policy, worker tool policy, and Tauri host. Adapt memory items, loop artifacts, jobs, contracts, and the API overlay in later phases. Deprecate dead dashboard code and the unused desktop `src` shell later. Treat unused Postgres, dual dispatch, `packages/ui`, schedules, and `internal/` as open items KL-O1 through KL-O5.

## 7. Assumptions, constraints, risks, and decisions

Assumptions:

- The owner roadmap is the product contract for this mission (product-manager role skipped).
- Blueprint-2 stays the live chrome through KL-P0 (KL-O6).
- SQLite stays the store until KL-O1 is decided (KL-D3).

Constraints:

- D-12 and D-14: users own content.
- D-25: Hermes write and external `accepted` stays unauthorized.
- Charges stay off.
- Do not edit `www.enginelabs.com.au`.
- Git identity is the Cursor anonymous address. No secrets in markdown.

Risks:

- Readers may confuse the capability registry with the Papership Registry. KL-D9 and the docs say both names.
- Readers may treat "No Phase 8" as a ban on KL-P8. D-36 says it is not.
- Security model describes seams that are still present in code. The review must not be read as a claim that those seams are fixed.

Decisions: D-36 and KL-D1 through KL-D9.

## 8. Dependencies

- Closed Company OS baseline.
- Policies AUTH, MEM, and DRR.
- No external account, DNS, or credential.

KL-P1 depends on this plan's next-prompt section and on a security verdict that is not BLOCKED.

## 9. Architecture and affected systems

Documented in `docs/knowledge-layer/ARCHITECTURE.md`. No runtime system is changed. Affected documentation systems: `docs/`, `.cursor/STATE.md`, `.cursor/memory/`.

## 10. Files and paths in scope

- `docs/knowledge-layer/*.md`
- `docs/plans/knowledge-layer/phase_0_architecture_alignment_plan.md`
- `docs/workstreams/20261006-knowledge-layer/**`
- `docs/decisions/2026-10-06-knowledge-layer-mission.md`
- `docs/README.md`, `docs/plans/README.md`, `docs/roadmap.md`
- `docs/handover/outstanding-tasks.md`
- `.cursor/STATE.md`, `.cursor/memory/MEMORY.md`, `.cursor/memory/memories/2026-10-06-continuation.md`
- `.cursor/skills/git-safety/SKILL.md`, `.cursor/SKILLS.md`

Out of scope: `apps/`, `services/`, `packages/`, `infra/`, `vercel.json`.

## 11. Supporting documents to create or update

Created: the twelve files under `docs/knowledge-layer/`, this plan, D-36, the workstream manifest, and the security and owner handoffs.

Updated: the three docs indexes, outstanding tasks, state, and memory.

## 12. Ordered implementation tasks

### T0. Bootstrap and git-safety link

- Objective: make `bash .cursor/scripts/bootstrap.sh` pass.
- Dependencies: none.
- Files: `.cursor/skills/git-safety/SKILL.md`, `.cursor/SKILLS.md`.
- Notes: the script already existed untracked. The skill page must contain `scripts/git-safety.mjs`.
- Validation: bootstrap exit 0.
- Completion: done when bootstrap prints `bootstrap complete`.

### T1. Mission decision and workstream

- Objective: record D-36 and the role matrix.
- Dependencies: T0.
- Files: `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/workstreams/20261006-knowledge-layer/manifest.md`.
- Validation: both files exist and name KL-P0 non-goals.
- Completion: done on write.

### T2. Architecture set

- Objective: write VISION, ARCHITECTURE, DOMAIN_BOUNDARIES, CANONICAL_CONCEPTS, PHASE_ROADMAP, CONTEXT_LIFECYCLE, DATA_OWNERSHIP, SECURITY_MODEL, EXTERNAL_INTEGRATIONS, CLIENT_ARCHITECTURE, DECISION_LOG, REPOSITORY_AUDIT, and the index.
- Dependencies: T1.
- Files: `docs/knowledge-layer/`.
- Notes: map every canonical concept to a current seed or to "none". Include the Workspace-to-KL-P1 table.
- Validation: relative links resolve. No prices invented beyond existing D-35 references. No secret values.
- Completion: done when the index lists every file.

### T3. Security review

- Objective: independent read-only review of SECURITY_MODEL and DATA_OWNERSHIP.
- Dependencies: T2.
- Files: `docs/workstreams/20261006-knowledge-layer/security-engineer-subagent/`.
- Validation: handoff verdict is PASS, CONDITIONAL, or BLOCKED with findings.
- Completion: done when the handoff is materialized and any doc fixes it requires are applied.

### T4. Indexes, state, owner handoff

- Objective: point the repo at the new namespace and record readiness.
- Dependencies: T3.
- Files: docs indexes, outstanding-tasks OT-73, STATE, MEMORY, continuation, `delivery/owner-handoff.md`.
- Validation: STATE names KL-P0 as the active phase and says KL-P1 has not started.
- Completion: done on write.

### T5. Validate

- Objective: prove docs-only diff and control-plane checks.
- Dependencies: T4.
- Validation: link check, secret and currency scan, `policy.test.mjs`, `validate-agent-config.mjs`, launch-pipeline validate, `git diff` limited to docs and control-plane paths.
- Completion: done when those commands pass or the limitation is recorded in section 20.

## 13. Adaptive role and delegation map

| Role ID | Required or skipped | Reason | Predecessor | Owned paths | Gate evidence | Status |
|---|---|---|---|---|---|---|
| product-manager-subagent | skipped | Owner roadmap is the contract | — | — | manifest | skipped |
| ui-ux-developer-subagent | skipped | No UI change until KL-P1 | — | — | manifest | skipped |
| software-engineer-subagent | required, lead-executed | Docs and audit | — | `docs/knowledge-layer/`, this plan | this plan section 20 | lead-executed |
| security-engineer-subagent | required | Security and ownership docs | T2 docs | `security-engineer-subagent/` | handoff.md CONDITIONAL | complete |
| growth-marketing-subagent | skipped | No measurement or commercial change | — | — | manifest | skipped |
| project-lead-subagent | required, lead-executed | Readiness verdict, not a release | security handoff | `delivery/owner-handoff.md` | owner handoff | complete |

## 14. Test and validation matrix

| Requirement | Validation method | Expected evidence | Status |
|---|---|---|---|
| Repository audited with five verdicts | Inspection of REPOSITORY_AUDIT.md | Tables for web, API, desktop, policies | done |
| Workspace identified | CLIENT_ARCHITECTURE.md and audit section | blueprint-2 path named | done |
| Architecture, boundaries, concepts | Files exist and cross-link | README index | done |
| Phases KL-P1–KL-P15 have a dependency and an exit | PHASE_ROADMAP.md | One row each | done |
| Ten conceptual docs plus decision log | File list | README | done |
| Product still functional | `git diff --stat` has no `apps/`, `services/`, `packages/`, `infra/` | recorded in section 20 | done |
| No secrets or new prices | ripgrep | no matches in the new docs | done |
| Security review | handoff verdict | CONDITIONAL, not BLOCKED | done |

## 15. Security, privacy, reliability, accessibility, and performance checks

- Security and privacy: review of SECURITY_MODEL.md and DATA_OWNERSHIP.md. No new data collection. Usage emit stays off.
- Reliability: no runtime change.
- Accessibility: no UI change.
- Performance: no runtime change. The store-lock seam is documented, not "fixed" on paper.

## 16. Environment-variable registry

No new variables. Names only.

| Variable name | Purpose | Scope/environment | Required by phase | Source/provider | Status |
|---|---|---|---|---|---|
| ENGINE_STORE_PATH | SQLite file | API, worker | later phases read it | local / compose | existing |
| ENGINE_JWT_ISSUER | JWT check | API | unchanged | operator | existing |
| ENGINE_JWT_AUDIENCE | JWT check | API | unchanged | operator | existing |
| SUPABASE_JWT_SECRET | HMAC secret name | API | unchanged | operator secret store | existing, value not recorded |
| ENGINE_USAGE_EMIT | Impact event switch | API | stays off in KL-P0 | operator | existing, default off |
| ENGINE_BILLING_CHARGES_ENABLED | Charge switch | API | stays 0 | operator | existing |
| ENGINE_PACK_EXECUTION_ENABLED | Pack execution | API | stays off | operator | existing |
| ENGINE_TEST_HOOKS | Local session mint | API dev | not a production identity | local | existing |
| HERMES_API_BASE_URL | Runtime probe | API, worker | unchanged | operator | existing |
| HERMES_API_SERVER_KEY | Runtime transport | worker only | must not enter API or docs | worker host | existing, value not recorded |
| HERMES_VERSION_PIN | Runtime pin | API, worker | unchanged | operator | existing |
| GITHUB_APP_ID | GitHub App | API | unchanged | GitHub | existing |
| GITHUB_APP_INSTALLATION_ID | Installation | API | unchanged | GitHub | existing |
| GITHUB_APP_PRIVATE_KEY_PATH | Key path name | API | unchanged | operator | existing |
| GITHUB_APP_OWNER | Owner login | API | unchanged | operator | existing |
| GITHUB_APP_REPO | Repo name | API | unchanged | operator | existing |
| VITE_API_BASE_URL | Web API base | web build | unchanged | deploy | existing |

## 17. Deferred human-action queue

| Action | Why agent cannot perform it | Earliest required phase | Blocking now? | Final-checklist destination |
|---|---|---|---|---|
| Choose blueprint-3 as live chrome (KL-O6) | Owner visual decision | KL-P1 | no | Knowledge Layer checklist at closure |
| Decide Postgres future (KL-O1) | Consequential store move | before KL-P4 | no | same |
| Point `papership.com.au` at the product | DNS and registrar ownership | KL-P7 | no | same |
| Flip charges on | Owner commercial decision, OT-08 | KL-P11 or later | no | `docs/plans/final_implementation_checklist.md` |
| Authorize Hermes write/external tools | Security lift still unauthorized, OT-10 | not this roadmap until a new Security PASS | no | existing OT-10 |
| Push this commit | Owner asks before push | — | no | — |

## 18. Rollback and recovery

Revert the documentation commit. The running app is unchanged, so rollback does not require a deploy. Do not revert Company OS plans or policies as part of rollback.

## 19. Acceptance criteria

- Existing system is described with KEEP / ADAPT / DEPRECATE_LATER / UNRELATED / UNKNOWN.
- Workspace role is explicit, including the KL-P1 mapping.
- Domain boundaries and canonical concepts are documented.
- KL-P1 through KL-P15 each have a dependency path and an exit.
- Required docs exist and link.
- Security verdict is recorded and is not BLOCKED.
- Application, service, package, and infra trees are unmodified.
- KL-P1 has not been started.

## 20. Completion evidence

- 2026-10-06: architecture set, D-36, this plan, and workstream written.
- Security review CONDITIONAL. No high or critical finding. Wording for KL-SEC-03, KL-SEC-04, KL-SEC-05, and KL-SEC-06 folded. KL-SEC-01 and KL-SEC-02 remain open code seams with due points before KL-P1 schema work and KL-P4.
- Relative links inside `docs/knowledge-layer/` resolve. Secret and currency scan of the new docs returned no hits.
- Product trees `apps/`, `services/`, `packages/`, and `infra/` were not edited.
- KL-P1 plan was not generated. Section 22 is the prompt.

## 21. Deviations and follow-ups

- Git-safety skill page added so bootstrap's reachability check passes. The script was already on disk and used by hooks.
- Software-engineer and project-lead roles are lead-executed. Security is a separate read-only pass.
- KL-P1 plan is not generated in this phase. Section 22 is the prompt that generates it after this phase is accepted.

## 22. Next Plan Generation Prompt

Read `/AGENTS.md`, the complete core agent context, `/instructions/PROJECT_PLANNING.md`, `/instructions/ROLES.md`, `docs/decisions/2026-10-06-knowledge-layer-mission.md`, `docs/knowledge-layer/PHASE_ROADMAP.md`, `docs/knowledge-layer/CLIENT_ARCHITECTURE.md`, `docs/knowledge-layer/DECISION_LOG.md`, `docs/knowledge-layer/REPOSITORY_AUDIT.md`, this completed phase plan, `docs/workstreams/20261006-knowledge-layer/manifest.md`, the security handoff, and the owner handoff. Confirm KL-P0 acceptance criteria are met and the security verdict is not BLOCKED. Then generate exactly one plan at `docs/plans/knowledge-layer/phase_1_workspace_foundation_plan.md`.

That plan reframes the blueprint-2 Workspace into a human knowledge control plane using the mapping in CLIENT_ARCHITECTURE.md. It preserves useful Company OS behaviour. It adds nullable context references and an agent profile only as far as KL-D1 through KL-D9 allow. It does not build the Papership Registry, Resolver, Desktop Bridge, mobile app, or payments. It includes every section of `.cursor/templates/phase-plan-template.md`, a role matrix, environment-variable names only, and deferred human actions. Do not implement KL-P1 until that plan is written and the owner has asked for implementation.
