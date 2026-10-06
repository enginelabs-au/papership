import { useState, useEffect, useMemo } from "react";
import { Surface, Btn, Badge, Toggle, Modal, Field, Input, Select, Avi, F } from "./primitives";
import {
  User,
  Palette,
  ExternalLink,
  Shield,
  Bell,
  Trash2,
  Upload,
  Clock,
  SettingsIcon,
} from "./icons";

/** Small label hint (Calendly-style “i”) */
function InfoHint({ T, text }) {
  return (
    <span
      title={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `1px solid ${T.border}`,
        color: T.t3,
        fontSize: 10,
        fontWeight: 700,
        cursor: "help",
        flexShrink: 0,
        marginLeft: 6,
        fontFamily: F.sans,
      }}
    >
      i
    </span>
  );
}

function TextArea({ T, rows = 4, defaultValue, placeholder }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        background: T.surface,
        border: `1px solid ${focus ? T.accent : T.border}`,
        boxShadow: focus ? `0 0 0 3px ${T.accentBg}` : "none",
        borderRadius: 8,
        color: T.t1,
        padding: "10px 12px",
        fontSize: 14,
        outline: "none",
        fontFamily: F.sans,
        width: "100%",
        boxSizing: "border-box",
        resize: "vertical",
        minHeight: 80,
        lineHeight: 1.5,
      }}
    />
  );
}

const NAV_GROUPS = [
  {
    label: "General",
    items: [
      { id: "profile", label: "Public profile", Icon: User },
      { id: "branding", label: "Branding", Icon: Palette },
      { id: "mylink", label: "My link", Icon: ExternalLink },
    ],
  },
  {
    label: "Contact & access",
    items: [
      { id: "phone", label: "Phone number(s)", Icon: SettingsIcon },
      { id: "login", label: "Login & security", Icon: Shield },
      { id: "cookies", label: "Cookie settings", Icon: Bell },
    ],
  },
];

