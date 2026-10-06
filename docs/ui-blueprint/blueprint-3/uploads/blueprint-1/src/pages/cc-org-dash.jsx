// cc-org-dash — GitHub-inspired Business Command Center
import { useState, useEffect } from "react";
import { THEMES, Avi, F, PrimaryNavTabs, SlideOver } from "../components/cc-org-dash/primitives";
import { DB } from "../components/cc-org-dash/data";
import HomeScreen from "../components/cc-org-dash/HomeScreen";
import WorkScreen from "../components/cc-org-dash/WorkScreen";
import InboxScreen from "../components/cc-org-dash/InboxScreen";
import PeopleScreen from "../components/cc-org-dash/PeopleScreen";
import DataScreen from "../components/cc-org-dash/DataScreen";
import FilesScreen from "../components/cc-org-dash/FilesScreen";
import IntegrationsScreen from "../components/cc-org-dash/IntegrationsScreen";
import SettingsScreen from "../components/cc-org-dash/SettingsScreen";
import AccountScreen from "../components/cc-org-dash/AccountScreen";
import NotifDrawer from "../components/cc-org-dash/NotifDrawer";
import GlobalAgentPanel from "../components/cc-org-dash/GlobalAgentPanel";
import PlatformStatusBar from "../components/cc-org-dash/PlatformStatusBar";
import GlobalCommandRail from "../components/cc-org-dash/GlobalCommandRail";
import GlobalCommandDetail, { getGlobalCommandTitle } from "../components/cc-org-dash/GlobalCommandDetail";
import AuthPortal from "../components/cc-org-dash/AuthPortal";
import useIsMobile from "../components/cc-org-dash/useIsMobile";
import {
  Home, Briefcase, Inbox, Users, BarChart3, FolderOpen, Plug, SettingsIcon,
  Search, Bell, Plus, ChevronDown, User, LogOut, GitBranch, PanelLeft, Bot
} from "../components/cc-org-dash/icons";

const TABS = [
  { id: "home",         label: "Dashboard",     icon: <Home size={16} /> },
  { id: "work",         label: "Work",          icon: <Briefcase size={16} /> },
  { id: "inbox",        label: "Inbox",         icon: <Inbox size={16} /> },
  { id: "people",       label: "People",        icon: <Users size={16} /> },
  { id: "data",         label: "Data",          icon: <BarChart3 size={16} /> },
  { id: "files",        label: "Files",         icon: <FolderOpen size={16} /> },
  { id: "integrations", label: "Integrations",  icon: <Plug size={16} /> },
  { id: "settings",     label: "Settings",      icon: <SettingsIcon size={16} /> },
];

const THEME_KEY = "cc-org-dash-theme";
const THEME_KEY_LEGACY = "ecoos_theme";
const GLOBAL_COMMAND_KEY = "cc-global-command-open";
const AUTH_SESSION_KEY = "cc-org-dash-auth";
const ATLAS_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function readAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(AUTH_SESSION_KEY) : null);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && typeof o.email === "string") return o;
  } catch {
    /* ignore */
  }
  return null;
}

