import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { F } from "./primitives";
import { ChevronDown, Activity } from "./icons";

const ATLAS_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SW = 1.5;

/** High-density status labels for the righthand chip */
export const SIGNAL_LABELS = {
  modified: "Modified",
  created: "Created",
  deleted: "Deleted",
  synced: "Synced",
  auth: "Auth",
  connected: "Connected",
  shared: "Shared",
  accessed: "Access",
  archived: "Archived",
  failed: "Failed",
  warning: "Warning",
  deployed: "Deployed",
  rotated: "Rotated",
  exported: "Exported",
  signed_in: "Sign-in",
  signed_out: "Sign-out",
  info: "Info",
};

const EVENT_TEMPLATES = [
  { kind: "auth", verbs: ["signed in", "signed out"], actors: ["Jordan K.", "Priya S.", "Alex M.", "Sam T."] },
  { kind: "org", verbs: ["updated team roster", "changed billing contact", "edited workspace policy"], actors: ["Admin", "Finance Ops"] },
  { kind: "file", verbs: ["uploaded", "downloaded", "shared"], actors: ["Q4-plan.pdf", "schema.sql", "logo-pack.zip", "export.csv"] },
  { kind: "data", verbs: ["ran sync job", "refreshed warehouse"], actors: ["nightly-etl", "crm-bridge"] },
  { kind: "integration", verbs: ["connected", "reauthorized"], actors: ["Slack", "Salesforce", "GitHub"] },
  { kind: "security", verbs: ["API key rotated", "MFA enrollment"], actors: ["production", "staging"] },
];

function signalKeyForTemplate(kind, verb, message) {
  const v = (verb || "").toLowerCase();
  const m = (message || "").toLowerCase();
  if (kind === "auth") return m.includes("signed out") || v.includes("signed out") ? "signed_out" : "signed_in";
  if (kind === "file") {
    if (v.includes("upload") || m.startsWith("upload")) return "created";
    if (v.includes("download") || m.startsWith("download")) return "accessed";
    if (v.includes("share") || m.startsWith("share")) return "shared";
    return "modified";
  }
  if (kind === "org") return "modified";
  if (kind === "data") return "synced";
  if (kind === "integration") return "connected";
  if (kind === "security") return m.includes("rotated") || v.includes("rotated") ? "rotated" : "modified";
  return "info";
}

function chipStyle(T, key) {
  const danger = { bg: T.redBg ?? "rgba(225, 29, 72, 0.12)", fg: T.red ?? "#e11d48", border: T.redBorder ?? "rgba(225, 29, 72, 0.35)" };
  const ok = { bg: T.greenBg ?? "rgba(5, 150, 105, 0.12)", fg: T.green ?? "#059669", border: T.greenBorder ?? "rgba(5, 150, 105, 0.35)" };
  const warn = { bg: T.amberBg ?? "rgba(217, 119, 6, 0.12)", fg: T.amber ?? "#d97706", border: T.amberBorder ?? "rgba(217, 119, 6, 0.35)" };
  const accent = { bg: T.accentBg ?? "rgba(59, 130, 246, 0.12)", fg: T.accent ?? "#3b82f6", border: T.accentBorder ?? "rgba(59, 130, 246, 0.35)" };
  const neutral = { bg: T.raised ?? T.hover, fg: T.t2, border: T.borderMuted ?? T.border };
  const purple = { bg: T.purpleBg ?? "rgba(124, 58, 237, 0.12)", fg: T.purple ?? "#7c3aed", border: T.purpleBorder ?? "rgba(124, 58, 237, 0.35)" };

  const map = {
    modified: warn,
    created: ok,
    deleted: danger,
    synced: accent,
    auth: purple,
    connected: ok,
    shared: accent,
    accessed: neutral,
    archived: neutral,
    failed: danger,
    warning: warn,
    deployed: ok,
    rotated: danger,
    exported: accent,
    signed_in: ok,
    signed_out: neutral,
    info: neutral,
  };
  return map[key] ?? neutral;
}

