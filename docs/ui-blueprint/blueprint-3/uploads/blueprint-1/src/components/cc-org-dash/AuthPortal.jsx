import { useState } from "react";
import { F, THEMES } from "./primitives";
import {
  User,
  Lock,
  Mail,
  Zap,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  Eye,
  EyeOff,
  Globe,
} from "./icons";

const THEME_ORDER = ["light", "dark", "dimmed"];

/** Google “G” mark — brand colors per Google Sign-In guidelines */
function GoogleGLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Styled like the official Sign in with Google button (white, Roboto Medium, neutral border).
 * Replace onClick with GIS / OAuth when wiring a real client ID.
 */
function GoogleSignInButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 40,
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "0 14px",
        background: "#ffffff",
        border: "1px solid #747775",
        borderRadius: 4,
        cursor: "pointer",
        fontFamily: "'Roboto', system-ui, sans-serif",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: "20px",
        color: "#1f1f1f",
        letterSpacing: "0.25px",
        boxShadow: "0 1px 2px rgba(60, 64, 67, 0.08)",
        transition: "box-shadow 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(60, 64, 67, 0.18)";
        e.currentTarget.style.background = "#f8f9fa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(60, 64, 67, 0.08)";
        e.currentTarget.style.background = "#ffffff";
      }}
    >
      <GoogleGLogo />
      <span>{children}</span>
    </button>
  );
}

function OrDivider({ T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <span style={{ fontSize: 12, color: T.t3, fontWeight: 500 }}>Or</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

function AuthFooter({ T, themeKey, cycleTheme }) {
  const link = { color: T.t3, fontSize: 12, textDecoration: "none", cursor: "pointer" };
  const sep = <span style={{ color: T.border, margin: "0 2px" }}>·</span>;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "14px 20px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderTop: `1px solid ${T.borderMuted ?? T.border}`,
        background: T.nav ?? T.surface,
        fontFamily: F.sans,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        {["Terms", "Privacy", "Docs", "Help"].map((label, i) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {i > 0 && sep}
            <a href="#" onClick={(e) => e.preventDefault()} style={link} onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; }} onMouseLeave={(e) => { e.currentTarget.style.color = T.t3; }}>
              {label}
            </a>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          title="Language"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.t2,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: F.sans,
          }}
        >
          <Globe size={14} />
          <span>English</span>
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          onClick={cycleTheme}
          title="Theme"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.t2,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: F.sans,
          }}
        >
          {themeKey === "dark" ? <Moon size={14} /> : themeKey === "dimmed" ? <Palette size={14} /> : <Sun size={14} />}
          <span>{THEMES[themeKey]?.name ?? "Light"}</span>
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
}

