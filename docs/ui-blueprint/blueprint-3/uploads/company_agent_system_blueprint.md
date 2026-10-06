# Engine Labs — Launch Pipeline Blueprint

## 1. Planning phases

### Phase 01 — Launch from the supplied blueprint

Act as the parent orchestrator for Engine Labs. Build an operator-led company operating system whose first user is its founder and whose first project is the creation and management of Engine Labs itself.

Treat `docs/blueprints/company_agent_system_blueprint.md` as the complete product intake for `/launch-pipeline` in Cursor chat. Discover and read this file during repository intake; accept its existing location elsewhere under `docs/` and record that exact path. Do not require the owner to paste these phases, restate the vision or invoke individual roles. Resolve subsequent invocations from the active Engine Labs workstream and recorded gate. Start a new product lifecycle when none exists; historical completion of the agent configuration does not establish product completion.

Follow repository-root `AGENTS.md`, `.cursor/AGENTS.md`, the complete core context and `.cursor/skills/launch-pipeline/SKILL.md`, which routes to `.cursor/instructions/LAUCH.md`. Preserve that exact filename. Apply its instruction precedence, mode selection, role gates and approval boundaries. This blueprint supplies product requirements; it does not replace the installed operating protocol.

Run `node .cursor/skills/launch-pipeline/scripts/preflight.mjs` before routing. Verify the installed repository also contains `AGENTS.md`, `.cursorignore`, `.github/workflows/agent-governance.yml` and `docs/handover/agent-governance-operator-setup.md`; bootstrap requires these existing files and does not generate them. Treat `BLOCKED` as an installation blocker and identify the exact missing or invalid artifact. Carry `MATERIALIZATION_REQUIRED` into the plan without running bootstrap early. Do not infer installation readiness from the bundled STATE or historical test results.

Infer answers from this blueprint, current repository evidence and recorded owner decisions first. Use Cursor's AskQuestion tool for unresolved consequential choices or strict blockers, bundling related questions and explaining their impact. If that tool is unavailable, ask concise questions in chat. Record reversible engineering assumptions with a validation point and continue. Revisit aesthetics, authority, data destinations, commercial commitments or costly architectural choices when evidence creates a material conflict. Collect non-blocking credentials, account actions and forthcoming policies for their actual activation gate; never request secret values in chat.

Present the protocol's single activation summary: lifecycle mode, preflight status, objective, risk tier/reasons, activated instructions, required/skipped roles, expected artifacts, owner decisions and next gate. For consequential new work, remain read-only in Cursor Plan Mode until Build or explicit Agent-mode implementation authorisation. Do not install dependencies, capture files, create repository plans/workstreams or modify application code before that boundary. End every pre-Build Cursor plan with:

```text
## First post-Build action

After Build, run this command before creating plans, workstreams, role artifacts, or application code:

bash .cursor/scripts/bootstrap.sh

Require a successful exit. Do not skip this step because directories already exist.
```

After authorisation, read `.cursor/BOOTSTRAP.md`, execute that command as the first mutation and require success. Then activate Strategy, Project Planning, Subagents and Roles through `.cursor/INSTRUCTIONS.md`. Materialize the workstream manifest, strategy assessment and phase-zero plan before application implementation. Use the existing templates; do not regenerate or edit protected rules, role adapters, hooks, permissions, sandbox configuration or governance files. Put product-specific implementation guidance in the linked `docs/` artifacts and role briefs.

Create `docs/workstreams/<task-id>/manifest.md` with a stable `YYYYMMDD-<slug>` task ID. Classify all six canonical roles from `.cursor/instructions/ROLES.md` as required or skipped with evidence. The parent launches required native subagents directly in dependency order and materializes each role's `charter.md`, `plan.md`, `evidence.md` and `handoff.md` under its canonical role directory. Require planning before role execution, disjoint write ownership and verified predecessor handoffs. Preserve read-only specialist boundaries; the parent owns shared plans, state and memory. Use `PASS`, `CONDITIONAL` and `BLOCKED` exactly as defined by the protocol.

Treat phases 01–18 below as ordered blueprint requirements, not eighteen pre-generated execution plans. Complete planning requirements 01–06 through `docs/plans/phase_0_foundations_plan.md`, using `.cursor/templates/phase-plan-template.md`. Map the full product lifecycle there but detail only the current phase. After each phase is implemented, verified and reconciled, execute its exact Next Plan Generation Prompt to create only the next `docs/plans/phase_<N>_<slug>_plan.md`. Include applicable verification requirements from 13–18 in every phase and repeat them for release acceptance. Keep later expansion outside the first release's completion criteria.

Inspect existing code, dependencies and supplied designs before changing them. Select maintained, compatible technologies and verify uncertain claims against primary documentation. Record material decisions under `docs/decisions/`. After bootstrap, generate the evidence-based strategy assessment at `docs/blueprints/YYYY-MM-DD_engine_labs.md` using STRATEGY.md's structure, linking this intake and approved decisions. Preserve the full domain registry; assess the initial development workflow, alternatives, value hypothesis, validation thresholds and later commercial expansion without silently changing the product's direction.

