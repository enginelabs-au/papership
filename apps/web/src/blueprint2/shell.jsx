import { useEffect, useState } from "react";
import { Ico, PATHS } from "./svg";
import { Empty, ErrorNote, Link, Status, navigate, useFocus, useLoad } from "./platform.jsx";
import { OPEN_JOB, TERMINAL_TASK, ago, approvalTitle, useLive } from "./live.jsx";
import { ContextSwitcher, Dropdown, MenuRule, PRODUCT_COPY, ProductSwitcher, Slash } from "./switcher.jsx";
import { GROUP_ICON, STRIP_LABEL, menuFor, modeOf, useLens } from "./lens.jsx";

/**
 * Product shell. The layout idea (icon strip, context rail, work pane, inspector, live dock, status bar with
 * an ask orb) follows docs/ui-blueprint/blueprint-3/Papership.dc.html. The content is the four products and the
 * records that connect them, not the mockup's sample company.
 */

export const ICONS = {
  home: PATHS.today,
  workspace: PATHS.work,
  registry: "M3 3.4h4.2a1.8 1.8 0 0 1 1.8 1.8v7.4M13 3.4H8.8A1.8 1.8 0 0 0 7 5.2v7.4",
  studio: "M3 13l.8-3L11 2.8 13.2 5 6 12.2zM9.6 4.2l2.2 2.2",
  exchange: "M2.4 5.4h9.2M9.4 3l2.4 2.4-2.4 2.4M13.6 10.6H4.4M6.6 8.2 4.2 10.6l2.4 2.4",
  settings: PATHS.settings,
};

export const PRODUCT_TABS = ["home", "workspace", "registry", "studio", "exchange"];
const STATUS_TONE = { implemented: "var(--green)", simulated: "var(--cyan)", demo: "var(--cyan)", preview: "var(--amber)", disabled: "var(--t3)", planned: "var(--t3)", unsupported: "var(--red)" };
const LAYOUT_KEY = "papership-layout";
const PRESETS = { focus: { rail: false, insp: false, dock: false }, split: { rail: true, insp: false, dock: false }, command: { rail: true, insp: true, dock: true } };

function initialLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
    if (saved && typeof saved.rail === "boolean") return saved;
  } catch { /* ignore */ }
  const w = typeof window === "undefined" ? 1280 : window.innerWidth;
  return w >= 1180 ? PRESETS.command : w >= 800 ? PRESETS.split : PRESETS.focus;
}

const dot = (c, size = 6) => <span style={{ width: size, height: size, borderRadius: "50%", background: c, flex: "none", display: "inline-block" }} />;
const kindTone = (k) => (/fail|reject|refus|cancel|stale|denied/.test(k) ? "var(--red)"
  : /pending|approval\.requested|awaiting|expired/.test(k) ? "var(--amber)"
  : /approved|deliver|validated|complete|installed|updated|created|saved|evaluated|published|seeded/.test(k) ? "var(--green)"
  : "var(--brand)");

// ---- context rail --------------------------------------------------------------------------------

function RailGroup({ label, n, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 2 }}>
      <button type="button" onClick={onToggle} className="ps-row" style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", height: 24, padding: "0 6px", border: 0, background: "transparent", color: "inherit", borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
        <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="var(--t3)" strokeWidth="2.2" style={{ flex: "none", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="m5.5 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ flex: 1, font: "600 9.5px Inter,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--t3)" }}>{label}</span>
        <span style={{ font: "500 9.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{n}</span>
      </button>
      {open ? <div>{children}</div> : null}
    </div>
  );
}

function RailRow({ colour, label, meta, onClick, active }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }} className="ps-row"
      style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 24, padding: "0 6px 0 13px", borderRadius: 6, cursor: "pointer", background: active ? "var(--brand-soft)" : "transparent" }}>
      {dot(colour)}
      <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {meta ? <span style={{ font: "400 9px 'JetBrains Mono',monospace", color: "var(--t3)", flex: "none" }}>{meta}</span> : null}
    </div>
  );
}

const PANEL_PATH = { rail: "M6.2 3v10", insp: "M10.2 3v10", dock: "M2 10h12" };
const PANEL_NAME = { rail: "left panel", insp: "right panel", dock: "bottom panel" };

function PanelToggle({ kind, open, onClick }) {
  const label = `${open ? "Hide" : "Show"} the ${PANEL_NAME[kind]}`;
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={open} onClick={onClick} className="ps-icon-btn ps-panel-toggle" data-on={open ? "1" : "0"}>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="12" height="10" rx="1.4" /><path d={PANEL_PATH[kind]} /></svg>
    </button>
  );
}

