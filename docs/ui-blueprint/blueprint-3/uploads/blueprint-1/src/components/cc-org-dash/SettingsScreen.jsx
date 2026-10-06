import { useState, useMemo } from "react";
import { Surface, Btn, Badge, Dot, Avi, Toggle, Modal, Field, Input, Select, Progress, THEMES, F } from "./primitives";
import { DB } from "./data";
import {
  SettingsIcon,
  Bot,
  Bell,
  Lock,
  CreditCard,
  Users,
  Palette,
  Sun,
  Moon,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Zap,
} from "./icons";

/** Documentation tree + page copy (Zep-style layout, cc-org-dash theme) */
const DOC_TREE = [
  {
    id: "concepts",
    label: "Key concepts",
    pages: [
      { id: "key-concepts", title: "Key concepts" },
      { id: "workspaces", title: "Workspaces & orgs" },
    ],
  },
  {
    id: "quickstarts",
    label: "Quickstarts",
    pages: [
      { id: "install", title: "Install & sign-in" },
      { id: "first-workflow", title: "Your first workflow" },
    ],
  },
  {
    id: "tools",
    label: "Developer tools",
    pages: [
      { id: "cli", title: "CLI reference" },
      { id: "webhooks", title: "Webhooks" },
    ],
  },
  {
    id: "context",
    label: "Adding context",
    pages: [
      { id: "files-ingest", title: "Files & data" },
      { id: "integrations", title: "Integrations" },
    ],
  },
];

const DOC_PAGES = {
  "key-concepts": {
    breadcrumb: "Key concepts",
    title: "Key concepts",
    intro:
      "cc-org-dash is a business command center: dashboards, work tracking, files, integrations, and AI agents share one workspace model. Understanding a few ideas upfront makes the rest of the docs easier to follow.",
    callout: {
      text: "Want to ship something today? Start with Install & sign-in, then open Work → Workflows.",
      hrefPage: "install",
    },
    table: [
      { concept: "Workspace", description: "Top-level container for people, data, and billing. Everything you see in the shell belongs to one workspace.", doc: "Workspaces & orgs" },
      { concept: "Command center", description: "The left company command rail plus global agent surface — quick navigation and AI without leaving context.", doc: "Your first workflow" },
      { concept: "Integration", description: "A connected third-party system (CRM, Slack, GitHub) with scoped credentials and sync status.", doc: "Integrations" },
      { concept: "Workflow", description: "A directed graph of triggers, filters, and actions that automate work across systems.", doc: "Your first workflow" },
    ],
  },
  workspaces: {
    breadcrumb: "Workspaces & orgs",
    title: "Workspaces & orgs",
    intro:
      "A workspace maps to your organisation in cc-org-dash. Roles, SSO, and API keys are configured at this level; projects and issues live underneath.",
    callout: { text: "Manage members under Settings → Team.", hrefPage: null },
    table: [
      { concept: "Org slug", description: "Used in URLs and API paths; immutable after creation in production.", doc: "CLI reference" },
      { concept: "Seat", description: "A billable user who can sign in. Guests may be limited to specific apps.", doc: "—" },
    ],
  },
  install: {
    breadcrumb: "Quickstarts",
    title: "Install & sign-in",
    intro: "There is nothing to install for the hosted app: open your workspace URL, sign in with SSO or email, and complete MFA if required.",
    callout: { text: "Developers can use the REST API with an API key from Settings → Security.", hrefPage: "cli" },
    table: [
      { concept: "Browser", description: "Latest Chrome, Firefox, Safari, or Edge.", doc: "—" },
      { concept: "Session", description: "Sessions respect your org timeout policy; refresh tokens rotate automatically.", doc: "Webhooks" },
    ],
  },
  "first-workflow": {
    breadcrumb: "Quickstarts",
    title: "Your first workflow",
    intro: "Open Work → Workflows, pick a template or create an empty workflow, drag nodes on the canvas, and connect edges. Save runs a validation pass.",
    callout: null,
    table: [
      { concept: "Node", description: "Trigger, filter, action, or AI step with typed inputs.", doc: "Key concepts" },
      { concept: "Run", description: "A single execution of the graph with trace logs.", doc: "—" },
    ],
  },
  cli: {
    breadcrumb: "Developer tools",
    title: "CLI reference",
    intro: "The cc-org-dash CLI (demo) wraps common tasks: token rotation, schema export, and workflow bundles.",
    callout: { text: "Prefer HTTP? See Webhooks for event delivery.", hrefPage: "webhooks" },
    table: [
      { concept: "eco login", description: "Device flow against your workspace.", doc: "Install & sign-in" },
      { concept: "eco workflows push", description: "Upload a workflow JSON bundle.", doc: "Your first workflow" },
    ],
  },
  webhooks: {
    breadcrumb: "Developer tools",
    title: "Webhooks",
    intro: "Subscribe to workspace events with signed payloads. Retries use exponential backoff; dead-letter queue is available on Enterprise.",
    callout: null,
    table: [
      { concept: "Signature", description: "HMAC-SHA256 with a workspace secret.", doc: "—" },
      { concept: "Delivery", description: "At-least-once; consumers must be idempotent.", doc: "CLI reference" },
    ],
  },
  "files-ingest": {
    breadcrumb: "Adding context",
    title: "Files & data",
    intro: "Upload files under Files, or connect a warehouse under Data. Access is governed by folder ACLs and row-level rules where enabled.",
    callout: null,
    table: [
      { concept: "Folder ACL", description: "Inherit or override from parent; audit log records changes.", doc: "—" },
      { concept: "Sync job", description: "Scheduled or manual pull from a connector.", doc: "Integrations" },
    ],
  },
  integrations: {
    breadcrumb: "Adding context",
    title: "Integrations",
    intro: "Browse Integrations to connect CRM, chat, code, and observability tools. Marketplace installs provision secrets automatically on Vercel-compatible setups.",
    callout: { text: "Check sync status in the status bar at the bottom of the shell.", hrefPage: "key-concepts" },
    table: [
      { concept: "Connector", description: "Configuration + credentials for one vendor.", doc: "Webhooks" },
      { concept: "Health", description: "Green / degraded / disconnected from last successful sync.", doc: "—" },
    ],
  },
};

