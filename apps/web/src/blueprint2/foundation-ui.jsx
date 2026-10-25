import { useState } from "react";
import {
  Empty, ErrorNote, Json, Kv, Link, Status, api, btn, card, chip, label, mono, short, useAction, useLoad,
} from "./platform.jsx";
import { useLive } from "./live.jsx";

function download(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Agent Passport: portable description of an agent. It describes, it never authorises. */
export function PassportCard({ agentId }) {
  const [open, setOpen] = useState(false);
  const { data, error } = useLoad(open ? `/workspace/agents/${encodeURIComponent(agentId)}/passport` : "", [open, agentId]);
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={label}>Agent Passport</div>
        <Status value="implemented" />
        <span style={chip}>draft Papership format</span>
        <button type="button" style={{ ...btn(false), marginLeft: "auto" }} onClick={() => setOpen(!open)}>{open ? "Hide passport" : "Show passport"}</button>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>
        A passport describes the agent, its origin, runtime controls and exact materials. It grants no access, and no credentials are included.
      </div>
      {open ? (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          <ErrorNote error={error} />
          {data ? (
            <>
              <Kv k="Schema"><span style={mono}>{data.schema}</span></Kv>
              <Kv k="Owner">{data.owner.organisation} <span style={mono}>{data.owner.organisation_id}</span></Kv>
              <Kv k="Persona">{data.role.persona} <span style={{ color: "var(--t3)" }}>(not an access role)</span></Kv>
              <Kv k="Origin">{data.origin.blueprint} v{data.origin.version} <span style={mono}>{short(data.origin.content_hash || "")}</span></Kv>
              <Kv k="Capabilities">{data.capabilities.length} materials, exact versions and hashes</Kv>
              <Kv k="Credentials">{data.credentials}</Kv>
              <Json value={data} />
              <div><button type="button" style={btn(false)} onClick={() => download(`${agentId}.agent-passport.json`, data)}>Download JSON</button></div>
            </>
          ) : !error ? <Empty>Loading passport.</Empty> : null}
        </div>
      ) : null}
    </div>
  );
}

function ChangeList({ k, items }) {
  if (!items || !items.length) return null;
  return <Kv k={k}><span style={mono}>{items.join(", ")}</span></Kv>;
}

/** Reviewable updates: a newer published version is shown as a diff and applied only against the reviewed hash. */
export function UpdatesCard({ agentId, onApplied }) {
  const { data, error, reload } = useLoad(`/platform/installs/updates?agent_id=${encodeURIComponent(agentId)}`, [agentId]);
  const after = async () => { await reload(); if (onApplied) onApplied(); };
  const { busy, note, run } = useAction(after);
  const items = data ? data.updates : [];
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={label}>Reviewable updates</div>
        <Status value="implemented" />
      </div>
      <ErrorNote error={error} />
      {data && !items.length ? <Empty>All installed materials are on the newest published version.</Empty> : null}
      {items.map((u) => (
        <div key={u.name} style={{ marginTop: 8, padding: 10, border: "1px solid var(--line)", borderRadius: 8, display: "grid", gap: 2 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 13 }}>{u.name}</strong>
            <span style={mono}>{u.from_version} to {u.to_version}</span>
            <span style={chip}>{u.within_requested_constraint ? `within ${u.requested_constraint}` : `outside ${u.requested_constraint}`}</span>
            {u.has_scripts ? <span style={{ ...chip, color: "var(--red)", borderColor: "var(--red)" }}>has scripts, cannot apply</span> : null}
          </div>
          <Kv k="Licence">{u.licence}</Kv>
          <ChangeList k="Files added" items={u.files_added} />
          <ChangeList k="Files removed" items={u.files_removed} />
          <ChangeList k="Files changed" items={u.files_changed} />
          <ChangeList k="Dependencies added" items={u.dependencies_added} />
          <ChangeList k="Dependencies removed" items={u.dependencies_removed} />
          <ChangeList k="Ranges changed" items={u.dependency_ranges_changed} />
          <Kv k="Reviewed hash"><span style={mono}>{short(u.reviewed_hash)}</span></Kv>
          <div style={{ marginTop: 6 }}>
            <button type="button" disabled={busy || u.has_scripts} style={btn(true)}
              onClick={() => run(() => api.post("/platform/installs/update", { agent_id: agentId, name: u.name, to_version: u.to_version, reviewed_hash: u.reviewed_hash }), `Updated ${u.name} to ${u.to_version}.`)}>
              Apply reviewed update
            </button>
          </div>
        </div>
      ))}
      {note ? <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
      <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>
        Nothing updates by itself. If the material changes after you review it, the apply is refused as a stale review.
      </div>
    </div>
  );
}

