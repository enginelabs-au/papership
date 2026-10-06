// Papership fixtures — Phase 2 loop, blueprint plans. No prices (CA-10).
export const spark = (n = 14) => Array.from({ length: n }, () => Math.random() * 60 + 20);

export const DB = {
  stats: [
    { id: "loop",   label: "Loop runs (7d)",     value: "0",      delta: "first-baseline", up: true,  color: "#2563eb" },
    { id: "grants", label: "Active grants",      value: "12",     delta: "founder seat",   up: true,  color: "#1a7f37" },
    { id: "prs",    label: "Open PRs",           value: "0",      delta: "App wired",      up: true,  color: "#5b21b6" },
    { id: "health", label: "Hermes pin",         value: "v0.21.1", delta: "health only",   up: true,  color: "#8250df" },
  ],
  activity: [
    { id: "a1", user: "Cam D.",      action: "Accepted D-14 — user-owned data, anonymous usage only", time: "2m ago",  type: "sys", dot: "#5b21b6" },
    { id: "a2", user: "Hey Papership",  action: "Ready for governed sessions after T2-1 interception",  time: "8m ago",  type: "ai",  dot: "#8250df" },
    { id: "a3", user: "GitHub App",  action: "Install ping reachable on Papership-only scope",           time: "14m ago", type: "dev", dot: "#2563eb" },
    { id: "a4", user: "System",      action: "Usage emit on — identifier/enum payloads only",        time: "1h ago",  type: "sys", dot: "#6e7781" },
    { id: "a5", user: "Cam D.",      action: "Pinned Hermes v0.21.1 for commercial self-host",      time: "2h ago",  type: "dev", dot: "#1a7f37" },
    { id: "a6", user: "Worker",      action: "Side-effecting toolsets remain disabled (AUTH-25)",    time: "3h ago",  type: "ai",  dot: "#d1242f" },
  ],
  projects: [
    { id: "p1", name: "T2-1 Interception spike", dept: "Security",    status: "planning", progress: 8,  owner: "Cam Douglas", due: "Sep 18", priority: "high" },
    { id: "p2", name: "T2-2 Hermes adapter",     dept: "Runtime",     status: "planning", progress: 5,  owner: "Cam Douglas", due: "Sep 22", priority: "high" },
    { id: "p3", name: "T2-3 GitHub binding",     dept: "Source",      status: "on_track", progress: 40, owner: "Cam Douglas", due: "Sep 20", priority: "high" },
    { id: "p4", name: "T2-6 Hey Papership",         dept: "Assistant",   status: "planning", progress: 12, owner: "Cam Douglas", due: "Sep 26", priority: "medium" },
    { id: "p5", name: "Phase 1 substrate",       dept: "Foundation",  status: "on_track", progress: 95, owner: "Cam Douglas", due: "Sep 11", priority: "medium" },
    { id: "p6", name: "R1 demo loop",            dept: "Delivery",    status: "planning", progress: 0,  owner: "Cam Douglas", due: "Oct 2",  priority: "low" },
  ],
  tasks: [
    { id: "t1", issueKey: "ORG-1", title: "Run SP-1…SP-7 interception spike",     project: "T2-1 Interception spike", assignee: "Cam Douglas", priority: "high",   status: "todo",        due: "Sep 18", labels: ["Security", "Gate"] },
    { id: "t2", issueKey: "ORG-2", title: "Security re-review after spike",        project: "T2-1 Interception spike", assignee: "Cam Douglas", priority: "high",   status: "todo",        due: "Sep 19", labels: ["Security"] },
    { id: "t3", issueKey: "ORG-3", title: "Pin Hermes image + adapter ops",        project: "T2-2 Hermes adapter",     assignee: "Cam Douglas", priority: "high",   status: "todo",        due: "Sep 22", labels: ["Runtime"] },
    { id: "t4", issueKey: "ORG-4", title: "Open first loop PR via GitHub App",     project: "T2-3 GitHub binding",     assignee: "Cam Douglas", priority: "high",   status: "in_progress", due: "Sep 20", labels: ["GitHub"] },
    { id: "t5", issueKey: "ORG-5", title: "Wire Hey Papership to API sessions",       project: "T2-6 Hey Papership",         assignee: "Hey Papership",  priority: "medium", status: "todo",        due: "Sep 26", labels: ["Assistant"] },
    { id: "t6", issueKey: "ORG-6", title: "Ledger transitions for loop stages",    project: "R1 demo loop",            assignee: "Cam Douglas", priority: "medium", status: "todo",        due: "Sep 28", labels: ["Ledger"] },
    { id: "t7", issueKey: "ORG-7", title: "Record D-11 Hermes / OpenRouter terms", project: "Phase 1 substrate",       assignee: "Cam Douglas", priority: "low",    status: "done",        due: "Sep 11", labels: ["Decision"] },
    { id: "t8", issueKey: "ORG-8", title: "Prism brand tokens + transparent icon", project: "Phase 1 substrate",       assignee: "Cam Douglas", priority: "medium", status: "review",      due: "Sep 11", labels: ["Brand"] },
    { id: "t9", issueKey: "ORG-9", title: "Keep Engine Labs marketing site separate", project: "Phase 1 substrate",   assignee: "Cam Douglas", priority: "high",   status: "done",        due: "Sep 10", labels: ["Identity"] },
  ],
  people: [
    { id: "u1", name: "Cam Douglas", role: "Founder",           dept: "Engine Labs", status: "active", email: "founder@enginelabs.com.au" },
    { id: "u2", name: "Hey Papership",  role: "Company assistant", dept: "Assistant",   status: "active", email: "hey@papership.local" },
    { id: "u3", name: "Loop runner", role: "Worker principal",  dept: "Runtime",     status: "away",   email: "loop@papership.local" },
  ],
  agents: [
    { id: "ag1", name: "Hey Papership",    role: "Company assistant — API-mediated Hermes", status: "idle",   model: "via Hermes", calls: 0 },
    { id: "ag2", name: "Loop runner",   role: "Governed change loop",                     status: "paused", model: "via Hermes", calls: 0 },
    { id: "ag3", name: "Reviewer",      role: "PR review evidence",                       status: "paused", model: "via Hermes", calls: 0 },
    { id: "ag4", name: "Researcher",    role: "Blueprint and plan research",              status: "paused", model: "via Hermes", calls: 0 },
    { id: "ag5", name: "Usage ledger",  role: "Anonymous usage events only",              status: "online", model: "first-party", calls: 0 },
  ],
  integrations: [
    { id: "i1",  name: "Hermes",           cat: "Runtime",        status: "connected", logo: "◇", users: 1, synced: "health" },
    { id: "i2",  name: "GitHub App",       cat: "Source",         status: "connected", logo: "⌥", users: 1, synced: "Papership only" },
    { id: "i3",  name: "Vercel Papership",     cat: "Hosting",        status: "connected", logo: "▲", users: 1, synced: "live" },
    { id: "i4",  name: "OpenRouter",       cat: "Models",         status: "connected", logo: "◎", users: 1, synced: "via Hermes" },
    { id: "i5",  name: "Supabase",         cat: "Identity",       status: "degraded",  logo: "⬡", users: 1, synced: "planned" },
    { id: "i6",  name: "Usage emit",       cat: "Measurement",    status: "connected", logo: "▣", users: 1, synced: "anonymous" },
  ],
  notifications: [
    { id: "n1", sev: "high",   title: "T2-1 not started",              body: "Interception spike is the first Phase 2 task. Side-effect tools stay off.", time: "3m ago", read: false },
    { id: "n2", sev: "medium", title: "GitHub App health reachable",   body: "Install scoped to this repo. PR open is dry-run until you confirm.",       time: "1h ago", read: false },
    { id: "n3", sev: "low",    title: "Hermes pin v0.21.1",            body: "Tunnel health only. No customer content on the probe.",                   time: "2h ago", read: false },
    { id: "n4", sev: "low",    title: "D-14 recorded",                 body: "Papership does not own user content. Anonymous usage only.",                  time: "4h ago", read: true },
    { id: "n5", sev: "medium", title: "Marketing site is separate",    body: "enginelabs-au-site must not be edited from this workstream.",             time: "5h ago", read: true },
  ],
  chats: {
    ag1: [
      { role: "assistant", name: "Hey Papership", content: "Good morning. Phase 2 is active. I can plan work against the ledger once T2-1 passes. I will not call Hermes tools that write until Security re-review.", time: "09:00" },
      { role: "user",      name: "You",        content: "What is the first loop task?", time: "09:02" },
      { role: "assistant", name: "Hey Papership", content: "T2-1: interception spike SP-1…SP-7. Then Security re-review. Only after that can side-effecting toolsets turn on. GitHub PR plan/open is already wired on the API with dry-run default.", time: "09:02" },
    ],
    ag2: [
      { role: "assistant", name: "Loop runner", content: "Paused. Worker refuses to start if a side-effecting toolset is enabled without the interception artefact (AUTH-25).", time: "08:30" },
      { role: "user",      name: "You",         content: "When do we run a live loop?", time: "10:00" },
      { role: "assistant", name: "Loop runner", content: "After T2-1 PASS, adapter pin, and a dry-run PR you accept. Isolated branch, checks, review evidence, release proposal only.", time: "10:01" },
    ],
    ag3: [{ role: "assistant", name: "Reviewer",     content: "No open PRs from the App yet. First live open is opt-in (dry_run=false + reauth).", time: "09:45" }],
    ag4: [{ role: "assistant", name: "Researcher",   content: "Sources: docs/blueprints/2026-09-10_engine_labs.md, phase_2_development_loop_plan.md, D-10…D-14.", time: "Now" }],
    ag5: [{ role: "assistant", name: "Usage ledger", content: "Emit is on. Payloads are identifier/enum only. No prices. Thresholds without data are labelled first-baseline.", time: "Yesterday" }],
  },
};

