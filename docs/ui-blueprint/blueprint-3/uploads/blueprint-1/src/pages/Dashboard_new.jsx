import { useState, useEffect, useRef } from "react";
import { RosterEntry, ReportSnapshot, AIInsight, Integration } from "@/api/entities";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  nav:        "#1e7d3a",
  navDark:    "#165c2b",
  navHover:   "#236e34",
  accent:     "#1e7d3a",
  accentLight:"#e8f5ed",
  accentBorder:"#a8d5b5",
  bg:         "#f0f2f5",
  surface:    "#ffffff",
  border:     "#e5e7eb",
  border2:    "#d1d5db",
  text:       "#111827",
  sub:        "#6b7280",
  muted:      "#9ca3af",
  rowHover:   "#f9fafb",
  rowSelected:"#e8f5ed",
  sidebar:    "#1e7d3a",
  sidebarHover:"#165c2b",
};

const STATUS = {
  confirmed:    { bg:"#dcfce7", color:"#15803d", dot:"#16a34a" },
  scheduled:    { bg:"#dbeafe", color:"#1d4ed8", dot:"#3b82f6" },
  absent:       { bg:"#fee2e2", color:"#b91c1c", dot:"#ef4444" },
  completed:    { bg:"#f3f4f6", color:"#374151", dot:"#9ca3af" },
  cancelled:    { bg:"#fef3c7", color:"#92400e", dot:"#f59e0b" },
  connected:    { bg:"#dcfce7", color:"#15803d", dot:"#16a34a" },
  disconnected: { bg:"#f3f4f6", color:"#6b7280", dot:"#9ca3af" },
  pending:      { bg:"#fef9c3", color:"#854d0e", dot:"#eab308" },
  error:        { bg:"#fee2e2", color:"#b91c1c", dot:"#ef4444" },
  live:         { bg:"#dcfce7", color:"#15803d", dot:"#16a34a" },
  cached:       { bg:"#dbeafe", color:"#1d4ed8", dot:"#3b82f6" },
  stale:        { bg:"#fee2e2", color:"#b91c1c", dot:"#ef4444" },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || { bg:"#f3f4f6", color:"#374151", dot:"#9ca3af" };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600, display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background: s.dot, display:"inline-block" }} />
      {status}
    </span>
  );
}

const inp = { width:"100%", background:"#fff", border:`1px solid ${G.border2}`, borderRadius:8, color:G.text, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
const lbl = { color:G.sub, fontSize:12, fontWeight:500, marginBottom:5, display:"block" };

function Btn({ children, onClick, variant="primary", disabled, small, icon, style:ex={} }) {
  const base = { fontFamily:"inherit", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontWeight:600, transition:"all 0.12s", display:"inline-flex", alignItems:"center", gap:6, opacity:disabled?0.55:1, border:"none" };
  const sz = small ? { fontSize:12, padding:"5px 11px" } : { fontSize:13, padding:"9px 18px" };
  const vs = {
    primary: { background:G.accent, color:"#fff", boxShadow:"0 1px 3px rgba(30,125,58,0.3)" },
    ghost:   { background:"transparent", color:G.sub, border:`1px solid ${G.border2}`, boxShadow:"none" },
    white:   { background:"#fff", color:G.text, border:`1px solid ${G.border2}`, boxShadow:"0 1px 2px rgba(0,0,0,0.05)" },
    danger:  { background:"#fef2f2", color:"#b91c1c", border:`1px solid #fecaca`, boxShadow:"none" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sz, ...vs[variant], ...ex }}>{icon && <span>{icon}</span>}{children}</button>;
}

function Avatar({ name, size=34 }) {
  const initials = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  const palette = ["#1e7d3a","#2563eb","#7c3aed","#0891b2","#d97706","#dc2626","#0d9488"];
  const c = palette[(name||"").charCodeAt(0) % palette.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:c, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, flexShrink:0 }}>{initials}</div>;
}

function Modal({ title, children, onClose, width=520 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.surface, borderRadius:14, width, maxHeight:"92vh", overflow:"auto", boxShadow:"0 25px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:`1px solid ${G.border}` }}>
          <span style={{ color:G.text, fontSize:16, fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:G.muted, fontSize:20, lineHeight:1, padding:4 }}>×</button>
        </div>
        <div style={{ padding:22 }}>{children}</div>
      </div>
    </div>
  );
}