/** How outside systems can reach Papership, and what is real. */
export function AccessSurfaces() {
  const { caps } = useLive();
  const surfaces = caps ? caps.access_surfaces || [] : [];
  const targets = caps ? caps.deploy_targets || [] : [];
  return (
    <div style={card}>
      <div style={label}>Access surfaces and deployment targets</div>
      {surfaces.map((s) => (
        <div key={s.name} style={{ padding: "6px 0", borderBottom: "1px solid var(--line2)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 13 }}>{s.name}</strong><Status value={s.status} /><span style={chip}>{s.classification}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>{s.note}</div>
        </div>
      ))}
      {!surfaces.length ? <Empty>Loading.</Empty> : null}
      <div style={{ ...label, marginTop: 10 }}>Deployment targets</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {targets.map((t) => <span key={t.id} style={chip}>{t.id} <Status value={t.status} /></span>)}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>Only configuration export exists. Nothing is deployed or hosted for you.</div>
    </div>
  );
}

/** Define, assemble, build, test, deploy, publish, update. Each step shows what is true now. */
export function Pipeline({ bp, version }) {
  const evalDone = !!version.latest_evaluation;
  const evalOk = evalDone && version.latest_evaluation.passed === version.latest_evaluation.total;
  const steps = [
    { n: "Define", s: "implemented", d: `Version ${version.version} is saved and immutable.` },
    { n: "Assemble", s: version.lock.length ? "implemented" : "unavailable", d: version.lock.length ? `${version.lock.length} materials locked to exact hashes.` : "No materials locked." },
    { n: "Build", s: bp.agents > 0 ? "implemented" : "ready", d: bp.agents > 0 ? `${bp.agents} Workspace agents created.` : "Create a Workspace agent below." },
    { n: "Test", s: evalOk ? "implemented" : evalDone ? "failed" : "ready", d: evalDone ? `${version.latest_evaluation.passed} of ${version.latest_evaluation.total} fixture checks.` : "Run fixture checks below." },
    { n: "Deploy", s: "planned", d: "Not implemented. Export configuration only." },
    { n: "Publish", s: "ready", d: "Private, local Registry only." },
    { n: "Update", s: "implemented", d: "Reviewed in Workspace on each agent." },
  ];
  return (
    <div style={card}>
      <div style={label}>Pipeline</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {steps.map((st, i) => (
          <div key={st.n} style={{ flex: "1 1 120px", minWidth: 110, border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", background: "var(--raised)" }}>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{i + 1}. {st.n}</div>
            <div style={{ margin: "3px 0" }}><Status value={st.s} /></div>
            <div style={{ fontSize: 11, color: "var(--t2)" }}>{st.d}</div>
          </div>
        ))}
      </div>
      {bp.agents > 0 ? <div style={{ marginTop: 8, fontSize: 12 }}>See the agents in <Link to={["workspace", "Agents"]}>Workspace</Link>.</div> : null}
    </div>
  );
}

function diffList(a, b, keyFn, valFn) {
  const am = new Map(a.map((x) => [keyFn(x), valFn(x)]));
  const bm = new Map(b.map((x) => [keyFn(x), valFn(x)]));
  const out = [];
  for (const [k, v] of bm) if (!am.has(k)) out.push(`+ ${k} ${v}`);
  for (const [k, v] of am) if (!bm.has(k)) out.push(`- ${k} ${v}`);
  for (const [k, v] of bm) if (am.has(k) && am.get(k) !== v) out.push(`~ ${k} ${am.get(k)} to ${v}`);
  return out;
}

/** Compare two immutable blueprint versions: configuration fields and the resolver lock. */
export function VersionCompare({ bp, current }) {
  const others = bp.versions.filter((x) => x.version !== current.version);
  const [other, setOther] = useState(others.length ? others[0].version : null);
  if (!others.length) return null;
  const o = bp.versions.find((x) => x.version === other) || others[0];
  const cfgKeys = Object.keys({ ...o.config, ...current.config }).sort();
  const changed = cfgKeys.filter((k) => JSON.stringify(o.config[k]) !== JSON.stringify(current.config[k]));
  const lock = diffList(o.lock, current.lock, (i) => i.name, (i) => `${i.version} ${short(i.content_hash)}`);
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={label}>Compare versions</div>
        <select aria-label="Compare with version" value={o.version} onChange={(e) => setOther(Number(e.target.value))} style={{ font: "500 12px Inter,sans-serif", padding: "3px 6px" }}>
          {others.map((x) => <option key={x.version} value={x.version}>v{x.version}</option>)}
        </select>
        <span style={mono}>v{o.version} to v{current.version}</span>
      </div>
      {!changed.length && !lock.length ? <Empty>No differences in configuration or lock.</Empty> : null}
      {changed.map((k) => (
        <div key={k} style={{ padding: "4px 0", borderBottom: "1px solid var(--line2)", fontSize: 12 }}>
          <strong style={{ fontWeight: 600 }}>{k}</strong>
          <div style={{ ...mono, color: "var(--red)" }}>- {JSON.stringify(o.config[k]) ?? "absent"}</div>
          <div style={{ ...mono, color: "var(--green)" }}>+ {JSON.stringify(current.config[k]) ?? "absent"}</div>
        </div>
      ))}
      {lock.length ? <div style={{ marginTop: 6 }}><div style={label}>Lock changes</div>{lock.map((l) => <div key={l} style={mono}>{l}</div>)}</div> : null}
    </div>
  );
}