function PanelStub({ kind, onClick }) {
  const horizontal = kind === "dock";
  return (
    <div className={`ps-stub ps-stub-${kind}`} style={horizontal
      ? { flex: "none", height: 30, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 7px", borderTop: "1px solid var(--line)", background: "var(--chrome)" }
      : { flex: "none", width: 34, display: "flex", justifyContent: "center", padding: "7px 0", background: kind === "rail" ? "var(--raised)" : "var(--surface)", [kind === "rail" ? "borderRight" : "borderLeft"]: "1px solid var(--line)" }}>
      <PanelToggle kind={kind} open={false} onClick={onClick} />
    </div>
  );
}

function ContextRail({ tab, pages, tabLabels, currentSub, onCollapse }) {
  const live = useLive();
  const mode = modeOf(tab);
  const { role } = useLens(mode);
  const [open, setOpen] = useState({ needs: true, agents: true, flight: true, blueprints: true, exchange: true });
  const flip = (k) => () => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const [taskId] = useFocus("task");
  const [agentId] = useFocus("agent");
  const [bpId] = useFocus("blueprint");
  const inFlight = live.tasks.filter((t) => !TERMINAL_TASK.includes(t.status));
  const openJobs = live.jobs.filter((j) => OPEN_JOB.includes(j.status));
  const agentTasks = (id) => live.tasks.filter((t) => t.agent_id === id && !TERMINAL_TASK.includes(t.status)).length;
  const org = live.ctx ? live.ctx.organisation.name : "Organisation";
  const menu = mode === "home" ? [] : menuFor(mode, role, pages, tabLabels);
  const matches = (g) => g.tab === tab && (mode === "workspace" ? true : g.subs.includes(currentSub));
  const active = mode === "home" ? null : menu.find(matches) || (pages[tab] ? { label: tabLabels[tab] || tab, tab, subs: pages[tab].subs } : menu[0] || null);
  const showWork = mode === "workspace" || mode === "home";
  const showBlueprints = mode === "studio" || mode === "home";
  const showExchange = mode === "exchange" || mode === "home";
  return (
    <div className="ps-rail" style={{ width: "clamp(184px,19vw,240px)", flex: "none", background: "var(--raised)", borderRight: "1px solid var(--line)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", minHeight: 40, display: "flex", alignItems: "center", gap: 8, padding: "6px 9px 6px 11px", borderBottom: "1px solid var(--line2)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mode === "home" ? "Home" : active ? active.label : PRODUCT_COPY[mode].name}</div>
          <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mode === "home" ? org : `${PRODUCT_COPY[mode].name} · ${role ? role.title : org}`}
          </div>
        </div>
        <PanelToggle kind="rail" open onClick={onCollapse} />
      </div>
      <div style={{ flex: 1, padding: "6px 5px 14px" }}>
        {active ? (
          active.subs.length ? active.subs.map((s) => {
            const on = tab === active.tab && currentSub === s;
            return (
              <button key={s} type="button" className="ps-row" aria-current={on ? "page" : undefined} onClick={() => navigate(active.tab, s)}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", minHeight: 28, padding: "0 9px", border: 0, borderRadius: 6, background: on ? "var(--brand-soft)" : "transparent", color: on ? "var(--brand)" : "var(--t1)", fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: "pointer", textAlign: "left" }}>
                {s}
              </button>
            );
          }) : <div style={{ padding: "6px 9px", fontSize: 11.5, color: "var(--t3)", lineHeight: 1.45 }}>{active.label} has no sub menus. It opens as one page.</div>
        ) : (
          <div style={{ padding: "6px 9px", fontSize: 11.5, color: "var(--t3)", lineHeight: 1.45 }}>
            Choose a product from the Papership menu, or a component from the strip on the left, to see its sub menus here.
          </div>
        )}
        {showWork || showBlueprints || showExchange ? <div style={{ margin: "10px 7px 4px", font: "600 9px Inter,sans-serif", letterSpacing: ".13em", textTransform: "uppercase", color: "var(--t3)" }}>Live</div> : null}
        {showWork ? (
          <>
            <RailGroup label="Needs you" n={live.pending.length} open={open.needs} onToggle={flip("needs")}>
              {live.pending.length ? live.pending.map((a) => (
                <RailRow key={a.id} colour="var(--amber)" label={approvalTitle(a)} meta={ago(a.created_at)} onClick={() => navigate("workspace", "Approvals", a.task_id ? "task" : undefined, a.task_id || undefined)} />
              )) : <RailRow colour="var(--green)" label="Nothing is waiting" onClick={() => navigate("workspace", "Approvals")} />}
            </RailGroup>
            <RailGroup label="Agents" n={live.agents.length} open={open.agents} onToggle={flip("agents")}>
              {live.agents.length ? live.agents.map((a) => (
                <RailRow key={a.id} colour={a.status === "active" ? "var(--brand)" : "var(--t3)"} label={a.name} meta={agentTasks(a.id) ? `${agentTasks(a.id)} open` : "idle"} active={agentId === a.id} onClick={() => navigate("workspace", "Agents", "agent", a.id)} />
              )) : <RailRow colour="var(--t3)" label="No agents yet" onClick={() => navigate("studio", "Blueprints")} />}
            </RailGroup>
            <RailGroup label="Work in flight" n={inFlight.length} open={open.flight} onToggle={flip("flight")}>
              {inFlight.length ? inFlight.slice(0, 8).map((t) => (
                <RailRow key={t.id} colour={t.pending_approvals ? "var(--amber)" : "var(--brand)"} label={t.title} meta={t.status.replace(/_/g, " ")} active={taskId === t.id} onClick={() => navigate("workspace", "Tasks", "task", t.id)} />
              )) : <RailRow colour="var(--t3)" label="No open tasks" onClick={() => navigate("workspace", "Tasks")} />}
            </RailGroup>
          </>
        ) : null}
        {showBlueprints ? (
          <RailGroup label="Blueprints" n={live.blueprints.length} open={open.blueprints} onToggle={flip("blueprints")}>
            {live.blueprints.length ? live.blueprints.map((b) => (
              <RailRow key={b.id} colour="var(--cyan)" label={b.title} meta={`${b.versions.length} v`} active={bpId === b.id} onClick={() => navigate("studio", "Blueprints", "blueprint", b.id)} />
            )) : <RailRow colour="var(--t3)" label="None saved" onClick={() => navigate("studio", "Builder")} />}
          </RailGroup>
        ) : null}
        {showExchange ? (
          <RailGroup label="Exchange jobs (demo)" n={openJobs.length} open={open.exchange} onToggle={flip("exchange")}>
            {live.jobs.length ? live.jobs.slice(0, 6).map((j) => (
              <RailRow key={j.id} colour={kindTone(j.status)} label={j.capability_id} meta={j.status} onClick={() => navigate("exchange", "Jobs")} />
            )) : <RailRow colour="var(--t3)" label="No simulated jobs" onClick={() => navigate("exchange", "Catalogue")} />}
          </RailGroup>
        ) : null}
      </div>
    </div>
  );
}

// ---- inspector: the connected view of whatever is selected ---------------------------------------

function Group({ label, meta, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--line2)", borderRadius: 8, overflow: "hidden", marginTop: 6 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", padding: "7px 9px", border: 0, background: "var(--raised)", color: "inherit", cursor: "pointer" }}>
        <svg viewBox="0 0 16 16" width="8" height="8" fill="none" stroke="var(--t3)" strokeWidth="2.4" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="m5.5 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ flex: 1, font: "600 9.5px Inter,sans-serif", letterSpacing: ".09em", textTransform: "uppercase", color: "var(--t3)" }}>{label}</span>
        {meta ? <span style={{ font: "400 9px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{meta}</span> : null}
      </button>
      {open ? <div style={{ padding: "5px 9px 8px" }}>{children}</div> : null}
    </div>
  );
}

function Line({ k, children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--line2)", fontSize: 11 }}>
      <span style={{ width: 74, flex: "none", color: "var(--t3)" }}>{k}</span>
      <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function Controls({ controls }) {
  const rows = [["observe", "Observe"], ["invoke", "Invoke"], ["pause", "Pause"], ["cancel", "Cancel"], ["enforce_approval", "Enforce approval"]];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {rows.map(([k, l]) => (
        <span key={k} style={{ padding: "1px 6px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 10, color: controls && controls[k] ? "var(--green)" : "var(--t3)" }}>{l}: {controls && controls[k] ? "yes" : "no"}</span>
      ))}
    </div>
  );
}

function TaskInspector({ id, tab }) {
  const live = useLive();
  const { data: t, error } = useLoad(`/workspace/tasks/${encodeURIComponent(id)}`, [id, live.activity.length, live.pending.length]);
  if (error) return <ErrorNote error={error} />;
  if (!t) return <Empty>Loading.</Empty>;
  const quotes = live.quotes.filter((q) => q.task_id === id);
  const jobs = live.jobs.filter((j) => j.task_id === id);
  const events = live.activity.filter((a) => a.task_id === id);
  if (tab === "Related") {
    return (
      <>
        <Group label="Workspace" meta="agent and approvals">
          <Line k="Agent"><Link to={["workspace", "Agents", "agent", t.agent.id]}>{t.agent.name}</Link></Line>
          <Line k="Approvals">{t.approvals.length ? t.approvals.map((a) => <div key={a.id}><Status value={a.status} /> {approvalTitle(a)}</div>) : "none"}</Line>
          <Line k="Contact">{t.contact ? `${t.contact.name} (${t.contact.stage})` : "none"}</Line>
        </Group>
        <Group label="Studio" meta="where it came from">
          <Line k="Blueprint"><Link to={["studio", "Blueprints", "blueprint", t.agent.blueprint.id]}>{t.agent.blueprint.slug} v{t.agent.blueprint.version}</Link></Line>
        </Group>
        <Group label="Registry" meta={`${t.provenance.length} materials`}>
          {t.provenance.length ? t.provenance.map((p) => <Line key={p.name} k="Material"><Link to={["registry", "", "package", p.name]}>{p.name}@{p.version}</Link></Line>) : <Empty>No materials installed.</Empty>}
        </Group>
        <Group label="Exchange" meta="simulated">
          {quotes.length || jobs.length ? (
            <>
              {quotes.map((q) => <Line key={q.id} k="Quote"><Status value={q.status} /> {q.capability_id}</Line>)}
              {jobs.map((j) => <Line key={j.id} k="Job"><Status value={j.status} /> {j.capability_id}</Line>)}
              <div style={{ marginTop: 6 }}><Link to={["exchange", "Quotes"]}>Open Exchange</Link></div>
            </>
          ) : <Empty>No Exchange quote for this task.</Empty>}
        </Group>
      </>
    );
  }
  if (tab === "Authority") {
    const pending = t.approvals.filter((a) => a.status === "pending");
    return (
      <>
        <Group label="Your authority">
          <Line k="Role">{live.ctx ? live.ctx.member.role : "-"}</Line>
          <Line k="Decide">{live.ctx && live.ctx.member.can_decide_approvals ? "You can decide approvals" : "You cannot decide approvals"}</Line>
        </Group>
        <Group label="Pending proposals" meta={String(pending.length)}>
          {pending.length ? pending.map((a) => (
            <div key={a.id} style={{ fontSize: 11, padding: "4px 0" }}>{approvalTitle(a)}<div style={{ font: "400 9.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>binds to {a.payload_hash.slice(0, 16)}</div></div>
          )) : <Empty>None. A decision applies only to the exact proposal and goes stale if it changes.</Empty>}
        </Group>
        <Group label="Policy">
          <Line k="External">Every external action waits for a human decision.</Line>
          <Line k="Spend">{live.exchangeBudget ? `${live.exchangeBudget.currency} ${(live.exchangeBudget.remaining_minor / 100).toFixed(2)} left, simulated` : "-"}</Line>
        </Group>
      </>
    );
  }
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
      <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 2 }}>{t.id}</div>
      <div style={{ marginTop: 8 }}><Status value={t.status} /></div>
      <Group label="Enquiry">
        <Line k="Customer">{t.input.customer_name}</Line>
        <Line k="Property">{t.input.property_address}</Line>
        <Line k="Question">{t.input.question}</Line>
      </Group>
      <Group label="Result" meta={t.result.version ? `v${t.result.version}` : "none"}>
        {t.result.version ? <div style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "var(--t2)", maxHeight: 140, overflow: "auto" }}>{t.result.text}</div> : <Empty>No result yet.</Empty>}
      </Group>
      <Group label="Latest activity" meta={String(events.length)} defaultOpen={false}>
        {events.slice(0, 6).map((a) => <Line key={a.id} k={ago(a.created_at)}>{a.kind}</Line>)}
        {!events.length ? <Empty>None.</Empty> : null}
      </Group>
      <div style={{ marginTop: 10 }}><button type="button" className="ps-btn" onClick={() => navigate("workspace", "Tasks", "task", id)}>Open task</button></div>
    </>
  );
}

function AgentInspector({ id, tab }) {
  const live = useLive();
  const { data: a, error } = useLoad(`/workspace/agents/${encodeURIComponent(id)}`, [id]);
  if (error) return <ErrorNote error={error} />;
  if (!a) return <Empty>Loading.</Empty>;
  const tasks = live.tasks.filter((t) => t.agent_id === id);
  if (tab === "Related") {
    return (
      <>
        <Group label="Studio"><Line k="Blueprint"><Link to={["studio", "Blueprints", "blueprint", a.blueprint.id]}>{a.blueprint.title} v{a.blueprint.version}</Link></Line></Group>
        <Group label="Registry" meta={`${a.installs.length} installed`}>
          {a.installs.map((i) => <Line key={i.package_name} k="Material"><Link to={["registry", "", "package", i.package_name]}>{i.package_name}@{i.version}</Link></Line>)}
        </Group>
        <Group label="Workspace" meta={`${tasks.length} tasks`}>
          {tasks.map((t) => <Line key={t.id} k={t.status.replace(/_/g, " ")}><Link to={["workspace", "Tasks", "task", t.id]}>{t.title}</Link></Line>)}
          {!tasks.length ? <Empty>No tasks yet.</Empty> : null}
        </Group>
      </>
    );
  }
  if (tab === "Authority") {
    return (
      <>
        <Group label="What Papership can control"><Controls controls={a.controls} /></Group>
        <Group label="Autonomy"><div style={{ fontSize: 11, color: "var(--t2)" }}>{a.autonomy}</div></Group>
        <Group label="Passport"><div style={{ fontSize: 11, color: "var(--t2)" }}>A passport describes this agent. It grants no access. Export it from the agent page.</div></Group>
      </>
    );
  }
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
      <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 2 }}>{a.id}</div>
      <div style={{ marginTop: 8 }}><Status value={a.status} /></div>
      <Group label="Identity">
        <Line k="Runtime">{a.runtime}</Line>
        <Line k="Blueprint">{a.blueprint.slug} v{a.blueprint.version}</Line>
        <Line k="Materials">{a.installs.length} installed, exact versions</Line>
      </Group>
      <Group label="Fixture evaluation">
        {a.latest_evaluation ? <div style={{ fontSize: 11 }}>{a.latest_evaluation.passed} of {a.latest_evaluation.total} fixture checks passed. Not a model quality score.</div> : <Empty>Not evaluated.</Empty>}
      </Group>
      <div style={{ marginTop: 10 }}><button type="button" className="ps-btn" onClick={() => navigate("workspace", "Agents", "agent", id)}>Open agent</button></div>
    </>
  );
}