export const INBOX_THREADS = [
  {
    id: "th-ag1",
    agentId: "ag1",
    projectId: "p4",
    ticketId: "#ORG-HE",
    subject: "Hey Papership — session wiring",
    status: "open",
    priority: "high",
    channel: "web",
    project: "T2-6 Hey Papership",
    assignee: "Cam Douglas",
    requester: "Founder",
    unread: 2,
    updated: "2m ago",
  },
  {
    id: "th-ag2",
    agentId: "ag2",
    projectId: "p1",
    ticketId: "#ORG-SP",
    subject: "Interception spike — start T2-1",
    status: "open",
    priority: "urgent",
    channel: "web",
    project: "T2-1 Interception spike",
    assignee: "Cam Douglas",
    requester: "Phase 2 plan",
    unread: 0,
    updated: "14m ago",
  },
  {
    id: "th-ag3",
    agentId: "ag3",
    projectId: "p3",
    ticketId: "#ORG-PR",
    subject: "GitHub App — first loop PR",
    status: "pending",
    priority: "high",
    channel: "web",
    project: "T2-3 GitHub binding",
    assignee: "Cam Douglas",
    requester: "GitHub",
    unread: 1,
    updated: "1h ago",
  },
  {
    id: "th-ag4",
    agentId: "ag4",
    projectId: "p2",
    ticketId: "#ORG-HM",
    subject: "Hermes pin and adapter ops",
    status: "open",
    priority: "normal",
    channel: "web",
    project: "T2-2 Hermes adapter",
    assignee: "Cam Douglas",
    requester: "Runtime",
    unread: 0,
    updated: "Now",
  },
  {
    id: "th-ag5",
    agentId: "ag5",
    projectId: "p5",
    ticketId: "#ORG-US",
    subject: "Anonymous usage emit",
    status: "on_hold",
    priority: "low",
    channel: "web",
    project: "Phase 1 substrate",
    assignee: "Cam Douglas",
    requester: "Growth",
    unread: 0,
    updated: "Yesterday",
  },
];

