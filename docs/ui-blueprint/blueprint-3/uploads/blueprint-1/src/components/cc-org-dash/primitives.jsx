// Design tokens — soft layered UI with per-theme translation (cool blue light, navy-tinted darks)
import { useState } from "react";

export const F = {
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif",
  mono: "'JetBrains Mono',ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace"
};

/** pageGradient + shadowSubtle are optional; solids (canvas, surface, …) match gradient mid-tones for fills/notches */
export const THEMES = {
  light: {
    name: "Light", icon: "sun",
    pageGradient: "linear-gradient(180deg, #eef2ff 0%, #f4f7fd 42%, #fafcfe 100%)",
    bg: "#ffffff",
    canvas: "#f5f8fe",
    surface: "#ffffff",
    raised: "#f0f4fc",
    hover: "#e8eef9",
    border: "rgba(59, 130, 246, 0.14)",
    borderMuted: "rgba(59, 130, 246, 0.09)",
    borderHover: "rgba(59, 130, 246, 0.22)",
    t1: "#1e293b",
    t2: "#64748b",
    t3: "#94a3b8",
    t4: "#a8b4c4",
    accent: "#3b82f6",
    accentBg: "#eff6ff",
    accentBorder: "rgba(59, 130, 246, 0.35)",
    accentHover: "#2563eb",
    green: "#059669",
    greenBg: "#ecfdf5",
    greenBorder: "#6ee7b7",
    red: "#e11d48",
    redBg: "#fff1f2",
    redBorder: "#fecdd3",
    amber: "#d97706",
    amberBg: "#fffbeb",
    amberBorder: "#fcd34d",
    purple: "#7c3aed",
    purpleBg: "#f5f3ff",
    purpleBorder: "#c4b5fd",
    nav: "#f8faff",
    navText: "#64748b",
    navActive: "#1e293b",
    navHover: "#eef2ff",
    btnPrimary: "#3b82f6",
    btnPrimaryHover: "#2563eb",
    shadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    shadowSubtle: "0 2px 12px rgba(15, 23, 42, 0.05)",
    shadowMd: "0 4px 20px rgba(15, 23, 42, 0.08)",
    shadowLg: "0 12px 40px rgba(15, 23, 42, 0.1)",
  },
  dark: {
    name: "Dark", icon: "moon",
    pageGradient: "linear-gradient(180deg, #080c14 0%, #0c111d 38%, #0f1419 100%)",
    bg: "#0c111d",
    canvas: "#0e1420",
    surface: "#121a28",
    raised: "#182235",
    hover: "#1f2d42",
    border: "rgba(96, 165, 250, 0.14)",
    borderMuted: "rgba(96, 165, 250, 0.08)",
    borderHover: "rgba(96, 165, 250, 0.24)",
    t1: "#e8eef9",
    t2: "#9fb0cc",
    t3: "#7c8ca8",
    t4: "#647896",
    accent: "#60a5fa",
    accentBg: "rgba(59, 130, 246, 0.14)",
    accentBorder: "rgba(96, 165, 250, 0.35)",
    accentHover: "#93c5fd",
    green: "#4ade80",
    greenBg: "rgba(34, 197, 94, 0.12)",
    greenBorder: "rgba(74, 222, 128, 0.45)",
    red: "#fb7185",
    redBg: "rgba(251, 113, 133, 0.1)",
    redBorder: "rgba(251, 113, 133, 0.35)",
    amber: "#fbbf24",
    amberBg: "rgba(251, 191, 36, 0.1)",
    amberBorder: "rgba(251, 191, 36, 0.35)",
    purple: "#c084fc",
    purpleBg: "rgba(192, 132, 252, 0.1)",
    purpleBorder: "rgba(192, 132, 252, 0.35)",
    nav: "#121a28",
    navText: "#9fb0cc",
    navActive: "#e8eef9",
    navHover: "#182235",
    btnPrimary: "#3b82f6",
    btnPrimaryHover: "#60a5fa",
    shadow: "0 0 transparent",
    shadowSubtle: "0 2px 12px rgba(0, 0, 0, 0.35)",
    shadowMd: "0 6px 24px rgba(0, 0, 0, 0.45)",
    shadowLg: "0 16px 48px rgba(0, 0, 0, 0.55)",
  },
  dimmed: {
    name: "Dimmed", icon: "palette",
    pageGradient: "linear-gradient(180deg, #1a1d28 0%, #1e2433 45%, #222838 100%)",
    bg: "#222838",
    canvas: "#1e2433",
    surface: "#262d3f",
    raised: "#2e3750",
    hover: "#38445e",
    border: "rgba(100, 149, 237, 0.16)",
    borderMuted: "rgba(100, 149, 237, 0.1)",
    borderHover: "rgba(100, 149, 237, 0.26)",
    t1: "#dce4f0",
    t2: "#9aa8bc",
    t3: "#7d8ba0",
    t4: "#6b788c",
    accent: "#6b9ef5",
    accentBg: "rgba(83, 155, 245, 0.16)",
    accentBorder: "rgba(107, 158, 245, 0.4)",
    accentHover: "#8bb4f8",
    green: "#6ecf7a",
    greenBg: "rgba(87, 171, 90, 0.14)",
    greenBorder: "rgba(110, 207, 122, 0.4)",
    red: "#f1887f",
    redBg: "rgba(229, 83, 75, 0.12)",
    redBorder: "rgba(241, 136, 127, 0.35)",
    amber: "#e3b341",
    amberBg: "rgba(198, 144, 38, 0.12)",
    amberBorder: "rgba(227, 179, 65, 0.35)",
    purple: "#b794f4",
    purpleBg: "rgba(152, 110, 226, 0.14)",
    purpleBorder: "rgba(183, 148, 244, 0.4)",
    nav: "#262d3f",
    navText: "#9aa8bc",
    navActive: "#dce4f0",
    navHover: "#2e3750",
    btnPrimary: "#539bf5",
    btnPrimaryHover: "#6cb6ff",
    shadow: "0 0 transparent",
    shadowSubtle: "0 2px 10px rgba(0, 0, 0, 0.28)",
    shadowMd: "0 5px 20px rgba(0, 0, 0, 0.38)",
    shadowLg: "0 14px 40px rgba(0, 0, 0, 0.48)",
  },
};

