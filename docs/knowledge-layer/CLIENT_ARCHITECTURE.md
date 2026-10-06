# Client architecture

One platform. Four client modes. They share agent identity, ContextPlans, context versions, trust, impact, policies, permissions, approvals, cost, and lifecycle state. No client keeps an independent copy of that truth (the desktop may cache a session token in the keychain and a last-known view; it does not own the records).

| Client | Role | Repository today | Phase |
|---|---|---|---|
| Machine / API | Resolution, acquisition, outcomes for external agents | `services/api` REST and `packages/contracts` | KL-P6 makes this the product contract |
| Web / Cloud | Human operation, inspection, publishing, admin | `apps/web`, route `/papership`, Vercel project `papership` | Human origin is `https://papership.com.au/papership`. Legacy `*.vercel.app` aliases are the same deployment, not a second product. `www.enginelabs.com.au` stays a separate site |
| Desktop Bridge | Local and private connectivity | `apps/desktop/src-tauri` loads `apps/web/dist`. Keychain commands. A picked file is hashed on the machine. The API stores the title, digest, and size | KL-P8. The cloud store does not receive the file or its path |
| Mobile Companion | Asynchronous supervision and approval | `apps/mobile` config spike, same web dist, no native crate | The phone uses Today → Decisions on the same Workspace. Store submission stays owner-gated |

`apps/desktop/src` (Today / Work / Runs / Connections / Settings on `packages/ui`) is an earlier shell. Tauri does not load it.

## Shared state

The API is the source of truth. Web, desktop, and mobile render it. A future machine client calls the same routes. Offline mobile queues, when they exist, stay scoped to the tenant and user and clear on sign-out. They cannot start a cloud job from cache.

## How the current Workspace becomes KL-P1

The live shell is `apps/web/src/blueprint2/`. Navigation is hash state (`#today/overview`, `#work/workflows`, `#settings/plan`). `loadPapershipOverlay` merges live GET results onto a large fixture view-model. Visual language stays: cream canvas, purple field, light / dark / dimmed, docked Hey Papership. Prism artwork stays on the app and tab icon only.

Blueprint-3 mockups in `docs/ui-blueprint/blueprint-3/` (Command, Agents, Work, Runs, Record, Systems) are the owner's latest visual direction. They are not the live chrome. KL-P1 does not switch chrome unless the owner says so. It maps those labels onto the domains below inside blueprint-2.

| Target domain | Current UI | KL-P1 move | Leave for later |
|---|---|---|---|
| Workspace | Today overview, command tiles, composer | Keep. Show role, task, and active-context empty states | Resolver suggestions |
| Agents | Hey Papership panel (fixture transcript), Hermes Host box, no agent record | New Agents section from `principals.kind = agent`, host status, and the assistant panel. Fourteen subsections, honest empty states where data is missing | Automatic context |
| Knowledge | `MemoryView` (`GET /memory`), loop artifact markdown, Files and Wiki fixtures | One Knowledge section: objects, source, version, provenance | Graph explorer, gaps |
| Organisation | People, Teams, Settings seat, Today Registry (43 domains), Integrations | Group as organisation context. Keep the capability catalogue labelled as such | Papership Registry |
| Activity | Job events, health, fixture audit bar and Data traces | Show live job and audit rows when the API already has them | Generic trace UI |
| Approvals | Today decisions and Hey approval card are fixtures. `POST /approvals` exists and is unwired | Wire approve and reject to the API, bound to target version | Context-change predictions |
| Settings | Plan, measurement, erasure intent, appearance, local permission toggles | Keep. Point permission toggles at grants when that is a small adapter | New policy editor |
| Work and Inbox | Projects and Founder loop are live. Issues, Board, Roadmap, and inbox bodies are mixed fixture | Keep as operational context around knowledge | — |
| Registry | Not present | Reserve a nav seam only. No marketplace UI | KL-P3 |

### Agent view subsections

KL-P1 aims the agent view at: identity, role, task state, knowledge, context, capabilities, memory, authority, sources, versions, trust, impact, cost, missing knowledge, and approval. Trust, impact, cost, and missing knowledge render as unavailable until KL-P4 and KL-P5. They are seams, not fake scores.

### Seams already in the shell

Adding a tab is a key in `TABDEF`, `TAB_KEYS`, `PAGES`, and `DFLT`. Detail routes are `route.kind`. Settings panes are `SETTINGS_PANES`. Live data is a fetch in `loadPapershipOverlay` plus a mapper in `applyPapershipOverlay`. Palette groups, command tiles, and modals are data arrays. Contracts already describe Principal, Run, Receipt, Grant, AuditRecord, RegistryRow, and pack trust verdicts.

### Data KL-P1 must leave behind

Agents, work items, jobs, and runs need nullable references to a future ContextPlan and ContextObject. An agent profile record is new. List and read endpoints for agents, knowledge objects (an adapter over memory items and artifacts), approvals, and audit should exist before any Resolver. Event names reserved in [CONTEXT_LIFECYCLE.md](CONTEXT_LIFECYCLE.md) are the only observability addition, and they stay dark until schema review.

## KL-P1 non-goals restated

No global Papership Registry, no automatic resolution, no marketplace, no performance predictions, no mobile app, no Desktop Bridge, no automatic deployment of context.
