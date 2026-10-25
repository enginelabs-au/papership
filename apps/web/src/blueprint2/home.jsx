import { Empty, Status, api, btn, card, chip, label, money, mono, navigate, useAction } from "./platform.jsx";
import { ApprovalCard } from "./workspace.jsx";
import { TERMINAL_TASK, ago, useLive } from "./live.jsx";

const PRODUCTS = [
  { id: "workspace", sub: "Overview", does: "Run agents and coordinate work. See the enquiry, the draft reply, the contact record and the approval together.", entry: "Open Workspace" },
  { id: "registry", sub: "", does: "Search, publish and install Agent Materials with exact versions, dependencies and provenance. Updates are reviewed, never silent.", entry: "Open Registry" },
  { id: "studio", sub: "Blueprints", does: "Define an agent, lock its materials, run fixture checks, then create a Workspace agent or export the configuration.", entry: "Open Studio" },
  { id: "exchange", sub: "Catalogue", does: "Find a provider for a task, get a quote, check budget and policy, and watch a simulated job. Nothing is bought.", entry: "Open Exchange" },
];

function Tile({ k, v, hint, tone, onClick }) {
  return (
    <button type="button" onClick={onClick} className="bp2-command-tile" style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--t2)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone || "var(--t3)" }} />{k}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.3px", marginTop: 4, color: tone || "var(--t1)" }}>{v}</div>
      <div style={{ font: "400 9.5px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hint}</div>
    </button>
  );
}

function steps(live) {
  const bp = live.blueprints.find((b) => b.slug === "enquiry-assistant") || live.blueprints[0];
  const agent = live.agents[0];
  const task = live.tasks[0];
  const decided = live.approvals.find((a) => a.status === "approved");
  const job = live.jobs.find((j) => ["delivered", "validated"].includes(j.status));
  const linked = task ? live.activity.filter((a) => a.task_id === task.id).length : 0;
  return [
    { n: 1, product: "Studio", title: "Define the enquiry assistant", done: !!bp, detail: bp ? `${bp.title}, ${bp.versions.length} saved version${bp.versions.length === 1 ? "" : "s"}` : "No blueprint yet", go: () => bp ? navigate("studio", "Blueprints", "blueprint", bp.id) : navigate("studio", "Builder") },
    { n: 2, product: "Registry", title: "Discover and lock materials", done: !!agent && agent.installs.length > 0, detail: agent ? `${agent.installs.length} materials locked to exact versions` : "Resolver runs when a blueprint is saved", go: () => navigate("registry") },
    { n: 3, product: "Studio", title: "Create a Workspace agent from the blueprint", done: !!agent, detail: agent ? `${agent.name} on ${agent.runtime}` : "No agent yet", go: () => agent ? navigate("workspace", "Agents", "agent", agent.id) : navigate("studio", "Blueprints") },
    { n: 4, product: "Workspace", title: "Assign a task and get an editable draft", done: !!task, detail: task ? `${task.title} (${task.status.replace(/_/g, " ")})` : "No task yet", go: () => task ? navigate("workspace", "Tasks", "task", task.id) : navigate("workspace", "Tasks") },
    { n: 5, product: "Workspace", title: "Approve or reject the exact proposal", done: !!decided, detail: decided ? "Approved. Simulated CRM updated, no email sent" : `${live.pending.length} waiting`, go: () => navigate("workspace", "Approvals") },
    { n: 6, product: "Exchange", title: "Quote and run simulated data enrichment", done: !!job, detail: job ? `${job.capability_id} ${job.status}, result returned to the task` : `${live.quotes.length} quotes, ${live.jobs.length} jobs`, go: () => navigate("exchange", "Quotes & jobs") },
    { n: 7, product: "All", title: "Follow linked activity, versions and provenance", done: linked > 2, detail: task ? `${linked} events linked to the task` : "Appears once a task exists", go: () => navigate("workspace", "Activity") },
  ];
}