// Card — soft resting shadow when theme defines shadowSubtle
export function Surface({ children, T, style: ex = {}, onClick, hoverable }) {
  const [hov, setHov] = useState(false);
  const rest = T.shadowSubtle != null ? T.shadowSubtle : "none";
  return (
    <div onClick={onClick}
      onMouseEnter={() => hoverable && setHov(true)}
      onMouseLeave={() => hoverable && setHov(false)}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        boxShadow: hov ? T.shadowMd : rest,
        transition: "all 0.15s",
        cursor: onClick ? "pointer" : "default",
        ...ex
      }}>
      {children}
    </div>
  );
}

// GitHub-style button — primary green, outlined default, danger red
export function Btn({ children, onClick, variant = "default", small, disabled, T, full, style: ex = {} }) {
  const [hov, setHov] = useState(false);
  const v = {
    primary: { bg: T.btnPrimary, hbg: T.btnPrimaryHover, color: "#fff", border: `1px solid rgba(31,35,40,0.15)` },
    default: { bg: T.raised, hbg: T.hover, color: T.t1, border: `1px solid ${T.border}` },
    ghost:   { bg: "transparent", hbg: T.hover, color: T.t2, border: "1px solid transparent" },
    outline: { bg: "transparent", hbg: T.hover, color: T.t1, border: `1px solid ${T.border}` },
    accent:  { bg: T.accent, hbg: T.accentHover, color: "#fff", border: `1px solid rgba(31,35,40,0.15)` },
    danger:  { bg: T.raised, hbg: T.redBg, color: T.red, border: `1px solid ${T.border}` },
    success: { bg: T.greenBg, hbg: `${T.green}22`, color: T.green, border: `1px solid ${T.greenBorder}` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? v.hbg : v.bg, color: v.color, border: v.border,
        borderRadius: 6,
        padding: small ? "3px 10px" : "5px 14px",
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: F.sans,
        display: "inline-flex", alignItems: "center", gap: 6,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.12s",
        whiteSpace: "nowrap",
        width: full ? "100%" : undefined,
        justifyContent: full ? "center" : undefined,
        lineHeight: 1.4,
        ...ex
      }}>
      {children}
    </button>
  );
}

