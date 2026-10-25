# Papership: platform foundation prompt for Cursor

You are helping me build **Papership by Engine Labs**. Work in the existing repository and implement a basic, coherent configuration and usable local foundation for four product areas: **Workspace, Registry, Studio, and Exchange**.

Read this entire prompt before making changes. It contains both the long-term product architecture and the deliberately smaller implementation scope for this task. Preserve the complete vision in documentation while implementing the foundation described below.

## 1. Start with the existing project

Inspect the repository, README, applicable AGENTS.md files, Cursor rules, package manifests, architecture notes, existing UI, data models, runtime integrations, and tests. Look for an existing company-agent-system blueprint and Papership/OrgOS planning documents. Treat OrgOS as an earlier name for Papership where that matches the repository.

Build on the existing stack, conventions, working functionality, and design assets. Do not replace a functioning application to create a new scaffold. Identify which requested capabilities already exist, which need extending, and which are new. Resolve terminology in documentation without destructive bulk renaming.

After inspection, give me a short implementation plan and proceed with routine, reversible development choices. Ask only if a genuinely consequential ambiguity blocks implementation. Do not expose secrets, overwrite unrelated work, publish the application, create paid resources, or make live purchases as part of this task.

If this is an empty repository, choose a small, maintainable TypeScript application with a modern component-based web interface, a shared domain layer, and local demo persistence. Document the choice. Use the existing project's architecture whenever one exists; do not introduce a monorepo, microservices, queues, or infrastructure merely to mirror the product names.

## 2. What Papership is

**Papership is a platform where people build, equip, and operate AI agents together.**

Its Registry supplies capabilities, its Workspace coordinates work, its Studio supports creation, and its future Exchange connects agents to outside services.

The broader purpose is to equip AI agents, put them to work, and manage how they work with people. This includes specialised knowledge, agent creation, everyday business operations, identity, human controls, and eventually marketplaces for executable work.

**Engine Labs is the company. Papership is the product platform.**

The original company OS concept remains central: one approachable place for founders, managers, and operators to coordinate people, agents, tasks, organisational context, and connected tools. Preserve the human-facing work experience as developer capabilities are added.

Papership should be framework-neutral and extensible across models, runtimes, coding tools, hosting providers, and distribution channels. This is an architectural direction. Claim support only for adapters that are actually implemented and tested. We do not need to build a model or support every provider now.

## 3. Four products with distinct boundaries

| Product | Purpose | User intent |
|---|---|---|
| Papership Workspace | Operate agents and coordinate work | Help me run my business with people, agents, and connected tools. |
| Papership Registry | Publish, discover, and install agent materials | Give this agent the knowledge and capabilities it needs. |
| Papership Studio | Build, test, and release agents | Help me turn this idea into a working agent. |
| Papership Exchange | Buy and sell work performed by agents and services | Find someone or something that can complete this task. |

They share accounts, organisations, identity, data contracts, policy, activity, and eventually billing. Each should eventually be usable independently, but this task should create one integrated application with clear module boundaries.

Workspace and Registry are the initial core. Studio begins as a builder mode within the same application, with a distinct product entry point. Exchange gets a clearly labelled demo foundation now; its live transaction business is a later phase.

Do not force users to understand the infrastructure underneath these products to complete normal work.

## 4. Papership Workspace

**Promise: One place for your people, agents, tools, and work.**

Workspace is the main everyday application for nontechnical operators. Its eventual components are:

- **People and teams:** responsibilities, organisational structure, access, ownership, and delegation.
- **Agents:** persistent roles, identities, instructions, available capabilities, autonomy settings, and status.
- **Tasks and projects:** goals, assignments to people or agents, dependencies, progress, and deliverables.
- **Workflows:** recurring processes involving people, agents, and external systems.
- **Knowledge and memory:** documents, company context, decisions, references, and relevant working history.
- **Connected tools:** email, calendars, CRMs, databases, files, APIs, and other services.
- **Supervision:** approvals, activity, budgets, exceptions, and intervention.

The defining experience is that people can see, inspect, and edit the work itself alongside the agent handling it. For example, a property manager sees an enquiry, draft reply, contact record, relevant context, and approval controls together.

Workspace may run supported agents directly and supervise external agents through integrations. The degree of control depends on the capabilities exposed by each integration. Show whether an integration supports observing, invoking, pausing, cancelling, or enforcing an approval. Do not imply universal control.

For the foundation, provide an overview, agents list/detail, tasks list/detail, approvals, activity, and a minimal view of tools, knowledge, and team settings. These may be views within a few routes rather than separate applications. Seed one complete inspectable workflow with an editable result.

