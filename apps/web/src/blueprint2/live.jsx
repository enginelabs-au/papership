import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getPapershipJson } from "../api/papership.js";

/**
 * One shared, read-only view of the organisation for the shell: context, flags, agents, tasks, approvals,
 * blueprints, Exchange quotes and jobs, and recent activity. Each product page still loads and writes its own
 * data. Any successful write (see `api` in platform.jsx) dispatches `papership-changed`, which refreshes this.
 * An endpoint that fails (for example a disabled product) only empties its own slice.
 */

const LiveContext = createContext(null);

const SOURCES = {
  ctx: "/platform/context",
  caps: "/platform/capabilities",
  overview: "/workspace/overview",
  agents: "/workspace/agents",
  tasks: "/workspace/tasks",
  approvals: "/workspace/approvals",
  blueprints: "/studio/blueprints",
  quotes: "/exchange/quotes",
  jobs: "/exchange/jobs",
  activity: "/workspace/activity?limit=80",
};

const items = (x) => (x && Array.isArray(x.items) ? x.items : []);

export function LiveProvider({ enabled, children }) {
  const [state, setState] = useState({ loaded: false, errors: {}, raw: {} });
  const timer = useRef(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const entries = await Promise.all(Object.entries(SOURCES).map(async ([k, path]) => {
      try { return [k, await getPapershipJson(path), ""]; } catch (e) { return [k, null, e.message || "unavailable"]; }
    }));
    const raw = {};
    const errors = {};
    for (const [k, v, err] of entries) { raw[k] = v; if (err) errors[k] = err; }
    setState({ loaded: true, errors, raw });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    reload();
    const poll = () => { if (document.visibilityState !== "hidden") reload(); };
    timer.current = setInterval(poll, 15000);
    const onChange = () => { clearTimeout(onChange.t); onChange.t = setTimeout(reload, 150); };
    window.addEventListener("papership-changed", onChange);
    return () => {
      clearInterval(timer.current);
      clearTimeout(onChange.t);
      window.removeEventListener("papership-changed", onChange);
    };
  }, [enabled, reload]);

  const value = useMemo(() => {
    const r = state.raw;
    const approvals = items(r.approvals);
    return {
      loaded: state.loaded,
      errors: state.errors,
      reload,
      ctx: r.ctx || null,
      caps: r.caps || null,
      overview: r.overview || null,
      agents: items(r.agents),
      tasks: items(r.tasks),
      approvals,
      pending: approvals.filter((a) => a.status === "pending"),
      blueprints: items(r.blueprints),
      quotes: items(r.quotes),
      jobs: items(r.jobs),
      activity: items(r.activity),
      exchangeBudget: r.overview ? r.overview.exchange : null,
    };
  }, [state, reload]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

const EMPTY = {
  loaded: false, errors: {}, reload: () => {}, ctx: null, caps: null, overview: null, agents: [], tasks: [], approvals: [], pending: [],
  blueprints: [], quotes: [], jobs: [], activity: [], exchangeBudget: null,
};

export function useLive() {
  return useContext(LiveContext) || EMPTY;
}

export const TERMINAL_TASK = ["done", "cancelled"];
export const OPEN_JOB = ["accepted", "running", "delivered"];

export function ago(iso) {
  const t = Date.parse(iso || "");
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export const approvalTitle = (a) => (a.kind === "crm.update_contact"
  ? `Update CRM contact${a.payload && a.payload.contact_name ? `: ${a.payload.contact_name}` : ""}`
  : "Accept Exchange quote");