function PasswordField({ T, value, onChange, placeholder = "••••••••" }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.t3, display: "flex", pointerEvents: "none", zIndex: 1 }}>
        <Lock size={16} />
      </span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: T.surface,
          border: `1px solid ${focus ? T.accent : T.border}`,
          boxShadow: focus ? `0 0 0 3px ${T.accentBg}` : "none",
          borderRadius: 10,
          color: T.t1,
          padding: "10px 40px 10px 36px",
          fontSize: 14,
          outline: "none",
          fontFamily: F.sans,
          transition: "all .15s",
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          padding: 6,
          cursor: "pointer",
          color: T.t3,
          display: "flex",
          borderRadius: 6,
        }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AuthPortal({ T, themeKey, setTheme, onSuccess }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("demo@company.co");
  const [password, setPassword] = useState("demo");
  const [remember, setRemember] = useState(true);
  const [firstName, setFirstName] = useState("Alex");
  const [lastName, setLastName] = useState("Rivera");
  const [username, setUsername] = useState("arivera");
  const [signupEmail, setSignupEmail] = useState("alex@company.co");
  const [signupPassword, setSignupPassword] = useState("password123");

  const accent = T.purple ?? T.accent;
  const cycleTheme = () => {
    const i = THEME_ORDER.indexOf(themeKey);
    setTheme(THEME_ORDER[(i + 1) % THEME_ORDER.length]);
  };

  const finishLogin = (payload) => {
    onSuccess({
      email: payload.email,
      name: payload.name || payload.email.split("@")[0] || "Member",
      remember: payload.remember !== undefined ? payload.remember : remember,
    });
  };

  const submitLogin = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    finishLogin({ email: email.trim(), name: "EcoAdmin" });
  };

  const submitSignup = (e) => {
    e.preventDefault();
    if (!signupEmail.trim() || signupPassword.length < 8) return;
    finishLogin({ email: signupEmail.trim(), name: `${firstName} ${lastName}`.trim() || "Member", remember: true });
  };

  const signInWithGoogle = () => {
    finishLogin({ email: "you+google@demo.co", name: "Google User", remember: true });
  };

  const padBottom = 72;

  if (view === "login") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `24px 20px ${padBottom}px`,
          boxSizing: "border-box",
          background: T.pageGradient ?? T.canvas,
          fontFamily: F.sans,
          color: T.t1,
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: T.purpleBg ?? `${accent}18`,
              border: `1px solid ${T.purpleBorder ?? T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              color: accent,
            }}
          >
            <Zap size={26} strokeWidth={1.75} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 22px", textAlign: "center", color: T.t1 }}>
            Log in to cc-org-dash
          </h1>

          <div
            style={{
              position: "relative",
              width: "100%",
              borderRadius: 16,
              border: `1px solid ${T.border}`,
              background: T.surface,
              boxShadow: T.shadowLg ?? T.shadowMd,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "28px 26px 26px", position: "relative", zIndex: 1 }}>
              <GoogleSignInButton onClick={signInWithGoogle}>Sign in with Google</GoogleSignInButton>
              <OrDivider T={T} />

              <form onSubmit={submitLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: T.t1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Username or email</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.t3, display: "flex", pointerEvents: "none" }}>
                      <User size={16} />
                    </span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.co"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        color: T.t1,
                        padding: "10px 12px 10px 36px",
                        fontSize: 14,
                        outline: "none",
                        fontFamily: F.sans,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = T.accent;
                        e.target.style.boxShadow = `0 0 0 3px ${T.accentBg}`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = T.border;
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ color: T.t1, fontSize: 13, fontWeight: 600 }}>Password</label>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      style={{ fontSize: 12, fontWeight: 500, color: accent, textDecoration: "none" }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <PasswordField T={T} value={password} onChange={setPassword} />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 15, height: 15, accentColor: accent }} />
                  <span style={{ fontSize: 13, color: T.t2 }}>Remember me</span>
                </label>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: accent,
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: F.sans,
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  Log in
                </button>
              </form>

              <p style={{ textAlign: "center", margin: "20px 0 0", fontSize: 13, color: T.t2 }}>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("signup")}
                  style={{ background: "none", border: "none", padding: 0, color: accent, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}
                >
                  Sign up
                </button>
              </p>
            </div>
            <div
              aria-hidden
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "38%",
                backgroundImage: `radial-gradient(${T.border} 1px, transparent 1px)`,
                backgroundSize: "14px 14px",
                opacity: 0.28,
                pointerEvents: "none",
                borderRadius: "0 0 15px 15px",
              }}
            />
          </div>
        </div>

        <AuthFooter T={T} themeKey={themeKey} cycleTheme={cycleTheme} />
      </div>
    );
  }

  /* Sign up — single column (trial / marketing column removed) */
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `24px 20px ${padBottom}px`,
        boxSizing: "border-box",
        background: T.pageGradient ?? T.canvas,
        fontFamily: F.sans,
        color: T.t1,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: T.purpleBg ?? `${accent}18`,
            border: `1px solid ${T.purpleBorder ?? T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            color: accent,
          }}
        >
          <Zap size={26} strokeWidth={1.75} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 22px", textAlign: "center", color: T.t1 }}>
          Create your account
        </h1>

        <div
          style={{
            width: "100%",
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            background: T.surface,
            boxShadow: T.shadowLg ?? T.shadowMd,
            padding: "28px 26px 24px",
          }}
        >
          <GoogleSignInButton onClick={signInWithGoogle}>Sign up with Google</GoogleSignInButton>
          <OrDivider T={T} />

          <form onSubmit={submitSignup}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 6 }}>First name</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.t3 }}>
                    <User size={15} />
                  </span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "9px 10px 9px 32px",
                      fontSize: 14,
                      background: T.surface,
                      color: T.t1,
                      fontFamily: F.sans,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 6 }}>Last name</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.t3 }}>
                    <User size={15} />
                  </span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "9px 10px 9px 32px",
                      fontSize: 14,
                      background: T.surface,
                      color: T.t1,
                      fontFamily: F.sans,
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 6 }}>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 14,
                  background: T.surface,
                  color: T.t1,
                  fontFamily: F.sans,
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 6 }}>Email</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.t3 }}>
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "9px 10px 9px 32px",
                    fontSize: 14,
                    background: T.surface,
                    color: T.t1,
                    fontFamily: F.sans,
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 6 }}>Password</label>
              <PasswordField T={T} value={signupPassword} onChange={setSignupPassword} />
              <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>Minimum length is 8 characters.</div>
            </div>

            <p style={{ fontSize: 11, color: T.t3, lineHeight: 1.45, margin: "0 0 16px" }}>
              By signing up you agree to our Terms and acknowledge our Privacy Policy. We may send product updates; you can unsubscribe anytime.
            </p>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: accent,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: F.sans,
                marginBottom: 16,
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.22)",
              }}
            >
              Sign up
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: T.t2, margin: 0 }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setView("login")}
              style={{ background: "none", border: "none", padding: 0, color: accent, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}
            >
              Log in
            </button>
          </p>
        </div>
      </div>

      <AuthFooter T={T} themeKey={themeKey} cycleTheme={cycleTheme} />
    </div>
  );
}
