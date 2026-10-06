import { useEffect, useRef, useState } from "react";
import { Badge, Btn, F, useEscape, useFocusTrap, type Theme } from "@engine-labs/ui";
import { apiConfigured, apiFetch, plainError } from "../api/client";

const MODES = ["Ask", "Analyse", "Plan", "Draft", "Execute", "Review", "Automate"] as const;

type Message = { id?: string; role: string; content: string };

/**
 * Backend-mediated assistant. Never invents a model reply.
 */
export function AssistantPanel({
  T,
  open,
  onClose,
  topOffsetPx = 116,
}: {
  T: Theme;
  open: boolean;
  onClose: () => void;
  topOffsetPx?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Opening…");
  const [busy, setBusy] = useState(false);
  useFocusTrap(panelRef, open);
  useEscape(onClose, open);

  useEffect(() => {
    if (!open) return;
    if (!apiConfigured()) {
      setStatus("The API address is not configured.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const created = await apiFetch<{ id: string }>("/assistant/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Hey Papership", mode: "Ask" }),
        });
        if (cancelled) return;
        setSessionId(created.id);
        const detail = await apiFetch<{ messages?: Message[] }>(`/assistant/sessions/${created.id}`);
        if (cancelled) return;
        setMessages(detail.messages ?? []);
        setStatus("Messages are saved in Papership. Hermes runs only when its API server is up.");
      } catch (err) {
        if (!cancelled) setStatus(plainError(err instanceof Error ? err.message : "Could not open a session."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const send = async () => {
    const text = draft.trim();
    if (!text || !sessionId || busy) return;
    setBusy(true);
    try {
      const turn = await apiFetch<{ user: Message; reply: Message }>("/assistant/sessions/" + sessionId + "/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      setMessages((prev) => [...prev, turn.user, turn.reply]);
      setDraft("");
    } catch (err) {
      setStatus(plainError(err instanceof Error ? err.message : "Could not send."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Assistant"
      tabIndex={-1}
      style={{
        position: "fixed",
        top: topOffsetPx,
        right: 0,
        width: 420,
        maxWidth: "100vw",
        height: `calc(100vh - ${topOffsetPx}px)`,
        background: T.surface,
        borderLeft: `1px solid ${T.border}`,
        boxShadow: T.shadowLg,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        fontFamily: F.sans,
        outline: "none",
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ color: T.t1, fontSize: 14 }}>Hey Papership</strong>
        <Btn T={T} variant="ghost" small onClick={onClose}>
          Close
        </Btn>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 12 }}>
        {MODES.map((mode) => (
          <Badge key={mode} T={T} color={mode === "Automate" ? T.t3 : undefined}>
            {mode === "Automate" ? "Automate · later" : mode}
          </Badge>
        ))}
      </div>
      <div style={{ padding: "0 12px 8px", display: "flex", gap: 8, alignItems: "center" }}>
        <Badge T={T} color={T.accent}>
          Scope: organisation
        </Badge>
      </div>
      <div style={{ padding: "0 12px 12px", color: T.t2, fontSize: 12 }}>
        {status} Closing this panel does not cancel cloud work.
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg) => (
          <div
            key={msg.id || msg.content}
            style={{
              padding: 10,
              borderRadius: 10,
              background: msg.role === "user" ? T.accentBg : T.raised,
              color: T.t1,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontSize: 11, color: T.t3 }}>{msg.role}</strong>
            <div>{msg.content}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input
          aria-label="Ask Hey Papership"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="What would you like to do?"
          style={{
            flex: 1,
            minHeight: 36,
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.canvas,
            color: T.t1,
            padding: "0 10px",
            fontFamily: F.sans,
          }}
        />
        <Btn T={T} variant="primary" small onClick={() => void send()} disabled={busy || !sessionId}>
          Send
        </Btn>
      </div>
    </aside>
  );
}