export const INBOX_WORKSPACES = [
  { id: "all", label: "All workspaces" },
  { id: "p1", label: "Interception" },
  { id: "p2", label: "Hermes" },
  { id: "p3", label: "GitHub" },
  { id: "p4", label: "Hey Papership" },
  { id: "p5", label: "Foundation" },
];

export const GLOBAL_COMMAND = {
  signals: {
    critical: [
      { id: "s1", title: "T2-1 interception not started", owner: "Security", age: "now" },
    ],
    attention: [
      { id: "s3", title: "Hermes tools still disabled", owner: "Runtime", age: "1h" },
      { id: "s4", title: "PR open is dry-run default", owner: "Source", age: "2h" },
      { id: "s5", title: "Supabase JWT still local-dev", owner: "Identity", age: "3h" },
    ],
    fyiCount: 4,
  },
  initiatives: [
    { id: "ini1", title: "Phase 2 development loop", health: "amber", owner: "Cam D.", window: "R1", summary: "Start at T2-1. Do not enable Hermes writes until Security re-review." },
    { id: "ini2", title: "GitHub App binding", health: "green", owner: "Cam D.", window: "Sep", summary: "Health reachable. Plan/open wired. Scoped to Papership." },
    { id: "ini3", title: "User-owned data (D-14)", health: "green", owner: "Cam D.", window: "Standing", summary: "No content ownership. Anonymous usage only." },
    { id: "ini4", title: "Product vs company site", health: "green", owner: "Cam D.", window: "Standing", summary: "Papership is the product. enginelabs.com.au stays separate." },
  ],
  objectives: [
    { id: "kr1", title: "Intercept Hermes side effects", progress: 8, period: "Phase 2", dept: "Security", detail: "SP-1…SP-7 then Security re-review before any write toolset." },
    { id: "kr2", title: "Bound repo loop", progress: 40, period: "Phase 2", dept: "Source", detail: "App installed on this repo; first live PR is opt-in." },
    { id: "kr3", title: "Hey Papership via API", progress: 12, period: "Phase 2", dept: "Assistant", detail: "No browser-to-Hermes. User-equivalent actions only." },
  ],
  milestones: [
    { id: "ms1", title: "T2-1 spike complete", date: "Sep 18", risk: "medium", detail: "Artefact + hash required before worker allows toolsets." },
    { id: "ms2", title: "First dry-run PR", date: "Sep 20", risk: "low", detail: "POST /github/pulls dry_run=true already available." },
    { id: "ms3", title: "R1 demo (ACC-6…9)", date: "Oct 2", risk: "medium", detail: "Isolated change, checks, review, release proposal." },
  ],
  blockers: [
    { id: "bl1", title: "Side-effect tools gated on T2-1", impact: "high", team: "Runtime", detail: "AUTH-25: worker refuses start without interception evidence." },
  ],
  notes: [
    { id: "pn1", title: "Phase 2 plan", preview: "docs/plans/phase_2_development_loop_plan.md", updated: "Today" },
    { id: "pn2", title: "Blueprint", preview: "docs/blueprints/2026-09-10_engine_labs.md", updated: "Sep 10" },
  ],
};

