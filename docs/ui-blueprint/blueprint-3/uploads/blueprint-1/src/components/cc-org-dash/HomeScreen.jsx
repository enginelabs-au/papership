import { useState, useMemo, useId } from "react";
import { Surface, Btn, Badge, Dot, Progress, SlideOver, SectionLabel, F, SubNav } from "./primitives";
import { DB } from "./data";
import {
  BarChart3,
  GitPullRequest,
  CheckCircle2,
  Activity,
  Star,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Calendar,
  Users,
} from "./icons";

const RANGE_OPTIONS = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
];

/** Deterministic pseudo-series for demo — shape changes slightly by range */
function buildSeries(len, seed = 1) {
  const out = [];
  let v = 42 + seed * 3;
  for (let i = 0; i < len; i++) {
    v += Math.sin(i * 0.35 + seed) * 4 + (i % 4) * 0.8 - 1.2;
    out.push(Math.max(8, Math.min(96, v)));
  }
  return out;
}

function AreaTrendChart({ T, data, color, height = 160, xTickLabels }) {
  const gradId = useId().replace(/:/g, "");
  const w = 400;
  const h = height;
  const pad = { l: 38, r: 12, t: 14, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const r = max - min || 1;
  const n = data.length;
  const points = data.map((v, i) => {
    const x = pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = pad.t + innerH - ((v - min) / r) * innerH;
    return { x, y };
  });
  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${lineD} L ${points[points.length - 1].x} ${pad.t + innerH} L ${points[0].x} ${pad.t + innerH} Z`;
  const yTicks = [0, 0.33, 0.66, 1].map((t) => Math.round(min + (1 - t) * (max - min)));

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.33, 0.66, 1].map((t, i) => {
        const y = pad.t + t * innerH;
        return (
          <line key={i} x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke={T.borderMuted ?? T.border} strokeWidth="1" opacity={0.6} />
        );
      })}
      <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
      <path d={lineD} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {yTicks.map((yv, i) => (
        <text key={i} x={pad.l - 6} y={pad.t + (i / 3) * innerH + 4} textAnchor="end" fill={T.t3} fontSize="10" fontFamily={F.mono}>
          {yv}
        </text>
      ))}
      {(xTickLabels || []).map((lab, i) => {
        const x = pad.l + (i / Math.max(1, xTickLabels.length - 1)) * innerW;
        return (
          <text key={lab} x={x} y={h - 8} textAnchor="middle" fill={T.t3} fontSize="10" fontFamily={F.sans}>
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

function DonutChart({ T, segments, size = 132 }) {
  const cx = size / 2;
  const cy = size / 2;
  const outer = 56;
  const inner = 36;
  const circum = 2 * Math.PI * outer;
  let offset = 0;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circum;
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={outer}
              fill="none"
              stroke={seg.color}
              strokeWidth={outer - inner}
              strokeDasharray={`${dash} ${circum - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </g>
      <circle cx={cx} cy={cy} r={inner - 2} fill={T.surface} />
    </svg>
  );
}

const TEAMS_PERF = [
  { id: "eng", name: "Engineering", color: "#7c3aed" },
  { id: "mkt", name: "Digital marketing", color: "#6366f1" },
  { id: "design", name: "Product design", color: "#8b5cf6" },
];

export default function HomeScreen({ T, isMobile }) {
  const [detailProject, setDetailProject] = useState(null);
  const [subTab, setSubTab] = useState("overview");
  const [metricsRange, setMetricsRange] = useState("7d");
  const [teamPerfId, setTeamPerfId] = useState("eng");

  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const statusColor = { on_track: T.green, at_risk: T.amber, planning: T.t3, done: T.green };
  const priorityColor = { high: T.red, medium: T.amber, low: T.t3 };

  const lineColor = T.purple ?? T.accent;
  const lineLen = metricsRange === "7d" ? 7 : metricsRange === "30d" ? 30 : 45;
  const lineSeries = useMemo(() => buildSeries(lineLen, metricsRange === "7d" ? 1 : metricsRange === "30d" ? 2 : 3), [lineLen, metricsRange]);
  const xLabels =
    metricsRange === "7d"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : metricsRange === "30d"
        ? ["W1", "W2", "W3", "W4"]
        : ["M1", "M2", "M3"];

  const xLabelsForChart = useMemo(() => {
    if (metricsRange === "7d") return xLabels;
    if (metricsRange === "30d") {
      const step = Math.floor(lineSeries.length / 4);
      return [0, 1, 2, 3].map((i) => {
        const idx = Math.min(i * step, lineSeries.length - 1);
        return `D${idx + 1}`;
      });
    }
    return ["Q1", "Q2", "Q3"];
  }, [metricsRange, lineSeries.length, xLabels]);

  const taskMix = useMemo(() => {
    const done = DB.tasks.filter((t) => t.status === "done").length;
    const prog = DB.tasks.filter((t) => t.status === "in_progress" || t.status === "review").length;
    const todo = Math.max(1, DB.tasks.filter((t) => t.status === "todo").length);
    return [
      { label: "Open", value: todo + prog, color: lineColor },
      { label: "Done", value: done, color: T.accent },
      { label: "Queued", value: Math.max(2, Math.round(todo * 0.4)), color: T.purpleBorder ?? "#c4b5fd" },
    ];
  }, [T.accent, lineColor, T.purpleBorder]);

  const teamSeries = useMemo(() => {
    const seed = TEAMS_PERF.findIndex((t) => t.id === teamPerfId) + 1;
    return buildSeries(24, seed);
  }, [teamPerfId]);

  const subTabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "pulse", label: "Pulse", icon: <Activity size={16} />, count: 7 },
    { id: "starred", label: "Starred", icon: <Star size={16} />, count: 3 },
    { id: "following", label: "Following", icon: <CheckCircle2 size={16} /> },
  ];

  const kpiCircles = [
    { label: "Open issues", value: String(DB.tasks.length), icon: <CheckCircle2 size={18} color={lineColor} /> },
    { label: "Active projects", value: String(DB.projects.length), icon: <GitPullRequest size={18} color={lineColor} /> },
    { label: "Integrations", value: String(DB.integrations.filter((i) => i.status === "connected").length), icon: <Activity size={18} color={lineColor} /> },
    { label: "Due this week", value: "12", icon: <Calendar size={18} color={lineColor} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.t2, fontSize: 13, marginBottom: 4 }}>
          {greet} · {now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div style={{ color: T.t1, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>Dashboard</div>
      </div>

      <SubNav T={T} tabs={subTabs} active={subTab} onChange={setSubTab} />

      <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Time range + onboarding strip */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ color: T.t1, fontSize: 14, fontWeight: 500 }}>
            <span style={{ color: T.t2, fontWeight: 400 }}>Metrics · </span>
            track performance across the workspace
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: T.t3, fontSize: 12, marginRight: 4 }}>Range</span>
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setMetricsRange(r.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${metricsRange === r.id ? T.purpleBorder ?? T.accentBorder : T.border}`,
                  background: metricsRange === r.id ? T.purpleBg ?? T.accentBg : T.surface,
                  color: metricsRange === r.id ? T.purple ?? T.accent : T.t2,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: F.sans,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <Surface T={T} style={{ padding: "18px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ color: T.t1, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Hi team — you&apos;re almost set up.</div>
            <div style={{ color: T.t3, fontSize: 13 }}>Connect integrations and invite colleagues to lift adoption scores.</div>
          </div>
          <Btn T={T} variant="primary" style={{ background: T.purple ?? T.btnPrimary, borderColor: T.purpleBorder }}>
            Finish setup
          </Btn>
        </Surface>

        {/* Circular KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
          {kpiCircles.map((k) => (
            <Surface key={k.label} T={T} style={{ padding: "16px 14px", textAlign: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  margin: "0 auto 10px",
                  border: `2px solid ${T.purpleBorder ?? T.accentBorder}`,
                  background: T.purpleBg ?? T.accentBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {k.icon}
              </div>
              <div style={{ color: T.t1, fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>{k.value}</div>
              <div style={{ color: T.t3, fontSize: 11, fontWeight: 500 }}>{k.label}</div>
            </Surface>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12 }}>
          {DB.stats.map((s) => (
            <Surface key={s.id} T={T} style={{ padding: "16px 18px" }}>
              <div style={{ color: T.t2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
              <div style={{ color: T.t1, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {s.up ? <TrendingUp size={13} color={T.green} /> : <TrendingDown size={13} color={T.amber} />}
                <span style={{ color: s.up ? T.green : T.amber, fontSize: 12, fontWeight: 500 }}>{s.delta}</span>
                <span style={{ color: T.t3, fontSize: 12 }}>vs last month</span>
              </div>
            </Surface>
          ))}
        </div>

        {subTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "stretch" }}>
              <Surface T={T} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.raised }}>
                  <div>
                    <div style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>Throughput trend</div>
                    <div style={{ color: T.t3, fontSize: 12 }}>Indexed activity · last {metricsRange === "7d" ? "7 days" : metricsRange === "30d" ? "30 days" : "90 days"}</div>
                  </div>
                  <button type="button" style={{ background: "none", border: "none", padding: 6, cursor: "pointer", color: T.t3, display: "flex" }} aria-label="Chart options">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div style={{ padding: "8px 12px 4px" }}>
                  <AreaTrendChart T={T} data={lineSeries} color={lineColor} height={168} xTickLabels={xLabelsForChart} />
                </div>
              </Surface>

              <Surface T={T} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.raised }}>
                  <div>
                    <div style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>Work mix</div>
                    <div style={{ color: T.t3, fontSize: 12 }}>Issues by status · snapshot</div>
                  </div>
                  <button type="button" style={{ background: "none", border: "none", padding: 6, cursor: "pointer", color: T.t3, display: "flex" }} aria-label="Chart options">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div style={{ padding: "16px 16px 20px" }}>
                  <DonutChart T={T} segments={taskMix} size={140} />
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 12 }}>
                    {taskMix.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>
              </Surface>
            </div>

            <Surface T={T} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, background: T.raised }}>
                <div>
                  <div style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>Team delivery</div>
                  <div style={{ color: T.t3, fontSize: 12 }}>Normalized completion rate by period</div>
                </div>
                <button type="button" style={{ background: "none", border: "none", padding: 6, cursor: "pointer", color: T.t3, display: "flex" }} aria-label="Chart options">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "160px 1fr", gap: 0, minHeight: 200 }}>
                <div style={{ borderRight: isMobile ? "none" : `1px solid ${T.border}`, borderBottom: isMobile ? `1px solid ${T.border}` : "none", padding: "10px 8px" }}>
                  {TEAMS_PERF.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTeamPerfId(t.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        marginBottom: 4,
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: F.sans,
                        fontSize: 12,
                        fontWeight: teamPerfId === t.id ? 600 : 400,
                        color: teamPerfId === t.id ? T.t1 : T.t2,
                        background: teamPerfId === t.id ? T.hover : "transparent",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Users size={14} color={t.color} />
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
                <div style={{ padding: "12px 14px 8px" }}>
                  <AreaTrendChart T={T} data={teamSeries} color={TEAMS_PERF.find((t) => t.id === teamPerfId)?.color ?? lineColor} height={176} xTickLabels={["", "25%", "50%", "75%"]} />
                </div>
              </div>
            </Surface>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16, alignItems: "start" }}>
          <Surface T={T} style={{ borderRadius: 8, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.borderMuted ?? T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.surface }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GitPullRequest size={15} color={T.t2} />
                <span style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>Active Projects</span>
                <Badge T={T}>{DB.projects.length}</Badge>
              </div>
              <Btn T={T} small variant="ghost">
                View all →
              </Btn>
            </div>
            {DB.projects.slice(0, 4).map((p, i) => {
              const rowSel = detailProject?.id === p.id;
              const rowLine = `1px solid ${T.borderMuted ?? T.border}`;
              return (
                <div
                  key={p.id}
                  onClick={() => setDetailProject(p)}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < 3 ? rowLine : "none",
                    cursor: "pointer",
                    transition: "background .12s",
                    background: rowSel ? T.accentBg : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!rowSel) e.currentTarget.style.background = T.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = rowSel ? T.accentBg : "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                      <Dot status={p.status} T={T} />
                      <span style={{ color: T.accent, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>{p.name}</span>
                      <Badge T={T} color={priorityColor[p.priority]}>
                        {p.priority}
                      </Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: T.t3, fontSize: 12 }}>{p.dept}</span>
                      <span style={{ color: T.t3, fontSize: 12, fontFamily: F.mono }}>{p.due}</span>
                      <span style={{ color: T.t1, fontSize: 12, fontWeight: 600 }}>{p.progress}%</span>
                    </div>
                  </div>
                  <Progress value={p.progress} color={statusColor[p.status]} T={T} />
                </div>
              );
            })}
          </Surface>

          <Surface T={T}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, background: T.raised, borderRadius: "6px 6px 0 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={15} color={T.t2} />
              <span style={{ color: T.t1, fontSize: 14, fontWeight: 600 }}>Recent activity</span>
            </div>
            {DB.activity.map((a, i) => (
              <div
                key={a.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: i < DB.activity.length - 1 ? `1px solid ${T.border}` : "none",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.dot, display: "inline-block", flexShrink: 0, marginTop: 6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.t1, fontSize: 13, lineHeight: 1.4 }}>{a.action}</div>
                  <div style={{ color: T.t3, fontSize: 12, marginTop: 2 }}>
                    <span style={{ color: T.accent, fontWeight: 500 }}>{a.user}</span> · {a.time}
                  </div>
                </div>
              </div>
            ))}
          </Surface>
        </div>
      </div>

      <SlideOver T={T} open={!!detailProject} onClose={() => setDetailProject(null)} title={detailProject?.name} subtitle={`${detailProject?.dept} · ${detailProject?.owner}`}>
        {detailProject && (
          <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge T={T} color={statusColor[detailProject.status]}>
                {detailProject.status.replace("_", " ")}
              </Badge>
              <Badge T={T} color={priorityColor[detailProject.priority]}>
                {detailProject.priority} priority
              </Badge>
              <Badge T={T}>{detailProject.dept}</Badge>
            </div>
            <div>
              <SectionLabel T={T}>Progress</SectionLabel>
              <div style={{ marginBottom: 8 }}>
                <Progress value={detailProject.progress} color={statusColor[detailProject.status]} T={T} />
              </div>
              <div style={{ color: T.t2, fontSize: 13 }}>
                {detailProject.progress}% complete · Due {detailProject.due}
              </div>
            </div>
            <div>
              <SectionLabel T={T}>Details</SectionLabel>
              {[["Owner", detailProject.owner], ["Department", detailProject.dept], ["Due Date", detailProject.due], ["Status", detailProject.status.replace("_", " ")]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.t3 }}>{l}</span>
                  <span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <SectionLabel T={T}>Related Tasks</SectionLabel>
              {DB.tasks
                .filter((t) => t.project === detailProject.name)
                .map((task) => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                    <Dot status={task.status} T={T} />
                    <span style={{ color: T.t1, fontSize: 12, flex: 1 }}>{task.title}</span>
                    <span style={{ color: T.t3, fontSize: 11 }}>{task.assignee.split(" ")[0]}</span>
                  </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn T={T} variant="default" small>
                Edit project
              </Btn>
              <Btn T={T} variant="default" small>
                View tasks
              </Btn>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
