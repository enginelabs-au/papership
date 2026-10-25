import { useCallback, useEffect, useState } from "react";
import { fetchPapershipJson, postPapershipJson } from "../api/papership.js";
import { Link, api, btn, card, chip, input, label, mono, navigate, setFocus, short, useFocus } from "./platform.jsx";

const signed = (n) => (n == null ? "–" : `${n > 0 ? "+" : ""}${Math.round(n * 100)} pts`);
const pct = (n) => (n == null ? "–" : `${Math.round(n * 100)}%`);

function Stat({ k, v, hint }) {
  return (
    <div style={{ ...card, flex: "1 1 140px" }}>
      <div style={label}>{k}</div>
      <div style={{ font: "600 22px Inter,sans-serif" }}>{v}</div>
      {hint ? <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

function PackageCard({ pkg, agents, onInstall, onOpen, busy }) {
  const [agent, setAgent] = useState("");
  const paid = pkg.license.class !== "open";
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line2)", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onOpen(pkg.name)} style={{ border: 0, background: "transparent", color: "var(--blue)", font: "600 13px Inter,sans-serif", cursor: "pointer", padding: 0 }}>{pkg.name}@{pkg.version}</button>
        <span style={chip}>{pkg.kind}</span>
        <span style={chip}>{paid ? `${pkg.license.class} · metadata only, no charge` : "open"}</span>
        <span style={{ ...chip, color: "var(--amber)" }} title="No review process exists yet. Treat all material as third-party.">trust {pkg.trust}</span>
        {pkg.has_scripts ? <span style={{ ...chip, color: "var(--red)" }} title="Contains scripts. Papership never runs them.">scripts</span> : null}
        {pkg.jurisdiction && pkg.jurisdiction.length ? <span style={chip}>{pkg.jurisdiction.join(", ")}</span> : null}
        <span style={{ ...mono, marginLeft: "auto" }}>{pkg.tokens} tokens{pkg.installs != null ? ` · ${pkg.installs} installs` : ""}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 4 }}>{pkg.description}</div>
      {pkg.lift && pkg.lift.reliable ? <div style={{ ...mono, marginTop: 4 }}>lift {signed(pkg.lift.lift)} against baseline (n={pkg.lift.n}); an association, not a causal measure</div> : null}
      {onInstall ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <select aria-label="Agent" value={agent} onChange={(e) => setAgent(e.target.value)} style={input}>
            <option value="">Me</option>
            {agents.map((a) => <option key={a.principal_id} value={a.principal_id}>{a.display_name}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={() => onInstall(pkg, agent)} style={btn(true)}>Install</button>
        </div>
      ) : null}
    </div>
  );
}


const EMPTY_FORM = { name: "", version: "1.0.0", kind: "context-pack", description: "", category: "", tags: "", jurisdiction: "", compatible: "", requires: "", licence: "open", spdx: "CC-BY-4.0", amount: "", visibility: "private", body: "" };