export const FILE_FOLDERS = [
  { id: "root",     label: "All Files",  icon: "🗂" },
  { id: "projects", label: "Plans",      icon: "📁" },
  { id: "reports",  label: "Decisions",  icon: "📊" },
  { id: "ai",       label: "Loop notes", icon: "◈" },
  { id: "legal",    label: "Handover",   icon: "⚖" },
  { id: "shared",   label: "Shared",     icon: "👥" },
  { id: "starred",  label: "Starred",    icon: "★" },
  { id: "trash",    label: "Trash",      icon: "🗑" },
];

export const FILE_DATA = {
  root: [
    { id: "f1", name: "phase_2_development_loop_plan.md", type: "document",    size: "18 KB",  modified: "Sep 11, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f2", name: "2026-09-10_engine_labs.md",        type: "document",    size: "64 KB",  modified: "Sep 10, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f3", name: "phase_1_foundation_plan.md",       type: "document",    size: "42 KB",  modified: "Sep 11, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f4", name: "D-14 user-owned data.md",          type: "document",    size: "4 KB",   modified: "Sep 11, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f5", name: "github-app-and-model-key.md",      type: "document",    size: "6 KB",   modified: "Sep 11, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f6", name: "phase-1-handoff.md",               type: "pdf",         size: "28 KB",  modified: "Sep 11, 2026", owner: "Project Lead", shared: 1 },
    { id: "f7", name: "papership-icon.png",                   type: "image",       size: "86 KB",  modified: "Sep 12, 2026", owner: "Cam Douglas", shared: 0 },
    { id: "f8", name: "architecture.md",                  type: "document",    size: "22 KB",  modified: "Sep 10, 2026", owner: "Cam Douglas", shared: 1 },
  ],
  projects: [
    { id: "f9",  name: "phase_0_foundations_plan.md", type: "document",    size: "16 KB", modified: "Sep 10, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f10", name: "workstream-manifest.md",      type: "document",    size: "8 KB",  modified: "Sep 10, 2026", owner: "Cam Douglas", shared: 1 },
  ],
  reports: [
    { id: "f11", name: "D-10 product identity.md", type: "document",    size: "3 KB", modified: "Sep 10, 2026", owner: "Cam Douglas", shared: 1 },
    { id: "f12", name: "D-13 prism brand.md",      type: "document",    size: "3 KB", modified: "Sep 11, 2026", owner: "Cam Douglas", shared: 1 },
  ],
  ai: [
    { id: "f13", name: "loop-receipt.planned.json", type: "code", size: "2 KB", modified: "Sep 11, 2026", owner: "GitHub App", shared: 0 },
    { id: "f14", name: "hermes-health.txt",         type: "code", size: "1 KB", modified: "Sep 11, 2026", owner: "API",        shared: 0 },
  ],
  legal: [
    { id: "f15", name: "phase-2-owner-actions.md", type: "document", size: "3 KB", modified: "Sep 11, 2026", owner: "Cam Douglas", shared: 1 },
  ],
  shared: [],
  trash: [],
};

