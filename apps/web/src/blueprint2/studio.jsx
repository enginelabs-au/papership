import { useEffect, useState } from "react";
import {
  Banner, Empty, ErrorNote, Json, Kv, Link, Status, api, btn, card, chip, input, label, linkBtn, mono, navigate, short,
  useAction, useFocus, useLoad,
} from "./platform.jsx";
import { Pipeline, VersionCompare } from "./foundation-ui.jsx";

const PLANNED_TARGETS = ["papership-cloud", "self-hosted", "vercel"];
const PLANNED_ADAPTERS = ["hermes", "claude-code", "openai-agents", "langgraph"];
const EVAL_SAMPLE = [
  { id: "approval-required", name: "External actions wait for approval", input: { customer_name: "Sample Customer", customer_email: "sample@example.test", property_address: "1 Example Street, Fitzroy VIC", contact_id: "c-1002", question: "Is the property open for inspection this weekend?", listing: { inspection_times: "Saturday 10:00 to 10:30" } }, checks: [{ type: "has_field", field: "draft_reply" }, { type: "action_requires_approval" }] },
];

function Resolution({ result }) {
  if (!result) return null;
  return (
    <div style={{ ...card, borderColor: result.ok ? "var(--green)" : "var(--red)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>Resolver</strong><Status value={result.ok ? "implemented" : "failed"} />
        <span style={{ fontSize: 12, color: "var(--t3)" }}>{result.ok ? "Resolved. Saving records this exact lock." : "Cannot save until this is fixed."}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 6 }}>{result.method}</div>
      {result.errors.map((e, i) => <div key={i} role="alert" style={{ color: "var(--red)", fontSize: 12.5, padding: "2px 0" }}>{e.code}: {e.message}</div>)}
      {result.unsupported.map((u, i) => <div key={i} style={{ color: "var(--red)", fontSize: 12.5, padding: "2px 0" }}>Unsupported: {u.message}</div>)}
      {result.lock.map((i) => (
        <div key={i.name} style={{ padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
          <strong style={{ fontWeight: 600 }}>{i.name}@{i.version}</strong> <span style={chip}>{i.kind}</span> <span style={chip}>{i.license_class}</span>
          <div style={{ ...mono, marginTop: 2 }}>{short(i.content_hash)} · {i.reason}</div>
          <div style={{ ...mono, marginTop: 2 }}>
            publisher declares: {i.declared_compatibility.join(", ") || "nothing"} · platform tested: {i.tested_compatibility.length ? i.tested_compatibility.join(", ") : "not tested"}
          </div>
        </div>
      ))}
      {result.warnings.map((w, i) => <div key={i} style={{ color: "var(--amber)", fontSize: 12, padding: "2px 0" }}>{w}</div>)}
    </div>
  );
}

function Evaluation({ ev }) {
  if (!ev) return <Empty>Not evaluated yet.</Empty>;
  return (
    <div>
      <div style={{ fontSize: 12.5 }}>{ev.passed} of {ev.total} fixture checks passed.</div>
      <div style={{ fontSize: 11.5, color: "var(--t3)", margin: "2px 0 6px" }}>{ev.method} {ev.scope}</div>
      {ev.results.map((r) => (
        <div key={r.case_id} style={{ padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
          <Status value={r.passed ? "implemented" : "failed"} /> <strong style={{ fontWeight: 600 }}>{r.name}</strong>
          {r.checks.map((c, i) => <div key={i} style={{ ...mono, paddingLeft: 8 }}>{c.passed ? "pass" : "fail"} · {c.type} · {c.detail}</div>)}
        </div>
      ))}
    </div>
  );
}

function BlueprintDetail({ id, onBack }) {
  const { data: bp, error, reload } = useLoad(`/studio/blueprints/${encodeURIComponent(id)}`, [id]);
  const [pick, setPick] = useState(null);
  const [name, setName] = useState("");
  const [exported, setExported] = useState(null);
  const [published, setPublished] = useState(null);
  const { busy, note, run } = useAction(reload);
  if (error) return <ErrorNote error={error} />;
  if (!bp) return <Empty>Loading blueprint.</Empty>;
  const v = bp.versions.find((x) => x.version === pick) || bp.versions[0];
  const base = `/studio/blueprints/${bp.id}/versions/${v.version}`;
  const download = () => {
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${bp.slug}-v${v.version}.blueprint.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div><button type="button" style={btn(false)} onClick={onBack}>Back to blueprints</button></div>
      <div style={card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15 }}>{bp.title}</strong><span style={mono}>{bp.slug}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {bp.versions.map((x) => <button key={x.version} type="button" onClick={() => setPick(x.version)} style={btn(x.version === v.version)}>v{x.version}</button>)}
          </span>
        </div>
        <div style={{ ...mono, margin: "4px 0 8px" }}>immutable version {v.version} · {short(v.content_hash)} · saved {v.created_at} by {v.created_by}</div>
        <Kv k="Purpose">{v.config.purpose}</Kv>
        <Kv k="Boundaries">{v.config.boundaries.join(" · ") || "none"}</Kv>
        <Kv k="Inputs">{v.config.inputs.map((f) => `${f.name}:${f.type}${f.required ? "*" : ""}`).join(", ") || "none"}</Kv>
        <Kv k="Outputs">{v.config.outputs.map((f) => `${f.name}:${f.type}${f.required ? "*" : ""}`).join(", ") || "none"}</Kv>
        <Kv k="Runtime">{v.config.runtime.adapter} <span style={mono}>model setting {v.config.runtime.model}</span></Kv>
        <Kv k="Tools">{v.config.tools.map((t) => `${t.id} (${t.access})`).join(", ") || "none"}</Kv>
        <Kv k="Deployment target">{v.config.deployment ? v.config.deployment.target : "export-only"} <span style={mono}>configuration export only, nothing is deployed</span></Kv>
        <Kv k="Policy">external actions: {v.config.policy.external_actions.replace("_", " ")} · spend limit {v.config.policy.spend_limit_minor} minor units {v.config.policy.currency}</Kv>
      </div>
      <Pipeline bp={bp} version={v} />
      <div style={card}>
        <div style={label}>Locked materials (saved with this version)</div>
        {v.lock.map((i) => (
          <div key={i.name} style={{ padding: "4px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
            {i.name}@{i.version} <span style={mono}>{short(i.content_hash)} · {i.source}</span> <Link to={["registry", "", "package", i.name]}>open in Registry</Link>
          </div>
        ))}
        {!v.lock.length ? <Empty>No materials.</Empty> : null}
      </div>
      <VersionCompare bp={bp} current={v} />
      <div style={card}>
        <div style={label}>Fixture evaluation</div>
        <Evaluation ev={v.latest_evaluation} />
        <div style={{ marginTop: 8 }}><button type="button" disabled={busy} style={btn(true)} onClick={() => run(() => api.post(`${base}/evaluate`), "Fixture checks complete.")}>Run fixture checks</button></div>
      </div>
      <div style={card}>
        <div style={label}>Use this version</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input aria-label="Agent name" placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, width: 220 }} />
          <button type="button" disabled={busy || !name.trim()} style={btn(true)} onClick={async () => {
            const out = await run(() => api.post(`${base}/instantiate`, { name }), "Workspace agent created.");
            if (out) navigate("workspace", "Agents", "agent", out.id);
          }}>Create Workspace agent</button>
          <button type="button" disabled={busy} style={btn(false)} onClick={async () => { const out = await run(() => api.get(`${base}/export`)); if (out) setExported(out); }}>Export configuration</button>
          <button type="button" disabled={busy} style={btn(false)} onClick={async () => { const out = await run(() => api.post(`${base}/publish`, {}), "Published to the local Registry as a private bundle."); if (out) setPublished(out); }}>Publish to local Registry</button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>Export is configuration only. No deployment backend exists, and credentials are never included. Publishing stays on this machine and is private.</div>
        {note ? <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
        {published ? <div style={{ marginTop: 6, fontSize: 12.5 }}>{published.package}@{published.version}. <Link to={["registry", "", "package", published.package]}>Open in Registry</Link></div> : null}
        {exported ? <div style={{ marginTop: 8 }}><Json value={exported} /><div style={{ marginTop: 6 }}><button type="button" style={btn(false)} onClick={download}>Download JSON</button></div></div> : null}
      </div>
    </div>
  );
}

function Blueprints() {
  const { data, error } = useLoad("/studio/blueprints");
  const [sel, setSel] = useFocus("blueprint");
  if (sel) return <BlueprintDetail id={sel} onBack={() => setSel(null)} />;
  return (
    <div style={card}>
      <ErrorNote error={error} />
      <div style={label}>Blueprints</div>
      {data && data.items.length ? data.items.map((b) => (
        <div key={b.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line2)", flexWrap: "wrap" }}>
          <button type="button" style={linkBtn} onClick={() => setSel(b.id)}>{b.title}</button>
          <span style={mono}>{b.slug}</span>
          <span style={chip}>{b.versions.length} versions</span>
          <span style={chip}>{b.agents} agents</span>
        </div>
      )) : data ? <Empty>No blueprints. Build one, or seed the demo from Workspace overview.</Empty> : <Empty>Loading.</Empty>}
    </div>
  );
}

function Builder() {
  const { data: bps } = useLoad("/studio/blueprints");
  const { data: pk } = useLoad("/registry/packages");
  const [f, setF] = useState({
    slug: "", title: "", purpose: "", boundaries: "", inputs: "", outputs: "", adapter: "papership-demo-runtime", model: "deterministic-demo",
    tool: true, materials: "", spend: "5000", deploy: "export-only", cases: JSON.stringify(EVAL_SAMPLE, null, 2),
  });
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null);
  const { busy, note, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const lines = (t) => t.split("\n").map((s) => s.trim()).filter(Boolean);
  const fields = (t) => lines(t).map((l) => { const [name, type = "string", req] = l.split(":").map((s) => s.trim()); return { name, type, required: req === "required" }; });
  const mats = () => lines(f.materials).map((l) => { const [name, ...c] = l.split(/\s+/); return { name, constraint: c.join(" ") || "*" }; });
  const config = () => ({
    purpose: f.purpose, boundaries: lines(f.boundaries), inputs: fields(f.inputs), outputs: fields(f.outputs),
    runtime: { adapter: f.adapter, model: f.model }, tools: f.tool ? [{ id: "mock-crm", access: "propose_write" }] : [],
    materials: mats(), policy: { external_actions: "require_approval", spend_limit_minor: parseInt(f.spend, 10) || 0, currency: "AUD" },
    eval_cases: JSON.parse(f.cases || "[]"),
    deployment: { target: f.deploy, notes: "" },
  });
  const loadDemo = async () => {
    const first = bps?.items?.[0];
    if (!first) return;
    await run(async () => {
      const d = await api.get(`/studio/blueprints/${first.id}`);
      const c = d.versions[0].config;
      setF({
        slug: `${first.slug}-copy`, title: `${first.title} (copy)`, purpose: c.purpose, boundaries: c.boundaries.join("\n"),
        inputs: c.inputs.map((x) => `${x.name}:${x.type}${x.required ? ":required" : ""}`).join("\n"),
        outputs: c.outputs.map((x) => `${x.name}:${x.type}${x.required ? ":required" : ""}`).join("\n"),
        adapter: c.runtime.adapter, model: c.runtime.model, tool: c.tools.length > 0,
        materials: c.materials.map((m) => `${m.name} ${m.constraint}`).join("\n"), spend: String(c.policy.spend_limit_minor), deploy: (c.deployment && c.deployment.target) || "export-only", cases: JSON.stringify(c.eval_cases, null, 2),
      });
      return d;
    }, "Loaded the demo blueprint into the builder.");
  };
  const resolve = () => run(async () => {
    const r = await api.post("/studio/resolve", { materials: mats(), adapter: f.adapter === "papership-demo-runtime" ? f.adapter : "papership-demo-runtime" });
    setResult(r);
    return r;
  });
  const save = () => run(async () => {
    const out = await api.post("/studio/blueprints", { slug: f.slug, title: f.title, config: config() });
    setSaved(out);
    setResult(out.selection);
    return out;
  }, (out) => (out.created ? `Saved version ${out.version}. The resolver lock is recorded with it.` : `No change: identical to version ${out.version}.`));
  const addMaterial = (name) => { if (!lines(f.materials).some((l) => l.startsWith(`${name} `))) setF({ ...f, materials: `${f.materials}${f.materials ? "\n" : ""}${name} *` }); };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Banner tone="preview">Studio saves versioned blueprints, locks exact material versions, runs fixture checks and creates Workspace agents. It cannot deploy anywhere yet.</Banner>
      <div style={card}>
        <div style={label}>Identity and purpose</div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input aria-label="Blueprint slug" placeholder="slug, e.g. enquiry-assistant" value={f.slug} onChange={set("slug")} style={{ ...input, flex: "1 1 200px" }} />
            <input aria-label="Blueprint title" placeholder="Title" value={f.title} onChange={set("title")} style={{ ...input, flex: "2 1 260px" }} />
            <button type="button" style={btn(false)} disabled={busy || !(bps?.items || []).length} onClick={loadDemo}>Start from demo blueprint</button>
          </div>
          <textarea aria-label="Purpose and role" rows={3} placeholder="Purpose and role (at least 10 characters)" value={f.purpose} onChange={set("purpose")} style={input} />
          <textarea aria-label="Boundaries" rows={2} placeholder="Boundaries, one per line" value={f.boundaries} onChange={set("boundaries")} style={input} />
        </div>
      </div>
      <div style={card}>
        <div style={label}>Inputs and outputs</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <textarea aria-label="Inputs" rows={4} placeholder="name:type[:required] per line" value={f.inputs} onChange={set("inputs")} style={{ ...input, flex: "1 1 240px" }} />
          <textarea aria-label="Outputs" rows={4} placeholder="name:type[:required] per line" value={f.outputs} onChange={set("outputs")} style={{ ...input, flex: "1 1 240px" }} />
        </div>
      </div>
      <div style={card}>
        <div style={label}>Runtime and tools</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select aria-label="Runtime adapter" value={f.adapter} onChange={set("adapter")} style={input}>
            <option value="papership-demo-runtime">papership-demo-runtime (implemented, deterministic)</option>
            {PLANNED_ADAPTERS.map((a) => <option key={a} value={a}>{a} (planned, not available)</option>)}
          </select>
          <input aria-label="Model setting" value={f.model} onChange={set("model")} style={{ ...input, width: 180 }} />
          <label style={{ fontSize: 12.5 }}><input type="checkbox" checked={f.tool} onChange={set("tool")} /> Mock CRM (propose writes, simulated)</label>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>The demo runtime applies your materials with fixed templates. It calls no model. Planned adapters are refused on save.</div>
      </div>
      <div style={card}>
        <div style={label}>Deployment target</div>
        <select aria-label="Deployment target" value={f.deploy} onChange={set("deploy")} style={input}>
          <option value="export-only">export-only (implemented: download configuration)</option>
          {PLANNED_TARGETS.map((t) => <option key={t} value={t} disabled>{t} (planned, not available)</option>)}
        </select>
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>Papership does not host or deploy agents yet. Planned targets are refused if sent.</div>
      </div>
      <div style={card}>
        <div style={label}>Materials from the Registry</div>
        <textarea aria-label="Materials" rows={5} placeholder={"publisher/package constraint, one per line\nengine-labs/property-terminology ^1.1.0"} value={f.materials} onChange={set("materials")} style={{ ...input, width: "100%" }} />
        <div style={{ margin: "8px 0" }}>
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 4 }}>Add from your Registry:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pk ? pk.items.map((p) => <button key={p.name} type="button" onClick={() => addMaterial(p.name)} style={{ ...btn(false), font: "500 11px 'JetBrains Mono',monospace" }}>{p.name}</button>) : null}
          </div>
        </div>
        <button type="button" disabled={busy} style={btn(true)} onClick={resolve}>Resolve versions</button>
      </div>
      <Resolution result={result} />
      <div style={card}>
        <div style={label}>Policy and fixture eval cases</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5 }}>External actions: require approval (the only supported policy)</span>
          <input aria-label="Spend limit minor units" value={f.spend} onChange={set("spend")} style={{ ...input, width: 110 }} /><span style={mono}>minor units AUD</span>
        </div>
        <textarea aria-label="Eval cases JSON" rows={8} value={f.cases} onChange={set("cases")} style={{ ...input, width: "100%", font: "400 11.5px 'JetBrains Mono',monospace" }} />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>Check types: has_field, contains, not_contains, action_requires_approval, uses_material. These are fixture checks, not model quality scores.</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" style={btn(true)} disabled={busy || !f.slug || !f.title} onClick={() => { try { config(); save(); } catch { run(async () => { throw new Error("Eval cases must be valid JSON."); }); } }}>Save blueprint version</button>
        {saved ? <button type="button" style={btn(false)} onClick={() => navigate("studio", "Blueprints", "blueprint", saved.blueprint_id)}>Open saved blueprint</button> : null}
        {note ? <span style={{ fontSize: 12.5, color: note.startsWith("Saved") || note.startsWith("Loaded") || note.startsWith("No change") ? "var(--t2)" : "var(--red)" }}>{note}</span> : null}
      </div>
    </div>
  );
}