// GitHub-style Label (pill badge)
export function Badge({ children, color, bg, T, variant = "default" }) {
  const styles = {
    default: { bg: T.raised, color: T.t2, border: T.border },
    colored: { bg: bg || `${color || T.accent}22`, color: color || T.accent, border: `${color || T.accent}44` },
  };
  const s = color ? styles.colored : styles.default;
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 999,
      padding: "0 7px",
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      lineHeight: "18px",
      height: 20
    }}>
      {children}
    </span>
  );
}

// Status dot
export function Dot({ status, T, size = 8 }) {
  const c = {
    online: T.green, active: T.green, connected: T.green, on_track: T.green, done: T.green,
    idle: T.amber, away: T.amber, degraded: T.amber, at_risk: T.amber, review: T.amber,
    planning: T.t3, paused: T.t3, todo: T.t3,
    in_progress: T.accent,
    disconnected: T.red, error: T.red
  }[status] || T.t3;
  return <span style={{ width: size, height: size, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />;
}

export function Avi({ name, size = 28 }) {
  const ini = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["#0969da", "#1a7f37", "#8250df", "#9a6700", "#d1242f", "#bf3989", "#0550ae"];
  const c = palette[(name || "X").charCodeAt(0) % palette.length];
  return <div style={{
    width: size, height: size, borderRadius: "50%", background: c, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    fontFamily: F.sans
  }}>{ini}</div>;
}

export function Toggle({ on, onChange, T }) {
  return (
    <div onClick={() => onChange?.(!on)} style={{
      width: 32, height: 18, borderRadius: 99,
      background: on ? T.btnPrimary : T.border,
      cursor: "pointer", position: "relative",
      transition: "background 0.15s", flexShrink: 0
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 2, left: on ? 16 : 2,
        transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)"
      }} />
    </div>
  );
}

export function Input({ T, value, onChange, placeholder, type = "text", style: ex = {}, icon, onKeyDown, autoFocus, defaultValue }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {icon && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.t3, display: "flex", pointerEvents: "none" }}>{icon}</span>}
      <input type={type} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          background: T.surface,
          border: `1px solid ${focus ? T.accent : T.border}`,
          boxShadow: focus ? `0 0 0 3px ${T.accentBg}` : "none",
          borderRadius: 6, color: T.t1,
          padding: icon ? "5px 12px 5px 30px" : "5px 12px",
          fontSize: 14, outline: "none", fontFamily: F.sans,
          width: "100%", boxSizing: "border-box",
          transition: "all .15s",
          ...ex
        }} />
    </div>
  );
}

export function Select({ T, value, onChange, children, style: ex = {}, defaultValue }) {
  return (
    <select value={value} defaultValue={defaultValue} onChange={onChange}
      style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: 6, color: T.t1,
        padding: "5px 28px 5px 12px",
        fontSize: 14, outline: "none", fontFamily: F.sans,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='${encodeURIComponent(T.t3)}'%3E%3Cpath d='M4.427 9.427l3.396 3.396a.251.251 0 00.354 0l3.396-3.396A.25.25 0 0011.396 9H4.604a.25.25 0 00-.177.427z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        cursor: "pointer",
        ...ex
      }}>
      {children}
    </select>
  );
}

