import { useState, useEffect, useRef } from "react";
import { RosterEntry, ReportSnapshot, AIInsight, Integration } from "@/api/entities";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const G = {
  nav:"#1e7d3a", navDark:"#155f2c", navLight:"#e8f5ed", navBorder:"#a8d5b5",
  accent:"#1e7d3a", accentHov:"#155f2c",
  bg:"#f5f6f8", surface:"#fff",
  border:"#e5e7eb", border2:"#d1d5db",
  text:"#111827", sub:"#6b7280", muted:"#9ca3af",
  rowHov:"#f9fafb",
};

const STATUS_CFG = {
  confirmed:   {bg:"#dcfce7",color:"#15803d",dot:"#16a34a"},
  scheduled:   {bg:"#dbeafe",color:"#1d4ed8",dot:"#3b82f6"},
  absent:      {bg:"#fee2e2",color:"#b91c1c",dot:"#ef4444"},
  completed:   {bg:"#f3f4f6",color:"#374151",dot:"#9ca3af"},
  cancelled:   {bg:"#fef3c7",color:"#92400e",dot:"#f59e0b"},
  connected:   {bg:"#dcfce7",color:"#15803d",dot:"#16a34a"},
  disconnected:{bg:"#f3f4f6",color:"#6b7280",dot:"#9ca3af"},
  pending:     {bg:"#fef9c3",color:"#854d0e",dot:"#eab308"},
  error:       {bg:"#fee2e2",color:"#b91c1c",dot:"#ef4444"},
  live:        {bg:"#dcfce7",color:"#15803d",dot:"#16a34a"},
  cached:      {bg:"#dbeafe",color:"#1d4ed8",dot:"#3b82f6"},
  stale:       {bg:"#fee2e2",color:"#b91c1c",dot:"#ef4444"},
  open:        {bg:"#dcfce7",color:"#15803d",dot:"#16a34a"},
  critical:    {bg:"#fee2e2",color:"#b91c1c",dot:"#ef4444"},
  warning:     {bg:"#fef3c7",color:"#92400e",dot:"#f59e0b"},
  positive:    {bg:"#dcfce7",color:"#15803d",dot:"#16a34a"},
  info:        {bg:"#dbeafe",color:"#1d4ed8",dot:"#3b82f6"},
};

function Badge({ status, label }) {
  const s = STATUS_CFG[status] || {bg:"#f3f4f6",color:"#374151",dot:"#9ca3af"};
  return <span style={{background:s.bg,color:s.color,borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:s.dot,display:"inline-block"}}/>{label||status}</span>;
}

const inp = {width:"100%",background:"#fff",border:`1px solid ${G.border2}`,borderRadius:7,color:G.text,padding:"8px 11px",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
const lbl = {color:G.sub,fontSize:12,fontWeight:500,marginBottom:4,display:"block"};

function Btn({children,onClick,variant="primary",disabled,small,style:ex={}}) {
  const base={fontFamily:"inherit",borderRadius:7,cursor:disabled?"not-allowed":"pointer",fontWeight:600,display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?.55:1,border:"none",transition:"all .12s"};
  const sz=small?{fontSize:12,padding:"5px 11px"}:{fontSize:13,padding:"8px 16px"};
  const vs={
    primary:{background:G.accent,color:"#fff",boxShadow:"0 1px 3px rgba(30,125,58,.25)"},
    ghost:{background:"transparent",color:G.sub,border:`1px solid ${G.border2}`},
    white:{background:"#fff",color:G.text,border:`1px solid ${G.border2}`,boxShadow:"0 1px 2px rgba(0,0,0,.05)"},
    danger:{background:"#fef2f2",color:"#b91c1c",border:"1px solid #fecaca"},
    accent:{background:G.navLight,color:G.accent,border:`1px solid ${G.navBorder}`},
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...sz,...vs[variant],...ex}}>{children}</button>;
}

function Avatar({name,size=32}) {
  const initials=(name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  const pal=["#1e7d3a","#2563eb","#7c3aed","#0891b2","#d97706","#dc2626","#0d9488"];
  const c=pal[(name||"").charCodeAt(0)%pal.length];
  return <div style={{width:size,height:size,borderRadius:"50%",background:c,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:700,flexShrink:0}}>{initials}</div>;
}

function Modal({title,children,onClose,width=520}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:14,width,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.18)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:`1px solid ${G.border}`}}>
          <span style={{color:G.text,fontSize:15,fontWeight:700}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:20,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:22}}>{children}</div>
      </div>
    </div>
  );
}

// ── Accordion section (like Dropbox / Inbox right panel) ──
function Accordion({title,defaultOpen=false,badge,children}) {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{borderBottom:`1px solid ${G.border}`}}>
      <button onClick={()=>setOpen(p=>!p)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
        <span style={{color:G.text,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",display:"flex",alignItems:"center",gap:6}}>
          {title}
          {badge!=null&&<span style={{background:G.accent,color:"#fff",borderRadius:99,padding:"1px 6px",fontSize:10,fontWeight:700}}>{badge}</span>}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transform:open?"rotate(180deg)":"rotate(0)",transition:"transform .15s"}}><path d="M2 4.5L6 8L10 4.5" stroke={G.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && <div style={{padding:"0 16px 14px"}}>{children}</div>}
    </div>
  );
}

