import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { F } from "./primitives";
import {
  ChevronDown,
  Bot,
  Plus,
  BookOpen,
  SettingsIcon,
  Search,
  ArrowUp,
} from "./icons";

const ATLAS_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const PANEL_W = 420;

function newSession(id, title) {
  return {
    id,
    title,
    messages: [
      {
        role: "assistant",
        text: "I'm your platform agent — ask across projects, inbox, people, and integrations. Open another tab for a parallel thread.",
      },
    ],
    input: "",
  };
}

/** Slides in from the right; top aligns below main app chrome (top bar + primary tabs), like the company command rail */
export default function GlobalAgentPanel({ T, open, onClose, isMobile, topOffsetPx }) {
  const top = topOffsetPx ?? (isMobile ? 104 : 116);
  const [sessions, setSessions] = useState(() => [newSession("s0", "Chat")]);
  const [activeId, setActiveId] = useState("s0");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [scope, setScope] = useState("organization");
  const [sources, setSources] = useState(["docs", "tickets"]);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [sourcesMenuOpen, setSourcesMenuOpen] = useState(false);
  const endRef = useRef(null);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? sessions[0], [sessions, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, open, activeId]);

  const updateSession = useCallback((id, fn) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  const setInput = (v) => updateSession(activeId, (s) => ({ ...s, input: v }));

  const send = () => {
    const t = (active?.input ?? "").trim();
    if (!t) return;
    updateSession(activeId, (s) => ({
      ...s,
      input: "",
      messages: [
        ...s.messages,
        { role: "user", text: t },
        {
          role: "assistant",
          text: `[Demo] Using ${model} @ ${temperature.toFixed(2)} · ${scope} · ${sources.join(", ")}. Add an API key in Settings → AI for live replies.`,
        },
      ],
    }));
  };

  const addTab = () => {
    const id = `s-${Date.now()}`;
    setSessions((prev) => [...prev, newSession(id, `Chat ${prev.length + 1}`)]);
    setActiveId(id);
  };

  const closeTab = (id, e) => {
    e?.stopPropagation?.();
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== id);
      setActiveId((aid) => (aid === id ? next[0].id : aid));
      return next;
    });
  };

  const inputVal = active?.input ?? "";

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top,
          bottom: 0,
          background: open ? "rgba(15, 23, 42, 0.2)" : "transparent",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: `opacity 0.28s ${ATLAS_EASE}`,
          zIndex: 499,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top,
          right: 0,
          width: isMobile ? "min(100vw, 100%)" : PANEL_W,
          maxWidth: "100vw",
          height: `calc(100vh - ${top}px)`,
          background: T.surface,
          borderLeft: `1px solid ${T.borderMuted ?? T.border}`,
          boxShadow: open ? T.shadowLg ?? T.shadowMd : "none",
          zIndex: 500,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform 0.32s ${ATLAS_EASE}`,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Session tabs — browser-style */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            padding: "8px 8px 0",
            background: T.raised,
            borderBottom: `1px solid ${T.borderMuted ?? T.border}`,
            overflowX: "auto",
            scrollbarWidth: "thin",
          }}
        >
          {sessions.map((s) => {
            const on = s.id === activeId;
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(s.id)}
                onKeyDown={(e) => e.key === "Enter" && setActiveId(s.id)}
                style={{
                  flex: "0 1 auto",
                  minWidth: 0,
                  maxWidth: 140,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 8px 9px",
                  borderRadius: "8px 8px 0 0",
                  border: `1px solid ${on ? T.borderMuted ?? T.border : "transparent"}`,
                  borderBottom: on ? `1px solid ${T.surface}` : `1px solid transparent`,
                  marginBottom: -1,
                  background: on ? T.surface : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: on ? 600 : 500,
                  color: on ? T.t1 : T.t3,
                  fontFamily: F.sans,
                  transition: `background 0.2s ${ATLAS_EASE}, color 0.15s`,
                  position: "relative",
                  zIndex: on ? 2 : 1,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{s.title}</span>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    title="Close tab"
                    onClick={(e) => closeTab(s.id, e)}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 2,
                      cursor: "pointer",
                      color: T.t4,
                      borderRadius: 4,
                      display: "flex",
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.7 }} aria-hidden>×</span>
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            title="New chat tab"
            onClick={addTab}
            style={{
              flex: "0 0 auto",
              width: 32,
              height: 32,
              marginBottom: 4,
              borderRadius: 8,
              border: `1px dashed ${T.border}`,
              background: T.surface,
              color: T.t2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "14px 16px", background: T.canvas }}>
          {(active?.messages ?? []).map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 14,
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "92%",
                  padding: "10px 14px",
                  borderRadius: 18,
                  fontSize: 13,
                  lineHeight: 1.55,
                  background: m.role === "user" ? T.raised : T.surface,
                  color: T.t1,
                  border: `1px solid ${m.role === "user" ? T.borderMuted ?? T.border : T.borderMuted ?? T.border}`,
                  boxShadow: m.role === "assistant" ? T.shadowSubtle ?? "none" : "none",
                }}
              >
                {m.role === "assistant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, opacity: 0.85 }}>
                    <Bot size={14} color={T.t2} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.t3 }}>Assistant</span>
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div style={{ flexShrink: 0, borderTop: `1px solid ${T.borderMuted ?? T.border}`, background: T.surface, padding: "10px 12px 14px" }}>
          <button
            type="button"
            onClick={() => setParamsOpen((o) => !o)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              marginBottom: paramsOpen ? 8 : 4,
              borderRadius: 8,
              border: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.raised,
              cursor: "pointer",
              fontFamily: F.sans,
              fontSize: 12,
              fontWeight: 600,
              color: T.t2,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SettingsIcon size={14} color={T.t3} /> Model & parameters
            </span>
            <ChevronDown size={14} color={T.t3} style={{ transform: paramsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {paramsOpen && (
            <div
              style={{
                padding: "10px 12px",
                marginBottom: 10,
                borderRadius: 10,
                border: `1px solid ${T.borderMuted ?? T.border}`,
                background: T.canvas,
                display: "grid",
                gap: 12,
              }}
            >
              <label style={{ fontSize: 11, color: T.t4, fontWeight: 600 }}>MODEL</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  color: T.t1,
                  fontSize: 13,
                  fontFamily: F.sans,
                }}
              >
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
              </select>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.t4, fontWeight: 600 }}>TEMPERATURE</span>
                  <span style={{ fontSize: 11, color: T.t2, fontFamily: F.mono }}>{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.t4, fontWeight: 600 }}>MAX TOKENS</span>
                  <span style={{ fontSize: 11, color: T.t2, fontFamily: F.mono }}>{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min={512}
                  max={16384}
                  step={256}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <span style={{ fontSize: 11, color: T.t4, fontWeight: 600, display: "block", marginBottom: 6 }}>SCOPE</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["organization", "project", "inbox-only"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScope(s)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 99,
                        border: `1px solid ${scope === s ? T.border : T.borderMuted ?? T.border}`,
                        background: scope === s ? T.raised : T.surface,
                        color: scope === s ? T.t1 : T.t2,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: F.sans,
                        textTransform: "capitalize",
                      }}
                    >
                      {s.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setVariablesOpen((o) => !o)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              marginBottom: variablesOpen ? 8 : 6,
              borderRadius: 8,
              border: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.raised,
              cursor: "pointer",
              fontFamily: F.sans,
              fontSize: 12,
              fontWeight: 600,
              color: T.t2,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={14} color={T.t3} /> Variables & context
            </span>
            <ChevronDown size={14} color={T.t3} style={{ transform: variablesOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {variablesOpen && (
            <div
              style={{
                padding: "10px 12px",
                marginBottom: 10,
                borderRadius: 10,
                border: `1px solid ${T.borderMuted ?? T.border}`,
                background: T.canvas,
                display: "grid",
                gap: 8,
              }}
            >
              {[
                ["tenant_id", "cc-org-au"],
                ["env", "production"],
                ["locale", "en-AU"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                  <span style={{ color: T.t4, fontFamily: F.mono }}>{k}</span>
                  <span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>Override at runtime — wired to your workspace in production.</div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => {
                  setAgentMenuOpen((o) => !o);
                  setSourcesMenuOpen(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.raised,
                  fontSize: 12,
                  color: T.t2,
                  cursor: "pointer",
                  fontFamily: F.sans,
                }}
              >
                <Bot size={14} /> Agent <ChevronDown size={12} />
              </button>
              {agentMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    marginBottom: 6,
                    minWidth: 200,
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    boxShadow: T.shadowMd,
                    padding: 6,
                    zIndex: 2,
                  }}
                >
                  {["Platform default", "Analyst (data-heavy)", "Writer (briefs)"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAgentMenuOpen(false)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        border: "none",
                        borderRadius: 6,
                        background: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        color: T.t1,
                        fontFamily: F.sans,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => {
                  setSourcesMenuOpen((o) => !o);
                  setAgentMenuOpen(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.raised,
                  fontSize: 12,
                  color: T.t2,
                  cursor: "pointer",
                  fontFamily: F.sans,
                }}
              >
                <Search size={13} /> Sources <ChevronDown size={12} />
              </button>
              {sourcesMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    marginBottom: 6,
                    minWidth: 200,
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    boxShadow: T.shadowMd,
                    padding: 8,
                    zIndex: 2,
                  }}
                >
                  {["docs", "tickets", "crm", "code"].map((s) => {
                    const on = sources.includes(s);
                    return (
                      <label
                        key={s}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 12, color: T.t1, cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setSources((prev) => (on ? prev.filter((x) => x !== s) : [...prev, s]))
                          }
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              title="Attach"
              style={{
                padding: "5px 8px",
                borderRadius: 8,
                border: `1px dashed ${T.border}`,
                background: "transparent",
                cursor: "pointer",
                color: T.t3,
                display: "flex",
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              padding: "4px 4px 4px 6px",
              borderRadius: 22,
              border: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.raised,
            }}
          >
            <textarea
              value={inputVal}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message…"
              rows={2}
              style={{
                flex: 1,
                resize: "none",
                minHeight: 44,
                padding: "8px 4px 8px 8px",
                borderRadius: 14,
                border: "none",
                background: "transparent",
                color: T.t1,
                fontSize: 14,
                fontFamily: F.sans,
                outline: "none",
                lineHeight: 1.45,
              }}
            />
            <button
              type="button"
              title="Send"
              onClick={send}
              disabled={!inputVal.trim()}
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "none",
                cursor: inputVal.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 3,
                marginRight: 2,
                background: inputVal.trim() ? T.t1 : T.borderMuted ?? "rgba(0,0,0,.08)",
                color: inputVal.trim() ? T.bg : T.t4,
                transition: `background 0.2s ${ATLAS_EASE}, color 0.2s`,
                boxShadow: inputVal.trim() ? "0 1px 2px rgba(0,0,0,.08)" : "none",
              }}
            >
              <ArrowUp size={17} strokeWidth={2.25} color="currentColor" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