## 5. Papership Registry

**Promise: Make expertise installable.**

Registry is the shared library and distribution system for **Agent Materials**. It serves experts publishing knowledge, humans equipping agents manually, and external agents or developer tools acquiring materials programmatically.

Use these material categories:

| Material | Purpose |
|---|---|
| Skill | Instructions and resources for a particular task |
| Context pack | Specialised domain knowledge |
| Workflow | A repeatable process with steps, decisions, and exceptions |
| Tool integration | Access or configuration for an external capability |
| Evaluation pack | Scenarios and checks for assessing performance |
| Template or schema | Defined structures for outputs and data |
| Policy pack | Constraints, approval requirements, and escalation guidance |
| Persona or role pack | Behaviour, responsibilities, and communication style |
| Dataset or reference pack | Supporting information |
| Agent blueprint | A reusable combination of materials and configuration |

MCP configurations, plugins, reference libraries, decision trees, memory structures, and operating manuals fit within or combine these categories. A tool's manifest/configuration and a hosted service it connects to are different things; installing configuration does not grant credentials or service entitlement.

Registry eventually handles publishing, versions, dependencies, discovery, licensing, compatibility information, and updates. Its materials marketplace supports free, paid, subscription, or metered offerings within the same catalogue.

For the foundation, implement searchable/filterable seeded materials, a material detail view, version and dependency information, a basic local publishing form, and installation onto an agent or blueprint. Record an exact selected version and installation source. Allow installation of seeded free materials; show paid offerings as unavailable for live purchase or explicitly simulated.

Provide a minimal versioned manifest containing at least: stable package ID/slug, title, type, description, publisher, version, licence identifier or text, visibility, pricing/access mode, contents, dependencies, compatibility declarations, source/provenance, and update timestamp. Keep declared compatibility separate from tested compatibility. Distinguish publisher assertions from platform evidence.

Use existing formats and conventions where they fit. Document Papership-specific metadata; do not claim an invented manifest is an industry standard. Define the semantics and supported subset for dependency version ranges. Reuse an appropriate version library already in the stack where possible.

Installing materials supplies instructions and references. It does not establish competence, change model weights, or grant permissions. Validate usefulness through evaluations. Treat package content as untrusted input; installation must not silently execute downloaded scripts or expand authority.

## 6. Papership Studio

**Promise: From agent idea to working deployment.**

Studio owns the creation pipeline:

**Define → assemble → build → test → deploy → publish → update.**

Its eventual capabilities are:

- Define purpose, scope, inputs, outputs, constraints, and budget.
- Select models, runtimes, tools, channels, and deployment targets.
- Assemble materials from Registry.
- Connect coding agents and development environments.
- Run evaluations, inspect failures, and compare releases.
- Deploy through supported integrations.
- Publish an agent blueprint, service, or application.
- Manage releases, versions, dependencies, and updates.

Keep these boundaries explicit:

| Studio | Workspace |
|---|---|
| Create and change an agent | Use and supervise an agent |
| Test a proposed release | Monitor production work |
| Configure deployment | Manage ongoing operation |
| Publish a reusable blueprint | Instantiate it for an organisation |

For the foundation, provide a simple builder with purpose/role, inputs/outputs, model/runtime configuration, required tools, material selection, policy, and evaluation cases. Save the result as a versioned blueprint and instantiate a Workspace agent from it. A blueprint is reusable configuration; an agent is an organisation-specific instance; a run is one execution.

Provide a local evaluation runner for meaningful deterministic fixture checks if feasible, such as required output fields and approval policy behaviour. Label these as fixture checks. Do not invent model task-success scores. Show evaluation method and scope with every result.

Deployment configuration and an exportable blueprint are sufficient for this task. Any deploy/publish controls without implemented backends must show an honest unavailable or simulation state. Publishing a blueprint to the local Registry may work; publishing a live service externally is out of scope.

Initially this is a builder mode within the same application. Leave a clean module boundary for a future independent developer offering.

## 7. Papership Exchange

**Promise: Find and purchase the capability to get a task done.**

Exchange is a market for performed work. It is distinct from buying materials in Registry:

| Registry | Exchange |
|---|---|
| Give my agent a competitor-research skill | Produce a competitor-research report |
| Acquire a reusable capability | Purchase execution or an outcome |
| Receive materials or access | Receive a result |
| My agent performs the work | A provider performs the work |

Future providers may be agents, APIs, data services, or human specialists. Do not restrict the eventual model to autonomous agent sellers.

