import { useEffect, useRef, useState } from "react";
import { PRODUCT } from "../brand";
import { Ico } from "./svg";
import { navigate } from "./platform.jsx";
import { useLive } from "./live.jsx";
import { menuFor, modeOf, useLens } from "./lens.jsx";

/**
 * Breadcrumb switchers for the top-left of the shell, in the manner of Vercel's team > project > view picker:
 *   [Papership / Product]  >  [Organisation, role]  >  [View]
 * The first picks the product. The second opens the access and shortcuts for the current product and the
 * caller's real role. The third jumps between views inside the product.
 */

const STATUS_TONE = { implemented: "var(--green)", simulated: "var(--cyan)", demo: "var(--cyan)", preview: "var(--amber)", disabled: "var(--t3)", planned: "var(--t3)", unsupported: "var(--red)" };

export const PRODUCT_COPY = {
  home: { name: "Home", line: "Overview and the connected demo" },
  workspace: { name: "Workspace", line: "People, agents, tools and work" },
  registry: { name: "Registry", line: "Installable agent materials" },
  studio: { name: "Studio", line: "Define, lock, test and build agents" },
  exchange: { name: "Exchange", line: "Buy a capability for a task (demo)" },
};

const Chevron = ({ open }) => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flex: "none", opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
    <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const dot = (c, size = 7) => <span style={{ width: size, height: size, borderRadius: "50%", background: c, flex: "none", display: "inline-block" }} />;