function readGlobalCommandOpen() {
  try {
    const v = localStorage.getItem(GLOBAL_COMMAND_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return typeof window !== "undefined" && window.innerWidth > 768;
}

function readStoredTheme() {
  try {
    return (
      localStorage.getItem(THEME_KEY) ||
      localStorage.getItem(THEME_KEY_LEGACY) ||
      "light"
    );
  } catch {
    return "light";
  }
}

export default function CcOrgDash() {
  const [themeKey, setThemeKey] = useState(readStoredTheme);
  const [authSession, setAuthSession] = useState(() => readAuthSession());
  const T = THEMES[themeKey] || THEMES.light;
  const setTheme = (k) => {
    try {
      localStorage.setItem(THEME_KEY, k);
      localStorage.removeItem(THEME_KEY_LEGACY);
    } catch {
      /* quota / private mode */
    }
    setThemeKey(k);
  };

  const [tab, setTab] = useState("home");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [globalCommandOpen, setGlobalCommandOpen] = useState(readGlobalCommandOpen);
  const [globalCommandSel, setGlobalCommandSel] = useState(null);
  const [globalAgentOpen, setGlobalAgentOpen] = useState(false);
  const isMobile = useIsMobile();

  const setAuth = (payload) => {
    const next = { email: payload.email, name: payload.name || "Member", at: Date.now() };
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      if (payload.remember !== false) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(next));
      } else {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(next));
      }
    } catch {
      /* ignore */
    }
    setAuthSession(next);
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAuthSession(null);
    setProfileOpen(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_COMMAND_KEY, globalCommandOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [globalCommandOpen]);

  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(p => !p); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const unread = DB.notifications.filter(n => !n.read).length;
  const close = () => { setProfileOpen(false); setCreateOpen(false); setGlobalCommandSel(null); };

  if (!authSession) {
    return (
      <AuthPortal
        T={T}
        themeKey={themeKey}
        setTheme={setThemeKey}
        onSuccess={(payload) => setAuth(payload)}
      />
    );
  }

  const displayName = authSession.name || authSession.email?.split("@")[0] || "Member";

  const cmdResults = [
    ...TABS.map(t => ({ label: `Go to ${t.label}`, cat: "Jump to", action: () => { setTab(t.id); setCmdOpen(false); } })),
    { label: "Open Notifications", cat: "Actions", action: () => { setNotifOpen(true); setCmdOpen(false); } },
    { label: "Change Theme", cat: "Actions", action: () => { setTab("settings"); setCmdOpen(false); } },
    { label: "My Account", cat: "Actions", action: () => { setTab("account"); setCmdOpen(false); } },
    ...DB.agents.map(a => ({ label: `Chat with ${a.name}`, cat: "Agents", action: () => { setTab("inbox"); setCmdOpen(false); } })),
  ].filter(r => !cmdQuery || r.label.toLowerCase().includes(cmdQuery.toLowerCase()));
  const grouped = cmdResults.reduce((acc, r) => { (acc[r.cat] = acc[r.cat] || []).push(r); return acc; }, {});

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.pageGradient ?? T.canvas, fontFamily: F.sans, color: T.t1 }} onClick={close}>

      {/* GitHub-style top nav — stays above sliding agent panel so toggles remain clickable */}
      <div
        style={{
          background: T.nav,
          borderBottom: `1px solid ${T.border}`,
          color: T.t1,
          flexShrink: 0,
          position: "relative",
          zIndex: 520,
        }}
      >
        <div style={{ height: isMobile ? 52 : 60, display: "flex", alignItems: "center", padding: isMobile ? "0 10px" : "0 16px", gap: isMobile ? 8 : 16 }}>
          <button
            type="button"
            title={globalCommandOpen ? "Hide company command" : "Open company command"}
            onClick={(e) => {
              e.stopPropagation();
              setGlobalCommandOpen((o) => !o);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              padding: 0,
              borderRadius: 10,
              border: `1px solid ${T.purpleBorder}`,
              background: globalCommandOpen ? T.purpleBg : T.surface,
              cursor: "pointer",
              color: T.purple,
              flexShrink: 0,
              transition: `background .18s ${ATLAS_EASE}, border-color .18s, color .18s`,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                transform: globalCommandOpen ? "scaleX(-1)" : "scaleX(1)",
                transition: `transform 0.32s ${ATLAS_EASE}`,
              }}
            >
              <PanelLeft size={18} strokeWidth={1.5} color="currentColor" />
            </span>
          </button>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <span style={{ color: T.t1, fontSize: isMobile ? 13 : 15, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: F.mono }}>cc-org-dash</span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 400, minWidth: 0 }}>
            <button onClick={e => { e.stopPropagation(); setCmdOpen(true); setCmdQuery(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.t3, fontSize: 13, transition: "all .15s", fontFamily: F.sans }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              <Search size={14} />
              <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isMobile ? "Search" : "Type / to search"}</span>
              {!isMobile && <kbd style={{ color: T.t3, fontSize: 11, fontFamily: F.mono, border: `1px solid ${T.border}`, borderRadius: 3, padding: "0 5px", background: T.surface }}>⌘K</kbd>}
            </button>
          </div>

          {/* Right cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {/* Create menu */}
            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setCreateOpen(p => !p); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", background: "none", border: "none", cursor: "pointer", color: T.t2, borderRadius: 6, transition: "all .12s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.hover}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <Plus size={16} />
                {!isMobile && <ChevronDown size={12} />}
              </button>
              {createOpen && (
                <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 180, zIndex: 200, boxShadow: T.shadowLg, overflow: "hidden" }}>
                  {[
                    { l: "New project",     a: () => { setTab("work"); setCreateOpen(false); } },
                    { l: "New issue",       a: () => { setTab("work"); setCreateOpen(false); } },
                    { l: "New workflow",    a: () => { setTab("work"); setCreateOpen(false); } },
                    { l: "New team",        a: () => { setTab("people"); setCreateOpen(false); } },
                    { l: "Invite member",   a: () => { setTab("people"); setCreateOpen(false); } },
                    { l: "Upload file",     a: () => { setTab("files"); setCreateOpen(false); } },
                  ].map(item => (
                    <button key={item.l} onClick={item.a} style={{ width: "100%", background: "none", border: "none", padding: "8px 14px", textAlign: "left", fontSize: 13, color: T.t1, cursor: "pointer", fontFamily: F.sans, transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.hover}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>{item.l}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <button onClick={e => { e.stopPropagation(); setNotifOpen(p => !p); }}
              style={{ position: "relative", padding: "6px", background: "none", border: "none", cursor: "pointer", color: T.t2, borderRadius: 6, display: "flex", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = T.hover}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <Bell size={18} />
              {unread > 0 && <span style={{ position: "absolute", top: 3, right: 3, width: 8, height: 8, borderRadius: "50%", background: T.accent, border: `2px solid ${T.nav}` }} />}
            </button>

            {/* Profile dropdown */}
            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setProfileOpen(p => !p); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px", background: "none", border: "none", cursor: "pointer", borderRadius: "50%", transition: "all .15s" }}>
                <Avi name={displayName} size={26} />
              </button>
              {profileOpen && (
                <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 220, zIndex: 200, boxShadow: T.shadowLg, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ color: T.t1, fontSize: 13 }}>Signed in as</div>
                    <div style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>{displayName}</div>
                    <div style={{ color: T.t3, fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>{authSession.email}</div>
                  </div>
                  {[
                    { l: "Your profile",   icon: <User size={15} />, a: () => { setTab("account"); setProfileOpen(false); } },
                    { l: "Your projects",  icon: <GitBranch size={15} />, a: () => { setTab("work"); setProfileOpen(false); } },
                    { l: "Settings",       icon: <SettingsIcon size={15} />, a: () => { setTab("settings"); setProfileOpen(false); } },
                  ].map(item => (
                    <button key={item.l} onClick={item.a} style={{ width: "100%", background: "none", border: "none", padding: "8px 14px", textAlign: "left", fontSize: 13, color: T.t1, cursor: "pointer", fontFamily: F.sans, display: "flex", alignItems: "center", gap: 10, transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.hover}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <span style={{ color: T.t3, display: "flex" }}>{item.icon}</span>{item.l}
                    </button>
                  ))}
                  <div style={{ borderTop: `1px solid ${T.border}` }}>
                    <button type="button" onClick={() => logout()} style={{ width: "100%", background: "none", border: "none", padding: "8px 14px", textAlign: "left", fontSize: 13, color: T.t1, cursor: "pointer", fontFamily: F.sans, display: "flex", alignItems: "center", gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.background = T.hover}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <LogOut size={15} color={T.t3} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              title={globalAgentOpen ? "Close platform agent" : "Open platform agent"}
              onClick={(e) => {
                e.stopPropagation();
                setGlobalAgentOpen((o) => !o);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${T.purpleBorder}`,
                background: globalAgentOpen ? T.purpleBg : T.surface,
                cursor: "pointer",
                color: T.purple,
                flexShrink: 0,
                transition: `background .18s ${ATLAS_EASE}, border-color .18s, color .18s`,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  transform: globalAgentOpen ? "scaleX(-1)" : "scaleX(1)",
                  transition: `transform 0.32s ${ATLAS_EASE}`,
                }}
              >
                <Bot size={18} strokeWidth={1.5} color="currentColor" />
              </span>
            </button>
          </div>
        </div>

        {/* Primary routes — notched “lifted” tabs */}
        <div style={{ borderTop: `1px solid ${T.borderMuted ?? T.border}` }}>
          <PrimaryNavTabs
            T={T}
            tabs={TABS.map((t) =>
              t.id === "inbox" && unread > 0 ? { ...t, badge: unread } : t
            )}
            active={tab}
            onChange={setTab}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Body: global command rail + main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
          {isMobile && !globalCommandOpen && (
            <div style={{ padding: "0 12px 10px", flexShrink: 0, boxSizing: "border-box", width: "100%" }}>
              <button
                type="button"
                title="Open company command"
                onClick={(e) => {
                  e.stopPropagation();
                  setGlobalCommandOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 14px",
                  width: "100%",
                  borderRadius: 10,
                  border: `1px solid ${T.purpleBorder}`,
                  background: T.surface,
                  color: T.purple,
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ display: "inline-flex" }}>
                  <PanelLeft size={18} strokeWidth={1.5} color="currentColor" />
                </span>
              </button>
            </div>
          )}

          {(!isMobile || globalCommandOpen) && (
            <GlobalCommandRail
              T={T}
              isOpen={globalCommandOpen}
              onToggle={() => setGlobalCommandOpen((o) => !o)}
              onSelectDetail={(sel) => setGlobalCommandSel(sel)}
              isMobile={isMobile}
            />
          )}

          <div
            style={{
              flex: "1 1 0%",
              minWidth: 0,
              minHeight: 0,
              maxWidth: "100%",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              boxSizing: "border-box",
              paddingBottom: 38,
            }}
            onClick={close}
          >
            <div
              style={{
                maxWidth: 1280,
                width: "100%",
                alignSelf: "center",
                padding: isMobile ? "16px 12px" : "24px 28px",
                boxSizing: "border-box",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {tab === "home"         && <HomeScreen T={T} isMobile={isMobile} />}
              {tab === "work"         && <WorkScreen T={T} isMobile={isMobile} />}
              {tab === "inbox"        && <InboxScreen T={T} isMobile={isMobile} />}
              {tab === "people"       && <PeopleScreen T={T} isMobile={isMobile} />}
              {tab === "data"         && <DataScreen T={T} isMobile={isMobile} />}
              {tab === "files"        && <FilesScreen T={T} isMobile={isMobile} />}
              {tab === "integrations" && <IntegrationsScreen T={T} isMobile={isMobile} />}
              {tab === "settings"     && <SettingsScreen T={T} themeKey={themeKey} setTheme={setTheme} isMobile={isMobile} />}
              {tab === "account"      && <AccountScreen T={T} setTab={setTab} isMobile={isMobile} />}
            </div>
          </div>
        </div>
      </div>

      <SlideOver
        T={T}
        open={!!globalCommandSel}
        onClose={() => setGlobalCommandSel(null)}
        title={getGlobalCommandTitle(globalCommandSel)}
        subtitle="Company command · extended view"
        width={460}
      >
        <GlobalCommandDetail T={T} selection={globalCommandSel} setTab={setTab} onClose={() => setGlobalCommandSel(null)} />
      </SlideOver>

      {notifOpen && <NotifDrawer T={T} onClose={() => setNotifOpen(false)} />}

      <GlobalAgentPanel
        T={T}
        open={globalAgentOpen}
        onClose={() => setGlobalAgentOpen(false)}
        isMobile={isMobile}
        topOffsetPx={isMobile ? 104 : 116}
      />

      <PlatformStatusBar T={T} />

      {cmdOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "14vh" }}
          onClick={() => setCmdOpen(false)}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, width: isMobile ? "92vw" : 520, maxWidth: 520, maxHeight: 400, overflow: "auto", boxShadow: T.shadowLg }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
              <Search size={15} color={T.t3} />
              <input autoFocus value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                placeholder="Jump to a page, search agents, actions..." style={{ flex: 1, background: "none", border: "none", color: T.t1, fontSize: 14, outline: "none", fontFamily: F.sans }} />
              <kbd style={{ color: T.t3, fontSize: 11, fontFamily: F.mono, border: `1px solid ${T.border}`, borderRadius: 3, padding: "2px 6px", background: T.raised }}>ESC</kbd>
            </div>
            <div>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ padding: "8px 16px 4px", color: T.t3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cat}</div>
                  {items.map(item => (
                    <button key={item.label} onClick={item.action}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: F.sans, textAlign: "left", transition: "background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.hover}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <span style={{ color: T.t1, fontSize: 13 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              {cmdResults.length === 0 && <div style={{ padding: "24px 16px", textAlign: "center", color: T.t3, fontSize: 13 }}>No results found</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}