Its eventual components include capability listings, machine-readable service descriptions, quotes, expected output schemas, delegated spending limits, approval thresholds, provider selection, jobs, result validation, disputes, refunds, reputation, billing, and payouts.

For the foundation, provide a demo catalogue of a few capabilities, a request/quote view, and a simulated job lifecycle. Link a demo Exchange job to a Workspace task and its approval record. Show budget estimates and policy decisions. Persist the simulated result and activity.

Explicitly label the entire transaction as simulated. Use no real wallet, payment processor, payouts, escrow, provider procurement, or external execution. Document the later payment/settlement adapter boundary. Include interface/status placeholders for disputes and refunds rather than a full dispute system. Label any seeded reputation or provider statistics as demo data.

## 8. Shared foundations

Create shared types, validation, services, and storage boundaries for these responsibilities. Start with small modules inside the existing application rather than independently deployed services.

| Component | Responsibility |
|---|---|
| Agent identity | Ownership, role, configuration, capabilities, and history |
| Policy and approvals | Permissions, autonomy, spending limits, human intervention |
| Resolver | Suitable materials, versions, dependencies, supported formats |
| Execution and orchestration | Agents, models, tools, workflows, task/run state |
| Knowledge and memory | Organisational context, sources, task context, retrieval boundaries |
| Evaluation and provenance | Tests, sources, package versions, observed results |
| Commerce | Entitlements, usage records, billing boundaries, commissions, payouts |
| Integration layer | Model providers, runtimes, tools, hosting, distribution channels |

### Identity, organisations, and authority

Use stable IDs and shared records across products. Include organisations, members/roles, teams, and ownership. Use existing authentication and tenancy patterns if available. Suitable initial organisational roles are Owner/Founder, Domain or Project Lead, and Operator; document the actual permission mapping.

An agent role/persona is different from an organisational access role. A material may describe policy; effective authority comes from the owning organisation and the enforced runtime policy. A portable Agent Passport describes identity/capabilities; it does not grant access by itself.

A local demo may use a clearly labelled seeded identity. Do not present it as secure production authentication or expose it publicly. Keep organisation boundaries in records and service access so later real tenancy can be added. Reuse proper server-side enforcement when the existing application has a backend.

### Resolver

Resolver connects a task or declared requirements to a suitable set of materials. Its future selection factors include relevance, compatibility, freshness, cost, and evidence.

Implement a transparent deterministic foundation using explicit material requirements, tags, supported version constraints, and available compatibility data. Return selected exact versions, dependency resolution, reasons, warnings, and unsupported conditions. Detect missing dependencies and cycles. Do not invent semantic search, AI verification, trustworthy scores, or universal conversion. Preserve exact versions for reproducibility; updates should be explicit and reviewable.

### Execution, approvals, and state

Model agent, task, run, approval, material installation, blueprint release, and Exchange job as separate records where necessary. Include created/updated times and activity events. Use explicit state transitions rather than unrelated UI badges. An editable task result should be stored with its task/run.

Provide a deterministic demo runtime with honest statuses such as queued, running, awaiting approval, completed, failed, and cancelled. Agents should show which runtime/adapter controls them.

An approval decision must apply to a specific proposed action and its relevant payload/version. Reject stale or duplicate decisions. Enforce policy in the execution/service path, not solely through disabled UI controls. Unsupported external control must be reported as unsupported.

### Budgets and commerce

Represent amounts with currency and integer minor units. Separate an estimate, an authorised/reserved amount, and a recorded usage charge. Distinguish simulated usage from actual spend. A demo quote should have a validity/expiry condition and use current policy at acceptance. Make repeated acceptance idempotent so the demo cannot double-book a job or charge.

Do not implement a real wallet or claim production financial correctness. Document any limitations of local demo persistence and concurrency. Future commissions, payouts, and settlement belong behind explicit provider boundaries.

### Knowledge, evidence, and privacy

Keep private organisational knowledge separate from public Registry packages. Do not publish company data or credentials when publishing a blueprint. Exports should include safe configuration and credential references, never secret values.

Keep material source records, publisher declarations, evaluation results, and operational observations distinguishable. Performance improvement claims require measured evaluations and their methodology. Download counts and ratings are not proof of successful work. Any future cross-customer analytics needs explicit privacy and consent choices; do not enable raw task-content sharing by default.

## 9. Naming and access surfaces

Use these classifications consistently in code, UI, and documentation:

