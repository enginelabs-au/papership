import { useState } from "react";
import { Btn, SlideOver } from "./primitives";
import { DB } from "./data";

export default function NotifDrawer({ T, onClose }) {
  const [notes, setNotes] = useState(DB.notifications);
  const sc = { high: T.red, medium: T.amber, low: T.t3 };
  const unread = notes.filter(n => !n.read).length;
  return (
    <SlideOver T={T} open title="Notifications" subtitle={unread > 0 ? `${unread} unread` : undefined} onClose={onClose} width={360}>
      <div style={{ padding: "10px 0" }}>
        <div style={{ padding: "0 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {unread > 0 && <Btn T={T} small variant="default" onClick={() => setNotes(p => p.map(n => ({ ...n, read: true })))}>Mark all read</Btn>}
        </div>
        {notes.map((n) => (
          <div key={n.id} onClick={() => setNotes(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
            style={{ padding: "13px 18px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", opacity: n.read ? 0.6 : 1, background: n.read ? "transparent" : T.raised, transition: "all .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.hover}
            onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : T.raised}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc[n.sev], flexShrink: 0, marginTop: 5, display: "inline-block" }} />
              <div>
                <div style={{ color: T.t1, fontSize: 13, fontWeight: n.read ? 400 : 600, marginBottom: 3 }}>{n.title}</div>
                <div style={{ color: T.t2, fontSize: 12, marginBottom: 3, lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ color: T.t3, fontSize: 11 }}>{n.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SlideOver>
  );
}