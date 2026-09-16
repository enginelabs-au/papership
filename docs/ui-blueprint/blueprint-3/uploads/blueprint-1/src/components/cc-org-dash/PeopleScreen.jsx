import { useState } from "react";
import { Surface, Btn, Badge, Dot, Avi, Table, SlideOver, Modal, Field, Input, Select, SubNav, SectionLabel, F } from "./primitives";
import { DB } from "./data";
import { Users, Shield, Mail, Plus, UserPlus } from "./icons";

export default function PeopleScreen({ T, isMobile }) {
  const [selected, setSelected] = useState(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [subTab, setSubTab] = useState("people");

  const subTabs = [
    { id: "people", label: "People",  icon: <Users size={16} />,    count: DB.people.length },
    { id: "teams",  label: "Teams",   icon: <Shield size={16} />,   count: 4 },
    { id: "invites", label: "Pending invites", icon: <Mail size={16} />, count: 2 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ color: T.t1, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>People</div>
          <div style={{ color: T.t2, fontSize: 13, marginTop: 2 }}>{DB.people.length} members across your organization</div>
        </div>
        <Btn T={T} variant="primary" onClick={() => setInviteModal(true)}><UserPlus size={14} /> Invite member</Btn>
      </div>

      <SubNav T={T} tabs={subTabs} active={subTab} onChange={setSubTab} />

      <div style={{ paddingTop: 20 }}>
        {subTab === "people" && (
          <Table T={T} variant="card" selectedId={selected?.id} onRow={setSelected} rows={DB.people} cols={[
              { key: "name", label: "Name", render: (v) => <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avi name={v} size={28} /><span style={{ fontWeight: 600, color: T.accent }}>{v}</span></div> },
              { key: "role", label: "Role", muted: true },
              { key: "dept", label: "Department", muted: true },
              { key: "email", label: "Email", render: v => <span style={{ color: T.t2, fontFamily: F.mono, fontSize: 12 }}>{v}</span> },
              { key: "status", label: "Status", render: v => <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Dot status={v} T={T} /><span style={{ color: T.t2, fontSize: 12 }}>{v}</span></div> },
            ]} />
        )}

        {subTab === "teams" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
            {[["Engineering", 12, T.accent], ["Sales", 8, T.green], ["Operations", 5, T.amber], ["Design", 3, T.purple]].map(([name, count, color]) => (
              <Surface key={name} T={T} hoverable style={{ padding: 16, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={18} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.accent, fontSize: 14, fontWeight: 600 }}>{name}</div>
                    <div style={{ color: T.t3, fontSize: 12 }}>{count} members</div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        )}

        {subTab === "invites" && (
          <Table T={T} variant="card" rows={[
              { id: 1, email: "alex@company.io", role: "Member", sent: "2 days ago", status: "pending" },
              { id: 2, email: "jamie@company.io", role: "Admin", sent: "5 hours ago", status: "pending" },
            ]} cols={[
              { key: "email", label: "Email", render: v => <span style={{ color: T.accent, fontFamily: F.mono, fontSize: 13 }}>{v}</span> },
              { key: "role", label: "Role", muted: true },
              { key: "sent", label: "Sent", muted: true },
              { key: "status", label: "Status", render: v => <Badge T={T} color={T.amber}>{v}</Badge> },
            ]} />
        )}
      </div>

      <SlideOver T={T} open={!!selected} onClose={() => setSelected(null)} title={selected?.name} subtitle={selected?.role}>
        {selected && (
          <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avi name={selected.name} size={56} />
              <div>
                <div style={{ color: T.t1, fontSize: 16, fontWeight: 600 }}>{selected.name}</div>
                <div style={{ color: T.t3, fontSize: 13 }}>{selected.role}</div>
                <Badge T={T} color={selected.status === "active" ? T.green : T.amber}>{selected.status}</Badge>
              </div>
            </div>
            {[["Department", selected.dept], ["Email", selected.email], ["Status", selected.status]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                <span style={{ color: T.t3 }}>{l}</span><span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div>
              <SectionLabel T={T}>Assigned Issues</SectionLabel>
              {DB.tasks.filter(t => t.assignee === selected.name).map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                  <Dot status={task.status} T={T} />
                  <span style={{ color: T.t1, fontSize: 12, flex: 1 }}>{task.title}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn T={T} small variant="default">Edit</Btn>
              <Btn T={T} small variant="danger">Remove</Btn>
            </div>
          </div>
        )}
      </SlideOver>

      <Modal T={T} open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Member">
        <Field label="Email Address" T={T}><Input T={T} type="email" placeholder="name@company.com" /></Field>
        <Field label="Role" T={T}><Select T={T} style={{ width: "100%" }}><option>Admin</option><option>Member</option><option>Viewer</option></Select></Field>
        <Field label="Department" T={T}><Select T={T} style={{ width: "100%" }}>{["Sales", "Engineering", "Product", "Operations", "Finance", "HR"].map(d => <option key={d}>{d}</option>)}</Select></Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn T={T} variant="default" onClick={() => setInviteModal(false)}>Cancel</Btn>
          <Btn T={T} variant="primary" onClick={() => setInviteModal(false)}>Send Invite</Btn>
        </div>
      </Modal>
    </div>
  );
}