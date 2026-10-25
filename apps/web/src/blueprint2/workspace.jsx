import { useState } from "react";
import {
  Banner, Empty, ErrorNote, Kv, Link, Stat, Status, api, btn, card, chip, input, label, linkBtn, money, mono, navigate, short,
  useAction, useFocus, useLoad,
} from "./platform.jsx";
import { AccessSurfaces, PassportCard, UpdatesCard } from "./foundation-ui.jsx";

const CONTROLS = [["observe", "Observe"], ["invoke", "Invoke"], ["pause", "Pause"], ["cancel", "Cancel"], ["enforce_approval", "Enforce approval"]];

function ControlMatrix({ controls }) {
  const entries = Object.keys(controls || {}).length ? controls : null;
  if (!entries) return <Empty>No control surface is exposed for this runtime.</Empty>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {CONTROLS.map(([k, l]) => (
        <span key={k} style={{ ...chip, color: entries[k] ? "var(--green)" : "var(--t3)" }}>{l}: {entries[k] ? "supported" : "not supported"}</span>
      ))}
    </div>
  );
}

function Activity({ items }) {
  if (!items || !items.length) return <Empty>No activity yet.</Empty>;
  return items.map((a) => (
    <div key={a.id} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5, alignItems: "baseline" }}>
      <span style={{ ...mono, flex: "none", width: 150 }}>{a.created_at}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontWeight: 600 }}>{a.kind}</strong>
        <span style={{ color: "var(--t3)" }}> by {a.actor}</span>
        {a.task_id ? <> <Link to={["workspace", "Tasks", "task", a.task_id]}>task</Link></> : null}
      </span>
    </div>
  ));
}

export function ApprovalCard({ approval, canDecide, onDone }) {
  const [note, setNote] = useState("");
  const { busy, note: msg, run } = useAction(onDone);
  const pending = approval.status === "pending";
  const decide = (decision) => run(
    () => api.post(`/workspace/approvals/${approval.id}/decision`, { decision, payload_hash: approval.payload_hash, note }),
    `Recorded: ${decision}.`,
  );
  return (
    <div style={{ ...card, borderColor: pending ? "var(--amber)" : "var(--line)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{approval.kind === "crm.update_contact" ? `Update CRM contact${approval.payload.contact_name ? `: ${approval.payload.contact_name}` : ""} (simulated)` : "Accept Exchange quote (simulated)"}</strong>
        <Status value={approval.status} />
        <span style={{ ...mono, marginLeft: "auto" }}>binds to {short(approval.payload_hash)}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 6 }}>The decision applies to exactly this proposal. If it changes, this card goes stale and the decision is refused.</div>
      <pre style={{ margin: 0, padding: 10, borderRadius: 8, background: "var(--raised)", fontSize: 11.5, whiteSpace: "pre-wrap" }}>{JSON.stringify(approval.payload, null, 2)}</pre>
      {approval.task_id ? <div style={{ marginTop: 6, fontSize: 12.5 }}>Task: <Link to={["workspace", "Tasks", "task", approval.task_id]}>{approval.task_id}</Link></div> : null}
      {pending ? (
        canDecide ? (
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input aria-label="Decision note" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...input, flex: "1 1 200px" }} />
            <button type="button" disabled={busy} onClick={() => decide("approved")} style={btn(true)}>Approve this proposal</button>
            <button type="button" disabled={busy} onClick={() => decide("rejected")} style={btn(false)}>Reject</button>
          </div>
        ) : <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--t3)" }}>Only the Owner or Founder can decide this. Agents and operators cannot.</div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--t3)" }}>
          {approval.decided_by ? `Decided by ${approval.decided_by} at ${approval.decided_at}.` : "Not decided."} {approval.decision_note}
          {approval.action_result ? <> Result: <code>{JSON.stringify(approval.action_result.outcome || approval.action_result.label || approval.action_result.after)}</code></> : null}
        </div>
      )}
      {msg ? <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--t2)" }}>{msg}</div> : null}
    </div>
  );
}