export default function AccountScreen({ T, setTab, isMobile }) {
  const [activeSection, setActiveSection] = useState("profile");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const currentTimeLabel = useMemo(() => {
    void nowTick;
    try {
      return new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch {
      return "—";
    }
  }, [nowTick]);

  const sidebar = (
    <aside
      style={{
        width: isMobile ? "100%" : 260,
        flexShrink: 0,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        background: T.surface,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${T.border}`, background: T.raised }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avi name="EcoAdmin" size={40} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: T.t1, fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>EcoAdmin</div>
            <div style={{ color: T.t3, fontSize: 11, marginTop: 2 }}>Your workspace account</div>
          </div>
        </div>
      </div>
      <nav style={{ padding: "10px 0 12px" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div
              style={{
                padding: "8px 14px 6px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: T.t3,
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const on = activeSection === item.id;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px 8px 10px",
                    margin: "0 8px 2px",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: F.sans,
                    fontSize: 13,
                    fontWeight: on ? 600 : 500,
                    textAlign: "left",
                    color: on ? T.accent : T.t2,
                    background: on ? T.accentBg : "transparent",
                    borderLeft: on ? `3px solid ${T.accent}` : "3px solid transparent",
                    boxSizing: "border-box",
                    transition: "background .12s, color .12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!on) e.currentTarget.style.background = T.hover;
                  }}
                  onMouseLeave={(e) => {
                    if (!on) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ display: "flex", color: on ? T.accent : T.t3 }}>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ padding: "12px 14px 4px", borderTop: `1px solid ${T.borderMuted ?? T.border}`, marginTop: 6 }}>
          <button
            type="button"
            onClick={() => setTab("settings")}
            style={{
              background: "none",
              border: "none",
              padding: "6px 0",
              color: T.accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: F.sans,
            }}
          >
            Developer settings →
          </button>
        </div>
      </nav>
    </aside>
  );

  const sectionTitle = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label ?? "Account";

  const profileMain = (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
        <div>
          <h2 style={{ color: T.t1, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Public profile</h2>
          <p style={{ color: T.t3, fontSize: 13, margin: "6px 0 0", maxWidth: 520 }}>
            This information appears on your profile and across cc-org-dash where your name is shown.
          </p>
        </div>
        <Btn T={T} variant="default" small>
          <ExternalLink size={14} /> View public profile
        </Btn>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              padding: 3,
              background: `linear-gradient(135deg, ${T.accent}, ${T.purple})`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: T.raised,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Avi name="EcoAdmin" size={94} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Btn T={T} variant="default" small>
              <Upload size={14} /> Update
            </Btn>
            <Btn T={T} variant="ghost" small>
              <Trash2 size={14} /> Remove
            </Btn>
          </div>
          <span style={{ color: T.t3, fontSize: 12 }}>PNG or JPG · max 2MB</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <label style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>Name</label>
            <InfoHint T={T} text="Your display name across the workspace." />
          </div>
          <Input T={T} defaultValue="EcoAdmin" />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <label style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>Welcome message</label>
            <InfoHint T={T} text="Shown on your profile and in meeting invites." />
          </div>
          <TextArea
            T={T}
            rows={4}
            defaultValue="Thanks for visiting — I coordinate operations and AI workflows for cc-org-dash. Reach out via Inbox for fastest response."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <Field label="Language" T={T}>
            <Select T={T} style={{ width: "100%" }}>
              <option>English (AU)</option>
              <option>English (US)</option>
            </Select>
          </Field>
          <div />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <Field label="Date format" T={T}>
            <Select T={T} style={{ width: "100%" }}>
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </Select>
          </Field>
          <Field label="Time format" T={T}>
            <Select T={T} style={{ width: "100%" }}>
              <option>24h</option>
              <option>12h am/pm</option>
            </Select>
          </Field>
        </div>

        <Field label="Country" T={T}>
          <Select T={T} style={{ width: "100%" }}>
            <option>Australia</option>
            <option>United States</option>
            <option>United Kingdom</option>
          </Select>
        </Field>

        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <label style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>Time zone</label>
            <InfoHint T={T} text="Used for deadlines, cycles, and notifications." />
          </div>
          <div style={{ color: T.t3, fontSize: 12, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} />
            Current time: <span style={{ fontFamily: F.mono, color: T.t2 }}>{currentTimeLabel}</span>
          </div>
          <Select T={T} style={{ width: "100%", maxWidth: isMobile ? "100%" : 420 }}>
            <option>Australia/Sydney</option>
            <option>America/Chicago</option>
            <option>UTC</option>
          </Select>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 18 }}>
          <div style={{ color: T.t1, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Public email</div>
          <p style={{ color: T.t3, fontSize: 12, margin: "0 0 8px" }}>Choose which verified email is visible on your profile.</p>
          <Select T={T} style={{ width: "100%", maxWidth: 420 }}>
            <option>admin@cc-org-dash.io</option>
            <option>Hide email</option>
          </Select>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <label style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>Bio</label>
            <InfoHint T={T} text="Short description for your profile page." />
          </div>
          <TextArea T={T} rows={3} defaultValue="Administrator · cc-org-dash Global" />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Btn T={T} variant="primary">
            Save changes
          </Btn>
          <Btn T={T} variant="default">
            Cancel
          </Btn>
        </div>
        <Btn T={T} variant="danger" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Btn>
      </div>
    </>
  );

  const brandingPanel = (
    <>
      <h2 style={{ color: T.t1, fontSize: 20, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Branding</h2>
      <p style={{ color: T.t3, fontSize: 13, margin: "0 0 20px", maxWidth: 560 }}>
        Logo and accent colors for reports and shared links (demo).
      </p>
      <Surface T={T} style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ color: T.t2, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Workspace logo</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, border: `1px dashed ${T.border}`, background: T.raised, display: "flex", alignItems: "center", justifyContent: "center", color: T.t3, fontSize: 11 }}>Upload</div>
          <Btn T={T} variant="default" small>
            Choose file
          </Btn>
        </div>
      </Surface>
      <Btn T={T} variant="primary">
        Save branding
      </Btn>
    </>
  );

  const myLinkPanel = (
    <>
      <h2 style={{ color: T.t1, fontSize: 20, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" }}>My link</h2>
      <p style={{ color: T.t3, fontSize: 13, margin: "0 0 20px" }}>Vanity URL for your public scheduling and profile.</p>
      <Field label="Slug" T={T} hint="Lowercase letters, numbers, and hyphens.">
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "6px 10px",
              background: T.raised,
              border: `1px solid ${T.border}`,
              borderRight: "none",
              borderRadius: "6px 0 0 6px",
              fontSize: 13,
              color: T.t3,
              fontFamily: F.mono,
            }}
          >
            cc-org-dash.io/u/
          </span>
          <Input T={T} defaultValue="ecoadmin" style={{ borderRadius: "0 6px 6px 0", flex: 1, minWidth: 120 }} />
        </div>
      </Field>
      <div style={{ marginTop: 20 }}>
        <Btn T={T} variant="primary">
          Save link
        </Btn>
      </div>
    </>
  );

  const phonePanel = (
    <>
      <h2 style={{ color: T.t1, fontSize: 20, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Phone number(s)</h2>
      <p style={{ color: T.t3, fontSize: 13, margin: "0 0 20px" }}>Used for SMS alerts and verified callbacks.</p>
      <Field label="Mobile" T={T}>
        <Input T={T} placeholder="+61 …" />
      </Field>
      <div style={{ marginTop: 16 }}>
        <Btn T={T} variant="primary">
          Save phone
        </Btn>
      </div>
    </>
  );

  const loginPanel = (
    <>
      <h2 style={{ color: T.t1, fontSize: 20, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Login & security</h2>
      <p style={{ color: T.t3, fontSize: 13, margin: "0 0 20px" }}>Password, two-factor authentication, and active sessions.</p>
      {[
        { label: "Two-factor authentication", sub: "Enabled via authenticator app", on: true },
        { label: "Login notifications", sub: "Email when a new device signs in", on: true },
        { label: "Require SSO for this org", sub: "When enabled, password login is disabled", on: false },
      ].map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ color: T.t1, fontSize: 13, fontWeight: 500 }}>{row.label}</div>
            <div style={{ color: T.t3, fontSize: 12, marginTop: 2 }}>{row.sub}</div>
          </div>
          <Toggle T={T} on={row.on} onChange={() => {}} />
        </div>
      ))}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn T={T} variant="default">
          Change password
        </Btn>
        <Btn T={T} variant="ghost">
          View sessions
        </Btn>
      </div>
    </>
  );

  const cookiesPanel = (
    <>
      <h2 style={{ color: T.t1, fontSize: 20, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Cookie settings</h2>
      <p style={{ color: T.t3, fontSize: 13, margin: "0 0 20px" }}>Control optional cookies for analytics and product improvement.</p>
      {[
        { label: "Essential", sub: "Required for sign-in and security. Always on.", locked: true, on: true },
        { label: "Analytics", sub: "Help us understand usage (anonymous).", locked: false, on: true },
        { label: "Marketing", sub: "Personalized tips and release notes.", locked: false, on: false },
      ].map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ color: T.t1, fontSize: 13, fontWeight: 500 }}>
              {row.label}
              {row.locked && (
                <span style={{ marginLeft: 8 }}>
                  <Badge T={T}>Required</Badge>
                </span>
              )}
            </div>
            <div style={{ color: T.t3, fontSize: 12, marginTop: 2 }}>{row.sub}</div>
          </div>
          <Toggle T={T} on={row.on} onChange={() => {}} />
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <Btn T={T} variant="primary">
          Update preferences
        </Btn>
      </div>
    </>
  );

  const mainPanel = () => {
    switch (activeSection) {
      case "profile":
        return profileMain;
      case "branding":
        return brandingPanel;
      case "mylink":
        return myLinkPanel;
      case "phone":
        return phonePanel;
      case "login":
        return loginPanel;
      case "cookies":
        return cookiesPanel;
      default:
        return profileMain;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: isMobile ? 16 : 22 }}>
        <h1 style={{ color: T.t1, fontSize: isMobile ? 22 : 26, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Account settings</h1>
        <p style={{ color: T.t2, fontSize: 14, margin: "8px 0 0" }}>Manage your profile, security, and preferences.</p>
      </div>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 14 : 24, alignItems: "flex-start" }}>
        {sidebar}
        <main style={{ flex: 1, minWidth: 0 }}>
          <Surface T={T} style={{ padding: isMobile ? "18px 16px" : "24px 28px 28px" }}>
            {!isMobile && (
              <div style={{ color: T.t4, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{sectionTitle}</div>
            )}
            {mainPanel()}
          </Surface>
        </main>
      </div>

      <Modal T={T} open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        <p style={{ color: T.t2, fontSize: 14, lineHeight: 1.5, marginTop: 0 }}>
          This will permanently delete your user and personal data in this demo. Type <strong>DELETE</strong> in production to confirm.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn T={T} variant="default" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Btn>
          <Btn T={T} variant="danger" onClick={() => setDeleteOpen(false)}>
            Delete account
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