| Name | Classification |
|---|---|
| Papership API, SDK, CLI, MCP server | Access surfaces for external systems |
| Papership Cloud | Managed hosting/infrastructure offering |
| Papership Enterprise | Commercial offering with organisational capabilities |
| Agent Passport | Portable representation of identity and capabilities |
| Materials marketplace | Commercial functionality within Registry |
| Work marketplace | Commercial functionality within Exchange |

API access should eventually let external systems use Registry and Resolver independently of Workspace. Establish a small validated service/API boundary consistent with the existing stack, with sample request/response contracts. If this is client-only, document future HTTP boundaries and provide callable local service functions; do not imply a deployed API exists.

Do not build full SDK, CLI, MCP server, hosting products, or enterprise plans in this task. Keep provider/configuration contracts explicit, validate required settings, and supply a secret-free environment example only where needed.

## 10. Related product families: document and leave extension points

These are part of the platform vision but outside the software foundation implementation:

| Family | Contents | Relationship |
|---|---|---|
| Papership Contextbooks | Human manuals, ebooks, audiobooks, operational templates, companion agent packs | Publishes expertise and seeds Registry |
| Papership Deck, working name | Approval buttons, status displays, physical consoles | Physical interface to Workspace |
| Agent identity/personalisation | Portraits, role cards, passports, NFC objects, visual identities | Recognisable agent identity and accessible configuration |
| Culture/merchandise | Artwork, collectables, apparel, robot accessories | Optional retail/community activity under Engine Labs |

A Contextbook explains why for a human and encodes how in a companion agent pack. The machine package can contain SKILL.md, domain models, terminology, workflows, decision trees, schemas, templates, examples, failure modes, escalation rules, authoritative references, and evaluation scenarios. One researched domain can supply the book, templates, materials, and tests.

Books, podcasts, and audiobooks are formats/distribution channels within the publishing line. Do not create separate software products for each. A seeded Contextbook companion material can demonstrate the relationship without implementing a publishing storefront.

Deck should eventually use the same approval controls and policy enforcement as Workspace. Do not implement hardware or robot interfaces now.

## 11. Commercial model and open ecosystem

The intended direction is broad access to public/open materials, with commercial value in hosted infrastructure, discovery, resolution, managed execution, evaluation, private registries, governance, and optional paid offerings.

Keep source visibility, licence rights, price, entitlement, and execution cost separate. Publicly visible does not automatically mean open-source or free for all uses. Open materials remain copyable under their licence; local/offline copies cannot automatically be metered by Papership. Per-invocation fees require a hosted service or an agreement through which usage can be measured.

Registry can eventually support paid materials, subscriptions, and hosted/metered access. Exchange can charge for performed work. Shared commerce supports both with different transaction types. Treat all prices and commission rates in sample data as illustrative, configurable values. No production pricing or revenue assumptions are established by this scaffold.

## 12. A connected demonstration to implement

Use an **Engine Labs real-estate enquiry assistant** as the seeded scenario, with fictional customer data.

1. In Studio, define an enquiry assistant with purpose, boundaries, expected outputs, runtime configuration, required tools, and approval policy.
2. In Registry, discover a property terminology context pack, an enquiry-response workflow/skill, a mock CRM integration configuration, an output schema/template, a policy pack, and evaluation cases. Include a small Contextbook companion example.
3. Resolver selects supported versions and dependencies and explains its result. Save a lock/selection record.
4. Save the blueprint and instantiate it as an organisation-owned Workspace agent with those materials installed.
5. In Workspace, assign a fictional enquiry task. A demo runtime produces an editable draft reply and proposed CRM action.
6. Pause the proposed external action for approval. Allow an authorised demo operator to inspect and approve or reject the exact proposal. Approval should advance the simulated workflow, not send an email or change a real CRM.
7. Link an optional Exchange task for fictional property-data enrichment. Request a quote, check its demo budget/policy, simulate acceptance/execution, and return a clearly labelled result to the originating Workspace task.
8. Show connected activity, versions, evaluation fixture results, provenance, and simulated costs throughout. Preserve task and artifact links across product navigation.

This must feel like one connected system. Avoid four isolated dashboards with unrelated mock data.

## 13. UI and interaction direction

Use **Papership by Engine Labs** branding. The approved identity is an ivory face/profile on a purple folded squircle, with a small rainbow prism ship at the back of the head angled toward the forehead. Use an approved asset if it exists in the repository; do not recreate or overwrite it. If absent, use a simple neutral placeholder and explain where the approved asset belongs.

Use a modern, minimal, legible interface with restrained purple and selective spectral accents. Keep detailed work surfaces quiet. Use consistent spacing, typography, readable contrast, keyboard access, focus states, and clear empty/loading/error states. Avoid decorative AI tropes and excessive glass, neon, or prism effects. Use plain language and avoid em dashes in product copy.

