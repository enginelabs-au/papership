# Demo walkthrough: Engine Labs real-estate enquiry assistant

All data is fictional. Nothing is emailed, purchased, deployed or published outside this machine. Sign in as the seeded local founder.

## Seed and reset

- Workspace, Overview, **Seed demo data** (idempotent, safe to press twice). It publishes eight materials, creates contacts and an Exchange policy, saves the blueprint (version 1), runs fixture checks, creates the agent, creates the enquiry task, runs it to approval, and opens an enrichment quote.
- **Reset demo** deletes this organisation's blueprints, agents, tasks, approvals, quotes, jobs and contacts. Registry packages are immutable and are kept. Seed again to restart.
- API equivalents: `POST /platform/demo/seed`, `POST /platform/demo/reset` (both need `org.admin`).

## Steps

1. **Studio, Blueprints**: open the enquiry assistant. See the purpose, boundaries, policy and the locked materials with exact versions and hashes. Run fixture checks and read the label: deterministic checks, not a model score.
2. **Registry**: search `property`. Open `engine-labs/enquiry-response-workflow`: publisher, declared versus tested compatibility, provenance, dependencies. Note `premium-market-reports` is listed with a price and refused for install. Optionally publish a new material with **New material**.
3. **Studio, Builder**: press **Start from demo blueprint**, press **Resolve versions** and read the reasons. The resolver picked terminology 1.2.0 because the workflow asks for `^1.1.0`. Change the constraint to `^9.0.0` and resolve again to see the failure. Save only works when resolution is clean.
4. **Workspace, Agents**: the Enquiry Assistant, its installs (exact version, hash, source `studio-blueprint:...`), and the controls Papership has for this runtime.
5. **Workspace, Tasks**: open the Priya Raman enquiry. The draft reply and the proposed CRM action came from the demo runtime. Edit the draft and save (a new version). The CRM contact is still `new_enquiry`.
6. **Approve**: on the proposal card choose **Approve this proposal**. The simulated CRM moves to `replied`, the task is `done`, and activity shows `crm.simulated_write`. Reject instead to reopen the task, then **Run again** for a fresh proposal.
7. **Exchange, Quotes & jobs** (optional): the enrichment quote is AUD 4.50. With the default threshold of AUD 2.00 accepting it creates an approval; decide it in Workspace, Approvals. Raise the threshold to skip approval, or lower the budget to see the over-budget denial. Accept twice and see one job. **Start job**, **Deliver result**, **Validate result**.
8. **Back in the task**: the labelled simulated result and the simulated cost appear on the task, and Activity shows versions, approvals, evaluation and cost in one timeline. Links between task, agent, blueprint, Registry package and Exchange job all work, and survive a reload.

## Also try

- **Top-left switchers**: `Papership / <product>` switches between Home, Workspace, Registry, Studio and Exchange. The organisation menu next to it lists the roles for the current product (Workspace: Founder, Project Lead, Developer, People Lead, Finance Lead, Head of Sales, Ops Manager; Registry, Studio and Exchange have their own). Choosing a role changes the left panel to that role's components and sub options. It is a menu lens only: your real access is unchanged and the server enforces it. The left panel also shows live approvals, agents, tasks, blueprints and jobs.
- **Home**: the connected demo guide shows which of the seven steps are done, with a link to each. The left rail, inspector and live dock follow whatever you open.
- **Workspace, Agents, an agent**: **Reviewable updates** lists newer published materials as a diff. Publish a new version of a material in Registry, then apply the update with its reviewed hash. **Agent Passport** shows and downloads the portable description.
- **Studio, a blueprint**: the pipeline shows each step's true state (deploy is planned), and **Compare versions** diffs two saved versions and their locks.
- **Studio, Builder**: the deployment target list enables only `export-only`.
- **Workspace, Team & tools**: access surfaces and what is real.

## Deep links

`#workspace/tasks/<task-id>`, `#workspace/agents/<agent-id>`, `#studio/blueprints/<blueprint-id>`.