function TaskDetail({ id, ctx, onChange }) {
  const { data: t, error, reload } = useLoad(`/workspace/tasks/${encodeURIComponent(id)}`, [id]);
  const [draft, setDraft] = useState(null);
  const refresh = async () => { setDraft(null); await reload(); if (onChange) onChange(); };
  const { busy, note, run } = useAction(refresh);
  const [qBusy, setQBusy] = useState(false);
  if (error) return <ErrorNote error={error} />;
  if (!t) return <Empty>Loading task.</Empty>;
  const text = draft == null ? t.result.text : draft;
  const pending = t.approvals.filter((a) => a.status === "pending");
  const canDecide = !!ctx?.member?.can_decide_approvals;
  const getQuote = async () => {
    setQBusy(true);
    await run(async () => {
      const q = await api.post("/exchange/quotes", { capability_id: "property-data-enrichment", task_id: t.id, input: { address: t.input.property_address } });
      return q;
    }, "Quote requested. Review it in Exchange. Nothing is charged.");
    setQBusy(false);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15 }}>{t.title}</strong>
          <Status value={t.status} />
          <span style={{ ...mono, marginLeft: "auto" }}>{t.id}</span>
        </div>
        <Kv k="Agent"><Link to={["workspace", "Agents", "agent", t.agent.id]}>{t.agent.name}</Link> <span style={mono}>runtime {t.agent.runtime}</span></Kv>
        <Kv k="Blueprint">{t.agent.blueprint.slug} <Link to={["studio", "Blueprints", "blueprint", t.agent.blueprint.id]}>version {t.agent.blueprint.version}</Link></Kv>
        <Kv k="Customer">{t.input.customer_name} ({t.input.customer_email})</Kv>
        <Kv k="Property">{t.input.property_address}</Kv>
        <Kv k="Question">{t.input.question}</Kv>
        <Kv k="Simulated cost">{money(t.simulated_cost_minor, t.currency)} <span style={mono}>Exchange, simulated</span></Kv>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {t.status === "open" ? <button type="button" disabled={busy} onClick={() => run(() => api.post(`/workspace/tasks/${t.id}/run`), "Run complete. The agent is waiting on your approval.")} style={btn(true)}>{t.runs.length ? "Run again" : "Run agent"}</button> : null}
          {!["done", "cancelled"].includes(t.status) ? <button type="button" disabled={busy} onClick={() => run(() => api.post(`/workspace/tasks/${t.id}/cancel`), "Task cancelled.")} style={btn(false)}>Cancel task</button> : null}
          <button type="button" disabled={busy || qBusy} onClick={getQuote} style={btn(false)}>Get data enrichment quote (simulated)</button>
        </div>
        {note ? <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
      </div>

      <div style={card}>
        <div style={label}>Result (editable draft)</div>
        {t.result.version ? (
          <>
            <div style={{ ...mono, marginBottom: 6 }}>version {t.result.version} · last edited by {t.result.last_edited_by} · produced by run {t.result.run_id}</div>
            <textarea aria-label="Draft reply" rows={9} value={text} disabled={t.status === "cancelled"} onChange={(e) => setDraft(e.target.value)} style={{ ...input, width: "100%", lineHeight: 1.5 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button type="button" disabled={busy || draft == null || draft === t.result.text} onClick={() => run(() => api.put(`/workspace/tasks/${t.id}/result`, { text: draft, base_version: t.result.version }), "Saved as a new version.")} style={btn(true)}>Save edit</button>
              <span style={{ fontSize: 11.5, color: "var(--t3)" }}>The reply is a draft. No email is sent by Papership.</span>
            </div>
          </>
        ) : <Empty>No result yet. Run the agent to produce a draft reply and a proposed CRM action.</Empty>}
      </div>

      {pending.length ? pending.map((a) => <ApprovalCard key={a.id} approval={a} canDecide={canDecide} onDone={refresh} />) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ ...card, flex: "1 1 300px" }}>
          <div style={label}>CRM contact (simulated)</div>
          {t.contact ? (
            <>
              <Kv k="Contact">{t.contact.name} <span style={mono}>{t.contact.contact_id}</span></Kv>
              <Kv k="Stage"><Status value={t.contact.stage} /></Kv>
              {t.contact.notes.map((n, i) => <div key={i} style={{ fontSize: 12, color: "var(--t2)", padding: "3px 0" }}>{n}</div>)}
              <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>A local table. It changes only after an approved decision.</div>
            </>
          ) : <Empty>No contact.</Empty>}
        </div>
        <div style={{ ...card, flex: "1 1 300px" }}>
          <div style={label}>Provenance: materials used</div>
          {t.provenance.length ? t.provenance.map((p) => (
            <div key={p.name} style={{ padding: "4px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
              {p.name}@{p.version} <span style={mono}>{short(p.content_hash)} · {p.source}</span>
            </div>
          )) : <Empty>No materials installed.</Empty>}
          {t.runs.length && t.runs[t.runs.length - 1].outputs.materials_used ? (
            <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>Latest run used: {t.runs[t.runs.length - 1].outputs.materials_used.join(", ") || "none"}.</div>
          ) : null}
        </div>
      </div>

      <div style={card}>
        <div style={label}>Exchange (simulated)</div>
        {t.exchange.quotes.length || t.exchange.jobs.length ? (
          <>
            {t.exchange.quotes.map((q) => (
              <div key={q.id} style={{ padding: "4px 0", fontSize: 12.5 }}>Quote {q.capability_id} <Status value={q.status} /> {money(q.estimate_minor, q.currency)} · <Link to={["exchange", "Quotes & jobs"]}>open in Exchange</Link></div>
            ))}
            {t.exchange.jobs.map((j) => (
              <div key={j.id} style={{ padding: "4px 0", fontSize: 12.5 }}>
                Job {j.id} <Status value={j.status} /> usage {money(j.usage_minor, j.currency)}
                {j.result ? <pre style={{ margin: "6px 0 0", padding: 8, borderRadius: 8, background: "var(--raised)", fontSize: 11.5, whiteSpace: "pre-wrap" }}>{JSON.stringify(j.result, null, 2)}</pre> : null}
              </div>
            ))}
          </>
        ) : <Empty>No Exchange activity for this task.</Empty>}
      </div>

      <div style={card}>
        <div style={label}>Runs</div>
        {t.runs.length ? t.runs.map((r) => (
          <div key={r.id} style={{ padding: "4px 0", fontSize: 12.5 }}><span style={mono}>{r.id}</span> <Status value={r.status} /> {r.adapter} {r.note ? `· ${r.note}` : ""}</div>
        )) : <Empty>No runs.</Empty>}
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{t.runs.length ? t.runs[t.runs.length - 1].outputs.method : ""}</div>
      </div>

      <div style={card}>
        <div style={label}>Activity</div>
        <Activity items={t.activity} />
      </div>
    </div>
  );
}

const NEW_TASK = {
  title: "", agent_id: "", customer_name: "", customer_email: "", property_address: "", contact_id: "c-1001", question: "",
};

function Tasks({ ctx, agents, onChange }) {
  const { data, error, reload } = useLoad("/workspace/tasks");
  const [sel, setSel] = useFocus("task");
  const [form, setForm] = useState(NEW_TASK);
  const [open, setOpen] = useState(false);
  const after = async (task) => { await reload(); if (onChange) onChange(); if (task?.id) { setSel(task.id); setOpen(false); } };
  const { busy, note, run } = useAction(after);
  if (sel) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div><button type="button" style={btn(false)} onClick={() => setSel(null)}>Back to tasks</button></div>
        <TaskDetail id={sel} ctx={ctx} onChange={reload} />
      </div>
    );
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.title && form.agent_id && form.customer_name && form.customer_email && form.property_address && form.question;
  const create = () => run(() => api.post("/workspace/tasks", {
    title: form.title, agent_id: form.agent_id,
    input: { customer_name: form.customer_name, customer_email: form.customer_email, property_address: form.property_address, contact_id: form.contact_id, question: form.question, listing: {} },
  }), "Task created.");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote error={error} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={btn(true)} onClick={() => setOpen(!open)}>{open ? "Close" : "New enquiry task"}</button>
      </div>
      {open ? (
        <div style={card}>
          <div style={label}>New enquiry task (fictional data only)</div>
          <div style={{ display: "grid", gap: 8 }}>
            <select aria-label="Agent" value={form.agent_id} onChange={set("agent_id")} style={input}>
              <option value="">Choose an agent</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input aria-label="Task title" placeholder="Title" value={form.title} onChange={set("title")} style={input} />
            <input aria-label="Customer name" placeholder="Customer name" value={form.customer_name} onChange={set("customer_name")} style={input} />
            <input aria-label="Customer email" placeholder="customer@example.test" value={form.customer_email} onChange={set("customer_email")} style={input} />
            <input aria-label="Property address" placeholder="Property address" value={form.property_address} onChange={set("property_address")} style={input} />
            <input aria-label="CRM contact id" placeholder="CRM contact id (c-1001 or c-1002)" value={form.contact_id} onChange={set("contact_id")} style={input} />
            <textarea aria-label="Enquiry question" rows={3} placeholder="The customer's question" value={form.question} onChange={set("question")} style={input} />
            <div><button type="button" disabled={busy || !valid} style={btn(true)} onClick={create}>Create task</button></div>
          </div>
        </div>
      ) : null}
      {note ? <div style={{ fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
      <div style={card}>
        <div style={label}>Tasks</div>
        {data && data.items.length ? data.items.map((t) => (
          <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line2)" }}>
            <button type="button" style={linkBtn} onClick={() => setSel(t.id)}>{t.title}</button>
            <Status value={t.status} />
            {t.pending_approvals ? <span style={{ ...chip, color: "var(--amber)" }}>{t.pending_approvals} awaiting approval</span> : null}
            <span style={{ ...mono, marginLeft: "auto" }}>{t.updated_at}</span>
          </div>
        )) : data ? <Empty>No tasks. Create one, or seed the demo from Overview.</Empty> : <Empty>Loading.</Empty>}
      </div>
    </div>
  );
}

function AgentDetail({ id, onBack }) {
  const { data: a, error, reload } = useLoad(`/workspace/agents/${encodeURIComponent(id)}`, [id]);
  if (error) return <ErrorNote error={error} />;
  if (!a) return <Empty>Loading agent.</Empty>;
  const ev = a.latest_evaluation;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div><button type="button" style={btn(false)} onClick={onBack}>Back to agents</button></div>
      <div style={card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 15 }}>{a.name}</strong><Status value={a.status} /><span style={{ ...mono, marginLeft: "auto" }}>{a.id}</span></div>
        <Kv k="Runtime">{a.runtime} <span style={mono}>deterministic demo, no model</span></Kv>
        <Kv k="Blueprint">{a.blueprint.title} <Link to={["studio", "Blueprints", "blueprint", a.blueprint.id]}>version {a.blueprint.version}</Link></Kv>
        <Kv k="Autonomy">{a.autonomy}</Kv>
        <div style={{ ...label, marginTop: 10 }}>What Papership can control for this runtime</div>
        <ControlMatrix controls={a.controls} />
      </div>
      <div style={card}>
        <div style={label}>Installed materials (exact versions)</div>
        {a.installs.map((i) => (
          <div key={i.package_name} style={{ padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
            <strong style={{ fontWeight: 600 }}>{i.package_name}@{i.version}</strong>
            <span style={mono}> {short(i.content_hash)} · source {i.source} · requested {i.requested_constraint}</span>
          </div>
        ))}
        {!a.installs.length ? <Empty>No materials installed.</Empty> : null}
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>Install more from <Link to={["registry"]}>Registry</Link>. Installing supplies instructions and references. It grants no permission.</div>
      </div>
      <UpdatesCard agentId={a.id} onApplied={reload} />
      <PassportCard agentId={a.id} />
      <div style={card}>
        <div style={label}>Latest fixture evaluation</div>
        {ev ? (
          <>
            <div style={{ fontSize: 12.5 }}>{ev.passed} of {ev.total} fixture checks passed.</div>
            <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{ev.method} {ev.scope}</div>
          </>
        ) : <Empty>Not evaluated. Run fixture checks in Studio.</Empty>}
      </div>
    </div>
  );
}

function Agents() {
  const { data, error } = useLoad("/workspace/agents");
  const [sel, setSel] = useFocus("agent");
  if (sel) return <AgentDetail id={sel} onBack={() => setSel(null)} />;
  return (
    <div style={card}>
      <ErrorNote error={error} />
      <div style={label}>Agents in this organisation</div>
      {data && data.items.length ? data.items.map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line2)", flexWrap: "wrap" }}>
          <button type="button" style={linkBtn} onClick={() => setSel(a.id)}>{a.name}</button>
          <Status value={a.status} />
          <span style={chip}>{a.blueprint.slug} v{a.blueprint.version}</span>
          <span style={chip}>{a.installs.length} materials</span>
          <span style={{ ...mono, marginLeft: "auto" }}>{a.runtime}</span>
        </div>
      )) : data ? <Empty>No agents yet. Instantiate one from a blueprint in Studio, or seed the demo from Overview.</Empty> : <Empty>Loading.</Empty>}
    </div>
  );
}