export const FILE_ICONS = { pdf: "📄", document: "📝", spreadsheet: "📊", image: "🖼", archive: "📦", code: "{ }", video: "🎬", default: "📄" };

export const WORKFLOW_PRESETS = [
  {
    id: "w1",
    name: "Development loop",
    status: "inactive",
    summary: "Request → PR",
    nodes: [
      { id: "n1", x: 30, y: 100, type: "trigger", label: "Founder request", sub: "Hey Papership or Work", color: "#2563eb" },
      { id: "n2", x: 210, y: 40, type: "filter", label: "Grant check", sub: "AUTH-12 intersection", color: "#9a6700" },
      { id: "n3", x: 210, y: 170, type: "action", label: "Ledger plan", sub: "Stage timestamps", color: "#6e7781" },
      { id: "n4", x: 390, y: 40, type: "ai", label: "Hermes (gated)", sub: "After T2-1", color: "#8250df" },
      { id: "n5", x: 390, y: 170, type: "action", label: "Isolated branch", sub: "GitHub App", color: "#2563eb" },
      { id: "n6", x: 570, y: 40, type: "action", label: "Checks + review", sub: "Evidence", color: "#1a7f37" },
      { id: "n7", x: 570, y: 170, type: "action", label: "Release proposal", sub: "No execute", color: "#1a7f37" },
      { id: "n8", x: 740, y: 105, type: "end", label: "Owner gate", sub: "G2", color: "#374151" },
    ],
    edges: [
      { f: "n1", t: "n2" }, { f: "n1", t: "n3" },
      { f: "n2", t: "n4" }, { f: "n2", t: "n5" },
      { f: "n4", t: "n6" }, { f: "n5", t: "n7" },
      { f: "n6", t: "n8" }, { f: "n7", t: "n8" },
    ],
  },
  {
    id: "w2",
    name: "Usage emit",
    status: "active",
    summary: "Event → store",
    nodes: [
      { id: "r1", x: 40, y: 110, type: "trigger", label: "In-app event", sub: "Identifier / enum", color: "#2563eb" },
      { id: "r2", x: 240, y: 110, type: "action", label: "Validate payload", sub: "No secrets", color: "#0969da" },
      { id: "r3", x: 440, y: 110, type: "filter", label: "Emit flag", sub: "ENGINE_USAGE_EMIT", color: "#9a6700" },
      { id: "r4", x: 640, y: 110, type: "action", label: "Tenant store", sub: "Anonymous only", color: "#1a7f37" },
    ],
    edges: [{ f: "r1", t: "r2" }, { f: "r2", t: "r3" }, { f: "r3", t: "r4" }],
  },
  {
    id: "w3",
    name: "Founder seat",
    status: "active",
    summary: "Sign-in → grants",
    nodes: [
      { id: "u1", x: 30, y: 110, type: "trigger", label: "Sign-in", sub: "JWT 15m", color: "#2563eb" },
      { id: "u2", x: 200, y: 110, type: "action", label: "Principal", sub: "principal-founder", color: "#0969da" },
      { id: "u3", x: 370, y: 110, type: "filter", label: "Grant version", sub: "Mismatch = 401", color: "#9a6700" },
      { id: "u4", x: 540, y: 50, type: "action", label: "org.admin", sub: "Founder seat", color: "#1a7f37" },
      { id: "u5", x: 540, y: 170, type: "action", label: "Unpriv denied", sub: "No bypass", color: "#e11d48" },
      { id: "u6", x: 710, y: 110, type: "end", label: "Effective grants", sub: "Intersection", color: "#374151" },
    ],
    edges: [
      { f: "u1", t: "u2" }, { f: "u2", t: "u3" },
      { f: "u3", t: "u4" }, { f: "u3", t: "u5" },
      { f: "u4", t: "u6" }, { f: "u5", t: "u6" },
    ],
  },
];

