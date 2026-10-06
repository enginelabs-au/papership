import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Btn, Badge, F, SubNav, SlideOver, Avi } from "./primitives";
import { DB, INBOX_THREADS, INBOX_WORKSPACES } from "./data";
import {
  Inbox,
  AtSign,
  Star,
  Archive,
  Search,
  Edit2,
  Attach,
  Smile,
  Code2,
  Bot,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  Users,
  ChevronDown,
  Briefcase,
  FolderOpen,
  List,
  Clock,
  AlertCircle,
  Activity,
  ExternalLink,
  CircleDot,
  UserPlus,
  Plus,
} from "./icons";

const RAIL = {
  nav: { open: 236, closed: 50 },
  detail: { open: 292, closed: 50 },
};
const SW = 1.5;
const LS_NAV = "ccod_inbox_rail_nav";
const LS_DETAIL = "ccod_inbox_rail_detail";

function loadRail(key, def = true) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v !== "0";
  } catch {
    return def;
  }
}

function statusColor(T, status) {
  if (status === "open") return T.accent;
  if (status === "pending") return T.amber;
  if (status === "on_hold") return T.t3;
  if (status === "solved") return T.green;
  return T.t3;
}

function priorityLabel(p) {
  if (p === "urgent") return "Urgent";
  if (p === "high") return "High";
  if (p === "normal") return "Normal";
  return "Low";
}

const INTERNAL_NOTES = {
  thag1: [{ author: "Sarah Mitchell", time: "Mon 10:12", text: "Legal signed off on DPA 2.1 — proceed with pricing." }],
  thag2: [{ author: "Priya Sharma", time: "Tue 14:02", text: "Waiting on Finance for Q1 actuals before we tighten the band." }],
  thag3: [{ author: "James Kowalski", time: "Wed 09:41", text: "Heap dump attached in Jira — pool leak in idle connections." }],
  thag4: [{ author: "Marco Reyes", time: "Today", text: "APAC queue spike — temp macro deployed." }],
  thag5: [{ author: "Admin", time: "Apr 17", text: "Auditor asked for evidence pack v3 — uploaded to shared drive." }],
};

function noteKey(threadId) {
  return threadId.replace(/-/g, "");
}

