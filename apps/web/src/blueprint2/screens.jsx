const DOTS = { ok: "var(--green)", warn: "var(--amber)", bad: "var(--red)", idle: "var(--t3)", run: "var(--blue)" };

export function PageHead({ title, desc, chip, actions }) {
  return (
    <div className="bp2-page-head" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-.3px" }}>{title}</h1>
          {chip ? (
            <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 10, background: "var(--blue-soft)", color: "var(--blue)", font: "600 10.5px Inter,sans-serif" }}>{chip}</span>
          ) : null}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 2 }}>{desc}</div>
      </div>
      <div className="bp2-page-actions" style={{ display: "flex", alignItems: "center", gap: 7, flex: "none" }}>
        {(actions || []).map((a) => (
          <button key={a.label} type="button" onClick={a.go} style={{ height: 30, padding: "0 11px", border: `1px solid ${a.bd}`, background: a.bg, color: a.ink, borderRadius: 6, font: "600 12px Inter,sans-serif", cursor: "pointer" }}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

export function SubNav({ items }) {
  if (!items?.length) return null;
  return (
    <div className="bp2-subnav" style={{ display: "flex", alignItems: "center", gap: 3, padding: 4, borderRadius: 10, background: "var(--raised)", border: "1px solid var(--line2)", marginBottom: 18, overflow: "auto" }}>
      {items.map((s) => (
        <button key={s.label} type="button" onClick={s.go} style={{ display: "flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", border: 0, borderRadius: 7, background: s.bg, color: s.ink, fontSize: 12, fontWeight: s.fw, cursor: "pointer", whiteSpace: "nowrap", boxShadow: s.sh }}>
          {s.label}
          {s.count ? (
            <span style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: s.cbg, color: s.cink, font: "600 10px 'JetBrains Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function TodayOverview({ v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {v.commandRoom?.length ? (
        <div className="bp2-command-room" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
          {v.commandRoom.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.go}
              style={{ textAlign: "left", border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", color: "inherit", font: "inherit" }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{card.title}</div>
              <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 4 }}>{card.meta}</div>
              <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 6 }}>{card.body}</div>
            </button>
          ))}
        </div>
      ) : null}
      <div className="bp2-composer" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow)", padding: "14px 16px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input placeholder="What would you like to do?" onFocus={v.openHey} style={{ flex: 1, height: 36, border: "1px solid var(--line)", borderRadius: 8, background: "var(--canvas)", color: "var(--t1)", padding: "0 12px", font: "400 13.5px Inter,sans-serif" }} />
          <button type="button" onClick={v.openHey} style={{ height: 36, padding: "0 3px", border: 0, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#22d3ee,#4ade80,#fbbf24,#f472b6,#a78bfa)", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", height: 30, padding: "0 13px", borderRadius: 6, background: v.heyStripBg, color: "#fff", font: "600 12.5px Inter,sans-serif" }}>Send to Hey Papership</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 11, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginRight: 2 }}>Mode</span>
          {v.modes.map((m) => (
            <button key={m.label} type="button" style={{ height: 24, padding: "0 10px", border: `1px solid ${m.bd}`, background: m.bg, color: m.ink, borderRadius: 12, font: "500 11.5px Inter,sans-serif", cursor: m.cursor }}>{m.label}</button>
          ))}
          <span style={{ marginLeft: "auto", font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Scope: Organisation · Remaining allowance: not captured</span>
        </div>
      </div>

      <div>
        <div className="bp2-health-head" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9 }}>
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)" }}>System health</h2>
          <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{v.healthStamp}</span>
        </div>
        <div className="bp2-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {v.kpis.map((k) => (
            <div key={k.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: k.dot, flex: "none" }} />
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.2px", color: k.dot }}>{k.state}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="bp2-kpi-detail" style={{ fontSize: 11, color: "var(--t3)" }}>{k.detail}</span>
                <span style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{k.checked}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bp2-split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gap: 16 }}>
        <div className="bp2-priorities" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Active priorities</span>
            <a href="#work" onClick={(e) => { e.preventDefault(); v.goWork(); }} style={{ fontSize: 11.5 }}>Open Work</a>
          </div>
          {v.priorities.map((p) => (
            <div key={p.title} className="bp2-priority-row" onClick={p.open} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: "1px solid var(--line2)", cursor: "pointer" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.dot, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{p.meta}</div>
              </div>
              <div className="bp2-priority-bar" style={{ width: 120, flex: "none" }}>
                <div style={{ height: 6, borderRadius: 3, background: "var(--line2)", overflow: "hidden" }}><span style={{ display: "block", height: 6, width: p.pctw, background: p.dot, borderRadius: 3 }} /></div>
              </div>
              <span style={{ width: 38, textAlign: "right", font: "500 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{p.pct}%</span>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Required decisions</span>
            <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 10, background: "var(--amber-soft)", color: "var(--amber)", font: "600 10.5px Inter,sans-serif" }}>2 waiting</span>
          </div>
          {(v.narrow ? v.decisions.slice(0, 1) : v.decisions).map((d) => (
            <div key={d.action} style={{ padding: "12px 14px", borderBottom: "1px solid var(--line2)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.dot, marginTop: 5, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.action}</div>
                  <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 3 }}>Target {d.target} · Version {d.version}</div>
                  {v.narrow ? (
                    <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 8 }}>Approvals are queued while offline and sent the moment you reconnect.</div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{d.why}</div>
                  )}
                  {d.changed ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 7, padding: "3px 8px", borderRadius: 6, background: "var(--amber-soft)", color: "var(--amber)", font: "600 11px Inter,sans-serif" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)" }} />Changed — review again
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="bp2-actions" style={{ display: "flex", gap: 7, marginTop: 10, paddingLeft: 15 }}>
                <button type="button" className="bp2-hit" onClick={d.approve} style={{ height: 27, padding: "0 12px", border: 0, borderRadius: 6, background: "var(--blue)", color: "#fff", font: "600 12px Inter,sans-serif", cursor: "pointer" }}>Approve</button>
                <button type="button" className="bp2-hit" onClick={d.reject} style={{ height: 27, padding: "0 12px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--t1)", borderRadius: 6, font: "600 12px Inter,sans-serif", cursor: "pointer" }}>Reject</button>
                <button type="button" className="bp2-view-ev" onClick={d.view} style={{ height: 27, padding: "0 10px", border: 0, background: "transparent", color: "var(--t3)", borderRadius: 6, font: "500 12px Inter,sans-serif", cursor: "pointer" }}>View evidence</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid var(--line2)" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Running work</span>
          <span className="bp2-run-note" style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Closing the app won’t stop cloud work</span>
        </div>
        <div className="bp2-runs-compact">
          {v.runs.map((r) => (
            <div key={`m-${r.id}`} onClick={r.open} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderBottom: "1px solid var(--line2)", cursor: "pointer" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flex: "none", animation: r.status === "Running" ? "ogblink 1.5s infinite" : "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.purpose}</div>
                <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.id} · {r.elapsed}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bp2-runs-wide">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1.4fr) 92px 96px 92px 110px 88px", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--line2)", font: "600 10.5px Inter,sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--t3)" }}>
          <span>Run</span><span>Work item</span><span>Mode</span><span>Status</span><span>Elapsed</span><span>Cost band</span><span />
        </div>
        {v.runs.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1.4fr) 92px 96px 92px 110px 88px", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--line2)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.purpose}</div>
              <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.id}</div>
            </div>
            <span style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.item}</span>
            <span style={{ fontSize: 11.5, color: "var(--t2)" }}>{r.mode}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot }} />{r.status}</span>
            <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{r.elapsed}</span>
            <span style={{ fontSize: 11.5, color: "var(--t2)" }}>{r.band}</span>
            <button type="button" onClick={r.open} style={{ height: 25, border: "1px solid var(--line)", background: "var(--canvas)", color: "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>Open run</button>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

export function TodayDecisions({ v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {v.decisionsLong.map((d) => (
        <div key={d.action} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "15px 16px" }}>
          <div className="bp2-dec-card" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.dot, marginTop: 5, flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{d.action}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 7 }}>
                <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Target · {d.target}</span>
                <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Version · {d.version}</span>
                <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Sponsor · Cam Douglas</span>
                <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>Requested · {d.when}</span>
              </div>
              <p style={{ margin: "9px 0 0", fontSize: 12.5, color: "var(--t2)", maxWidth: "70ch" }}>{d.why}</p>
            </div>
            <div className="bp2-dec-side" style={{ display: "flex", flexDirection: "column", gap: 7, width: 150, flex: "none" }}>
              <button type="button" className="bp2-hit" onClick={d.approve} style={{ height: 30, border: 0, borderRadius: 6, background: "var(--blue)", color: "#fff", font: "600 12.5px Inter,sans-serif", cursor: "pointer" }}>Approve</button>
              <button type="button" className="bp2-hit" onClick={d.reject} style={{ height: 30, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--t1)", borderRadius: 6, font: "600 12.5px Inter,sans-serif", cursor: "pointer" }}>Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TodayRunning({ v }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
      <div className="bp2-runs-compact">
        {v.runsAll.map((r) => (
          <div key={`m-${r.id}`} onClick={r.open} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderBottom: "1px solid var(--line2)", cursor: "pointer" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.purpose}</div>
              <div style={{ font: "400 10px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.id} · {r.elapsed} · {r.status}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bp2-runs-wide">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) 100px 92px 104px 92px 92px 120px 90px", gap: 10, padding: "9px 14px", borderBottom: "1px solid var(--line)", font: "600 12px Inter,sans-serif", color: "var(--t3)" }}>
        <span>Run</span><span>Work item</span><span>Mode</span><span>Status</span><span>Started</span><span>Elapsed</span><span>Cost band</span><span />
      </div>
      {v.runsAll.map((r) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) 100px 92px 104px 92px 92px 120px 90px", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--line2)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.purpose}</div>
            <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.id} · sponsor Cam Douglas</div>
          </div>
          <span style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{r.item}</span>
          <span style={{ fontSize: 11.5, color: "var(--t2)" }}>{r.mode}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot }} />{r.status}</span>
          <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{r.started}</span>
          <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{r.elapsed}</span>
          <span style={{ fontSize: 11.5, color: "var(--t2)" }}>{r.band}</span>
          <button type="button" onClick={r.open} style={{ height: 25, border: "1px solid var(--line)", background: "var(--canvas)", color: "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>Open</button>
        </div>
      ))}
      </div>
    </div>
  );
}

export function Registry({ v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {v.registryFilters.map((f) => (
          <button key={f.label} type="button" style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 11px", border: `1px solid ${f.bd}`, background: f.bg, color: f.ink, borderRadius: 8, font: "500 12px Inter,sans-serif", cursor: "pointer" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: f.dot }} />{f.label}<span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, opacity: 0.75 }}>{f.n}</span>
          </button>
        ))}
      </div>
      {v.registrySections.map((sec) => (
        <div key={sec.title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{sec.title}</span>
            <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{sec.range}</span>
          </div>
          {sec.rows.map((g) => (
            <div key={g.code} className="bp2-registry-row" style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 120px 96px", gap: 12, alignItems: "center", padding: "7px 14px", borderBottom: "1px solid var(--line2)" }}>
              <span style={{ font: "500 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{g.code}</span>
              <span style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.label}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 9px", borderRadius: 10, background: g.bg, color: g.ink, font: "600 10.5px Inter,sans-serif" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: g.dot }} />{g.status}
              </span>
              <span style={{ fontSize: 11.5, justifySelf: "end", color: "var(--blue)" }}>{g.action}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function WorkProjects({ v }) {
  return (
    <div className="bp2-table-wrap" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
        <span style={{ font: "600 12px Inter,sans-serif", color: "var(--t3)" }}>Managed projects</span>
        {typeof v.startEngineLabsJob === "function" ? (
          <button
            type="button"
            onClick={() => void v.startEngineLabsJob()}
            style={{ height: 28, padding: "0 12px", border: "1px solid var(--line)", background: "var(--canvas)", color: "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}
          >
            Start Engine Labs loop
          </button>
        ) : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.4fr) 130px 150px 110px 92px 150px 92px", gap: 10, padding: "9px 14px", borderBottom: "1px solid var(--line)", font: "600 12px Inter,sans-serif", color: "var(--t3)" }}>
        <span>Plan</span><span>Department</span><span>Owner</span><span>Status</span><span>Priority</span><span>Progress</span><span>Due</span>
      </div>
      {v.projects.map((p) => (
        <div key={p.key} className="bp2-project-row" onClick={p.open} style={{ display: "grid", gridTemplateColumns: "minmax(0,2.4fr) 130px 150px 110px 92px 150px 92px", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--line2)", cursor: "pointer" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</div>
            <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{p.key}{p.managed ? " · managed" : ""}</div>
          </div>
          <span style={{ fontSize: 12, color: "var(--t2)" }}>{p.dept}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--t2)" }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#a78bfa)", color: "#fff", font: "600 9px Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>CD</span>Cam Douglas</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: p.dot }} />{p.status}</span>
          <span style={{ fontSize: 11.5, color: "var(--t2)" }}>{p.priority}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--line2)", overflow: "hidden" }}><span style={{ display: "block", height: 6, width: p.pctw, background: p.dot, borderRadius: 3 }} /></span><span style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{p.pct}%</span></span>
          <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>{p.due}</span>
        </div>
      ))}
    </div>
  );
}

export function WorkIssues({ v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {v.issueGroups.map((g) => (
        <div key={g.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.dot }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{g.label}</span>
            <span style={{ font: "500 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{g.count}</span>
          </div>
          {g.rows.map((r) => (
            <div key={r.key} className="bp2-issue-row" onClick={r.open} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--line2)", cursor: "pointer", background: r.rowBg }}>
              <span style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: "var(--t3)", width: 72 }}>{r.key}</span>
              <span style={{ flex: 1, fontSize: 12.5 }}>{r.title}</span>
              <span style={{ fontSize: 11.5, color: "var(--t3)" }}>{r.labels.join(" · ")}</span>
              <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.due}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function WorkBoard({ v }) {
  return (
    <div className="bp2-board" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
      {v.board.map((col) => (
        <div key={col.label} style={{ background: "var(--raised)", border: "1px solid var(--line2)", borderRadius: 10, padding: 8, minHeight: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 6px 10px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{col.label}</span>
            <span style={{ font: "500 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{col.n}</span>
          </div>
          {col.cards.map((c) => (
            <div key={c.key} onClick={c.open} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 11px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ font: "500 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{c.key}</div>
              <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>{c.label}{c.running ? " · running" : ""}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function WorkRoadmap({ v }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
      <div className="bp2-roadmap-head" style={{ display: "grid", gridTemplateColumns: "220px repeat(4,1fr)", gap: 8, marginBottom: 14, font: "600 11px Inter,sans-serif", color: "var(--t3)" }}>
        <span />
        {v.quarters.map((q) => <span key={q}>{q}</span>)}
      </div>
      {v.roadmap.map((r) => (
        <div key={r.name} className="bp2-roadmap-row" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
            <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{r.meta}</div>
          </div>
          <div style={{ height: 28, borderRadius: 6, background: "var(--line2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: r.w, background: r.bar, color: r.ink, font: "600 11px Inter,sans-serif", display: "flex", alignItems: "center", padding: "0 10px" }}>{r.pct}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkWorkflows({ v }) {
  const stages = v.workflowStages || [];
  const job = v.lastEngineLabsJob;
  const loop = v.engineLabsLoop;
  const host = v.hermesHost;
  const nextStage = loop?.nextStage;
  const boundRepo = loop?.boundRepo || "enginelabs-au/papership";
  const projectName = loop?.projectName || "Engine Labs · Papership";
  const busy = Boolean(v.loopActionBusy);
  return (
    <div className="bp2-workflows" style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 420 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Founder / Engine Labs loop</div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 4, lineHeight: 1.45 }}>
            Self-build Papership on <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>{boundRepo}</span> through PRD-B.1. Each job is purpose{" "}
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>engine_labs.loop</span> on project{" "}
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>{projectName}</span>. Stages persist in the work ledger; Hermes stays read-only and GitHub stays dry-run until release grants land.
          </div>
          {job ? (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t2)" }}>
              <span>
                Live job · {job.id} · status {job.status || "queued"} · stage {job.stage || loop?.currentStage || "request"}
                {loop?.mock || job.mock ? " · mock/offline" : ""}
              </span>
              {job.work_item_id ? (
                <span>
                  Work item · {job.work_item_id}
                  {typeof loop?.loopEventCount === "number" ? ` · ${loop.loopEventCount} stage event(s)` : ""}
                </span>
              ) : null}
              {nextStage ? (
                <span style={{ color: "var(--blue)" }}>Next advance · {nextStage}</span>
              ) : (
                <span style={{ color: "var(--green)" }}>Final stage reached on this work item.</span>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--t3)" }}>
              No loop job on this session yet. Start one to queue <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>engine_labs.loop</span> at stage request (offline-safe when Hermes is unset).
            </div>
          )}
          {v.actionError ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--amber)" }}>{v.actionError}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "none", alignItems: "stretch" }}>
          {typeof v.startEngineLabsJob === "function" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void v.startEngineLabsJob()}
              style={{ height: 32, padding: "0 14px", border: 0, borderRadius: 7, background: busy ? "var(--t3)" : "var(--blue)", color: "#fff", font: "600 12px Inter,sans-serif", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.85 : 1 }}
            >
              {busy ? "Working…" : job ? "Start another loop job" : "Start Founder loop"}
            </button>
          ) : null}
          {typeof v.advanceEngineLabsLoop === "function" && nextStage ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void v.advanceEngineLabsLoop()}
              style={{ height: 32, padding: "0 14px", border: "1px solid var(--blue)", borderRadius: 7, background: "var(--blue-soft)", color: "var(--blue)", font: "600 12px Inter,sans-serif", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? "Advancing…" : `Advance to ${nextStage.replace(/_/g, " ")}`}
            </button>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 280 }}>
        <div className="bp2-workflows-lib" style={{ width: 180, flex: "none", background: "var(--raised)", border: "1px solid var(--line2)", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>Loop stages</div>
          {stages.map((n) => (
            <div key={n.label} style={{ padding: "8px 9px", borderRadius: 7, background: n.bg, marginBottom: 6, fontSize: 12, display: "flex", gap: 8, alignItems: "center", opacity: n.done || n.current ? 1 : 0.85 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.dot, flex: "none" }} />
              {n.label}
              {n.current ? <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--blue)", fontWeight: 600 }}>now</span> : null}
            </div>
          ))}
        </div>
        <div className="bp2-workflows-canvas" style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, overflow: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 10 }}>Pipeline</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {stages.map((n, i) => (
              <div key={n.label} style={{ minWidth: 140, flex: "1 1 140px", padding: "10px 12px", borderRadius: 8, background: n.current ? "var(--blue-soft)" : "var(--canvas)", border: `1px solid ${n.bd}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.dot }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{i + 1}. {n.label}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{n.meta}</div>
              </div>
            ))}
          </div>
          {host ? (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: "1px solid var(--line2)", background: "var(--raised)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Hermes Host · always-on agent box</div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{host.message}</div>
              <div style={{ marginTop: 8, font: "400 11px 'JetBrains Mono',monospace", color: "var(--t2)" }}>
                status={host.status} · write_tools={String(host.write_tools)} · mock={String(host.mock)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WorkWiki() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>No wiki pages yet</div>
      <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 6 }}>Plans and decisions live in Files until a page is created.</div>
    </div>
  );
}

export function InboxView({ v }) {
  const threads = v.threads || [];
  const thread = threads[0] || null;
  return (
    <div className="bp2-inbox" style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr) 220px", gap: 0, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", minHeight: 520 }}>
      <div className="bp2-inbox-col" style={{ borderRight: "1px solid var(--line2)" }}>
        {threads.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12.5, color: "var(--t3)" }}>{v.inboxNote || "Inbox is empty."}</div>
        ) : null}
        {threads.map((t) => (
          <div key={t.key || t.id} style={{ padding: "11px 13px", borderBottom: "1px solid var(--line2)", background: t.bg, cursor: "pointer", borderLeft: `3px solid ${t.mark || "transparent"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.preview}</div>
            <div style={{ font: "400 10.5px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 4 }}>{t.key} · {t.when}</div>
          </div>
        ))}
      </div>
      <div className="bp2-inbox-col" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, borderRight: "1px solid var(--line2)" }}>
        {!thread ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)", fontSize: 13 }}>
            Inbox is empty. Papership does not show fixture mail once the live API is connected.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{thread.subject}</div>
            {(v.messages || []).map((m, i) => (
              <div key={i} style={{ alignSelf: m.align, maxWidth: "86%", background: m.bg, border: `1px solid ${m.bd}`, borderRadius: 10, padding: "9px 11px" }}>
                <div style={{ font: "600 11px Inter,sans-serif" }}>{m.who} · {m.when}</div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>{m.body}</div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="bp2-inbox-meta" style={{ padding: 14 }}>
        {(v.ticketDetails || []).map((d) => (
          <div key={d.k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line2)", fontSize: 12 }}>
            <span style={{ color: "var(--t3)" }}>{d.k}</span><span>{d.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PeopleView({ v }) {
  const seat = v.seatSummary;
  const seatCard = seat ? (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{seat.label}</div>
          <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 4 }}>
            SKU <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }}>{seat.sku}</span>
            {" · "}
            {seat.domainCount} domains entitled
            {" · "}
            plan {seat.planHint}
            {" · "}
            charges {seat.charges}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--t2)" }}>
            Products: {(seat.products || []).length ? seat.products.join(", ") : "hey_papership, workflows, hermes_host, engine_labs.loop"}
            {seat.contextMusic ? "" : " · Context Music out of scope"}
          </div>
        </div>
        {typeof v.goSeat === "function" ? (
          <button type="button" onClick={v.goSeat} style={{ height: 30, padding: "0 12px", border: 0, borderRadius: 7, background: "var(--blue)", color: "#fff", font: "600 12px Inter,sans-serif", cursor: "pointer", flex: "none" }}>
            Open Plan
          </button>
        ) : null}
      </div>
      {seat.domains?.length ? (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {seat.domains.slice(0, 24).map((d) => (
            <span key={d} style={{ height: 22, padding: "0 8px", borderRadius: 6, background: "var(--raised)", border: "1px solid var(--line2)", font: "500 10.5px 'JetBrains Mono',monospace", color: "var(--t2)", display: "inline-flex", alignItems: "center" }}>{d}</span>
          ))}
          {seat.domains.length > 24 ? <span style={{ fontSize: 11, color: "var(--t3)", alignSelf: "center" }}>+{seat.domains.length - 24} more</span> : null}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--t3)" }}>
          Domain list loads from <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>GET /seats/operator</span> after founder sign-in. Catalogue also lives under Today → Registry.
          {typeof v.goDomains === "function" ? (
            <>
              {" "}
              <button type="button" onClick={v.goDomains} style={{ border: 0, background: "transparent", color: "var(--blue)", font: "600 12px Inter,sans-serif", cursor: "pointer", padding: 0 }}>Open Registry</button>
            </>
          ) : null}
        </div>
      )}
    </div>
  ) : null;
  if (!v.people?.length) {
    return (
      <div>
        {seatCard}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No people to show</div>
          <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 6 }}>{v.peopleNote || "Papership does not show fixture seats on the product path."}</div>
        </div>
      </div>
    );
  }
  return (
    <div>
      {seatCard}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
        {v.people.map((p) => (
          <div key={p.name} className="bp2-people-row" onClick={p.open} style={{ display: "grid", gridTemplateColumns: "200px 110px 1fr 140px 90px", gap: 12, alignItems: "center", padding: "11px 14px", borderBottom: "1px solid var(--line2)", cursor: "pointer" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: p.av, color: "#fff", font: "600 10px Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.initials}</span>
              {p.name}
            </span>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{p.seat}</span>
            <span style={{ font: "400 11.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{p.email}</span>
            <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{p.capacity || "capacity unknown"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: p.dot }} />{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamsView({ v }) {
  if (!v.teams?.length) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No teams yet</div>
        <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 6 }}>{v.teamsNote || "Teams are native Papership records, not fixtures."}</div>
      </div>
    );
  }
  return (
    <div className="bp2-teams" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
      {v.teams.map((t) => (
        <div key={t.name} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{t.meta}</div>
          <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 8 }}>{t.members}</div>
        </div>
      ))}
    </div>
  );
}

export function InvitesView() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>No pending invites</div>
      <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 6 }}>A second seat stays blocked until the measurement notice is accepted. Mail is not sent.</div>
    </div>
  );
}

export function DataView({ v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="bp2-trace-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
        {v.traceKpis.map((k) => (
          <div key={k.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: k.ink, marginTop: 4 }}>{k.delta}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
        {v.traces.length ? v.traces.map((t) => (
          <div key={t.name + t.time} className="bp2-trace-row" onClick={t.open} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 140px 90px 80px 90px 80px", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line2)", cursor: "pointer" }}>
            <span style={{ fontSize: 12.5 }}>{t.name}</span>
            <span style={{ color: "var(--t3)", fontSize: 12 }}>{t.agent}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot }} />{t.status}</span>
            <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{t.latency}</span>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{t.cost}</span>
            <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{t.time}</span>
          </div>
        )) : (
          <div style={{ padding: "16px 14px", fontSize: 12.5, color: "var(--t3)" }}>No traces captured yet. Usage stays first-baseline until events exist.</div>
        )}
      </div>
    </div>
  );
}

export function FilesView({ v }) {
  return (
    <div className="bp2-files" style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr) 240px", gap: 12 }}>
      <div style={{ background: "var(--raised)", border: "1px solid var(--line2)", borderRadius: 10, padding: 8 }}>
        {v.folders.map((f) => (
          <div key={f.label} style={{ padding: "7px 8px", borderRadius: 7, background: f.bg, color: f.ink, fontWeight: f.fw, display: "flex", justifyContent: "space-between" }}>
            <span>{f.label}</span><span style={{ font: "400 11px 'JetBrains Mono',monospace" }}>{f.n}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
        {v.files.map((f) => (
          <div key={f.name} style={{ padding: "10px 14px", borderBottom: "1px solid var(--line2)", background: f.bg, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5 }}>{f.name}</span>
            <span style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{f.size} · {f.mod}</span>
          </div>
        ))}
      </div>
      <div className="bp2-files-meta" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
        {v.fileMeta.map((m) => (
          <div key={m.k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line2)", fontSize: 12 }}>
            <span style={{ color: "var(--t3)" }}>{m.k}</span><span>{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectionsView({ v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div className="bp2-connections" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
      {v.connections.map((c) => (
        <div key={c.name} style={{ background: "var(--surface)", border: `1px solid ${c.bd}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: c.glyphBg, color: c.glyphInk, font: "600 11px Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.initials}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{c.kind}</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 8px", borderRadius: 10, background: c.bg, color: c.ink, font: "600 10.5px Inter,sans-serif" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{c.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 10 }}>{c.scope}</div>
          <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 8 }}>{c.verified}</div>
          {c.recovery ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)" }}>{c.recovery}</div> : null}
          <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
            {c.actions.map((a) => (
              <button key={a.label} type="button" onClick={a.go} style={{ height: 26, padding: "0 10px", border: `1px solid ${a.bd}`, background: "transparent", color: a.ink, borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>{a.label}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
    {v.packs?.length ? (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>Available packs</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {v.packs.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
              <span>{p.label} · {p.kind}</span>
              <span style={{ color: "var(--t3)" }}>{p.trust_verdict || "none"} · {p.executable ? "executable gated" : "declarative"}</span>
            </div>
          ))}
        </div>
      </div>
    ) : null}
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>Field evidence</div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--t2)" }}>
        Offline capture queues on this device and syncs on reconnect. Live dispatch stays unavailable. Sign-out wipes the local queue.
        <div style={{ marginTop: 6, color: "var(--t3)" }}>{(v.evidence || []).length ? `${v.evidence.length} synced on this session` : "No synced evidence on this session."}</div>
      </div>
    </div>
    {v.domainShells?.length ? (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>Company domains</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {v.domainShells.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line2)", fontSize: 12.5 }}>
              <span>{d.id} · {d.label}</span>
              <span style={{ color: "var(--t3)" }}>
                {d.status || "planned"}
                {d.needs_connection ? " · needs connection" : d.live_write ? "" : " · no live write"}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null}
    </div>
  );
}

export function SettingsView({ v }) {
  return (
    <div className="bp2-settings" style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 16 }}>
      <div className="bp2-settings-nav" style={{ background: "var(--raised)", border: "1px solid var(--line2)", borderRadius: 10, padding: 6 }}>
        {v.settingsNav.map((s) => (
          <button key={s.label} type="button" onClick={s.go} style={{ width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 7, background: s.bg, color: s.ink, fontWeight: s.fw, cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between" }}>
            {s.label}{s.tag ? <span style={{ font: "600 10px Inter,sans-serif", color: "var(--t3)" }}>{s.tag}</span> : null}
          </button>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{v.setTitle}</div>
        <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 4 }}>{v.setDesc}</div>
        {v.set_ai_agents && v.hermesHost ? (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 9, border: "1px solid var(--line2)", background: "var(--raised)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.hermesHost.status === "reachable" ? "var(--green)" : "var(--amber)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Hermes Host</span>
              <span style={{ marginLeft: "auto", font: "500 11px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{v.hermesHost.status}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 8 }}>{v.hermesHost.message}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div>Always-on agent box · technical operators</div>
              <div style={{ textAlign: "right", color: "var(--t3)" }}>Write tools · blocked</div>
              <div>Pin · {v.hermesHost.pin || "not set"}</div>
              <div style={{ textAlign: "right", color: "var(--t3)" }}>{v.hermesHost.mock ? "Local / mock safe" : "Probe only"}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--t3)" }}>Workspace product stays Papership. Hermes Host is the runtime box inside it. Context Music is out of scope.</div>
          </div>
        ) : null}
        {v.set_plan ? (
          <div style={{ marginTop: 16 }}>
            {v.seatSummary ? (
              <div style={{ marginBottom: 14, padding: 14, borderRadius: 9, border: "1px solid var(--line2)", background: "var(--raised)" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.seatSummary.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6 }}>
                  {v.seatSummary.domainCount} domains entitled · SKU {v.seatSummary.sku} · plan {v.seatSummary.planHint}
                </div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 6 }}>
                  Products: {(v.seatSummary.products || []).join(", ") || "hey_papership, workflows, hermes_host, engine_labs.loop"}
                </div>
                {typeof v.goWorkflows === "function" ? (
                  <button type="button" onClick={v.goWorkflows} style={{ marginTop: 10, height: 28, padding: "0 12px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--t1)", borderRadius: 6, font: "600 11.5px Inter,sans-serif", cursor: "pointer" }}>
                    Open Workflows · Founder loop
                  </button>
                ) : null}
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              {(v.planTiers || []).map((t) => (
                <div key={t.label} style={{ border: "1px solid var(--line2)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                  {t.price ? <div style={{ fontSize: 12, color: "var(--t1)", marginTop: 4 }}>{t.price}</div> : null}
                  {t.tokens ? <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 4 }}>{t.tokens}</div> : null}
                  {t.overage ? <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{t.overage}</div> : null}
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{t.note}</div>
                </div>
              ))}
            </div>
            {(v.setRows || []).map((r) => (
              <div key={r.k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line2)", fontSize: 13 }}>
                <span>{r.k}</span><span style={{ color: "var(--t2)" }}>{r.v}</span>
              </div>
            ))}
          </div>
        ) : v.set_permissions ? (
          <div style={{ marginTop: 16 }}>
            {v.repoGrants.map((g) => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line2)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}>{g.desc}</div>
                </div>
                <button type="button" onClick={g.toggle} style={{ width: 40, height: 22, borderRadius: 11, border: `1px solid ${g.bd}`, background: g.track, position: "relative", cursor: "pointer" }}>
                  <span style={{ position: "absolute", top: 2, left: g.knob, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
                </button>
              </div>
            ))}
          </div>
        ) : v.set_appearance ? (
          <div className="bp2-themes" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
            {v.themeCards.map((c) => (
              <button key={c.label} type="button" onClick={c.go} style={{ border: `2px solid ${c.bd}`, borderRadius: 10, overflow: "hidden", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left" }}>
                <div style={{ height: 72, background: c.swatch }} />
                <div style={{ padding: 10, color: "var(--t1)", font: "600 12.5px Inter,sans-serif" }}>{c.label}</div>
                <div style={{ padding: "0 10px 10px", color: "var(--t3)", fontSize: 11.5 }}>{c.note}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {v.set_data && v.measurement ? (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "var(--raised)", border: "1px solid var(--line2)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v.measurement.title}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{v.measurement.owner}</div>
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--t2)", fontSize: 12.5 }}>
                  {(v.measurement.items || []).map((item) => (
                    <li key={item} style={{ marginBottom: 6 }}>{item}</li>
                  ))}
                </ul>
                {v.recordOqG2 ? (
                  <button type="button" onClick={v.recordOqG2} style={{ marginTop: 12, height: 32, padding: "0 12px", border: 0, borderRadius: 6, background: "var(--blue)", color: "#fff", font: "600 12px Inter,sans-serif", cursor: "pointer" }}>
                    Record measurement notice
                  </button>
                ) : null}
                <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600 }}>Erasure request</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>Records intent only. Organisation-wide destroy is never executed from this button.</div>
                <button type="button" onClick={v.requestErasure} style={{ marginTop: 10, height: 32, padding: "0 12px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--surface)", color: "var(--t1)", font: "600 12px Inter,sans-serif", cursor: "pointer" }}>
                  Record erasure request
                </button>
                {v.actionError ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--amber)" }}>{v.actionError}</div>
                ) : null}
              </div>
            ) : null}
            {v.setRows.map((r) => (
              <div key={r.k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line2)", fontSize: 13 }}>
                <span>{r.k}</span><span style={{ color: "var(--t2)" }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountView({ v }) {
  return (
    <div className="bp2-account" style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: 16 }}>
      <div className="bp2-account-nav" style={{ background: "var(--raised)", border: "1px solid var(--line2)", borderRadius: 10, padding: 6 }}>
        {v.accountNav.map((s) => (
          <div key={s.label} style={{ padding: "8px 10px", borderRadius: 7, background: s.bg, color: s.ink, fontWeight: s.fw }}>{s.label}</div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Public profile</div>
        <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 4 }}>This information appears where your name is shown.</div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)" }}>Name</span>
            <input defaultValue="Cam Douglas" style={{ height: 34, border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", padding: "0 10px", font: "400 13px Inter,sans-serif" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)" }}>Email</span>
            <input defaultValue="founder@enginelabs.com.au" style={{ height: 34, border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", color: "var(--t1)", padding: "0 10px", font: "400 13px Inter,sans-serif" }} />
          </label>
        </div>
      </div>
    </div>
  );
}

export function MemoryView({ v }) {
  if (v.memoryEmpty) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No memory yet</div>
        <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 6 }}>{v.memoryNote || "Knowledge the assistant retains will appear here with its source."}</div>
      </div>
    );
  }
  return (
    <div className="bp2-memory" style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr) 240px", gap: 12 }}>
      <div className="bp2-memory-nav" style={{ background: "var(--raised)", borderRadius: 10, padding: 8 }} role="navigation" aria-label="Memory kinds">
        {v.memoryNav.map((m) => (
          <div key={m.label} style={{ padding: "7px 8px", borderRadius: 7, background: m.bg, fontWeight: m.fw, display: "flex", justifyContent: "space-between" }}>{m.label}<span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--t3)" }}>{m.n}</span></div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }} aria-live="polite">
        {(v.memoryRows || []).map((r) => (
          <div key={r.title} style={{ padding: "10px 14px", borderBottom: "1px solid var(--line2)", background: r.bg }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.title}</div>
            <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 3 }}>{r.kind} · {r.cls} · {r.version}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
        {(v.provenance || []).map((p) => (
          <div key={p.k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: "1px solid var(--line2)" }}>
            <span style={{ color: "var(--t3)" }}>{p.k}</span><span>{p.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkItemView({ v }) {
  return (
    <div className="bp2-item" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) 280px", gap: 16 }}>
      <div>
        <div style={{ display: "flex", gap: 0, marginBottom: 16, overflow: "auto" }}>
          {v.loop.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 86, textAlign: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.fill, border: `2px solid ${s.ring}`, color: s.numInk, font: "600 10px Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>{s.n}</div>
                <div style={{ fontSize: 10.5, fontWeight: s.fw, color: s.ink, marginTop: 6 }}>{s.label}</div>
              </div>
              {i < v.loop.length - 1 ? <span style={{ width: 18, height: 2, background: s.line, display: "block", marginTop: -18 }} /> : null}
            </div>
          ))}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Runs on this item</div>
          {v.itemRuns.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line2)" }}>
              <span style={{ font: "500 11.5px 'JetBrains Mono',monospace" }}>{r.id}</span>
              <span style={{ flex: 1 }}>{r.mode}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot }} />{r.status}</span>
              <button type="button" onClick={r.open} style={{ height: 24, padding: "0 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--canvas)", cursor: "pointer" }}>Open</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
        {v.itemDetails.map((d) => (
          <div key={d.k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line2)", fontSize: 12 }}>
            <span style={{ color: "var(--t3)" }}>{d.k}</span><span style={d.style ? { fontFamily: "'JetBrains Mono',monospace" } : undefined}>{d.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RunDetailView({ v }) {
  return (
    <div className="bp2-run-detail" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) 300px", gap: 16 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
        {v.runSteps.map((s) => (
          <div key={s.n} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line2)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: s.fill, border: `2px solid ${s.ring}`, color: s.numInk, font: "600 10px Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.n}</span>
            <div>
              <div style={{ fontWeight: s.fw }}>{s.label}</div>
              <div style={{ font: "400 11px 'JetBrains Mono',monospace", color: "var(--t3)", marginTop: 3 }}>{s.when}</div>
              <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 4 }}>{s.receipt}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Grant scopes</div>
          {v.grantsWords.map((g) => (
            <div key={g.label} style={{ display: "flex", gap: 8, padding: "5px 0", color: g.ink, fontSize: 12.5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: g.dot, marginTop: 5 }} />{g.label}
            </div>
          ))}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          {v.usage.map((u) => (
            <div key={u.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{u.label}</span><span>{u.value}</span></div>
              <div style={{ height: 6, background: "var(--line2)", borderRadius: 3, marginTop: 4 }}><span style={{ display: "block", height: 6, width: u.w, background: u.bg, borderRadius: 3 }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { DOTS };
