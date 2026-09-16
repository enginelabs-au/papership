// Reference capture driver: headless Google Chrome (host binary) via CDP over WebSocket.
// No installs. Run: node capture.mjs [only=nn,nn]
import { writeFileSync, mkdirSync } from "node:fs";

const APP = "http://127.0.0.1:5173/cc-org-dash";
const DEVTOOLS = "http://127.0.0.1:9333";
const OUT = "/Users/camdouglas/OrgOS/docs/ui-blueprint";
mkdirSync(OUT, { recursive: true });

const only = (process.argv.find(a => a.startsWith("only=")) || "").slice(5).split(",").filter(Boolean);

// ---------- CDP plumbing ----------
const list = await (await fetch(`${DEVTOOLS}/json/list`)).json();
let page = list.find(t => t.type === "page");
if (!page) page = await (await fetch(`${DEVTOOLS}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pending = new Map(); const events = [];
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  else if (m.method) events.push(m);
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await send("Page.enable"); await send("Runtime.enable");
const waitLoad = async () => { const t0 = Date.now(); while (Date.now() - t0 < 8000) { const s = await evaluate("document.readyState"); if (s === "complete") break; await sleep(100); } };

// ---------- in-page helpers ----------
const HELPERS = `window.__q = {
  cands(t, root=document){ return [...root.querySelectorAll('button,div,span,a,li,td,th,label,h1,h2,h3,p')].filter(e=>e.textContent.trim()===t).sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length); },
  click(t, nth=0){ const c=this.cands(t); if(!c.length) throw new Error('no text: '+t); c[nth].click(); return c.length; },
  clickTitle(t){ const e=[...document.querySelectorAll('[title]')].find(x=>x.getAttribute('title').startsWith(t)); if(!e) throw new Error('no title: '+t); e.click(); return true; },
  clickSel(s, nth=0){ const e=document.querySelectorAll(s)[nth]; if(!e) throw new Error('no sel: '+s); e.click(); return true; },
  setInput(sel, val){ const i=document.querySelector(sel); if(!i) throw new Error('no input '+sel); const proto=i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(i,val); i.dispatchEvent(new Event('input',{bubbles:true})); return true; },
  key(sel, key, opts={}){ const e=sel?document.querySelector(sel):window; const ev=new KeyboardEvent('keydown',{key, code:key, bubbles:true, cancelable:true, ...opts}); e.dispatchEvent(ev); return true; },
  topbar(){ const agent=[...document.querySelectorAll('[title]')].find(x=>/platform agent/.test(x.getAttribute('title'))); const cluster=agent?.parentElement; return cluster; },
  bell(){ const c=this.topbar(); const btns=[...c.querySelectorAll(':scope > button, :scope > div > button')]; return btns; },
};true`;

// ---------- capture states ----------
const V = { V1: [1440, 900], V2: [1280, 800], V3: [1024, 700], V4: [768, 1024] };
const seedJS = (theme, auth, rail) => `localStorage.clear();
${auth ? `localStorage.setItem("cc-org-dash-auth", JSON.stringify({email:"founder@example.test",name:"Founder",at:Date.now()}));` : ""}
localStorage.setItem("cc-org-dash-theme", ${JSON.stringify(theme)});
localStorage.setItem("cc-global-command-open", ${JSON.stringify(rail ? "1" : "0")}); true`;

// Each state: { nn, name, views:[...], themes:[...], auth:true, rail:true, steps:[jsExpr...] , clip?: 'bottom' }
const S = [
  { nn: "01", name: "auth-login", views: ["V1", "V4"], auth: false },
  { nn: "02", name: "auth-signup", auth: false, steps: ["__q.click('Sign up')"] },
  { nn: "03", name: "shell-home-rail-open", views: ["V1", "V2", "V3", "V4"], themes: ["light", "dark", "dimmed"], scales: { V1: [1, 2] } },
  { nn: "04", name: "shell-home-rail-closed", views: ["V1", "V3"], rail: false },
  { nn: "05", name: "home-overview-7d", steps: ["__q.click('7d')"] },
  { nn: "06", name: "home-overview-90d", steps: ["__q.click('90d')"] },
  { nn: "07", name: "home-project-slideover", steps: ["(()=>{const rows=[...document.querySelectorAll('div')].filter(d=>d.style.cursor==='pointer' && /%/.test(d.textContent) && d.querySelectorAll('*').length<60); if(!rows.length) throw new Error('no project row'); rows[0].click(); return rows.length;})()"] },
  { nn: "08", name: "agent-panel-open", views: ["V1", "V4"], steps: ["__q.clickTitle('Open platform agent')"] },
  { nn: "09", name: "agent-panel-params-open", steps: ["__q.clickTitle('Open platform agent')", "__q.click('Model & parameters')"] },
  { nn: "10", name: "agent-panel-variables-open", steps: ["__q.clickTitle('Open platform agent')", "__q.click('Variables & context')"] },
  { nn: "11", name: "agent-panel-two-tabs-demo-reply", steps: ["__q.clickTitle('Open platform agent')", "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+'||/New (tab|chat|thread)/i.test(x.getAttribute('title')||'')); if(b) b.click(); return !!b;})()", "__q.setInput('textarea','Summarise this quarter')", "__q.key('textarea','Enter')", "await new Promise(r=>setTimeout(r,1500))"] },
  { nn: "12", name: "rail-detail-critical", steps: ["__q.click('Critical')"] },
  { nn: "13", name: "rail-detail-initiative", steps: ["(()=>{const el=__q.cands('Critical')[0]; const rail=el.closest('aside')||el.parentElement.parentElement.parentElement; const btns=[...rail.querySelectorAll('button')]; const i=btns.findIndex(b=>/FYI/i.test(b.textContent)); const t=btns[i+1]; if(!t) throw new Error('no initiative'); t.click(); return t.textContent.slice(0,40);})()"] },
  { nn: "14", name: "rail-detail-blocker", steps: ["(()=>{const lab=[...document.querySelectorAll('div,span')].find(x=>x.textContent.trim()==='BLOCKERS'); if(!lab) throw new Error('no blockers label'); let n=lab.nextElementSibling; while(n && n.tagName!=='BUTTON') n=n.nextElementSibling; if(!n) throw new Error('no blocker btn'); n.click(); return n.textContent.slice(0,30);})()"] },
  { nn: "15", name: "notif-drawer", steps: ["(()=>{const c=__q.topbar(); const bs=[...c.querySelectorAll('button')]; const bell=bs.find(b=>b.style.position==='relative' && b.style.padding==='6px'); if(!bell) throw new Error('no bell'); bell.click(); return true;})()"] },
  { nn: "16", name: "cmd-palette", steps: ["__q.key(null,'k',{metaKey:true})"] },
  { nn: "17", name: "cmd-palette-no-results", steps: ["__q.key(null,'k',{metaKey:true})", "__q.setInput('input','zzz')"] },
  { nn: "18", name: "create-menu", steps: ["(()=>{const c=__q.topbar(); const bs=[...c.querySelectorAll('button')]; const bell=bs.find(b=>b.style.position==='relative' && b.style.padding==='6px'); const create=bell.previousElementSibling.querySelector('button'); create.click(); return true;})()"] },
  { nn: "19", name: "profile-menu", steps: ["(()=>{const c=__q.topbar(); const bs=[...c.querySelectorAll('button')]; const bell=bs.find(b=>b.style.position==='relative' && b.style.padding==='6px'); const prof=bell.nextElementSibling.querySelector('button'); prof.click(); return true;})()"] },
  { nn: "20", name: "status-bar-collapsed", clip: "bottom" },
  { nn: "21", name: "status-bar-expanded", steps: ["__q.clickSel('[aria-expanded=\"false\"]')"] },
  { nn: "22", name: "work-projects", views: ["V1", "V3"], steps: ["__q.click('Work')"] },
  { nn: "23", name: "work-issues-all-selected2", steps: ["__q.click('Work')", "__q.click('Issues')", "(()=>{const cb=[...document.querySelectorAll('input[type=checkbox]')]; if(cb.length<3) { const d=[...document.querySelectorAll('div')].filter(x=>x.style.cursor==='pointer' && x.style.width && parseInt(x.style.width)<=18 && x.style.borderRadius); if(d.length<3) throw new Error('no checkboxes'); d[1].click(); d[2].click(); return 'div:'+d.length;} cb[1].click(); cb[2].click(); return cb.length;})()"] },
  { nn: "24", name: "work-issues-filter-review", steps: ["__q.click('Work')", "__q.click('Issues')", "__q.click('Review')"] },
  { nn: "25", name: "work-issue-slideover", steps: ["__q.click('Work')", "__q.click('Issues')", "(()=>{const rows=document.querySelectorAll('div[role=button][tabindex]'); if(!rows.length) throw new Error('no rows'); rows[0].click(); return rows.length;})()"] },
  { nn: "26", name: "work-new-issue-modal", steps: ["__q.click('Work')", "__q.click('New issue')"] },
  { nn: "27", name: "work-board", steps: ["__q.click('Work')", "__q.click('Board')"] },
  { nn: "28", name: "work-roadmap", steps: ["__q.click('Work')", "__q.click('Roadmap')"] },
  { nn: "29", name: "work-workflows-node-selected", steps: ["__q.click('Work')", "__q.click('Workflows')", "(()=>{const g=document.querySelectorAll('svg g[style*=\"cursor\"], svg [cursor=pointer], svg rect'); if(!g.length) throw new Error('no node'); g[0].dispatchEvent(new MouseEvent('click',{bubbles:true})); return g.length;})()"] },
  { nn: "30", name: "work-wiki-empty", steps: ["__q.click('Work')", "__q.click('Wiki')"] },
  { nn: "31", name: "inbox-default", steps: ["(()=>{const t=[...document.querySelectorAll('button,div')].find(e=>e.textContent.trim().startsWith('Inbox') && e.textContent.trim().length<8 && e.querySelectorAll('*').length<8); if(!t) throw new Error('no inbox tab'); t.click(); return t.textContent;})()"] },
  { nn: "32", name: "people-table", steps: ["__q.click('People')"] },
  { nn: "33", name: "data-metrics-traces", steps: ["__q.click('Data')"] },
  { nn: "34", name: "data-trace-slideover", steps: ["__q.click('Data')", "(()=>{const tr=document.querySelectorAll('tbody tr'); if(!tr.length) throw new Error('no rows'); tr[0].click(); return tr.length;})()"] },
  { nn: "35", name: "files-list", steps: ["__q.click('Files')"] },
  { nn: "36", name: "files-grid-detail", steps: ["__q.click('Files')", "__q.clickTitle('Grid view')", "(()=>{const grid=[...document.querySelectorAll('div')].find(d=>d.style.display==='grid' && /auto-fill/.test(d.style.gridTemplateColumns)); if(!grid) throw new Error('no grid'); grid.children[0].click(); return grid.children.length;})()"] },
  { nn: "37", name: "integrations-cards", steps: ["__q.click('Integrations')"] },
  { nn: "38", name: "integrations-slideover", steps: ["__q.click('Integrations')", "(()=>{const cards=[...document.querySelectorAll('div')].filter(d=>d.style.cursor==='pointer' && d.querySelectorAll('*').length<40 && d.textContent.trim().length>5); if(!cards.length) throw new Error('no card'); cards[0].click(); return cards.length;})()"] },
  { nn: "39", name: "settings-general", steps: ["__q.click('Settings')", "__q.click('General')"] },
  { nn: "40", name: "settings-appearance", steps: ["__q.click('Settings')", "__q.click('Appearance')"] },
  { nn: "41", name: "settings-ai", steps: ["__q.click('Settings')", "__q.click('AI & Agents')"] },
  { nn: "42", name: "settings-notifications", steps: ["__q.click('Settings')", "__q.click('Notifications')"] },
  { nn: "43", name: "settings-security", steps: ["__q.click('Settings')", "__q.click('Security')"] },
  { nn: "44", name: "settings-billing", steps: ["__q.click('Settings')", "__q.click('Plan & Billing')"] },
  { nn: "45", name: "settings-team", steps: ["__q.click('Settings')", "__q.click('Team')"] },
  { nn: "46", name: "settings-docs", steps: ["__q.click('Settings')", "__q.click('Docs')"] },
  { nn: "47", name: "settings-upgrade-modal", steps: ["__q.click('Settings')", "__q.click('Plan & Billing')", "__q.click('Upgrade plan')"] },
  { nn: "48", name: "account-profile", steps: ["(()=>{const c=__q.topbar(); const bs=[...c.querySelectorAll('button')]; const bell=bs.find(b=>b.style.position==='relative' && b.style.padding==='6px'); bell.nextElementSibling.querySelector('button').click(); return true;})()", "__q.click('Your profile')"] },
  { nn: "49", name: "account-login-security", steps: ["(()=>{const c=__q.topbar(); const bs=[...c.querySelectorAll('button')]; const bell=bs.find(b=>b.style.position==='relative' && b.style.padding==='6px'); bell.nextElementSibling.querySelector('button').click(); return true;})()", "__q.click('Your profile')", "__q.click('Login & security')"] },
  { nn: "50", name: "mobile-rail-button", views: ["V4"], rail: false },
  { nn: "51", name: "focus-visible-tab", cdpSteps: [["Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }], ["Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }], ["Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }], ["Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }]] },
  { nn: "52", name: "reduced-motion-note", media: [{ name: "prefers-reduced-motion", value: "reduce" }], steps: ["__q.clickTitle('Open platform agent')"], quick: true },
];

const results = [];
for (const st of S) {
  if (only.length && !only.includes(st.nn)) continue;
  const views = st.views || ["V1"]; const themes = st.themes || ["light", "dark"]; const auth = st.auth !== false; const rail = st.rail !== false;
  for (const v of views) for (const theme of themes) {
    if (theme === "dimmed" && v !== "V1") continue;
    const scales = (st.scales && st.scales[v]) || [1];
    for (const scale of scales) {
      const [w, h] = V[v];
      const file = `${st.nn}-${st.name}-${theme}-${w}x${h}@${scale}x.png`;
      let note = "ok";
      try {
        await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile: false });
        await send("Emulation.setEmulatedMedia", { features: st.media || [] });
        await send("Page.navigate", { url: APP }); await waitLoad(); await sleep(200);
        await evaluate(seedJS(theme, auth, rail));
        await send("Page.navigate", { url: APP }); await waitLoad(); await sleep(st.quick ? 150 : 600);
        await evaluate(HELPERS);
        const t0 = Date.now();
        for (const step of st.steps || []) { const r = await evaluate(`(async()=>{ return ${step}; })()`); note = `ok (${String(r).slice(0, 30)})`; await sleep(st.quick ? 60 : 350); }
        for (const [m, p] of st.cdpSteps || []) { await send(m, p); await sleep(150); }
        const shot = { format: "png", captureBeyondViewport: false };
        if (st.clip === "bottom") shot.clip = { x: 0, y: h - 60, width: w, height: 60, scale };
        const { data } = await send("Page.captureScreenshot", shot);
        writeFileSync(`${OUT}/${file}`, Buffer.from(data, "base64"));
        note += ` t+${Date.now() - t0}ms`;
      } catch (e) { note = "FAILED: " + e.message.split("\n")[0].slice(0, 160); }
      results.push({ nn: st.nn, file, note });
      console.log(`${st.nn} ${file} :: ${note}`);
    }
  }
}
writeFileSync("/tmp/orgos-capture/results.json", JSON.stringify(results, null, 2));
ws.close();