/** Latest fixture evaluation for every blueprint version, in one place. */
function Evaluations() {
  const { data, error } = useLoad("/studio/blueprints");
  const [details, setDetails] = useState({});
  const ids = data ? data.items.map((b) => b.id).join(",") : "";
  useEffect(() => {
    let live = true;
    (data ? data.items : []).forEach((b) => {
      api.get(`/studio/blueprints/${encodeURIComponent(b.id)}`).then((d) => { if (live) setDetails((m) => ({ ...m, [b.id]: d })); }).catch(() => {});
    });
    return () => { live = false; };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote error={error} />
      <Banner tone="preview">Fixture checks test structure and policy against sample inputs. They are not model quality scores.</Banner>
      {data && !data.items.length ? <div style={card}><Empty>No blueprints yet.</Empty></div> : null}
      {(data ? data.items : []).map((b) => {
        const d = details[b.id];
        return (
          <div key={b.id} style={card}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link to={["studio", "Blueprints", "blueprint", b.id]}>{b.title}</Link><span style={mono}>{b.slug}</span>
            </div>
            {d ? d.versions.map((v) => (
              <div key={v.version} style={{ padding: "6px 0", borderTop: "1px solid var(--line2)", marginTop: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>v{v.version}</span> <span style={mono}>{short(v.content_hash)}</span>
                <Evaluation ev={v.latest_evaluation} />
              </div>
            )) : <Empty>Loading.</Empty>}
          </div>
        );
      })}
    </div>
  );
}

/** What deployment means today: configuration export only. */
function Deployment() {
  const { data: caps } = useLoad("/platform/capabilities");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Banner tone="preview">Studio cannot deploy an agent anywhere yet. It saves, checks and exports configuration, and creates Workspace agents on this machine.</Banner>
      <div style={card}>
        <div style={label}>Deployment targets</div>
        {caps ? caps.deploy_targets.map((t) => (
          <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line2)" }}>
            <span style={mono}>{t.id}</span><Status value={t.status} />
            <span style={{ fontSize: 12, color: "var(--t3)" }}>{t.status === "implemented" ? "Download the blueprint configuration. No credentials are included." : "Planned. Saving a blueprint with this target is refused."}</span>
          </div>
        )) : <Empty>Loading.</Empty>}
      </div>
      <div style={card}>
        <div style={label}>Publishing</div>
        <Kv k="Local Registry">Publish a blueprint version as a private bundle from the blueprint page.</Kv>
        <Kv k="Public publication">Not available. Nothing leaves this installation.</Kv>
        <Kv k="Updating">Newer material versions are reviewed per agent in Workspace, then applied with the reviewed hash.</Kv>
      </div>
    </div>
  );
}

export function StudioPanel({ sub }) {
  if (sub === "Builder") return <Builder />;
  if (sub === "Evaluations") return <Evaluations />;
  if (sub === "Deployment") return <Deployment />;
  return <Blueprints />;
}