function Approvals({ ctx }) {
  const { data, error, reload } = useLoad("/workspace/approvals");
  const items = data ? data.items : [];
  const pending = items.filter((a) => a.status === "pending");
  const history = items.filter((a) => a.status !== "pending");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote error={error} />
      <Banner tone="simulated">Every external action waits here. Approving a proposal updates a local, simulated CRM or accepts a simulated Exchange quote. No email, payment or real CRM call exists.</Banner>
      <div style={label}>Awaiting decision ({pending.length})</div>
      {pending.length ? pending.map((a) => <ApprovalCard key={a.id} approval={a} canDecide={!!ctx?.member?.can_decide_approvals} onDone={reload} />) : <div style={card}><Empty>Nothing is waiting for you.</Empty></div>}
      <div style={label}>History</div>
      {history.length ? history.map((a) => <ApprovalCard key={a.id} approval={a} canDecide={false} />) : <div style={card}><Empty>No decisions yet.</Empty></div>}
    </div>
  );
}

function Team({ ctx }) {
  const { data: team } = useLoad("/workspace/team");
  const { data: caps } = useLoad("/platform/capabilities");
  const { data: know } = useLoad("/workspace/knowledge");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <div style={label}>Team and roles</div>
        {team ? team.members.map((m) => (
          <div key={m.principal_id} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
            <span style={mono}>{m.principal_id}</span><span style={chip}>{m.kind}</span><span>{m.role}</span>
          </div>
        )) : <Empty>Loading.</Empty>}
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>{team?.note}</div>
        {ctx ? (
          <div style={{ marginTop: 10 }}>
            <div style={label}>How permissions map</div>
            {Object.entries(ctx.permission_mapping).map(([k, v]) => <Kv key={k} k={k.replace(/_/g, " ")}>{v}</Kv>)}
          </div>
        ) : null}
      </div>
      <div style={card}>
        <div style={label}>Tools and integrations</div>
        {caps ? caps.integrations.map((i) => (
          <div key={i.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line2)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 13 }}>{i.label}</strong><Status value={i.status} /><span style={chip}>{i.kind}</span></div>
            <div style={{ marginTop: 6 }}><ControlMatrix controls={i.controls} /></div>
          </div>
        )) : <Empty>Loading.</Empty>}
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>Control differs per integration. Where nothing is supported, Papership cannot observe or stop that agent, and says so.</div>
      </div>
      <AccessSurfaces />
      <div style={card}>
        <div style={label}>Knowledge</div>
        {know ? (
          <>
            <Kv k="Private passages">{know.private_context_passages}</Kv>
            <Kv k="Installed materials">{know.installed_materials}</Kv>
            <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{know.note}</div>
          </>
        ) : <Empty>Loading.</Empty>}
      </div>
    </div>
  );
}