Provide a shared application shell, organisation context, and clear entries for Workspace, Registry, Studio, and Exchange. Studio can be a mode in the same shell. Clearly mark Exchange as demo/preview and unavailable integrations as unconnected or unsupported. Add product-level configuration or feature flags for implemented, demo, preview, and disabled capabilities; avoid fake connected/success states.

Keep infrastructure details in settings, detail views, and developer documentation where useful. Normal operators should focus on goals, work, outputs, and decisions.

## 14. Implementation approach and limits

Deliver the smallest maintainable working foundation that demonstrates the connections above. Prefer a modular application with shared services over separate deployments. Match the repository's conventions for folders and naming; an illustrative split is products/workspace, products/registry, products/studio, products/exchange, plus shared domain/services/adapters/config/UI.

Use an existing database and migration mechanism if present. Otherwise use a documented local demo repository/storage adapter with versioned seeded data, persistence across reloads, and reset capability. Do not persist secrets in browser storage. Record production authentication, tenancy, backend enforcement, and concurrency limitations honestly.

Implement working local forms/actions and persistent relationships for the key flows. Explicitly defer live model inference, coding-agent execution, external tool actions, cloud deployment, external publication, payment, payouts, hardware, and marketplace settlement unless the repository already has safe working implementations needed for this flow. Do not remove existing implemented functionality simply because the initial demo uses mocks.

Use typed adapter contracts and capability declarations for future integrations. Keep provider-specific logic out of core product/domain logic. No need to implement dozens of providers. Create only the example configuration and small contracts needed to explain extension.

Do not execute third-party package code or require credentials to run the local demonstration. Do not install packages globally or add unnecessary production infrastructure.

## 15. Documentation and delivery

Create or update concise repository documentation covering:

- Product definition, the four areas, their audience, promises, and boundaries.
- Shared architecture, primary entities, module relationships, and data ownership.
- Registry package/manifest format and resolver behaviour/limitations.
- Studio blueprint → Workspace agent → task/run relationships.
- Registry purchasing versus Exchange procurement, and the open/licensed/hosted distinction.
- Integration contracts and actual supported controls.
- Local setup, configuration, demo walkthrough, reset, and checks.
- A capability matrix distinguishing implemented, simulated, planned, and unsupported features.
- Related product families and the longer-term roadmap.

Use existing documentation paths where suitable. Include a compact Mermaid architecture diagram if it improves clarity. Do not overwrite unrelated project instructions or create a collection of redundant planning files.

Preserve this roadmap:

1. Narrow Workspace used inside Engine Labs: one complete agent/task/tool/context/approval/result workflow.
2. Connected Registry: publishing, discovery, versioned installation, updates, own materials, Contextbook companions.
3. Repeatable Studio: tested reusable blueprints and supported deployment paths.
4. External Registry/Resolver access: supported third-party agent systems can use the knowledge infrastructure independently.
5. Live Exchange and physical interfaces: expand when demand and operational foundations justify them.

## 16. Validation and completion criteria

Run the repository's appropriate type, lint, build, and test checks. Add a small number of meaningful tests for domain invariants introduced by this change: resolver dependencies/cycles or unsupported versions, approval enforcement and stale decisions, and simulated quote/job idempotency and budget handling. Verify organisation isolation where the implemented data/service boundary supports it. Do not add snapshot tests merely to mirror static UI.

Verify one complete connected flow: blueprint creation, material resolution/install, Workspace agent/task, editable output, approval decision, simulated Exchange enrichment, and resulting linked activity. Reload to verify persistence. Inspect key screens in a browser if browser tooling is available and suitable. Report checks you could not run.

The foundation is complete when:

- All four product areas are accessible in a coherent application.
- Shared identity, organisation, policy, materials, and activity records connect them.
- The seeded end-to-end workflow works locally without external credentials.
- Actions persist their results and relevant state transitions.
- Implemented, simulated, unavailable, and planned features are honestly distinguished.
- Registry materials, Studio blueprints, Workspace agents/runs, and Exchange jobs are separate concepts with explicit links.
- No real external purchase, deployment, publication, email, or CRM action occurs.
- The broader platform vision and deferred work are documented.
- Relevant checks pass, or remaining failures and limitations are clearly explained.

Finish with a concise report: what changed, how to run it, how to follow the demo, what is implemented versus simulated, what was tested, remaining limitations, and the next useful development increment.

Begin by inspecting the existing repository, then implement this foundation.
