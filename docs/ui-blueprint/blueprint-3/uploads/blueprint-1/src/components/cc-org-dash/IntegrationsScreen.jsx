import { useState } from "react";
import { Surface, Btn, Badge, Dot, Toggle, SlideOver, SubNav } from "./primitives";
import { DB } from "./data";
import { Plug, Zap, Key, Plus } from "./icons";

export default function IntegrationsScreen({ T, isMobile }) {
  const [selected, setSelected] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [subTab, setSubTab] = useState("installed");
  const cats = ["all", ...new Set(DB.integrations.map(i => i.cat))];
  const filtered = catFilter === "all" ? DB.integrations : DB.integrations.filter(i => i.cat === catFilter);
  const sc = { connected: T.green, degraded: T.amber, disconnected: T.red };

  const subTabs = [
    { id: "installed", label: "Installed", icon: <Plug size={16} />, count: DB.integrations.filter(i => i.status === "connected").length },
    { id: "browse",    label: "Browse",    icon: <Zap size={16} /> },
    { id: "webhooks",  label: "Webhooks",  icon: <Key size={16} />, count: 3 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ color: T.t1, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>Integrations</div>
          <div style={{ color: T.t2, fontSize: 13, marginTop: 2 }}>{DB.integrations.filter(i => i.status === "connected").length} connected · {DB.integrations.filter(i => i.status === "degraded").length} degraded</div>
        </div>
        <Btn T={T} variant="primary"><Plus size={14} /> Add integration</Btn>
      </div>

      <SubNav T={T} tabs={subTabs} active={subTab} onChange={setSubTab} />

      <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {subTab === "installed" && (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {cats.map(c => (
                <Btn key={c} T={T} small variant={catFilter === c ? "default" : "ghost"} onClick={() => setCatFilter(c)}>
                  {c === "all" ? "All" : c}
                </Btn>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 10 }}>
              {filtered.map(intg => (
                <Surface key={intg.id} T={T} hoverable onClick={() => setSelected(selected?.id === intg.id ? null : intg)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: T.raised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{intg.logo}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ color: T.accent, fontSize: 14, fontWeight: 600 }}>{intg.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Dot status={intg.status} T={T} />
                          <Badge T={T} color={sc[intg.status]}>{intg.status}</Badge>
                        </div>
                      </div>
                      <div style={{ color: T.t2, fontSize: 12, marginBottom: 6 }}>{intg.cat} · {intg.users} users</div>
                      <div style={{ color: T.t3, fontSize: 11 }}>Last sync: {intg.synced}</div>
                    </div>
                  </div>
                </Surface>
              ))}
            </div>
          </>
        )}

        {subTab === "browse" && (
          <Surface T={T} style={{ padding: 40, textAlign: "center" }}>
            <Zap size={40} color={T.t3} style={{ margin: "0 auto 12px" }} />
            <div style={{ color: T.t1, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Integration marketplace</div>
            <div style={{ color: T.t2, fontSize: 13 }}>Stub: Browse and install new integrations.</div>
          </Surface>
        )}

        {subTab === "webhooks" && (
          <Surface T={T} style={{ padding: 40, textAlign: "center" }}>
            <Key size={40} color={T.t3} style={{ margin: "0 auto 12px" }} />
            <div style={{ color: T.t1, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Webhook endpoints</div>
            <div style={{ color: T.t2, fontSize: 13 }}>Stub: 3 configured webhooks.</div>
          </Surface>
        )}
      </div>

      <SlideOver T={T} open={!!selected} onClose={() => setSelected(null)} title={selected?.name} subtitle={selected?.cat}>
        {selected && (
          <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: T.raised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{selected.logo}</div>
              <div>
                <div style={{ color: T.t1, fontSize: 16, fontWeight: 600 }}>{selected.name}</div>
                <Badge T={T} color={sc[selected.status]}>{selected.status}</Badge>
              </div>
            </div>
            {[["Category", selected.cat], ["Connected Users", selected.users], ["Last Sync", selected.synced]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                <span style={{ color: T.t3 }}>{l}</span><span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div>
              <div style={{ color: T.t1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Permissions</div>
              {["Read data", "Write records", "Webhook access"].map(p => (
                <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.t2, fontSize: 13 }}>{p}</span>
                  <Toggle T={T} on={true} onChange={() => { }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn T={T} small variant="default">View logs</Btn>
              {selected.status === "connected" && <Btn T={T} small variant="danger">Disconnect</Btn>}
              {selected.status !== "connected" && <Btn T={T} small variant="primary">Reconnect</Btn>}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}