const ATLAS_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function InboxScreen({ T, isMobile }) {
  const [navOpen, setNavOpen] = useState(() => loadRail(LS_NAV, true));
  const [detailOpen, setDetailOpen] = useState(() => loadRail(LS_DETAIL, true));
  const [openTabIds, setOpenTabIds] = useState(() =>
    INBOX_THREADS.length ? INBOX_THREADS.slice(0, Math.min(4, INBOX_THREADS.length)).map((t) => t.id) : []
  );
  const [addTabMenuOpen, setAddTabMenuOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("all");
  const [inboxView, setInboxView] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [activeThreadId, setActiveThreadId] = useState(INBOX_THREADS[0]?.id ?? "");
  const [composeKind, setComposeKind] = useState("public");
  const [msg, setMsg] = useState("");
  const [chats, setChats] = useState(DB.chats);
  const [reactions, setReactions] = useState({});
  const [subTab, setSubTab] = useState("all");
  const [mobilePane, setMobilePane] = useState("thread");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const endRef = useRef(null);
  const addTabRef = useRef(null);

  const persistNav = useCallback((v) => {
    setNavOpen(v);
    try {
      localStorage.setItem(LS_NAV, v ? "1" : "0");
    } catch { /* ignore */ }
  }, []);
  const persistDetail = useCallback((v) => {
    setDetailOpen(v);
    try {
      localStorage.setItem(LS_DETAIL, v ? "1" : "0");
    } catch { /* ignore */ }
  }, []);

  const addTicketTab = useCallback((threadId) => {
    setOpenTabIds((ids) => (ids.includes(threadId) ? ids : [...ids, threadId]));
    setActiveThreadId(threadId);
    setAddTabMenuOpen(false);
  }, []);

  const removeTicketTab = useCallback((threadId, e) => {
    e?.stopPropagation?.();
    setOpenTabIds((ids) => {
      if (ids.length <= 1) return ids;
      return ids.filter((id) => id !== threadId);
    });
  }, []);

  const filteredThreads = useMemo(() => {
    let rows = [...INBOX_THREADS];
    if (workspaceId !== "all") rows = rows.filter((t) => t.projectId === workspaceId);
    if (inboxView === "mine") rows = rows.filter((t) => t.assignee === "Sarah Mitchell");
    if (inboxView === "unassigned") rows = rows.filter((t) => t.assignee === "Unassigned");
    if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);
    if (channelFilter !== "all") rows = rows.filter((t) => t.channel === channelFilter);
    if (assigneeFilter !== "all") rows = rows.filter((t) => t.assignee === assigneeFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.ticketId.toLowerCase().includes(q) ||
          t.requester.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q)
      );
    }
    if (sortKey === "oldest") rows.reverse();
    return rows;
  }, [workspaceId, inboxView, statusFilter, channelFilter, assigneeFilter, searchQuery, sortKey]);

  const assigneeList = useMemo(() => {
    const s = new Set(INBOX_THREADS.map((t) => t.assignee));
    return ["all", ...Array.from(s)];
  }, []);

  const filterPills = useMemo(() => {
    const pills = [];
    if (statusFilter !== "all") pills.push({ key: "st", label: `Status: ${statusFilter}`, clear: () => setStatusFilter("all") });
    if (channelFilter !== "all") pills.push({ key: "ch", label: `Channel: ${channelFilter}`, clear: () => setChannelFilter("all") });
    if (assigneeFilter !== "all") pills.push({ key: "as", label: `Assignee: ${assigneeFilter}`, clear: () => setAssigneeFilter("all") });
    if (inboxView !== "all") pills.push({ key: "iv", label: inboxView === "mine" ? "Assigned to me" : "Unassigned", clear: () => setInboxView("all") });
    pills.push({
      key: "sort",
      label: sortKey === "newest" ? "Newest" : "Oldest",
      clear: () => setSortKey(sortKey === "newest" ? "oldest" : "newest"),
    });
    return pills;
  }, [statusFilter, channelFilter, assigneeFilter, inboxView, sortKey]);

  const ticketsAvailableToAdd = useMemo(
    () => filteredThreads.filter((t) => !openTabIds.includes(t.id)),
    [filteredThreads, openTabIds]
  );

  useEffect(() => {
    if (!filteredThreads.some((t) => t.id === activeThreadId)) {
      setActiveThreadId(filteredThreads[0]?.id ?? "");
    }
  }, [filteredThreads, activeThreadId]);

  useEffect(() => {
    if (openTabIds.length === 0 && INBOX_THREADS[0]?.id) {
      setOpenTabIds([INBOX_THREADS[0].id]);
      return;
    }
    if (!openTabIds.includes(activeThreadId) && openTabIds.length) {
      setActiveThreadId(openTabIds[0]);
    }
  }, [openTabIds, activeThreadId]);

  const thread = INBOX_THREADS.find((t) => t.id === activeThreadId);
  const activeAgent = thread?.agentId;
  const agent = activeAgent ? DB.agents.find((a) => a.id === activeAgent) : undefined;
  const msgs = activeAgent ? chats[activeAgent] || [] : [];
  const sc = { online: T.green, idle: T.amber, paused: T.t3 };

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [activeAgent, chats, activeThreadId]);

  useEffect(() => {
    function onDocDown(e) {
      if (!addTabMenuOpen) return;
      const el = addTabRef.current;
      if (el && !el.contains(e.target)) setAddTabMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [addTabMenuOpen]);

  useEffect(() => {
    if (isMobile && !thread && mobilePane === "detail") {
      setMobilePane("thread");
    }
  }, [isMobile, thread, mobilePane]);

  const send = () => {
    if (!msg.trim() || !activeAgent) return;
    const t = new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    const ag = DB.agents.find((a) => a.id === activeAgent);
    const role = composeKind === "internal" ? "internal" : "user";
    const name = composeKind === "internal" ? "Internal note" : "You";
    setChats((p) => ({
      ...p,
      [activeAgent]: [
        ...(p[activeAgent] || []),
        { role, name, content: msg, time: t },
        ...(composeKind === "public"
          ? [{ role: "assistant", name: ag?.name, content: "[Connect your OpenAI key in Settings → AI & Agents to enable live responses]", time: t }]
          : []),
      ],
    }));
    setMsg("");
  };

  const addReaction = (agId, idx, emoji) => {
    const key = `${agId}-${idx}`;
    setReactions((p) => {
      const curr = p[key] || [];
      return { ...p, [key]: curr.includes(emoji) ? curr.filter((e) => e !== emoji) : [...curr, emoji] };
    });
  };

  const grouped = [{ date: "Today", messages: msgs }];

  const inboxSubTabs = [
    { id: "all", label: "All", icon: <Inbox size={16} />, count: INBOX_THREADS.length },
    { id: "mentions", label: "Mentions", icon: <AtSign size={16} />, count: 2 },
    { id: "starred", label: "Starred", icon: <Star size={16} /> },
    { id: "archived", label: "Archived", icon: <Archive size={16} /> },
  ];

  const notes = INTERNAL_NOTES[noteKey(activeThreadId)] || [];

  const EmptyMain = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 24,
        background: T.canvas,
        color: T.t3,
        textAlign: "center",
        overflow: "auto",
      }}
    >
      <Inbox size={36} color={T.t4} />
      <div style={{ fontSize: 15, fontWeight: 600, color: T.t2 }}>No ticket in view</div>
      <div style={{ fontSize: 13, maxWidth: 280 }}>Adjust filters or select a ticket from the list.</div>
    </div>
  );

  const navW = navOpen ? RAIL.nav.open : RAIL.nav.closed;
  const detailW = detailOpen ? RAIL.detail.open : RAIL.detail.closed;

  const NavSections = (
    <>
      {navOpen && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.t4, marginBottom: 8, paddingLeft: 2 }}>WORKSPACE</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: navOpen ? 14 : 6 }}>
        {INBOX_WORKSPACES.map((w) => {
          const on = workspaceId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              title={w.label}
              onClick={() => setWorkspaceId(w.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: navOpen ? "7px 10px" : "8px 6px",
                justifyContent: navOpen ? "flex-start" : "center",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: F.sans,
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                color: on ? T.accent : T.t2,
                background: on ? T.accentBg : "transparent",
                transition: "background .12s, color .12s",
              }}
            >
              {w.id === "all" ? (
                <Briefcase size={16} strokeWidth={SW} color={on ? T.accent : T.t3} />
              ) : (
                <FolderOpen size={16} strokeWidth={SW} color={on ? T.accent : T.t3} />
              )}
              {navOpen && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.label}</span>}
            </button>
          );
        })}
      </div>

      {navOpen && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.t4, marginBottom: 8, paddingLeft: 2 }}>INBOX</div>}
      {[
        ["all", "All", INBOX_THREADS.length],
        ["mine", "Assigned to me", INBOX_THREADS.filter((t) => t.assignee === "Sarah Mitchell").length],
        ["unassigned", "Unassigned", INBOX_THREADS.filter((t) => t.assignee === "Unassigned").length],
      ].map(([id, label, count]) => {
        const on = inboxView === id;
        const collapsedIcon =
          id === "all" ? (
            <Inbox size={17} strokeWidth={SW} color={on ? T.accent : T.t3} />
          ) : id === "mine" ? (
            <AtSign size={17} strokeWidth={SW} color={on ? T.accent : T.t3} />
          ) : (
            <UserPlus size={17} strokeWidth={SW} color={on ? T.accent : T.t3} />
          );
        return (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => setInboxView(id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: navOpen ? "space-between" : "center",
              padding: navOpen ? "7px 10px" : "8px 6px",
              marginBottom: 2,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: F.sans,
              fontSize: 13,
              fontWeight: on ? 600 : 500,
              color: on ? T.t1 : T.t2,
              background: on ? T.surface : "transparent",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {navOpen ? (
              <>
                <span>{label}</span>
                <span style={{ fontSize: 12, color: T.t4, fontVariantNumeric: "tabular-nums" }}>{count}</span>
              </>
            ) : (
              collapsedIcon
            )}
          </button>
        );
      })}

      {navOpen && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.t4, margin: "14px 0 8px", paddingLeft: 2 }}>STATUS</div>}
      {["all", "open", "pending", "on_hold"].map((st) => {
        const on = statusFilter === st;
        const lab = st === "all" ? "All" : st.replace("_", " ");
        return (
          <button
            key={st}
            type="button"
            title={lab}
            onClick={() => setStatusFilter(st)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: navOpen ? "6px 10px" : "8px 6px",
              marginBottom: 2,
              justifyContent: navOpen ? "flex-start" : "center",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: F.sans,
              fontSize: 12,
              fontWeight: on ? 600 : 500,
              color: on ? T.t1 : T.t3,
              background: "transparent",
              width: "100%",
            }}
          >
            {!navOpen && st === "all" && <List size={16} strokeWidth={SW} color={on ? T.accent : T.t3} />}
            {!navOpen && st === "open" && <CircleDot size={16} strokeWidth={SW} color={T.accent} />}
            {!navOpen && st === "pending" && <Clock size={16} strokeWidth={SW} color={on ? T.accent : T.amber} />}
            {!navOpen && st === "on_hold" && <AlertCircle size={16} strokeWidth={SW} color={on ? T.accent : T.t3} />}
            {navOpen && st !== "all" && <span style={{ width: 8, height: 8, borderRadius: 2, background: statusColor(T, st), flexShrink: 0 }} />}
            {navOpen && <span style={{ textTransform: "capitalize" }}>{lab}</span>}
          </button>
        );
      })}

      {navOpen && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.t4, margin: "14px 0 8px", paddingLeft: 2 }}>CHANNEL</div>}
      {[
        ["all", "All"],
        ["email", "Email"],
        ["slack", "Slack"],
        ["web", "Web"],
      ].map(([id, lab]) => {
        const on = channelFilter === id;
        const iconColor = on ? T.accent : T.t3;
        return (
          <button
            key={id}
            type="button"
            title={lab}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setChannelFilter(id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: navOpen ? 8 : 0,
              padding: navOpen ? "6px 10px" : "8px 6px",
              marginBottom: 2,
              justifyContent: navOpen ? "flex-start" : "center",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: F.sans,
              fontSize: 12,
              color: on ? T.accent : T.t3,
              fontWeight: on ? 600 : 500,
              background: on ? T.accentBg : "transparent",
              width: "100%",
              minHeight: 34,
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {id === "all" && <List size={15} strokeWidth={SW} color={iconColor} />}
              {id === "email" && <Mail size={15} strokeWidth={SW} color={iconColor} />}
              {id === "slack" && <Activity size={15} strokeWidth={SW} color={iconColor} />}
              {id === "web" && <ExternalLink size={15} strokeWidth={SW} color={iconColor} />}
            </span>
            {navOpen && <span style={{ minWidth: 0, textAlign: "left" }}>{id === "all" ? "All channels" : lab}</span>}
          </button>
        );
      })}

      {navOpen && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.t4, margin: "14px 0 8px", paddingLeft: 2 }}>TEAM</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {assigneeList.slice(1, 6).map((name) => {
          const on = assigneeFilter === name;
          const person = DB.people.find((p) => p.name === name);
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => setAssigneeFilter(on ? "all" : name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: navOpen ? "4px 6px" : "6px 4px",
                justifyContent: navOpen ? "flex-start" : "center",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: on ? T.accentBg : "transparent",
                width: "100%",
              }}
            >
              <Avi name={name} size={navOpen ? 26 : 22} />
              {navOpen && (
                <span style={{ fontSize: 12, color: on ? T.accent : T.t2, fontWeight: on ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {person?.name ?? name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const FilterPillsBar = (
    <div style={{ padding: "6px 0 8px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {filterPills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={p.clear}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 99,
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.t2,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: F.sans,
          }}
        >
          {p.label}
          <span style={{ color: T.t4, fontSize: 12 }}>×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setSortKey((k) => (k === "newest" ? "oldest" : "newest"))}
        style={{
          marginLeft: "auto",
          padding: "4px 8px",
          borderRadius: 6,
          border: `1px solid ${T.borderMuted ?? T.border}`,
          background: "transparent",
          color: T.t3,
          fontSize: 11,
          cursor: "pointer",
          fontFamily: F.sans,
        }}
      >
        Sort · {sortKey}
      </button>
    </div>
  );

  const DetailPanel = thread && (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "12px 14px",
        boxSizing: "border-box",
      }}
    >
      {detailOpen && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>Requester</div>
            <Btn T={T} small variant="default">
              <Edit2 size={12} /> Edit
            </Btn>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <Avi name={thread.requester} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: T.t1, fontSize: 14 }}>{thread.requester}</div>
              <div style={{ fontSize: 12, color: T.t3 }}>Via {thread.channel} · {thread.updated}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {[
              ["Ticket", thread.ticketId],
              ["Channel", thread.channel],
              ["Project", thread.project],
              ["Assignee", thread.assignee],
              ["Priority", priorityLabel(thread.priority)],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: T.t4, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, color: T.t1, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, marginBottom: 8 }}>TAGS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {["enterprise", thread.status, thread.channel].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: T.raised,
                  border: `1px solid ${T.border}`,
                  color: T.t2,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 8 }}>Internal notes</div>
            {notes.map((n, i) => (
              <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < notes.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Avi name={n.author} size={22} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{n.author}</div>
                    <div style={{ fontSize: 10, color: T.t4 }}>{n.time}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>{n.text}</div>
              </div>
            ))}
            <input
              placeholder="Write a note…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.raised,
                color: T.t1,
                fontSize: 12,
                fontFamily: F.sans,
                outline: "none",
              }}
            />
          </div>
        </>
      )}
    </div>
  );

  const ChatHeader = agent && thread && (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        background: T.surface,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: T.accent }}>{thread.ticketId}</span>
          <Badge T={T} color={statusColor(T, thread.status)}>{thread.status.replace("_", " ")}</Badge>
          <span style={{ fontSize: 11, color: T.t4 }}>{priorityLabel(thread.priority)}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.t1, letterSpacing: "-0.02em" }}>{thread.subject}</div>
        <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
          {agent.name} · {agent.model} · Assigned to {thread.assignee}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
        <Btn T={T} small variant="default">
          Pause
        </Btn>
        <Btn T={T} small variant="default">
          Close <ChevronDown size={12} />
        </Btn>
        {!isMobile && (
          <Btn T={T} small variant="default">
            <Users size={14} />
          </Btn>
        )}
        {isMobile && (
          <Btn T={T} small variant="primary" onClick={() => setMobilePane("detail")}>
            Details
          </Btn>
        )}
      </div>
    </div>
  );

  const MessageArea = (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch", padding: "14px 16px", background: T.canvas }}>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: T.t4,
          marginBottom: 12,
          padding: "6px 12px",
          background: T.surface,
          borderRadius: 8,
          border: `1px dashed ${T.border}`,
          maxWidth: 420,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Ticket thread · messages sync with {agent?.name}. Treat each conversation as a ticketed item.
      </div>
      {grouped.map((group) => (
        <div key={group.date}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ color: T.t3, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{group.date}</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>
          {group.messages.map((m, i) => {
            const isUser = m.role === "user";
            const isInternal = m.role === "internal";
            const key = `${activeAgent}-${i}`;
            const rxns = reactions[key] || [];
            const prevRole = i > 0 ? group.messages[i - 1].role : null;
            const sameAuthor = prevRole === m.role;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isUser || isInternal ? "flex-end" : "flex-start",
                  marginBottom: sameAuthor ? 2 : 10,
                  position: "relative",
                }}
              >
                {!isUser && !isInternal && !sameAuthor && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: T.t2,
                      flexShrink: 0,
                      alignSelf: "flex-end",
                      marginRight: 8,
                    }}
                  >
                    <Bot size={14} />
                  </div>
                )}
                {!isUser && !isInternal && sameAuthor && <div style={{ width: 36, flexShrink: 0 }} />}
                <div style={{ maxWidth: "72%" }}>
                  {!sameAuthor && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                        justifyContent: isUser || isInternal ? "flex-end" : "flex-start",
                      }}
                    >
                      <span style={{ color: T.t1, fontSize: 12, fontWeight: 600 }}>{m.name}</span>
                      <span style={{ color: T.t3, fontSize: 11 }}>{m.time}</span>
                    </div>
                  )}
                  <div
                    style={{
                      background: isInternal ? T.amber + "22" : isUser ? T.accent : T.surface,
                      color: isUser ? "#fff" : T.t1,
                      border: isInternal ? `1px solid ${T.amber}55` : isUser ? "none" : `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: "9px 13px",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.content}
                  </div>
                  {rxns.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: isUser ? "flex-end" : "flex-start" }}>
                      {rxns.map((r) => (
                        <span
                          key={r}
                          style={{
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            borderRadius: 99,
                            padding: "2px 7px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                          onClick={() => addReaction(activeAgent, i, r)}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );

  const Composer = (
    <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, flexShrink: 0, background: T.surface, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setComposeKind("public")}
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            border: `1px solid ${composeKind === "public" ? T.accent : T.border}`,
            background: composeKind === "public" ? T.accentBg : "transparent",
            color: composeKind === "public" ? T.accent : T.t3,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: F.sans,
          }}
        >
          Public reply
        </button>
        <button
          type="button"
          onClick={() => setComposeKind("internal")}
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            border: `1px solid ${composeKind === "internal" ? T.amber : T.border}`,
            background: composeKind === "internal" ? T.amber + "18" : "transparent",
            color: composeKind === "internal" ? T.amber : T.t3,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: F.sans,
          }}
        >
          Internal note
        </button>
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {[
          [<Attach size={14} />, "Attach"],
          [<Smile size={14} />, "Emoji"],
          [<AtSign size={14} />, "Mention"],
          [<Code2 size={14} />, "Code"],
        ].map(([icon, tip]) => (
          <button
            key={tip}
            title={tip}
            type="button"
            style={{ padding: "5px 8px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: T.t3, display: "flex", transition: "all .12s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {icon}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: T.t4, fontSize: 11, alignSelf: "center", fontFamily: F.mono }}>Enter ↵ to send</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={composeKind === "internal" ? "Add an internal note (not sent to requester)…" : "Type '/' to use a macro or template…"}
          rows={2}
          style={{
            flex: 1,
            resize: "vertical",
            minHeight: 44,
            maxHeight: 120,
            background: T.raised,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.t1,
            padding: "9px 12px",
            fontSize: 13,
            outline: "none",
            fontFamily: F.sans,
            lineHeight: 1.5,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
          <Btn T={T} variant="default" small>
            Macro
          </Btn>
          <Btn T={T} variant="primary" onClick={send} disabled={!msg.trim()}>
            {composeKind === "internal" ? "Add note" : "Send"}
          </Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "visible",
        gap: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div>
          <div style={{ color: T.t1, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>Inbox</div>
          <div style={{ color: T.t2, fontSize: 13, marginTop: 2 }}>Ticketed conversations across workspaces</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isMobile && (
            <Btn T={T} variant="default" onClick={() => setFiltersOpen(true)}>
              <PanelLeft size={14} /> Views
            </Btn>
          )}
          <Btn
            T={T}
            variant="primary"
            onClick={() => {
              const next = ticketsAvailableToAdd[0] ?? INBOX_THREADS.find((t) => !openTabIds.includes(t.id));
              if (next) addTicketTab(next.id);
            }}
          >
            <Edit2 size={14} /> New ticket
          </Btn>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <SubNav T={T} tabs={inboxSubTabs} active={subTab} onChange={setSubTab} />
      </div>

      <div style={{ flex: 1, minHeight: 0, marginTop: 10, display: "flex", flexDirection: "column", position: "relative", zIndex: 25 }}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            overflow: "hidden",
            background: T.surface,
            boxShadow: T.shadow,
          }}
        >
          <div style={{ flexShrink: 0, padding: "10px 12px 12px", background: T.raised, borderBottom: `1px solid ${T.borderMuted ?? T.border}` }}>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: T.t3,
                  display: "flex",
                  pointerEvents: "none",
                  opacity: 0.85,
                }}
              >
                <Search size={15} strokeWidth={SW} />
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets, IDs, or requesters…"
                aria-label="Ticket search"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 9999,
                  color: T.t1,
                  padding: "10px 16px 10px 40px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: F.mono,
                  boxShadow: `inset 0 1px 2px rgba(15, 23, 42, 0.04)`,
                  transition: `border-color 0.2s ${ATLAS_EASE}, box-shadow 0.2s ${ATLAS_EASE}`,
                }}
              />
            </div>
            {FilterPillsBar}
          </div>

          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              padding: "0 6px",
              overflowX: "auto",
              background: T.raised,
              borderBottom: `1px solid ${T.borderMuted ?? T.border}`,
              scrollbarWidth: "thin",
              WebkitOverflowScrolling: "touch",
              position: "relative",
              zIndex: 4,
            }}
          >
            {openTabIds.map((tid) => {
              const th = INBOX_THREADS.find((t) => t.id === tid);
              if (!th) return null;
              const active = activeThreadId === tid;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setActiveThreadId(tid)}
                  style={{
                    flex: "0 0 auto",
                    maxWidth: active ? 280 : 132,
                    minWidth: 76,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 10px 10px",
                    borderRadius: "10px 10px 0 0",
                    border: active ? `1px solid ${T.borderMuted ?? T.border}` : "1px solid transparent",
                    borderBottom: active ? `1px solid ${T.surface}` : "1px solid transparent",
                    marginBottom: -1,
                    background: active ? T.surface : "transparent",
                    color: active ? T.t1 : T.t3,
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    fontFamily: F.sans,
                    transition: `max-width 0.28s ${ATLAS_EASE}, background 0.2s ${ATLAS_EASE}, color 0.2s`,
                    position: "relative",
                    zIndex: active ? 3 : 1,
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 11, flexShrink: 0, color: active ? T.accent : T.t4 }}>{th.ticketId}</span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "left",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {th.subject}
                  </span>
                  <span
                    role="presentation"
                    title="Close tab"
                    onClick={(e) => removeTicketTab(tid, e)}
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      lineHeight: 1,
                      color: T.t4,
                      cursor: "pointer",
                      transition: `background 0.15s ${ATLAS_EASE}, color 0.15s`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.hover;
                      e.currentTarget.style.color = T.t1;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = T.t4;
                    }}
                  >
                    ×
                  </span>
                </button>
              );
            })}
            <div ref={addTabRef} style={{ position: "relative", flex: "0 0 auto", alignSelf: "flex-end", marginBottom: 5 }}>
              <button
                type="button"
                title="Add ticket tab"
                onClick={() => setAddTabMenuOpen((o) => !o)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: `1px dashed ${T.border}`,
                  background: T.surface,
                  color: T.t2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: `background 0.2s ${ATLAS_EASE}`,
                }}
              >
                <Plus size={17} strokeWidth={SW} />
              </button>
              {addTabMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 8,
                    width: isMobile ? "min(calc(100vw - 48px), 340px)" : 320,
                    maxHeight: 280,
                    overflowY: "auto",
                    borderRadius: 12,
                    border: `1px solid ${T.borderMuted ?? T.border}`,
                    background: T.surface,
                    boxShadow: T.shadowMd ?? T.shadowLg,
                    zIndex: 50,
                  }}
                >
                  {ticketsAvailableToAdd.length === 0 && (
                    <div style={{ padding: 16, fontSize: 13, color: T.t3, textAlign: "center" }}>All matching tickets are open as tabs</div>
                  )}
                  {ticketsAvailableToAdd.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => addTicketTab(th.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        border: "none",
                        borderBottom: `1px solid ${T.borderMuted ?? T.border}`,
                        background: "none",
                        cursor: "pointer",
                        fontFamily: F.sans,
                        fontSize: 13,
                        color: T.t1,
                        transition: `background 0.15s ${ATLAS_EASE}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, marginBottom: 2 }}>{th.ticketId}</div>
                      <div style={{ fontWeight: 600 }}>{th.subject}</div>
                      <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{th.requester}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              gap: 0,
              overflow: "hidden",
              background: T.surface,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
        {/* Left nav rail */}
        {!isMobile && (
          <aside
            style={{
              flex: "0 0 auto",
              width: navW,
              minWidth: 0,
              maxWidth: navW,
              minHeight: 0,
              transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              borderRight: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.raised,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: navOpen ? "space-between" : "center",
                padding: navOpen ? "10px 10px 10px 12px" : "10px 8px",
                borderBottom: navOpen ? `1px solid ${T.borderMuted ?? T.border}` : "none",
                flexShrink: 0,
                flexDirection: "row",
                gap: 8,
                minHeight: 44,
                boxSizing: "border-box",
              }}
            >
              {navOpen && (
                <span style={{ fontSize: 13, fontWeight: 600, color: T.t1, minWidth: 0 }}>Views</span>
              )}
              <button
                type="button"
                title={navOpen ? "Collapse views" : "Expand views — workspace, inbox, status, channels, team"}
                onClick={() => persistNav(!navOpen)}
                style={{
                  border: "none",
                  background: T.surface,
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                  color: T.t2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: navOpen ? undefined : "auto",
                  marginRight: navOpen ? undefined : "auto",
                }}
              >
                {navOpen ? <ChevronLeft size={18} strokeWidth={SW} /> : <ChevronRight size={18} strokeWidth={SW} />}
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: navOpen ? "12px 10px 16px" : "10px 6px 16px" }}>{NavSections}</div>
          </aside>
        )}

        {/* Main chat */}
        {(!isMobile || mobilePane === "thread" || mobilePane === "detail") && (
          <div
            style={{
              flex: "1 1 0%",
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: T.surface,
              position: "relative",
              zIndex: 1,
              boxSizing: "border-box",
            }}
          >
            {(!isMobile || mobilePane === "thread") &&
              (thread && agent ? (
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {ChatHeader}
                  {MessageArea}
                  {Composer}
                </div>
              ) : (
                EmptyMain
              ))}
            {isMobile && mobilePane === "detail" && (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: T.raised, overflow: "hidden" }}>
                <div style={{ padding: 12, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setMobilePane("thread")}
                    style={{ border: "none", background: T.surface, borderRadius: 8, padding: 6, cursor: "pointer", color: T.t2 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span style={{ fontWeight: 600, color: T.t1 }}>Ticket details</span>
                </div>
                <div style={{ flex: 1, overflow: "auto" }}>{DetailPanel}</div>
              </div>
            )}
          </div>
        )}

        {/* Right details rail */}
        {!isMobile && (
          <aside
            style={{
              flex: "0 0 auto",
              width: detailW,
              minWidth: 0,
              maxWidth: detailW,
              minHeight: 0,
              transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              borderLeft: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.raised,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: detailOpen ? "space-between" : "center",
                padding: detailOpen ? "10px 12px" : "12px 8px",
                borderBottom: detailOpen ? `1px solid ${T.borderMuted ?? T.border}` : "none",
                flexShrink: 0,
              }}
            >
              {!isMobile && (
                <button
                  type="button"
                  title={detailOpen ? "Collapse details" : "Expand details"}
                  onClick={() => persistDetail(!detailOpen)}
                  style={{
                    border: "none",
                    background: T.surface,
                    borderRadius: 8,
                    padding: 6,
                    cursor: "pointer",
                    color: T.t2,
                    display: "flex",
                    order: detailOpen ? 0 : 1,
                  }}
                >
                  {detailOpen ? <ChevronRight size={18} strokeWidth={SW} /> : <ChevronLeft size={18} strokeWidth={SW} />}
                </button>
              )}
              {detailOpen && <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>Details</span>}
              {detailOpen && <div style={{ width: 28 }} />}
            </div>
            {DetailPanel}
          </aside>
        )}
          </div>
        </div>
      </div>

      <SlideOver T={T} open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Views & filters" subtitle="Workspace, inbox, status, channels">
        <div style={{ padding: "4px 0 24px" }}>{NavSections}</div>
      </SlideOver>
    </div>
  );
}