export default function SettingsScreen({ T, themeKey, setTheme, isMobile }) {
  const [tab, setTab] = useState("general");
  const [openAIKey, setOpenAIKey] = useState(() => localStorage.getItem("openai_key") || "");
  const [saved, setSaved] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [toggles, setToggles] = useState({ critical: true, warning: true, billing: false, digest: true, deployments: false });
  const [docSuite, setDocSuite] = useState("documentation");
  const [activeDocPage, setActiveDocPage] = useState("key-concepts");
  const [openDocGroups, setOpenDocGroups] = useState(() => new Set(DOC_TREE.map((g) => g.id)));

  const docBody = DOC_PAGES[activeDocPage] ?? DOC_PAGES["key-concepts"];

  const toggleDocGroup = (gid) => {
    setOpenDocGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  };

  const docSuiteTabs = useMemo(
    () => [
      { id: "documentation", label: "Documentation" },
      { id: "api", label: "API reference" },
      { id: "changelog", label: "Changelog" },
    ],
    []
  );

  const save = () => { localStorage.setItem("openai_key", openAIKey); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const settingsTabs = [
    { id: "general",        label: "General",        icon: <SettingsIcon size={16} /> },
    { id: "ai",             label: "AI & Agents",    icon: <Bot size={16} /> },
    { id: "notifications",  label: "Notifications",  icon: <Bell size={16} /> },
    { id: "security",       label: "Security",       icon: <Lock size={16} /> },
    { id: "billing",        label: "Plan & Billing", icon: <CreditCard size={16} /> },
    { id: "team",           label: "Team",           icon: <Users size={16} /> },
    { id: "appearance",     label: "Appearance",     icon: <Palette size={16} /> },
    { id: "docs",           label: "Docs",           icon: <BookOpen size={16} /> },
  ];

  const plans = [
    { id: "starter", name: "Starter", price: "$0", features: ["5 users", "2 AI agents", "10K API calls/mo", "Basic integrations"], current: true },
    { id: "pro", name: "Professional", price: "$49/mo", features: ["25 users", "10 AI agents", "500K API calls/mo", "All integrations", "Priority support", "Custom workflows"], highlight: true },
    { id: "enterprise", name: "Enterprise", price: "Custom", features: ["Unlimited users", "Unlimited agents", "Unlimited API calls", "SSO + SAML", "Dedicated support", "Custom SLAs"], cta: "Contact Sales" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.t1, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>Settings</div>
        <div style={{ color: T.t2, fontSize: 13, marginTop: 2 }}>Manage your organization and preferences</div>
      </div>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 24, alignItems: "flex-start" }}>
        {/* GitHub-style left sidebar nav */}
        <div style={{ width: isMobile ? "100%" : 220, flexShrink: 0, display: isMobile ? "flex" : "block", gap: 4, overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 4 : 0 }}>
          {settingsTabs.map(st => (
            <button key={st.id} type="button" onClick={() => setTab(st.id)}
              style={{
                width: isMobile ? "auto" : "100%", flexShrink: 0,
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", marginBottom: 6, whiteSpace: "nowrap",
                background: tab === st.id ? T.accentBg : "transparent",
                border: tab === st.id ? `1px solid ${T.accentBorder}` : "1px solid transparent",
                borderRadius: 999,
                color: tab === st.id ? T.accent : T.t2,
                fontSize: 14, fontWeight: tab === st.id ? 600 : 500,
                cursor: "pointer", fontFamily: F.sans, textAlign: "left", transition: "all .12s",
              }}
              onMouseEnter={e => tab !== st.id && (e.currentTarget.style.background = T.hover)}
              onMouseLeave={e => tab !== st.id && (e.currentTarget.style.background = "transparent")}>
              <span style={{ display: "flex", color: tab === st.id ? T.accent : T.t3 }}>{st.icon}</span>
              {st.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {tab !== "docs" && (
            <h2 style={{ margin: 0, paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${T.border}`, color: T.t1, fontSize: 20, fontWeight: 600 }}>
              {settingsTabs.find((s) => s.id === tab)?.label}
            </h2>
          )}

          {tab === "docs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  borderBottom: `1px solid ${T.border}`,
                  marginBottom: isMobile ? 14 : 18,
                  paddingBottom: 2,
                }}
              >
                {docSuiteTabs.map((dt) => {
                  const on = docSuite === dt.id;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setDocSuite(dt.id)}
                      style={{
                        padding: "8px 14px 10px",
                        background: "none",
                        border: "none",
                        borderBottom: on ? `2px solid ${T.accent}` : "2px solid transparent",
                        color: on ? T.accent : T.t3,
                        fontSize: 14,
                        fontWeight: on ? 600 : 500,
                        cursor: "pointer",
                        fontFamily: F.sans,
                        marginBottom: -2,
                      }}
                    >
                      {dt.label}
                    </button>
                  );
                })}
              </div>

              {docSuite === "documentation" && (
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 22, alignItems: "flex-start" }}>
                  <nav
                    style={{
                      width: isMobile ? "100%" : 268,
                      flexShrink: 0,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      background: T.surface,
                      overflow: "hidden",
                      alignSelf: "stretch",
                    }}
                  >
                    {DOC_TREE.map((group) => {
                      const expanded = openDocGroups.has(group.id);
                      return (
                        <div key={group.id} style={{ borderBottom: `1px solid ${T.borderMuted ?? T.border}` }}>
                          <button
                            type="button"
                            onClick={() => toggleDocGroup(group.id)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "10px 12px",
                              background: T.raised,
                              border: "none",
                              cursor: "pointer",
                              fontFamily: F.sans,
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.t1,
                              textAlign: "left",
                            }}
                          >
                            <span style={{ display: "flex", color: T.t3 }}>
                              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                            {group.label}
                          </button>
                          {expanded && (
                            <div style={{ padding: "4px 8px 10px" }}>
                              {group.pages.map((p) => {
                                const sel = activeDocPage === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setActiveDocPage(p.id)}
                                    style={{
                                      width: "100%",
                                      textAlign: "left",
                                      padding: "7px 10px 7px 14px",
                                      marginBottom: 2,
                                      borderRadius: 6,
                                      border: "none",
                                      cursor: "pointer",
                                      fontFamily: F.sans,
                                      fontSize: 13,
                                      fontWeight: sel ? 600 : 400,
                                      color: sel ? T.accent : T.t2,
                                      background: sel ? T.accentBg : "transparent",
                                    }}
                                  >
                                    {p.title}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>

                  <article style={{ flex: 1, minWidth: 0, maxWidth: 800 }}>
                    <div style={{ color: T.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                      {docBody.breadcrumb}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                      <h3 style={{ margin: 0, color: T.t1, fontSize: isMobile ? 24 : 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        {docBody.title}
                      </h3>
                      <Btn T={T} variant="default" small>
                        Copy page <ChevronDown size={14} />
                      </Btn>
                    </div>
                    <p style={{ color: T.t2, fontSize: 15, lineHeight: 1.65, margin: "0 0 18px" }}>{docBody.intro}</p>

                    {docBody.callout && (
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          padding: "14px 16px",
                          borderRadius: 8,
                          border: `1px solid ${T.accentBorder}`,
                          background: T.accentBg,
                          marginBottom: 22,
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
                          ★
                        </span>
                        <div style={{ color: T.t1, fontSize: 14, lineHeight: 1.55 }}>
                          {docBody.callout.text}
                          {docBody.callout.hrefPage && (
                            <>
                              {" "}
                              <button
                                type="button"
                                onClick={() => setActiveDocPage(docBody.callout.hrefPage)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  color: T.accent,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: F.sans,
                                  textDecoration: "underline",
                                }}
                              >
                                Open
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.surface }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(120px,1fr) minmax(200px,2fr) minmax(100px,0.8fr)",
                          gap: 0,
                          padding: "10px 14px",
                          background: T.raised,
                          borderBottom: `1px solid ${T.border}`,
                          fontSize: 12,
                          fontWeight: 700,
                          color: T.t2,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <span>Concept</span>
                        <span>Description</span>
                        <span>Docs</span>
                      </div>
                      {docBody.table.map((row, i) => (
                        <div
                          key={i}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(120px,1fr) minmax(200px,2fr) minmax(100px,0.8fr)",
                            gap: 0,
                            padding: "12px 14px",
                            borderBottom: i < docBody.table.length - 1 ? `1px solid ${T.borderMuted ?? T.border}` : "none",
                            fontSize: 14,
                            alignItems: "start",
                          }}
                        >
                          <span style={{ color: T.t1, fontWeight: 600 }}>{row.concept}</span>
                          <span style={{ color: T.t2, lineHeight: 1.5 }}>{row.description}</span>
                          <span>
                            {row.doc !== "—" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const match = Object.entries(DOC_PAGES).find(([, v]) => v.title === row.doc);
                                  if (match) setActiveDocPage(match[0]);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  color: T.accent,
                                  cursor: "pointer",
                                  fontFamily: F.sans,
                                  fontSize: 14,
                                  textDecoration: "underline",
                                  textAlign: "left",
                                }}
                              >
                                {row.doc}
                              </button>
                            ) : (
                              <span style={{ color: T.t4 }}>—</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              )}

              {docSuite === "api" && (
                <Surface T={T} style={{ padding: 24 }}>
                  <div style={{ color: T.t1, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>API reference</div>
                  <p style={{ color: T.t2, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                    OpenAPI 3.1 spec and authenticated examples will live here. Use <span style={{ fontFamily: F.mono, color: T.t1 }}>Settings → Security</span> to issue API keys.
                  </p>
                </Surface>
              )}

              {docSuite === "changelog" && (
                <Surface T={T} style={{ padding: 24 }}>
                  <div style={{ color: T.t1, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Changelog</div>
                  {[
                    { v: "0.4.0", date: "Apr 2026", notes: "Company command rail, workflow canvas, Linear-style work views." },
                    { v: "0.3.0", date: "Mar 2026", notes: "Files refresh, integrations hub, dark theme polish." },
                  ].map((row) => (
                    <div key={row.v} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: T.accent }}>{row.v}</div>
                      <div style={{ color: T.t3, fontSize: 12, marginBottom: 4 }}>{row.date}</div>
                      <div style={{ color: T.t2, fontSize: 14 }}>{row.notes}</div>
                    </div>
                  ))}
                </Surface>
              )}

              <button
                type="button"
                title="Ask AI (demo)"
                style={{
                  position: "fixed",
                  right: isMobile ? 16 : 28,
                  bottom: 72,
                  zIndex: 55,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: `1px solid ${T.accentBorder}`,
                  background: T.accentBg,
                  color: T.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: F.sans,
                  boxShadow: T.shadowMd,
                }}
              >
                <Zap size={16} />
                Ask AI
              </button>
            </div>
          )}

          {tab === "general" && (
            <div style={{ maxWidth: 520 }}>
              <Field label="Organisation Name" T={T}><Input T={T} defaultValue="cc-org-dash Global" /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Timezone" T={T}><Select T={T} style={{ width: "100%" }}>{["Australia/Sydney", "UTC", "America/New_York", "Europe/London"].map(z => <option key={z}>{z}</option>)}</Select></Field>
                <Field label="Currency" T={T}><Select T={T} style={{ width: "100%" }}>{["USD", "AUD", "EUR", "GBP"].map(c => <option key={c}>{c}</option>)}</Select></Field>
              </div>
              <Field label="Default Language" T={T}><Select T={T} style={{ width: "100%" }}><option>English (AU)</option><option>English (US)</option></Select></Field>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <Btn T={T} variant="primary" onClick={save}>{saved ? "✓ Saved" : "Save Changes"}</Btn>
              </div>
            </div>
          )}

          {tab === "appearance" && (
            <div style={{ maxWidth: 520 }}>
              <div style={{ color: T.t1, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Theme mode</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(THEMES).map(([k, th]) => (
                  <button key={k} onClick={() => setTheme(k)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: themeKey === k ? T.accentBg : T.raised, border: `1px solid ${themeKey === k ? T.accentBorder : T.border}`, borderRadius: 8, cursor: "pointer", fontFamily: F.sans, textAlign: "left", transition: "all .12s" }}
                    onMouseEnter={e => themeKey !== k && (e.currentTarget.style.background = T.hover)}
                    onMouseLeave={e => themeKey !== k && (e.currentTarget.style.background = T.raised)}>
                    {th.icon === "sun" ? <Sun size={18} color={T.amber} /> : th.icon === "moon" ? <Moon size={18} color={T.accent} /> : <Palette size={18} color={T.purple} />}
                    <span style={{ color: T.t1, fontSize: 14, fontWeight: themeKey === k ? 600 : 500 }}>{th.name}</span>
                    {themeKey === k && <span style={{ color: T.accent, marginLeft: "auto", fontSize: 12, fontWeight: 600 }}>Active</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div style={{ maxWidth: 520 }}>
              <Field label="OpenAI API Key" T={T} hint="Stored in browser. Required for live agent responses.">
                <Input T={T} type="password" value={openAIKey} onChange={e => setOpenAIKey(e.target.value)} placeholder="sk-..." />
              </Field>
              <Field label="Default Model" T={T}>
                <Select T={T} style={{ width: "100%" }}>{["gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet", "claude-3-haiku"].map(m => <option key={m}>{m}</option>)}</Select>
              </Field>
              <Field label="LangSmith Project" T={T}><Input T={T} defaultValue="cc-org-dash-production" /></Field>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <Btn T={T} variant="primary" onClick={save}>{saved ? "✓ Saved" : "Save"}</Btn>
              </div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                <div style={{ color: T.t1, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Deployed Agents</div>
                {DB.agents.map(ag => (
                  <div key={ag.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                    <Dot status={ag.status} T={T} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: T.t1, fontSize: 13, fontWeight: 500 }}>{ag.name}</div>
                      <div style={{ color: T.t3, fontSize: 11 }}>{ag.model}</div>
                    </div>
                    <Badge T={T} color={{ online: T.green, idle: T.amber, paused: T.t3 }[ag.status]}>{ag.status}</Badge>
                    <Btn T={T} small variant="default">Config</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div style={{ maxWidth: 520 }}>
              {[
                { k: "critical", label: "Critical alerts", sub: "System outages, security incidents" },
                { k: "warning", label: "Warnings", sub: "Degraded services, approaching limits" },
                { k: "billing", label: "Billing", sub: "Invoice due, quota approaching" },
                { k: "digest", label: "Weekly digest", sub: "Summary email every Monday" },
                { k: "deployments", label: "Deployments", sub: "Production deployment events" },
              ].map(item => (
                <div key={item.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ color: T.t1, fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ color: T.t3, fontSize: 12, marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <Toggle T={T} on={toggles[item.k]} onChange={v => setToggles(p => ({ ...p, [item.k]: v }))} />
                </div>
              ))}
            </div>
          )}

          {tab === "security" && (
            <div style={{ maxWidth: 520 }}>
              {[["Two-Factor Auth", "Enabled — TOTP", T.green], ["Single Sign-On", "Google Workspace", T.green], ["Session Timeout", "30 minutes", null], ["Audit Log Retention", "90 days", null], ["IP Allowlist", "3 ranges configured", null]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.t2 }}>{l}</span>
                  {c ? <Badge T={T} color={c}>{v}</Badge> : <span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>}
                </div>
              ))}
              <div style={{ marginTop: 20 }}>
                <div style={{ color: T.t1, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>API Keys</div>
                {[{ name: "Production", key: "eco_prod_••••a4f2", active: true }, { name: "CI/CD", key: "eco_ci_••••b8e1", active: true }, { name: "Test", key: "eco_test_••••f1a0", active: false }].map(k => (
                  <div key={k.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: T.t1, fontSize: 13, fontWeight: 500 }}>{k.name}</div>
                      <div style={{ color: T.t3, fontSize: 11, fontFamily: F.mono }}>{k.key}</div>
                    </div>
                    <Badge T={T} color={k.active ? T.green : T.red}>{k.active ? "active" : "revoked"}</Badge>
                    <Btn T={T} small variant="default">Copy</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "billing" && (
            <div style={{ maxWidth: 560 }}>
              <Surface T={T} style={{ padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div><div style={{ color: T.t1, fontSize: 15, fontWeight: 600 }}>Starter</div><div style={{ color: T.t3, fontSize: 13 }}>Free plan · Resets monthly</div></div>
                  <Btn T={T} variant="primary" onClick={() => setUpgradeModal(true)}>Upgrade plan</Btn>
                </div>
                {[["API Calls", "8,420/10,000", 84], ["Users", "4/5", 80], ["AI Agents", "2/2", 100], ["Storage", "2.4 GB/5 GB", 48]].map(([l, v, p]) => (
                  <div key={l} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: T.t2, fontSize: 12 }}>{l}</span>
                      <span style={{ color: T.t1, fontSize: 12, fontWeight: 600, fontFamily: F.mono }}>{v}</span>
                    </div>
                    <Progress value={p} color={p > 90 ? T.red : p > 75 ? T.amber : T.green} T={T} />
                  </div>
                ))}
              </Surface>
              <Surface T={T} style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, color: T.t1, fontSize: 14, fontWeight: 600, background: T.raised }}>Invoices</div>
                {[["Apr 2026", "$0.00", "paid"], ["Mar 2026", "$0.00", "paid"]].map(([d, a, s]) => (
                  <div key={d} style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: T.t2 }}>{d}</span>
                    <span style={{ color: T.t1, fontFamily: F.mono }}>{a}</span>
                    <Badge T={T} color={T.green}>{s}</Badge>
                    <Btn T={T} small variant="default">Download</Btn>
                  </div>
                ))}
              </Surface>
            </div>
          )}

          {tab === "team" && (
            <div style={{ maxWidth: 520 }}>
              {DB.people.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                  <Avi name={p.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.accent, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: T.t3, fontSize: 12 }}>{p.role} · {p.dept}</div>
                  </div>
                  <Dot status={p.status} T={T} />
                  <Btn T={T} small variant="default">Edit</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal T={T} open={upgradeModal} onClose={() => setUpgradeModal(false)} title="Choose a Plan" width={640}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ border: `1px solid ${plan.highlight ? T.accent : T.border}`, borderRadius: 8, padding: "18px 16px", position: "relative", background: plan.highlight ? T.accentBg : T.raised }}>
              {plan.highlight && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#fff", borderRadius: 99, padding: "2px 12px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Most Popular</div>}
              <div style={{ color: T.t1, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ color: T.accent, fontSize: 22, fontWeight: 700, marginBottom: 14 }}>{plan.price}</div>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                  <span style={{ color: T.green, fontSize: 13, flexShrink: 0 }}>✓</span>
                  <span style={{ color: T.t2, fontSize: 12 }}>{f}</span>
                </div>
              ))}
              <Btn T={T} full variant={plan.current ? "default" : plan.highlight ? "primary" : "default"} style={{ marginTop: 14 }}>
                {plan.current ? "Current Plan" : plan.cta || "Upgrade"}
              </Btn>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}