function BlueprintInspector({ id, tab }) {
  const live = useLive();
  const { data: bp, error } = useLoad(`/studio/blueprints/${encodeURIComponent(id)}`, [id]);
  if (error) return <ErrorNote error={error} />;
  if (!bp) return <Empty>Loading.</Empty>;
  const v = bp.versions[0];
  const agents = live.agents.filter((a) => a.blueprint.id === id);
  if (tab === "Related") {
    return (
      <>
        <Group label="Registry" meta={`${v.lock.length} locked`}>
          {v.lock.map((i) => <Line key={i.name} k="Locked"><Link to={["registry", "", "package", i.name]}>{i.name}@{i.version}</Link></Line>)}
        </Group>
        <Group label="Workspace" meta={`${agents.length} agents`}>
          {agents.map((a) => <Line key={a.id} k="Agent"><Link to={["workspace", "Agents", "agent", a.id]}>{a.name}</Link></Line>)}
          {!agents.length ? <Empty>No agent created from this blueprint.</Empty> : null}
        </Group>
      </>
    );
  }
  if (tab === "Authority") {
    return (
      <Group label="Policy saved in this version">
        <Line k="External">{v.config.policy.external_actions.replace("_", " ")}</Line>
        <Line k="Spend limit">{v.config.policy.currency} {(v.config.policy.spend_limit_minor / 100).toFixed(2)}</Line>
        <Line k="Deploy">{v.config.deployment ? v.config.deployment.target : "export only"}</Line>
      </Group>
    );
  }
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{bp.title}</div>
      <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 2 }}>{bp.slug} · {bp.versions.length} versions</div>
      <Group label="Purpose"><div style={{ fontSize: 11, color: "var(--t2)" }}>{v.config.purpose}</div></Group>
      <Group label="Runtime and tools">
        <Line k="Runtime">{v.config.runtime.adapter}</Line>
        <Line k="Tools">{v.config.tools.map((t) => t.id).join(", ") || "none"}</Line>
      </Group>
      <Group label="Fixture evaluation">
        {v.latest_evaluation ? <div style={{ fontSize: 11 }}>{v.latest_evaluation.passed} of {v.latest_evaluation.total} fixture checks passed.</div> : <Empty>Not evaluated.</Empty>}
      </Group>
      <div style={{ marginTop: 10 }}><button type="button" className="ps-btn" onClick={() => navigate("studio", "Blueprints", "blueprint", id)}>Open blueprint</button></div>
    </>
  );
}