Use [enginelabs-au/Papership](https://github.com/enginelabs-au/OrgOS) as the authoritative UI reference, starting from main at commit [8a843bd6429faf1ace5a9eb6dcfb7440703d34c4](https://github.com/enginelabs-au/OrgOS/tree/8a843bd6429faf1ace5a9eb6dcfb7440703d34c4). Inspect source before Build; after bootstrap, install from the committed lockfile, run the reference UI and capture its states. Record the commit, files, launch commands and screenshots in `docs/blueprints/ui-blueprint.md`. Record deliberate reference updates instead of silently following main.

Index this intake and generated product, capability, architecture, UI, policy, roadmap and verification documents from `docs/README.md`, the manifest and `.cursor/STATE.md`. After substantive work, reconcile the active plan, role/gate, predecessor handoff, blockers and next action; append evidence to `.cursor/memory/memories/YYYY-MM-DD-continuation.md` and keep durable links in `.cursor/memory/MEMORY.md`. Resume from that evidence without repeating completed planning or asking answered questions.

Treat Build as approval for the reviewed local scope. Preserve the installed restrictions on secrets, protected files, state-changing MCP calls, remote database/infrastructure changes and production actions. Prepare policy-permitted local artifacts and validation first; route blocked operations through the owner-controlled or CI process. Do not commit, push, open a PR, publish, spend or deploy without the protocol's required action-specific authority. Never bypass a denial through another tool, script or agent.

### Phase 02 — Plan the product and its complete capability registry

Design one modular product named Engine Labs. Give every member a shared operating framework with a workspace tailored to their responsibilities. Support organisations across industries through connected applications and configurable domain modules.

Provide native identity, responsibility scopes, work coordination, conversations, agent supervision, memory governance, approvals, audit, connector administration, adaptive views and product entitlements. Keep specialist business records and calculations in connected systems. Allow a minimal native work ledger for plans, assignments, dependencies, decisions and execution evidence.

Make the disconnected framework usable for organisation setup, work planning, configuration and document intake. Explain which outcomes need a connection. Let customers connect their own tools and accounts. Use contextual handoffs whenever a source application is required.

Make the first complete workflow: product request → research → specification → plan → work assignment → isolated code change → tests → review → approved release → monitoring → retained knowledge. Use the founder's actual repository when supplied. Make this workflow useful before broad connector expansion.

Create a versioned capability registry covering every row below. For each capability record its user outcome, native or connector owner, read/write actions, data authority, required grants, dependencies, interface components, release phase, implementation status and acceptance evidence. Track planned, configured, working and unavailable capabilities distinctly.

Retain the full domain scope throughout phased delivery. Require demonstrated workflows and verified integration behaviour before marking capabilities complete.

#### Business domains

| Domain | Required coverage |
|---|---|
| B01 Strategy and governance | Goals, outcomes, KPIs, initiatives, portfolios, decisions, risk appetite, board reporting and planning |
| B02 Organisation structure | Legal entities, brands, departments, teams, locations, reporting lines, responsibility ownership |
| B03 People and capacity | Recruiting, employee records, job roles, availability, time tracking, workload, leave, onboarding/offboarding, payroll references, compensation, benefits, training and performance |
| B04 Customers and CRM | Organisations, contacts, relationships, leads, opportunities, account ownership, lifecycle and consent |
| B05 Sales and commercial scope | Enquiries, qualification, estimates, proposals, pricing, scope, contracts, signatures, renewals and change requests |
| B06 Projects and programmes | Briefs, milestones, scope, budgets, dependencies, resources, risks, time/cost references, delivery evidence and acceptance |
| B07 Tasks and personal work | Inbox, assignments, priorities, subtasks, recurring work, due dates, blockers, checklists and approvals |
| B08 Software and product delivery | Discovery, user feedback, roadmaps, requirements, design, repositories, branches, issues, PRs, tests, packages, environments, releases, feature flags, monitoring and incidents |
| B09 Service delivery and operations | SOPs, intake forms, service catalogue, work orders, queues, handoffs, SLAs and quality checks |
| B10 Customer support and success | Tickets, conversations, troubleshooting, escalations, onboarding, adoption, satisfaction and retention |
| B11 Knowledge and documents | Search, policies, SOPs, references, files, templates, decisions, versions, evidence and ownership |
| B12 Communications and meetings | Email, chat, calendars, agendas, calls/transcripts, notes, decisions, follow-up, notifications and external correspondence |
| B13 Finance and accounting | Receivables, payables, invoices, recurring billing, expenses/travel claims, budgets, project margin, forecasts, revenue references, tax records, periods and consolidation |
| B14 Treasury and payments | Cash accounts, payment proposals, signatories, bank-detail changes, transfers, FX, liquidity and reconciliation |
| B15 Procurement and vendors | Requests, quotes, purchase orders, approvals, vendor records, subscriptions, renewals and supplier performance |
| B16 Marketing and content | Campaigns, audiences, asset libraries, brand guidance, content calendars, websites, approvals, publishing and attribution |
| B17 Legal and risk | Agreements, obligations, renewals, insurance, risk registers, compliance evidence, policy acknowledgements, privacy requests and incidents |
| B18 IT and internal systems | Accounts, devices, licences, access requests, provisioning, cloud resources, security alerts, assets, changes and incidents |
| B19 Inventory and physical assets | Items, locations, availability, serials, stock movements, facilities, equipment maintenance and depreciation references |
| B20 Supply chain and field work | Orders, dispatch, routing, delivery, returns, workforce scheduling, on-site evidence and offline capture |
| B21 Manufacturing and quality | BOMs, production plans, batches, work centres, traceability, inspections, non-conformance and corrective actions |
| B22 Research and innovation | Questions, experiments, hypotheses, evidence, datasets, model runs, evaluation and IP references |
| B23 Stakeholders and external portals | Clients, contractors, partners, trustees, suppliers, investors and scoped collaboration/review |
| B24 Sector-specific operations | Care delivery, grants, fundraising, education, property, hospitality, public services, sustainability reporting and other specialist records |

#### Agent and platform domains

| Domain | Required coverage |
|---|---|
| P01 Agent workforce | Purpose, sponsor, skills, model, tool access, working hours, budgets, status and retirement |
| P02 Profiles and identities | Agent configuration, human/service identity, tenant membership, seats, responsibility scopes and delegation |
| P03 Conversations and modes | Ask, analyse, plan, draft, execute, review, automate; source/action scope, text and later voice or other modalities |
| P04 Agent execution | Runs, steps, assignments, claims/locks, checkpoints, cancellation, deadlines, handoffs and recovery |
| P05 Workflow orchestration | Events, schedules, dependencies, durable state, timers, retries, waits, approvals and compensation |
| P06 Tools and connectors | Capability registry, API/MCP access, auth, source grants, mappings, versions, quotas, health and errors |
| P07 Data ingestion and synchronisation | Imports, incremental updates, deduplication, mapping, conflicts, deletion, lineage and freshness |
| P08 Business meaning and analytics | Canonical references, metrics, reports, dashboards, currencies, calendars, units, status mapping and source precedence |
| P09 Memory and retrieval | Session, person, project, organisation and procedural memory; source, scope, freshness and correction |
| P10 Identity and authorisation | Memberships, seats, roles, row/field/action controls, source ACLs, SSO, offboarding and delegation |
| P11 Privacy and lifecycle | Classification, minimisation, retention, exports, deletion, residence, consent and encryption |
| P12 Secrets and boundaries | Scoped credentials, isolation, tool/network restrictions, rotation and egress |
| P13 Audit and provenance | Actor, intent, input versions, policy, approvals, tool outcomes, sources and record changes |
| P14 Evaluation and improvement | Regression cases, outcomes, experiments, version promotion, agent and UI metrics |
| P15 Member experience | Responsibility templates, accessible/mobile layouts, search, detail levels, notifications, localisation and preferences |
| P16 UI composition and adaptation | Intent, allowed layouts, components, ranking, pinning, rollback and fallback |
| P17 Reliability and operations | Monitoring, queues, service health, backups/restores, incidents, upgrades and compatibility |
| P18 Product commercial operations | Tenant provisioning, plans, seat/usage billing, quotas, entitlements, onboarding, support, exports and deletion |
| P19 Extensibility and distribution | Capabilities, connector SDK, domain packs, custom fields, plugin trust, migrations and tenant configuration |

Inventory the installed Hermes version's tools, profiles, sessions, skills, memory, scheduling, delegation, browser, research, code/file execution, document handling and available media capabilities. Map each into the registry with its actual dependencies and permissions. Extend this inventory as Hermes and connectors evolve.

Define acceptance at two levels: a working first development loop, then increasing verified coverage across the complete registry. Measure task completion, correctness, recovery, operator intervention, context switching and cost per completed outcome.

### Phase 03 — Plan the member experience and authority model

Design the Engine Labs desktop experience from Papership' active `/cc-org-dash` route: `src/App.jsx` routes the root there and `src/pages/cc-org-dash.jsx` assembles the shell. Treat `src/pages/Dashboard.jsx` and `src/pages/Dashboard_new.jsx` as secondary references unless the baseline is explicitly changed. Preserve the active shell's visual language and interaction patterns; replace prototype branding with Engine Labs.

Map the following reference components under `src/components/cc-org-dash/` into the design specification:

| UI area | Reference files |
|---|---|
| Design system | `primitives.jsx` for THEMES, typography, surfaces, navigation and overlays; `icons.jsx` for icons |
| Daily work | `HomeScreen.jsx`, `WorkScreen.jsx`, `InboxScreen.jsx` |
| Organisation and connected data | `PeopleScreen.jsx`, `DataScreen.jsx`, `FilesScreen.jsx`, `IntegrationsScreen.jsx` |
| Member controls | `SettingsScreen.jsx`, `AccountScreen.jsx`, `NotifDrawer.jsx` |
| Assistant and commands | `GlobalAgentPanel.jsx`, `GlobalCommandRail.jsx`, `GlobalCommandDetail.jsx`, `PlatformStatusBar.jsx` |

Preserve the defined THEMES, Inter/JetBrains Mono typography, spacing, primary tabs, command rail, assistant panel and overlay behaviour. Use `src/index.css` and `src/components/ui/` as supporting sources; preserve the bespoke screen primitives when adapting reusable components. Capture responsive and interaction states before proposing changes.

Fit system health, active priorities, running work, required decisions and a universal assistant asking “What would you like to do?” into the Papership layout. Map existing screens and components to these requirements before adding new ones. Extend missing views using the same design system. Provide role-appropriate detail without exposing prompts, API schemas or runtime configuration to normal operators.

Provide three initial seat templates:

| Seat | Responsibilities | Default authority |
|---|---|---|
| Founder / organisation owner | Strategy, organisation configuration, budgets, policy, ownership and cross-domain oversight | Administer their organisation and delegate bounded grants |
| Project Lead / domain lead | Scope, planning, dependencies, assignments, delivery review and domain improvements | Manage assigned projects/domains within delegated limits |
| Operator | Execute assigned work, use assistants, maintain relevant records and report exceptions | Access and act on explicitly assigned scope |

Represent the hierarchy as owner → domain/project lead → member. Separate job titles, seat templates and actual grants. Allow one person to hold multiple responsibilities and switch work context. A delegator may grant only a subset of their own authority; assignment never confers unrelated access.

Model organisation, legal entity, department, team, location, project, task and provider account separately. Support scoped guest participation, agency administration and several accounts with the same provider. Apply server-side role, record, field and action checks, including to search, aggregates, attachments, notifications and memory.

Intersect Engine Labs permissions with source-system permissions, the connected credential's scope and the active action policy. Keep billing entitlements separate from data authority. Require strong authentication for privileged users and reauthentication for destructive administration.

Give Engine Labs staff explicit provisioning access during setup. At handover, verify the client's ownership, replace setup credentials, revoke temporary application/cloud/SSH grants and test the resulting access. Require customer-authorised, logged, time-limited support access thereafter. Establish client-controlled infrastructure ownership before claiming handover is complete.

Let members customise personal views, filters and notifications. Let leads configure their delegated domain; let owners set organisation-wide defaults. Version shared configuration and preserve personal overrides across upgrades.

Adapt layout, visible capabilities and information density to explicit intent, role, task and available connections. Render validated declarative view definitions using trusted components. Keep navigation, active scope, evidence, approval targets, spending and destructive controls stable. Support pinning, undo, reset, keyboard access and a usable fallback.

Learn preferences within the member's scope with settings to inspect, disable and reset personalisation. Optimise task completion and error reduction. Develop new components or shared behaviour through the normal code review and release process.

Produce a design specification for the home, work item, assistant, agent run, connection setup, memory manager and permissions editor, with each view mapped to Papership components or a documented extension. Record reusable code, required adaptations and material departures in docs/blueprints/ui-blueprint.md. Ask about material aesthetic departures before implementing them. Preserve the product's permission, accessibility and cloud-execution requirements when adapting reference interactions.

### Phase 04 — Plan cloud architecture and connections

Use a desktop client with cloud execution. Keep accepted background jobs running independently of the desktop connection. Provide durable status, streamed progress, reconnect/resume and completion notifications. Distinguish closing the application from explicitly cancelling work.

Use this initial stack, preserving suitable existing repository choices where replacement would add cost without benefit:

| Layer | Initial implementation |
|---|---|
| Desktop | [Tauri 2](https://v2.tauri.app/start/), React, TypeScript and Vite; macOS first; shared UI contracts for later Windows, Linux, iOS and Android |
| API | Python FastAPI, typed request/response models, OpenAPI-generated client and streamed run events |
| Data and identity | [Self-hosted Supabase](https://supabase.com/docs/guides/self-hosting/docker) with PostgreSQL, Auth and required storage services on the assigned client VPS |
| Execution | Isolated Hermes workers behind an Engine Labs runtime adapter and policy service |
| Durable workflows | [DBOS with PostgreSQL](https://docs.dbos.dev/python/programming-guide) for persisted steps, queues and waits; an Engine Labs action ledger for external effects |
| Retrieval | PostgreSQL structured/full-text search; add pgvector when retrieval evaluation justifies it |
| Deployment | Docker Compose on a dedicated DigitalOcean Droplet per customer initially; reproducible, provider-portable infrastructure configuration |
| Operations | Structured logs, run traces, health checks, cost metrics, alerting, encrypted backups and tested restore procedures |

Reuse Papership' React/Vite frontend, Tailwind styles and compatible Radix/shadcn components. Migrate its JavaScript/JSX incrementally to TypeScript within the desktop stack, preserving appearance and behaviour. Validate dependency compatibility and desktop routing before changing versions or packaging.

Replace the shell's browser-stored prototype session and `src/lib/AuthContext.jsx` development authentication with real identity and server-enforced grants. Replace `src/api/entities.js` localStorage records with the cloud API; retain only permitted local preferences/cache. Isolate fixtures from `src/components/cc-org-dash/data.jsx`, synthetic charts and simulated agent responses as labelled demo data. Map each screen to authenticated contracts and real loading, empty, failure and permission states. Do not count reference screens or sample data as implemented capabilities.

Pin compatible releases and image digests after a compatibility spike. Keep the backend modular and the first worker count small. Disable unneeded services through supported configuration. Measure database, browser and worker resource consumption before selecting production VPS capacity.

Match installed deployment and migration skills to the approved customer-VPS architecture before activating them. Historical hosted-platform instructions and machine-specific runbooks do not establish current access or change the deployment target. Register required runtime, package-registry and provider access; defer protected sandbox/network changes to the owner-controlled installation process without weakening enforcement.

Maintain the customer's primary records, conversations, memory, artifacts, secrets and execution state in its assigned data environment. Keep any shared licensing/billing service limited to necessary account, entitlement and usage metadata. Keep customer content out of shared telemetry by default.

Keep primary customer data on the assigned VPS and store encrypted backups in a separate, client-controlled location. Configure the backup provider, region, retention, encryption-key ownership and restore access as deployment settings. Track provider snapshots separately from application backups. Treat external model/tool processing as a separate data destination requiring its own policy; permission for encrypted backups does not authorise model processing elsewhere. Do not represent a local backup on the same VPS as disaster recovery.

Use a bundled desktop UI, restricted native capabilities, secure token storage, signed releases and updates, and a narrow authenticated cloud API. Keep provider secrets and privileged execution off the desktop. Do not give generated views direct filesystem, shell, database or credential access.

Connect Hermes through its documented [API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server) and supported extension interfaces. Keep the upstream API private. Add typed adapter operations for capabilities it does not expose. Validate streaming, session ownership, cancellation, tool interception, usage reporting and isolation against the pinned version. Keep company records independent of Hermes' internal storage format.

Route side-effecting Hermes tools through the Engine Labs action service using supported hooks or scoped tool adapters. Enforce the same boundary for shell/browser network access. Treat API authentication as transport access, not per-tool authorisation. Persist tool receipts so recovery of a failed agent request cannot blindly repeat completed actions.

Make one Engine Labs workflow layer own dispatch, schedules and approvals. Map Hermes scheduling/delegation into that ownership; prevent duplicate independent scheduling of the same obligation. Persist the job before returning an accepted response.

Define connectors as versioned implementations of business capabilities. Support official APIs, reviewed MCP servers, webhooks, polling, file intake, permitted database access and supported source-app handoffs. Treat browser automation as a controlled fallback with explicit permissions and recovery.

Prioritise these actual requirements:

| Connection | Required treatment |
|---|---|
| Development repository and CI | Bind the supplied repository; scope branches, changes, checks and release operations separately |
| Gmail | Use supported OAuth access; separate read, draft and send capabilities; validate production requirements for the selected [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) |
| Telegram | Support authorised bot interaction with verified member and conversation mappings |
| Slack | Respect workspace installation, channel membership, message scope and delegated actions |
| WhatsApp | Use the official business integration path; verify account, number, webhook and messaging requirements against the [Hermes Cloud API adapter](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp-cloud) |
| Web research and browsing | Use configured Hermes tools within source, network, credential and action limits |
| Additional capabilities | Discover supported Hermes tools and add provider adapters through the same contract |

Distinguish a channel used to talk to an agent from permission to read all of a user's conversations. Preserve each provider's actual coverage.

Admit commercial connectors through supported customer authorisation and self-service developer access without a negotiated partnership dependency. Verify distribution rights, standard app reviews, restricted-scope assessments, customer plans, fees, quotas and permission coverage. Defer unsupported access routes. Register connected accounts independently of member identities; connecting an administrator's account must not expose its data to every seat.

For each connector implement typed actions, stable source IDs, authoritative field mappings, scoped credentials, source ACL checks, refresh/revocation, rate limits, sync checkpoints, signed events, deduplication, schema versions, deletion handling, freshness, outcome verification and operator recovery. Route explicitly by organisation/entity/project/account. Preserve provider-specific fields.

Make the minimum scoped projection needed for each workflow. Reconcile changes and deletions; add bidirectional sync only for declared fields. Recheck source permissions and critical record versions before actions. Use deterministic code for amounts, currencies, dates, financial metrics and validation.

### Phase 05 — Plan agents, memory, lifecycle and commercial controls

Create a universal assistant backed by essential Hermes capabilities. Support Ask, Analyse, Plan, Draft, Execute, Review and Automate modes through backend-enforced tool access. Add specialist agents when separate context, permissions or parallel work provides a measurable benefit.

Assign every run a sponsor, acting identity, purpose, scope, policy version, model configuration, budget, deadline and accountable owner. Let each role configure agents within its delegated ceiling. Track aggregate budgets across parent and child runs.

Implement the action lifecycle: retrieve authorised context → prepare a typed action → validate scope and current state → obtain required approval → reserve budget → execute → verify the source outcome → store a receipt. Bind approval to the actual action and target version. Revalidate when either changes.

Allow independent read/research, drafting, sandboxed development and reversible internal actions within established policy. Require the designated authority for external commitments, production releases, access changes, payments, destructive changes and spending beyond a grant. Apply the same rules to direct UI actions, messaging requests, agents and subagents.

Run code and browser work in isolated execution environments with least-privilege filesystem/network access. Keep source documents, messages, tool output and retrieved memory as untrusted inputs. Enforce permissions outside prompts. Separate agent profiles from execution isolation. Keep credentials and orchestration databases outside agent execution mounts.

Persist job, step, claim, checkpoint, approval, cancellation and receipt state. Recover at the last verified boundary. Wrap external effects with idempotency keys where supported and reconcile uncertain outcomes before replay. Treat a remote write followed by a timeout as potentially completed.

Build an internal diagnostic harness. Default to two safe transient retries and one bounded diagnostic attempt within the run's remaining time and budget. Use backoff, circuit breakers and an incident record. Escalate with evidence and a proposed next action when recovery fails or requires new authority, credentials, spending or a consequential change. Prevent recursive recovery loops.

Let agents propose and evaluate improvements to skills, prompts, workflows and views. Promote validated changes within the owner's policy; require review for shared or consequential changes. Keep versions, regression cases and rollback. Prevent self-granted permissions and direct self-modification of production code or security controls.

Build memory across sessions, personal preferences, projects, domains, organisation knowledge and procedural skills. Retain useful history within configured storage and retention limits. Separate source records, approved facts and model-inferred candidates.

Store provenance, owner, source permissions, timestamps, verification state, expiry and version for substantive memory. Support searching, inspecting, correcting, merging, restricting, archiving, exporting and deleting it. Recheck permissions before retrieval and apply contributing source restrictions to derived summaries and embeddings.

Scope Hermes sessions and runtime memory by tenant and authorised principal/project context. Hydrate runs only with permitted knowledge; write durable memory back through the governed store. Prevent shared runtime memory files or session identifiers from crossing permission boundaries.

Use configurable starting retention: conversation history 365 days, execution/debug logs 30 days and rotating backups 30 days; keep approved organisational knowledge until superseded, deleted or expired by policy. Make these settings visible and overridable by authorised owners, subject to applicable source and record requirements. Exclude credentials from memory and minimise copied sensitive data.

Default to no cross-customer content learning or training. Keep preference learning personal and operational evaluation within the tenant. Require explicit policy for any broader use. Keep model and data-processing providers configurable; activate them under the forthcoming owner policies, with test fixtures until relevant live-data permissions are established.

On offboarding, revoke sessions, grants and personal credentials; stop affected queued/running actions at safe boundaries; archive work and request an owner's disposition. Continue only workflows already sponsored by an independent authorised service identity. Give archived work a visible owner and decision deadline.

Implement domain erasure as a scoped request with owner approval and a dependency/impact preview. Allow organisation-wide erasure only after owner reauthentication, explicit scope confirmation and an additional final confirmation. Suspend affected runs, revoke credentials and clear primary content, artifacts, summaries, indexes, caches and replicas. Process backups, snapshots and external deletion requests under their actual retention capabilities; disclose pending copies and required retention exceptions. Produce a deletion receipt. Keep deletion in connected source systems a separately scoped action.

Implement four configurable commercial tiers:

| Tier | Entitlement and usage model |
|---|---|
| Tier 1 | Individual operation, core workspace and basic connectors, with a capped monthly model allowance and concurrency |
| Tier 2 | Higher allowances, scheduled workflows and broader connector capacity |
| Tier 3 | Higher allowances, coordinated agents, advanced workflows and adaptive workspace capabilities |
| Tier 4 | Organisation subscription with paid seats and metered model usage; no included token quota as the limiting mechanism |

Use model-band token allowances and a monetary budget for the first three tiers; show actual tokens and monetary usage separately. For Tier 4, apply published graduated usage rates, configurable spending ceilings, alerts and concurrency limits. Include retries, cached input, output, tool calls and execution costs in cost accounting without double-counting provider events.

Reserve estimated cost before dispatch, reconcile actual usage, and pause new chargeable work when a limit is reached. Preserve access to records, exports and pending decisions. Separate provider billing from customer charges through a versioned rate card and an auditable usage ledger.

Show members a simple remaining allowance and estimated action cost. Put detailed model, token and rate accounting in the billing view.

Keep tenant isolation, permissions, essential audit, data export and deletion available across tiers. Price hosted capacity, backup storage and support explicitly. Treat customer tool subscriptions as separate unless commercially authorised otherwise.

Select proprietary commercial licensing for the product, preserve all required upstream notices and maintain a dependency licence inventory. Keep the connector SDK independently licensable. Calculate prices and allowances from measured infrastructure, model/tool and support costs before billing customers; make publication and charge activation a commercial decision gate.

### Phase 06 — Plan release scope, dependencies and acceptance gates

Translate the accepted design into the complete roadmap inside `docs/plans/phase_0_foundations_plan.md`. Retain every domain/capability in docs/capabilities.md with its owner, dependencies and phase. Build one complete workflow at a time. Keep production policies configurable and record unresolved owner inputs at the point they matter.

Set the first release around implementation phases 07–08 and their required controls. Assign later capabilities to subsequent releases unless needed to complete that workflow. For every release, identify its selected implementation phases, enabled capabilities and applicable verification criteria. Keep the full domain registry intact as scope expands.

Use this initial execution-plan mapping. Materialize only phase zero first; generate each following plan after verified completion of its predecessor.

| Execution plan under `docs/plans/` | Blueprint coverage |
|---|---|
| `phase_0_foundations_plan.md` | Planning 01–06, full roadmap, role routing and approved foundation/compatibility checks |
| `phase_1_foundation_plan.md` | Implementation 07 and applicable verification gates |
| `phase_2_development_loop_plan.md` | Implementation 08 and applicable verification gates |
| `phase_3_release_verification_plan.md` | Verification 13–18, first-release checklist and owner handoff |

Map expansion requirements 09–12 into later consecutively numbered plans when their release scope is approved. Include release verification and closure in each release map. Deferred roadmap capabilities remain planned, not completed or hidden prerequisites for the initial release.

| Implementation phase | Deliverable | Required evidence |
|---|---|---|
| 07 — Foundation | Desktop shell, cloud API/data, identity, capability registry, basic work ledger and durable job status | Founder can sign in, plan work and reconnect to a persisted cloud job |
| 08 — Development loop | Hermes adapter, repository execution, plans, implementation artifacts, tests, review and release proposal | Complete a real Engine Labs change with linked evidence and bounded authority |
| 09 — Collaboration and connections | Initial seats/hierarchy, guests, delegated administration, communications and repeatable connector installation | Scoped members complete work without unauthorised source access; handover revocation works |
| 10 — Company operations | Prioritised domain modules, managed memory, schedules, agent coordination and adaptive views | Each enabled module completes a useful verified workflow |
| 11 — Commercial delivery | Customer provisioning, usage plans, metering, updates, support, backup/restore, offboarding and erasure | Recoverable customer deployment, correct billing and demonstrated data lifecycle |
| 12 — Ecosystem and mobile | Remaining domain expansion, connector SDK/catalogue, advanced configuration, iOS and Android | Extensions preserve contracts and mobile clients use the same cloud authority |

Introduce access controls, durable state, data lifecycle hooks and usage measurement in phase 07; deepen them as capabilities arrive. Before external customer use, satisfy the relevant isolation, authentication, source-permission, backup, licensing, support and data-processing gates regardless of phase.

Define acceptance criteria for functional coverage, authority/data lifecycle, runtime recovery, interface behaviour, commercial operations and release readiness. Map them to verification phases 13–18 and require traceable evidence for enabled features. Define measurable recovery, performance and usability targets from the pilot baseline before testing them.

Keep Cursor's delivery roles separate from product seats and Hermes runtime identities. Develop changes in isolated branches/worktrees within approved scope, attach evidence to the exact revision and prepare signed/versioned artifacts. Route source-control publication and releases through the protocol's authorisation gates. Let Engine Labs manage its own development without granting its agents unrestricted control over production.

Produce `docs/product.md`, `docs/capabilities.md`, `docs/architecture.md`, `docs/blueprints/ui-blueprint.md`, `docs/roadmap.md`, material records under `docs/decisions/` and owner-policy specifications under `docs/policies/`. Link detailed role artifacts instead of duplicating them. Record environment-variable names, purpose, destination, required phase and provider/source in the phase-plan registry; never values. Maintain its deferred human-action queue until an item blocks the next gate.

Use `docs/verification.md` as an index to requirement IDs, release revision, configuration, environment and workstream evidence. Distinguish `VERIFIED`, `PARTIAL`, `UNVERIFIED` and `NOT_APPLICABLE` evidence from role gate verdicts. Require every phase plan to end with an exact Next Plan Generation Prompt, or final-checklist instruction for the release's last phase. Resolve consequential questions through the launcher before implementing affected work.

## 2. Implementation phases

### Phase 07 — Build the foundation

Read the accepted active plan, manifest, role charter and predecessor handoffs. Require successful bootstrap and verified phase-zero completion before starting this implementation phase. Scaffold the smallest coherent repository: desktop/UI, API, agent adapter boundary, shared contracts and deployment configuration. Preserve useful existing code and the installed launch protocol.

Adapt `src/pages/cc-org-dash.jsx` and its component tree into the desktop shell from the recorded Papership reference. Reuse its UI components, design tokens and assets. Validate route loading and refresh in the packaged desktop app. Connect the interface to Engine Labs contracts and real states, replacing reference fixtures through the planned data adapters.

Implement the cloud data boundary, identity, owner seat, grant checks, capability registry, work ledger, source references, job persistence, streamed status and secure desktop connection. Provide a seeded development environment and ordinary-language empty/error states.

Demonstrate sign-in, priority creation, work planning, a persisted background job and reconnect after closing the desktop. Verify access boundaries and restart recovery. Materialize evidence and required handoffs, reconcile plan/state and pass the phase gate before generating the next execution plan. Apply this completion rule to every implementation phase.

### Phase 08 — Build the development loop

Integrate the pinned Hermes runtime and bind the supplied development repository. Implement request capture, research, specification, work decomposition, isolated branches/worktrees, code changes, relevant checks, review evidence and release proposals.

Connect `GlobalAgentPanel.jsx` to authenticated, backend-mediated Hermes sessions and streamed events. Replace its simulated reply handler, persist conversations in the customer's cloud environment and enforce granted scope on every operation. Keep provider credentials outside the frontend.

Expose run status, scope, sources, model/tool usage, budget, pause/cancel and recovery. Keep production deployment credentials outside development workers. Complete an actual Engine Labs improvement from request to reviewable change; execute release only within its authorised policy.

Add thin contract tests at the runtime, source-control and action boundaries. Demonstrate that restarting a worker or desktop does not duplicate an external effect. Update capability status using observed results.

### Phase 09 — Build collaboration and connections

Implement Founder, Project Lead and Operator templates, composable responsibility grants, guest assignments, scoped settings and the provisioning-to-handover process.

Add the required communication connectors sequentially through the shared contract. Verify actual read/write coverage, sender identity, source permissions, installation requirements, revocation and account routing. Provide useful source-app handoffs for unsupported actions.

Support self-service connection setup for authorised owners and ordinary-language recovery for members. Demonstrate a delegated workflow across two different seats and verify that revoked support access no longer works.

### Phase 10 — Expand company operations

Select the next highest-value domain capability from the full registry. Connect its authoritative software and add the smallest useful views, actions and workflow templates. Repeat until the planned company-operations coverage is demonstrated.

Expand memory management, schedules and specialist agents with source-aware retrieval and governed skill improvement. Add declarative intent-based views, persistent preferences, pinning and undo. Compare task completion and errors against fixed seat templates before promoting adaptations.

Maintain domain-independent capabilities, provider-specific adapters and explicit upgrade/uninstall behaviour. Keep unconfigured functions discoverable without crowding daily work.

Build new domain views and adaptive layouts from the Papership-derived component registry. Preserve the accepted visual baseline as capabilities expand.

### Phase 11 — Build commercial delivery

Automate dedicated customer deployment, onboarding, configuration, updates, monitoring and support diagnostics. Implement all four entitlement/usage models in test mode, then validate rate cards, limits, reservations and reconciliation before commercial activation.

Exercise customer handover, privileged recovery, offboarding, export, selective domain deletion, complete tenant erasure and backup restoration. Verify pending backup/provider deletion states are accurately reported.

Measure capacity and cost under realistic work, browser and agent concurrency. Establish support ownership and service targets from measured behaviour. Release only when the applicable customer-use gates have evidence.

### Phase 12 — Expand the ecosystem and mobile clients

Expand remaining market domains through capabilities, connectors and domain modules. Prepare stable extension contracts, fixtures and compatibility checks; publish only through the authorised release process. Allow authorised roles to configure declarative extensions within their grants; review executable extensions before activation.

Build iOS and Android clients against the same authenticated cloud API and reusable interface contracts. Adapt the Papership visual language to mobile navigation, notifications, secure authentication and explicit offline behaviour. Preserve cloud execution and authorisation across devices.

Maintain the complete capability registry, migration paths, operational runbooks and phase evidence as the product evolves.

## 3. Verification phases

### Phase 13 — Verify functional and domain coverage

Select the current release candidate and its accepted scope. Apply phases 13–18 to its enabled capabilities and intended deployment audience; mark future-feature checks not applicable without deferring mandatory controls for current use. Trace every enabled capability to a requirement, implementation, configuration and meaningful acceptance check. Keep all 43 domain groups in the registry; leave future capabilities explicitly planned.

Verify the installed launcher using its preflight, bundled preflight/policy tests, `node .cursor/scripts/validate-agent-config.mjs` and `node .cursor/skills/launch-pipeline/scripts/validate-launch.mjs`. Confirm this blueprint is linked from intake, phase zero, the manifest and active state. Verify that a fresh `/launch-pipeline` reads the supplied requirements, asks only unresolved material questions and preserves the Build/bootstrap boundary; verify that a later invocation resumes the recorded gate. Record actual Cursor-session evidence separately from static/script checks.

Exercise complete operator workflows with realistic, appropriately scoped data, including missing information and failed dependencies. Verify the Engine Labs development loop from request to a reviewed change and a release rehearsal in a test environment. Confirm source links, status changes, artifacts and outcomes refer to the actual records and code version.

Index results in docs/verification.md and retain detailed evidence in the active workstream. Report unsupported integrations and untested paths accurately; a mock response or visible control cannot establish a working connection. Route defects to their owning role, record invalidated downstream gates and replay those gates after remediation. Require independent Security re-verification for blocking security findings.

### Phase 14 — Verify authority, memory and data lifecycle

Test separate organisations, roles, project scopes and guest assignments. Verify isolation across pages, queries, aggregates, notifications, exports, files, agent tools and memory. Confirm delegated grants cannot exceed the delegator's authority and billing upgrades cannot create data permissions.

Exercise revoked credentials, changed assignments, expired approval grants and modified action targets. Confirm running and queued work rechecks authority. Verify setup access is removed at handover, including application, cloud and SSH access.

For enabled memory and lifecycle features, verify source restrictions, correction propagation, archive ownership, offboarding, export and approved domain/tenant erasure. Use disposable fixtures for destructive checks. Confirm summaries, indexes and caches follow deletion, while backup and provider retention states remain accurately disclosed.

### Phase 15 — Verify integrations, recovery and backups

For each enabled connector, test actual authentication, permitted operations, account routing, source permissions, schema handling, refresh/revocation, quotas, stale data and unsupported actions. Verify webhook authentication and duplicate-event handling where applicable.

Interrupt a worker and network connection before and after a potential external write. Confirm recovery reconciles the source outcome before retrying and does not duplicate effects. Test cancellation, desktop disconnection, budget exhaustion, diagnostic limits and escalation when recovery requires new authority.

Restore an encrypted backup from the separate client-controlled location into an isolated environment. Verify data integrity, key access, permissions and external-system reconciliation before resuming automation. Measure recovery time and potential data loss against the accepted targets. Confirm snapshot inventory and backup retention/deletion procedures work as specified.

### Phase 16 — Verify the desktop and adaptive experience

Complete the core workflows on each platform included in the release. Verify desktop installation, sign-in, secure token handling, progress streaming, reconnect, notifications, cancellation and signed update behaviour. Use a native platform runner to validate native functionality; record unavailable platform checks as blocked.

Compare implemented screens and interaction states with the recorded `/cc-org-dash` reference at matching viewport sizes and theme settings. Verify layout, typography, spacing, colours, primary tabs, command rail, assistant panel, overlays and responsive behaviour. Confirm production screens use real permissions, persisted records and agent events. Record intentional adaptations and fix unapproved visual drift. Refresh the baseline only through an explicit reference update.

Check keyboard navigation, focus, accessible labels, contrast, responsive layout and readable empty/error states. Confirm an operator can complete routine work without technical traces or special prompting. Compare results across the Founder, Project Lead and Operator scopes that are enabled.

For adaptive views, verify stable navigation and critical controls, permitted data access, valid component schemas, pinning, undo and fallback. Compare completion time and errors with fixed views. Confirm adaptations remain within the Papership-derived design system and flag material aesthetic decisions for the owner.

### Phase 17 — Verify usage, deployment and commercial operations

Verify usage records, run budgets and operational monitoring for every release. Before enabling paid tiers, test entitlement changes, model-band allowances, seat changes, cost reservations, graduated rates, limit enforcement and provider reconciliation in billing test mode. Confirm repeated events cannot duplicate charges.

Check that exhausted allowances pause new chargeable work while preserving records, exports and required decisions. Verify isolation, permissions and essential lifecycle functions remain available across tiers.

Exercise clean deployment, supported upgrades, migration recovery, monitoring, alerts and support-access expiry. Measure capacity and cost under realistic concurrency. Confirm enabled connectors and distributed dependencies satisfy the recorded commercial-access and licence requirements. Keep commercial checks not relevant to the current release explicitly deferred until their activation gate.

### Phase 18 — Verify release readiness and complete the owner handoff

Consolidate results from phases 13–17 against the exact release commit, configuration and enabled capability set. Reuse valid evidence only when the relevant code, dependencies and environment remain unchanged. Fix failures and rerun affected checks; do not restart unrelated verification without a concrete reason.

Require all mandatory checks for the release to pass. Reconcile all six required/skipped-role decisions, current handoffs, requirement traceability and remediation loops through `project-lead-subagent`. Keep open high or critical security findings `BLOCKED`; permit `CONDITIONAL` only as defined in ROLES.md. Record residual limitations, blocked scope, deferred capabilities, migration/rollback procedures and operational ownership. Do not treat missing provider credentials, owner policies or required platform evidence as successful verification.

After the approved release's agent-executable work is complete, create `docs/plans/final_implementation_checklist.md` from the installed template. Include only remaining defects/unverified checks, variable names and sources, human-only account/permission actions, production prerequisites and post-action verification, with links proving other work is complete. Preserve deferred expansion in the roadmap.

Have Project Lead prepare `docs/workstreams/<task-id>/delivery/owner-handoff.md` for parent materialization. Include delivered scope, final role verdicts, evidence, limitations, rollback and the precise owner decision. Request `APPROVE`, `REQUEST_CHANGES` or `DO_NOT_PROCEED`; record the actual response and keep the workstream awaiting-owner-decision until then. Do not infer approval from silence or Build.

Prepare versioned release artifacts and the permitted owner/CI deployment procedure. Distinguish implemented, verified, ready, deployed and owner-approved states. Perform external actions only with action-specific authority through a policy-permitted path; verify post-deployment health when deployment is authorised and retain the previous recoverable version. Reconcile the capability registry, roadmap, plan, state, memory and continuation evidence. Resume the next approved release through `/launch-pipeline` from its recorded gate.