export function HomePanel() {
  const live = useLive();
  const { busy, note, run } = useAction();
  const seeded = !!(live.overview && live.overview.seeded);
  const open = live.tasks.filter((t) => !TERMINAL_TASK.includes(t.status)).length;
  const budget = live.exchangeBudget;
  const list = steps(live);
  const done = list.filter((s) => s.done).length;
  const canDecide = !!(live.ctx && live.ctx.member.can_decide_approvals);
  const meaning = live.caps ? live.caps.status_meaning : {};
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="bp2-command-greet">
        <div style={{ fontSize: 15, fontWeight: 600 }}>{live.ctx ? live.ctx.organisation.name : "Papership"}</div>
        <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 3 }}>
          Papership is a platform where people build, equip and operate AI agents together. Four products share one organisation, one set of records and one activity log.
        </div>
        {live.ctx ? <div style={{ ...mono, marginTop: 6 }}>{live.ctx.member.role} · {live.ctx.identity_note}</div> : null}
      </div>

      <div className="bp2-command-tiles">
        <Tile k="Needs you" v={live.pending.length} hint={live.pending.length ? `oldest ${ago(live.pending[live.pending.length - 1].created_at)}` : "all clear"} tone={live.pending.length ? "var(--amber)" : "var(--green)"} onClick={() => navigate("workspace", "Approvals")} />
        <Tile k="Agents" v={live.agents.length} hint="org-owned instances" tone="var(--brand)" onClick={() => navigate("workspace", "Agents")} />
        <Tile k="Tasks open" v={open} hint={`${live.tasks.length} in total`} tone="var(--brand)" onClick={() => navigate("workspace", "Tasks")} />
        <Tile k="Exchange budget left" v={budget ? money(budget.remaining_minor, budget.currency) : "-"} hint="simulated, nothing charged" tone="var(--cyan)" onClick={() => navigate("exchange", "Quotes & jobs")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
        {PRODUCTS.map((p) => {
          const meta = live.caps ? live.caps.products.find((x) => x.id === p.id) : null;
          return (
            <div key={p.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13.5, textTransform: "capitalize" }}>{p.id}</strong>
                {meta ? <Status value={meta.status} /> : null}
              </div>
              <div style={{ fontSize: 12, color: "var(--t1)" }}>{meta ? meta.promise : ""}</div>
              <div style={{ fontSize: 11.5, color: "var(--t3)", flex: 1 }}>{p.does}</div>
              <div><button type="button" style={btn(true)} onClick={() => navigate(p.id, p.sub)}>{p.entry}</button></div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ ...label, marginBottom: 0 }}>Connected demo: Engine Labs real-estate enquiry assistant</div>
          <span style={chip}>{done} of {list.length} steps done</span>
          <span style={{ ...mono, marginLeft: "auto" }}>fictional data, no email, CRM, payment or publication</span>
        </div>
        {list.map((s) => (
          <div key={s.n} role="button" tabIndex={0} onClick={s.go} onKeyDown={(e) => { if (e.key === "Enter") s.go(); }} className="ps-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderBottom: "1px solid var(--line2)", cursor: "pointer", borderRadius: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: "600 10px Inter,sans-serif", background: s.done ? "var(--green)" : "var(--raised)", color: s.done ? "#fff" : "var(--t3)", border: `1px solid ${s.done ? "var(--green)" : "var(--line)"}` }}>{s.done ? "✓" : s.n}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{s.title}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--t3)" }}>{s.detail}</span>
            </span>
            <span style={chip}>{s.product}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" disabled={busy} style={btn(true)} onClick={() => run(() => api.post("/platform/demo/seed"), "Demo seeded. Safe to press again.")}>{seeded ? "Re-check demo data" : "Seed demo data"}</button>
          <button type="button" disabled={busy} style={btn(false)} onClick={() => { if (window.confirm("Reset all demo agents, tasks, blueprints and Exchange records for this organisation? Registry packages are kept.")) run(() => api.post("/platform/demo/reset"), "Reset. Seed again to restart the walkthrough."); }}>Reset demo</button>
          {note ? <span style={{ fontSize: 12.5, color: "var(--t2)" }}>{note}</span> : null}
        </div>
      </div>

      <div>
        <div style={{ ...label, marginBottom: 6 }}>Needs a decision ({live.pending.length})</div>
        {live.pending.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {live.pending.slice(0, 3).map((a) => <ApprovalCard key={a.id} approval={a} canDecide={canDecide} onDone={live.reload} />)}
            {live.pending.length > 3 ? <button type="button" style={btn(false)} onClick={() => navigate("workspace", "Approvals")}>See all {live.pending.length}</button> : null}
          </div>
        ) : <div style={card}><Empty>Nothing is waiting for you.</Empty></div>}
      </div>

      <div style={card}>
        <div style={label}>What the labels mean</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6 }}>
          {Object.entries(meaning).map(([k, v]) => <div key={k} style={{ fontSize: 11.5, display: "flex", gap: 8, alignItems: "baseline" }}><Status value={k} /><span style={{ color: "var(--t3)" }}>{v}</span></div>)}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 8 }}>The full list of what is implemented, simulated, planned and unsupported is under Workspace, Team and tools.</div>
      </div>
    </div>
  );
}
