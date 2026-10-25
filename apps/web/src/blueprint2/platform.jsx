import { useCallback, useEffect, useState } from "react";
import { getPapershipJson, postPapershipJson, putPapershipJson } from "../api/papership.js";

export const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 };
export const label = { fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 };
export const input = { boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", font: "400 12.5px Inter,sans-serif" };
export const btn = (primary, danger) => ({
  height: 30, padding: "0 13px", border: primary || danger ? "1px solid transparent" : "1px solid var(--line)",
  background: danger ? "var(--red)" : primary ? "var(--brand)" : "var(--surface)", color: danger ? "#fff" : primary ? "var(--brand-ink)" : "var(--t1)",
  borderRadius: 8, font: "600 12px Inter,sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap",
});
export const mono = { font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" };
export const chip = { padding: "1px 7px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 10.5, color: "var(--t2)", whiteSpace: "nowrap" };
export const linkBtn = { border: 0, background: "transparent", color: "var(--blue)", font: "600 12.5px Inter,sans-serif", cursor: "pointer", padding: 0, textAlign: "left" };

/** Any successful write tells the shell (rail, dock, inspector, status bar) to refresh. */
const announce = (fn) => async (...args) => {
  const out = await fn(...args);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("papership-changed"));
  return out;
};

export const api = { get: getPapershipJson, post: announce(postPapershipJson), put: announce(putPapershipJson) };

/** Integer minor units to a display string. Display only: the API never charges. */
export function money(minor, currency = "AUD") {
  if (minor == null) return "–";
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

export function short(hash) {
  return hash ? `${hash.slice(0, 10)}…` : "–";
}

const STATUS_COLOUR = {
  implemented: "var(--green)", done: "var(--green)", approved: "var(--green)", validated: "var(--green)", completed: "var(--green)", active: "var(--green)",
  simulated: "var(--blue)", demo: "var(--blue)", preview: "var(--blue)", in_progress: "var(--blue)", running: "var(--blue)", open: "var(--blue)", accepted: "var(--blue)",
  awaiting_approval: "var(--amber)", pending: "var(--amber)", delivered: "var(--amber)", planned: "var(--amber)",
  rejected: "var(--red)", cancelled: "var(--t3)", failed: "var(--red)", unsupported: "var(--red)", disabled: "var(--t3)", superseded: "var(--t3)",
  expired: "var(--t3)", declined: "var(--t3)", validation_failed: "var(--red)", unavailable: "var(--t3)",
};

export function Status({ value }) {
  return <span style={{ ...chip, color: STATUS_COLOUR[value] || "var(--t2)", borderColor: STATUS_COLOUR[value] || "var(--line)" }}>{String(value).replace(/_/g, " ")}</span>;
}

export function Banner({ tone = "simulated", children }) {
  const colour = tone === "simulated" ? "var(--blue)" : "var(--amber)";
  return (
    <div role="note" style={{ ...card, background: "var(--raised)", borderLeft: `3px solid ${colour}`, fontSize: 12.5, color: "var(--t2)", lineHeight: 1.55 }}>
      <strong style={{ color: colour, letterSpacing: ".06em", textTransform: "uppercase", fontSize: 11, marginRight: 8 }}>{tone}</strong>
      {children}
    </div>
  );
}

export function Kv({ k, children }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "4px 0", fontSize: 12.5 }}>
      <div style={{ width: 150, flex: "none", color: "var(--t3)" }}>{k}</div>
      <div style={{ color: "var(--t1)", minWidth: 0, overflowWrap: "anywhere" }}>{children}</div>
    </div>
  );
}

export function Stat({ k, v, hint }) {
  return (
    <div style={{ ...card, flex: "1 1 140px" }}>
      <div style={label}>{k}</div>
      <div style={{ font: "600 22px Inter,sans-serif" }}>{v}</div>
      {hint ? <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

export function Empty({ children }) {
  return <div style={{ fontSize: 12.5, color: "var(--t3)", padding: "6px 0" }}>{children}</div>;
}

/** Load one endpoint. `error` carries the API's own explanation, e.g. "exchange is disabled in this deployment". */
export function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api.get(path));
      setError("");
    } catch (e) {
      setError(e.message || "Could not load.");
    } finally {
      setLoading(false);
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading, reload };
}

