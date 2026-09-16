# USER.md

Store durable user-specific instructions and preferences here. Add new durable items near the top without duplicating existing meaning.

## Standing directives

- Keep `docs/handover/outstanding-tasks.md` current every substantive turn. Repeat every `open` / `in_progress` / `held` row at the end of the reply even if the owner did not mention those tasks. Do not drop a row because a later message ignored it.
- The product in this repository is **Papership**. Engine Labs is the company. `www.enginelabs.com.au` is a separate Engine Labs marketing/services site and must never be replaced, redirected, or have its Vercel project (`enginelabs-au-site`) edited from this workstream.
- Data responsibility (D-12, D-14): Papership/Engine Labs does not own user content. Keep only generic anonymous usage. Users own their data (self-host store; delete or request deletion). Integrations handle data under their own terms. Side-effect receipts stay until the user deletes them. Never paste secrets into chat.
- The Papership product UI is `docs/ui-blueprint/blueprint-2` mounted at `/papership` (D-32). Leftover `/cc-org-dash` redirects there. Do not invent a substitute marketing landing at `/`. Do not hybridise it with blueprint-1.
- Brand (D-13, D-20, D-21, revisable): prism-head icon is **app icon and browser tab only** — never inside the product UI. Blue primary, rainbow accent-only, fractured purple secondary. Chrome is blueprint-2 exactly (cream canvas, purple nav field, three-way theme cycle, docked Hey Engine). Product fixtures stay Papership/blueprint. Trial rate card D-35 may show Free/Pro/Max/Enterprise list prices; charges stay off until a later owner flip.
- Preserve the user's operational intent and all materially relevant requirements when improving instructions or files.
- Prefer direct execution over asking the user to perform agent-capable work.
- Operate autonomously unless blocked by credentials, permissions, a consequential design decision, destructive risk, or a material safety/security/privacy concern.
- For new projects and major implementations, use sequential phase planning beginning with `docs/plans/phase_0_foundations_plan.md`.
- Use `/launch-pipeline` and `/instructions/LAUNCH.md` as the single practical entry point for raw ideas, major changes, workstream resumption, remediation, and final closure.
- Require `/launch-pipeline` to run read-only preflight first. Every pre-Build Cursor plan must close by suggesting `bash .cursor/scripts/bootstrap.sh` as the first post-Build action, then run that command after Build or explicit Agent-mode implementation authorization.
- Use the adaptive gated role pipeline for substantive multi-domain work: require exhaustive role planning before action, document required and skipped roles, and preserve evidence-backed handoffs under `docs/workstreams/`.
- Require independent security re-verification after blocking remediation and a project-lead owner handoff for consequential product or release work.
- Defer non-blocking manual actions, credentials, provider dashboard work, production DNS, and similar user-only tasks to the final phase and consolidate them into `docs/plans/final_implementation_checklist.md`.
- Keep instructions machine-readable, structured, copyable, and directly usable.
- Avoid context bloat: keep indexes concise and load detailed files only when activated or relevant.
- Preserve exact file paths, unresolved blockers, attempts, validation evidence, and decisions needed for reliable continuation.
- Do not store secret values in markdown, plans, memory, logs, or examples.

## Platform preferences

- Prefer macOS-compatible commands and workflows.
- Vercel workflow: use `/skills/vercel-deploy-workflow/SKILL.md`; prefer Git/CLI/dashboard when MCP is unavailable.
- Supabase workflow: use `/skills/supabase-linked-migrations/SKILL.md`; on macOS, use the documented `npx` fallback when a native binary is blocked.
