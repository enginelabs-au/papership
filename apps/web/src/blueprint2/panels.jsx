import { useCallback, useEffect, useState } from "react";
import { fetchPapershipJson, postPapershipJson } from "../api/papership.js";

const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 };
const label = { fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 };
const input = { width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", font: "400 12.5px Inter,sans-serif" };
const btn = (primary) => ({ height: 28, padding: "0 12px", border: primary ? 0 : "1px solid var(--line)", background: primary ? "var(--blue)" : "transparent", color: primary ? "#fff" : "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" });
const APPROVAL_CLASS_COMMS = "approval.comms.send";

/** Telegram and WhatsApp inside Papership: compose, approve the exact message, send, receipt. */
export function MessagingPanel() {
  const [rows, setRows] = useState([]);
  const [provider, setProvider] = useState("telegram");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [messages, setMessages] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const body = await fetchPapershipJson("/connections");
      setRows((body.items || []).filter((r) => r.id === "telegram" || r.id === "whatsapp"));
      const list = await fetchPapershipJson(`/connections/${provider}/messages`);
      setMessages(list.items || []);
    } catch (error) {
      setNote(error.message || "Messaging is unavailable.");
    }
  }, [provider]);
  useEffect(() => { load(); }, [load]);

  const row = rows.find((r) => r.id === provider);
  const run = async (fn) => {
    setBusy(true); setNote("");
    try { await fn(); } catch (error) { setNote(error.message || "That did not complete."); } finally { setBusy(false); }
  };
  const connect = () => run(async () => {
    const out = await postPapershipJson(`/connections/${provider}/connect`, {});
    if (!out.enabled) setNote(`Add ${out.missing_env.join(", ")} on the API host, then press Connect.`);
    await load();
  });
  const registerWebhook = () => run(async () => {
    if (!window.confirm("Telegram allows one receiver per bot. Registering the webhook stops any other receiver of this bot (for example Hermes) from getting its incoming messages. Sending is unaffected. Continue?")) return;
    const out = await postPapershipJson("/connections/telegram/webhook/register", { confirm_takeover: true });
    setNote(`Webhook ${out.webhook}.`);
  });
  const prepare = () => run(async () => {
    setReceipt(null);
    setDraft(await postPapershipJson(`/connections/${provider}/compose`, { to, text }));
  });
  const approveAndSend = () => run(async () => {
    await postPapershipJson("/approvals", {
      approval_class: APPROVAL_CLASS_COMMS,
      target_id: draft.target_id,
      target_version: draft.target_version,
      decision: "approved",
    });
    setReceipt(await postPapershipJson(`/connections/${provider}/send`, { approval_id: draft.approval_id, to, text }));
    setDraft(null); setText("");
    await load();
  });

  return (
    <div style={card}>
      <div style={label}>Telegram and WhatsApp</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {["telegram", "whatsapp"].map((id) => (
          <button key={id} type="button" onClick={() => { setProvider(id); setDraft(null); setReceipt(null); }} style={{ ...btn(provider === id), textTransform: "capitalize" }}>{id}</button>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 8 }}>
        {row ? `${row.status}${row.enabled ? " · connected" : ""}` : "loading"} · {row?.handoff || ""}
      </div>
      {row && !row.enabled ? <button type="button" disabled={busy} onClick={connect} style={btn(true)}>Connect {provider}</button> : null}
      {row?.enabled && provider === "telegram" ? <button type="button" disabled={busy} onClick={registerWebhook} style={{ ...btn(false), marginLeft: 8 }}>Register webhook</button> : null}
      {row?.webhook_url ? <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 8 }}>Webhook · {row.webhook_url}</div> : null}
      {row?.enabled ? (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <input aria-label="Recipient" placeholder={provider === "telegram" ? "Chat id" : "Phone number, digits only"} value={to} onChange={(e) => setTo(e.target.value)} style={input} />
          <textarea aria-label="Message" placeholder="Message" value={text} rows={3} onChange={(e) => setText(e.target.value)} style={input} />
          {!draft ? (
            <button type="button" disabled={busy || !to || !text} onClick={prepare} style={btn(false)}>Prepare for approval</button>
          ) : (
            <div style={{ padding: 10, borderRadius: 8, background: "var(--raised)", fontSize: 12.5 }}>
              <div>Approve this exact message to <b>{to}</b>:</div>
              <div style={{ margin: "6px 0", color: "var(--t2)", whiteSpace: "pre-wrap" }}>{text}</div>
              <button type="button" disabled={busy} onClick={approveAndSend} style={btn(true)}>Approve and send</button>
              <button type="button" disabled={busy} onClick={() => setDraft(null)} style={{ ...btn(false), marginLeft: 8 }}>Cancel</button>
            </div>
          )}
        </div>
      ) : null}
      {receipt ? <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--green)" }}>Sent. Receipt {receipt.receipt_id}{receipt.replayed ? " (already sent)" : ""}.</div> : null}
      {note ? <div style={{ marginTop: 10, fontSize: 12, color: "var(--red)" }}>{note}</div> : null}
      {messages.length ? (
        <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
          {messages.slice(0, 8).map((m) => (
            <div key={m.id} style={{ fontSize: 12, color: "var(--t2)" }}>
              {m.direction === "inbound" ? "←" : "→"} {m.peer_label || m.peer} · {m.body.slice(0, 80)} · {m.status}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Hermes areas, governed tools, queued runs and their approvals (D-37). */
export function HermesRunsPanel() {
  const [inv, setInv] = useState(null);
  const [runs, setRuns] = useState([]);
  const [areaId, setAreaId] = useState("research");
  const [tool, setTool] = useState("");
  const [args, setArgs] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setInv(await fetchPapershipJson("/hermes/inventory"));
      setRuns((await fetchPapershipJson("/hermes/runs")).items || []);
    } catch (error) {
      setNote(error.message || "Hermes is unavailable.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const area = inv?.areas?.find((a) => a.id === areaId);
  const tools = area?.tools || [];
  const chosen = tools.find((t) => t.name === tool) || tools[0];

  const queue = async () => {
    if (!chosen) return;
    setBusy(true); setNote("");
    try {
      let parsed = {};
      if (args.trim()) {
        try { parsed = JSON.parse(args); } catch { throw new Error("Arguments must be JSON."); }
      }
      await postPapershipJson(`/hermes/inventory/${areaId}/execute`, { tool: chosen.name, arguments: parsed });
      setArgs("");
      await load();
    } catch (error) {
      setNote(error.message || "Could not queue that run.");
    } finally { setBusy(false); }
  };
  const approve = async (run) => {
    setBusy(true); setNote("");
    try {
      await postPapershipJson("/approvals", {
        approval_class: "approval.hermes.tool",
        target_id: run.approval.target_id,
        target_version: run.approval.target_version,
        decision: "approved",
      });
      await load();
    } catch (error) {
      setNote(error.message || "Could not approve.");
    } finally { setBusy(false); }
  };

  if (!inv) return <div style={{ ...card, fontSize: 12.5, color: "var(--t3)" }}>{note || "Loading Hermes areas…"}</div>;
  return (
    <div style={card}>
      <div style={label}>Hermes capabilities · gated</div>
      <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 10 }}>
        Read runs freely. Write runs leave a receipt. External actions need your approval first, then leave a receipt.
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        {inv.areas.map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
            <span>{a.label}</span>
            <span style={{ color: "var(--t3)" }}>{a.status} · {a.live_hermes === "reachable" ? "live" : "worker blocked"}{a.tools.length ? ` · ${a.tools.length} tools` : ""}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select aria-label="Area" value={areaId} onChange={(e) => { setAreaId(e.target.value); setTool(""); }} style={input}>
          {inv.areas.filter((a) => a.tools.length).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <select aria-label="Tool" value={chosen?.name || ""} onChange={(e) => setTool(e.target.value)} style={input}>
          {tools.map((t) => <option key={t.name} value={t.name}>{t.name} · {t.gate.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      <textarea aria-label="Arguments (JSON)" placeholder='Arguments as JSON, e.g. {"query": "…"}' value={args} rows={2} onChange={(e) => setArgs(e.target.value)} style={{ ...input, marginTop: 8 }} />
      <button type="button" disabled={busy || !chosen} onClick={queue} style={{ ...btn(true), marginTop: 8 }}>Queue run</button>
      {note ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)" }}>{note}</div> : null}
      {runs.length ? (
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          {runs.slice(0, 8).map((r) => (
            <div key={r.job_id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
              <span>{r.tool} · {r.state}{r.detail ? ` · ${r.detail}` : ""}</span>
              {r.state === "awaiting_approval" && r.approval?.status === "pending" ? (
                <button type="button" disabled={busy} onClick={() => approve(r)} style={btn(false)}>Approve</button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