function PublishForm({ onDone }) {
  const [f, setF] = useState(EMPTY_FORM);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const requires = {};
      list(f.requires).forEach((r) => { const [n, c] = r.split(/\s+/); requires[n] = c || "*"; });
      const license = f.licence === "open"
        ? { class: "open", spdx: f.spdx }
        : { class: f.licence, spdx: f.spdx, pricing: { currency: "AUD", amount: Number(f.amount) || 0, unit: "install" } };
      const manifest = {
        schema: "papership.agent-package/1", name: f.name, version: f.version, kind: f.kind, description: f.description, category: f.category || "general",
        tags: list(f.tags), jurisdiction: list(f.jurisdiction).map((x) => x.toUpperCase()), compatible: list(f.compatible), requires, license, visibility: f.visibility,
      };
      const out = await postPapershipJson("/registry/packages", { manifest, files: { "SKILL.md": f.body } });
      await onDone(`Published ${out.name}@${out.version} locally${out.created === false ? " (identical to the existing version)" : ""}.`);
    } catch (e) {
      setErr(e.message || "Could not publish.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input aria-label="Package name" placeholder="publisher/package" value={f.name} onChange={set("name")} style={{ ...input, flex: "2 1 220px" }} />
        <input aria-label="Version" placeholder="1.0.0" value={f.version} onChange={set("version")} style={{ ...input, width: 90 }} />
        <select aria-label="Kind" value={f.kind} onChange={set("kind")} style={input}>
          {["skill", "context-pack", "workflow", "reference-pack", "eval-pack", "template-pack", "memory-pack", "persona", "policy-pack", "tool-pack", "dataset", "bundle"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select aria-label="Visibility" value={f.visibility} onChange={set("visibility")} style={input}>
          <option value="private">private</option>
          <option value="public">public (visible to other local organisations)</option>
        </select>
      </div>
      <input aria-label="Description" placeholder="One-line description, 10 to 400 characters" value={f.description} onChange={set("description")} style={input} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input aria-label="Category" placeholder="Category" value={f.category} onChange={set("category")} style={{ ...input, flex: "1 1 140px" }} />
        <input aria-label="Tags" placeholder="Tags, comma separated" value={f.tags} onChange={set("tags")} style={{ ...input, flex: "1 1 160px" }} />
        <input aria-label="Jurisdiction" placeholder="Jurisdiction, e.g. AU, AU-VIC" value={f.jurisdiction} onChange={set("jurisdiction")} style={{ ...input, flex: "1 1 160px" }} />
        <input aria-label="Declared compatibility" placeholder="Declared compatibility, e.g. papership-demo-runtime" value={f.compatible} onChange={set("compatible")} style={{ ...input, flex: "2 1 240px" }} />
      </div>
      <input aria-label="Dependencies" placeholder="Dependencies, comma separated: publisher/pkg ^1.0.0" value={f.requires} onChange={set("requires")} style={input} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Licence class" value={f.licence} onChange={set("licence")} style={input}>
          <option value="open">open</option>
          <option value="premium">premium (listed, not purchasable)</option>
          <option value="metered">metered (listed, not purchasable)</option>
        </select>
        <input aria-label="SPDX identifier" placeholder="SPDX" value={f.spdx} onChange={set("spdx")} style={{ ...input, width: 130 }} />
        {f.licence !== "open" ? <input aria-label="Price in AUD" placeholder="Price AUD per install" value={f.amount} onChange={set("amount")} style={{ ...input, width: 170 }} /> : null}
      </div>
      <textarea aria-label="SKILL.md content" rows={8} placeholder="SKILL.md: the instructions or context agents will receive. Plain text only." value={f.body} onChange={set("body")} style={input} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" disabled={busy || !f.name || !f.body.trim()} onClick={submit} style={btn(true)}>Publish locally</button>
        <span style={{ fontSize: 11.5, color: "var(--t3)" }}>Never include credentials. They are rejected.</span>
      </div>
      {err ? <div role="alert" style={{ fontSize: 12.5, color: "var(--red)" }}>{err}</div> : null}
    </div>
  );
}

/** Registry: find, read, publish, install and measure Agent Materials. */
export function RegistryPanel({ sub = "Browse" }) {
  const [sum, setSum] = useState(null);
  const [agents, setAgents] = useState([]);
  const [installs, setInstalls] = useState([]);
  const mode = sub === "Resolve" ? "resolve" : "search";
  const finding = sub === "Browse" || sub === "Resolve";
  const insights = sub === "Insights";
  const [text, setText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [results, setResults] = useState(null);
  const [pack, setPack] = useState(null);
  const [detail, setDetail] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [kindFilter, setKindFilter] = useState("");
  const [licFilter, setLicFilter] = useState("");
  const [wsAgents, setWsAgents] = useState([]);
  const [targetAgent, setTargetAgent] = useState("");
  const [constraint, setConstraint] = useState("*");
  const [placed, setPlaced] = useState(null);
  const [showPublish, setShowPublish] = useState(false);
  const [focusPkg] = useFocus("package");

  const load = useCallback(async () => {
    try {
      setSum(await fetchPapershipJson("/registry/loop"));
      setInstalls((await fetchPapershipJson("/registry/installs")).items || []);
      setResults((await fetchPapershipJson("/registry/packages")));
    } catch (error) {
      setNote(error.message || "The Registry is unavailable.");
    }
    try { setAgents((await fetchPapershipJson("/agents")).agents || []); } catch { setAgents([]); }
    try { setWsAgents((await api.get("/workspace/agents")).items || []); } catch { setWsAgents([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setNote("");
    try { await fn(); } catch (error) { setNote(error.message || "That did not complete."); } finally { setBusy(false); }
  };
  const go = () => run(async () => {
    setPack(null);
    setDetail(null);
    if (mode === "search") {
      setResults(await fetchPapershipJson(`/registry/packages?q=${encodeURIComponent(text)}`));
    } else {
      setPack(await postPapershipJson("/registry/resolve", { task: text, runtime: "web", ...(jurisdiction ? { jurisdiction } : {}) }));
      await load();
    }
  });
  const open = (name) => run(async () => {
    setFile(null);
    setDetail(await fetchPapershipJson(`/registry/packages/${name}`));
  });
  useEffect(() => {
    if (focusPkg) {
      open(focusPkg);
      setFocus("package", null);
    }
  }, [focusPkg]); // eslint-disable-line react-hooks/exhaustive-deps
  const placeOnAgent = (name) => run(async () => {
    const out = await api.post("/platform/installs", { agent_id: targetAgent, name, constraint: constraint || "*" });
    setPlaced(out);
    await load();
  });
  const readFile = (name, version, path) => run(async () => {
    const out = await fetchPapershipJson(`/registry/packages/${name}/versions/${version}`);
    setFile({ path, text: out.files[path], name, version });
  });
  const install = (pkg, agent) => run(async () => {
    const out = await postPapershipJson("/registry/install", { name: pkg.name, ...(agent ? { agent_id: agent } : {}) });
    setNote(`Installed ${out.lock.map((i) => `${i.name}@${i.version}`).join(", ")}. No charge.`);
    await load();
  });
  const outcome = (value) => run(async () => {
    await postPapershipJson("/registry/outcomes", { delivery_id: pack.delivery_id, outcome: value, source: "human" });
    setNote(`Recorded: ${value}.`);
    await load();
  });

  const lift = sum?.lift;
  const visible = ((results && results.items) || []).filter((p) => (!kindFilter || p.kind === kindFilter) && (!licFilter || p.license.class === licFilter));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {finding || insights ? (
      <div style={{ ...card, background: "var(--raised)", fontSize: 13, color: "var(--t2)", lineHeight: 1.55 }}>
        The Registry holds installable Agent Materials: skills, context packs, workflows, references, evals and more. Browsing and installing are free.
        Agents reach the same Registry through the <code>find_materials</code> MCP tool and <code>POST /registry/resolve</code>; the Workspace uses it when an agent has a knowledge gap.
        All material is third-party and unreviewed; Papership never runs anything inside a package.
      </div>
      ) : null}

      {finding || insights ? (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat k="Packages" v={sum ? `${sum.visible_packages}` : "–"} hint={sum ? `${sum.own_packages} published by you` : ""} />
        <Stat k="Installs" v={sum ? `${sum.installs}` : "–"} hint="across your agents" />
        <Stat k="Deliveries" v={sum ? `${sum.deliveries}` : "–"} hint="resolved for tasks" />
        <Stat k="With an outcome" v={lift ? `${lift.resolved_deliveries}` : "–"} hint={`baseline ${pct(lift?.baseline_success_rate)}`} />
      </div>
      ) : null}

      {finding ? (<>

      <div style={card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={() => navigate("registry", "Browse")} style={btn(mode === "search")}>Search</button>
          <button type="button" onClick={() => navigate("registry", "Resolve")} style={btn(mode === "resolve")}>Resolve for a task</button>
        </div>
        <textarea aria-label={mode === "search" ? "Search" : "Task"} rows={mode === "search" ? 1 : 2} value={text} onChange={(e) => setText(e.target.value)} style={{ ...input, width: "100%" }}
          placeholder={mode === "search" ? "commercial property leasing" : "What is the agent about to do? e.g. review a retail lease in NSW"} />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          {mode === "resolve" ? <input aria-label="Jurisdiction" placeholder="Jurisdiction, e.g. AU-NSW" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value.toUpperCase())} style={{ ...input, width: 170 }} /> : null}
          <button type="button" disabled={busy || (mode === "resolve" && !text.trim())} onClick={go} style={btn(true)}>{mode === "search" ? "Search" : "Resolve"}</button>
        </div>
        {note ? <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--t2)" }}>{note}</div> : null}
      </div>

      {pack ? (
        <div style={card}>
          <div style={label}>Resolved material set</div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>
            {pack.gap ? ({ registry_empty: "The Registry has no published materials you can see yet.", no_matching_material: "Nothing published matches this task. That is a knowledge gap and is recorded as demand.", filtered_out: "Materials exist, but none passed your filters." }[pack.gap] || pack.gap)
              : `${pack.packages.length} packages · ${pack.tokens} of ${pack.token_budget} tokens · charged ${pack.cost.charged}`}
          </div>
          {pack.packages.map((p) => <PackageCard key={p.name} pkg={p} agents={agents} onInstall={install} onOpen={open} busy={busy} />)}
          {pack.chunks.map((c, i) => (
            <div key={`${c.package}-${c.path}-${i}`} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line2)", marginBottom: 6 }}>
              <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{c.package}@{c.version} :: {c.path}{c.heading ? ` # ${c.heading}` : ""}</div>
              <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 4, whiteSpace: "pre-wrap", maxHeight: 96, overflow: "hidden" }}>{c.text}</div>
            </div>
          ))}
          {pack.packages.length ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "var(--t2)" }}>Did the task succeed with this material?</span>
              <button type="button" disabled={busy} onClick={() => outcome("success")} style={btn(true)}>Success</button>
              <button type="button" disabled={busy} onClick={() => outcome("partial")} style={btn(false)}>Partial</button>
              <button type="button" disabled={busy} onClick={() => outcome("failure")} style={btn(false)}>Failure</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={card}>
          <div style={label}>{results && results.query ? `Results for “${results.query}”` : "Latest packages"}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <select aria-label="Filter by kind" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={input}>
              <option value="">All kinds</option>
              {["skill", "context-pack", "workflow", "reference-pack", "eval-pack", "template-pack", "memory-pack", "persona", "policy-pack", "tool-pack", "dataset", "bundle"].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select aria-label="Filter by licence" value={licFilter} onChange={(e) => setLicFilter(e.target.value)} style={input}>
              <option value="">Open and paid</option>
              <option value="open">Open only</option>
              <option value="premium">Premium (not installable)</option>
              <option value="metered">Metered (not installable)</option>
            </select>
          </div>
          {results && visible.length ? visible.map((p) => <PackageCard key={p.name} pkg={p} agents={agents} onInstall={install} onOpen={open} busy={busy} />)
            : <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Nothing matches. Publish below, with <code>papership publish ./folder</code>, or seed the demo from Workspace.</div>}
        </div>
      )}

      {detail ? (
        <div style={card}>
          <div style={label}>{detail.name}@{detail.version}</div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 6 }}>{detail.description}</div>
          <div style={{ ...mono, marginBottom: 6 }}>
            Versions: {detail.versions.map((v) => `${v.version}${v.status === "yanked" ? " (yanked)" : ""}`).join(", ")}
            {Object.keys(detail.requires || {}).length ? ` · requires ${Object.entries(detail.requires).map(([k, v]) => `${k} ${v}`).join(", ")}` : ""}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 6 }}>
            Publisher <strong>{detail.publisher}</strong> · {detail.kind} · {detail.license.class} licence{detail.license.spdx ? ` (${detail.license.spdx})` : ""} · {detail.visibility}
            {detail.license.pricing ? ` · listed at ${detail.license.pricing.currency} ${detail.license.pricing.amount} per ${detail.license.pricing.unit}, not purchasable here` : ""}
          </div>
          <div style={{ ...mono, marginBottom: 6 }}>
            Publisher declares compatibility: {(detail.declared_compatibility || []).join(", ") || "nothing"} · Platform tested: {detail.tested_compatibility && detail.tested_compatibility.length ? detail.tested_compatibility.join(", ") : "not tested"}
          </div>
          <div style={{ ...mono, marginBottom: 6 }}>
            Provenance: {detail.provenance ? `${detail.provenance.source} · content ${short(detail.provenance.content_hash)} · published by ${detail.provenance.published_by}. ${detail.provenance.assertion}` : "unknown"}
          </div>
          <div style={{ ...mono, marginBottom: 8 }}>Versions: {detail.versions.map((v) => `${v.version} ${short(v.content_hash)}`).join(" · ")}</div>
          {detail.license.class === "open" ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <select aria-label="Workspace agent" value={targetAgent} onChange={(e) => setTargetAgent(e.target.value)} style={input}>
                <option value="">Choose a Workspace agent</option>
                {wsAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input aria-label="Version constraint" value={constraint} onChange={(e) => setConstraint(e.target.value)} style={{ ...input, width: 90 }} />
              <button type="button" disabled={busy || !targetAgent} onClick={() => placeOnAgent(detail.name)} style={btn(true)}>Install onto agent</button>
              <span style={mono}>records exact version and source. No charge.</span>
            </div>
          ) : <div style={{ fontSize: 12.5, color: "var(--amber)", marginBottom: 8 }}>Not installable: paid and metered installs are unavailable. The price is metadata only.</div>}
          {placed ? (
            <div style={{ fontSize: 12.5, color: "var(--t2)", marginBottom: 8 }}>
              Installed {placed.selection.lock.map((i) => `${i.name}@${i.version}`).join(", ")} on <Link to={["workspace", "Agents", "agent", placed.agent_id]}>the agent</Link>. Source registry:local.
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {detail.files.map((f) => <button key={f} type="button" onClick={() => readFile(detail.name, detail.version, f)} style={{ ...btn(false), font: "500 11px 'JetBrains Mono',monospace" }}>{f}</button>)}
          </div>
          {file ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ ...mono, marginBottom: 4 }}>{file.path} · third-party content, shown as text only</div>
              <pre style={{ margin: 0, padding: 10, borderRadius: 8, background: "var(--raised)", fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto" }}>{file.text}</pre>
            </div>
          ) : null}
        </div>
      ) : null}

      </>) : null}

      {sub === "Publish" ? (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...label, marginBottom: 0 }}>Publish a material</div>
          <button type="button" onClick={() => setShowPublish(!showPublish)} style={{ ...btn(false), marginLeft: "auto" }}>{showPublish ? "Close" : "New material"}</button>
        </div>
        {showPublish ? <PublishForm onDone={async (msg) => { setNote(msg); setShowPublish(false); await load(); }} /> : (
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 6 }}>Local only. Versions are immutable and stay private by default. Nothing is published outside this installation.</div>
        )}
      </div>

      ) : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {sub === "Installed" ? (
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={label}>Installed</div>
          {installs.length ? installs.slice(0, 12).map((i) => (
            <div key={`${i.agent_id}-${i.name}`} style={{ padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
              {i.name}@{i.version} <span style={mono}>for {i.agent_id}</span>
            </div>
          )) : <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Nothing installed yet.</div>}
        </div>
        ) : null}
        {insights ? (<>
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={label}>Knowledge gaps (demand)</div>
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 6 }}>Tasks where nothing published matched. This is what to publish next.</div>
          {sum && sum.demand_gaps.length ? sum.demand_gaps.map((g, i) => (
            <div key={i} style={{ padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>{g.task.slice(0, 120)}</div>
          )) : <div style={{ fontSize: 12.5, color: "var(--t3)" }}>No gaps recorded.</div>}
        </div>
        <div style={{ ...card, flex: "1 1 320px" }}>
          <div style={label}>What helps and what hurts</div>
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 6 }}>Success rate when a package version was delivered, against the baseline. Counted only from {lift ? lift.min_samples : 3} outcomes.</div>
          {lift && lift.items.length ? lift.items.slice(0, 10).map((i) => (
            <div key={i.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line2)", fontSize: 12 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.key}</span>
              <span style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: !i.reliable ? "var(--t3)" : i.lift >= 0 ? "var(--green)" : "var(--red)", flex: "none" }}>{i.reliable ? signed(i.lift) : `n=${i.n} · too few`}</span>
            </div>
          )) : <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Nothing learned yet. Record outcomes and this fills in.</div>}
        </div>
        </>) : null}
      </div>
    </div>
  );
}