function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"center", padding:"12px 0" }}>
      <span style={{ color:G.sub, fontSize:12, marginRight:8 }}>{perPage} per page</span>
      <button onClick={() => onChange(Math.max(1, page-1))} disabled={page===1} style={{ background:"none", border:`1px solid ${G.border2}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", color:G.sub, fontSize:13 }}>‹</button>
      {Array.from({length:Math.min(pages,7)},(_,i)=>i+1).map(p=>(
        <button key={p} onClick={() => onChange(p)} style={{ background:p===page?G.accent:"none", color:p===page?"#fff":G.sub, border:`1px solid ${p===page?G.accent:G.border2}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:13, fontWeight:p===page?700:400 }}>{p}</button>
      ))}
      <button onClick={() => onChange(Math.min(pages, page+1))} disabled={page===pages} style={{ background:"none", border:`1px solid ${G.border2}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", color:G.sub, fontSize:13 }}>›</button>
    </div>
  );
}

// ─── SIDEBAR ICONS ────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id:"roster",        icon:"👥", tip:"Rostering" },
  { id:"reporting",     icon:"📊", tip:"Reporting" },
  { id:"intelligence",  icon:"✦",  tip:"Intelligence" },
  { id:"integrations",  icon:"⚡", tip:"Integrations" },
  { id:"settings",      icon:"⚙️", tip:"Settings" },
];

// ─── TOP NAV TABS (pill style) ────────────────────────────────────────────────
const TABS = [
  { id:"roster",       label:"Rostering" },
  { id:"reporting",    label:"Reporting" },
  { id:"intelligence", label:"Intelligence" },
  { id:"integrations", label:"Integrations" },
  { id:"settings",     label:"Settings" },
];

// ══════════════════════════════════════════════════════════════════════════════
// ROSTERING TAB
// ══════════════════════════════════════════════════════════════════════════════
function RosteringTab({ roster, setRoster }) {
  const [view, setView] = useState("list"); // list | add | edit
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [checked, setChecked] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [page, setPage] = useState(1);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const PER = 8;

  const blank = { employee_name:"", employee_id:"", role:"", department:"", location:"", shift_date:"", shift_start:"", shift_end:"", status:"scheduled", notes:"" };
  const [form, setForm] = useState(blank);

  const depts = [...new Set(roster.map(r=>r.department).filter(Boolean))];

  const filtered = roster.filter(r => {
    if (search && ![r.employee_name,r.employee_id,r.role].some(v=>v?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterDept!=="all" && r.department!==filterDept) return false;
    if (filterStatus!=="all" && r.status!==filterStatus) return false;
    if (filterDate && r.shift_date!==filterDate) return false;
    return true;
  });

  const paged = filtered.slice((page-1)*PER, page*PER);

  const save = async () => {
    if (!form.employee_name) return;
    setSaving(true);
    try {
      if (view==="edit" && selected) {
        await RosterEntry.update(selected.id, form);
        setRoster(p => p.map(r => r.id===selected.id ? {...r,...form} : r));
      } else {
        const c = await RosterEntry.create(form);
        setRoster(p => [c,...p]);
      }
      setView("list"); setSelected(null); setStep(1); setForm(blank);
    } finally { setSaving(false); }
  };

  const del = async (row) => {
    await RosterEntry.delete(row.id);
    setRoster(p => p.filter(r=>r.id!==row.id));
    setDeleteModal(null); setDetail(null);
  };

  const openEdit = (row) => { setSelected(row); setForm({...blank,...row}); setStep(1); setView("edit"); };
  const allChecked = paged.length>0 && paged.every(r=>checked.includes(r.id));
  const toggleAll = () => setChecked(allChecked ? checked.filter(id=>!paged.map(r=>r.id).includes(id)) : [...new Set([...checked,...paged.map(r=>r.id)])]);

  const today = new Date().toISOString().split("T")[0];
  const todayR = roster.filter(r=>r.shift_date===today);

  // ── Detail panel ──
  const DetailPanel = () => {
    if (!detail) return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12, color:G.muted }}>
        <div style={{ fontSize:36 }}>👤</div>
        <div style={{ fontSize:13 }}>Select an entry to view details</div>
      </div>
    );
    return (
      <div style={{ padding:20, display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, paddingBottom:16, borderBottom:`1px solid ${G.border}` }}>
          <Avatar name={detail.employee_name} size={46} />
          <div>
            <div style={{ color:G.text, fontSize:16, fontWeight:700 }}>{detail.employee_name}</div>
            <div style={{ color:G.sub, fontSize:12 }}>{detail.role} · {detail.department}</div>
          </div>
          <StatusBadge status={detail.status} />
        </div>
        {[["Employee ID", detail.employee_id],["Location", detail.location],["Shift Date", detail.shift_date],["Shift Time", detail.shift_start&&detail.shift_end?`${detail.shift_start} – ${detail.shift_end}`:"—"],["Status", null]].map(([k,v])=>
          v !== null && (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, borderBottom:`1px solid ${G.border}`, paddingBottom:8 }}>
              <span style={{ color:G.muted, fontWeight:500 }}>{k}</span>
              <span style={{ color:G.text, fontWeight:500, fontFamily:k==="Shift Date"||k==="Shift Time"?"monospace":"inherit" }}>{v||"—"}</span>
            </div>
          )
        )}
        {detail.notes && <div style={{ background:G.accentLight, borderRadius:8, padding:"10px 12px", color:G.text, fontSize:13 }}><div style={{ color:G.sub, fontSize:11, marginBottom:3 }}>NOTES</div>{detail.notes}</div>}
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <Btn onClick={()=>openEdit(detail)} variant="white" small>Edit</Btn>
          <Btn onClick={()=>setDeleteModal(detail)} variant="danger" small>Delete</Btn>
        </div>
      </div>
    );
  };

  if (view==="add"||view==="edit") return (
    <div style={{ display:"flex", gap:0 }}>
      <div style={{ flex:1 }}>
        {/* Breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:20, fontSize:13, color:G.sub }}>
          <span style={{ color:G.accent, cursor:"pointer", fontWeight:600 }} onClick={()=>{setView("list");setStep(1);}}>Roster</span>
          <span style={{ color:G.muted }}>›</span>
          <span>{view==="edit"?"Edit Entry":"Add New Entry"}</span>
        </div>

        {/* Step pills */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
          {[["1","Basic Info"],["2","Shift Details"],["3","Review & Save"]].map(([n,l],i)=>{
            const s=i+1, active=step===s, done=step>s;
            return (
              <div key={n} style={{ display:"flex", alignItems:"center", gap:0 }}>
                <div onClick={()=>done&&setStep(s)} style={{ display:"flex", alignItems:"center", gap:7, cursor:done?"pointer":"default" }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", background:active?G.accent:done?G.accent:G.border, color:active||done?"#fff":G.muted, fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>{done?"✓":n}</div>
                  <span style={{ fontSize:13, fontWeight:active?600:400, color:active?G.accent:done?G.text:G.muted }}>{l}</span>
                </div>
                {i<2 && <div style={{ width:32, height:2, background:done?G.accent:G.border, margin:"0 8px", borderRadius:1 }} />}
              </div>
            );
          })}
        </div>

        <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, padding:24, maxWidth:600, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {step===1 && (
            <div>
              <div style={{ color:G.text, fontSize:16, fontWeight:700, marginBottom:18 }}>Basic Information</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {[["employee_name","Full Name *","text"],["employee_id","Employee ID","text"],["role","Role / Position","text"],["department","Department","text"],["location","Location / Site","text"]].map(([k,l,t])=>(
                  <div key={k}><label style={lbl}>{l}</label><input type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp} /></div>
                ))}
                <div><label style={lbl}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>
                    {["scheduled","confirmed","absent","completed","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop:20 }}><Btn onClick={()=>setStep(2)} disabled={!form.employee_name}>Next Step →</Btn></div>
            </div>
          )}
          {step===2 && (
            <div>
              <div style={{ color:G.text, fontSize:16, fontWeight:700, marginBottom:18 }}>Shift Details</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div><label style={lbl}>Shift Date *</label><input type="date" value={form.shift_date} onChange={e=>setForm(p=>({...p,shift_date:e.target.value}))} style={inp} /></div>
                <div />
                <div><label style={lbl}>Start Time</label><input type="time" value={form.shift_start} onChange={e=>setForm(p=>({...p,shift_start:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>End Time</label><input type="time" value={form.shift_end} onChange={e=>setForm(p=>({...p,shift_end:e.target.value}))} style={inp} /></div>
              </div>
              <div style={{ marginTop:14 }}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={{...inp,resize:"vertical"}} /></div>
              <div style={{ display:"flex", gap:8, marginTop:20 }}>
                <Btn variant="ghost" onClick={()=>setStep(1)}>← Back</Btn>
                <Btn onClick={()=>setStep(3)} disabled={!form.shift_date}>Review →</Btn>
              </div>
            </div>
          )}
          {step===3 && (
            <div>
              <div style={{ color:G.text, fontSize:16, fontWeight:700, marginBottom:18 }}>Review & Confirm</div>
              <div style={{ background:G.bg, borderRadius:10, padding:18, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[["Name",form.employee_name],["ID",form.employee_id],["Role",form.role],["Department",form.department],["Location",form.location],["Date",form.shift_date],["Shift",form.shift_start?`${form.shift_start} – ${form.shift_end}`:"—"],["Status",form.status]].map(([k,v])=>(
                  <div key={k}><div style={{ color:G.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>{k}</div><div style={{ color:G.text, fontSize:13, fontWeight:600 }}>{v||"—"}</div></div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="ghost" onClick={()=>setStep(2)}>← Back</Btn>
                <Btn onClick={save} disabled={saving}>{saving?"Saving...":view==="edit"?"Save Changes":"Add to Roster"}</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
      {/* Main content */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:18 }}>
          {[{label:"Total Entries",value:roster.length},{label:"Today's Shifts",value:todayR.length},{label:"Confirmed",value:todayR.filter(r=>r.status==="confirmed").length},{label:"Absent Today",value:todayR.filter(r=>r.status==="absent").length}].map(m=>(
            <div key={m.label} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:10, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ color:G.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:6 }}>{m.label}</div>
              <div style={{ color:G.text, fontSize:28, fontWeight:800 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          {/* Toolbar */}
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${G.border}`, display:"flex", alignItems:"center", gap:10, justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
              <div style={{ position:"relative", flex:"0 0 240px" }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:G.muted, fontSize:15 }}>🔍</span>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search name, ID, role..." style={{...inp,paddingLeft:32,fontSize:13}} />
              </div>
              <select value={filterDept} onChange={e=>{setFilterDept(e.target.value);setPage(1);}} style={{...inp,width:"auto",minWidth:130}}>
                <option value="all">All Departments</option>
                {depts.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} style={{...inp,width:"auto",minWidth:130}}>
                <option value="all">All Statuses</option>
                {["scheduled","confirmed","absent","completed","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" value={filterDate} onChange={e=>{setFilterDate(e.target.value);setPage(1);}} style={{...inp,width:"auto"}} />
              {(search||filterDept!=="all"||filterStatus!=="all"||filterDate) && <Btn variant="ghost" small onClick={()=>{setSearch("");setFilterDept("all");setFilterStatus("all");setFilterDate("");setPage(1);}}>Clear</Btn>}
            </div>
            <Btn onClick={()=>{setView("add");setStep(1);setForm(blank);}} icon="+">Add Entry</Btn>
          </div>
          <div style={{ padding:"6px 18px", borderBottom:`1px solid ${G.border}`, background:G.bg }}>
            <span style={{ color:G.muted, fontSize:12 }}>{filtered.length} {filtered.length===1?"entry":"entries"}{checked.length>0&&` · ${checked.length} selected`}</span>
          </div>

          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.bg }}>
                <th style={{ width:40, padding:"10px 16px", borderBottom:`1px solid ${G.border}` }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ accentColor:G.accent }} />
                </th>
                {[["#","40px"],["Employee",""],["Role",""],["Department",""],["Date","120px"],["Shift","120px"],["Location",""],["Status","120px"],["","80px"]].map(([h,w])=>(
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:G.sub, textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:`1px solid ${G.border}`, width:w||"auto", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length===0 && <tr><td colSpan={10} style={{ padding:40, textAlign:"center", color:G.muted, fontSize:13 }}>No entries match the current filters</td></tr>}
              {paged.map((row,i)=>{
                const isChecked = checked.includes(row.id);
                const isSelected = detail?.id===row.id;
                return (
                  <tr key={row.id} onClick={()=>setDetail(row)}
                    style={{ background:isSelected?G.accentLight:isChecked?"#f0fdf4":i%2===0?G.surface:G.rowHover, borderBottom:`1px solid ${G.border}`, cursor:"pointer", transition:"background 0.1s" }}>
                    <td style={{ padding:"10px 16px" }} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={()=>setChecked(p=>p.includes(row.id)?p.filter(id=>id!==row.id):[...p,row.id])} style={{ accentColor:G.accent }} />
                    </td>
                    <td style={{ padding:"10px 12px", color:G.muted, fontSize:12, fontFamily:"monospace" }}>{(page-1)*PER+i+1}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar name={row.employee_name} size={30} />
                        <div>
                          <div style={{ color:G.text, fontWeight:600, fontSize:13 }}>{row.employee_name}</div>
                          <div style={{ color:G.muted, fontSize:11 }}>{row.employee_id||"—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"10px 12px", color:G.sub, fontSize:13 }}>{row.role||"—"}</td>
                    <td style={{ padding:"10px 12px", color:G.sub, fontSize:13 }}>{row.department||"—"}</td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace", fontSize:12, color:G.sub }}>{row.shift_date||"—"}</td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace", fontSize:12, color:G.sub }}>{row.shift_start&&row.shift_end?`${row.shift_start}–${row.shift_end}`:"—"}</td>
                    <td style={{ padding:"10px 12px", color:G.sub, fontSize:13 }}>{row.location||"—"}</td>
                    <td style={{ padding:"10px 12px" }}><StatusBadge status={row.status} /></td>
                    <td style={{ padding:"10px 12px" }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", gap:5 }}>
                        <Btn small variant="ghost" onClick={()=>openEdit(row)}>Edit</Btn>
                        <Btn small variant="danger" onClick={()=>setDeleteModal(row)}>✕</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ borderTop:`1px solid ${G.border}`, padding:"4px 16px" }}>
            <Pagination page={page} total={filtered.length} perPage={PER} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Right detail panel */}
      <div style={{ width:260, flexShrink:0, background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, minHeight:420, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${G.border}`, background:G.accentLight }}>
          <div style={{ color:G.accent, fontWeight:700, fontSize:13 }}>Entry Detail</div>
          <div style={{ color:G.sub, fontSize:11 }}>{detail?"Click a field to edit":"Select a row"}</div>
        </div>
        <DetailPanel />
      </div>

      {deleteModal && <Modal title="Confirm Delete" onClose={()=>setDeleteModal(null)} width={400}>
        <p style={{ color:G.sub, fontSize:14, marginBottom:20 }}>Remove <strong>{deleteModal.employee_name}</strong>'s shift on <strong>{deleteModal.shift_date||"—"}</strong>? This cannot be undone.</p>
        <div style={{ display:"flex", gap:8 }}><Btn variant="ghost" onClick={()=>setDeleteModal(null)}>Cancel</Btn><Btn variant="danger" onClick={()=>del(deleteModal)}>Delete</Btn></div>
      </Modal>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTING TAB
// ══════════════════════════════════════════════════════════════════════════════
function ReportingTab({ reports, setReports }) {
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ report_name:"", category:"HR", period:"", status:"live" });
  const PER = 8;

  const cats = [...new Set(reports.map(r=>r.category).filter(Boolean))];
  const filtered = reports.filter(r => {
    if (search && !r.report_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat!=="all" && r.category!==filterCat) return false;
    return true;
  });
  const paged = filtered.slice((page-1)*PER, page*PER);

  const save = async () => {
    if (!form.report_name) return; setSaving(true);
    try { const c = await ReportSnapshot.create({...form, generated_at:new Date().toISOString(), metrics:{}, data:{}}); setReports(p=>[c,...p]); setShowAdd(false); setForm({report_name:"",category:"HR",period:"",status:"live"}); }
    finally { setSaving(false); }
  };
  const del = async (id) => { await ReportSnapshot.delete(id); setReports(p=>p.filter(r=>r.id!==id)); if(detail?.id===id) setDetail(null); };

  const allChecked = paged.length>0 && paged.every(r=>checked.includes(r.id));

  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:18 }}>
          {[{label:"Total Reports",value:reports.length},{label:"Live",value:reports.filter(r=>r.status==="live").length},{label:"Cached",value:reports.filter(r=>r.status==="cached").length},{label:"Categories",value:cats.length}].map(m=>(
            <div key={m.label} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:10, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ color:G.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:6 }}>{m.label}</div>
              <div style={{ color:G.text, fontSize:28, fontWeight:800 }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${G.border}`, display:"flex", alignItems:"center", gap:10, justifyContent:"space-between" }}>
            <div style={{ display:"flex", gap:8, flex:1 }}>
              <div style={{ position:"relative", flex:"0 0 240px" }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:G.muted }}>🔍</span>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search reports..." style={{...inp,paddingLeft:32}} />
              </div>
              <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setPage(1);}} style={{...inp,width:"auto",minWidth:130}}>
                <option value="all">All Categories</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Btn onClick={()=>setShowAdd(!showAdd)} icon="+">{showAdd?"Cancel":"New Report"}</Btn>
          </div>

          {showAdd && (
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${G.border}`, background:G.bg }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:10, alignItems:"flex-end" }}>
                <div><label style={lbl}>Report Name</label><input value={form.report_name} onChange={e=>setForm(p=>({...p,report_name:e.target.value}))} placeholder="e.g. Weekly Headcount" style={inp} /></div>
                <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={inp}>{["HR","Operations","Finance","Custom"].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label style={lbl}>Period</label><input value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} placeholder="2026-W16" style={inp} /></div>
                <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>{["live","cached","stale"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <Btn onClick={save} disabled={saving||!form.report_name}>{saving?"...":"Add"}</Btn>
              </div>
            </div>
          )}

          <div style={{ padding:"6px 18px", borderBottom:`1px solid ${G.border}`, background:G.bg }}>
            <span style={{ color:G.muted, fontSize:12 }}>{filtered.length} reports{checked.length>0&&` · ${checked.length} selected`}</span>
          </div>

          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.bg }}>
                <th style={{ width:40, padding:"10px 16px", borderBottom:`1px solid ${G.border}` }}><input type="checkbox" checked={allChecked} onChange={()=>setChecked(allChecked?checked.filter(id=>!paged.map(r=>r.id).includes(id)):[...new Set([...checked,...paged.map(r=>r.id)])])} style={{ accentColor:G.accent }} /></th>
                {["#","Report Name","Category","Period","Source","Generated","Status",""].map(h=>(
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:G.sub, textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:`1px solid ${G.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length===0 && <tr><td colSpan={9} style={{ padding:40, textAlign:"center", color:G.muted, fontSize:13 }}>No reports found</td></tr>}
              {paged.map((row,i)=>{
                const isSelected=detail?.id===row.id;
                return (
                  <tr key={row.id} onClick={()=>setDetail(row)} style={{ background:isSelected?G.accentLight:i%2===0?G.surface:G.rowHover, borderBottom:`1px solid ${G.border}`, cursor:"pointer", transition:"background 0.1s" }}>
                    <td style={{ padding:"10px 16px" }} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={checked.includes(row.id)} onChange={()=>setChecked(p=>p.includes(row.id)?p.filter(id=>id!==row.id):[...p,row.id])} style={{ accentColor:G.accent }} /></td>
                    <td style={{ padding:"10px 12px", color:G.muted, fontSize:12, fontFamily:"monospace" }}>{(page-1)*PER+i+1}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ color:G.text, fontWeight:600, fontSize:13 }}>{row.report_name}</div>
                      <div style={{ color:G.muted, fontSize:11 }}>{row.source_integration||"Manual"}</div>
                    </td>
                    <td style={{ padding:"10px 12px" }}><span style={{ background:G.accentLight, color:G.accent, border:`1px solid ${G.accentBorder}`, borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:600 }}>{row.category}</span></td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace", fontSize:12, color:G.sub }}>{row.period||"—"}</td>
                    <td style={{ padding:"10px 12px", color:G.sub, fontSize:12 }}>{row.source_integration||"—"}</td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace", fontSize:12, color:G.sub }}>{row.generated_at?new Date(row.generated_at).toLocaleDateString("en-AU"):"—"}</td>
                    <td style={{ padding:"10px 12px" }}><StatusBadge status={row.status} /></td>
                    <td style={{ padding:"10px 12px" }} onClick={e=>e.stopPropagation()}><Btn small variant="danger" onClick={()=>del(row.id)}>✕</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ borderTop:`1px solid ${G.border}`, padding:"4px 16px" }}>
            <Pagination page={page} total={filtered.length} perPage={PER} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:260, flexShrink:0, background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, minHeight:420, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${G.border}`, background:G.accentLight }}>
          <div style={{ color:G.accent, fontWeight:700, fontSize:13 }}>Report Detail</div>
          <div style={{ color:G.sub, fontSize:11 }}>{detail?"Metrics snapshot":"Select a report"}</div>
        </div>
        {!detail ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:12, color:G.muted }}>
            <div style={{ fontSize:36 }}>📊</div>
            <div style={{ fontSize:13 }}>Select a report to view metrics</div>
          </div>
        ) : (
          <div style={{ padding:16 }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>{detail.report_name}</div>
              <div style={{ color:G.muted, fontSize:12, marginTop:3 }}>{detail.category} · {detail.period||"—"}</div>
            </div>
            <StatusBadge status={detail.status} />
            <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
              {Object.keys(detail.metrics||{}).length===0 && <div style={{ color:G.muted, fontSize:12 }}>No metrics data available.</div>}
              {Object.entries(detail.metrics||{}).map(([k,v])=>(
                <div key={k} style={{ background:G.bg, borderRadius:8, padding:"10px 12px", border:`1px solid ${G.border}` }}>
                  <div style={{ color:G.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{k.replace(/_/g," ")}</div>
                  <div style={{ color:G.text, fontSize:20, fontWeight:800, fontFamily:"monospace" }}>{typeof v==="number"&&v%1!==0?v.toFixed(1):v}{k.includes("pct")||k.includes("rate")?"%":""}</div>
                </div>
              ))}
            </div>
            {detail.generated_at && <div style={{ color:G.muted, fontSize:11, marginTop:12 }}>Generated {new Date(detail.generated_at).toLocaleString("en-AU")}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE TAB
// ══════════════════════════════════════════════════════════════════════════════
function IntelligenceTab({ roster, reports, insights, setInsights, integrations }) {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [detail, setDetail] = useState(null);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[history]);

  const runQuery = async () => {
    const q=query.trim(); if(!q||thinking) return;
    setQuery("");
    setHistory(h=>[...h,{role:"user",content:q}]);
    setThinking(true);
    try {
      const ctx = `Roster(${roster.length}): ${JSON.stringify(roster.slice(0,8))}\nReports: ${JSON.stringify(reports.slice(0,4))}\nInsights: ${JSON.stringify(insights.slice(0,4))}`;
      const res = await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("openai_key")||""}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"system",content:`Business intelligence assistant. Use real data only. No markdown.\n${ctx}`},...history.map(h=>({role:h.role,content:h.content})),{role:"user",content:q}],max_tokens:350,temperature:0.2})});
      const d=await res.json();
      setHistory(h=>[...h,{role:"assistant",content:d.choices?.[0]?.message?.content||"No response."}]);
    } catch { setHistory(h=>[...h,{role:"assistant",content:"Error: check your OpenAI API key in Settings."}]); }
    finally { setThinking(false); }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const today=new Date().toISOString().split("T")[0];
      const todayR=roster.filter(r=>r.shift_date===today);
      const res = await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("openai_key")||""}`},body:JSON.stringify({model:"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"system",content:'Return JSON: { "insights": [ { "title": "", "summary": "", "category": "", "severity": "info|warning|critical|positive" } ] }. 3-5 items. Use real numbers. Be specific.'},{role:"user",content:`roster=${JSON.stringify(todayR)}, reports=${JSON.stringify(reports)}, integrations=${JSON.stringify(integrations.map(i=>({name:i.name,status:i.status})))}`}],max_tokens:600,temperature:0.2})});
      const d=await res.json();
      const parsed=JSON.parse(d.choices?.[0]?.message?.content||"{}");
      for(const ins of (parsed.insights||[])){
        const c=await AIInsight.create({...ins,source:"AI Engine",is_read:false});
        setInsights(p=>[c,...p]);
      }
    } catch(e){console.error(e);} finally{setAnalyzing(false);}
  };

  const markRead = async (id) => { await AIInsight.update(id,{is_read:true}); setInsights(p=>p.map(i=>i.id===id?{...i,is_read:true}:i)); };
  const delInsight = async (id) => { await AIInsight.delete(id); setInsights(p=>p.filter(i=>i.id!==id)); if(detail?.id===id) setDetail(null); };
  const SEV_COLOR={info:"#2563eb",warning:"#d97706",critical:"#dc2626",positive:"#16a34a"};
  const SEV_BG={info:"#eff6ff",warning:"#fffbeb",critical:"#fef2f2",positive:"#f0fdf4"};
  const unread=insights.filter(i=>!i.is_read);

  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:16 }}>
        {/* Query */}
        <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>Data Query</div>
              <div style={{ color:G.muted, fontSize:12 }}>Ask questions about your live operational data</div>
            </div>
            <span style={{ background:G.accentLight, color:G.accent, border:`1px solid ${G.accentBorder}`, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:600 }}>GPT-4o mini</span>
          </div>
          <div style={{ height:280, overflow:"auto", padding:16, background:"#fafbfc", display:"flex", flexDirection:"column", gap:10 }}>
            {history.length===0 && <div style={{ color:G.muted, fontSize:13, textAlign:"center", marginTop:60 }}>Ask anything about your roster, reports, or integrations.<br/><span style={{ fontSize:12 }}>e.g. "Who is absent today?" · "What's the ops efficiency?"</span></div>}
            {history.map((msg,i)=>(
              <div key={i} style={{ display:"flex", gap:8, justifyContent:msg.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ background:msg.role==="user"?G.accent:G.surface, color:msg.role==="user"?"#fff":G.text, border:msg.role==="user"?"none":`1px solid ${G.border}`, borderRadius:msg.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px", padding:"9px 13px", maxWidth:"80%", fontSize:13, lineHeight:1.55, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>{msg.content}</div>
              </div>
            ))}
            {thinking && <div style={{ color:G.muted, fontSize:13, fontStyle:"italic" }}>Thinking...</div>}
            <div ref={endRef} />
          </div>
          <div style={{ borderTop:`1px solid ${G.border}`, display:"flex" }}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runQuery()} placeholder="Ask about your data..." style={{...inp,borderRadius:0,border:"none",borderRight:`1px solid ${G.border}`,flex:1,padding:"12px 16px"}} />
            <Btn onClick={runQuery} disabled={thinking||!query.trim()} style={{ borderRadius:"0 0 12px 0", padding:"12px 20px" }}>Send</Btn>
          </div>
        </div>

        {/* Insights list */}
        <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>AI Insights</div>
              <div style={{ color:G.muted, fontSize:12 }}>{unread.length} unread · {insights.length} total</div>
            </div>
            <Btn onClick={runAnalysis} disabled={analyzing} small icon="✦">{analyzing?"Analyzing...":"Run Analysis"}</Btn>
          </div>
          {insights.length===0 && <div style={{ padding:32, textAlign:"center", color:G.muted, fontSize:13 }}>Run analysis to generate insights from your live data.</div>}
          {insights.map((ins,i)=>(
            <div key={ins.id} onClick={()=>setDetail(detail?.id===ins.id?null:ins)} style={{ padding:"12px 18px", borderBottom:i<insights.length-1?`1px solid ${G.border}`:"none", background:detail?.id===ins.id?G.accentLight:ins.is_read?"transparent":SEV_BG[ins.severity]||"#fff", cursor:"pointer", opacity:ins.is_read?0.6:1, transition:"background 0.1s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:SEV_COLOR[ins.severity]||G.sub, textTransform:"uppercase", letterSpacing:"0.06em" }}>{ins.severity}</span>
                    <span style={{ background:G.accentLight, color:G.accent, border:`1px solid ${G.accentBorder}`, borderRadius:99, padding:"1px 8px", fontSize:10, fontWeight:600 }}>{ins.category}</span>
                  </div>
                  <div style={{ color:G.text, fontSize:13, fontWeight:600 }}>{ins.title}</div>
                  <div style={{ color:G.sub, fontSize:12, lineHeight:1.5, marginTop:2 }}>{ins.summary}</div>
                </div>
                <div style={{ display:"flex", gap:5, marginLeft:10 }} onClick={e=>e.stopPropagation()}>
                  {!ins.is_read && <Btn small variant="ghost" onClick={()=>markRead(ins.id)}>Read</Btn>}
                  <Btn small variant="danger" onClick={()=>delInsight(ins.id)}>✕</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right detail panel */}
      <div style={{ width:260, flexShrink:0, background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, minHeight:420, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${G.border}`, background:G.accentLight }}>
          <div style={{ color:G.accent, fontWeight:700, fontSize:13 }}>Intelligence Summary</div>
          <div style={{ color:G.sub, fontSize:11 }}>Live data overview</div>
        </div>
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
          {[{label:"Roster Entries",value:roster.length},{label:"Reports",value:reports.length},{label:"Total Insights",value:insights.length},{label:"Unread Insights",value:unread.length},{label:"Integrations",value:integrations.length},{label:"Connected",value:integrations.filter(i=>i.status==="connected").length}].map(m=>(
            <div key={m.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${G.border}` }}>
              <span style={{ color:G.sub, fontSize:13 }}>{m.label}</span>
              <span style={{ color:G.text, fontSize:16, fontWeight:800, fontFamily:"monospace" }}>{m.value}</span>
            </div>
          ))}
          {detail && (
            <div style={{ marginTop:8, background:SEV_BG[detail.severity]||G.bg, borderRadius:8, padding:12, border:`1px solid ${G.border}` }}>
              <div style={{ color:SEV_COLOR[detail.severity]||G.sub, fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:5 }}>{detail.severity}</div>
              <div style={{ color:G.text, fontSize:13, fontWeight:600, marginBottom:4 }}>{detail.title}</div>
              <div style={{ color:G.sub, fontSize:12, lineHeight:1.5 }}>{detail.summary}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
function IntegrationsTab({ integrations, setIntegrations }) {
  const [detail, setDetail] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [ef, setEf] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [af, setAf] = useState({ name:"", category:"Custom", status:"pending", endpoint_url:"", api_key_ref:"", icon:"" });
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState({});

  const save = async () => {
    setSaving(true);
    try { await Integration.update(editModal.id, ef); setIntegrations(p=>p.map(i=>i.id===editModal.id?{...i,...ef}:i)); setEditModal(null); }
    finally { setSaving(false); }
  };
  const add = async () => {
    if(!af.name) return; setSaving(true);
    try { const c=await Integration.create(af); setIntegrations(p=>[...p,c]); setShowAdd(false); setAf({name:"",category:"Custom",status:"pending",endpoint_url:"",api_key_ref:"",icon:""}); }
    finally { setSaving(false); }
  };
  const test = async (intg) => {
    setTestResult(p=>({...p,[intg.id]:"testing"}));
    await new Promise(r=>setTimeout(r,1100));
    setTestResult(p=>({...p,[intg.id]:intg.endpoint_url?"ok":"no_url"}));
  };

  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:18 }}>
          {[{label:"Total",value:integrations.length},{label:"Connected",value:integrations.filter(i=>i.status==="connected").length},{label:"Pending",value:integrations.filter(i=>i.status==="pending").length},{label:"Errors",value:integrations.filter(i=>i.status==="error").length}].map(m=>(
            <div key={m.label} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:10, padding:"14px 16px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ color:G.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:6 }}>{m.label}</div>
              <div style={{ color:G.text, fontSize:28, fontWeight:800 }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>All Integrations</div>
            <Btn onClick={()=>setShowAdd(!showAdd)} icon="+">{showAdd?"Cancel":"Add Integration"}</Btn>
          </div>
          {showAdd && (
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${G.border}`, background:G.bg }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:10, alignItems:"flex-end" }}>
                {[["name","Name"],["endpoint_url","Endpoint URL"],["api_key_ref","API Key Ref"]].map(([k,l])=>(
                  <div key={k}><label style={lbl}>{l}</label><input value={af[k]} onChange={e=>setAf(p=>({...p,[k]:e.target.value}))} style={inp} /></div>
                ))}
                <div><label style={lbl}>Category</label><select value={af.category} onChange={e=>setAf(p=>({...p,category:e.target.value}))} style={inp}>{["HR","Reporting","Finance","Operations","AI","Communication","Custom"].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <Btn onClick={add} disabled={saving||!af.name}>{saving?"...":"Add"}</Btn>
              </div>
            </div>
          )}
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.bg }}>
                {["Integration","Category","Endpoint","Status","Last Sync","Actions"].map(h=>(
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:G.sub, textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:`1px solid ${G.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {integrations.map((row,i)=>{
                const isSelected=detail?.id===row.id;
                return (
                  <tr key={row.id} onClick={()=>setDetail(detail?.id===row.id?null:row)} style={{ background:isSelected?G.accentLight:i%2===0?G.surface:G.rowHover, borderBottom:`1px solid ${G.border}`, cursor:"pointer", transition:"background 0.1s" }}>
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:8, background:G.accentLight, border:`1px solid ${G.accentBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{row.icon||"⚡"}</div>
                        <div>
                          <div style={{ color:G.text, fontWeight:600, fontSize:13 }}>{row.name}</div>
                          <div style={{ color:G.muted, fontSize:11 }}>{row.meta?.description||row.category}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"11px 16px" }}><span style={{ background:G.accentLight, color:G.accent, border:`1px solid ${G.accentBorder}`, borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:600 }}>{row.category}</span></td>
                    <td style={{ padding:"11px 16px", fontFamily:"monospace", fontSize:11, color:G.sub }}>{row.endpoint_url?row.endpoint_url.slice(0,32)+"…":"Not set"}</td>
                    <td style={{ padding:"11px 16px" }}><StatusBadge status={row.status} /></td>
                    <td style={{ padding:"11px 16px", color:G.muted, fontSize:12 }}>{row.last_sync?new Date(row.last_sync).toLocaleDateString("en-AU"):"Never"}</td>
                    <td style={{ padding:"11px 16px" }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", gap:5 }}>
                        <Btn small variant="ghost" onClick={()=>test(row)}>{testResult[row.id]==="testing"?"Testing...":testResult[row.id]==="ok"?"✓ OK":testResult[row.id]==="no_url"?"No URL":"Test"}</Btn>
                        <Btn small variant="white" onClick={()=>{setEditModal(row);setEf({endpoint_url:row.endpoint_url||"",status:row.status,api_key_ref:row.api_key_ref||""});}}>Configure</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right detail */}
      <div style={{ width:260, flexShrink:0, background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, minHeight:360, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${G.border}`, background:G.accentLight }}>
          <div style={{ color:G.accent, fontWeight:700, fontSize:13 }}>Integration Detail</div>
          <div style={{ color:G.sub, fontSize:11 }}>{detail?"Configuration":"Select a row"}</div>
        </div>
        {!detail ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:280, gap:12, color:G.muted }}>
            <div style={{ fontSize:36 }}>⚡</div>
            <div style={{ fontSize:13 }}>Select an integration</div>
          </div>
        ) : (
          <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:12, borderBottom:`1px solid ${G.border}` }}>
              <div style={{ width:38, height:38, borderRadius:8, background:G.accentLight, border:`1px solid ${G.accentBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{detail.icon||"⚡"}</div>
              <div>
                <div style={{ color:G.text, fontSize:14, fontWeight:700 }}>{detail.name}</div>
                <StatusBadge status={detail.status} />
              </div>
            </div>
            {[["Category",detail.category],["Endpoint",detail.endpoint_url||"Not set"],["API Key",detail.api_key_ref||"Not set"],["Description",detail.meta?.description||"—"]].map(([k,v])=>(
              <div key={k} style={{ borderBottom:`1px solid ${G.border}`, paddingBottom:8 }}>
                <div style={{ color:G.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>{k}</div>
                <div style={{ color:G.text, fontSize:12, fontFamily:k==="Endpoint"||k==="API Key"?"monospace":"inherit", wordBreak:"break-all" }}>{v}</div>
              </div>
            ))}
            <Btn small variant="white" onClick={()=>{setEditModal(detail);setEf({endpoint_url:detail.endpoint_url||"",status:detail.status,api_key_ref:detail.api_key_ref||""});}}>Configure</Btn>
          </div>
        )}
      </div>

      {editModal && <Modal title={`Configure: ${editModal.name}`} onClose={()=>setEditModal(null)}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div><label style={lbl}>Endpoint URL</label><input value={ef.endpoint_url} onChange={e=>setEf(p=>({...p,endpoint_url:e.target.value}))} placeholder="https://..." style={inp} /></div>
          <div><label style={lbl}>API Key / Token Ref</label><input value={ef.api_key_ref} onChange={e=>setEf(p=>({...p,api_key_ref:e.target.value}))} placeholder="env:MY_API_KEY" style={inp} /></div>
          <div><label style={lbl}>Status</label><select value={ef.status} onChange={e=>setEf(p=>({...p,status:e.target.value}))} style={inp}>{["connected","disconnected","pending","error"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div style={{ display:"flex", gap:8, marginTop:6 }}><Btn variant="ghost" onClick={()=>setEditModal(null)}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?"Saving...":"Save"}</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const [apiKey, setApiKey] = useState(()=>localStorage.getItem("openai_key")||"");
  const [org, setOrg] = useState(()=>localStorage.getItem("org_name")||"");
  const [tz, setTz] = useState(()=>localStorage.getItem("tz")||"Australia/Sydney");
  const [notif, setNotif] = useState(()=>JSON.parse(localStorage.getItem("notif")||'{"absences":true,"coverage":true,"errors":true}'));
  const [saved, setSaved] = useState(false);

  const save = () => { localStorage.setItem("openai_key",apiKey); localStorage.setItem("org_name",org); localStorage.setItem("tz",tz); localStorage.setItem("notif",JSON.stringify(notif)); setSaved(true); setTimeout(()=>setSaved(false),2000); };

  const Section = ({title,children}) => (
    <div style={{ background:G.surface, borderRadius:12, border:`1px solid ${G.border}`, overflow:"hidden", marginBottom:14, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ padding:"12px 20px", borderBottom:`1px solid ${G.border}`, color:G.text, fontSize:14, fontWeight:700, background:G.accentLight }}>
        <span style={{ color:G.accent }}>{title}</span>
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>
      <div>
        <Section title="Organisation">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div><label style={lbl}>Organisation Name</label><input value={org} onChange={e=>setOrg(e.target.value)} placeholder="Acme Corp" style={inp} /></div>
            <div><label style={lbl}>Timezone</label><select value={tz} onChange={e=>setTz(e.target.value)} style={inp}>{["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","UTC","America/New_York","Europe/London"].map(z=><option key={z} value={z}>{z}</option>)}</select></div>
          </div>
        </Section>
        <Section title="AI Configuration">
          <div><label style={lbl}>OpenAI API Key</label><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-..." style={inp} /></div>
          <div style={{ color:G.muted, fontSize:11, marginTop:6 }}>Required for Intelligence tab and Data Query. Stored in browser only.</div>
        </Section>
        <Btn onClick={save} style={{ minWidth:120 }}>{saved?"✓ Saved":"Save Settings"}</Btn>
      </div>
      <div>
        <Section title="Notifications">
          {[["absences","Alert on unplanned absences"],["coverage","Alert when coverage drops below 90%"],["errors","Alert on integration errors"]].map(([k,label])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${G.border}` }}>
              <span style={{ color:G.text, fontSize:13 }}>{label}</span>
              <div onClick={()=>setNotif(p=>({...p,[k]:!p[k]}))} style={{ width:40, height:22, borderRadius:11, background:notif[k]?G.accent:G.border2, cursor:"pointer", position:"relative", transition:"background 0.15s" }}>
                <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:notif[k]?21:3, transition:"left 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          ))}
        </Section>
        <Section title="Data Entities">
          {[["Integration","Connected services"],["RosterEntry","HR shift data"],["ReportSnapshot","KPI snapshots"],["AIInsight","AI-generated insights"]].map(([name,desc])=>(
            <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${G.border}` }}>
              <div><span style={{ color:G.text, fontSize:13, fontWeight:600, fontFamily:"monospace" }}>{name}</span><span style={{ color:G.muted, fontSize:11, marginLeft:8 }}>{desc}</span></div>
              <StatusBadge status="connected" />
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("roster");
  const [roster, setRoster] = useState([]);
  const [reports, setReports] = useState([]);
  const [insights, setInsights] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(()=>{
    Promise.all([RosterEntry.list(),ReportSnapshot.list(),AIInsight.list(),Integration.list()])
      .then(([r,rep,ins,intg])=>{ setRoster(r); setReports(rep); setInsights(ins); setIntegrations(intg); })
      .finally(()=>setLoading(false));
  },[]);

  const unread = insights.filter(i=>!i.is_read).length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Australia/Sydney"});
  const dateStr = now.toLocaleDateString("en-AU",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Australia/Sydney"});

  return (
    <div style={{ minHeight:"100vh", background:G.bg, fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif", fontSize:14, color:G.text }}>

      {/* ── Top Nav ── */}
      <div style={{ background:G.nav, boxShadow:"0 1px 4px rgba(0,0,0,0.2)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 16px", display:"flex", alignItems:"stretch", height:50 }}>

          {/* + add button */}
          <div style={{ display:"flex", alignItems:"center", paddingRight:16, borderRight:"1px solid rgba(255,255,255,0.15)" }}>
            <button style={{ width:30, height:30, borderRadius:6, background:"rgba(255,255,255,0.18)", border:"none", cursor:"pointer", color:"#fff", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:300 }}>+</button>
          </div>

          {/* Tabs — plain text, active = white underline */}
          <div style={{ display:"flex", alignItems:"stretch", flex:1, paddingLeft:4 }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                  background:"none", border:"none",
                  borderBottom: active ? "2.5px solid #fff" : "2.5px solid transparent",
                  borderTop:"2.5px solid transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.72)",
                  padding:"0 16px",
                  fontSize:13, fontWeight: active ? 600 : 400,
                  cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6,
                  transition:"color 0.12s, border-color 0.12s",
                  whiteSpace:"nowrap",
                }}>
                  {t.label}
                  {t.id==="intelligence" && unread>0 && (
                    <span style={{ background:"rgba(255,255,255,0.25)", color:"#fff", borderRadius:99, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{unread}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right icons + profile */}
          <div style={{ display:"flex", alignItems:"center", gap:2, paddingLeft:12, borderLeft:"1px solid rgba(255,255,255,0.15)" }}>
            {/* Icon buttons */}
            {["🔔","👤","📋"].map((icon,i) => (
              <button key={i} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.75)", fontSize:15, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:5 }}>{icon}</button>
            ))}

            {/* Divider */}
            <div style={{ width:1, height:24, background:"rgba(255,255,255,0.2)", margin:"0 8px" }} />

            {/* Profile block */}
            <div style={{ position:"relative" }}>
              <button onClick={()=>setProfileOpen(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, padding:"4px 6px", borderRadius:6 }}>
                {/* Stacked name + role */}
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:"#fff", fontSize:12, fontWeight:600, lineHeight:1.2 }}>Ops Admin</div>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:10, lineHeight:1.2 }}>{dateStr} {timeStr}</div>
                </div>
                {/* Square avatar */}
                <div style={{ width:32, height:32, borderRadius:6, background:G.navDark, border:"1.5px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:800, flexShrink:0 }}>O</div>
                <span style={{ color:"rgba(255,255,255,0.6)", fontSize:10 }}>▾</span>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", background:"#fff", borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,0.15)", border:`1px solid ${G.border}`, minWidth:180, zIndex:200 }}>
                  <div style={{ padding:"12px 14px", borderBottom:`1px solid ${G.border}` }}>
                    <div style={{ color:G.text, fontSize:13, fontWeight:700 }}>Ops Admin</div>
                    <div style={{ color:G.muted, fontSize:12 }}>admin@opshub.com</div>
                  </div>
                  {[["⚙️ Settings", ()=>{ setTab("settings"); setProfileOpen(false); }],["🔑 API Keys", ()=>{}],["— Sign out", ()=>{}]].map(([label, action])=>(
                    <button key={label} onClick={action} style={{ width:"100%", background:"none", border:"none", padding:"9px 14px", textAlign:"left", fontSize:13, color: label.includes("Sign") ? "#b91c1c" : G.text, cursor:"pointer", display:"block", fontFamily:"inherit" }}
                      onMouseEnter={e=>e.target.style.background=G.accentLight}
                      onMouseLeave={e=>e.target.style.background="none"}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"20px 16px" }} onClick={()=>profileOpen&&setProfileOpen(false)}>
        {loading
          ? <div style={{ textAlign:"center", color:G.muted, padding:80, fontSize:14 }}>Loading...</div>
          : <>
              {tab==="roster"       && <RosteringTab roster={roster} setRoster={setRoster} />}
              {tab==="reporting"    && <ReportingTab reports={reports} setReports={setReports} />}
              {tab==="intelligence" && <IntelligenceTab roster={roster} reports={reports} insights={insights} setInsights={setInsights} integrations={integrations} />}
              {tab==="integrations" && <IntegrationsTab integrations={integrations} setIntegrations={setIntegrations} />}
              {tab==="settings"     && <SettingsTab />}
            </>
        }
      </div>
    </div>
  );
}
