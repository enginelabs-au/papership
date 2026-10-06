import { useState, useEffect } from "react";
import { Surface, Badge, Table, SlideOver, Sparkline, SubNav, F } from "./primitives";
import { DB, spark } from "./data";
import {
  BarChart3,
  Activity,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bot,
  Code2,
  Plug,
  Workflow,
  BookOpen,
  List,
  Key,
  SettingsIcon,
  TrendingUp,
} from "./icons";

const RAIL = { open: 228, closed: 52 };
const ICON_SW = 1.5;

/** Stub apps — replace with real routes / embeds later */
const DATA_APPS_GROUPS = [
  {
    id: "my-apps",
    label: "MY APPS",
    items: [
      { id: "metrics-hub", label: "Metrics Hub", Icon: BarChart3, external: false },
      { id: "trace-explorer", label: "Trace Explorer", Icon: Activity, external: false },
      { id: "model-arena", label: "Model Arena", Icon: Bot, external: true },
      { id: "sql-lab", label: "SQL Lab", Icon: Code2, external: true },
    ],
  },
  {
    id: "connected",
    label: "CONNECTED",
    items: [
      { id: "snowflake-bridge", label: "Warehouse bridge", Icon: Plug, external: false },
      { id: "dbt-cloud", label: "Transform jobs", Icon: Workflow, external: false },
    ],
  },
];

const DATA_APPS_MORE = [
  { id: "docs", label: "Documentation", Icon: BookOpen, external: true },
  { id: "changelog", label: "Changelog", Icon: List, external: false },
];

