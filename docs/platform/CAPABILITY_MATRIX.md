# Capability matrix

Source of truth in code: `CAPABILITY_MATRIX` and `INTEGRATIONS` in `services/api/app/foundation.py`, served at `GET /platform/capabilities`. The UI reads it. If this file and the endpoint disagree, the endpoint wins.

| Product | Capability | Status | Note |
|---|---|---|---|
| Workspace | Agents, tasks, runs, activity | implemented | Persisted, org-scoped, explicit transitions. |
| Workspace | Deterministic demo runtime | simulated | Template output, no model inference. |
| Workspace | Approvals for exact proposals | implemented | Stale and duplicate decisions rejected, enforced in the service path. |
| Workspace | Email and CRM actions | simulated | A local CRM table changes after approval. No email is sent. |
| Workspace | Supervising third-party agents | unsupported | No integration exposes observe, invoke, pause or cancel yet. |
| Registry | Publish, search, version, install | implemented | Immutable versions, semver ranges, dependencies. |
| Registry | Deterministic resolver | implemented | Constraints and dependencies only. |
| Registry | Paid and metered installs | unsupported | Price is metadata. |
| Registry | Tested compatibility | planned | Only publisher-declared compatibility exists. |
| Studio | Builder, locks, versions | implemented | Version saved with its resolver lock. |
| Studio | Fixture evaluation | implemented | Structure and policy checks. Not model task success. |
| Studio | Publish blueprint to local Registry | implemented | Private bundle by default. |
| Studio | Deployment, external publication | unsupported | Export only. |
| Exchange | Catalogue, quotes, jobs, budgets | simulated | Providers, ratings and results are fictional. |
| Exchange | Disputes and refunds | planned | Placeholders return 501. |
| Exchange | Wallet, payments, payouts, escrow | unsupported | Future settlement adapter. |

Per-integration control (observe, invoke, pause, cancel, enforce approval) is in `docs/platform/README.md`.
| Registry | Reviewable updates | implemented | Diff of files and dependencies, applied only against the reviewed hash. Versions with scripts are refused. |
| Workspace | Agent Passport | implemented | Draft Papership format, exportable per agent. Describes the agent and grants no access. |
| Studio | Deployment targets | implemented | `export-only` works. `papership-cloud`, `self-hosted` and `vercel` are planned and refused. |
| Studio | Pipeline and version compare | implemented | Define, assemble, build, test, deploy, publish, update, each with its true state. |
| Platform | Access surfaces | implemented | API only. SDK, CLI, MCP, Cloud and Enterprise are planned. See [API_CONTRACTS.md](API_CONTRACTS.md). |
