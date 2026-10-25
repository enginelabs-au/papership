import { useCallback, useEffect, useState } from "react";
import { fetchPapershipJson, postPapershipJson } from "../api/papership.js";

const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 };
const label = { fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 };
const input = { width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", font: "400 12.5px Inter,sans-serif" };
const btn = (primary) => ({ height: 28, padding: "0 12px", border: primary ? 0 : "1px solid var(--line)", background: primary ? "var(--blue)" : "transparent", color: primary ? "#fff" : "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" });
const pct = (n) => (n == null ? "–" : `${Math.round(n * 100)}%`);
const signed = (n) => (n == null ? "–" : `${n > 0 ? "+" : ""}${Math.round(n * 100)} pts`);

function Stat({ k, v, hint }) {
  return (
    <div style={{ ...card, flex: "1 1 150px" }}>
      <div style={label}>{k}</div>
      <div style={{ font: "600 22px Inter,sans-serif" }}>{v}</div>
      {hint ? <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

/** The product: ask for context for a task, see what an agent would receive, record how it went, watch lift. */
export function LoopPanel() {
  const [sum, setSum] = useState(null);
  const [task, setTask] = useState("");
  const [pack, setPack] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSum(await fetchPapershipJson("/knowledge/loop"));
    } catch (error) {
      setNote(error.message || "The knowledge loop is unavailable.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setNote("");
    try { await fn(); } catch (error) { setNote(error.message || "That did not complete."); } finally { setBusy(false); }
  };
  const ingest = () => run(async () => {
    const out = await postPapershipJson("/knowledge/ingest", {});
    setNote(`Indexed ${out.documents} documents: ${out.chunks_added} new, ${out.chunks_unchanged} unchanged, ${out.chunks_superseded} superseded, ${out.chunks_skipped_secret_shaped} skipped as credential-like.`);
    await load();
  });
  const resolve = () => run(async () => {
    setPack(await postPapershipJson("/knowledge/resolve", { task, runtime: "web" }));
    await load();
  });
  const outcome = (value) => run(async () => {
    await postPapershipJson("/knowledge/outcomes", { delivery_id: pack.delivery_id, outcome: value, source: "human" });
    setNote(`Recorded: ${value}.`);
    await load();
  });

  const lift = sum?.lift;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, background: "var(--raised)", fontSize: 13, color: "var(--t2)", lineHeight: 1.55 }}>
        An agent asks for what it needs to know for a task. Papership returns a small, current context pack, then learns which context actually helped.
        The pack below is exactly what the <code>resolve_context</code> MCP tool and <code>POST /knowledge/resolve</code> return; this page is only a window onto it.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat k="Indexed" v={sum ? `${sum.indexed_chunks}` : "–"} hint={sum ? `${sum.indexed_documents} documents${sum.last_ingested_at ? " · " + sum.last_ingested_at.slice(0, 10) : ""}` : ""} />
        <Stat k="Deliveries" v={sum ? `${sum.deliveries}` : "–"} hint="context packs served" />
        <Stat k="With an outcome" v={lift ? `${lift.resolved_deliveries}` : "–"} hint="needed before anything is learned" />
        <Stat k="Baseline success" v={pct(lift?.baseline_success_rate)} hint="all resolved deliveries" />
      </div>

      <div style={card}>
        <div style={label}>Resolve context for a task</div>
        <textarea aria-label="Task" rows={2} placeholder="What is the agent about to do? e.g. Add a new connector for Slack with OAuth" value={task} onChange={(e) => setTask(e.target.value)} style={input} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" disabled={busy || !task.trim()} onClick={resolve} style={btn(true)}>Resolve</button>
          <button type="button" disabled={busy} onClick={ingest} style={btn(false)}>{sum && sum.indexed_chunks ? "Re-index repository" : "Index this repository"}</button>
        </div>
        {note ? <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
        {pack ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 6 }}>
              {pack.gap === "no_indexed_knowledge"
                ? "Nothing is indexed yet. Index the repository first."
                : pack.gap === "no_matching_context"
                  ? "No indexed context matches this task. That is a knowledge gap, and it is recorded as one."
                  : `${pack.chunks.length} passages · ${pack.tokens} of ${pack.token_budget} tokens`}
            </div>
            {pack.chunks.map((c) => (
              <div key={c.id} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line2)", marginBottom: 6 }}>
                <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: "var(--t2)" }}>
                  {c.path}{c.heading ? ` # ${c.heading}` : ""} · {c.matched_terms.join(", ")}{c.lift && c.lift.reliable ? ` · lift ${signed(c.lift.lift)} (n=${c.lift.n})` : ""}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 4, whiteSpace: "pre-wrap", maxHeight: 96, overflow: "hidden" }}>{c.text}</div>
              </div>
            ))}
            {pack.chunks.length ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: "var(--t2)" }}>Did the task succeed with this context?</span>
                <button type="button" disabled={busy} onClick={() => outcome("success")} style={btn(true)}>Success</button>
                <button type="button" disabled={busy} onClick={() => outcome("partial")} style={btn(false)}>Partial</button>
                <button type="button" disabled={busy} onClick={() => outcome("failure")} style={btn(false)}>Failure</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={label}>Recent deliveries</div>
          {sum && sum.recent.length ? sum.recent.map((r) => (
            <div key={r.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
              <div>{r.task.slice(0, 110)}</div>
              <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>
                {r.runtime || "unknown runtime"} · {r.gap ? r.gap.replace(/_/g, " ") : `${r.chunks} passages`} · {r.outcome_score == null ? "no outcome yet" : `outcome ${pct(r.outcome_score)}`}
              </div>
            </div>
          )) : <div style={{ fontSize: 12.5, color: "var(--t3)" }}>None yet.</div>}
        </div>
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={label}>What helps and what hurts</div>
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 6 }}>
            Success rate when a passage was delivered, against the baseline. Counted only from {lift ? lift.min_samples : 3} outcomes.
          </div>
          {lift && lift.items.length ? lift.items.slice(0, 10).map((i) => (
            <div key={i.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.key}</span>
              <span style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: !i.reliable ? "var(--t3)" : i.lift >= 0 ? "var(--green)" : "var(--red)", flex: "none" }}>
                {i.reliable ? signed(i.lift) : `n=${i.n} · too few`}
              </span>
            </div>
          )) : <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Nothing learned yet. Record outcomes and this fills in.</div>}
        </div>
      </div>
    </div>
  );
}