export const ROADMAP_QUARTERS = [
  {
    id: "q2",
    label: "Phase 2",
    items: [
      { id: "rm1", title: "Interception + Hermes pin", icon: "◇", status: "planned", avatars: ["Cam D."] },
      { id: "rm2", title: "GitHub loop + Hey Papership", icon: "⌥", status: "active", avatars: ["Cam D."] },
    ],
  },
  {
    id: "q3",
    label: "Phase 3",
    items: [
      { id: "rm3", title: "Verify and package", icon: "▣", status: "planned", avatars: ["Cam D."] },
      { id: "rm4", title: "R1 demo ACC-6…9", icon: "◈", status: "planned", avatars: ["Cam D."] },
    ],
  },
  {
    id: "up",
    label: "Later",
    items: [
      { id: "rm5", title: "More connectors (not this phase)", icon: "◎", status: "idea", avatars: ["Cam D."] },
    ],
  },
];

export const ACTIVE_CYCLE = {
  name: "Phase 2 loop",
  range: "Sep 11 — Oct 2, 2026",
  pctDone: 12,
  effortTotal: 80,
  effortDone: 10,
  weekdaysLeft: 15,
  burndownHint: "T2-1 is the critical path. GitHub client is ahead of the spike.",
  members: [
    { name: "Cam D.", pct: 20, of: 80 },
    { name: "Hey Papership", pct: 0, of: 20 },
    { name: "Loop runner", pct: 0, of: 20 },
  ],
};