// ── Stat card ──
function StatCard({icon,label,value,sub}) {
  return (
    <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <div style={{width:40,height:40,borderRadius:10,background:G.navLight,border:`1px solid ${G.navBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
      <div style={{minWidth:0}}>
        <div style={{color:G.muted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600,marginBottom:3}}>{label}</div>
        <div style={{color:G.text,fontSize:22,fontWeight:800,lineHeight:1}}>{value}</div>
        {sub&&<div style={{color:G.muted,fontSize:11,marginTop:2}}>{sub}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LEFT SIDEBAR TREE NAV
// ══════════════════════════════════════════════════════════════════════════════
function SideTree({nav,setNav,subNav,setSubNav,roster,reports,insights,integrations}) {
  const [expanded,setExpanded]=useState({roster:true,reporting:false,intelligence:false,integrations:false,settings:false});
  const toggle=id=>setExpanded(p=>({...p,[id]:!p[id]}));

  const unread=insights.filter(i=>!i.is_read).length;

  const TREE=[
    {id:"roster",icon:"👥",label:"Roster",children:[
      {id:"roster:all",label:"All Entries",count:roster.length},
      {id:"roster:confirmed",label:"Confirmed",count:roster.filter(r=>r.status==="confirmed").length},
      {id:"roster:scheduled",label:"Scheduled",count:roster.filter(r=>r.status==="scheduled").length},
      {id:"roster:absent",label:"Absent",count:roster.filter(r=>r.status==="absent").length},
      ...[...new Set(roster.map(r=>r.department).filter(Boolean))].map(d=>({id:`roster:dept:${d}`,label:d,count:roster.filter(r=>r.department===d).length,indent:true})),
    ]},
    {id:"reporting",icon:"📊",label:"Reporting",children:[
      {id:"reporting:all",label:"All Reports",count:reports.length},
      {id:"reporting:HR",label:"HR",count:reports.filter(r=>r.category==="HR").length},
      {id:"reporting:Operations",label:"Operations",count:reports.filter(r=>r.category==="Operations").length},
      {id:"reporting:Finance",label:"Finance",count:reports.filter(r=>r.category==="Finance").length},
      {id:"reporting:live",label:"Live",count:reports.filter(r=>r.status==="live").length},
    ]},
    {id:"intelligence",icon:"✦",label:"Intelligence",badge:unread,children:[
      {id:"intelligence:all",label:"All Insights",count:insights.length},
      {id:"intelligence:unread",label:"Unread",count:unread},
      {id:"intelligence:critical",label:"Critical",count:insights.filter(i=>i.severity==="critical").length},
      {id:"intelligence:warning",label:"Warning",count:insights.filter(i=>i.severity==="warning").length},
      {id:"intelligence:positive",label:"Positive",count:insights.filter(i=>i.severity==="positive").length},
    ]},
    {id:"integrations",icon:"⚡",label:"Integrations",children:[
      {id:"integrations:all",label:"All",count:integrations.length},
      {id:"integrations:connected",label:"Connected",count:integrations.filter(i=>i.status==="connected").length},
      {id:"integrations:pending",label:"Pending",count:integrations.filter(i=>i.status==="pending").length},
      {id:"integrations:error",label:"Error",count:integrations.filter(i=>i.status==="error").length},
    ]},
    {id:"settings",icon:"⚙️",label:"Settings",children:[
      {id:"settings:org",label:"Organisation"},
      {id:"settings:ai",label:"AI Config"},
      {id:"settings:notif",label:"Notifications"},
      {id:"settings:entities",label:"Data Entities"},
    ]},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"auto"}}>
      {/* Search */}
      <div style={{padding:"10px 12px",borderBottom:`1px solid ${G.border}`}}>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:G.muted,fontSize:13}}>🔍</span>
          <input placeholder="Search..." style={{...inp,paddingLeft:28,fontSize:12,padding:"6px 8px 6px 28px"}}/>
        </div>
      </div>
      {/* Tree */}
      <div style={{flex:1,overflow:"auto",padding:"6px 0"}}>
        {TREE.map(section=>{
          const isNavActive=nav===section.id;
          const isOpen=expanded[section.id];
          return (
            <div key={section.id}>
              {/* Section header — click to expand + navigate */}
              <button
                onClick={()=>{ toggle(section.id); setNav(section.id); setSubNav(`${section.id}:all`); }}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:isNavActive&&!isOpen?"none":"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",color:isNavActive?G.accent:G.text,fontWeight:isNavActive?700:500,fontSize:13,transition:"all .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=G.rowHov}
                onMouseLeave={e=>e.currentTarget.style.background="none"}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{flexShrink:0,transform:isOpen?"rotate(90deg)":"rotate(0)",transition:"transform .15s",color:G.muted}}>
                  <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{fontSize:16,flexShrink:0}}>{section.icon}</span>
                <span style={{flex:1}}>{section.label}</span>
                {section.badge>0&&<span style={{background:G.accent,color:"#fff",borderRadius:99,padding:"1px 6px",fontSize:10,fontWeight:700}}>{section.badge}</span>}
              </button>
              {/* Children */}
              {isOpen&&section.children.map(child=>{
                const active=subNav===child.id;
                return (
                  <button key={child.id}
                    onClick={()=>{setSubNav(child.id);setNav(section.id);}}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:`6px 12px 6px ${child.indent?36:28}px`,background:active?G.navLight:"none",border:"none",borderLeft:active?`3px solid ${G.accent}`:"3px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:12,color:active?G.accent:G.sub,fontWeight:active?600:400,textAlign:"left",transition:"all .1s"}}
                    onMouseEnter={e=>!active&&(e.currentTarget.style.background=G.rowHov)}
                    onMouseLeave={e=>!active&&(e.currentTarget.style.background="none")}
                  >
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{child.label}</span>
                    {child.count!=null&&<span style={{background:active?G.accent:G.border,color:active?"#fff":G.sub,borderRadius:99,padding:"1px 6px",fontSize:10,fontWeight:600,flexShrink:0,marginLeft:4}}>{child.count}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CONTENT VIEWS
// ══════════════════════════════════════════════════════════════════════════════

// ── Home dashboard ──
function HomeView({roster,reports,insights,integrations}) {
  const today=new Date().toISOString().split("T")[0];
  const todayR=roster.filter(r=>r.shift_date===today);
  const recentInsights=insights.filter(i=>!i.is_read).slice(0,4);
  const recentReports=reports.slice(0,5);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Welcome */}
      <div style={{background:`linear-gradient(120deg,${G.nav},${G.navDark})`,borderRadius:12,padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginBottom:4}}>Welcome back</div>
          <div style={{color:"#fff",fontSize:20,fontWeight:800}}>Ops Hub Dashboard</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:13,marginTop:4}}>{new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Australia/Sydney"})}</div>
        </div>
        <div style={{color:"rgba(255,255,255,.25)",fontSize:64}}>⊕</div>
      </div>
      {/* Stat strip */}
      <div style={{display:"flex",gap:10}}>
        <StatCard icon="👥" label="Total Roster" value={roster.length} sub={`${todayR.length} shifts today`}/>
        <StatCard icon="📊" label="Reports" value={reports.length} sub={`${reports.filter(r=>r.status==="live").length} live`}/>
        <StatCard icon="✦"  label="Insights" value={insights.length} sub={`${insights.filter(i=>!i.is_read).length} unread`}/>
        <StatCard icon="⚡" label="Integrations" value={integrations.length} sub={`${integrations.filter(i=>i.status==="connected").length} connected`}/>
      </div>
      {/* Two column widgets */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* Today's roster */}
        <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{color:G.text,fontSize:14,fontWeight:700}}>Today's Roster</div><div style={{color:G.muted,fontSize:12}}>Shifts for {today}</div></div>
            <Btn small variant="accent">+ Add</Btn>
          </div>
          {todayR.length===0&&<div style={{padding:24,color:G.muted,fontSize:13,textAlign:"center"}}>No shifts scheduled for today.</div>}
          {todayR.slice(0,5).map((r,i)=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",borderBottom:i<todayR.slice(0,5).length-1?`1px solid ${G.border}`:"none"}}>
              <Avatar name={r.employee_name} size={30}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:G.text,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.employee_name}</div>
                <div style={{color:G.muted,fontSize:11}}>{r.role} · {r.shift_start?`${r.shift_start}–${r.shift_end}`:"No time set"}</div>
              </div>
              <Badge status={r.status}/>
            </div>
          ))}
        </div>
        {/* Recent insights */}
        <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{color:G.text,fontSize:14,fontWeight:700}}>AI Insights</div><div style={{color:G.muted,fontSize:12}}>{recentInsights.length} unread</div></div>
            <Btn small variant="accent">Run Analysis</Btn>
          </div>
          {recentInsights.length===0&&<div style={{padding:24,color:G.muted,fontSize:13,textAlign:"center"}}>No unread insights. Run analysis to generate.</div>}
          {recentInsights.map((ins,i)=>{
            const sevColor={info:"#2563eb",warning:"#d97706",critical:"#dc2626",positive:"#16a34a"};
            return (
              <div key={ins.id} style={{padding:"10px 18px",borderBottom:i<recentInsights.length-1?`1px solid ${G.border}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:sevColor[ins.severity]||G.muted,display:"inline-block",flexShrink:0}}/>
                  <span style={{color:sevColor[ins.severity]||G.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{ins.severity}</span>
                  <span style={{color:G.muted,fontSize:11}}>· {ins.category}</span>
                </div>
                <div style={{color:G.text,fontSize:13,fontWeight:600}}>{ins.title}</div>
                <div style={{color:G.muted,fontSize:12,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ins.summary}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Recent reports */}
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{color:G.text,fontSize:14,fontWeight:700}}>Recent Reports</div>
          <Btn small variant="white">View all</Btn>
        </div>
        {recentReports.length===0&&<div style={{padding:24,color:G.muted,fontSize:13,textAlign:"center"}}>No reports yet.</div>}
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:G.bg}}>{["Name","Category","Period","Status","Generated"].map(h=><th key={h} style={{padding:"8px 18px",textAlign:"left",fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${G.border}`}}>{h}</th>)}</tr></thead>
          <tbody>
            {recentReports.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:i<recentReports.length-1?`1px solid ${G.border}`:"none"}} onMouseEnter={e=>e.currentTarget.style.background=G.rowHov} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <td style={{padding:"10px 18px",color:G.text,fontSize:13,fontWeight:600}}>{r.report_name}</td>
                <td style={{padding:"10px 18px"}}><span style={{background:G.navLight,color:G.accent,border:`1px solid ${G.navBorder}`,borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:600}}>{r.category}</span></td>
                <td style={{padding:"10px 18px",color:G.sub,fontSize:12,fontFamily:"monospace"}}>{r.period||"—"}</td>
                <td style={{padding:"10px 18px"}}><Badge status={r.status}/></td>
                <td style={{padding:"10px 18px",color:G.muted,fontSize:12}}>{r.generated_at?new Date(r.generated_at).toLocaleDateString("en-AU"):"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Generic table view ──
function TableView({cols,rows,onRow,toolbar,empty="No records found."}) {
  const [hov,setHov]=useState(null);
  const [page,setPage]=useState(1); const PER=10;
  const paged=rows.slice((page-1)*PER,page*PER);
  const pages=Math.max(1,Math.ceil(rows.length/PER));
  return (
    <div>
      {toolbar&&<div style={{marginBottom:12}}>{toolbar}</div>}
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:G.bg}}>
            {cols.map(c=><th key={c.key} style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${G.border}`,whiteSpace:"nowrap"}}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {paged.length===0&&<tr><td colSpan={cols.length} style={{padding:36,textAlign:"center",color:G.muted,fontSize:13}}>{empty}</td></tr>}
            {paged.map((row,i)=>(
              <tr key={row.id||i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} onClick={()=>onRow?.(row)}
                style={{background:hov===i?G.rowHov:"#fff",borderBottom:`1px solid ${G.border}`,cursor:onRow?"pointer":"default",transition:"background .1s"}}>
                {cols.map(c=><td key={c.key} style={{padding:"9px 14px",fontSize:13,color:c.dim?G.sub:G.text,...(c.style||{})}}>{c.render?c.render(row[c.key],row):row[c.key]??<span style={{color:G.muted}}>—</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {pages>1&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderTop:`1px solid ${G.border}`,background:G.bg}}>
            <span style={{color:G.muted,fontSize:12}}>{rows.length} total · page {page} of {pages}</span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{background:"none",border:`1px solid ${G.border2}`,borderRadius:6,padding:"3px 10px",cursor:"pointer",color:G.sub,fontSize:13}}>‹</button>
              {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=><button key={p} onClick={()=>setPage(p)} style={{background:p===page?G.accent:"none",color:p===page?"#fff":G.sub,border:`1px solid ${p===page?G.accent:G.border2}`,borderRadius:6,padding:"3px 9px",cursor:"pointer",fontSize:13,fontWeight:p===page?700:400}}>{p}</button>)}
              <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={{background:"none",border:`1px solid ${G.border2}`,borderRadius:6,padding:"3px 10px",cursor:"pointer",color:G.sub,fontSize:13}}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Roster view ──
function RosterView({roster,setRoster,subNav,onSelect}) {
  const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({employee_name:"",employee_id:"",role:"",department:"",location:"",shift_date:"",shift_start:"",shift_end:"",status:"scheduled",notes:""});
  const [saving,setSaving]=useState(false);
  const [delModal,setDelModal]=useState(null);

  const filter=subNav?.replace("roster:","");
  const filtered=roster.filter(r=>{
    if(search&&![r.employee_name,r.employee_id,r.role].some(v=>v?.toLowerCase().includes(search.toLowerCase()))) return false;
    if(filter==="all"||!filter) return true;
    if(filter==="confirmed"||filter==="scheduled"||filter==="absent"||filter==="completed") return r.status===filter;
    if(filter?.startsWith("dept:")) return r.department===filter.replace("dept:","");
    return true;
  });

  const save=async()=>{
    if(!form.employee_name) return; setSaving(true);
    try{const c=await RosterEntry.create(form);setRoster(p=>[c,...p]);setShowAdd(false);setForm({employee_name:"",employee_id:"",role:"",department:"",location:"",shift_date:"",shift_start:"",shift_end:"",status:"scheduled",notes:""});}
    finally{setSaving(false);}
  };
  const del=async()=>{await RosterEntry.delete(delModal.id);setRoster(p=>p.filter(r=>r.id!==delModal.id));setDelModal(null);};

  const F=({k,label,type="text",opts})=>(
    <div><label style={lbl}>{label}</label>
      {opts?<select value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
          :<input type={type} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={inp}/>}
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"space-between",background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
          <div style={{position:"relative",flex:"0 0 220px"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:G.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roster..." style={{...inp,paddingLeft:30,fontSize:12}}/>
          </div>
          <span style={{color:G.muted,fontSize:12}}>{filtered.length} entries</span>
        </div>
        <Btn onClick={()=>setShowAdd(p=>!p)} variant="primary">{showAdd?"Cancel":"+ Add Entry"}</Btn>
      </div>

      {/* Inline add form */}
      {showAdd&&(
        <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{color:G.text,fontSize:14,fontWeight:700,marginBottom:14}}>New Roster Entry</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
            <F k="employee_name" label="Full Name *"/>
            <F k="employee_id" label="Employee ID"/>
            <F k="role" label="Role"/>
            <F k="department" label="Department"/>
            <F k="location" label="Location"/>
            <F k="status" label="Status" opts={["scheduled","confirmed","absent","completed","cancelled"]}/>
            <F k="shift_date" label="Shift Date" type="date"/>
            <F k="shift_start" label="Start Time" type="time"/>
            <F k="shift_end" label="End Time" type="time"/>
          </div>
          <div><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={save} disabled={saving||!form.employee_name}>{saving?"Saving...":"Add to Roster"}</Btn><Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn></div>
        </div>
      )}

      <TableView
        rows={filtered}
        onRow={onSelect}
        cols={[
          {key:"employee_name",label:"Employee",render:(v,row)=>(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Avatar name={v} size={28}/>
              <div><div style={{color:G.text,fontWeight:600,fontSize:13}}>{v}</div><div style={{color:G.muted,fontSize:11}}>{row.employee_id||"No ID"}</div></div>
            </div>
          )},
          {key:"role",label:"Role",dim:true},
          {key:"department",label:"Dept",dim:true},
          {key:"shift_date",label:"Date",render:v=><span style={{fontFamily:"monospace",fontSize:12,color:G.sub}}>{v||"—"}</span>},
          {key:"shift_start",label:"Shift",render:(v,row)=><span style={{fontFamily:"monospace",fontSize:12,color:G.sub}}>{v&&row.shift_end?`${v}–${row.shift_end}`:v||"—"}</span>},
          {key:"location",label:"Location",dim:true},
          {key:"status",label:"Status",render:v=><Badge status={v}/>},
          {key:"_a",label:"",render:(_,row)=>(
            <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
              <Btn small variant="ghost" onClick={()=>onSelect(row)}>View</Btn>
              <Btn small variant="danger" onClick={()=>setDelModal(row)}>✕</Btn>
            </div>
          )},
        ]}
      />
      {delModal&&<Modal title="Delete Entry" onClose={()=>setDelModal(null)} width={380}><p style={{color:G.sub,fontSize:14,marginBottom:16}}>Delete <strong>{delModal.employee_name}</strong>'s shift?</p><div style={{display:"flex",gap:8}}><Btn variant="ghost" onClick={()=>setDelModal(null)}>Cancel</Btn><Btn variant="danger" onClick={del}>Delete</Btn></div></Modal>}
    </div>
  );
}

// ── Reporting view ──
function ReportingView({reports,setReports,subNav,onSelect}) {
  const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({report_name:"",category:"HR",period:"",status:"live"});
  const [saving,setSaving]=useState(false);

  const filter=subNav?.replace("reporting:","");
  const filtered=reports.filter(r=>{
    if(search&&!r.report_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if(filter==="all"||!filter) return true;
    if(["HR","Operations","Finance","Custom"].includes(filter)) return r.category===filter;
    if(["live","cached","stale"].includes(filter)) return r.status===filter;
    return true;
  });

  const save=async()=>{
    if(!form.report_name) return; setSaving(true);
    try{const c=await ReportSnapshot.create({...form,generated_at:new Date().toISOString(),metrics:{},data:{}});setReports(p=>[c,...p]);setShowAdd(false);setForm({report_name:"",category:"HR",period:"",status:"live"});}
    finally{setSaving(false);}
  };
  const del=async(id)=>{await ReportSnapshot.delete(id);setReports(p=>p.filter(r=>r.id!==id));};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"space-between",background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",gap:8,flex:1}}>
          <div style={{position:"relative",flex:"0 0 220px"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:G.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reports..." style={{...inp,paddingLeft:30,fontSize:12}}/>
          </div>
          <span style={{color:G.muted,fontSize:12,lineHeight:"34px"}}>{filtered.length} reports</span>
        </div>
        <Btn onClick={()=>setShowAdd(p=>!p)}>{showAdd?"Cancel":"+ New Report"}</Btn>
      </div>
      {showAdd&&(
        <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
            <div><label style={lbl}>Report Name</label><input value={form.report_name} onChange={e=>setForm(p=>({...p,report_name:e.target.value}))} placeholder="e.g. Weekly Headcount" style={inp}/></div>
            <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={inp}>{["HR","Operations","Finance","Custom"].map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Period</label><input value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} placeholder="2026-W16" style={inp}/></div>
            <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>{["live","cached","stale"].map(s=><option key={s}>{s}</option>)}</select></div>
            <Btn onClick={save} disabled={saving||!form.report_name}>{saving?"...":"Add"}</Btn>
          </div>
        </div>
      )}
      <TableView rows={filtered} onRow={onSelect} cols={[
        {key:"report_name",label:"Report",render:(v,row)=><div><div style={{color:G.text,fontWeight:600,fontSize:13}}>{v}</div><div style={{color:G.muted,fontSize:11}}>{row.source_integration||"Manual"}</div></div>},
        {key:"category",label:"Category",render:v=><span style={{background:G.navLight,color:G.accent,border:`1px solid ${G.navBorder}`,borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:600}}>{v}</span>},
        {key:"period",label:"Period",render:v=><span style={{fontFamily:"monospace",fontSize:12,color:G.sub}}>{v||"—"}</span>},
        {key:"status",label:"Status",render:v=><Badge status={v}/>},
        {key:"generated_at",label:"Generated",render:v=>v?<span style={{fontSize:12,color:G.sub}}>{new Date(v).toLocaleDateString("en-AU")}</span>:"—",dim:true},
        {key:"_a",label:"",render:(_,row)=><div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}><Btn small variant="ghost" onClick={()=>onSelect(row)}>View</Btn><Btn small variant="danger" onClick={()=>del(row.id)}>✕</Btn></div>},
      ]}/>
    </div>
  );
}

// ── Intelligence view ──
function IntelligenceView({roster,reports,insights,setInsights,integrations,subNav,onSelect}) {
  const [query,setQuery]=useState("");
  const [history,setHistory]=useState([]);
  const [thinking,setThinking]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[history]);

  const filter=subNav?.replace("intelligence:","");
  const filtered=insights.filter(i=>{
    if(filter==="all"||!filter) return true;
    if(filter==="unread") return !i.is_read;
    if(filter==="read") return i.is_read;
    return i.severity===filter;
  });

  const runQuery=async()=>{
    const q=query.trim(); if(!q||thinking) return;
    setQuery(""); setHistory(h=>[...h,{role:"user",content:q}]); setThinking(true);
    try{
      const ctx=`Roster(${roster.length}): ${JSON.stringify(roster.slice(0,6))}\nReports: ${JSON.stringify(reports.slice(0,4))}\nInsights: ${JSON.stringify(insights.slice(0,4))}`;
      const res=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("openai_key")||""}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"system",content:`BI assistant. Use data. No markdown.\n${ctx}`},...history.map(h=>({role:h.role,content:h.content})),{role:"user",content:q}],max_tokens:300,temperature:0.2})});
      const d=await res.json();
      setHistory(h=>[...h,{role:"assistant",content:d.choices?.[0]?.message?.content||"No response."}]);
    }catch{setHistory(h=>[...h,{role:"assistant",content:"Error — check your OpenAI API key in Settings."}]);}
    finally{setThinking(false);}
  };

  const runAnalysis=async()=>{
    setAnalyzing(true);
    try{
      const today=new Date().toISOString().split("T")[0];
      const res=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("openai_key")||""}`},body:JSON.stringify({model:"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"system",content:'Return JSON: { "insights": [ { "title": "", "summary": "", "category": "", "severity": "info|warning|critical|positive" } ] }. 3-5 items.'},{role:"user",content:`roster=${JSON.stringify(roster.filter(r=>r.shift_date===today))}, reports=${JSON.stringify(reports)}`}],max_tokens:500,temperature:0.2})});
      const d=await res.json();
      const parsed=JSON.parse(d.choices?.[0]?.message?.content||"{}");
      for(const ins of (parsed.insights||[])){const c=await AIInsight.create({...ins,source:"AI Engine",is_read:false});setInsights(p=>[c,...p]);}
    }catch(e){console.error(e);}finally{setAnalyzing(false);}
  };

  const markRead=async(id)=>{await AIInsight.update(id,{is_read:true});setInsights(p=>p.map(i=>i.id===id?{...i,is_read:true}:i));};
  const delIns=async(id)=>{await AIInsight.delete(id);setInsights(p=>p.filter(i=>i.id!==id));};

  const SEV_COLOR={info:"#2563eb",warning:"#d97706",critical:"#dc2626",positive:"#16a34a"};
  const SEV_BG={info:"#eff6ff",warning:"#fffbeb",critical:"#fef2f2",positive:"#f0fdf4"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Query box */}
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{color:G.text,fontSize:14,fontWeight:700}}>Data Query <span style={{background:G.navLight,color:G.accent,border:`1px solid ${G.navBorder}`,borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:600,marginLeft:6}}>GPT-4o mini</span></div>
          <Btn small variant="accent" onClick={runAnalysis} disabled={analyzing}>{analyzing?"Analyzing...":"✦ Run Analysis"}</Btn>
        </div>
        <div style={{height:200,overflow:"auto",padding:14,background:"#fafbfc",display:"flex",flexDirection:"column",gap:8}}>
          {history.length===0&&<div style={{color:G.muted,fontSize:13,textAlign:"center",marginTop:40}}>Ask anything about your data — "Who is absent today?" or "How many live reports?"</div>}
          {history.map((msg,i)=>(
            <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
              <div style={{background:msg.role==="user"?G.accent:"#fff",color:msg.role==="user"?"#fff":G.text,border:msg.role==="user"?"none":`1px solid ${G.border}`,borderRadius:msg.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",padding:"8px 12px",maxWidth:"80%",fontSize:13,lineHeight:1.5}}>{msg.content}</div>
            </div>
          ))}
          {thinking&&<div style={{color:G.muted,fontSize:13,fontStyle:"italic"}}>Thinking...</div>}
          <div ref={endRef}/>
        </div>
        <div style={{borderTop:`1px solid ${G.border}`,display:"flex"}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runQuery()} placeholder="Ask about your data..." style={{...inp,borderRadius:0,border:"none",borderRight:`1px solid ${G.border}`,flex:1,padding:"10px 14px"}}/>
          <Btn onClick={runQuery} disabled={thinking||!query.trim()} style={{borderRadius:"0 0 10px 0",padding:"10px 18px"}}>Send</Btn>
        </div>
      </div>

      {/* Insights feed */}
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{color:G.text,fontSize:14,fontWeight:700}}>Insights Feed <span style={{color:G.muted,fontSize:12,fontWeight:400,marginLeft:6}}>{filtered.length} items</span></div>
        </div>
        {filtered.length===0&&<div style={{padding:32,textAlign:"center",color:G.muted,fontSize:13}}>No insights match this filter. Run analysis to generate new insights.</div>}
        {filtered.map((ins,i)=>(
          <div key={ins.id} onClick={()=>onSelect(ins)} style={{padding:"12px 16px",borderBottom:i<filtered.length-1?`1px solid ${G.border}`:"none",background:ins.is_read?"#fff":SEV_BG[ins.severity]||"#fff",cursor:"pointer",opacity:ins.is_read?.65:1,transition:"background .1s"}}
            onMouseEnter={e=>e.currentTarget.style.background=G.rowHov} onMouseLeave={e=>e.currentTarget.style.background=ins.is_read?"#fff":SEV_BG[ins.severity]||"#fff"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:SEV_COLOR[ins.severity]||G.muted,display:"inline-block"}}/>
                  <span style={{fontSize:10,fontWeight:700,color:SEV_COLOR[ins.severity]||G.sub,textTransform:"uppercase",letterSpacing:"0.06em"}}>{ins.severity}</span>
                  <span style={{background:G.navLight,color:G.accent,borderRadius:99,padding:"1px 7px",fontSize:10,fontWeight:600}}>{ins.category}</span>
                </div>
                <div style={{color:G.text,fontSize:13,fontWeight:600}}>{ins.title}</div>
                <div style={{color:G.sub,fontSize:12,lineHeight:1.5,marginTop:2}}>{ins.summary}</div>
              </div>
              <div style={{display:"flex",gap:4,marginLeft:10}} onClick={e=>e.stopPropagation()}>
                {!ins.is_read&&<Btn small variant="ghost" onClick={()=>markRead(ins.id)}>Read</Btn>}
                <Btn small variant="danger" onClick={()=>delIns(ins.id)}>✕</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Integrations view ──
function IntegrationsView({integrations,setIntegrations,subNav,onSelect}) {
  const [showAdd,setShowAdd]=useState(false);
  const [af,setAf]=useState({name:"",category:"Custom",status:"pending",endpoint_url:"",api_key_ref:"",icon:""});
  const [saving,setSaving]=useState(false);
  const [testResult,setTestResult]=useState({});

  const filter=subNav?.replace("integrations:","");
  const filtered=integrations.filter(i=>{
    if(filter==="all"||!filter) return true;
    if(filter?.startsWith("cat:")) return i.category===filter.replace("cat:","");
    return i.status===filter;
  });

  const add=async()=>{
    if(!af.name) return; setSaving(true);
    try{const c=await Integration.create(af);setIntegrations(p=>[...p,c]);setShowAdd(false);setAf({name:"",category:"Custom",status:"pending",endpoint_url:"",api_key_ref:"",icon:""});}
    finally{setSaving(false);}
  };
  const test=async(intg)=>{
    setTestResult(p=>({...p,[intg.id]:"testing"}));
    await new Promise(r=>setTimeout(r,1100));
    setTestResult(p=>({...p,[intg.id]:intg.endpoint_url?"ok":"no_url"}));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <span style={{color:G.muted,fontSize:12}}>{filtered.length} integrations</span>
        <Btn onClick={()=>setShowAdd(p=>!p)}>{showAdd?"Cancel":"+ Add Integration"}</Btn>
      </div>
      {showAdd&&(
        <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
            {[["name","Name"],["endpoint_url","Endpoint"],["api_key_ref","API Key Ref"]].map(([k,l])=>(
              <div key={k}><label style={lbl}>{l}</label><input value={af[k]} onChange={e=>setAf(p=>({...p,[k]:e.target.value}))} style={inp}/></div>
            ))}
            <div><label style={lbl}>Category</label><select value={af.category} onChange={e=>setAf(p=>({...p,category:e.target.value}))} style={inp}>{["HR","Reporting","Finance","Operations","AI","Custom"].map(c=><option key={c}>{c}</option>)}</select></div>
            <Btn onClick={add} disabled={saving||!af.name}>{saving?"...":"Add"}</Btn>
          </div>
        </div>
      )}
      <TableView rows={filtered} onRow={onSelect} cols={[
        {key:"name",label:"Integration",render:(v,row)=>(
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:G.navLight,border:`1px solid ${G.navBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{row.icon||"⚡"}</div>
            <div><div style={{color:G.text,fontWeight:600,fontSize:13}}>{v}</div><div style={{color:G.muted,fontSize:11}}>{row.meta?.description||row.category}</div></div>
          </div>
        )},
        {key:"category",label:"Category",render:v=><span style={{background:G.navLight,color:G.accent,border:`1px solid ${G.navBorder}`,borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:600}}>{v}</span>},
        {key:"endpoint_url",label:"Endpoint",render:v=>v?<span style={{fontFamily:"monospace",fontSize:11,color:G.sub}}>{v.length>40?v.slice(0,40)+"…":v}</span>:<span style={{color:G.muted,fontSize:12}}>Not set</span>,dim:true},
        {key:"status",label:"Status",render:v=><Badge status={v}/>},
        {key:"_a",label:"Actions",render:(_,row)=>(
          <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
            <Btn small variant="ghost" onClick={()=>test(row)}>{testResult[row.id]==="testing"?"Testing…":testResult[row.id]==="ok"?"✓ OK":testResult[row.id]==="no_url"?"No URL":"Test"}</Btn>
            <Btn small variant="white" onClick={()=>onSelect(row)}>View</Btn>
          </div>
        )},
      ]}/>
    </div>
  );
}

