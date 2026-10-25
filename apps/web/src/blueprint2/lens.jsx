import { useCallback, useEffect, useState } from "react";

/**
 * Role lenses. Each product has its own list of roles. Choosing one changes which components and sub options the
 * left panel reveals for that product. A lens is a view of the menu only: it never changes what the signed-in
 * member may do, and the server enforces access whatever the lens shows.
 */

const KEY = "papership-lens";
const EVT = "papership-lens-changed";

// Menu groups for the three single-tab products. Every sub name is a real view of that product.
const GROUPS = {
  registry: [
    { label: "Find", subs: ["Browse", "Resolve"] },
    { label: "Your materials", subs: ["Installed", "Publish"] },
    { label: "Learn", subs: ["Insights"] },
  ],
  studio: [
    { label: "Design", subs: ["Blueprints", "Builder"] },
    { label: "Verify", subs: ["Evaluations"] },
    { label: "Ship", subs: ["Deployment"] },
  ],
  exchange: [
    { label: "Discover", subs: ["Catalogue"] },
    { label: "Buy", subs: ["Quotes", "Jobs"] },
    { label: "Control", subs: ["Budget & policy"] },
  ],
};

const av = (a, b) => `linear-gradient(135deg,${a},${b})`;

/** Workspace roles list areas as [tab, subs or null for all of that area's views]. */
const WORKSPACE_ROLES = [
  { id: "founder", title: "Founder", code: "OWNER", av: av("#6d28d9", "#a78bfa"), summary: "Every area of the workspace",
    menu: [["workspace", null], ["today", null], ["work", null], ["inbox", null], ["people", null], ["data", null], ["knowledge", null], ["integrations", null], ["files", null], ["loop", null], ["settings", null]] },
  { id: "lead", title: "Project Lead", code: "LEAD", av: av("#0e7490", "#22d3ee"), summary: "Plans, work and knowledge",
    menu: [["workspace", ["Overview", "Agents", "Tasks", "Activity"]], ["today", null], ["work", null], ["inbox", null], ["knowledge", null], ["settings", null]] },
  { id: "dev", title: "Developer", code: "DEV", av: av("#1d4ed8", "#60a5fa"), summary: "Agents, work, traces and integrations",
    menu: [["workspace", ["Agents", "Tasks", "Activity"]], ["work", ["Issues", "Board", "Workflows"]], ["data", ["AI traces", "Events"]], ["integrations", null], ["knowledge", ["Materials"]], ["loop", null]] },
  { id: "hr", title: "People Lead", code: "PEOPLE", av: av("#047857", "#4ade80"), summary: "People, inbox and knowledge",
    menu: [["people", null], ["inbox", null], ["workspace", ["Team & tools"]], ["knowledge", null], ["settings", null]] },
  { id: "finance", title: "Finance Lead", code: "FIN", av: av("#a8560a", "#fbbf24"), summary: "Approvals, metrics and records",
    menu: [["workspace", ["Approvals", "Activity"]], ["data", ["Metrics", "Alerts"]], ["files", null], ["knowledge", ["Objects"]], ["settings", null]] },
  { id: "sales", title: "Head of Sales", code: "SALES", av: av("#c8123f", "#fb7185"), summary: "Inbox, deals and approvals",
    menu: [["inbox", null], ["work", ["Issues", "Board"]], ["workspace", ["Tasks", "Approvals"]], ["knowledge", null]] },
  { id: "ops", title: "Ops Manager", code: "OPS", av: av("#6d28d9", "#22d3ee"), summary: "Tasks, approvals and delivery",
    menu: [["workspace", ["Tasks", "Approvals", "Activity"]], ["work", ["Board", "Workflows"]], ["inbox", null], ["integrations", null], ["data", ["Events", "Alerts"]]] },
];

const R = (id, title, code, summary, subs, a, b) => ({ id, title, code, av: av(a, b), summary, subs });

const ROLES = {
  workspace: WORKSPACE_ROLES,
  registry: [
    R("owner", "Owner / Founder", "OWNER", "Every part of the Registry", ["Browse", "Resolve", "Installed", "Publish", "Insights"], "#6d28d9", "#a78bfa"),
    R("publisher", "Publisher", "PUB", "Publish and measure materials", ["Browse", "Installed", "Publish", "Insights"], "#c8123f", "#fb7185"),
    R("operator", "Agent operator", "OPS", "Find and install for agents", ["Browse", "Resolve", "Installed"], "#1d4ed8", "#60a5fa"),
    R("reviewer", "Reviewer", "REV", "Read, check provenance, watch results", ["Browse", "Installed", "Insights"], "#047857", "#4ade80"),
  ],
  studio: [
    R("owner", "Owner / Founder", "OWNER", "Every part of Studio", ["Blueprints", "Builder", "Evaluations", "Deployment"], "#6d28d9", "#a78bfa"),
    R("builder", "Agent builder", "BUILD", "Design, check and export", ["Blueprints", "Builder", "Evaluations", "Deployment"], "#1d4ed8", "#60a5fa"),
    R("qa", "QA reviewer", "QA", "Read versions and fixture results", ["Blueprints", "Evaluations"], "#047857", "#4ade80"),
    R("operator", "Operator", "OPS", "Use blueprints and see deployment status", ["Blueprints", "Deployment"], "#0e7490", "#22d3ee"),
  ],
  exchange: [
    R("owner", "Owner / Founder", "OWNER", "Every part of Exchange", ["Catalogue", "Quotes", "Jobs", "Budget & policy"], "#6d28d9", "#a78bfa"),
    R("buyer", "Buyer", "BUY", "Find, quote and follow jobs", ["Catalogue", "Quotes", "Jobs"], "#a8560a", "#fbbf24"),
    R("approver", "Approver", "APPR", "Decide spend, watch jobs and budget", ["Quotes", "Jobs", "Budget & policy"], "#c8123f", "#fb7185"),
    R("requester", "Requester", "REQ", "Browse and ask for a quote", ["Catalogue", "Quotes"], "#0e7490", "#22d3ee"),
  ],
};