function randomEvent() {
  const roll = Math.random();
  if (roll < 0.08) {
    const extra = [
      { message: "Archived project “Pilot B” (read-only)", signalKey: "archived" },
      { message: "Deleted 12 expired API tokens", signalKey: "deleted" },
      { message: "Deploy pipeline failed · retry queued", signalKey: "failed" },
      { message: "Rate limit warning · integration hub", signalKey: "warning" },
      { message: "Production deploy v2.4.1 completed", signalKey: "deployed" },
      { message: "Exported audit bundle to secure vault", signalKey: "exported" },
    ][Math.floor(Math.random() * 6)];
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      kind: "meta",
      message: extra.message,
      signalKey: extra.signalKey,
    };
  }

  const t = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const verb = t.verbs[Math.floor(Math.random() * t.verbs.length)];
  const actor = t.actors[Math.floor(Math.random() * t.actors.length)];
  let message = "";
  if (t.kind === "auth") message = `${actor} ${verb}`;
  else if (t.kind === "file") message = `${verb} ${actor}`;
  else if (t.kind === "org") message = `${actor}: ${verb}`;
  else message = `${verb} · ${actor}`;

  const signalKey = signalKeyForTemplate(t.kind, verb, message);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    kind: t.kind,
    message,
    signalKey,
  };
}

/** Human-readable age for activity timestamps */
export function formatRelativeAge(ts) {
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 8) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const d = new Date(ts);
  const month = d.toLocaleString("en-AU", { month: "short" });
  const year = d.getFullYear();
  const thisYear = new Date().getFullYear();
  if (year === thisYear) return `${month} ${d.getDate()}`;
  return `${month} ${d.getDate()}, ${year}`;
}

