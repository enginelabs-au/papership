import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, applyPapershipOverlay, clearStoredSession, coalesceEngineLabsLoop, ensureLocalSession, loadPapershipOverlay, postPapershipJson, recordOqG2, requestErasure, startEngineLabsJob, advanceEngineLabsLoopStage, fetchEngineLabsLoopState, ENGINE_LABS_PROJECT_ID, syncOfflineQueue, wipeOfflineQueue } from "../api/papership";
import { PRODUCT } from "../brand";
import { useIsMobile } from "../hooks/use-mobile";
import "./blueprint2.css";
import { Ico, PATHS, SearchIco } from "./svg";
import {
  AccountView,
  ConnectionsView,
  DataView,
  FilesView,
  InboxView,
  InvitesView,
  MemoryView,
  PageHead,
  PeopleView,
  Registry,
  RunDetailView,
  SettingsView,
  SubNav,
  TeamsView,
  TodayDecisions,
  TodayOverview,
  TodayRunning,
  WorkBoard,
  WorkIssues,
  WorkItemView,
  WorkProjects,
  WorkRoadmap,
  WorkWiki,
  WorkWorkflows,
} from "./screens";

const AUTH_KEY = "papership-auth";
const THEME_KEY = "papership-theme";
const LEGACY_AUTH_KEY = "cc-org-dash-auth";
const LEGACY_THEME_KEY = "cc-org-dash-theme";

