import { useState } from "react";
import { Banner, Empty, ErrorNote, Kv, Link, Stat, Status, api, btn, card, chip, input, label, money, mono, navigate, useAction, useLoad } from "./platform.jsx";

const SIM = "Everything here is fictional: no provider, payment or real result is involved.";

function Policy({ policy, reload, isAdmin }) {
  const [limit, setLimit] = useState("");
  const [threshold, setThreshold] = useState("");
  const { busy, note, run } = useAction(reload);
  if (!policy) return null;
  return (
    <div style={card}>
      <div style={label}>Budget and policy (simulated)</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat k="Limit" v={money(policy.budget_limit_minor, policy.currency)} />
        <Stat k="Reserved" v={money(policy.reserved_minor, policy.currency)} hint="authorised, not yet used" />
        <Stat k="Recorded usage" v={money(policy.spent_simulated_minor, policy.currency)} hint="simulated" />
        <Stat k="Remaining" v={money(policy.remaining_minor, policy.currency)} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 8 }}>Quotes above {money(policy.approval_threshold_minor, policy.currency)} need an Owner or Founder approval. Policy is checked again, with the policy in force then, when a quote is accepted.</div>
      {isAdmin ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input aria-label="Budget limit in minor units" placeholder={`limit (${policy.budget_limit_minor})`} value={limit} onChange={(e) => setLimit(e.target.value)} style={{ ...input, width: 150 }} />
          <input aria-label="Approval threshold in minor units" placeholder={`threshold (${policy.approval_threshold_minor})`} value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ ...input, width: 170 }} />
          <button type="button" disabled={busy} style={btn(false)} onClick={() => run(() => api.post("/exchange/policy", {
            budget_limit_minor: parseInt(limit || policy.budget_limit_minor, 10), approval_threshold_minor: parseInt(threshold || policy.approval_threshold_minor, 10),
          }), "Policy updated.")}>Update policy</button>
          <span style={mono}>integer minor units</span>
        </div>
      ) : null}
      {note ? <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
    </div>
  );
}

function CapabilityCard({ cap, tasks, reloadAll }) {
  const [input1, setInput1] = useState("");
  const [taskId, setTaskId] = useState("");
  const { busy, note, run } = useAction(reloadAll);
  const key = cap.input_schema.required[0];
  const prefill = () => {
    const t = tasks.find((x) => x.id === taskId);
    return t ? t.input.property_address : "";
  };
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 14 }}>{cap.title}</strong>
        <span style={chip}>{cap.provider.kind}</span>
        <span style={{ ...mono, marginLeft: "auto" }}>{money(cap.price_minor, cap.currency)} {cap.unit}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t2)", margin: "4px 0" }}>{cap.description}</div>
      <div style={mono}>Provider {cap.provider.name} (fictional) · {cap.sla} · demo stats: {cap.demo_stats.jobs_completed} jobs, rating {cap.demo_stats.rating}</div>
      <div style={{ ...mono, marginTop: 2 }}>Needs: {cap.input_schema.required.join(", ")} · Returns: {cap.output_schema.required.join(", ")}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Link to a Workspace task" value={taskId} onChange={(e) => setTaskId(e.target.value)} style={input}>
          <option value="">No task</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title.slice(0, 50)}</option>)}
        </select>
        <input aria-label={`Input ${key}`} placeholder={key} value={input1 || prefill()} onChange={(e) => setInput1(e.target.value)} style={{ ...input, flex: "1 1 200px" }} />
        <button type="button" disabled={busy || !(input1 || prefill())} style={btn(true)} onClick={() => run(() => api.post("/exchange/quotes", { capability_id: cap.id, task_id: taskId || null, input: { [key]: input1 || prefill() } }), "Quote created. Review it under Quotes.")}>Request quote</button>
      </div>
      {note ? <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
    </div>
  );
}

function Catalogue() {
  const { data, error } = useLoad("/exchange/capabilities");
  const { data: tasks, reload } = useLoad("/workspace/tasks");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote error={error} />
      <Banner tone="demo">{data ? data.label : "Demo catalogue."} {SIM} Paid Registry materials and Exchange work are different things: the Registry installs reusable knowledge, Exchange buys a task to be performed.</Banner>
      {data ? data.items.map((c) => <CapabilityCard key={c.id} cap={c} tasks={tasks ? tasks.items : []} reloadAll={reload} />) : null}
    </div>
  );
}