export const LENS_MODES = Object.keys(ROLES);
const SINGLE_TAB = ["registry", "studio", "exchange"];
/** Which product a tab belongs to: the older company pages sit under Workspace. */
export const modeOf = (tab) => (tab === "home" ? "home" : SINGLE_TAB.includes(tab) ? tab : "workspace");
export const rolesFor = (mode) => ROLES[mode] || [];

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}

/** The chosen lens per product, kept in this browser only. */
export function useLens(mode) {
  const [all, setAll] = useState(readAll);
  useEffect(() => {
    const sync = () => setAll(readAll());
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  const roles = rolesFor(mode);
  const chosen = roles.find((r) => r.id === all[mode]) || roles[0] || null;
  const choose = useCallback((id) => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [mode]: id })); } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVT));
  }, [mode]);
  return { role: chosen, roles, choose };
}

/**
 * The left-panel menu for a product and role: [{ label, tab, subs }]. `pages` maps a tab to its views and
 * `labels` to its display name, both from the app's own navigation table.
 */
export function menuFor(mode, role, pages, labels) {
  if (mode === "workspace") {
    const r = role || WORKSPACE_ROLES[0];
    return r.menu.map(([tab, subs]) => ({
      label: tab === "workspace" ? "Workspace" : labels[tab] || tab,
      tab,
      subs: subs || ((pages[tab] && pages[tab].subs) || []),
    }));
  }
  if (GROUPS[mode]) {
    const allow = role ? new Set(role.subs) : null;
    return GROUPS[mode]
      .map((g) => ({ label: g.label, tab: mode, subs: g.subs.filter((s) => !allow || allow.has(s)) }))
      .filter((g) => g.subs.length);
  }
  return [];
}

/** Home shows every product's full menu, so you can see what each mode contains. */
export function homeMenu(pages, labels) {
  return ["workspace", "registry", "studio", "exchange"].map((m) => ({
    mode: m,
    label: labels[m] || m,
    groups: menuFor(m, rolesFor(m)[0] || null, pages, labels),
  }));
}

/** Icons for each main component. Keyed by tab (Workspace areas) or by group label (the other products). */
export const GROUP_ICON = {
  workspace: "M2.6 2.6h4.6v4.6H2.6zM8.8 2.6h4.6v4.6H8.8zM2.6 8.8h4.6v4.6H2.6zM8.8 8.8h4.6v4.6H8.8z",
  today: "M2.4 6.8 8 2.4l5.6 4.4V13a.6.6 0 0 1-.6.6H3a.6.6 0 0 1-.6-.6z",
  work: "M2.2 5.4h11.6v8H2.2zM5.8 5.4V3.6h4.4v1.8",
  inbox: "M2.2 9.2h3l1 1.9h3.6l1-1.9h3M2.2 9.2l1.9-6h7.8l1.9 6v4.2H2.2z",
  people: "M6.2 7.6a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4M1.9 13.4c0-2.3 1.9-3.5 4.3-3.5s4.3 1.2 4.3 3.5M11 7.2a1.8 1.8 0 1 0 0-3.6M12 9.9c1.4.3 2.2 1.4 2.2 3.5",
  data: "M2.6 13.2V8.4M6.2 13.2V3.6M9.8 13.2V9.8M13.4 13.2V6.2",
  files: "M2.2 4.6A1.4 1.4 0 0 1 3.6 3.2h2.3l1.4 1.8h5.1a1.4 1.4 0 0 1 1.4 1.4v6a1.4 1.4 0 0 1-1.4 1.4H3.6a1.4 1.4 0 0 1-1.4-1.4z",
  integrations: "M6 2.4v3M10 2.4v3M4.6 5.4h6.8v3.7a3.4 3.4 0 0 1-6.8 0zM8 12.2v1.6",
  knowledge: "M4 2.4h5.6L12 4.8v8.8H4zM9.4 2.6v2.4h2.4M6 8h4M6 10.4h4",
  loop: "M13 8a5 5 0 1 1-1.6-3.7M13 2.6v2.8h-2.8",
  Find: "M7.2 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4M10.4 10.4l3.2 3.2",
  "Your materials": "M8 2.2 13.4 5v6L8 13.8 2.6 11V5zM2.6 5 8 7.8 13.4 5M8 7.8v6",
  Learn: "M2.6 13.2V8.4M6.2 13.2V3.6M9.8 13.2V9.8M13.4 13.2V6.2",
  Design: "M3 13l.8-3L11 2.8 13.2 5 6 12.2zM9.6 4.2l2.2 2.2",
  Verify: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12M5.4 8.2 7.2 10l3.4-3.8",
  Ship: "M8 13V3.2M4 7l4-3.8L12 7M3.4 13.6h9.2",
  Discover: "M8 13.6A5.6 5.6 0 1 0 8 2.4a5.6 5.6 0 0 0 0 11.2M10.4 5.6 9 9 5.6 10.4 7 7z",
  Buy: "M2.4 3h1.8l1.4 6.6h6.4l1.2-4.6H5M6.4 12.6h.01M11.2 12.6h.01",
  Control: "M3 5h10M3 11h10M6 3.4v3.2M10 9.4v3.2",
};

/** Shorter strip captions where the group name would not fit under an icon. */
export const STRIP_LABEL = { "Your materials": "Materials", Integrations: "Integrate" };