// ── Settings view ──
function SettingsView({subNav}) {
  const [apiKey,setApiKey]=useState(()=>localStorage.getItem("openai_key")||"");
  const [org,setOrg]=useState(()=>localStorage.getItem("org_name")||"");
  const [tz,setTz]=useState(()=>localStorage.getItem("tz")||"Australia/Sydney");
  const [notif,setNotif]=useState(()=>JSON.parse(localStorage.getItem("notif")||'{"absences":true,"coverage":true,"errors":true}'));
  const [saved,setSaved]=useState(false);
  const save=()=>{localStorage.setItem("openai_key",apiKey);localStorage.setItem("org_name",org);localStorage.setItem("tz",tz);localStorage.setItem("notif",JSON.stringify(notif));setSaved(true);setTimeout(()=>setSaved(false),2000);};

  const Toggle=({k,label})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
      <span style={{color:G.text,fontSize:13}}>{label}</span>
      <div onClick={()=>setNotif(p=>({...p,[k]:!p[k]}))} style={{width:40,height:22,borderRadius:11,background:notif[k]?G.accent:G.border2,cursor:"pointer",position:"relative",transition:"background .15s"}}>
        <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:notif[k]?21:3,transition:"left .15s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:720}}>
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${G.border}`,background:G.navLight}}>
          <div style={{color:G.accent,fontSize:14,fontWeight:700}}>Organisation</div>
        </div>
        <div style={{padding:18}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><label style={lbl}>Organisation Name</label><input value={org} onChange={e=>setOrg(e.target.value)} placeholder="Acme Corp" style={inp}/></div>
            <div><label style={lbl}>Timezone</label><select value={tz} onChange={e=>setTz(e.target.value)} style={inp}>{["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","UTC","America/New_York","Europe/London"].map(z=><option key={z}>{z}</option>)}</select></div>
          </div>
        </div>
      </div>
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${G.border}`,background:G.navLight}}>
          <div style={{color:G.accent,fontSize:14,fontWeight:700}}>AI Configuration</div>
        </div>
        <div style={{padding:18}}>
          <label style={lbl}>OpenAI API Key</label>
          <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-..." style={inp}/>
          <div style={{color:G.muted,fontSize:11,marginTop:5}}>Required for Intelligence tab. Stored in browser only.</div>
        </div>
      </div>
      <div style={{background:"#fff",border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${G.border}`,background:G.navLight}}>
          <div style={{color:G.accent,fontSize:14,fontWeight:700}}>Notifications</div>
        </div>
        <div style={{padding:"0 18px"}}>
          <Toggle k="absences" label="Alert on unplanned absences"/>
          <Toggle k="coverage" label="Alert when coverage drops below 90%"/>
          <Toggle k="errors" label="Alert on integration errors"/>
        </div>
      </div>
      <Btn onClick={save} style={{alignSelf:"flex-start",minWidth:120}}>{saved?"✓ Saved":"Save Settings"}</Btn>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RIGHT DETAIL PANEL — accordion style (like Inbox reference)
// ══════════════════════════════════════════════════════════════════════════════
function RightPanel({detail,nav,onClose,insights,setInsights}) {
  if(!detail) return null;

  const Row=({label,value,mono=false})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${G.border}`,gap:8,fontSize:13}}>
      <span style={{color:G.muted,flexShrink:0}}>{label}</span>
      <span style={{color:G.text,fontWeight:500,textAlign:"right",fontFamily:mono?"monospace":"inherit",wordBreak:"break-all"}}>{value||"—"}</span>
    </div>
  );

  return (
    <div style={{width:280,flexShrink:0,background:"#fff",borderRadius:12,border:`1px solid ${G.border}`,boxShadow:"0 1px 8px rgba(0,0,0,.07)",display:"flex",flexDirection:"column",overflow:"hidden",height:"100%"}}>
      {/* Header */}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
        <div>
          <div style={{color:G.text,fontSize:15,fontWeight:700}}>
            {detail.employee_name||detail.report_name||detail.title||detail.name||"Details"}
          </div>
          <div style={{color:G.muted,fontSize:12,marginTop:2}}>
            {nav.charAt(0).toUpperCase()+nav.slice(1)} record
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,fontSize:20,lineHeight:1,padding:"2px 4px"}}>×</button>
      </div>

      {/* Quick attributes (always visible, like Dropbox/Inbox) */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${G.border}`,flexShrink:0}}>
        {nav==="roster"&&<><Row label="Status" value={null}/><div style={{marginTop:-18,marginBottom:6,textAlign:"right"}}><Badge status={detail.status}/></div><Row label="Department" value={detail.department}/><Row label="Location" value={detail.location}/></>}
        {nav==="reporting"&&<><Row label="Status" value={null}/><div style={{marginTop:-18,marginBottom:6,textAlign:"right"}}><Badge status={detail.status}/></div><Row label="Category" value={detail.category}/><Row label="Period" value={detail.period} mono/></>}
        {nav==="intelligence"&&<><Row label="Severity" value={detail.severity}/><Row label="Category" value={detail.category}/><Row label="Source" value={detail.source}/></>}
        {nav==="integrations"&&<><Row label="Status" value={null}/><div style={{marginTop:-18,marginBottom:6,textAlign:"right"}}><Badge status={detail.status}/></div><Row label="Category" value={detail.category}/></>}
      </div>

      {/* Accordion sections */}
      <div style={{flex:1,overflow:"auto"}}>
        {/* Primary details */}
        <Accordion title="Details" defaultOpen={true}>
          {nav==="roster"&&<>
            <Row label="Employee ID" value={detail.employee_id} mono/>
            <Row label="Role" value={detail.role}/>
            <Row label="Shift Date" value={detail.shift_date} mono/>
            <Row label="Shift Time" value={detail.shift_start?`${detail.shift_start}–${detail.shift_end}`:null} mono/>
          </>}
          {nav==="reporting"&&<>
            <Row label="Source" value={detail.source_integration}/>
            <Row label="Generated" value={detail.generated_at?new Date(detail.generated_at).toLocaleDateString("en-AU"):null}/>
          </>}
          {nav==="intelligence"&&<>
            <div style={{color:G.text,fontSize:13,lineHeight:1.6,padding:"4px 0"}}>{detail.summary}</div>
          </>}
          {nav==="integrations"&&<>
            <Row label="Endpoint" value={detail.endpoint_url} mono/>
            <Row label="API Key" value={detail.api_key_ref} mono/>
            <Row label="Last Sync" value={detail.last_sync?new Date(detail.last_sync).toLocaleDateString("en-AU"):null}/>
          </>}
        </Accordion>

        {/* Notes */}
        {nav==="roster"&&detail.notes&&(
          <Accordion title="Notes" defaultOpen={true}>
            <div style={{background:G.navLight,borderRadius:8,padding:"10px 12px",fontSize:13,color:G.text,lineHeight:1.55}}>{detail.notes}</div>
          </Accordion>
        )}

        {/* Metrics for reports */}
        {nav==="reporting"&&(
          <Accordion title="Metrics" defaultOpen={true}>
            {Object.keys(detail.metrics||{}).length===0&&<div style={{color:G.muted,fontSize:12}}>No metrics available.</div>}
            {Object.entries(detail.metrics||{}).map(([k,v])=>(
              <div key={k} style={{background:G.bg,borderRadius:7,padding:"8px 10px",marginBottom:6}}>
                <div style={{color:G.muted,fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{k.replace(/_/g," ")}</div>
                <div style={{color:G.text,fontSize:20,fontWeight:800,fontFamily:"monospace"}}>{typeof v==="number"&&v%1!==0?v.toFixed(1):v}{k.includes("pct")||k.includes("rate")?"%":""}</div>
              </div>
            ))}
          </Accordion>
        )}

        {/* Actions */}
        <Accordion title="Actions">
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {nav==="roster"&&<><Btn variant="white" small>Edit Entry</Btn><Btn variant="danger" small>Delete</Btn></>}
            {nav==="reporting"&&<Btn variant="white" small>Export Report</Btn>}
            {nav==="intelligence"&&!detail.is_read&&<Btn variant="accent" small onClick={async()=>{await AIInsight.update(detail.id,{is_read:true});setInsights(p=>p.map(i=>i.id===detail.id?{...i,is_read:true}:i));}}>Mark as Read</Btn>}
            {nav==="integrations"&&<><Btn variant="white" small>Configure</Btn><Btn variant="accent" small>Test Connection</Btn></>}
          </div>
        </Accordion>

        {/* Activity / meta */}
        <Accordion title="Activity">
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {label:"Created",value:detail.created_date?new Date(detail.created_date).toLocaleString("en-AU"):"—"},
              {label:"Updated",value:detail.updated_date?new Date(detail.updated_date).toLocaleString("en-AU"):"—"},
            ].map(({label,value})=>(
              <div key={label} style={{fontSize:12}}>
                <span style={{color:G.muted}}>{label}: </span>
                <span style={{color:G.sub}}>{value}</span>
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
const TABS=[
  {id:"roster",label:"Roster"},
  {id:"reporting",label:"Reporting"},
  {id:"intelligence",label:"Intelligence"},
  {id:"integrations",label:"Integrations"},
  {id:"settings",label:"Settings"},
];

export default function App() {
  const [nav,setNav]             = useState("home");
  const [subNav,setSubNav]       = useState(null);
  const [detail,setDetail]       = useState(null);
  const [profileOpen,setProfileOpen] = useState(false);

  const [roster,setRoster]             = useState([]);
  const [reports,setReports]           = useState([]);
  const [insights,setInsights]         = useState([]);
  const [integrations,setIntegrations] = useState([]);
  const [loading,setLoading]           = useState(true);

  useEffect(()=>{
    Promise.all([RosterEntry.list(),ReportSnapshot.list(),AIInsight.list(),Integration.list()])
      .then(([r,rep,ins,intg])=>{setRoster(r);setReports(rep);setInsights(ins);setIntegrations(intg);})
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{setDetail(null);},[nav,subNav]);

  const unread=insights.filter(i=>!i.is_read).length;
  const now=new Date();
  const dateStr=now.toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",timeZone:"Australia/Sydney"});
  const timeStr=now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Australia/Sydney"});

  const mainNav = nav==="home"?"home":nav.split(":")[0];

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:G.bg,fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",fontSize:14,color:G.text,overflow:"hidden"}}>

      {/* ════ TOP NAV — floating pill ════ */}
      <div style={{background:G.bg,padding:"10px 16px 0",flexShrink:0,zIndex:200}}>
        <div style={{background:"#fff",borderRadius:"0 0 22px 22px",boxShadow:"0 4px 16px rgba(0,0,0,.08)",display:"flex",alignItems:"stretch",height:50,paddingLeft:10,paddingRight:10}}>
          {/* + */}
          <div style={{display:"flex",alignItems:"center",paddingRight:12,borderRight:"1px solid #eee"}}>
            <button style={{width:30,height:30,borderRadius:7,background:G.nav,border:"none",cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
          {/* Home + main tabs */}
          <div style={{display:"flex",alignItems:"stretch",flex:1,paddingLeft:4}}>
            {[{id:"home",label:"Home"},...TABS].map(t=>{
              const active=nav===t.id||(nav.startsWith(t.id+":"));
              return (
                <button key={t.id} onClick={()=>{setNav(t.id);setSubNav(null);}} style={{
                  background:"none",border:"none",
                  borderBottom:active?`3px solid ${G.accent}`:"3px solid transparent",
                  borderTop:"3px solid transparent",
                  color:active?G.accent:G.sub,
                  padding:"0 15px",fontSize:13,fontWeight:active?700:500,
                  cursor:"pointer",fontFamily:"inherit",
                  display:"flex",alignItems:"center",gap:5,transition:"all .12s",whiteSpace:"nowrap",
                }}>
                  {t.label}
                  {t.id==="intelligence"&&unread>0&&<span style={{background:G.accent,color:"#fff",borderRadius:99,padding:"1px 5px",fontSize:10,fontWeight:700}}>{unread}</span>}
                </button>
              );
            })}
          </div>
          {/* Right */}
          <div style={{display:"flex",alignItems:"center",gap:3,paddingLeft:10,borderLeft:"1px solid #eee"}}>
            <span style={{color:G.muted,fontSize:11,marginRight:4}}>{dateStr} · {timeStr}</span>
            <button style={{background:"none",border:"none",cursor:"pointer",color:G.sub,fontSize:15,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}
              onMouseEnter={e=>e.currentTarget.style.background="#f3f4f6"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>🔔</button>
            <div style={{width:1,height:20,background:"#eee",margin:"0 6px"}}/>
            <div style={{position:"relative"}}>
              <button onClick={()=>setProfileOpen(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"4px 6px",borderRadius:8}}
                onMouseEnter={e=>e.currentTarget.style.background="#f3f4f6"}
                onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${G.nav},${G.navDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800}}>O</div>
                <div style={{textAlign:"left"}}>
                  <div style={{color:G.text,fontSize:12,fontWeight:700,lineHeight:1.2}}>Ops Admin</div>
                  <div style={{color:G.muted,fontSize:10,lineHeight:1.2}}>admin@opshub.com</div>
                </div>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke={G.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {profileOpen&&(
                <div style={{position:"absolute",right:0,top:"calc(100% + 8px)",background:"#fff",borderRadius:12,boxShadow:"0 8px 30px rgba(0,0,0,.13)",border:`1px solid ${G.border}`,minWidth:200,zIndex:300,overflow:"hidden"}}>
                  <div style={{padding:"14px 16px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${G.nav},${G.navDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800}}>O</div>
                    <div><div style={{color:G.text,fontSize:13,fontWeight:700}}>Ops Admin</div><div style={{color:G.muted,fontSize:11}}>admin@opshub.com</div></div>
                  </div>
                  {[{l:"⚙️  Settings",a:()=>{setNav("settings");setProfileOpen(false);}},{l:"🚪  Sign out",a:()=>setProfileOpen(false),d:true}].map(item=>(
                    <button key={item.l} onClick={item.a} style={{width:"100%",background:"none",border:"none",padding:"10px 16px",textAlign:"left",fontSize:13,color:item.d?"#b91c1c":G.text,cursor:"pointer",fontFamily:"inherit"}}
                      onMouseEnter={e=>e.currentTarget.style.background=item.d?"#fef2f2":G.navLight}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>{item.l}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════ BODY ════ */}
      <div style={{flex:1,display:"flex",overflow:"hidden",padding:"10px 16px 14px",gap:10}} onClick={()=>profileOpen&&setProfileOpen(false)}>

        {/* ── Left tree sidebar (hidden on home) ── */}
        {nav!=="home"&&(
          <div style={{width:220,flexShrink:0,background:"#fff",borderRadius:12,border:`1px solid ${G.border}`,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <SideTree
              nav={mainNav} setNav={n=>{setNav(n);setSubNav(`${n}:all`);}}
              subNav={subNav} setSubNav={setSubNav}
              roster={roster} reports={reports} insights={insights} integrations={integrations}
            />
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{flex:1,minWidth:0,overflow:"auto"}}>
          {loading
            ? <div style={{textAlign:"center",color:G.muted,padding:80}}>Loading…</div>
            : <>
                {nav==="home"&&<HomeView roster={roster} reports={reports} insights={insights} integrations={integrations}/>}
                {mainNav==="roster"&&<RosterView roster={roster} setRoster={setRoster} subNav={subNav} onSelect={setDetail}/>}
                {mainNav==="reporting"&&<ReportingView reports={reports} setReports={setReports} subNav={subNav} onSelect={setDetail}/>}
                {mainNav==="intelligence"&&<IntelligenceView roster={roster} reports={reports} insights={insights} setInsights={setInsights} integrations={integrations} subNav={subNav} onSelect={setDetail}/>}
                {mainNav==="integrations"&&<IntegrationsView integrations={integrations} setIntegrations={setIntegrations} subNav={subNav} onSelect={setDetail}/>}
                {mainNav==="settings"&&<SettingsView subNav={subNav}/>}
              </>
          }
        </div>

        {/* ── Right detail panel (accordion, slides in) ── */}
        <div style={{width:detail?280:0,flexShrink:0,overflow:"hidden",transition:"width .2s ease"}}>
          {detail&&(
            <RightPanel detail={detail} nav={mainNav} onClose={()=>setDetail(null)} insights={insights} setInsights={setInsights}/>
          )}
        </div>

      </div>
    </div>
  );
}