function QuoteRow({ q, reload }) {
  const [out, setOut] = useState(null);
  const { busy, note, run } = useAction(reload);
  const accept = async () => { const r = await run(() => api.post(`/exchange/quotes/${q.id}/accept`)); if (r) setOut(r); };
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--line2)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <strong style={{ fontWeight: 600 }}>{q.capability_id}</strong><Status value={q.status} />
        <span>estimate {money(q.estimate_minor, q.currency)}</span>
        <span style={mono}>expires {q.expires_at}</span>
        {q.task_id ? <Link to={["workspace", "Tasks", "task", q.task_id]}>task</Link> : null}
        {q.status === "open" ? <button type="button" disabled={busy} style={{ ...btn(true), marginLeft: "auto" }} onClick={accept}>Accept (simulated)</button> : null}
        {q.job ? <span style={{ ...mono, marginLeft: "auto" }}>job {q.job.id}</span> : null}
      </div>
      <div style={{ ...mono, marginTop: 2 }}>
        preview: {q.policy_preview.requires_approval ? "needs approval" : "no approval needed"}, {q.policy_preview.within_budget ? "within budget" : "over budget"}. {q.policy_preview.note}
      </div>
      {out && out.outcome === "awaiting_approval" ? (
        <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--amber)" }}>{out.decision.reason}. <button type="button" onClick={() => navigate("workspace", "Approvals")} style={{ border: 0, background: "transparent", color: "var(--blue)", cursor: "pointer", padding: 0, font: "600 12.5px Inter,sans-serif" }}>Review the approval</button></div>
      ) : null}
      {out && out.outcome === "job_exists" ? <div style={{ fontSize: 12, marginTop: 4, color: "var(--t3)" }}>Already accepted. Same job returned, nothing duplicated.</div> : null}
      {note ? <div role="alert" style={{ fontSize: 12.5, marginTop: 4, color: "var(--red)" }}>{note}</div> : null}
    </div>
  );
}

function JobRow({ j, reload }) {
  const { busy, note, run } = useAction(reload);
  const open = ["accepted", "running", "delivered"].includes(j.status);
  const next = { accepted: "Start job", running: "Deliver result", delivered: "Validate result" }[j.status];
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--line2)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
        <strong style={{ fontWeight: 600 }}>{j.capability_id}</strong><Status value={j.status} />
        <span style={mono}>{j.id}</span>
        <span>authorised {money(j.authorised_minor, j.currency)} · usage {money(j.usage_minor, j.currency)}</span>
        {j.task_id ? <Link to={["workspace", "Tasks", "task", j.task_id]}>task</Link> : null}
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {open ? <button type="button" disabled={busy} style={btn(true)} onClick={() => run(() => api.post(`/exchange/jobs/${j.id}/advance`))}>{next}</button> : null}
          {["accepted", "running"].includes(j.status) ? <button type="button" disabled={busy} style={btn(false)} onClick={() => run(() => api.post(`/exchange/jobs/${j.id}/cancel`), "Cancelled. The reservation was released.")}>Cancel</button> : null}
        </span>
      </div>
      {j.result ? (
        <pre style={{ margin: "6px 0 0", padding: 8, borderRadius: 8, background: "var(--raised)", fontSize: 11.5, whiteSpace: "pre-wrap" }}>{JSON.stringify(j.result, null, 2)}</pre>
      ) : null}
      {j.validation ? <div style={{ ...mono, marginTop: 4 }}>{j.validation.passed ? "validation passed" : `validation failed, missing ${j.validation.missing.join(", ")}`} · {j.validation.method}</div> : null}
      <div style={{ ...mono, marginTop: 4 }}>
        Disputes: {j.dispute.state} · Refunds: {j.dispute.refund}. {j.dispute.note}
      </div>
      {note ? <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--t2)" }}>{note}</div> : null}
    </div>
  );
}

function QuotesJobs({ ctx, part = "all" }) {
  const { data: policy, reload: rp, error } = useLoad("/exchange/policy");
  const { data: quotes, reload: rq } = useLoad("/exchange/quotes");
  const { data: jobs, reload: rj } = useLoad("/exchange/jobs");
  const reload = async () => { await Promise.all([rp(), rq(), rj()]); };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote error={error} />
      <Banner tone="simulated">{SIM} A job moves accepted, running, delivered, validated. Results are returned to the linked Workspace task with this label.</Banner>
      {part === "all" || part === "policy" ? <Policy policy={policy} reload={reload} isAdmin={!!ctx?.member?.permissions?.policy} /> : null}
      {part === "all" || part === "quotes" ? (
      <div style={card}>
        <div style={label}>Quotes</div>
        {quotes && quotes.items.length ? quotes.items.map((q) => <QuoteRow key={q.id} q={q} reload={reload} />) : <Empty>No quotes. Request one from the catalogue or from a Workspace task.</Empty>}
      </div>
      ) : null}
      {part === "all" || part === "jobs" ? (
      <div style={card}>
        <div style={label}>Jobs</div>
        {jobs && jobs.items.length ? jobs.items.map((j) => <JobRow key={j.id} j={j} reload={reload} />) : <Empty>No jobs. Accepting a quote creates exactly one.</Empty>}
      </div>
      ) : null}
      {part === "all" || part === "jobs" || part === "policy" ? (
      <div style={card}>
        <div style={label}>Not built yet</div>
        <Kv k="Disputes and refunds">Placeholders only. Both return 501.</Kv>
        <Kv k="Wallet, payments, payouts">Unsupported. A future settlement adapter would sit behind this flow.</Kv>
        <Kv k="Demo stats">Ratings and job counts in the catalogue are fictional seeded numbers.</Kv>
      </div>
      ) : null}
    </div>
  );
}

export function ExchangePanel({ sub }) {
  const { data: ctx } = useLoad("/platform/context");
  if (sub === "Quotes") return <QuotesJobs ctx={ctx} part="quotes" />;
  if (sub === "Jobs") return <QuotesJobs ctx={ctx} part="jobs" />;
  if (sub === "Budget & policy") return <QuotesJobs ctx={ctx} part="policy" />;
  if (sub === "Quotes & jobs") return <QuotesJobs ctx={ctx} part="all" />;
  return <Catalogue />;
}
