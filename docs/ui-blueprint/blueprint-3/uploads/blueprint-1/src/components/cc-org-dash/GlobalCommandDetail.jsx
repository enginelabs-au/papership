import { Btn, Badge, Progress, F } from "./primitives";
import { GLOBAL_COMMAND } from "./data";

export function getGlobalCommandTitle(selection) {
  if (!selection) return "";
  const { kind, id, group } = selection;
  if (kind === "signals-feed") {
    if (group === "critical") return "Critical signals";
    if (group === "attention") return "Attention queue";
    return "FYI digest";
  }
  if (kind === "initiative" && id) return GLOBAL_COMMAND.initiatives.find((x) => x.id === id)?.title ?? "Initiative";
  if (kind === "objective" && id) return GLOBAL_COMMAND.objectives.find((x) => x.id === id)?.title ?? "Objective";
  if (kind === "milestone" && id) return GLOBAL_COMMAND.milestones.find((x) => x.id === id)?.title ?? "Milestone";
  if (kind === "blocker" && id) return GLOBAL_COMMAND.blockers.find((x) => x.id === id)?.title ?? "Blocker";
  if (kind === "note" && id) return GLOBAL_COMMAND.notes.find((x) => x.id === id)?.title ?? "Note";
  return "Detail";
}

function Row({ T, label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: `1px solid ${T.borderMuted ?? T.border}`, fontSize: 13 }}>
      <span style={{ color: T.t3 }}>{label}</span>
      <span style={{ color: T.t1, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

/** Right-hand breakdown for Company command selections — not a duplicate of feature screens */
export default function GlobalCommandDetail({ T, selection, setTab, onClose }) {
  if (!selection) return null;
  const { kind, id, group } = selection;

  const foot = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.borderMuted ?? T.border}` }}>
      <Btn T={T} small variant="default" onClick={() => { setTab("work"); onClose?.(); }}>
        Open Work
      </Btn>
      <Btn T={T} small variant="ghost" onClick={onClose}>
        Close
      </Btn>
    </div>
  );

  if (kind === "signals-feed" && group === "critical") {
    return (
      <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ color: T.t2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Critical — respond now</div>
        {GLOBAL_COMMAND.signals.critical.map((s) => (
          <div key={s.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.borderMuted ?? T.border}` }}>
            <div style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>{s.title}</div>
            <div style={{ color: T.t3, fontSize: 12, marginTop: 4 }}>
              {s.owner} · {s.age}
            </div>
          </div>
        ))}
        <p style={{ color: T.t3, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          Operational digest — not your full notification inbox. Wire Pager / Slack for paging.
        </p>
        {foot}
      </div>
    );
  }

  if (kind === "signals-feed" && group === "attention") {
    return (
      <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ color: T.t2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Attention — same day</div>
        {GLOBAL_COMMAND.signals.attention.map((s) => (
          <div key={s.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.borderMuted ?? T.border}` }}>
            <div style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>{s.title}</div>
            <div style={{ color: T.t3, fontSize: 12, marginTop: 4 }}>
              {s.owner} · {s.age}
            </div>
          </div>
        ))}
        {foot}
      </div>
    );
  }

  if (kind === "signals-feed" && group === "fyi") {
    return (
      <div style={{ padding: "16px 22px" }}>
        <p style={{ color: T.t2, fontSize: 13, lineHeight: 1.55 }}>
          {GLOBAL_COMMAND.signals.fyiCount} FYI-level signals are summarized from mail, CRM, and infra feeds. Connect your digest channel to hydrate this list.
        </p>
        {foot}
      </div>
    );
  }

  if (kind === "initiative" && id) {
    const ini = GLOBAL_COMMAND.initiatives.find((x) => x.id === id);
    if (!ini) return null;
    const hc = { green: T.green, amber: T.amber, neutral: T.t3 }[ini.health] || T.t3;
    return (
      <div style={{ padding: "16px 22px" }}>
        <Badge T={T} color={hc}>
          {ini.health}
        </Badge>
        <p style={{ color: T.t2, fontSize: 13, marginTop: 12, lineHeight: 1.55 }}>{ini.summary}</p>
        <Row T={T} label="Owner" value={ini.owner} />
        <Row T={T} label="Window" value={ini.window} />
        <Row T={T} label="Initiative ID" value={<span style={{ fontFamily: F.mono, fontSize: 12 }}>{ini.id}</span>} />
        {foot}
      </div>
    );
  }

  if (kind === "objective" && id) {
    const kr = GLOBAL_COMMAND.objectives.find((x) => x.id === id);
    if (!kr) return null;
    return (
      <div style={{ padding: "16px 22px" }}>
        <div style={{ marginBottom: 12 }}>
          <Progress value={kr.progress} T={T} color={T.accent} />
          <div style={{ color: T.t3, fontSize: 12, marginTop: 6 }}>{kr.progress}% confidence-weighted</div>
        </div>
        <p style={{ color: T.t2, fontSize: 13, lineHeight: 1.55 }}>{kr.detail}</p>
        <Row T={T} label="Period" value={kr.period} />
        <Row T={T} label="Function" value={kr.dept} />
        {foot}
      </div>
    );
  }

  if (kind === "milestone" && id) {
    const ms = GLOBAL_COMMAND.milestones.find((x) => x.id === id);
    if (!ms) return null;
    return (
      <div style={{ padding: "16px 22px" }}>
        <p style={{ color: T.t2, fontSize: 13, lineHeight: 1.55 }}>{ms.detail}</p>
        <Row T={T} label="Date" value={ms.date} />
        <Row T={T} label="Risk" value={ms.risk} />
        {foot}
      </div>
    );
  }

  if (kind === "blocker" && id) {
    const bl = GLOBAL_COMMAND.blockers.find((x) => x.id === id);
    if (!bl) return null;
    return (
      <div style={{ padding: "16px 22px" }}>
        <Badge T={T} color={T.red}>
          {bl.impact} impact
        </Badge>
        <p style={{ color: T.t2, fontSize: 13, marginTop: 12, lineHeight: 1.55 }}>{bl.detail}</p>
        <Row T={T} label="Team" value={bl.team} />
        {foot}
      </div>
    );
  }

  if (kind === "note" && id) {
    const n = GLOBAL_COMMAND.notes.find((x) => x.id === id);
    if (!n) return null;
    return (
      <div style={{ padding: "16px 22px" }}>
        <p style={{ color: T.t1, fontSize: 14, lineHeight: 1.55 }}>{n.preview}</p>
        <Row T={T} label="Updated" value={n.updated} />
        <p style={{ color: T.t3, fontSize: 12, marginTop: 12 }}>Executive pinboard — connect Notion / Confluence for full doc.</p>
        {foot}
      </div>
    );
  }

  return null;
}