const DATA_APPS_ADMIN = [
  { id: "api-keys", label: "API keys", Icon: Key },
  { id: "usage", label: "Usage", Icon: TrendingUp },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

function DataAppsRail({ T, isOpen, onToggle, selectedId, onSelect, isMobile }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const muted = T.t3;
  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: T.t4,
    marginTop: 14,
    marginBottom: 6,
    paddingLeft: 10,
    paddingRight: 8,
  };

  const itemBtn = (item) => {
    const active = selectedId === item.id;
    const Icon = item.Icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          marginBottom: 2,
          border: "none",
          borderRadius: 8,
          background: active ? T.accentBg : "transparent",
          color: active ? T.accent : T.t2,
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          cursor: "pointer",
          fontFamily: F.sans,
          textAlign: "left",
          transition: "background .12s, color .12s",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = T.hover;
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon size={16} strokeWidth={ICON_SW} color={active ? T.accent : muted} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
        {item.external && (
          <ExternalLink size={13} strokeWidth={ICON_SW} color={active ? T.accent : T.t4} style={{ opacity: 0.85 }} />
        )}
      </button>
    );
  };

  const railW = isMobile ? "100%" : isOpen ? RAIL.open : RAIL.closed;

  return (
    <aside
      style={{
        width: railW,
        maxWidth: isMobile ? "100%" : undefined,
        boxSizing: "border-box",
        flexShrink: 0,
        transition: isMobile ? undefined : "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        background: T.raised,
        border: `1px solid ${T.borderMuted ?? T.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        alignSelf: isMobile ? "stretch" : "flex-start",
        minHeight: isMobile ? 0 : 0,
        maxHeight: isMobile ? "min(52vh, 380px)" : undefined,
      }}
    >
      {/* Header: collapse toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isOpen ? "space-between" : "center",
          padding: isOpen ? "10px 8px 10px 12px" : "12px 8px",
          borderBottom: isOpen ? `1px solid ${T.borderMuted ?? T.border}` : "none",
          flexShrink: 0,
        }}
      >
        {isOpen && (
          <span style={{ color: T.t1, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>My apps</span>
        )}
        <button
          type="button"
          title={isOpen ? "Collapse" : "Expand apps"}
          onClick={onToggle}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: `1px solid ${T.borderMuted ?? T.border}`,
            background: T.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: T.t2,
            flexShrink: 0,
            transition: "background .15s, border-color .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.surface;
          }}
        >
          {isOpen ? <ChevronLeft size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "8px 8px 14px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Context strip (stub project / dataset switcher) */}
          <button
            type="button"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "8px 10px",
              marginBottom: 4,
              borderRadius: 8,
              border: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.surface,
              cursor: "default",
              fontFamily: F.sans,
            }}
          >
            <span style={{ color: T.t2, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Dataset · Production
            </span>
            <ChevronDown size={14} color={T.t4} strokeWidth={1.5} />
          </button>

          {DATA_APPS_GROUPS.map((g) => (
            <div key={g.id}>
              <div style={labelStyle}>{g.label}</div>
              {g.items.map((it) => itemBtn(it))}
            </div>
          ))}

          <div style={labelStyle}>RESOURCES</div>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              marginBottom: 2,
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: T.t2,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: F.sans,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span>More</span>
            <ChevronDown
              size={14}
              color={T.t3}
              strokeWidth={1.5}
              style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
            />
          </button>
          {moreOpen && DATA_APPS_MORE.map((it) => itemBtn(it))}

          <div style={{ ...labelStyle, marginTop: 18 }}>ADMIN</div>
          {DATA_APPS_ADMIN.map((it) => itemBtn({ ...it, external: false }))}
        </div>
      )}
    </aside>
  );
}

export default function DataScreen({ T, isMobile }) {
  const [liveData, setLiveData] = useState(DB.stats.map((s) => ({ ...s, spark: spark() })));
  useEffect(() => {
    const int = setInterval(
      () =>
        setLiveData((p) =>
          p.map((s) => ({ ...s, spark: [...s.spark.slice(1), Math.random() * 60 + 20] }))
        ),
      2000
    );
    return () => clearInterval(int);
  }, []);
  const [selected, setSelected] = useState(null);
  const [subTab, setSubTab] = useState("metrics");
  const [appsOpen, setAppsOpen] = useState(() => !isMobile);
  const [dataAppId, setDataAppId] = useState("metrics-hub");

  const subTabs = [
    { id: "metrics", label: "Metrics", icon: <BarChart3 size={16} /> },
    { id: "traces", label: "AI Traces", icon: <Activity size={16} />, count: 6 },
    { id: "events", label: "Events", icon: <Zap size={16} /> },
    { id: "alerts", label: "Alerts", icon: <AlertCircle size={16} />, count: 1 },
  ];

  const mainColumn = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        flex: "1 1 0%",
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {subTab === "metrics" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, width: "100%", minWidth: 0 }}>
          {liveData.map((s) => (
            <Surface key={s.id} T={T} hoverable style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ color: T.t2, fontSize: 12, fontWeight: 500 }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
                  <span style={{ color: T.t3, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>LIVE</span>
                </div>
              </div>
              <div style={{ color: T.t1, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginBottom: 10 }}>{s.value}</div>
              <Sparkline data={s.spark} color={s.color} height={32} width={120} />
            </Surface>
          ))}
        </div>
      )}

      {(subTab === "traces" || subTab === "metrics") && (
        <Surface T={T} style={{ borderRadius: 8, overflow: "hidden", padding: 0, width: "100%", minWidth: 0, maxWidth: "100%" }}>
          <div
            style={{
              padding: "12px 18px",
              borderBottom: `1px solid ${T.borderMuted ?? T.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: T.surface,
              borderRadius: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={15} color={T.t2} />
              <span style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>AI Run Traces</span>
              <span style={{ color: T.t3, fontSize: 12 }}>Last 24h</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge T={T} color={T.green}>
                5 success
              </Badge>
              <Badge T={T} color={T.red}>
                1 error
              </Badge>
            </div>
          </div>
          <Table
            T={T}
            variant="flush"
            selectedId={selected?.id}
            onRow={setSelected}
            rows={[
              { id: "tr1", name: "sales_forecast_run", agent: "DataOracle", model: "claude-3.5", tokens: "5,210", cost: "$0.12", latency: "2.1s", status: "success", time: "10:03" },
              { id: "tr2", name: "deal_summary_batch", agent: "SalesGPT", model: "gpt-4o", tokens: "2,847", cost: "$0.048", latency: "1.2s", status: "success", time: "09:16" },
              { id: "tr3", name: "support_triage_x42", agent: "SupportBot", model: "gpt-4o", tokens: "892", cost: "$0.008", latency: "0.8s", status: "success", time: "10:45" },
              { id: "tr4", name: "code_review_pr189", agent: "DevAssist", model: "gpt-4o-mini", tokens: "1,240", cost: "$0.009", latency: "1.1s", status: "success", time: "11:02" },
              { id: "tr5", name: "iso_control_map_v2", agent: "ComplianceAI", model: "claude-3", tokens: "8,921", cost: "$0.18", latency: "4.2s", status: "error", time: "11:14" },
              { id: "tr6", name: "deal_summary_batch", agent: "SalesGPT", model: "gpt-4o", tokens: "3,102", cost: "$0.052", latency: "1.4s", status: "success", time: "11:30" },
            ]}
            cols={[
              { key: "name", label: "Run Name", render: (v) => <span style={{ fontFamily: F.mono, fontSize: 12, color: T.accent, fontWeight: 600 }}>{v}</span> },
              { key: "agent", label: "Agent", muted: true },
              { key: "model", label: "Model", render: (v) => <Badge T={T} color={T.purple}>{v}</Badge> },
              { key: "tokens", label: "Tokens", render: (v) => <span style={{ fontFamily: F.mono, fontSize: 12, color: T.t2 }}>{v}</span>, muted: true },
              { key: "cost", label: "Cost", render: (v) => <span style={{ fontFamily: F.mono, fontSize: 12, color: T.t2 }}>{v}</span>, muted: true },
              { key: "latency", label: "Latency", render: (v) => <span style={{ fontFamily: F.mono, fontSize: 12, color: T.t2 }}>{v}</span>, muted: true },
              { key: "status", label: "Status", render: (v) => <Badge T={T} color={v === "success" ? T.green : T.red}>{v}</Badge> },
              { key: "time", label: "Time", render: (v) => <span style={{ color: T.t3, fontSize: 12 }}>{v}</span>, muted: true },
            ]}
          />
        </Surface>
      )}

      {subTab === "events" && (
        <Surface T={T} style={{ padding: 40, textAlign: "center" }}>
          <Zap size={40} color={T.t3} style={{ margin: "0 auto 12px" }} />
          <div style={{ color: T.t1, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Event stream</div>
          <div style={{ color: T.t2, fontSize: 13 }}>Stub: Live event stream will appear here.</div>
        </Surface>
      )}

      {subTab === "alerts" && (
        <Surface T={T} style={{ padding: 40, textAlign: "center" }}>
          <AlertCircle size={40} color={T.amber} style={{ margin: "0 auto 12px" }} />
          <div style={{ color: T.t1, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>1 active alert</div>
          <div style={{ color: T.t2, fontSize: 13 }}>Stub: Alert rules and thresholds.</div>
        </Surface>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ color: T.t1, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>Data & Metrics</div>
          <div style={{ color: T.t2, fontSize: 13, marginTop: 2 }}>Live streams · AI traces · Analytics</div>
        </div>
      </div>

      <SubNav T={T} tabs={subTabs} active={subTab} onChange={setSubTab} />

      <div
        style={{
          paddingTop: 20,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 16,
          alignItems: "stretch",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {isMobile && !appsOpen && (
          <button
            type="button"
            onClick={() => setAppsOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${T.borderMuted ?? T.border}`,
              background: T.raised,
              color: T.t2,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: F.sans,
              width: "100%",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={16} strokeWidth={1.5} />
            My apps
          </button>
        )}

        {(!isMobile || appsOpen) && (
          <DataAppsRail
            T={T}
            isMobile={isMobile}
            isOpen={appsOpen}
            onToggle={() => setAppsOpen((o) => !o)}
            selectedId={dataAppId}
            onSelect={setDataAppId}
          />
        )}

        <div style={{ flex: "1 1 0%", minWidth: 0, maxWidth: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mainColumn}
        </div>
      </div>

      <SlideOver T={T} open={!!selected} onClose={() => setSelected(null)} title="Trace Detail" subtitle={selected?.name}>
        {selected && (
          <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Badge T={T} color={selected.status === "success" ? T.green : T.red}>{selected.status}</Badge>
            {[
              ["Agent", selected.agent],
              ["Model", selected.model],
              ["Tokens", selected.tokens],
              ["Cost", selected.cost],
              ["Latency", selected.latency],
              ["Time", selected.time],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                <span style={{ color: T.t3 }}>{l}</span>
                <span style={{ color: T.t1, fontWeight: 600, fontFamily: F.mono }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