export function Progress({ value, color, T }) {
  return (
    <div style={{ background: T.raised, borderRadius: 99, height: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
      <div style={{
        width: `${Math.min(100, value)}%`, height: "100%",
        background: color || T.accent,
        transition: "width 0.8s ease"
      }} />
    </div>
  );
}

export function Sparkline({ data, color, height = 28, width = 80 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / r) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`${color}18`} stroke="none" />
    </svg>
  );
}

/** Horizontal data table — airy cells, light row rules, accent selection (appointments-style). */
export function Table({
  cols,
  rows,
  T,
  onRow,
  emptyMsg = "No data",
  variant = "card",
  selectedId,
  rowKey = "id",
}) {
  const [hov, setHov] = useState(null);
  const rowLine = `1px solid ${T.borderMuted ?? T.border}`;
  const wrap =
    variant === "card"
      ? {
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          overflow: "hidden",
          background: T.surface,
        }
      : {};

  return (
    <div style={wrap}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  style={{
                    padding: "12px 18px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.t2,
                    borderBottom: rowLine,
                    whiteSpace: "nowrap",
                    background: T.surface,
                    letterSpacing: "0.01em",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={cols.length}
                  style={{ padding: 40, textAlign: "center", color: T.t3, fontSize: 13 }}
                >
                  {emptyMsg}
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const rid = row[rowKey];
              const selected = selectedId != null && rid === selectedId;
              const rowBg = selected
                ? T.accentBg
                : hov === i
                  ? T.hover
                  : "transparent";
              return (
                <tr
                  key={rid ?? i}
                  onMouseEnter={() => setHov(i)}
                  onMouseLeave={() => setHov(null)}
                  onClick={() => onRow?.(row)}
                  style={{
                    background: rowBg,
                    cursor: onRow ? "pointer" : "default",
                    transition: "background 0.12s ease",
                  }}
                >
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      style={{
                        padding: "14px 18px",
                        fontSize: 13,
                        color: c.muted ? T.t2 : T.t1,
                        borderBottom: i < rows.length - 1 ? rowLine : "none",
                        verticalAlign: "middle",
                        lineHeight: 1.45,
                      }}
                    >
                      {c.render ? c.render(row[c.key], row) : row[c.key] ?? <span style={{ color: T.t4 }}>—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SlideOver({ open, onClose, title, subtitle, children, T, width = 420, topOffsetPx }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const effectiveWidth = isMobile ? Math.min(window.innerWidth - 32, width) : width;
  /** Clear GitHub-style top nav + primary tabs so the panel header is not hidden behind the shell */
  const top = topOffsetPx !== undefined ? topOffsetPx : (isMobile ? 100 : 116);
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }} />}
      <div style={{
        position: "fixed", top, right: 0, bottom: 0, width: effectiveWidth, maxWidth: "100vw",
        background: T.surface, borderLeft: `1px solid ${T.border}`,
        zIndex: 201, transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column", boxShadow: T.shadowLg
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <div style={{ color: T.t1, fontSize: 16, fontWeight: 600 }}>{title}</div>
            {subtitle && <div style={{ color: T.t3, fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, padding: 4, borderRadius: 6, display: "flex" }}
            onMouseEnter={e => e.currentTarget.style.background = T.hover}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </>
  );
}

export function Modal({ open, onClose, title, children, T, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: T.surface, borderRadius: 12, width: "100%", maxWidth: width, maxHeight: "88vh", overflow: "auto", boxShadow: T.shadowLg, border: `1px solid ${T.border}` }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: T.t1, fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "20px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, T, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: T.t1, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ color: T.t3, fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function SectionLabel({ children, T, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
      <span style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>{children}</span>
      {action}
    </div>
  );
}

/**
 * Primary app tabs — active tab lifts with canvas fill and inverse-radius “scoops”
 * at the bottom corners (connects visually to the page below).
 */
export function PrimaryNavTabs({ T, tabs, active, onChange, isMobile, leading }) {
  const R = 11;
  const fill = T.canvas;
  const padX = isMobile ? 10 : 13;
  const padY = isMobile ? 9 : 10;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        padding: isMobile ? "6px 8px 0" : "8px 12px 0",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
        minHeight: isMobile ? 46 : 48,
      }}
    >
      {leading != null && (
        <div style={{ flexShrink: 0, paddingBottom: 0, display: "flex", alignItems: "flex-end" }}>{leading}</div>
      )}
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(t.id);
            }}
            style={{
              position: "relative",
              zIndex: isActive ? 2 : 1,
              padding: `${padY}px ${padX}px`,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 5 : 8,
              background: isActive ? fill : "transparent",
              border: "none",
              borderRadius: isActive ? `${R}px ${R}px 0 0` : 0,
              marginBottom: 0,
              color: isActive ? T.t1 : T.navText ?? T.t2,
              fontSize: isMobile ? 13 : 14,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              fontFamily: F.sans,
              transition: "color .12s, background .12s",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow: isActive ? `0 1px 0 0 ${fill}` : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = T.t1;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = T.navText ?? T.t2;
            }}
          >
            {isActive && (
              <>
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: -R,
                    bottom: 0,
                    width: R,
                    height: R,
                    pointerEvents: "none",
                    borderBottomRightRadius: R,
                    boxShadow: `${R}px ${R}px 0 ${R}px ${fill}`,
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: -R,
                    bottom: 0,
                    width: R,
                    height: R,
                    pointerEvents: "none",
                    borderBottomLeftRadius: R,
                    boxShadow: `${-R}px ${R}px 0 ${R}px ${fill}`,
                  }}
                />
              </>
            )}
            <span style={{ display: "flex", color: isActive ? T.t2 : T.t3, position: "relative", zIndex: 1 }}>
              {t.icon}
            </span>
            {(!isMobile || isActive) && (
              <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t.label}
                {t.badge != null && t.badge !== 0 && (
                  <span
                    style={{
                      background: T.accent,
                      color: "#fff",
                      borderRadius: 99,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1.35,
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Secondary row — capsule pills on a soft bar (mirrors medical-app subnav). */
export function SubNav({ T, tabs, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "nowrap",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
        minWidth: 0,
        padding: "10px 4px 12px",
        marginBottom: 4,
        background: T.raised,
        border: `1px solid ${T.borderMuted ?? T.border}`,
        borderRadius: 12,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              padding: "6px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: isActive ? T.accentBg : "transparent",
              border: isActive ? `1px solid ${T.accentBorder}` : "1px solid transparent",
              borderRadius: 9999,
              color: isActive ? T.accent : T.t2,
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              fontFamily: F.sans,
              transition: "all .12s",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = T.hover;
                e.currentTarget.style.color = T.t1;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = T.t2;
              }
            }}
          >
            {t.icon && (
              <span style={{ display: "flex", color: isActive ? T.accent : T.t3 }}>{t.icon}</span>
            )}
            <span>{t.label}</span>
            {t.count != null && (
              <span
                style={{
                  background: isActive ? `${T.accent}22` : T.surface,
                  border: `1px solid ${isActive ? T.accentBorder : T.border}`,
                  borderRadius: 999,
                  padding: "0 7px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? T.accent : T.t2,
                  lineHeight: "18px",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// GitHub-style breadcrumb page header
export function PageHeader({ T, org = "cc-org-dash-global", name, description, actions, icon }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingBottom: 16, borderBottom: `1px solid ${T.border}`, marginBottom: 0 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 400, marginBottom: description ? 4 : 0 }}>
          {icon && <span style={{ color: T.t2, display: "flex" }}>{icon}</span>}
          <span style={{ color: T.accent, cursor: "pointer" }}>{org}</span>
          <span style={{ color: T.t3 }}>/</span>
          <span style={{ color: T.t1, fontWeight: 600 }}>{name}</span>
          <Badge T={T}>Private</Badge>
        </div>
        {description && <div style={{ color: T.t2, fontSize: 13 }}>{description}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}