function Inspector({ onClose }) {
  const live = useLive();
  const [tab, setTab] = useState("Detail");
  const [taskId, setTask] = useFocus("task");
  const [agentId, setAgent] = useFocus("agent");
  const [bpId, setBp] = useFocus("blueprint");
  const picks = [taskId && ["task", taskId, setTask], agentId && ["agent", agentId, setAgent], bpId && ["blueprint", bpId, setBp]].filter(Boolean);
  const [chosen, setChosen] = useState(null);
  const sel = picks.find((p) => p[0] === chosen) || picks[0];
  return (
    <div className="ps-insp" style={{ width: "clamp(224px,26vw,320px)", flex: "none", background: "var(--surface)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 2, height: 31, padding: "0 7px", borderBottom: "1px solid var(--line2)" }}>
        {["Detail", "Related", "Authority"].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className="ps-icon-btn" style={{ height: 21, padding: "0 9px", border: 0, borderRadius: 6, background: tab === t ? "var(--brand-soft)" : "transparent", color: tab === t ? "var(--brand)" : "var(--t2)", font: `${tab === t ? 600 : 500} 10.5px Inter,sans-serif`, cursor: "pointer" }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        <PanelToggle kind="insp" open onClick={onClose} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "11px 12px 20px" }}>
        {picks.length > 1 ? (
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {picks.map((p) => (
              <button key={p[0]} type="button" onClick={() => setChosen(p[0])} className="ps-btn" style={sel && sel[0] === p[0] ? { borderColor: "var(--brand)", color: "var(--brand)" } : undefined}>{p[0]}</button>
            ))}
          </div>
        ) : null}
        {!sel ? (
          <div style={{ padding: "22px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Nothing selected</div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>Open a task, agent or blueprint. Its links across Workspace, Registry, Studio and Exchange appear here.</div>
            {live.ctx ? (
              <div style={{ marginTop: 14, textAlign: "left" }}>
                <Group label="You"><Line k="Role">{live.ctx.member.role}</Line><Line k="Organisation">{live.ctx.organisation.name}</Line><Line k="Identity">{live.ctx.identity_note}</Line></Group>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {sel[0] === "task" ? <TaskInspector id={sel[1]} tab={tab} /> : null}
            {sel[0] === "agent" ? <AgentInspector id={sel[1]} tab={tab} /> : null}
            {sel[0] === "blueprint" ? <BlueprintInspector id={sel[1]} tab={tab} /> : null}
            <div style={{ marginTop: 10 }}><button type="button" className="ps-btn" onClick={() => sel[2](null)}>Clear selection</button></div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- live dock -----------------------------------------------------------------------------------

function DockRow({ time, kind, who, text, lines, taskId, tone }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div role="button" tabIndex={0} onClick={() => setOpen((o) => !o)} onKeyDown={(e) => { if (e.key === "Enter") setOpen((o) => !o); }} className="ps-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 9px", cursor: "pointer", font: "400 10px 'JetBrains Mono',monospace" }}>
        <span style={{ fontSize: 9, color: "var(--t3)", width: 48, flex: "none" }}>{time}</span>
        <svg viewBox="0 0 16 16" width="7" height="7" fill="none" stroke="var(--t3)" strokeWidth="2.6" style={{ flex: "none", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="m5.5 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {dot(tone)}
        <span style={{ fontSize: 9, color: tone, width: 118, flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kind}</span>
        <span style={{ fontSize: 9, color: "var(--t3)", width: 96, flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{who}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 10, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
      </div>
      {open ? (
        <div style={{ padding: "3px 9px 7px 74px", font: "400 9.5px 'JetBrains Mono',monospace" }}>
          {lines.map(([k, v]) => <div key={k} style={{ display: "flex", gap: 8, padding: "1px 0" }}><span style={{ width: 60, flex: "none", color: "var(--t3)" }}>{k}</span><span style={{ flex: 1, minWidth: 0, color: "var(--t2)", overflowWrap: "anywhere" }}>{v}</span></div>)}
          {taskId ? <button type="button" className="ps-btn" style={{ marginTop: 5 }} onClick={() => navigate("workspace", "Tasks", "task", taskId)}>Open task</button> : null}
        </div>
      ) : null}
    </div>
  );
}

const flat = (d) => Object.entries(d || {}).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
const clock = (iso) => (iso && iso.length >= 19 ? iso.slice(11, 19) : "");

function Dock({ onClose }) {
  const live = useLive();
  const [tab, setTab] = useState("Stream");
  const tabs = [["Stream", live.activity.length], ["Approvals", live.pending.length], ["Exchange", live.jobs.length + live.quotes.length]];
  return (
    <div className="ps-dock" style={{ flex: "none", height: "round(clamp(132px, 21vh, 178px), 2px)", borderTop: "1px solid var(--line)", background: "var(--sink)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 2, height: 26, padding: "0 7px", borderBottom: "1px solid var(--line2)", background: "var(--chrome)" }}>
        {tabs.map(([t, n]) => (
          <button key={t} type="button" onClick={() => setTab(t)} className="ps-icon-btn" style={{ display: "flex", alignItems: "center", gap: 5, height: 19, padding: "0 9px", border: 0, borderRadius: 5, background: tab === t ? "var(--brand-soft)" : "transparent", color: tab === t ? "var(--brand)" : "var(--t2)", font: `${tab === t ? 600 : 500} 10px Inter,sans-serif`, cursor: "pointer" }}>
            {t}<span style={{ font: "500 8.5px 'JetBrains Mono',monospace", opacity: 0.6 }}>{n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ font: "400 9px 'JetBrains Mono',monospace", color: "var(--t3)", marginRight: 5 }}>org-scoped · refreshes every 15s</span>
        <PanelToggle kind="dock" open onClick={onClose} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "3px 0 7px" }}>
        {tab === "Stream" ? (live.activity.length ? live.activity.map((a) => (
          <DockRow key={a.id} time={clock(a.created_at)} kind={a.kind} who={a.actor} tone={kindTone(a.kind)} taskId={a.task_id}
            text={`${a.entity_type} ${a.entity_id}`} lines={[["when", a.created_at], ["actor", a.actor], ["entity", `${a.entity_type} ${a.entity_id}`], ...flat(a.detail)]} />
        )) : <div style={{ padding: 12, fontSize: 11.5, color: "var(--t3)" }}>No activity yet. Seed the demo from Home.</div>) : null}
        {tab === "Approvals" ? (live.approvals.length ? live.approvals.map((a) => (
          <DockRow key={a.id} time={clock(a.created_at)} kind={`approval ${a.status}`} who={a.decided_by || "waiting"} tone={a.status === "pending" ? "var(--amber)" : a.status === "approved" ? "var(--green)" : "var(--t3)"} taskId={a.task_id}
            text={approvalTitle(a)} lines={[["status", a.status], ["binds to", a.payload_hash], ...(a.decided_at ? [["decided", a.decided_at]] : [])]} />
        )) : <div style={{ padding: 12, fontSize: 11.5, color: "var(--t3)" }}>No approvals yet.</div>) : null}
        {tab === "Exchange" ? (
          <>
            <div style={{ padding: "3px 9px", fontSize: 10, color: "var(--cyan)" }}>Simulated. No provider, payment or real result is involved.</div>
            {[...live.jobs.map((j) => ({ k: "job", x: j })), ...live.quotes.map((q) => ({ k: "quote", x: q }))].map(({ k, x }) => (
              <DockRow key={x.id} time={clock(x.created_at)} kind={`${k} ${x.status}`} who={x.capability_id} tone={kindTone(x.status)} taskId={x.task_id}
                text={x.id} lines={[["status", x.status], ["capability", x.capability_id], ["currency", x.currency || "AUD"]]} />
            ))}
            {!live.jobs.length && !live.quotes.length ? <div style={{ padding: 12, fontSize: 11.5, color: "var(--t3)" }}>No quotes or jobs yet.</div> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ---- icon strip: one labelled icon for each main component of the current menu ---------------------

function StripBtn({ icon, label, on, onClick, badge, title }) {
  return (
    <button type="button" title={title || label} aria-label={label} aria-current={on ? "page" : undefined} onClick={onClick} className="ps-strip-btn" data-on={on ? "1" : "0"}>
      <span style={{ position: "relative", display: "flex" }}>
        <Ico d={icon} size={19} />
        {badge ? <span style={{ position: "absolute", top: -3, right: -5, width: 7, height: 7, borderRadius: "50%", background: badge, border: "1.5px solid var(--chrome)" }} /> : null}
      </span>
      <span className="ps-strip-label">{label}</span>
    </button>
  );
}

function IconStrip({ tab, route, go, pages, tabLabels, currentSub, heyOpen, onHey }) {
  const live = useLive();
  const mode = modeOf(tab);
  const { role } = useLens(mode === "home" ? "workspace" : mode);
  const items = mode === "home"
    ? ["workspace", "registry", "studio", "exchange"].map((m) => ({ key: m, label: tabLabels[m], icon: ICONS[m], on: false, go: go(m), badge: m === "workspace" && live.pending.length ? "var(--amber)" : "" }))
    : menuFor(mode, role, pages, tabLabels).filter((g) => g.tab !== "settings").map((g) => {
      const inGroup = tab === g.tab && !route && (mode === "workspace" ? true : g.subs.includes(currentSub));
      const target = g.subs.length ? (tab === g.tab && g.subs.includes(currentSub) ? currentSub : g.subs[0]) : null;
      return {
        key: `${g.tab}:${g.label}`, label: STRIP_LABEL[g.label] || g.label, title: g.label, icon: GROUP_ICON[g.tab] || GROUP_ICON[g.label] || PATHS.work, on: inGroup,
        go: () => (target ? navigate(g.tab, target) : navigate(g.tab)),
        badge: g.tab === "workspace" && g.subs.includes("Approvals") && live.pending.length ? "var(--amber)" : "",
      };
    });
  return (
    <nav className="ps-strip" aria-label="Components">
      <div className="ps-strip-list">
        {items.map((it) => <StripBtn key={it.key} icon={it.icon} label={it.label} title={it.title} on={it.on} onClick={it.go} badge={it.badge} />)}
      </div>
      <div className="ps-strip-foot">
        <StripBtn icon={PATHS.star} label="Hey" title="Hey Papership" on={!!heyOpen} onClick={onHey} />
        <StripBtn icon={ICONS.settings} label="Settings" on={tab === "settings" && !route} onClick={go("settings")} />
      </div>
    </nav>
  );
}

// ---- shell ---------------------------------------------------------------------------------------

export function ProductShell({
  theme, cycleTheme, online, tab, route, go, pages, tabLabels,
  title, desc, chip, actions, subnav, children,
  onSearch, onHey, heyOpen, heyPanel, noticeCount, onBell, menuItems, banner,
  isMobile, onBack, hasBack,
}) {
  const live = useLive();
  const [layout, setLayout] = useState(initialLayout);
  useEffect(() => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* ignore */ } }, [layout]);
  const eff = isMobile ? PRESETS.focus : layout;
  const product = live.caps ? live.caps.products.find((p) => p.id === tab) : null;
  const latest = live.activity[0];
  const budget = live.exchangeBudget;
  const role = live.ctx ? live.ctx.member.role : "";
  const currentSub = (subnav || []).find((s) => s.on)?.label;
  const toggle = (k) => () => setLayout((l) => ({ ...l, [k]: !l[k] }));
  const initials = "CD";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {banner}
      <div className="ps-top">
        <ProductSwitcher tab={tab} go={go} productTabs={PRODUCT_TABS} icons={ICONS} />
        <Slash />
        <ContextSwitcher tab={tab} pages={pages} tabLabels={tabLabels} currentSub={currentSub} />
        <div style={{ flex: 1 }} />
        <button type="button" title="Search and ask (Cmd+K)" onClick={onSearch} className="ps-btn ps-search">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7.2" cy="7.2" r="4.3" /><path d="M10.5 10.5 14 14" strokeLinecap="round" /></svg>
          <span className="ps-hide-narrow">Search</span>
          <kbd className="ps-hide-narrow">⌘K</kbd>
        </button>
        <button type="button" title={`Theme: ${theme}`} aria-label={`Theme: ${theme}`} onClick={cycleTheme} className="ps-icon-btn ps-sq">
          <Ico d={theme === "light" ? PATHS.sun : PATHS.moon} size={13} />
        </button>
        <button type="button" title="Notifications" aria-label="Notifications" onClick={onBell} className="ps-icon-btn ps-sq" style={{ position: "relative" }}>
          <Ico d={PATHS.bell} size={13} />
          {noticeCount ? <span className="ps-count">{noticeCount}</span> : null}
        </button>
        <Dropdown width={236} align="right" trigger={({ open, toggle }) => (
          <button type="button" title="Account" aria-label="Account" aria-haspopup="menu" aria-expanded={open} onClick={toggle} className="ps-avatar">{initials}</button>
        )}>
          {(close) => (
            <>
              <div style={{ padding: "8px 10px 9px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Cam Douglas</div>
                <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{role || "signed in"}</div>
              </div>
              <MenuRule />
              {menuItems.map((m) => (
                <div key={m.label} role="menuitem" tabIndex={0} onClick={() => { close(); m.go(); }} onKeyDown={(e) => { if (e.key === "Enter") { close(); m.go(); } }}
                  className="ps-menu-item" style={{ color: m.danger ? "var(--red)" : undefined, fontSize: 12.5 }}>{m.label}</div>
              ))}
            </>
          )}
        </Dropdown>
      </div>

      <div className="ps-body" style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
        <IconStrip tab={tab} route={route} go={go} pages={pages} tabLabels={tabLabels} currentSub={currentSub} heyOpen={heyOpen} onHey={onHey} />

        {eff.rail ? <ContextRail tab={tab} pages={pages} tabLabels={tabLabels} currentSub={currentSub} onCollapse={() => setLayout((l) => ({ ...l, rail: false }))} /> : isMobile ? null : <PanelStub kind="rail" onClick={toggle("rail")} />}

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              <div style={{ flex: "none", background: "var(--canvas)", borderBottom: "1px solid var(--line2)" }}>
                <div style={{ minHeight: 34, display: "flex", alignItems: "center", gap: 9, padding: "5px 12px", flexWrap: "wrap" }}>
                  {hasBack ? <button type="button" className="ps-btn" onClick={onBack}>Back</button> : null}
                  <h1 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, flex: "none" }}>{title}</h1>
                  {product ? <span title={live.caps.status_meaning[product.status]} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 18, padding: "0 8px", borderRadius: 9, border: `1px solid ${STATUS_TONE[product.status] || "var(--line)"}`, color: STATUS_TONE[product.status] || "var(--t2)", font: "600 9.5px Inter,sans-serif", textTransform: "uppercase", letterSpacing: ".06em" }}>{product.status}</span> : null}
                  {chip ? <span style={{ height: 18, display: "inline-flex", alignItems: "center", padding: "0 8px", borderRadius: 9, background: "var(--brand-soft)", color: "var(--brand)", font: "600 9.5px Inter,sans-serif" }}>{chip}</span> : null}
                  <span className="ps-desc" style={{ font: "400 11px Inter,sans-serif", color: "var(--t3)", flex: 1, minWidth: 180 }}>{desc}</span>
                  {actions.map((a) => (
                    <button key={a.label} type="button" onClick={a.go} className="ps-btn" style={{ background: a.primary ? "var(--brand)" : undefined, color: a.primary ? "var(--brand-ink)" : undefined, borderColor: a.primary ? "var(--brand)" : undefined }}>{a.label}</button>
                  ))}
                </div>
                {subnav && subnav.length ? (
                  <div className="ps-sub" style={{ display: "flex", gap: 3, padding: "0 10px 7px", overflowX: "auto" }}>
                    {subnav.map((s) => (
                      <button key={s.label} type="button" onClick={s.go} aria-current={s.on ? "page" : undefined} className="ps-pill"
                        style={{ border: `1px solid ${s.on ? "var(--brand)" : "var(--line)"}`, background: s.on ? "var(--brand-soft)" : "transparent", color: s.on ? "var(--brand)" : "var(--t2)", fontWeight: s.on ? 600 : 500 }}>
                        {s.label}{s.count ? <span style={{ font: "500 9px 'JetBrains Mono',monospace", opacity: 0.7, marginLeft: 5 }}>{s.count}</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="ps-main" style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--wash)" }}>
                <div className="bp2-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px 40px", minWidth: 0 }}>
                  {!online ? (
                    <div className="bp2-offline" role="status">
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", marginTop: 4, flex: "none" }} />
                      <div><div style={{ fontSize: 12, fontWeight: 600 }}>Offline. Reconnecting.</div><div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>Showing the last known state.</div></div>
                    </div>
                  ) : null}
                  {children}
                </div>
              </div>
            </div>
            {eff.insp ? <Inspector onClose={() => setLayout((l) => ({ ...l, insp: false }))} /> : isMobile ? null : <PanelStub kind="insp" onClick={toggle("insp")} />}
            {heyOpen ? heyPanel : null}
          </div>
          {eff.dock ? <Dock onClose={() => setLayout((l) => ({ ...l, dock: false }))} /> : isMobile ? null : <PanelStub kind="dock" onClick={toggle("dock")} />}
        </div>
      </div>

      <div className="ps-status" style={{ flex: "none", height: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 11px", background: "var(--chrome)", borderTop: "1px solid var(--line)", position: "relative", zIndex: 50 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={toggle("dock")} className="ps-icon-btn" style={{ display: "flex", alignItems: "center", gap: 6, height: 20, padding: "0 7px", border: 0, background: "transparent", color: "var(--t2)", borderRadius: 5, cursor: "pointer", flex: "none" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "var(--brand)" : "var(--red)", animation: "pPulse 1.7s infinite" }} />
            <span style={{ font: "400 10px 'JetBrains Mono',monospace" }}>{online ? (layout.dock ? "live ▾" : "live ▴") : "offline"}</span>
          </button>
          <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {latest ? `${ago(latest.created_at)} ago · ${latest.kind} by ${latest.actor}` : live.loaded ? "No activity yet." : "Loading."}
          </span>
        </div>
        <button type="button" title="Ask or search (Cmd+K)" aria-label="Ask or search (Cmd+K)" onClick={onSearch} className="ps-orb">
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <defs>
              <linearGradient id="ps-orb-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#6d28d9" />
                <stop offset="0.45" stopColor="#8b5cf6" />
                <stop offset="0.75" stopColor="#22d3ee" />
                <stop offset="1" stopColor="#4ade80" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="18.5" fill="var(--surface)" stroke="url(#ps-orb-ring)" strokeWidth="3" />
            <g fill="none" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="19" cy="19" r="5.5" />
              <path d="M23 23 L27 27" />
            </g>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 9 }}>
          {budget ? <span className="ps-hide-narrow" style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)", whiteSpace: "nowrap" }}>exchange budget left {budget.currency} {(budget.remaining_minor / 100).toFixed(2)} (simulated)</span> : null}
          <span className="ps-hide-narrow" style={{ width: 1, height: 14, background: "var(--line)" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
            {dot(Object.keys(live.errors).length ? "var(--amber)" : "var(--green)")}
            <span style={{ fontSize: 11, color: "var(--t3)" }}>{Object.keys(live.errors).length ? `${Object.keys(live.errors).length} unavailable` : "all reachable"}</span>
          </span>
        </div>
      </div>

      <nav className="bp2-bottom" aria-label="Primary">
        {PRODUCT_TABS.map((k) => (
          <button key={k} type="button" data-on={!heyOpen && tab === k && !route ? "1" : "0"} onClick={go(k)}>
            <Ico d={ICONS[k]} size={19} />
            {tabLabels[k]}
          </button>
        ))}
        <button type="button" data-on={heyOpen ? "1" : "0"} onClick={onHey}>
          <Ico d={PATHS.star} size={19} />
          Hey Papership
        </button>
      </nav>
    </div>
  );
}