/** Run a mutating call with one busy flag and one visible message. */
export function useAction(after) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const run = useCallback(async (fn, okNote) => {
    setBusy(true);
    setNote("");
    try {
      const out = await fn();
      if (okNote) setNote(typeof okNote === "function" ? okNote(out) : okNote);
      if (after) await after(out);
      return out;
    } catch (e) {
      setNote(e.message || "That did not complete.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [after]);
  return { busy, note, setNote, run };
}

// ---- cross-product navigation. Selection survives navigation and reload via sessionStorage (links preserved). ----

const FOCUS_KEY = "papership-focus";
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Deep links: #workspace/tasks/<id>, #workspace/agents/<id>, #studio/blueprints/<id> select that record.
const HASH_KINDS = { "workspace/tasks": "task", "workspace/agents": "agent", "studio/blueprints": "blueprint" };

function hashFocus() {
  const [tab, sub, id] = window.location.hash.replace(/^#/, "").split("/");
  const kind = HASH_KINDS[`${tab}/${sub}`];
  let clean = "";
  try { clean = id ? decodeURIComponent(id) : ""; } catch { clean = ""; }
  return kind && /^[A-Za-z0-9_-]{1,80}$/.test(clean) ? { [kind]: clean } : {};
}

function readFocus() {
  let stored = {};
  try { stored = JSON.parse(sessionStorage.getItem(FOCUS_KEY) || "{}"); } catch { /* ignore */ }
  const fromHash = hashFocus();
  if (Object.keys(fromHash).length) {
    stored = { ...stored, ...fromHash };
    try { sessionStorage.setItem(FOCUS_KEY, JSON.stringify(stored)); } catch { /* storage unavailable */ }
  }
  return stored;
}

// The shell rewrites the hash once it has signed in, so capture a deep link as soon as the module loads.
if (typeof window !== "undefined") readFocus();

export function setFocus(kind, id) {
  let stored = {};
  try { stored = JSON.parse(sessionStorage.getItem(FOCUS_KEY) || "{}"); } catch { /* ignore */ }
  try { sessionStorage.setItem(FOCUS_KEY, JSON.stringify({ ...stored, [kind]: id || null })); } catch { /* storage unavailable */ }
  if (!id) {
    const parts = window.location.hash.replace(/^#/, "").split("/");
    if (HASH_KINDS[`${parts[0]}/${parts[1]}`] === kind && parts[2]) window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${parts[0]}/${parts[1]}`);
  }
  window.dispatchEvent(new Event("papership-focus"));
}

export function useFocus(kind) {
  const [id, setId] = useState(() => readFocus()[kind] || null);
  useEffect(() => {
    const on = () => setId(readFocus()[kind] || null);
    window.addEventListener("papership-focus", on);
    window.addEventListener("hashchange", on);
    on();
    return () => {
      window.removeEventListener("papership-focus", on);
      window.removeEventListener("hashchange", on);
    };
  }, [kind]);
  return [id, (next) => setFocus(kind, next)];
}

/** Go to a product page, optionally selecting a record there. The record id is carried in the link. */
export function navigate(tab, sub, kind, id) {
  if (kind) setFocus(kind, id);
  const inHash = kind && id && HASH_KINDS[`${tab}/${slug(sub)}`] === kind;
  const next = `#${tab}${sub ? `/${slug(sub)}` : ""}${inHash ? `/${encodeURIComponent(id)}` : ""}`;
  if (window.location.hash === next) window.dispatchEvent(new Event("hashchange"));
  else window.location.hash = next;
}

export function Link({ to, children }) {
  const [tab, sub, kind, id] = to;
  return <button type="button" onClick={() => navigate(tab, sub, kind, id)} style={linkBtn}>{children}</button>;
}

export function ErrorNote({ error }) {
  return error ? <div role="alert" style={{ ...card, borderColor: "var(--red)", color: "var(--red)", fontSize: 12.5 }}>{error}</div> : null;
}

export function Json({ value, max = 320 }) {
  return <pre style={{ margin: 0, padding: 10, borderRadius: 8, background: "var(--raised)", fontSize: 11.5, whiteSpace: "pre-wrap", maxHeight: max, overflow: "auto" }}>{JSON.stringify(value, null, 2)}</pre>;
}