/** Click-outside and Escape aware popover. `trigger({open, toggle})` renders the button, `children(close)` the panel. */
export function Dropdown({ trigger, children, width = 280, align = "left", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} style={{ position: "relative", flex: "none", minWidth: 0 }}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open ? (
        <div role="menu" className="ps-menu" style={{ position: "absolute", top: "calc(100% + 6px)", [align]: 0, width, maxWidth: "calc(100vw - 16px)", maxHeight: "72vh", overflowY: "auto", zIndex: 530 }}>
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function MenuLabel({ children }) {
  return <div className="ps-menu-label">{children}</div>;
}

export function MenuItem({ label, hint, right, onClick, disabled, active, lead }) {
  const act = () => { if (!disabled && onClick) onClick(); };
  return (
    <div role="menuitem" tabIndex={disabled ? -1 : 0} aria-disabled={disabled ? "true" : undefined} aria-current={active ? "true" : undefined}
      onClick={act} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } }}
      className="ps-menu-item" data-active={active ? "1" : "0"} data-disabled={disabled ? "1" : "0"}>
      {lead ? <span style={{ width: 22, flex: "none", display: "flex", justifyContent: "center", color: "var(--t2)" }}>{lead}</span> : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: active ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {hint ? <span style={{ display: "block", fontSize: 11, color: "var(--t3)", marginTop: 1, lineHeight: 1.35 }}>{hint}</span> : null}
      </span>
      {right ? <span style={{ flex: "none", font: "500 10px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{right}</span> : null}
    </div>
  );
}

export const MenuRule = () => <div style={{ height: 1, background: "var(--line2)", margin: "4px 0" }} />;

// ---- 1. product switcher ------------------------------------------------------------------------------

export function ProductSwitcher({ tab, go, productTabs, icons }) {
  const live = useLive();
  const current = PRODUCT_COPY[tab] ? tab : null;
  return (
    <Dropdown width={300} trigger={({ open, toggle }) => (
      <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} data-open={open ? "1" : "0"} className="ps-crumb" title="Switch product">
        <img className="ps-logo" src={PRODUCT.iconSrc} alt="" width="22" height="22" aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-.1px" }}>{PRODUCT.name}</span>
        {current ? <span className="ps-hide-narrow" style={{ display: "contents" }}><span style={{ color: "var(--line)", fontWeight: 400 }}>/</span><span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>{PRODUCT_COPY[current].name}</span></span> : null}
        <Chevron open={open} />
      </button>
    )}>
      {(close) => (
        <>
          <MenuLabel>Products</MenuLabel>
          {productTabs.map((k) => {
            const p = live.caps ? live.caps.products.find((x) => x.id === k) : null;
            const n = k === "workspace" ? live.pending.length : 0;
            return (
              <MenuItem key={k} active={tab === k} lead={<Ico d={icons[k]} size={15} />}
                label={(
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {PRODUCT_COPY[k].name}
                    {p ? <span style={{ font: "600 8.5px Inter,sans-serif", letterSpacing: ".07em", textTransform: "uppercase", color: STATUS_TONE[p.status] || "var(--t3)" }}>{p.status}</span> : null}
                  </span>
                )}
                hint={PRODUCT_COPY[k].line} right={n ? `${n} waiting` : tab === k ? "current" : ""}
                onClick={() => { close(); go(k)(); }} />
            );
          })}
          <MenuRule />
          <MenuItem label="Organisation settings" hint="Plan, permissions, appearance" onClick={() => { close(); go("settings")(); }} />
        </>
      )}
    </Dropdown>
  );
}

// ---- 2. organisation, role and mode menu --------------------------------------------------------------

/** Each row states what a role needs. `need` is a key of `member.permissions`, or "never" for planned work. */
const ACCESS = {
  home: [
    ["View the organisation's work", "view"],
    ["Seed or reset the demo data", "admin"],
  ],
  workspace: [
    ["View agents, tasks and approvals", "view"],
    ["Create, edit and run tasks", "write"],
    ["Decide approvals for external actions", "decide"],
    ["Seed or reset demo data", "admin"],
  ],
  registry: [
    ["Search, read and resolve materials", "view"],
    ["Publish materials and install onto your agents", "write"],
    ["Install onto another member's agent", "admin"],
    ["Paid purchases", "never"],
  ],
  studio: [
    ["View blueprints and version history", "view"],
    ["Save versions, run fixture checks, create agents", "write"],
    ["Publish a blueprint publicly", "admin"],
    ["Deploy to a hosted target", "never"],
  ],
  exchange: [
    ["View the catalogue, quotes and jobs", "view"],
    ["Request and accept quotes within the policy", "write"],
    ["Approve a quote above the threshold", "decide"],
    ["Change the budget and approval threshold", "policy"],
    ["Real payment or payout", "never"],
  ],
};

export function ContextSwitcher({ tab, pages, tabLabels, currentSub, defaultOpen }) {
  const live = useLive();
  const ctx = live.ctx;
  const member = ctx ? ctx.member : null;
  const perms = (member && member.permissions) || {};
  const org = ctx ? ctx.organisation.name : PRODUCT.company;
  const role = member ? member.role : "";
  const mode = modeOf(tab);
  const lens = useLens(mode === "home" ? "workspace" : mode);
  const label = mode === "home" ? "Workspace" : PRODUCT_COPY[mode].name;
  const disabledHere = ctx && ctx.disabled_products && ctx.disabled_products.includes(mode);
  const pick = (id, close) => {
    const next = lens.roles.find((r) => r.id === id);
    lens.choose(id);
    close();
    const menu = menuFor(mode === "home" ? "workspace" : mode, next, pages, tabLabels);
    const present = menu.some((g) => g.tab === tab && (g.subs.length ? g.subs.includes(currentSub) : true));
    if (mode !== "home" && !present && menu.length) {
      const first = menu[0];
      if (first.subs.length) navigate(first.tab, first.subs[0]); else navigate(first.tab);
    }
  };
  const mine = (r) => (r.title === "Founder" || r.title === "Owner / Founder" ? role === "Owner / Founder" : r.title === role);
  const count = (r) => menuFor(mode === "home" ? "workspace" : mode, r, pages, tabLabels).reduce((n, g) => n + Math.max(1, g.subs.length), 0);
  return (
    <Dropdown defaultOpen={defaultOpen} width={348} trigger={({ open, toggle }) => (
      <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} data-open={open ? "1" : "0"} className="ps-crumb" title="Organisation and role">
        {dot(live.loaded && !Object.keys(live.errors).length ? "var(--green)" : "var(--amber)")}
        <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }} className="ps-hide-narrow">{org}</span>
        {mode !== "home" && lens.role ? <span className="ps-hide-narrow ps-role-tag">{lens.role.title}</span> : role ? <span className="ps-hide-narrow ps-role-tag">{role}</span> : null}
        <Chevron open={open} />
      </button>
    )}>
      {(close) => (
        <>
          <div style={{ padding: "8px 10px 9px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {dot("var(--green)")}
              <strong style={{ fontSize: 13 }}>{org}</strong>
              {role ? <span className="ps-role-tag">{role}</span> : null}
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 5, lineHeight: 1.4 }}>{ctx ? ctx.identity_note : "Loading identity."}</div>
            {disabledHere ? <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 5 }}>{label} is disabled in this deployment.</div> : null}
          </div>
          <MenuRule />
          <MenuLabel>{mode === "home" ? "Roles" : `Role in ${label}`}</MenuLabel>
          <div style={{ padding: "0 10px 6px", fontSize: 11, color: "var(--t3)", lineHeight: 1.4 }}>
            {mode === "home"
              ? "Open a product to choose its role. Each product has its own roles and left-panel menu."
              : "Choose a role to show its menu in the left panel. This changes the menu only. Your access stays as shown above, and the server enforces it."}
          </div>
          {mode !== "home" ? lens.roles.map((r) => {
            const on = lens.role && lens.role.id === r.id;
            return (
              <div key={r.id} role="menuitemradio" aria-checked={on} tabIndex={0} onClick={() => pick(r.id, close)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(r.id, close); } }}
                className="ps-menu-item" data-active={on ? "1" : "0"} style={{ gap: 10 }}>
                <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: "50%", background: r.av, color: "#fff", font: "600 9px Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{r.code.slice(0, 2)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{r.title}{mine(r) ? <span style={{ fontWeight: 400, color: "var(--t3)" }}> (your role)</span> : null}</span>
                  <span style={{ display: "block", font: "400 10.5px Inter,sans-serif", color: "var(--t3)", marginTop: 1 }}>{r.summary}</span>
                </span>
                <span style={{ flex: "none", font: "500 9.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{count(r)} items</span>
              </div>
            );
          }) : null}
          <MenuRule />
          <MenuLabel>{label}: what you can do</MenuLabel>
          {ACCESS[mode === "home" ? "workspace" : mode].map(([text, need]) => {
            const ok = need !== "never" && !!perms[need];
            return (
              <div key={text} className="ps-access" data-ok={ok ? "1" : "0"}>
                <span aria-hidden="true" style={{ width: 16, flex: "none", fontWeight: 700, color: ok ? "var(--green)" : "var(--t3)" }}>{ok ? "✓" : "–"}</span>
                <span style={{ flex: 1, fontSize: 12 }}>{text}</span>
                <span style={{ flex: "none", font: "500 9.5px 'JetBrains Mono',monospace", color: "var(--t3)" }}>{need === "never" ? "planned" : ok ? "allowed" : "needs " + (need === "write" ? "operator" : need === "view" ? "access" : "owner")}</span>
              </div>
            );
          })}
          <MenuRule />
          <MenuItem label="See every role and who holds it" hint="Team and roles" onClick={() => { close(); navigate("workspace", "Team & tools"); }} />
        </>
      )}
    </Dropdown>
  );
}

// ---- 3. view switcher ---------------------------------------------------------------------------------

export function ViewSwitcher({ subnav }) {
  const items = subnav || [];
  const current = items.find((s) => s.on);
  if (items.length < 2 || !current) return null;
  return (
    <Dropdown width={230} trigger={({ open, toggle }) => (
      <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} data-open={open ? "1" : "0"} className="ps-crumb ps-hide-narrow" title="Switch view">
        <span style={{ fontSize: 12, fontWeight: 600 }}>{current.label}</span>
        <Chevron open={open} />
      </button>
    )}>
      {(close) => (
        <>
          <MenuLabel>Views</MenuLabel>
          {items.map((s) => <MenuItem key={s.label} label={s.label} right={s.count || ""} active={s.on} onClick={() => { close(); s.go(); }} />)}
        </>
      )}
    </Dropdown>
  );
}

export const Slash = () => <span className="ps-hide-narrow" aria-hidden="true" style={{ color: "var(--line)", fontSize: 16, fontWeight: 300, flex: "none", userSelect: "none" }}>/</span>;