function Overview({ ctx, agents, reloadAll }) {
  const { data, error, reload } = useLoad("/workspace/overview");
  const after = async () => { await reload(); await reloadAll(); };
  const { busy, note, run } = useAction(after);
  const tasks = data ? data.tasks_by_status : {};
  const total = Object.values(tasks).reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote error={error} />
      {ctx ? (
        <div style={{ ...card, background: "var(--raised)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{ctx.organisation.name}</strong>
            <span style={chip}>{ctx.member.role}</span>
            <span style={{ fontSize: 12, color: "var(--t3)" }}>{ctx.identity_note}</span>
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat k="Agents" v={data ? data.agents : "–"} hint="org-owned instances of blueprints" />
        <Stat k="Tasks" v={data ? total : "–"} hint={Object.entries(tasks).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(", ") || "none yet"} />
        <Stat k="Awaiting approval" v={data ? data.pending_approvals.length : "–"} hint="decisions only you can make" />
        <Stat k="Exchange budget left" v={data ? money(data.exchange.remaining_minor, data.exchange.currency) : "–"} hint="simulated, nothing is charged" />
      </div>
      <div style={card}>
        <div style={label}>Demo scenario: Engine Labs real-estate enquiry assistant</div>
        <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.55 }}>
          Fictional data only. Studio defines the agent, Registry supplies versioned materials, the resolver locks exact versions, Workspace runs a task and pauses for your approval,
          and Exchange can quote optional data enrichment as a simulated job. Nothing is emailed, purchased or published.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" disabled={busy} style={btn(true)} onClick={() => run(() => api.post("/platform/demo/seed"), "Demo seeded. Safe to press again.")}>{data?.seeded ? "Re-check demo data" : "Seed demo data"}</button>
          <button type="button" disabled={busy} style={btn(false)} onClick={() => { if (window.confirm("Reset all demo agents, tasks, blueprints and Exchange records for this organisation? Registry packages are kept.")) run(() => api.post("/platform/demo/reset"), "Reset. Seed again to restart the walkthrough."); }}>Reset demo</button>
          {note ? <span style={{ fontSize: 12.5, color: "var(--t2)" }}>{note}</span> : null}
        </div>
      </div>
      <div style={card}>
        <div style={label}>Needs a decision</div>
        {data && data.pending_approvals.length ? data.pending_approvals.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line2)", alignItems: "center", fontSize: 12.5 }}>
            <Status value="pending" /> {a.kind === "crm.update_contact" ? "Update CRM contact (simulated)" : "Accept Exchange quote (simulated)"}
            <button type="button" style={{ ...linkBtn, marginLeft: "auto" }} onClick={() => navigate("workspace", "Approvals")}>Review</button>
          </div>
        )) : <Empty>Nothing is waiting.</Empty>}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ ...card, flex: "1 1 340px" }}>
          <div style={label}>Agents</div>
          {agents.length ? agents.map((a) => <div key={a.id} style={{ padding: "4px 0", fontSize: 12.5 }}><Link to={["workspace", "Agents", "agent", a.id]}>{a.name}</Link> <span style={mono}>{a.blueprint.slug} v{a.blueprint.version}</span></div>) : <Empty>No agents yet.</Empty>}
        </div>
        <div style={{ ...card, flex: "1 1 340px" }}>
          <div style={label}>Recent activity</div>
          <Activity items={data ? data.recent_activity : []} />
        </div>
      </div>
    </div>
  );
}

export function WorkspacePanel({ sub }) {
  const { data: ctx } = useLoad("/platform/context");
  const { data: agentData, reload: reloadAgents } = useLoad("/workspace/agents");
  const agents = agentData ? agentData.items : [];
  if (sub === "Agents") return <Agents />;
  if (sub === "Tasks") return <Tasks ctx={ctx} agents={agents} onChange={reloadAgents} />;
  if (sub === "Approvals") return <Approvals ctx={ctx} />;
  if (sub === "Activity") return <ActivityPage />;
  if (sub === "Team & tools") return <Team ctx={ctx} />;
  return <Overview ctx={ctx} agents={agents} reloadAll={reloadAgents} />;
}

function ActivityPage() {
  const { data, error } = useLoad("/workspace/activity?limit=200");
  return (
    <div style={card}>
      <ErrorNote error={error} />
      <div style={label}>Connected activity: versions, approvals, evaluations and simulated costs</div>
      <Activity items={data ? data.items : []} />
    </div>
  );
}