function migrateStored(primary, legacy) {
  try {
    const current = localStorage.getItem(primary) || sessionStorage.getItem(primary);
    if (current) return current;
    const fromLocal = localStorage.getItem(legacy);
    if (fromLocal) {
      localStorage.setItem(primary, fromLocal);
      return fromLocal;
    }
    const fromSession = sessionStorage.getItem(legacy);
    if (fromSession) {
      sessionStorage.setItem(primary, fromSession);
      return fromSession;
    }
  } catch {
    /* ignore */
  }
  return null;
}
const DOTS = { ok: "var(--green)", warn: "var(--amber)", bad: "var(--red)", idle: "var(--t3)", run: "var(--blue)" };
const TABDEF = {
  today: { label: "Today", d: PATHS.today },
  work: { label: "Work", d: PATHS.work },
  inbox: { label: "Inbox", d: PATHS.inbox },
  people: { label: "People", d: PATHS.people },
  data: { label: "Data", d: PATHS.data },
  files: { label: "Files", d: PATHS.files },
  integrations: { label: "Integrations", d: PATHS.plug },
  settings: { label: "Settings", d: PATHS.settings },
};
const TAB_KEYS = ["today", "work", "inbox", "people", "data", "files", "integrations", "settings"];
const BOTTOM_TABS = ["today", "work", "inbox"];
const RAIL_TABS = ["people", "data", "files", "integrations", "settings"];
const NARROW_PX = 768;
const PAGES = {
  today: { t: "Today", d: "Command room — what needs you now (blueprint-3 tiles on blueprint-2 chrome)", subs: ["Overview", "Decisions", "Running", "Registry"], counts: { Decisions: "2", Running: "3" } },
  work: { t: "Work", d: "Plans, assignments and the development loop — the native work ledger", subs: ["Projects", "Issues", "Board", "Roadmap", "Workflows", "Wiki"] },
  inbox: { t: "Inbox", d: "Ticketed conversations across connected channels", subs: ["All", "Mentions", "Starred", "Archived"], counts: { All: "4" } },
  people: { t: "People", d: "Seats, teams and invitations", subs: ["People", "Teams", "Pending invites"] },
  data: { t: "Data", d: "Run traces, canonical metrics and platform health — not a BI product", subs: ["Metrics", "AI traces", "Events", "Alerts"] },
  files: { t: "Files", d: "Document intake, plans, decisions and handover", subs: [] },
  integrations: { t: "Integrations", d: "Connected systems, grants and the capability registry", subs: ["Connected", "Available", "Unavailable"] },
  settings: { t: "Settings", d: "Organisation defaults, grants, retention and appearance", subs: [] },
};
const DFLT = { today: "Overview", work: "Issues", inbox: "All", people: "People", data: "AI traces", integrations: "Connected" };
const SETTINGS_PANES = ["General", "AI & Agents", "Notifications", "Security", "Permissions", "Plan", "Team", "Appearance", "Data & retention", "Personalisation", "Docs"];
const navBtn = { width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(196,181,253,.34)", background: "rgba(255,255,255,.06)", borderRadius: 8, color: "var(--navink)", cursor: "pointer" };

function toSlug(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashFromNav(tab, subMap, setPane) {
  if (!tab || !PAGES[tab]) return "#today/overview";
  if (tab === "settings") return `#settings/${toSlug(setPane || "Plan")}`;
  if (tab === "files") return "#files";
  const cur = subMap[tab] || DFLT[tab];
  return cur ? `#${tab}/${toSlug(cur)}` : `#${tab}`;
}

function parseNavHash(raw) {
  const body = String(raw || "").replace(/^#/, "").trim();
  if (!body) return null;
  const [tabRaw, detailRaw = ""] = body.split("/");
  const tab = tabRaw.toLowerCase();
  if (!PAGES[tab]) return null;
  const detail = detailRaw.toLowerCase();
  if (tab === "settings") {
    const pane = SETTINGS_PANES.find((p) => toSlug(p) === detail) || "Plan";
    return { tab, setPane: pane, sub: null };
  }
  if (tab === "files") return { tab, setPane: null, sub: null };
  const page = PAGES[tab];
  const sub = page.subs.find((s) => toSlug(s) === detail) || DFLT[tab] || page.subs[0] || null;
  return { tab, setPane: null, sub };
}

function readAuth() {
  try {
    const raw = migrateStored(AUTH_KEY, LEGACY_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Auth({ theme, cycleTheme, onSignIn }) {
  const [email, setEmail] = useState("founder@enginelabs.com.au");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [bioNote, setBioNote] = useState(false);
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--wash)", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(900px 420px at 50% -10%,rgba(109,40,217,.16),transparent 70%)" }} />
      <div className="bp2-auth-card" style={{ position: "relative", width: 400, maxWidth: "calc(100% - 40px)", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.2px" }}>{PRODUCT.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--t3)" }}>by {PRODUCT.company}</div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(false);
            onSignIn({ email: email.trim() || "founder@enginelabs.com.au", name: "Cam Douglas" });
          }}
          style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow)", padding: "22px 20px", display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sign in</div>
          {error ? (
            <div style={{ display: "flex", gap: 8, padding: "9px 10px", borderRadius: 8, background: "var(--red-soft)", border: "1px solid var(--red)", fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", marginTop: 5, flex: "none" }} />
              That email and password don’t match. Check them and try again.
            </div>
          ) : null}
          <div className="bp2-bio">
            <button type="button" onClick={() => setBioNote(true)} style={{ border: "1px solid var(--line)", background: "var(--canvas)", color: "var(--t1)", borderRadius: 8, font: "600 12.5px Inter,sans-serif", cursor: "pointer" }}>Face ID</button>
            <button type="button" onClick={() => setBioNote(true)} style={{ border: "1px solid var(--line)", background: "var(--canvas)", color: "var(--t1)", borderRadius: 8, font: "600 12.5px Inter,sans-serif", cursor: "pointer" }}>Fingerprint</button>
          </div>
          {bioNote ? (
            <div style={{ fontSize: 11.5, color: "var(--t3)" }}>Use email and password in this browser. Face ID and fingerprint are for the installed app.</div>
          ) : null}
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)" }}>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 34, border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", padding: "0 10px", font: "400 13px Inter,sans-serif" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)" }}>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ height: 34, border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", padding: "0 10px", font: "400 13px Inter,sans-serif" }} />
          </label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--t3)" }}><input type="checkbox" defaultChecked style={{ accentColor: "var(--blue)" }} /> Keep me signed in</label>
            <a href="#forgot" onClick={(e) => e.preventDefault()} style={{ fontSize: 12 }}>Forgot password?</a>
          </div>
          <button type="submit" className="bp2-hit" style={{ height: 34, border: 0, borderRadius: 6, background: "var(--blue)", color: "#fff", font: "600 13px Inter,sans-serif", cursor: "pointer" }}>Continue</button>
          <div style={{ fontSize: 11.5, color: "var(--t3)", textAlign: "center" }}>Local founder continue — email and password are ignored. Leave them blank if you want.</div>
        </form>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--t3)" }}>
          <span>English (Australia)</span>
          <button type="button" onClick={cycleTheme} style={{ border: "1px solid var(--line)", background: "transparent", color: "var(--t3)", borderRadius: 6, height: 26, padding: "0 10px", font: "500 11.5px Inter,sans-serif", cursor: "pointer" }}>Theme: {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Dimmed"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Blueprint2App() {
  const [theme, setTheme] = useState(() => migrateStored(THEME_KEY, LEGACY_THEME_KEY) || "light");
  const [authed, setAuthed] = useState(() => !!readAuth());
  const [tab, setTab] = useState("today");
  const [sub, setSub] = useState({});
  const isMobile = useIsMobile();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [railOpen, setRailOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= NARROW_PX);
  const [plansOpen, setPlansOpen] = useState(true);
  const [hey, setHey] = useState(false);
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [slide, setSlide] = useState(null);
  const [modal, setModal] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [route, setRoute] = useState(null);
  const [setPane, setSetPane] = useState("Permissions");
  const [streaming, setStreaming] = useState(true);
  const [grants, setGrants] = useState({ branch: true, change: true, check: true, release: false });
  const [overlay, setOverlay] = useState({ source: "loading", people: [], teams: [], threads: [], connections: [], measurement: null });
  const [wizardPick, setWizardPick] = useState("gmail");
  const [wizardError, setWizardError] = useState("");
  const [oauthNote, setOauthNote] = useState("");
  const [loopActionBusy, setLoopActionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPapershipOverlay().then((next) => {
      if (!cancelled) setOverlay(next);
    });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const applyNavHash = useCallback((raw) => {
    const parsed = parseNavHash(raw);
    if (!parsed) return;
    setTab(parsed.tab);
    setRoute(null);
    if (parsed.setPane) setSetPane(parsed.setPane);
    if (parsed.sub) setSub((s) => ({ ...s, [parsed.tab]: parsed.sub }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !authed) return;
    applyNavHash(window.location.hash);
    const onHash = () => applyNavHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [authed, applyNavHash]);

  useEffect(() => {
    if (typeof window === "undefined" || !authed) return;
    const next = hashFromNav(tab, sub, setPane);
    if (window.location.hash !== next) {
      window.history.replaceState({}, "", `${window.location.pathname || "/papership"}${next}`);
    }
  }, [authed, tab, sub, setPane]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("oauth");
    if (!provider) return;
    const result = params.get("result");
    const reason = params.get("reason") || "";
    setTab("integrations");
    setWizardPick(provider);
    if (result === "ok") {
      setOauthNote(`${provider} connected. Send stays approval-then-receipt.`);
    } else if (reason === "missing_secret") {
      setOauthNote(`${provider} returned here, but the client secret is not on the API host. Add it to connectors.env, restart the API, and retry Set up.`);
    } else {
      setOauthNote(`${provider} authorisation failed${reason ? ` (${reason})` : ""}. Retry Set up from Integrations.`);
    }
    loadPapershipOverlay().then(setOverlay);
    const path = window.location.pathname || "/papership";
    window.history.replaceState({}, "", `${path}#integrations/connected`);
  }, []);

  const openWizard = useCallback((provider) => {
    if (provider) setWizardPick(provider);
    setWizardError("");
    setModal("wizard");
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : t === "dark" ? "dimmed" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      else if (e.key === "Escape") {
        setPalette(false); setDrawer(false); setSlide(null); setModal(null); setCreateOpen(false); setAvatarOpen(false);
        if (window.innerWidth < NARROW_PX) { setRailOpen(false); setHey(false); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (isMobile) setRailOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      syncOfflineQueue();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const closeMobileChrome = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < NARROW_PX) setRailOpen(false);
  }, []);

  const go = useCallback((k) => () => {
    setTab(k);
    setRoute(null);
    setPalette(false);
    setHey(false);
    closeMobileChrome();
  }, [closeMobileChrome]);
  const setSubTab = useCallback((t, k) => () => { setSub((s) => ({ ...s, [t]: k })); setRoute(null); }, []);
  const goSeat = useCallback(() => {
    setTab("settings");
    setSetPane("Plan");
    setRoute(null);
    setPalette(false);
    setHey(false);
    closeMobileChrome();
  }, [closeMobileChrome]);
  const goWorkflows = useCallback(() => {
    setTab("work");
    setSub((s) => ({ ...s, work: "Workflows" }));
    setRoute(null);
    setPalette(false);
    setHey(false);
    closeMobileChrome();
  }, [closeMobileChrome]);
  const goDomains = useCallback(() => {
    setTab("today");
    setSub((s) => ({ ...s, today: "Registry" }));
    setRoute(null);
    setPalette(false);
    setHey(false);
    closeMobileChrome();
  }, [closeMobileChrome]);
  const goDecisions = useCallback(() => {
    setTab("today");
    setSub((s) => ({ ...s, today: "Decisions" }));
    setRoute(null);
    setPalette(false);
    setHey(false);
    closeMobileChrome();
  }, [closeMobileChrome]);
  const openSlide = useCallback((s) => () => setSlide(s), []);
  const routeTo = useCallback((r) => () => { setRoute(r); setPalette(false); }, []);

  const v = useMemo(() => {
    const dark = theme !== "light";
    const cur = sub[tab] || DFLT[tab];
    const page = PAGES[tab] || PAGES.today;
    const S = (label, meta, dot, body) => ({ label, meta, dot: DOTS[dot] || dot, open: openSlide({ title: label, meta, body }) });
    const out = {
      theme, heyStripBg: dark ? "#16081f" : "#2c1050",
      narrow: isMobile,
      openHey: () => setHey(true),
      goWork: go("work"),
      goSeat,
      goWorkflows,
      goDomains,
      goDecisions,
      modes: ["Ask", "Analyse", "Plan", "Draft", "Execute", "Review", "Automate"].map((m) => {
        const on = m === "Ask"; const off = m === "Automate";
        return { label: off ? "Automate · coming later" : m, cursor: off ? "not-allowed" : "pointer", bg: on ? "var(--blue-soft)" : "transparent", bd: on ? "var(--blue)" : "var(--line)", ink: off ? "var(--t3)" : on ? "var(--blue)" : "var(--t2)" };
      }),
      healthStamp: "not captured",
      kpis: [
        { label: "API", state: "not captured", dot: DOTS.idle, detail: "first-baseline", checked: "—" },
        { label: "Workers · Hermes", state: "not captured", dot: DOTS.idle, detail: "first-baseline", checked: "—" },
        { label: "Database", state: "not captured", dot: DOTS.idle, detail: "first-baseline", checked: "—" },
        { label: "Bound repository", state: "not captured", dot: DOTS.idle, detail: "first-baseline", checked: "—" },
      ],
    };
    out.priorities = [
      { title: "Phase 2 development loop", meta: "Platform · Cam Douglas · due 30 Sep", pct: 68, pctw: "68%", dot: DOTS.ok, open: routeTo({ kind: "work-item" }) },
      { title: "T2-1 interception hardening", meta: "Platform · Cam Douglas · due 24 Sep", pct: 41, pctw: "41%", dot: DOTS.warn, open: routeTo({ kind: "work-item" }) },
      { title: "Document intake for Release 1", meta: "Knowledge · Cam Douglas · due 22 Sep", pct: 84, pctw: "84%", dot: DOTS.ok, open: routeTo({ kind: "work-item" }) },
      { title: "Capability registry coverage", meta: "Governance · Cam Douglas · no due date", pct: 22, pctw: "22%", dot: DOTS.idle, open: routeTo({ kind: "work-item" }) },
    ];
    const dec = [
      { action: "Open a dry-run pull request", target: "GitHub · Papership · change/cco-245-interception", version: "rev 8f3c1ad", when: "14:26 today", dot: DOTS.run, changed: false, why: "The agent finished an isolated change for CCO-245 and wants to raise a pull request for review. No release grant is involved — this stops at review.", evidence: ["CCO-245", "run_7f21c"] },
      { action: "Widen web research scope to vendor documentation", target: "Connection · Web research", version: "policy v12", when: "11:04 today", dot: DOTS.warn, changed: true, why: "A plan step needs documentation from two vendor domains that sit outside the current allow-list.", evidence: ["plan_0091"] },
    ];
    const mk = (d) => ({ ...d, approve: () => setModal("approve"), reject: () => setModal("reject"), view: routeTo({ kind: "run" }) });
    out.decisions = dec.map(mk);
    out.decisionsLong = dec.map(mk);
    out.runs = [
      { id: "run_7f21c", purpose: "Isolated change for CCO-245 interception", item: "CCO-245", mode: "Execute", status: "Running", dot: DOTS.run, elapsed: "12m 04s", band: "Medium (est.)", open: routeTo({ kind: "run" }) },
      { id: "run_7f1a9", purpose: "Research vendor docs for T2-1", item: "CCO-231", mode: "Analyse", status: "Waiting", dot: DOTS.warn, elapsed: "41m 18s", band: "Low (est.)", open: routeTo({ kind: "run" }) },
      { id: "run_7ef44", purpose: "Draft handover note for Release 1", item: "CCO-198", mode: "Draft", status: "Running", dot: DOTS.run, elapsed: "02m 51s", band: "Low (est.)", open: routeTo({ kind: "run" }) },
    ];
    out.runsAll = [
      ...out.runs.map((r, i) => ({ ...r, started: ["14:29", "14:00", "14:38"][i] })),
      { id: "run_7f0b2", purpose: "Analyse interception coverage gaps", item: "CCO-245", mode: "Analyse", status: "Completed", dot: DOTS.ok, started: "13:41", elapsed: "06m 31s", band: "Low (actual)", open: routeTo({ kind: "run" }) },
      { id: "run_7ee91", purpose: "Plan the T2-1 hardening steps", item: "CCO-231", mode: "Plan", status: "Completed", dot: DOTS.ok, started: "11:12", elapsed: "03m 12s", band: "Low (actual)", open: routeTo({ kind: "run" }) },
      { id: "run_7ed30", purpose: "Verify web research allow-list", item: "CCO-231", mode: "Review", status: "Failed", dot: DOTS.bad, started: "09:52", elapsed: "00m 48s", band: "Low (actual)", open: routeTo({ kind: "run" }) },
    ];
    const RB = ["Strategy, goals, KPIs, initiatives, board", "Organisation, entities, teams, reporting lines", "People, HR, leave, payroll references", "CRM, accounts, opportunities, consent", "Enquiries, proposals, contracts, signatures", "Plans, milestones, dependencies, acceptance", "Priorities, assignments, blockers, approvals", "Development loop — isolated change, review, release proposal", "Operations, SOPs, work orders, SLAs", "Support tickets, adoption, retention", "Knowledge, decisions, evidence, document intake", "Comms — email, chat, calendar, transcripts", "Finance, invoices, budgets (source system)", "Treasury, payments (designated authority + reauth)", "Procurement, vendors, subscriptions", "Marketing, campaigns, publishing", "Legal, risk, compliance, privacy requests", "IT, devices, access, cloud", "Inventory, facilities", "Field, dispatch, offline capture", "Quality, BOM, inspections", "Research, experiments, IP", "Guests, partners, scoped review", "Sector packs — care, grants, education"];
    const RP = ["Agent record — sponsor, skills, budget, status", "Identity, membership, seats", "Hey Papership, modes, persisted sessions", "Runs, steps, receipts, pause / cancel / recover", "Durable jobs — close never cancels", "Capability registry and connector catalogue", "Sync, lineage, freshness", "Canonical metrics and deterministic reports", "Governed memory", "Grants — row, field and action control", "Retention, export, erasure", "Secrets off desktop, isolated workers", "Audit and provenance", "Outcome metrics — completion, correctness, recovery", "Usage events (no published prices)", "Desktop shell and locale en-AU", "Adaptive views — pin, undo, reset, fallback", "Health, queues, backups", "Connector SDK and domain packs"];
    const chip = (s) => (s === "working" ? { bg: "var(--green-soft)", ink: "var(--green)", dot: "var(--green)", action: "Open" } : s === "configured" ? { bg: "var(--blue-soft)", ink: "var(--blue)", dot: "var(--blue)", action: "Review" } : s === "unavailable" ? { bg: "var(--red-soft)", ink: "var(--red)", dot: "var(--red)", action: "Recover" } : { bg: "var(--line2)", ink: "var(--t3)", dot: "var(--t3)", action: "Plan" });
    const row = (pfx, i, label, w, c, u) => {
      const s = w.includes(i) ? "working" : c.includes(i) ? "configured" : u.includes(i) ? "unavailable" : "planned";
      return { code: pfx + String(i + 1).padStart(2, "0"), label, status: s, ...chip(s) };
    };
    const bRows = RB.map((l, i) => row("B", i, l, [5, 6, 7, 10], [0, 16], [11]));
    const pRows = RP.map((l, i) => row("P", i, l, [0, 1, 2, 3, 4, 5, 9, 12, 15, 17], [6, 10, 14], []));
    out.registrySections = [{ title: "Business domains", range: "B01–B24 · 24 groups", rows: bRows }, { title: "Platform domains", range: "P01–P19 · 19 groups", rows: pRows }];
    const all = bRows.concat(pRows);
    const cnt = (s) => String(all.filter((r) => r.status === s).length);
    out.registryFilters = [
      { label: "All", n: "43", dot: "var(--t3)", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)" },
      { label: "Working", n: cnt("working"), dot: "var(--green)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
      { label: "Configured", n: cnt("configured"), dot: "var(--blue)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
      { label: "Planned", n: cnt("planned"), dot: "var(--t3)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
      { label: "Unavailable", n: cnt("unavailable"), dot: "var(--red)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
    ];
    out.projects = [
      { name: "Phase 2 development loop", key: "PLAN-014", dept: "Platform", status: "on_track", dot: DOTS.ok, priority: "Highest", pct: 68, pctw: "68%", due: "30 Sep", open: routeTo({ kind: "work-item" }) },
      { name: "T2-1 interception hardening", key: "PLAN-019", dept: "Platform", status: "at_risk", dot: DOTS.warn, priority: "High", pct: 41, pctw: "41%", due: "24 Sep", open: routeTo({ kind: "work-item" }) },
      { name: "Document intake", key: "PLAN-011", dept: "Knowledge", status: "on_track", dot: DOTS.ok, priority: "High", pct: 84, pctw: "84%", due: "22 Sep", open: routeTo({ kind: "work-item" }) },
      { name: "Grants matrix v3", key: "PLAN-022", dept: "Governance", status: "planning", dot: DOTS.idle, priority: "Medium", pct: 12, pctw: "12%", due: "18 Oct", open: routeTo({ kind: "work-item" }) },
      { name: "Capability registry coverage", key: "PLAN-007", dept: "Governance", status: "planning", dot: DOTS.idle, priority: "Medium", pct: 22, pctw: "22%", due: "—", open: routeTo({ kind: "work-item" }) },
    ];
    const issue = (key, title, labels, due, dot) => ({ key, title, labels, due, dot, rowBg: "transparent", open: routeTo({ kind: "work-item" }) });
    out.issueGroups = [
      { label: "In progress", dot: DOTS.run, count: "3", rows: [issue("CCO-245", "Interception hardening for T2-1", ["loop", "stage 6"], "24 Sep", DOTS.run), issue("CCO-244", "Receipts render plain-language summaries", ["runs"], "25 Sep", DOTS.run), issue("CCO-238", "Status bar keeps last 80 events offline", ["shell"], "26 Sep", DOTS.run)] },
      { label: "Review", dot: DOTS.warn, count: "2", rows: [issue("CCO-231", "Web research allow-list needs vendor domains", ["connections"], "23 Sep", DOTS.warn), issue("CCO-229", "Approval card shows target version", ["approvals"], "22 Sep", DOTS.warn)] },
      { label: "To do", dot: DOTS.idle, count: "4", rows: [issue("CCO-251", "Release grant reauth modal copy", ["governance"], "02 Oct", DOTS.idle), issue("CCO-250", "Registry list virtualises at 43 groups", ["registry"], "04 Oct", DOTS.idle)] },
    ];
    const card = (key, title, label, running) => ({ key, title, label, running, open: routeTo({ kind: "work-item" }) });
    out.board = [
      { label: "To do", dot: DOTS.idle, n: "4", cards: [card("CCO-251", "Release grant reauth modal copy", "governance", false), card("CCO-250", "Registry list virtualises at 43 groups", "registry", false)] },
      { label: "In progress", dot: DOTS.run, n: "3", cards: [card("CCO-245", "Interception hardening for T2-1", "loop", true), card("CCO-244", "Receipts render plain-language summaries", "runs", true)] },
      { label: "Review", dot: DOTS.warn, n: "2", cards: [card("CCO-231", "Web research allow-list needs vendor domains", "connections", false)] },
      { label: "Done", dot: DOTS.ok, n: "9", cards: [card("CCO-222", "Close never cancels cloud work", "platform", false)] },
    ];
    out.quarters = ["Q3 2026", "Q4 2026", "Q1 2027", "Q2 2027"];
    out.roadmap = [
      { name: "Release 1 — Founder desktop", meta: "PLAN-014 · 9 milestones", w: "82%", pct: 72, bar: "var(--green-soft)", ink: "var(--green)" },
      { name: "Release 2 — Collaboration", meta: "PLAN-020 · 6 milestones", w: "88%", pct: 18, bar: "var(--amber-soft)", ink: "var(--amber)" },
      { name: "Release 3 — Memory & adaptation", meta: "PLAN-024 · specified", w: "76%", pct: 4, bar: "var(--blue-soft)", ink: "var(--blue)" },
      { name: "Release 4 — Mobile clients", meta: "PLAN-026 · planned", w: "64%", pct: 0, bar: "var(--line2)", ink: "var(--t2)" },
    ];
    out.nodeLibrary = [{ label: "request", bg: "var(--blue-soft)" }, { label: "research", bg: "var(--green-soft)" }, { label: "specification", bg: "var(--blue-soft)" }, { label: "plan", bg: "var(--amber-soft)" }, { label: "assignment", bg: "var(--raised)" }, { label: "isolated_change", bg: "var(--blue-soft)" }, { label: "tests", bg: "var(--amber-soft)" }, { label: "review", bg: "var(--red-soft)" }, { label: "release_proposal", bg: "var(--raised)" }, { label: "monitoring", bg: "var(--green-soft)" }, { label: "retained_knowledge", bg: "var(--raised)" }];
    const stageMeta = {
      request: "Founder request · queued",
      research: "Gather context",
      specification: "Write the brief",
      plan: "Break into work",
      assignment: "Sponsor + agent",
      isolated_change: "Branch only · never main",
      tests: "Evidence required",
      review: "Human approval",
      release_proposal: "Proposal only",
      monitoring: "Watch the release",
      retained_knowledge: "Keep what worked",
    };
    const loopState = overlay.engineLabsLoop;
    const currentLoopStage = loopState?.currentStage || loopState?.job?.stage || null;
    const stageOrder = loopState?.loopStages?.length
      ? loopState.loopStages
      : out.nodeLibrary.map((n) => n.label);
    const currentIdx = currentLoopStage ? stageOrder.indexOf(currentLoopStage) : -1;
    out.workflowStages = stageOrder.map((label, i) => {
      const n = out.nodeLibrary.find((row) => row.label === label) || { label, bg: "var(--raised)" };
      const done = currentIdx >= 0 && i < currentIdx;
      const current = currentLoopStage && label === currentLoopStage;
      return {
        label,
        meta: stageMeta[label] || "Loop stage",
        bg: done ? "var(--green-soft)" : current ? "var(--blue-soft)" : n.bg,
        dot: done ? DOTS.ok : current ? DOTS.run : DOTS.idle,
        bd: current ? "var(--blue)" : done ? "var(--green)" : "var(--line)",
        done,
        current,
      };
    });
    out.nodes = out.workflowStages.slice(0, 5).map((n, i) => ({
      label: n.label,
      meta: n.meta,
      x: `${20 + (i % 3) * 230}px`,
      y: `${22 + Math.floor(i / 3) * 128}px`,
      dot: n.dot,
      bd: n.bd,
    }));
    out.wires = [];
    out.lastEngineLabsJob = overlay.lastEngineLabsJob || loopState?.job || null;
    out.engineLabsLoop = loopState || null;
    out.hermesHost = overlay.hermesHost || {
      status: "not_configured",
      message:
        "Hermes Host is not configured. Set HERMES_API_BASE_URL (HostHatch tunnel :8642) before Start/Advance.",
      write_tools: false,
      mock: true,
      api_server: false,
      pin: null,
    };
    out.operatorSeat = overlay.operatorSeat || null;
    const th = (subject, preview, channel, key, when, unread, active) => ({ subject, preview, channel, key, when, dot: unread ? DOTS.run : DOTS.idle, bg: active ? "var(--blue-soft)" : "transparent", mark: active ? "var(--blue)" : "transparent" });
    out.threads = [
      th("Interception behaviour before policy resolution", "Cam: confirmed — interception must run first…", "in-app", "TCK-0182", "09:12", true, true),
      th("Worker pool ceiling during checks", "Hermes queue alert escalated from run_7f21c", "in-app", "TCK-0181", "08:40", true, false),
      th("Vendor documentation allow-list", "Two domains still outside the allow-list", "email", "TCK-0179", "Yesterday", true, false),
      th("Handover note for Release 1", "Draft ready for your review", "in-app", "TCK-0174", "Mon", false, false),
    ];
    out.messages = [
      { who: "Cam Douglas", when: "09:12", body: "Interception has to run before policy resolution, otherwise a refused action still touches the source.", align: "flex-start", bg: "var(--raised)", bd: "var(--line2)" },
      { who: "Papership agent", when: "09:18", body: "Added a test that asserts interception happens first. Evidence is linked to CCO-245.", align: "flex-start", bg: "var(--surface)", bd: "var(--line)" },
      { who: "Cam Douglas", when: "09:24", body: "Keep this ticket open until the dry-run pull request is approved.", align: "flex-end", bg: "var(--amber-soft)", bd: "rgba(217,119,6,.3)" },
    ];
    out.ticketDetails = [{ k: "Status", v: "Open" }, { k: "Channel", v: "In-app" }, { k: "Assignee", v: "Cam Douglas" }, { k: "Opened", v: "09:12 today" }, { k: "Priority", v: "High" }];
    out.people = [
      { name: "Cam Douglas", initials: "CD", av: "linear-gradient(135deg,#2563eb,#a78bfa)", seat: "Paid operator", email: "founder@enginelabs.com.au", status: "Active", dot: DOTS.ok, open: openSlide({ title: "Cam Douglas", meta: "Paid operator seat · all domains entitled", body: "Founder/solo paid operator seat. Every business and platform domain is entitled. Charges stay off." }) },
      { name: "Project Lead seat", initials: "PL", av: "var(--t3)", seat: "Project Lead", email: "not yet issued", status: "Planned", dot: DOTS.idle, open: openSlide({ title: "Project Lead seat", meta: "Release 2", body: "Sees delegated projects only." }) },
      { name: "Operator seat", initials: "OP", av: "var(--t3)", seat: "Operator", email: "not yet issued", status: "Planned", dot: DOTS.idle, open: openSlide({ title: "Operator seat", meta: "Release 2", body: "Own assignments and runs." }) },
      { name: "Guest seat", initials: "GU", av: "var(--t3)", seat: "Guest", email: "not yet issued", status: "Planned", dot: DOTS.idle, open: openSlide({ title: "Guest seat", meta: "Scoped review", body: "Sees only the assigned scope." }) },
    ];
    out.teams = [
      { name: "Platform", meta: "Development loop, runtime, shell", members: "1 member · 3 plans" },
      { name: "Governance", meta: "Grants, registry, retention", members: "1 member · 2 plans" },
      { name: "Knowledge", meta: "Document intake, decisions", members: "1 member · 1 plan" },
    ];
    out.traceKpis = [
      { label: "Traces · 24h", value: "not captured", delta: "first-baseline", ink: "var(--t3)" },
      { label: "Failed", value: "not captured", delta: "first-baseline", ink: "var(--t3)" },
      { label: "p95 latency", value: "not captured", delta: "first-baseline", ink: "var(--t3)" },
      { label: "Cost band", value: "not captured", delta: "no published prices", ink: "var(--t3)" },
    ];
    out.traces = [];
    const fold = (label, n, on) => ({ label, n, bg: on ? "var(--blue-soft)" : "transparent", ink: on ? "var(--blue)" : "var(--t2)", fw: on ? "600" : "500" });
    out.folders = [fold("All files", "62", false), fold("Plans", "9", false), fold("Decisions", "33", false), fold("Loop notes", "14", true), fold("Handover", "4", false)];
    out.files = [
      { name: "Loop note — CCO-245 interception.md", size: "18 KB", mod: "14:32", bg: "var(--blue-soft)" },
      { name: "Loop note — CCO-231 allow-list.md", size: "11 KB", mod: "Yesterday", bg: "transparent" },
      { name: "Specification v4 — interception.pdf", size: "240 KB", mod: "Yesterday", bg: "transparent" },
      { name: "Decision record DEC-0033.md", size: "6 KB", mod: "Mon", bg: "transparent" },
    ];
    out.fileMeta = [{ k: "Kind", v: "Loop note" }, { k: "Linked item", v: "CCO-245" }, { k: "Retention", v: "Until superseded" }, { k: "Intake", v: "Uploaded 14:32" }, { k: "Classification", v: "Approved knowledge" }];
    const conn = (initials, name, kind, status, scope, verified, recovery) => {
      const k = status === "working" ? { bg: "var(--green-soft)", ink: "var(--green)", dot: "var(--green)", bd: "var(--line)" } : status === "configured" ? { bg: "var(--blue-soft)", ink: "var(--blue)", dot: "var(--blue)", bd: "var(--line)" } : status === "unavailable" ? { bg: "var(--red-soft)", ink: "var(--red)", dot: "var(--red)", bd: "rgba(225,29,72,.35)" } : { bg: "var(--line2)", ink: "var(--t3)", dot: "var(--t3)", bd: "var(--line)" };
      const actions = status === "working" ? [{ label: "Test", bd: "var(--line)", ink: "var(--t2)", go: () => {} }, { label: "Revoke", bd: "var(--red)", ink: "var(--red)", go: () => setModal("revoke") }] : status === "unavailable" ? [{ label: "Reconnect", bd: "var(--blue)", ink: "var(--blue)", go: () => setModal("wizard") }] : [{ label: "Set up", bd: "var(--line)", ink: "var(--t2)", go: () => setModal("wizard") }];
      return { initials, name, kind, status, scope, verified, recovery, actions, glyphBg: status === "working" ? "var(--t1)" : "var(--raised)", glyphInk: status === "working" ? "var(--canvas)" : "var(--t3)", ...k };
    };
    out.connections = [
      conn("GH", "GitHub", "Bound repository · Papership", "working", "Branch, change and check are granted. Release is off.", "Verified 2m ago", ""),
      conn("WR", "Web research", "Allow-list browsing", "configured", "Configured within limits — 14 approved domains.", "Verified 11m ago", ""),
      conn("VC", "Vercel", "Deployment target", "unavailable", "Deployment status only. No release authority.", "Last verified 3h ago", "Token expired. Reconnect in your browser."),
      conn("GM", "Gmail", "Comms channel", "planned", "Planned. A connected channel reads the conversations you link.", "Not configured", ""),
    ];
    const SET = SETTINGS_PANES;
    out.settingsNav = SET.map((label) => {
      const on = label === setPane || (setPane === "permissions" && label === "Permissions");
      return { label, tag: label === "Personalisation" ? "R3" : label === "Team" ? "R2" : "", go: () => setSetPane(label), bg: on ? "var(--surface)" : "transparent", ink: on ? "var(--t1)" : "var(--t2)", fw: on ? "600" : "500" };
    });
    out.set_permissions = setPane === "Permissions";
    out.set_appearance = setPane === "Appearance";
    out.set_plan = setPane === "Plan";
    out.set_ai_agents = setPane === "AI & Agents";
    out.planTiers = [];
    const seat = overlay.operatorSeat;
    out.operatorSeat = seat;
    out.seatSummary = seat
      ? {
          label: seat.label || "Founder / solo paid operator",
          sku: seat.sku || "paid_operator",
          domainCount: seat.domain_count ?? (seat.domains || []).length,
          domains: seat.domains || [],
          products: seat.products || [],
          planHint: seat.plan_hint || "pro",
          charges: seat.charges_enabled ? "On" : "Off · trial card only",
          contextMusic: seat.context_music === true,
        }
      : {
          label: "Founder / solo paid operator",
          sku: "paid_operator",
          domainCount: 43,
          domains: [],
          products: ["hey_papership", "workflows", "hermes_host", "engine_labs.loop"],
          planHint: "pro",
          charges: "Off · trial card only",
          contextMusic: false,
        };
    out.commandGreet = {
      title: "Good afternoon, Cam.",
      meta: "Command room from blueprint-3 — seat, Founder loop, and domain catalogue stay on the existing Today · Work · Workflows routes.",
    };
    const loopJobPreview = overlay.lastEngineLabsJob || overlay.engineLabsLoop?.job;
    const loopStagePreview = loopJobPreview?.stage || overlay.engineLabsLoop?.currentStage;
    const loopStageLabel = loopStagePreview ? String(loopStagePreview).replace(/_/g, " ") : "not started";
    out.commandTiles = [
      {
        label: "Needs you",
        value: String(out.decisions.length),
        meta: out.decisions.length ? "decisions on Today" : "all clear",
        dot: out.decisions.length ? DOTS.warn : DOTS.ok,
        ink: out.decisions.length ? "var(--amber)" : "var(--green)",
        go: goDecisions,
      },
      {
        label: "Founder loop",
        value: loopStageLabel,
        meta: "Work · Workflows",
        dot: loopJobPreview ? DOTS.run : DOTS.idle,
        ink: "var(--brand)",
        go: goWorkflows,
      },
      {
        label: "Domains",
        value: String(out.seatSummary.domainCount),
        meta: "Today · Registry",
        dot: DOTS.ok,
        ink: "var(--t1)",
        go: goDomains,
      },
      {
        label: "Running",
        value: String(out.runs.filter((r) => r.status === "Running").length),
        meta: "runs in flight",
        dot: DOTS.run,
        ink: "var(--brand)",
        go: go("today"),
      },
    ];
    out.commandRoom = [
      {
        id: "seat",
        title: "Paid operator seat",
        meta: `${out.seatSummary.domainCount} domains entitled · plan ${out.seatSummary.planHint}`,
        body: "Founder/solo seat with every business and platform domain. Context Music stays out of scope.",
        go: goSeat,
      },
      {
        id: "workflows",
        title: "Workflows · Founder loop",
        meta: "engine_labs.loop · stage request",
        body: "Open Work → Workflows and start the Founder / Engine Labs loop. Jobs stay queued; no live GitHub open.",
        go: goWorkflows,
      },
      {
        id: "domains",
        title: "Domain catalogue",
        meta: "Today · Registry · 43 groups",
        body: "B01–B24 and P01–P19 statuses for the Engine Labs company OS.",
        go: goDomains,
      },
    ];
    const grantRow = (key, label, desc) => ({ label, desc, toggle: () => setGrants((g) => ({ ...g, [key]: !g[key] })), track: grants[key] ? "var(--blue)" : "var(--line2)", bd: grants[key] ? "var(--blue)" : "var(--line)", knob: grants[key] ? "20px" : "2px" });
    out.repoGrants = [grantRow("branch", "Branch", "Create and update branches in the bound repository."), grantRow("change", "Change", "Write an isolated change on a branch. Never on main."), grantRow("check", "Check", "Run checks and read their results."), grantRow("release", "Release", "Publish a release. Off by default.")];
    out.themeCards = [
      { label: "Light", note: "Observatory cream", go: () => { setTheme("light"); try { localStorage.setItem(THEME_KEY, "light"); } catch { /* */ } }, swatch: "linear-gradient(180deg,#f7f4ee,#ffffff)", bd: theme === "light" ? "var(--blue)" : "var(--line)" },
      { label: "Dark", note: "Near-black purple", go: () => { setTheme("dark"); try { localStorage.setItem(THEME_KEY, "dark"); } catch { /* */ } }, swatch: "linear-gradient(180deg,#0b0614,#1c1528)", bd: theme === "dark" ? "var(--blue)" : "var(--line)" },
      { label: "Dimmed", note: "Settings only", go: () => { setTheme("dimmed"); try { localStorage.setItem(THEME_KEY, "dimmed"); } catch { /* */ } }, swatch: "linear-gradient(180deg,#1e2438,#232840)", bd: theme === "dimmed" ? "var(--blue)" : "var(--line)" },
    ];
    const PANES = {
      General: { desc: "Organisation defaults for Engine Labs.", rows: [{ k: "Organisation name", v: "Papership · Engine Labs" }, { k: "Timezone", v: "Australia/Sydney" }, { k: "Locale", v: "en-AU" }] },
      "AI & Agents": {
        desc: "Hey Papership chat plus Hermes Host as the always-on agent box for technical operators. Write tools stay blocked.",
        rows: [
          { k: "Assistant", v: "Hey Papership" },
          { k: "Budget band", v: "Medium" },
          { k: "Allowed modes", v: "6 of 7" },
          { k: "Hermes Host", v: overlay.hermesHost?.status || "not_configured" },
          { k: "Context Music", v: "Out of scope" },
        ],
      },
      Notifications: { desc: "What reaches you, and how loudly.", rows: [{ k: "Critical incidents", v: "On" }, { k: "Approvals", v: "On · immediate" }] },
      Security: { desc: "Sessions and strong factors.", rows: [{ k: "Active sessions", v: "2" }, { k: "Two-factor", v: "Authenticator app" }] },
      Team: { desc: "Members and invitations. A second seat needs the measurement notice.", rows: [{ k: "Members", v: "1" }, { k: "Paid operator seat", v: `Founder · Cam Douglas · ${out.seatSummary.domainCount} domains entitled` }] },
      "Data & retention": { desc: "Your content is yours. Papership does not own it. The measurement notice is the store flag that unlocks a second human or guest — it is not a new legal decision.", rows: [{ k: "Conversations", v: "365 days" }, { k: "Usage disclosure", v: "First-party identifier and enum events only" }, { k: "Measurement notice (OQ-G2)", v: overlay.measurement?.oq_g2_recorded ? "Recorded" : "Not recorded on this store" }, { k: "API store", v: overlay.apiBase || "http://127.0.0.1:8000" }, { k: "Erasure request", v: overlay.erasure?.status === "recorded" ? "Intent recorded · destroy not executed" : "None recorded" }] },
      Personalisation: { desc: "Release 3.", rows: [{ k: "Adaptive views", v: "Off" }] },
      Docs: { desc: "Product documentation opens in a reader.", rows: [{ k: "Getting started", v: "Open ↗" }, { k: "Licensing state", v: "Identifiers only · LICENSE, NOTICE · charges off" }] },
      Plan: {
        desc: "Trial rate card (D-35). Pro is the paid operator seat for one founder/solo operator. Charges stay off. Remaining usage stays not captured until events exist.",
        rows: [
          { k: "Remaining allowance", v: "not captured" },
          { k: "Action cost", v: "not captured" },
          { k: "Charges", v: out.seatSummary.charges },
          { k: "Paid operator seat", v: `${out.seatSummary.label} · ${out.seatSummary.domainCount} domains` },
          { k: "SKU", v: out.seatSummary.sku },
          { k: "Overage", v: "US$10 credit packs at the plan rate after the included pool" },
          { k: "Usage tiers", v: "Usage 1–5 raise the overage ceiling (1× → 16×), like OpenAI / Google" },
          { k: "Payment proposals", v: "Native records only · no payout" },
          { k: "Context Music", v: "Out of scope" },
        ],
      },
    };
    const pd = PANES[setPane] || PANES.General;
    out.setTitle = PANES[setPane] ? setPane : "General";
    out.setDesc = pd.desc;
    out.setRows = pd.rows;
    out.accountNav = ["Public profile", "Branding", "My link", "Phone", "Login & security", "Cookie settings"].map((label, i) => ({ label, bg: i === 0 ? "var(--surface)" : "transparent", ink: i === 0 ? "var(--t1)" : "var(--t2)", fw: i === 0 ? "600" : "500" }));
    out.memoryNav = [{ label: "Sessions", n: "42", bg: "transparent", fw: "500" }, { label: "Projects", n: "6", bg: "var(--blue-soft)", fw: "600" }, { label: "Domains", n: "43", bg: "transparent", fw: "500" }];
    out.memoryRows = [
      { title: "Interception runs before policy resolution", kind: "Decision", cls: "Approved", version: "v2", bg: "var(--blue-soft)" },
      { title: "Close never cancels cloud work", kind: "Decision", cls: "Approved", version: "v1", bg: "transparent" },
      { title: "Bound repository is GitHub · Papership", kind: "Fact", cls: "Source", version: "v4", bg: "transparent" },
    ];
    out.provenance = [{ k: "Source", v: "DEC-0033" }, { k: "Owner", v: "Cam Douglas" }, { k: "Verification", v: "Approved by owner" }];
    const LOOP = ["Request", "Research", "Specification", "Plan", "Assignment", "Isolated change", "Tests", "Review", "Approved release", "Monitoring", "Retained knowledge"];
    out.loop = LOOP.map((label, i) => {
      const n = i + 1; const done = n < 6; const active = n === 6; const future = n > 6;
      return { n: String(n), label, fill: done ? "var(--green)" : active ? "var(--blue)" : "var(--surface)", ring: done ? "var(--green)" : active ? "var(--blue)" : "var(--line)", numInk: future ? "var(--t3)" : "#fff", line: done ? "var(--green)" : active ? "linear-gradient(90deg,var(--blue),var(--line))" : "var(--line2)", ink: future ? "var(--t3)" : "var(--t1)", fw: active ? "700" : "500" };
    });
    out.itemRuns = [
      { id: "run_7f21c", mode: "Execute", status: "Running", dot: DOTS.run, open: routeTo({ kind: "run" }) },
      { id: "run_7f0b2", mode: "Analyse", status: "Completed", dot: DOTS.ok, open: routeTo({ kind: "run" }) },
    ];
    out.itemDetails = [{ k: "Key", v: "CCO-245", style: true }, { k: "Plan", v: "PLAN-019", style: true }, { k: "Department", v: "Platform" }, { k: "Sponsor", v: "Cam Douglas" }, { k: "Repository", v: "GitHub · Papership" }];
    const RS = [
      { label: "Scope confirmed", when: "14:29:04", receipt: "Sponsor Cam Douglas · item CCO-245", done: true },
      { label: "Read the change surface", when: "14:29:51", receipt: "Read 3 files. No secrets were read.", done: true },
      { label: "Drafted an isolated change", when: "14:33:12", receipt: "Wrote 142 lines on change/cco-245-interception.", done: true },
      { label: "Ran checks", when: "14:37:40", receipt: "14 passed, 0 failed.", done: true },
      { label: "Waiting for your approval", when: "now", receipt: "Asked to open a dry-run pull request.", done: false, active: true },
      { label: "Hand over for review", when: "not started", receipt: "Release stays a proposal.", done: false },
    ];
    out.runSteps = RS.map((s, i) => ({ n: String(i + 1), ...s, fill: s.done ? "var(--green)" : s.active ? "var(--blue)" : "var(--surface)", ring: s.done ? "var(--green)" : s.active ? "var(--blue)" : "var(--line)", numInk: s.done || s.active ? "#fff" : "var(--t3)", fw: s.active ? "700" : "500" }));
    out.grantsWords = [
      { label: "May create a branch in the bound repository", dot: "var(--green)", ink: "var(--t1)" },
      { label: "May propose a change on that branch", dot: "var(--green)", ink: "var(--t1)" },
      { label: "May run checks", dot: "var(--green)", ink: "var(--t1)" },
      { label: "May not release — grant is off", dot: "var(--red)", ink: "var(--t2)" },
    ];
    out.usage = [{ label: "Model band", value: "Standard", w: "46%", bg: "var(--blue)" }, { label: "Tool calls", value: "31", w: "38%", bg: "var(--blue)" }, { label: "Time", value: "12m 04s", w: "52%", bg: "var(--blue)" }];
    out.heySessions = [
      { label: "CCO-245 change", dot: DOTS.run, bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", fw: "600" },
      { label: "Registry sweep", dot: DOTS.ok, bg: "transparent", bd: "transparent", ink: "var(--t3)", fw: "500" },
      { label: "Handover draft", dot: DOTS.idle, bg: "transparent", bd: "transparent", ink: "var(--t3)", fw: "500" },
    ];
    out.railSignals = [S("Health", "1 degraded", "warn", "Workers (Hermes) are running at reduced concurrency."), S("Decisions", "2", "warn", "Two approvals are waiting on you."), S("Notifications", "3", "run", "Three unread notifications.")];
    out.railPriorities = [S("Phase 2 development loop", "68%", "ok", "The eleven-stage loop is live."), S("T2-1 interception hardening", "41%", "warn", "Interception coverage is behind schedule."), S("Document intake for R1", "84%", "ok", "Upload and classification are complete."), S("Capability registry coverage", "22%", "idle", "43 domain groups are registered.")];
    out.railPlans = [
      { label: "Release 1 — Founder desktop", pct: 72, pctw: "72%", due: "30 Sep", dot: DOTS.ok, open: openSlide({ title: "Release 1 — Founder desktop", meta: "72% · due 30 Sep", body: "Scope: Today, Work, Runs, Connections, Settings." }) },
      { label: "Release 2 — Collaboration", pct: 18, pctw: "18%", due: "12 Dec", dot: DOTS.warn, open: openSlide({ title: "Release 2 — Collaboration", meta: "18% · due 12 Dec", body: "Inbox, People, seats." }) },
      { label: "Release 3 — Memory & adaptation", pct: 4, pctw: "4%", due: "Q1 2027", dot: DOTS.idle, open: openSlide({ title: "Release 3 — Memory & adaptation", meta: "4% · due Q1 2027", body: "Governed memory. Specified, not started." }) },
    ];
    out.railBlockers = [
      { label: "Hermes worker pool saturates on checks", meta: "Impact: stage 7 tests · Platform", open: openSlide({ title: "Hermes worker pool saturates on checks", meta: "Blocker · Platform", body: "Concurrent check runs exceed the pool ceiling." }) },
      { label: "Release grant intentionally off", meta: "Impact: stage 9 · Governance", open: openSlide({ title: "Release grant intentionally off", meta: "Blocker by design", body: "Stage 9 can only produce a release proposal." }) },
    ];
    out.railDecisions = [
      { label: "Close ≠ cancel for cloud runs", meta: "DEC-0031 · 09 Sep", open: openSlide({ title: "Close ≠ cancel for cloud runs", meta: "DEC-0031", body: "Closing the desktop window never cancels work in the cloud." }) },
      { label: "No published prices in chrome", meta: "DEC-0029 · 04 Sep", open: openSlide({ title: "No published prices in chrome", meta: "DEC-0029", body: "No currency appears until commercial terms are set." }) },
      { label: "Prompts are not a security boundary", meta: "DEC-0024 · 28 Aug", open: openSlide({ title: "Prompts are not a security boundary", meta: "DEC-0024", body: "Grants are enforced in the runtime." }) },
    ];
    out.auditEvents = [
      { time: "14:41:02", kind: "run started", text: "run_7ef44 draft handover note · sponsor Cam Douglas", dot: DOTS.run },
      { time: "14:37:41", kind: "warning", text: "Check retried after worker pool timeout · run_7f21c", dot: DOTS.warn },
      { time: "14:26:10", kind: "approved", text: "Specification v4 approved by Cam Douglas", dot: DOTS.ok },
      { time: "14:03:12", kind: "failed", text: "Vercel token expired · connection unavailable", dot: DOTS.bad },
      { time: "13:58:44", kind: "connected", text: "GitHub verified · Papership · main", dot: DOTS.ok },
      { time: "09:02:41", kind: "signed in", text: "Cam Douglas signed in from Sydney", dot: DOTS.ok },
    ];
    out.notifications = [
      { text: "Approval requested — open a dry-run pull request", meta: "CCO-245 · rev 8f3c1ad · 14:26", dot: DOTS.warn, fw: "600", bg: "var(--blue-soft)", go: () => { setModal("approve"); setDrawer(false); } },
      { text: "Vercel is unavailable — token expired", meta: "Connection · 14:03", dot: DOTS.bad, fw: "600", bg: "var(--blue-soft)", go: () => { setTab("integrations"); setDrawer(false); } },
      { text: "Run completed — coverage gap analysis", meta: "run_7f0b2 · 13:41", dot: DOTS.ok, fw: "600", bg: "var(--blue-soft)", go: () => { setRoute({ kind: "run" }); setDrawer(false); } },
      { text: "Approval decided — specification v4 approved", meta: "CCO-245 · 09:41", dot: DOTS.ok, fw: "500", bg: "transparent", go: () => {} },
    ];
    out.paletteGroups = [
      {
        label: "Jump to",
        items: [
          { label: "Today · Overview", meta: "tab", dot: DOTS.run, go: go("today") },
          { label: "Settings · Plan (paid seat)", meta: "#settings/plan", dot: DOTS.ok, go: () => { goSeat(); } },
          { label: "Work · Workflows (Founder loop)", meta: "#work/workflows", dot: DOTS.run, go: () => { goWorkflows(); } },
          { label: "Today · Registry (domains)", meta: "#today/registry", dot: DOTS.idle, go: () => { goDomains(); } },
          { label: "Work · Issues", meta: "tab", dot: DOTS.idle, go: () => { setTab("work"); setSub((s) => ({ ...s, work: "Issues" })); setPalette(false); } },
          { label: "Settings · Permissions", meta: "tab", dot: DOTS.idle, go: () => { setTab("settings"); setSetPane("Permissions"); setPalette(false); } },
        ],
      },
      { label: "Actions", items: [{ label: "Approve — open a dry-run pull request", meta: "approval", dot: DOTS.warn, go: () => { setModal("approve"); setPalette(false); } }, { label: "Start a run scoped to CCO-245", meta: "run", dot: DOTS.run, go: () => { setHey(true); setPalette(false); } }] },
    ];
    out.recordOqG2 = overlay.measurement?.oq_g2_recorded
      ? null
      : async () => {
          try {
            await recordOqG2();
            setOverlay((prev) => ({
              ...prev,
              actionError: "",
              measurement: { ...(prev.measurement || {}), oq_g2_recorded: true },
            }));
            setOverlay(await loadPapershipOverlay());
          } catch (error) {
            setOverlay((prev) => ({ ...prev, actionError: error.message || "Could not record the measurement notice." }));
          }
        };
    out.requestErasure = async () => {
      try {
        await requestErasure(["erase", "tenant", "irreversible"]);
        setOverlay(await loadPapershipOverlay());
      } catch (error) {
        setOverlay((prev) => ({ ...prev, actionError: error.message || "Could not record the erasure request." }));
      }
    };
    out.loopActionBusy = loopActionBusy;
    out.startEngineLabsJob = async () => {
      const projectId = overlay.engineLabsLoop?.projectId || overlay.managedProjects?.[0]?.id || ENGINE_LABS_PROJECT_ID;
      setLoopActionBusy(true);
      try {
        const result = await startEngineLabsJob(projectId, "Engine Labs loop");
        const loop = coalesceEngineLabsLoop(await fetchEngineLabsLoopState(projectId));
        const fresh = await loadPapershipOverlay();
        setOverlay({
          ...fresh,
          actionError: "",
          engineLabsLoop: coalesceEngineLabsLoop(loop ?? fresh.engineLabsLoop),
          lastEngineLabsJob: loop?.job || result,
        });
        return result;
      } catch (error) {
        setOverlay((prev) => ({ ...prev, actionError: error.message || "Could not start the Engine Labs job." }));
        throw error;
      } finally {
        setLoopActionBusy(false);
      }
    };
    out.advanceEngineLabsLoop = async () => {
      const loop = overlay.engineLabsLoop;
      const workItemId = loop?.workItem?.id || loop?.job?.work_item_id;
      const nextStage = loop?.nextStage;
      if (!workItemId || !nextStage) {
        setOverlay((prev) => ({
          ...prev,
          actionError: "Start the Founder loop first, or you are already at the final stage.",
        }));
        return null;
      }
      const projectId = loop?.projectId || ENGINE_LABS_PROJECT_ID;
      setLoopActionBusy(true);
      try {
        await advanceEngineLabsLoopStage(workItemId, nextStage, `founder.advance.${nextStage}`);
        const refreshed = coalesceEngineLabsLoop(await fetchEngineLabsLoopState(projectId));
        const fresh = await loadPapershipOverlay();
        setOverlay({
          ...fresh,
          actionError: "",
          engineLabsLoop: coalesceEngineLabsLoop(refreshed ?? fresh.engineLabsLoop),
          lastEngineLabsJob: refreshed?.job ?? fresh.engineLabsLoop?.job,
        });
        return refreshed;
      } catch (error) {
        setOverlay((prev) => ({
          ...prev,
          actionError: error.message || "Could not advance the loop stage.",
        }));
        throw error;
      } finally {
        setLoopActionBusy(false);
      }
    };
    void page; void cur;
    return applyPapershipOverlay(out, overlay, { openWizard, setModal });
  }, [theme, tab, sub, setPane, grants, go, goSeat, goWorkflows, goDomains, goDecisions, openSlide, routeTo, overlay, isMobile, openWizard, loopActionBusy]);

  const page = PAGES[tab] || PAGES.today;
  const cur = sub[tab] || DFLT[tab];
  const rk = route?.kind || "";
  let pageTitle = page.t;
  let pageDesc = page.d;
  let pageChip = "";
  let pageActions = [{ label: "Start a run", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", go: () => setHey(true) }];
  if (tab === "work") pageActions = [{ label: "Filter", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", go: () => {} }, { label: "New issue", bg: "var(--blue)", bd: "var(--blue)", ink: "#fff", go: () => {} }];
  if (tab === "files") pageActions = [{ label: "Upload", bg: "var(--blue)", bd: "var(--blue)", ink: "#fff", go: () => setModal("upload") }];
  if (tab === "integrations") pageActions = [{ label: "Add connection", bg: "var(--blue)", bd: "var(--blue)", ink: "#fff", go: () => openWizard() }];
  if (tab === "people") pageActions = [{ label: "Invite person", bg: "var(--blue)", bd: "var(--blue)", ink: "#fff", go: () => setModal("invite") }];
  if (!rk && tab === "work" && cur === "Workflows") {
    const loopJob = v.lastEngineLabsJob;
    const stage = v.engineLabsLoop?.currentStage || loopJob?.stage;
    if (loopJob?.id && stage) {
      pageChip = `Loop · ${String(stage).replace(/_/g, " ")}`;
      const art = v.engineLabsLoop?.currentArtifact;
      const artHint = art?.artifact_type ? ` · ${art.artifact_type}` : "";
      pageDesc = `Job ${loopJob.id} · ${loopJob.status || "queued"}${artHint}${v.engineLabsLoop?.mock ? " · browser mock (API unreachable)" : ""}`;
    } else {
      pageDesc = "Founder / Engine Labs loop — press Start; the page title chip shows the live stage.";
    }
  }
  if (rk === "work-item") { pageTitle = "CCO-245 · Interception hardening for T2-1"; pageDesc = "Work item · Platform · Cam Douglas · due 24 Sep"; pageChip = "In progress"; pageActions = [{ label: "Back to Work", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", go: go("work") }]; }
  if (rk === "run") { pageTitle = "run_7f21c · Isolated change for CCO-245"; pageDesc = "Run · sponsor Cam Douglas · acting as Papership agent (user-equivalent)"; pageChip = "Running"; pageActions = [{ label: "Back", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", go: go("today") }]; }
  if (rk === "account") { pageTitle = "Account"; pageDesc = "Your profile and sign-in — not an organisation setting"; pageActions = [{ label: "Back", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", go: go("today") }]; }
  if (rk === "memory") { pageTitle = "Memory"; pageDesc = v.memoryNote || "Governed memory with provenance"; pageChip = v.adaptedBadge || ""; pageActions = [{ label: "Back", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)", go: go("today") }]; }
  if (isMobile && tab === "today" && !route) {
    pageDesc = "What needs you now · 14:41 AEST";
    pageActions = [];
  }

  const subnav = page.subs.map((s) => {
    const on = s === cur;
    let count = (page.counts || {})[s] || "";
    if (tab === "inbox" && s === "All") count = String((v.threads || []).length);
    return { label: s, go: setSubTab(tab, s), bg: on ? "var(--surface)" : "transparent", ink: on ? "var(--t1)" : "var(--t3)", fw: on ? "600" : "500", sh: on ? "0 1px 2px rgba(26,18,36,.08)" : "none", count, cbg: on ? "var(--blue-soft)" : "var(--line2)", cink: on ? "var(--blue)" : "var(--t3)" };
  });

  const MODALS = {
    approve: { title: "Approve this action?", body: "Action · open a dry-run pull request. Target · GitHub · Papership · change/cco-245-interception. Version · rev 8f3c1ad.", confirm: "Approve", cancel: "Not now", btn: "var(--blue)" },
    reject: { title: "Reject this action?", body: "The run will stop at this step and wait for new instructions.", confirm: "Reject", cancel: "Back", btn: "var(--red)" },
    revoke: { title: "Revoke this connection?", body: "Papership will lose access to GitHub · Papership immediately.", confirm: "Revoke", cancel: "Back", btn: "var(--red)" },
    upload: { title: "Upload documents", body: "Documents are classified on intake and linked to work items.", confirm: "Choose files", cancel: "Cancel", btn: "var(--blue)" },
    invite: { title: "Invite a person", body: "A second seat stays blocked until the measurement notice is accepted (OQ-G2). Mail is not sent.", confirm: "Prepare seat", cancel: "Cancel", btn: "var(--blue)" },
    wizard: { title: "Connect a provider", body: "GitHub is configured. Gmail and Slack authorise in your browser — Papership never embeds a provider sign-in. Send stays approval-then-receipt.", confirm: "Continue to authorise ↗", cancel: "Cancel", btn: "var(--blue)" },
  };
  const md = MODALS[modal];

  const confirmModal = async () => {
    if (modal !== "wizard") {
      setModal(null);
      return;
    }
    const pick = wizardPick || "gmail";
    if (pick !== "gmail" && pick !== "slack") {
      setWizardError(`${pick} stays planned until that app is registered.`);
      return;
    }
    setWizardError("");
    try {
      const body = await postPapershipJson(`/connections/${pick}/connect`, {});
      if (body.authorize_url) {
        window.location.assign(body.authorize_url);
        return;
      }
      setModal(null);
    } catch (err) {
      setWizardError(err.message || "Could not start authorisation.");
    }
  };

  const signIn = async (payload) => {
    const next = { email: payload.email, name: payload.name, at: Date.now() };
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(next)); } catch { /* */ }
    try {
      await ensureLocalSession();
    } catch {
      /* API down — chrome still signs in; Data actions stay unreachable */
    }
    setAuthed(true);
  };
  const signOut = () => {
    try {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(LEGACY_AUTH_KEY);
      sessionStorage.removeItem(LEGACY_AUTH_KEY);
    } catch { /* */ }
    clearStoredSession();
    wipeOfflineQueue();
    setAuthed(false); setAvatarOpen(false);
  };

  return (
    <div className="bp2-root" data-theme={theme} data-narrow={isMobile ? "1" : "0"} data-rail={railOpen ? "1" : "0"} data-hey={hey ? "1" : "0"}>
      {!authed ? (
        <Auth theme={theme} cycleTheme={cycleTheme} onSignIn={signIn} />
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {oauthNote ? (
            <div style={{ flex: "none", padding: "8px 14px", background: "var(--blue-soft)", color: "var(--t1)", fontSize: 12.5, borderBottom: "1px solid var(--line)" }}>
              {oauthNote}
            </div>
          ) : null}
          <div className="bp2-top" style={{ height: 60, flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "0 14px", background: "var(--navfield)", borderBottom: "1px solid rgba(0,0,0,.25)", position: "relative", zIndex: 520 }}>
            <button type="button" title="Toggle company rail" onClick={() => setRailOpen((o) => !o)} style={{ width: 36, height: 36, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(196,181,253,.34)", background: "rgba(255,255,255,.06)", borderRadius: 8, color: "var(--navink)", cursor: "pointer" }}>
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="12" height="10" rx="1.6" /><path d="M6.2 3v10" /></svg>
            </button>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-.2px" }}>{PRODUCT.name}</span>
              <span style={{ fontSize: 10.5, color: "var(--navink2)" }}>{PRODUCT.company}</span>
            </div>
            <div className="bp2-search-wide" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <button type="button" onClick={() => setPalette(true)} style={{ width: "100%", maxWidth: 400, height: 32, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(196,181,253,.3)", background: "rgba(0,0,0,.18)", color: "var(--navink2)", cursor: "pointer", font: "400 12.5px Inter,sans-serif" }}>
                <SearchIco />
                <span style={{ flex: 1, textAlign: "left" }}>Search anything</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, border: "1px solid rgba(196,181,253,.3)", borderRadius: 4, padding: "1px 5px" }}>⌘K</span>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flex: "none", marginLeft: "auto" }}>
              <button type="button" title="Search" className="bp2-search-narrow" onClick={() => setPalette(true)} style={navBtn}><SearchIco /></button>
              <button type="button" className="bp2-desktop-extra" title={`Theme: ${theme}`} onClick={cycleTheme} style={navBtn}><Ico d={theme === "light" ? PATHS.sun : PATHS.moon} /></button>
              <div className="bp2-desktop-extra" style={{ position: "relative" }}>
                <button type="button" title="Create" onClick={() => { setCreateOpen((o) => !o); setAvatarOpen(false); }} style={navBtn}><Ico d={PATHS.plus} /></button>
                {createOpen ? (
                  <div style={{ position: "absolute", top: 38, right: 0, width: 228, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 5, zIndex: 530 }}>
                    {["New priority", "New plan", "New request", "New run"].map((l) => (
                      <div key={l} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }} onClick={() => setCreateOpen(false)}>{l}</div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" title="Notifications" onClick={() => { setDrawer((o) => !o); setAvatarOpen(false); setCreateOpen(false); }} style={{ ...navBtn, position: "relative" }}>
                <Ico d={PATHS.bell} />
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--red)", color: "#fff", font: "600 10px 'JetBrains Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--navfield)" }}>3</span>
              </button>
              <div style={{ position: "relative" }}>
                <button type="button" onClick={() => { setAvatarOpen((o) => !o); setCreateOpen(false); }} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(196,181,253,.4)", background: "linear-gradient(135deg,#2563eb,#a78bfa)", color: "#fff", font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>CD</button>
                {avatarOpen ? (
                  <div style={{ position: "absolute", top: 38, right: 0, width: 210, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 5, zIndex: 530 }}>
                    <div style={{ padding: "8px 9px 9px", borderBottom: "1px solid var(--line2)", marginBottom: 4 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>Cam Douglas</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "'JetBrains Mono',monospace" }}>founder@enginelabs.com.au</div>
                      <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 10, background: "var(--blue-soft)", color: "var(--blue)", font: "600 10.5px Inter,sans-serif", cursor: "pointer" }} onClick={() => { goSeat(); setAvatarOpen(false); }}>Paid operator seat</div>
                    </div>
                    <div onClick={() => { setRoute({ kind: "account" }); setAvatarOpen(false); }} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}>Profile</div>
                    <div onClick={() => { goSeat(); setAvatarOpen(false); }} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}>Settings · Plan</div>
                    <div onClick={() => { goWorkflows(); setAvatarOpen(false); }} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}>Work · Workflows</div>
                    <div onClick={() => { setRoute({ kind: "memory" }); setAvatarOpen(false); }} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}>Memory</div>
                    <div onClick={() => { cycleTheme(); setAvatarOpen(false); }} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer" }}>Theme: {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Dimmed"}</div>
                    <div onClick={signOut} style={{ padding: "7px 9px", borderRadius: 6, fontSize: 12.5, cursor: "pointer", color: "var(--red)" }}>Sign out</div>
                  </div>
                ) : null}
              </div>
              <button type="button" className="bp2-hey-launch" onClick={() => setHey((o) => !o)} style={{ height: 32, padding: 3, border: 0, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#22d3ee,#4ade80,#fbbf24,#f472b6,#a78bfa)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, height: 26, padding: "0 11px", borderRadius: 6, background: hey ? "transparent" : (theme !== "light" ? "#16081f" : "#2c1050"), color: "#fff", font: "600 12px Inter,sans-serif" }}>
                  <Ico d={PATHS.star} size={13} /> Hey Papership
                </span>
              </button>
            </div>
          </div>

          <div className="bp2-tabs-desktop" style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 2, padding: "0 12px", background: "var(--navfield)", position: "relative", zIndex: 519 }}>
            {TAB_KEYS.map((k) => {
              const active = tab === k && !route;
              const badge = k === "inbox" ? "4" : "";
              return (
                <button key={k} type="button" onClick={go(k)} style={{ display: "flex", alignItems: "center", gap: 7, height: active ? 36 : 32, padding: "0 13px", border: 0, borderRadius: "9px 9px 0 0", background: active ? "var(--canvas)" : "transparent", color: active ? "var(--t1)" : "var(--navink2)", fontSize: 12.5, fontWeight: active ? 600 : 500, cursor: "pointer", position: "relative" }}>
                  <Ico d={TABDEF[k].d} />
                  {TABDEF[k].label}
                  {badge ? <span style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, background: active ? "var(--red-soft)" : "rgba(255,255,255,.16)", color: active ? "var(--red)" : "#fff", font: "600 10px 'JetBrains Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span> : null}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <button type="button" className="bp2-founder-chip" onClick={goSeat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 8px", fontSize: 10.5, color: "var(--navink2)", fontFamily: "'JetBrains Mono',monospace", border: 0, background: "transparent", cursor: "pointer" }}>Paid operator · Cam Douglas</button>
          </div>

          <div className="bp2-body" style={{ flex: 1, display: "flex", minHeight: 0, background: "var(--canvas)", position: "relative" }}>
            {railOpen ? <div className="bp2-rail-dim" onClick={() => setRailOpen(false)} /> : null}
            <div className="bp2-rail" style={{ width: railOpen ? 264 : 54, flex: "none", borderRight: "1px solid var(--line)", background: "var(--raised)", display: "flex", flexDirection: "column", minHeight: 0, transition: "width .28s cubic-bezier(0.32,0.72,0,1)" }}>
              {railOpen ? (
                <>
                  <div style={{ flex: "none", padding: "13px 14px 11px", borderBottom: "1px solid var(--line2)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".02em" }}>Company</div>
                    <div style={{ fontSize: 11, color: "var(--t3)" }}>Health · work · decisions</div>
                  </div>
                  <div style={{ flex: 1, overflow: "auto", padding: "8px 8px 16px" }}>
                    <div style={{ padding: "9px 6px 5px", font: "600 10px Inter,sans-serif", letterSpacing: ".09em", color: "var(--t3)", textTransform: "uppercase" }}>Signals</div>
                    {v.railSignals.map((r) => (
                      <div key={r.label} onClick={r.open} style={{ display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 7px", borderRadius: 6, cursor: "pointer" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flex: "none" }} />
                        <span style={{ flex: 1, fontSize: 12.5 }}>{r.label}</span>
                        <span style={{ font: "500 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.meta}</span>
                      </div>
                    ))}
                    <div style={{ padding: "13px 6px 5px", font: "600 10px Inter,sans-serif", letterSpacing: ".09em", color: "var(--t3)", textTransform: "uppercase" }}>Priorities</div>
                    {v.railPriorities.map((r) => (
                      <div key={r.label} onClick={r.open} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 30, padding: "5px 7px", borderRadius: 6, cursor: "pointer" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flex: "none" }} />
                        <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                        <span style={{ font: "500 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.meta}</span>
                      </div>
                    ))}
                    <div onClick={() => setPlansOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "13px 6px 5px", cursor: "pointer" }}>
                      <span style={{ font: "600 10px Inter,sans-serif", letterSpacing: ".09em", color: "var(--t3)", textTransform: "uppercase" }}>Plans & milestones</span>
                    </div>
                    {plansOpen ? v.railPlans.map((r) => (
                      <div key={r.label} onClick={r.open} style={{ padding: "6px 7px", borderRadius: 6, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                          <span style={{ font: "500 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.pct}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
                          <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--line2)", overflow: "hidden" }}><span style={{ display: "block", height: 6, width: r.pctw, background: r.dot, borderRadius: 3 }} /></span>
                          <span style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.due}</span>
                        </div>
                      </div>
                    )) : null}
                    <div style={{ padding: "13px 6px 5px", font: "600 10px Inter,sans-serif", letterSpacing: ".09em", color: "var(--t3)", textTransform: "uppercase" }}>Blockers</div>
                    {v.railBlockers.map((r) => (
                      <div key={r.label} onClick={r.open} style={{ padding: "7px 8px", borderRadius: 6, background: "var(--red-soft)", border: "1px solid rgba(225,29,72,.18)", marginBottom: 5, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", flex: "none" }} />
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                        </div>
                        <div style={{ marginLeft: 14, fontSize: 10.5, color: "var(--t3)" }}>{r.meta}</div>
                      </div>
                    ))}
                    <div style={{ padding: "13px 6px 5px", font: "600 10px Inter,sans-serif", letterSpacing: ".09em", color: "var(--t3)", textTransform: "uppercase" }}>Decisions</div>
                    {v.railDecisions.map((r) => (
                      <div key={r.label} onClick={r.open} style={{ padding: "7px 8px", borderRadius: 6, border: "1px solid var(--line2)", background: "var(--surface)", marginBottom: 5, cursor: "pointer" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                        <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 2 }}>{r.meta}</div>
                      </div>
                    ))}
                    <div className="bp2-rail-more">
                      <div style={{ padding: "13px 6px 5px", font: "600 10px Inter,sans-serif", letterSpacing: ".09em", color: "var(--t3)", textTransform: "uppercase" }}>More</div>
                      {RAIL_TABS.map((k) => (
                        <button key={k} type="button" onClick={go(k)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", height: 36, padding: "0 7px", border: 0, borderRadius: 6, background: tab === k ? "var(--surface)" : "transparent", color: "var(--t1)", font: "500 12.5px Inter,sans-serif", cursor: "pointer", textAlign: "left" }}>
                          <Ico d={TABDEF[k].d} size={14} />
                          {TABDEF[k].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : isMobile ? null : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 0" }}>
                  {["Signals", "Priorities", "Plans", "Blockers", "Decisions"].map((t) => (
                    <button key={t} type="button" title={t} onClick={() => setRailOpen(true)} style={{ width: 36, height: 34, border: 0, background: "transparent", color: "var(--t2)", borderRadius: 7, cursor: "pointer" }}>·</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, minWidth: 0, overflow: "auto", background: "var(--wash)" }}>
                <div className="bp2-page" style={{ maxWidth: 1280, minWidth: 0, margin: "0 auto", padding: "20px 28px 40px" }}>
                  {!online ? (
                    <div className="bp2-offline" role="status">
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", marginTop: 4, flex: "none", animation: "ogblink 1.6s infinite" }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Offline · Reconnecting…</div>
                        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>Showing last known state. Work already started continues in the cloud.</div>
                      </div>
                    </div>
                  ) : null}
                  <PageHead title={pageTitle} desc={pageDesc} chip={pageChip} actions={pageActions} />
                  {!route && page.subs.length > 0 ? <SubNav items={subnav} /> : null}
                  {rk === "work-item" && <WorkItemView v={v} />}
                  {rk === "run" && <RunDetailView v={v} />}
                  {rk === "account" && <AccountView v={v} />}
                  {rk === "memory" && <MemoryView v={v} />}
                  {!route && tab === "today" && cur === "Overview" && <TodayOverview v={v} />}
                  {!route && tab === "today" && cur === "Decisions" && <TodayDecisions v={v} />}
                  {!route && tab === "today" && cur === "Running" && <TodayRunning v={v} />}
                  {!route && tab === "today" && cur === "Registry" && <Registry v={v} />}
                  {!route && tab === "work" && cur === "Projects" && <WorkProjects v={v} />}
                  {!route && tab === "work" && cur === "Issues" && <WorkIssues v={v} />}
                  {!route && tab === "work" && cur === "Board" && <WorkBoard v={v} />}
                  {!route && tab === "work" && cur === "Roadmap" && <WorkRoadmap v={v} />}
                  {!route && tab === "work" && cur === "Workflows" && <WorkWorkflows v={v} />}
                  {!route && tab === "work" && cur === "Wiki" && <WorkWiki />}
                  {!route && tab === "inbox" && <InboxView v={v} />}
                  {!route && tab === "people" && cur === "People" && <PeopleView v={v} />}
                  {!route && tab === "people" && cur === "Teams" && <TeamsView v={v} />}
                  {!route && tab === "people" && cur === "Pending invites" && <InvitesView />}
                  {!route && tab === "data" && <DataView v={v} />}
                  {!route && tab === "files" && <FilesView v={v} />}
                  {!route && tab === "integrations" && <ConnectionsView v={v} />}
                  {!route && tab === "settings" && <SettingsView v={v} />}
                </div>
              </div>
            </div>

            {hey ? (
              <div className="bp2-hey" style={{ width: 420, maxWidth: "42%", flex: "none", borderLeft: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", minHeight: 0, position: "relative", zIndex: 500, boxShadow: "-14px 0 40px rgba(26,18,36,.06)" }}>
                <div className="bp2-hey-mobile-bar">
                  <div>
                    <Ico d={PATHS.star} size={15} />
                    <span style={{ flex: 1, font: "600 13.5px Inter,sans-serif" }}>Hey Papership</span>
                    <span style={{ font: "400 11px 'JetBrains Mono',monospace", opacity: 0.8 }}>CCO-245</span>
                    <button type="button" title="Close sheet" onClick={() => setHey(false)} style={{ width: 28, height: 28, border: 0, background: "transparent", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                </div>
                <div className="bp2-hey-desktop-bar" style={{ flex: "none", display: "flex", alignItems: "center", gap: 4, padding: "7px 8px 0", borderBottom: "1px solid var(--line2)" }}>
                  {v.heySessions.map((s) => (
                    <button key={s.label} type="button" style={{ display: "flex", alignItems: "center", gap: 7, maxWidth: 150, height: 29, padding: "0 10px", border: `1px solid ${s.bd}`, borderBottom: 0, borderRadius: "7px 7px 0 0", background: s.bg, color: s.ink, fontSize: 11.5, fontWeight: s.fw, cursor: "pointer" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flex: "none" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    </button>
                  ))}
                  <button type="button" title="New session" style={{ width: 26, height: 26, border: 0, background: "transparent", color: "var(--t3)", borderRadius: 6, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>+</button>
                  <div style={{ flex: 1 }} />
                  <button type="button" onClick={() => setRoute({ kind: "run" })} style={{ height: 24, padding: "0 8px", border: 0, background: "transparent", color: "var(--t3)", borderRadius: 6, font: "500 11px Inter,sans-serif", cursor: "pointer", marginBottom: 4 }}>Technical details</button>
                  <button type="button" title="Close panel" onClick={() => setHey(false)} style={{ width: 26, height: 26, border: 0, background: "transparent", color: "var(--t3)", borderRadius: 6, cursor: "pointer", marginBottom: 4 }}>✕</button>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ alignSelf: "flex-end", maxWidth: "86%", background: "var(--blue-soft)", border: "1px solid rgba(37,99,235,.22)", borderRadius: 10, padding: "9px 11px", fontSize: 12.5 }}>Take CCO-245 through an isolated change and run the checks. Don’t push anything to main.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 12.5, color: "var(--t1)" }}>I’ve created an isolated change on <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>change/cco-245-interception</span> and run the checks — 14 tests passed. To go further I need your approval to open a dry-run pull request<span style={{ display: "inline-block", width: 7, height: 14, background: "var(--blue)", verticalAlign: -2, marginLeft: 2, animation: "ogcaret 1s steps(1) infinite" }} /></div>
                      <div style={{ border: "1px solid var(--line)", borderRadius: 9, overflow: "hidden", background: "var(--canvas)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderBottom: "1px solid var(--line2)" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", animation: "ogblink 1.4s infinite" }} />
                          <span style={{ font: "600 11.5px Inter,sans-serif", flex: 1 }}>run_7f21c · running</span>
                          <a href="#run" onClick={(e) => { e.preventDefault(); setRoute({ kind: "run" }); }}>Open run</a>
                        </div>
                        <div style={{ padding: "9px 11px", fontSize: 11.5, color: "var(--t2)" }}>Read 3 files · wrote 142 lines · ran tests: 14 passed · 12m 04s elapsed</div>
                      </div>
                      <div style={{ border: "1px solid var(--amber)", borderRadius: 9, overflow: "hidden", background: "var(--amber-soft)" }}>
                        <div style={{ padding: "10px 11px 9px" }}>
                          <div style={{ font: "600 12px Inter,sans-serif" }}>Approval needed</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6, font: "400 11px 'JetBrains Mono',monospace", color: "var(--t2)" }}>
                            <span>Action · open a dry-run pull request</span>
                            <span>Target · GitHub · Papership · change/cco-245-interception</span>
                            <span>Version · rev 8f3c1ad</span>
                          </div>
                          <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                            <button type="button" className="bp2-hit" onClick={() => setModal("approve")} style={{ height: 27, padding: "0 12px", border: 0, borderRadius: 6, background: "var(--blue)", color: "#fff", font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>Approve</button>
                            <button type="button" className="bp2-hit" onClick={() => setModal("reject")} style={{ height: 27, padding: "0 12px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>Reject</button>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--raised)", fontSize: 11.5, color: "var(--t2)" }}>
                        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flex: "none" }}><circle cx="8" cy="8" r="6" /><path d="M8 5.2v3.4M8 10.8h.01" strokeLinecap="round" /></svg>
                        Closing this panel won’t stop the work.
                      </div>
                  </div>
                </div>
                <div style={{ flex: "none", borderTop: "1px solid var(--line2)", padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {v.modes.map((m) => (
                      <button key={m.label} type="button" style={{ height: 23, padding: "0 9px", border: `1px solid ${m.bd}`, background: m.bg, color: m.ink, borderRadius: 12, font: "500 11px Inter,sans-serif", cursor: m.cursor }}>{m.label}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 11, background: "var(--raised)", border: "1px solid var(--line2)", font: "500 11px Inter,sans-serif", color: "var(--t2)" }}>
                      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6.4" width="10" height="7" rx="1.4" /><path d="M5.6 6.4V4.8a2.4 2.4 0 0 1 4.8 0v1.6" /></svg>
                      Item · CCO-245
                    </span>
                    <span style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>read-only scope</span>
                  </div>
                  <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Remaining allowance: not captured · action cost: not captured</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 7, border: "1px solid var(--line)", borderRadius: 9, background: "var(--canvas)", padding: "7px 9px" }}>
                      <textarea placeholder="Ask, or describe the outcome you want…" style={{ flex: 1, minHeight: 34, maxHeight: 120, resize: "none", border: 0, background: "transparent", color: "var(--t1)", font: "400 12.5px Inter,sans-serif", outline: "none" }} />
                      <button type="button" title="Wake word unavailable" style={{ width: 26, height: 26, border: "1px solid var(--line2)", background: "transparent", color: "var(--t3)", borderRadius: 6, cursor: "not-allowed", flex: "none" }}>
                        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="2.4" width="4" height="7" rx="2" /><path d="M4 8a4 4 0 0 0 8 0M8 12v1.8" strokeLinecap="round" /><path d="M3 3l10 10" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                    <button type="button" className="bp2-hit" onClick={() => setStreaming((s) => !s)} style={{ height: 34, padding: "0 14px", border: 0, borderRadius: 8, background: streaming ? "var(--red)" : "var(--blue)", color: "#fff", font: "600 12.5px Inter,sans-serif", cursor: "pointer", flex: "none" }}>{streaming ? "Stop" : "Send"}</button>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--t3)" }}>Enter sends · Shift+Enter for a new line. Hey Papership acts with your access — never more.</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bp2-status" style={{ flex: "none", position: "relative", zIndex: 10050, borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
            {statusOpen ? (
              <div style={{ maxHeight: "40vh", overflow: "auto", borderBottom: "1px solid var(--line2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--line2)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Platform activity · last 80 events</span>
                  <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Australia/Sydney</span>
                </div>
                {v.auditEvents.map((e) => (
                  <div key={e.time + e.text} style={{ display: "grid", gridTemplateColumns: "78px 110px minmax(0,1fr)", gap: 12, alignItems: "center", padding: "6px 14px", borderBottom: "1px solid var(--line2)" }}>
                    <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{e.time}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: e.dot }} />{e.kind}</span>
                    <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.text}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div onClick={() => setStatusOpen((o) => !o)} style={{ height: 32, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", cursor: "pointer" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "var(--green)" : "var(--red)", flex: "none", animation: "ogblink 1.8s infinite" }} />
              <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", flex: "none" }}>{online ? "12s ago" : "Offline"}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{online ? "Checks passed for CCO-245 — 14 tests, 0 failures" : "Last known state · work already started continues in the cloud"}</span>
              <span className="bp2-status-live" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 9px", borderRadius: 10, background: online ? "var(--green-soft)" : "var(--red-soft)", color: online ? "var(--green)" : "var(--red)", font: "600 10.5px Inter,sans-serif", flex: "none" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "var(--green)" : "var(--red)", animation: "ogblink 1.8s infinite" }} />{online ? "Live" : "Offline"}
              </span>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="var(--t3)" strokeWidth="1.8" style={{ flex: "none", transform: statusOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}><path d="m4 10 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <nav className="bp2-bottom" aria-label="Primary">
            {BOTTOM_TABS.map((k) => (
              <button key={k} type="button" data-on={!hey && tab === k && !route ? "1" : "0"} onClick={go(k)}>
                <Ico d={TABDEF[k].d} size={19} />
                {TABDEF[k].label}
              </button>
            ))}
            <button type="button" data-on={hey ? "1" : "0"} onClick={() => { setHey(true); setRailOpen(false); setPalette(false); setDrawer(false); }}>
              <Ico d={PATHS.star} size={19} />
              Hey Papership
            </button>
          </nav>
        </div>
      )}

      {palette ? (
        <div className="bp2-palette" onClick={() => setPalette(false)} style={{ position: "absolute", inset: 0, zIndex: 400, background: "rgba(12,6,24,.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 104 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "calc(100% - 32px)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line2)" }}>
              <SearchIco />
              <input autoFocus placeholder="Search anything" style={{ flex: 1, border: 0, background: "transparent", color: "var(--t1)", font: "400 14px Inter,sans-serif", outline: "none" }} />
              <span style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" }}>esc</span>
            </div>
            <div style={{ maxHeight: 400, overflow: "auto", padding: 6 }}>
              {v.paletteGroups.map((g) => (
                <div key={g.label}>
                  <div style={{ padding: "8px 9px 4px", font: "600 10px Inter,sans-serif", letterSpacing: ".09em", textTransform: "uppercase", color: "var(--t3)" }}>{g.label}</div>
                  {g.items.map((i) => (
                    <div key={i.label} onClick={i.go} style={{ display: "flex", alignItems: "center", gap: 10, height: 32, padding: "0 9px", borderRadius: 7, cursor: "pointer" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: i.dot, flex: "none" }} />
                      <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.label}</span>
                      <span style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{i.meta}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {drawer ? (
        <div onClick={() => setDrawer(false)} style={{ position: "absolute", inset: 0, zIndex: 440, background: "rgba(12,6,24,.28)" }}>
          <div className="bp2-drawer" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 60, right: 0, bottom: 32, width: 360, background: "var(--surface)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--line2)" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
              <button type="button" style={{ height: 24, padding: "0 9px", border: 0, background: "transparent", color: "var(--blue)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>Mark all read</button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {v.notifications.map((n) => (
                <div key={n.text} onClick={n.go} style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--line2)", cursor: "pointer", background: n.bg }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.dot, marginTop: 4, flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: n.fw }}>{n.text}</div>
                    <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 3 }}>{n.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {slide ? (
        <div onClick={() => setSlide(null)} style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(12,6,24,.28)" }}>
          <div className="bp2-slide" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 60, right: 0, bottom: 32, width: 460, background: "var(--surface)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line2)" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{slide.title}</div>
              <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 3 }}>{slide.meta}</div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--t2)" }}>{slide.body}</p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid var(--line2)" }}>
              <button type="button" className="bp2-hit" onClick={() => setSlide(null)} style={{ height: 30, padding: "0 13px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--t1)", borderRadius: 6, font: "600 12px Inter,sans-serif", cursor: "pointer" }}>Close</button>
              <button type="button" className="bp2-hit" onClick={() => setSlide(null)} style={{ height: 30, padding: "0 13px", border: 0, borderRadius: 6, background: "var(--blue)", color: "#fff", font: "600 12px Inter,sans-serif", cursor: "pointer" }}>Open</button>
            </div>
          </div>
        </div>
      ) : null}

      {md ? (
        <div className="bp2-modal" onClick={() => setModal(null)} style={{ position: "absolute", inset: 0, zIndex: 300, background: "rgba(12,6,24,.46)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: modal === "wizard" ? 520 : 440, maxWidth: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "15px 17px 13px", borderBottom: "1px solid var(--line2)" }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{md.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 4 }}>{md.body}</div>
            </div>
            {modal === "wizard" ? (
              <div style={{ padding: "14px 17px" }}>
                <div style={{ border: "1px solid var(--line)", borderRadius: 9, padding: 13, background: "var(--canvas)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 9 }}>Grant scopes</div>
                  {(v.wizardProviders || []).map((row) => {
                    const id = row.id || row.name;
                    const on = wizardPick === id;
                    return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setWizardPick(id)}
                      style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%", padding: "8px 8px", margin: "0 -8px", border: 0, borderRadius: 6, borderBottom: on ? 0 : "1px solid var(--line2)", background: on ? "var(--blue-soft)" : "transparent", color: "inherit", cursor: "pointer", font: "inherit" }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? "var(--blue)" : "inherit" }}>{row.label || row.name}</span>
                      <span style={{ fontSize: 11.5, color: "var(--t3)" }}>{row.status || "planned"}</span>
                    </button>
                    );
                  })}
                  {wizardError ? <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--red)" }}>{wizardError}</div> : null}
                  <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 7, background: "var(--raised)", fontSize: 11.5, color: "var(--t2)" }}>
                    {wizardPick === "slack"
                      ? "Continue opens Slack’s site. Google sign-in on Slack is only Slack’s login, not Gmail."
                      : wizardPick === "gmail"
                        ? "Continue opens Google’s site for Gmail only. Slack is a separate Set up."
                        : "Authorisation happens in your browser, on the provider’s own site. Papership never asks for your provider password or keys."}
                  </div>
                </div>
              </div>
            ) : null}
            {modal === "revoke" || modal === "reject" ? (
              <div style={{ padding: "14px 17px" }}>
                <div style={{ padding: "11px 12px", borderRadius: 8, background: "var(--red-soft)", border: "1px solid rgba(225,29,72,.3)", fontSize: 12.5 }}>{md.body}</div>
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "13px 17px", borderTop: "1px solid var(--line2)", background: "var(--canvas)" }}>
              <button type="button" className="bp2-hit" onClick={() => setModal(null)} style={{ height: 30, padding: "0 13px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--t1)", borderRadius: 6, font: "600 12px Inter,sans-serif", cursor: "pointer" }}>{md.cancel}</button>
              <button type="button" className="bp2-hit" onClick={confirmModal} style={{ height: 30, padding: "0 14px", border: 0, borderRadius: 6, background: md.btn, color: "#fff", font: "600 12px Inter,sans-serif", cursor: "pointer" }}>{modal === "wizard" ? (wizardPick === "slack" ? "Continue to Slack ↗" : wizardPick === "gmail" ? "Continue to Google ↗" : md.confirm) : md.confirm}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}