function formatAbsolute(ts) {
  return new Date(ts).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const SEED_SIGNALS = [
  "signed_in",
  "created",
  "modified",
  "synced",
  "signed_out",
  "shared",
  "modified",
  "synced",
  "signed_in",
  "accessed",
  "connected",
  "rotated",
];

export default function PlatformStatusBar({ T }) {
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);
  const [orgModifiedAt, setOrgModifiedAt] = useState(() => Date.now() - 120_000);
  const [events, setEvents] = useState(() => {
    const base = Date.now();
    return Array.from({ length: 12 }, (_, i) => ({
      id: `seed-${i}`,
      at: base - (12 - i) * 45_000,
      kind: ["auth", "file", "org", "data"][i % 4],
      signalKey: SEED_SIGNALS[i],
      message: [
        "Jordan K. signed in",
        "uploaded Q4-plan.pdf",
        "Admin: updated team roster",
        "nightly-etl completed",
        "Priya S. signed out",
        "shared export.csv",
        "Finance Ops: changed billing contact",
        "refreshed warehouse · crm-bridge",
        "Alex M. signed in",
        "downloaded schema.sql",
        "Slack reauthorized",
        "API key rotated · production",
      ][i],
    }));
  });

  const pushLive = useCallback(() => {
    setEvents((prev) => [randomEvent(), ...prev].slice(0, 80));
    setOrgModifiedAt(Date.now());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Math.random() > 0.2) pushLive();
    }, 4500 + Math.floor(Math.random() * 5500));
    return () => window.clearInterval(id);
  }, [pushLive]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const latest = events[0];
  const ageLatest = useMemo(() => (latest ? formatRelativeAge(latest.at) : "—"), [latest, tick]);
  const ageOrg = useMemo(() => formatRelativeAge(orgModifiedAt), [orgModifiedAt, tick]);

  /** Collapsed bar: one live chip in the righthand slot — updates whenever the latest event changes */
  const liveKey = latest?.signalKey ?? "info";
  const liveLabel = SIGNAL_LABELS[liveKey] ?? SIGNAL_LABELS.info;
  const liveChip = chipStyle(T, liveKey);

  const safeBottom = "max(0px, env(safe-area-inset-bottom, 0px))";

  const shell = (
    <>
      {expanded && (
        <div
          role="presentation"
          aria-hidden
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10049,
            background: "rgba(15, 23, 42, 0.06)",
            pointerEvents: "auto",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "100vw",
          zIndex: 10050,
          fontFamily: F.sans,
          pointerEvents: "auto",
          paddingBottom: safeBottom,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: "relative", width: "100%", maxWidth: "100vw", margin: 0, padding: 0 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "100%",
              maxHeight: expanded ? "min(40vh, 380px)" : 0,
              opacity: expanded ? 1 : 0,
              overflow: "hidden",
              pointerEvents: expanded ? "auto" : "none",
              transition: `max-height 0.32s ${ATLAS_EASE}, opacity 0.2s ${ATLAS_EASE}`,
              borderTop: `1px solid ${T.borderMuted ?? T.border}`,
              borderLeft: `1px solid ${T.borderMuted ?? T.border}`,
              borderRight: `1px solid ${T.borderMuted ?? T.border}`,
              borderRadius: "10px 10px 0 0",
              background: T.surface,
              boxShadow: T.shadowMd,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                maxHeight: "min(40vh, 380px)",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "8px 0",
              }}
            >
              {events.map((ev) => {
                const key = ev.signalKey ?? "info";
                const label = SIGNAL_LABELS[key] ?? SIGNAL_LABELS.info;
                const chip = chipStyle(T, key);
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 10px 6px 14px",
                      borderBottom: `1px solid ${T.borderMuted ?? T.border}`,
                      fontSize: 12,
                      color: T.t2,
                    }}
                  >
                    <span style={{ flexShrink: 0, fontFamily: F.mono, fontSize: 10, color: T.t4, width: 118, paddingTop: 1 }}>
                      {formatAbsolute(ev.at)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, color: T.t1, lineHeight: 1.45, fontSize: 12 }}>{ev.message}</span>
                    <span
                      title={label}
                      style={{
                        flexShrink: 0,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 6px",
                        borderRadius: 4,
                        lineHeight: 1.2,
                        maxWidth: 88,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: F.mono,
                        background: chip.bg,
                        color: chip.fg,
                        border: `1px solid ${chip.border}`,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
            aria-expanded={expanded}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px 7px",
              minHeight: 32,
              border: "none",
              borderTop: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.surface,
              boxShadow: T.shadowMd ?? "0 -4px 24px rgba(15, 23, 42, 0.1)",
              cursor: "pointer",
              boxSizing: "border-box",
              fontFamily: F.sans,
            }}
          >
            <span style={{ display: "inline-flex", color: T.t4, flexShrink: 0 }} aria-hidden>
              <Activity size={13} strokeWidth={SW} />
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, textAlign: "left" }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: T.t4, flexShrink: 0, width: 72 }}>{ageLatest}</span>
              <span
                style={{
                  fontSize: 11,
                  color: T.t2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {latest?.message ?? "No recent activity"}
              </span>
            </span>
            <span
              aria-live="polite"
              aria-atomic="true"
              title={latest ? `${liveLabel} · ${ageLatest} · Org sync ${ageOrg}` : "No activity"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flexShrink: 0,
                maxWidth: "38%",
              }}
            >
              <span
                key={latest?.id ?? "empty"}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 5,
                  lineHeight: 1.2,
                  maxWidth: 130,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: F.mono,
                  background: liveChip.bg,
                  color: liveChip.fg,
                  border: `1px solid ${liveChip.border}`,
                  transition: `background 0.2s ${ATLAS_EASE}, color 0.2s ${ATLAS_EASE}, border-color 0.2s ${ATLAS_EASE}`,
                }}
              >
                {latest ? liveLabel : "—"}
              </span>
            </span>
            <span style={{ color: T.t3, display: "inline-flex", flexShrink: 0 }} aria-hidden>
              <ChevronDown
                size={14}
                strokeWidth={SW}
                style={{ transform: expanded ? "rotate(0deg)" : "rotate(180deg)", transition: `transform 0.22s ${ATLAS_EASE}` }}
              />
            </span>
          </button>
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(shell, document.body);
}
