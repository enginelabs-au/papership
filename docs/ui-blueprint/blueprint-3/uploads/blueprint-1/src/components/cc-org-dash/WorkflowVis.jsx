import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { Btn } from "./primitives";
import { F } from "./primitives";
import { WORKFLOW_PRESETS } from "./data";
import { Workflow, Plus, GitBranch, List, Zap } from "./icons";

const WF_ICON = { trigger: "⚡", filter: "⚙", ai: "◈", action: "→", end: "●" };
const NW = 144, NH = 52;
const RAIL_W = 216;

function clonePreset(p) {
  return {
    ...p,
    nodes: p.nodes.map((n) => ({ ...n })),
    edges: p.edges.map((e) => ({ ...e })),
  };
}

function cloneFromTemplate(template, id, name) {
  const idMap = {};
  template.nodes.forEach((n) => {
    idMap[n.id] = `${id}_${n.id}`;
  });
  return {
    id,
    name,
    status: "draft",
    summary: "Draft",
    nodes: template.nodes.map((n) => ({ ...n, id: idMap[n.id], x: n.x, y: n.y })),
    edges: template.edges.map((e) => ({ f: idMap[e.f], t: idMap[e.t] })),
  };
}

/** Orthogonal (Manhattan) connector — horizontal then vertical then horizontal */
function orthD(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

function arrowHead(xPrev, yPrev, x2, y2, fill) {
  const dx = x2 - xPrev;
  const dy = y2 - yPrev;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const back = 9;
  const wing = 4;
  const bx = x2 - ux * back;
  const by = y2 - uy * back;
  const px = -uy * wing;
  const py = ux * wing;
  return (
    <polygon
      points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`}
      fill={fill}
    />
  );
}

export default function WorkflowVis({ T }) {
  const [custom, setCustom] = useState([]);
  const allPresets = useMemo(
    () => [...WORKFLOW_PRESETS.map(clonePreset), ...custom],
    [custom]
  );

  const [activeId, setActiveId] = useState(WORKFLOW_PRESETS[0]?.id ?? "w1");
  const active = allPresets.find((p) => p.id === activeId) || allPresets[0];

  const [nodes, setNodes] = useState(() => clonePreset(WORKFLOW_PRESETS[0]).nodes);

  const presetEdges = useMemo(() => {
    const p = allPresets.find((x) => x.id === activeId);
    return p?.edges ? p.edges.map((e) => ({ ...e })) : [];
  }, [activeId, allPresets]);

  const prevActiveRef = useRef(activeId);
  useLayoutEffect(() => {
    if (prevActiveRef.current === activeId) return;
    prevActiveRef.current = activeId;
    const p = allPresets.find((x) => x.id === activeId);
    if (!p) return;
    setNodes(clonePreset(p).nodes);
  }, [activeId, allPresets]);

  const [selNode, setSelNode] = useState(null);
  const [drag, setDrag] = useState(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [editorMode, setEditorMode] = useState("node");
  const svgRef = useRef(null);

  const canvas = useMemo(() => {
    const w = Math.max(640, ...nodes.map((n) => n.x + NW + 80));
    const h = Math.max(260, ...nodes.map((n) => n.y + NH + 60));
    return { w, h };
  }, [nodes]);

  const onMouseDown = (e, id) => {
    e.stopPropagation();
    const r = svgRef.current.getBoundingClientRect();
    const n = nodes.find((x) => x.id === id);
    setDrag(id);
    setSelNode(id);
    setDragOff({ x: e.clientX - r.left - n.x, y: e.clientY - r.top - n.y });
  };

  const onMouseMove = useCallback(
    (e) => {
      if (!drag) return;
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      setNodes((p) =>
        p.map((n) =>
          n.id === drag
            ? {
                ...n,
                x: Math.max(0, e.clientX - r.left - dragOff.x),
                y: Math.max(0, e.clientY - r.top - dragOff.y),
              }
            : n
        )
      );
    },
    [drag, dragOff]
  );

  const onMouseUp = useCallback(() => setDrag(null), []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const sel = nodes.find((n) => n.id === selNode);

  const addWorkflow = () => {
    const id = `w_${Date.now()}`;
    const nw = cloneFromTemplate(WORKFLOW_PRESETS[1], id, "Untitled workflow");
    setCustom((c) => [...c, nw]);
    setActiveId(id);
  };

  const railBg = T.canvas;
  const accentLine = T.accent || "#0969da";

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        overflow: "hidden",
        background: T.raised,
        boxShadow: T.shadow,
        minHeight: 320,
      }}
    >
      {/* Fixed left rail — workflows + library (files-panel style, no collapse) */}
      <div
        style={{
          width: RAIL_W,
          flexShrink: 0,
          background: railBg,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          maxHeight: 420,
        }}
      >
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ color: T.t3, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Workflows
          </div>
          <button
            type="button"
            onClick={addWorkflow}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 10px",
              borderRadius: 6,
              border: `1px solid ${T.accentBorder || T.border}`,
              background: T.surface,
              color: T.accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: F.sans,
            }}
          >
            <Plus size={14} /> New workflow
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 10px" }}>
          {allPresets.map((p) => {
            const on = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  marginBottom: 6,
                  borderRadius: 6,
                  border: `1px solid ${on ? T.accentBorder || T.accent : T.border}`,
                  background: on ? T.surface : "transparent",
                  boxShadow: on ? T.shadowSm : "none",
                  cursor: "pointer",
                  fontFamily: F.sans,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Workflow size={15} color={on ? T.accent : T.t3} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: T.t1, fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ color: T.t3, fontSize: 10, marginTop: 2 }}>{p.summary}</div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: p.status === "active" ? T.green : p.status === "draft" ? T.amber : T.t3,
                        }}
                      >
                        {p.status}
                      </span>
                      <span style={{ color: T.t4, fontSize: 10 }}>{p.nodes.length} nodes</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ color: T.t3, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Add block
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Trigger", "Filter", "AI", "Action", "End"].map((label) => (
              <button
                key={label}
                type="button"
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  borderRadius: 999,
                  border: `1px solid ${T.border}`,
                  background: T.canvas,
                  color: T.t2,
                  cursor: "pointer",
                  fontFamily: F.sans,
                }}
              >
                + {label}
              </button>
            ))}
          </div>
          <div style={{ color: T.t4, fontSize: 10, marginTop: 8, lineHeight: 1.35 }}>
            Tip: drag nodes on the canvas; connectors follow automatically.
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            background: T.surface,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px", borderRadius: 8, background: T.canvas, border: `1px solid ${T.border}` }}>
            <button
              type="button"
              onClick={() => setEditorMode("node")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                background: editorMode === "node" ? T.surface : "transparent",
                boxShadow: editorMode === "node" ? T.shadowSm : "none",
                color: editorMode === "node" ? T.t1 : T.t3,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: F.sans,
              }}
            >
              <GitBranch size={13} /> Node editor
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("sequence")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                background: editorMode === "sequence" ? T.surface : "transparent",
                boxShadow: editorMode === "sequence" ? T.shadowSm : "none",
                color: editorMode === "sequence" ? T.t1 : T.t3,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: F.sans,
              }}
            >
              <List size={13} /> Sequence
            </button>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(130, 80, 223, 0.08)",
              border: `1px solid rgba(130, 80, 223, 0.2)`,
              minWidth: 120,
            }}
          >
            <Zap size={14} color="#8250df" />
            <span style={{ color: "#5a32a3", fontSize: 11, fontWeight: 500 }}>
              AI assist: layout and labels can be optimized automatically.
            </span>
          </div>
          <span style={{ color: T.t1, fontSize: 12, fontWeight: 600, marginRight: 4 }}>{active?.name}</span>
          <Btn T={T} small variant="default">
            + Node
          </Btn>
          <Btn T={T} small variant="primary">
            ▶ Run
          </Btn>
          <Btn T={T} small variant="default">
            Save
          </Btn>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <svg
            ref={svgRef}
            width={canvas.w}
            height={canvas.h}
            style={{ display: "block", userSelect: "none", cursor: drag ? "grabbing" : "default" }}
            onClick={(e) => {
              if (e.target === e.currentTarget || e.target.tagName === "svg") setSelNode(null);
            }}
          >
            <defs>
              <pattern id="wfdots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="11" cy="11" r=".65" fill={T.border} opacity={0.85} />
              </pattern>
            </defs>
            <rect width={canvas.w} height={canvas.h} fill="url(#wfdots)" opacity={0.9} />

            {presetEdges.map((e, i) => {
              const f = nodes.find((n) => n.id === e.f);
              const t = nodes.find((n) => n.id === e.t);
              if (!f || !t) return null;
              const x1 = f.x + NW;
              const y1 = f.y + NH / 2;
              const x2 = t.x;
              const y2 = t.y + NH / 2;
              const midX = (x1 + x2) / 2;
              const d = orthD(x1, y1, x2, y2);
              const active = selNode === e.f || selNode === e.t;
              const stroke = active ? accentLine : T.border;
              const sw = active ? 2.25 : 1.5;
              return (
                <g key={`${e.f}-${e.t}-${i}`}>
                  <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
                  {arrowHead(midX, y2, x2, y2, stroke)}
                </g>
              );
            })}

            {nodes.map((node) => {
              const isSel = selNode === node.id;
              const portStroke = isSel ? accentLine : T.border;
              const portFill = isSel ? `${accentLine}22` : T.surface;
              return (
                <g key={node.id} onMouseDown={(e) => onMouseDown(e, node.id)} style={{ cursor: "grab" }}>
                  <rect x={node.x + 2} y={node.y + 2} width={NW} height={NH} rx={6} fill="rgba(0,0,0,0.04)" />
                  <rect
                    x={node.x}
                    y={node.y}
                    width={NW}
                    height={NH}
                    rx={6}
                    fill={isSel ? `${node.color}18` : T.surface}
                    stroke={isSel ? node.color : T.border}
                    strokeWidth={isSel ? 2 : 1}
                  />
                  <rect x={node.x} y={node.y + 8} width={3} height={NH - 16} rx={2} fill={node.color} />
                  <text x={node.x + 16} y={node.y + NH / 2 - 6} fontSize="12" fontWeight="600" fill={isSel ? node.color : T.t1} fontFamily={F.sans}>
                    {node.label}
                  </text>
                  <text x={node.x + 16} y={node.y + NH / 2 + 9} fontSize="10" fill={T.t3} fontFamily={F.sans}>
                    {node.sub}
                  </text>
                  <circle cx={node.x + NW} cy={node.y + NH / 2} r={4.5} fill={portFill} stroke={portStroke} strokeWidth={1.5} />
                  <circle cx={node.x} cy={node.y + NH / 2} r={4.5} fill={portFill} stroke={portStroke} strokeWidth={1.5} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div
        style={{
          width: sel ? 210 : 0,
          flexShrink: 0,
          borderLeft: `1px solid ${T.border}`,
          overflow: "hidden",
          transition: "width .2s",
          background: T.surface,
        }}
      >
        {sel && (
          <div style={{ width: 210, padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: `${sel.color}18`,
                  border: `1px solid ${sel.color}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: sel.color,
                }}
              >
                {WF_ICON[sel.type] || "◇"}
              </div>
              <div>
                <div style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>{sel.label}</div>
                <div style={{ color: T.t3, fontSize: 11 }}>{sel.type}</div>
              </div>
            </div>
            {[
              ["Description", sel.sub],
              ["ID", sel.id],
              ["Connections", `${presetEdges.filter((e) => e.f === sel.id || e.t === sel.id).length} edges`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                <span style={{ color: T.t3 }}>{k}</span>
                <span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <Btn T={T} small variant="default" full>
                Edit Node
              </Btn>
              <Btn T={T} small variant="danger" full>
                Remove
              </Btn>
            </div>
          </div>
        )}
        {!sel && (
          <div style={{ width: 210, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 16, textAlign: "center", color: T.t4 }}>
            <div>
              <div style={{ fontSize: 20, marginBottom: 6 }}>◇</div>
              <div style={{ fontSize: 11 }}>Click a node</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
