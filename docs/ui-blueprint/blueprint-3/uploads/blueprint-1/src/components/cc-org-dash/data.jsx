// Stub data for cc-org-dash demo
export const spark = (n = 14) => Array.from({ length: n }, () => Math.random() * 60 + 20);

export const DB = {
  stats: [
    { id: "rev",   label: "Monthly Revenue",  value: "$284,320", delta: "+12.4%", up: true,  color: "#1a7f37" },
    { id: "users", label: "Active Users",      value: "4,821",    delta: "+8.1%",  up: true,  color: "#0969da" },
    { id: "tasks", label: "Open Tasks",        value: "143",      delta: "-3.2%",  up: false, color: "#9a6700" },
    { id: "health",label: "System Health",     value: "99.7%",    delta: "stable", up: true,  color: "#8250df" },
  ],
  activity: [
    { id: "a1", user: "Sarah M.",  action: "Closed deal — Acme Corp",                  time: "2m ago",  type: "crm", dot: "#1a7f37" },
    { id: "a2", user: "AI Agent",  action: "Generated Q2 forecast report",             time: "8m ago",  type: "ai",  dot: "#8250df" },
    { id: "a3", user: "James K.",  action: "Deployed v2.4.1 to production",            time: "14m ago", type: "dev", dot: "#0969da" },
    { id: "a4", user: "System",    action: "Backup completed — 3.2GB",                 time: "1h ago",  type: "sys", dot: "#6e7781" },
    { id: "a5", user: "Priya S.",  action: "Onboarded TerraForm Solutions",            time: "2h ago",  type: "crm", dot: "#1a7f37" },
    { id: "a6", user: "AI Agent",  action: "Flagged anomaly in sensor stream",         time: "3h ago",  type: "ai",  dot: "#d1242f" },
  ],
  projects: [
    { id: "p1", name: "Q2 Growth Initiative", dept: "Sales",       status: "on_track", progress: 68, owner: "Sarah M.", due: "Jun 30", priority: "high" },
    { id: "p2", name: "Platform Redesign",    dept: "Product",     status: "at_risk",  progress: 42, owner: "James K.", due: "May 15", priority: "high" },
    { id: "p3", name: "Data Pipeline v3",     dept: "Engineering", status: "on_track", progress: 81, owner: "Priya S.", due: "Apr 30", priority: "medium" },
    { id: "p4", name: "EMEA Expansion",       dept: "Operations",  status: "planning", progress: 15, owner: "Marco R.", due: "Dec 1",  priority: "medium" },
    { id: "p5", name: "ISO 27001 Audit",      dept: "Security",    status: "on_track", progress: 95, owner: "Admin",    due: "Apr 22", priority: "high" },
    { id: "p6", name: "Partner API v2",       dept: "Engineering", status: "on_track", progress: 60, owner: "Priya S.", due: "May 28", priority: "low" },
  ],
  tasks: [
    { id: "t1", issueKey: "CCO-241", title: "Review Q2 pipeline forecast",  project: "Q2 Growth Initiative", assignee: "Sarah M.", priority: "high",   status: "todo",        due: "Apr 22", labels: ["Growth", "Forecast"] },
    { id: "t2", issueKey: "CCO-242", title: "Resolve auth service latency", project: "Platform Redesign",    assignee: "James K.", priority: "high",   status: "in_progress", due: "Apr 20", labels: ["Bug", "Platform"] },
    { id: "t3", issueKey: "CCO-243", title: "Deploy Kafka consumer v3",     project: "Data Pipeline v3",     assignee: "Priya S.", priority: "medium", status: "in_progress", due: "Apr 25", labels: ["Infra"] },
    { id: "t4", issueKey: "CCO-244", title: "Draft EMEA go-to-market plan", project: "EMEA Expansion",       assignee: "Marco R.", priority: "medium", status: "todo",        due: "May 10", labels: ["EMEA", "GTM"] },
    { id: "t5", issueKey: "CCO-245", title: "Complete ISO control mapping", project: "ISO 27001 Audit",      assignee: "Admin",    priority: "high",   status: "review",      due: "Apr 21", labels: ["Compliance", "ISO"] },
    { id: "t6", issueKey: "CCO-246", title: "Update OpenAPI docs",          project: "Partner API v2",       assignee: "Priya S.", priority: "low",    status: "done",        due: "Apr 18", labels: ["Docs", "API"] },
    { id: "t7", issueKey: "CCO-247", title: "Competitor analysis report",   project: "Q2 Growth Initiative", assignee: "Sarah M.", priority: "medium", status: "done",        due: "Apr 15", labels: ["Research"] },
    { id: "t8", issueKey: "CCO-248", title: "Data transmission audit",      project: "Platform Redesign",    assignee: "James K.", priority: "high",   status: "review",      due: "Apr 23", labels: ["Bug", "Security"] },
    { id: "t9", issueKey: "CCO-249", title: "Webhook retry policy",         project: "Partner API v2",       assignee: "Priya S.", priority: "low",    status: "todo",        due: "May 2",  labels: ["Backend"] },
  ],
  people: [
    { id: "u1", name: "Sarah Mitchell",  role: "Head of Sales",      dept: "Sales",       status: "active", email: "sarah@co.io" },
    { id: "u2", name: "James Kowalski",  role: "Engineering Lead",   dept: "Engineering", status: "active", email: "james@co.io" },
    { id: "u3", name: "Priya Sharma",    role: "Data Engineer",      dept: "Engineering", status: "active", email: "priya@co.io" },
    { id: "u4", name: "Marco Reyes",     role: "Ops Manager",        dept: "Operations",  status: "active", email: "marco@co.io" },
    { id: "u5", name: "Luna Park",       role: "Product Designer",   dept: "Product",     status: "away",   email: "luna@co.io" },
    { id: "u6", name: "Aria Chen",       role: "AI Lead",            dept: "AI",          status: "active", email: "aria@co.io" },
  ],
  agents: [
    { id: "ag1", name: "SalesGPT",      role: "CRM assistant, deal coaching",   status: "online", model: "gpt-4o",       calls: 1284 },
    { id: "ag2", name: "DataOracle",    role: "Analytics & forecasting",         status: "online", model: "claude-3.5",   calls: 892 },
    { id: "ag3", name: "DevAssist",     role: "Code review, deployments",        status: "idle",   model: "gpt-4o-mini",  calls: 456 },
    { id: "ag4", name: "SupportBot",    role: "Customer support tier-1",         status: "online", model: "gpt-4o",       calls: 5621 },
    { id: "ag5", name: "ComplianceAI",  role: "ISO / SOC2 monitoring",           status: "paused", model: "claude-3",     calls: 98 },
  ],
  integrations: [
    { id: "i1",  name: "Salesforce",       cat: "CRM",            status: "connected", logo: "☁️", users: 42, synced: "2m ago" },
    { id: "i2",  name: "Slack",            cat: "Communication",  status: "connected", logo: "💬", users: 89, synced: "live" },
    { id: "i3",  name: "GitHub",           cat: "Development",    status: "connected", logo: "🐙", users: 18, synced: "live" },
    { id: "i4",  name: "Stripe",           cat: "Billing",        status: "connected", logo: "💳", users: 3,  synced: "5m ago" },
    { id: "i5",  name: "Google Workspace", cat: "Productivity",   status: "connected", logo: "🔵", users: 96, synced: "live" },
    { id: "i6",  name: "Jira",             cat: "Project Mgmt",   status: "connected", logo: "🔷", users: 24, synced: "10m ago" },
    { id: "i7",  name: "Datadog",          cat: "Monitoring",     status: "connected", logo: "📊", users: 8,  synced: "live" },
    { id: "i8",  name: "HubSpot",          cat: "Marketing",      status: "degraded",  logo: "🟠", users: 15, synced: "1h ago" },
    { id: "i9",  name: "Notion",           cat: "Knowledge",      status: "connected", logo: "⬛", users: 67, synced: "live" },
    { id: "i10", name: "AWS",              cat: "Infrastructure", status: "connected", logo: "🟡", users: 6,  synced: "live" },
  ],
  notifications: [
    { id: "n1", sev: "high",   title: "Auth service latency spike",   body: "P95 latency >2s for 8 minutes.",     time: "3m ago", read: false },
    { id: "n2", sev: "medium", title: "HubSpot sync degraded",         body: "Last successful sync 1hr ago.",       time: "1h ago", read: false },
    { id: "n3", sev: "low",    title: "ISO audit 95% complete",        body: "1 control remaining before sign-off.", time: "2h ago", read: false },
    { id: "n4", sev: "low",    title: "Monthly backup complete",       body: "3.2GB archived to S3.",                time: "4h ago", read: true },
    { id: "n5", sev: "medium", title: "Q2 pipeline at 74% of target",  body: "Sales forecast updated.",             time: "5h ago", read: true },
  ],
  chats: {
    ag1: [
      { role: "assistant", name: "SalesGPT", content: "Good morning. Your pipeline has 3 deals closing this week worth $84K combined. Acme Corp needs a follow-up — last contact was 6 days ago.", time: "09:00" },
      { role: "user",      name: "You",      content: "Draft a follow-up email for Acme Corp.", time: "09:02" },
      { role: "assistant", name: "SalesGPT", content: "Subject: Following up — cc-org-dash Enterprise Proposal\n\nHi [Name],\n\nI wanted to follow up on the proposal we shared last week. Given your team's goals around centralising operations, I believe cc-org-dash could save you significant coordination overhead.\n\nAre you available for a 20-minute call this Thursday?\n\nBest,\n[Your name]", time: "09:02" },
    ],
    ag2: [
      { role: "assistant", name: "DataOracle", content: "Q2 revenue forecast: $1.14M (↑9% vs Q1). Confidence: 87%. Primary driver: EMEA pipeline converted at 34%.", time: "08:30" },
      { role: "user",      name: "You",        content: "What's dragging the confidence below 90%?", time: "10:00" },
      { role: "assistant", name: "DataOracle", content: "Two factors:\n1. EMEA deal cycle uncertainty (σ = 18 days)\n2. Three enterprise deals with incomplete qualification scores\n\nIf those three deals close, forecast rises to $1.28M with 94% confidence.", time: "10:01" },
    ],
    ag3: [{ role: "assistant", name: "DevAssist",    content: "Ready. 2 open PRs await review. auth-service has a memory leak in the connection pool — want me to flag it for the team?", time: "09:45" }],
    ag4: [{ role: "assistant", name: "SupportBot",   content: "Handling 12 active tickets. 3 escalated in the past hour. Average first-response: 4m 22s.", time: "Now" }],
    ag5: [{ role: "assistant", name: "ComplianceAI", content: "Paused pending ISO audit sign-off. 47/48 controls mapped. Resume after audit on Apr 22?", time: "Yesterday" }],
  },
};

/** Zendesk-style inbox threads (ticketed conversations; messages still keyed by agentId in DB.chats) */
export const INBOX_THREADS = [
  {
    id: "th-ag1",
    agentId: "ag1",
    projectId: "p1",
    ticketId: "#18421",
    subject: "Enterprise renewal — pricing & DPAs",
    status: "open",
    priority: "urgent",
    channel: "email",
    project: "Q2 Growth Initiative",
    assignee: "Sarah Mitchell",
    requester: "Acme Corp",
    unread: 2,
    updated: "2m ago",
  },
  {
    id: "th-ag2",
    agentId: "ag2",
    projectId: "p3",
    ticketId: "#18422",
    subject: "Forecast model — confidence gap",
    status: "open",
    priority: "normal",
    channel: "slack",
    project: "Data Pipeline v3",
    assignee: "Priya Sharma",
    requester: "Finance Ops",
    unread: 0,
    updated: "14m ago",
  },
  {
    id: "th-ag3",
    agentId: "ag3",
    projectId: "p2",
    ticketId: "#18423",
    subject: "auth-service — memory leak PR",
    status: "pending",
    priority: "high",
    channel: "web",
    project: "Platform Redesign",
    assignee: "James Kowalski",
    requester: "GitHub",
    unread: 1,
    updated: "1h ago",
  },
  {
    id: "th-ag4",
    agentId: "ag4",
    projectId: "p4",
    ticketId: "#18424",
    subject: "Tier-1 queue spike — APAC",
    status: "open",
    priority: "normal",
    channel: "slack",
    project: "EMEA Expansion",
    assignee: "Unassigned",
    requester: "Support",
    unread: 4,
    updated: "Now",
  },
  {
    id: "th-ag5",
    agentId: "ag5",
    projectId: "p5",
    ticketId: "#18425",
    subject: "ISO control evidence — final upload",
    status: "on_hold",
    priority: "low",
    channel: "email",
    project: "ISO 27001 Audit",
    assignee: "Admin",
    requester: "Auditor portal",
    unread: 0,
    updated: "Yesterday",
  },
];

export const INBOX_WORKSPACES = [
  { id: "all", label: "All workspaces" },
  { id: "p1", label: "Q2 Growth" },
  { id: "p2", label: "Platform" },
  { id: "p3", label: "Data pipeline" },
  { id: "p4", label: "EMEA" },
  { id: "p5", label: "ISO audit" },
];

/** Company command center — portfolio & ops snapshot (distinct from feature nav / Data apps) */
export const GLOBAL_COMMAND = {
  signals: {
    critical: [
      { id: "s1", title: "Auth P95 breach SLA", owner: "Platform", age: "12m" },
      { id: "s2", title: "Refund anomaly window", owner: "Finance", age: "28m" },
    ],
    attention: [
      { id: "s3", title: "HubSpot sync lag", owner: "RevOps", age: "1h" },
      { id: "s4", title: "EMEA capacity gap", owner: "Ops", age: "2h" },
      { id: "s5", title: "Audit evidence item", owner: "Security", age: "3h" },
    ],
    fyiCount: 11,
  },
  initiatives: [
    { id: "ini1", title: "Revenue engine Q2", health: "green", owner: "Sarah M.", window: "FY-Q2", summary: "Forecast confidence 87%. Pipeline coverage healthy." },
    { id: "ini2", title: "Customer 360 launch", health: "amber", owner: "James K.", window: "May 30", summary: "Two dependencies on identity resolution." },
    { id: "ini3", title: "Trust & compliance", health: "green", owner: "Admin", window: "Apr 22", summary: "ISO track on schedule for sign-off." },
    { id: "ini4", title: "EMEA hub stand-up", health: "neutral", owner: "Marco R.", window: "H2", summary: "Planning; no execution risk yet." },
  ],
  objectives: [
    { id: "kr1", title: "ARR +18% vs prior quarter", progress: 74, period: "Q2 2026", dept: "GTM", detail: "Weighted pipeline covers 112% of gap; discount risk in enterprise tier." },
    { id: "kr2", title: "Unified data layer GA", progress: 81, period: "Q2 2026", dept: "Engineering", detail: "Kafka cutover complete; remaining work is consumer hardening." },
    { id: "kr3", title: "Enterprise NPS ≥ 45", progress: 52, period: "H1 2026", dept: "CX", detail: "Survey n=84; detractors concentrated in onboarding." },
  ],
  milestones: [
    { id: "ms1", title: "Board readout", date: "Apr 24", risk: "low", detail: "Slides locked; appendix pending finance sign-off." },
    { id: "ms2", title: "Customer 360 private beta", date: "May 02", risk: "medium", detail: "5 accounts; success criteria = activation + 1 workflow each." },
    { id: "ms3", title: "ISO 27001 sign-off", date: "Apr 22", risk: "low", detail: "Final control evidence upload by Apr 20." },
  ],
  blockers: [
    { id: "bl1", title: "Legal review — enterprise DPAs", impact: "high", team: "Sales", detail: "Blocking 3 deals >$400K ARR. Target response Apr 21." },
  ],
  notes: [
    { id: "pn1", title: "Strategy offsite — follow-ups", preview: "3 actions for GTM; owner map in Notion.", updated: "Yesterday" },
    { id: "pn2", title: "Vendor scorecard Q1", preview: "Snowflake vs Databricks cost model.", updated: "Apr 16" },
  ],
};

export const FILE_FOLDERS = [
  { id: "root",     label: "All Files",  icon: "🗂" },
  { id: "projects", label: "Projects",   icon: "📁" },
  { id: "reports",  label: "Reports",    icon: "📊" },
  { id: "ai",       label: "AI Outputs", icon: "◈" },
  { id: "legal",    label: "Legal",      icon: "⚖" },
  { id: "shared",   label: "Shared",     icon: "👥" },
  { id: "starred",  label: "Starred",    icon: "★" },
  { id: "trash",    label: "Trash",      icon: "🗑" },
];

export const FILE_DATA = {
  root: [
    { id: "f1", name: "Q2 Forecast.xlsx",        type: "spreadsheet", size: "284 KB",  modified: "Apr 18, 2026", owner: "EcoAdmin",    shared: 3 },
    { id: "f2", name: "Amazon Basin Survey.pdf", type: "pdf",         size: "12.4 MB", modified: "Apr 17, 2026", owner: "Aria Chen",   shared: 8 },
    { id: "f3", name: "Species ID Model v2.4",   type: "archive",     size: "892 MB",  modified: "Apr 16, 2026", owner: "Marco Reyes", shared: 2 },
    { id: "f4", name: "Grant Application.docx",  type: "document",    size: "1.2 MB",  modified: "Apr 14, 2026", owner: "EcoAdmin",    shared: 5 },
    { id: "f5", name: "Sensor Grid Photos.zip",  type: "archive",     size: "340 MB",  modified: "Apr 12, 2026", owner: "Sven Larsson", shared: 1 },
    { id: "f6", name: "Q1 Board Report.pdf",     type: "pdf",         size: "4.8 MB",  modified: "Apr 10, 2026", owner: "EcoAdmin",    shared: 12 },
    { id: "f7", name: "ClimateOracle Config.json", type: "code",      size: "18 KB",   modified: "Apr 9, 2026",  owner: "Priya Singh", shared: 0 },
    { id: "f8", name: "Platform Architecture.png", type: "image",     size: "2.1 MB",  modified: "Apr 8, 2026",  owner: "EcoAdmin",    shared: 4 },
  ],
  projects: [
    { id: "f9",  name: "Project Charter.docx", type: "document",    size: "94 KB",  modified: "Apr 15, 2026", owner: "EcoAdmin",    shared: 6 },
    { id: "f10", name: "Gantt Chart.xlsx",     type: "spreadsheet", size: "156 KB", modified: "Apr 13, 2026", owner: "Marco Reyes", shared: 9 },
  ],
  reports: [
    { id: "f11", name: "Monthly Report Mar 2026.pdf",  type: "pdf",         size: "3.2 MB", modified: "Apr 1, 2026",  owner: "EcoAdmin",  shared: 14 },
    { id: "f12", name: "Biodiversity Index 2026.xlsx", type: "spreadsheet", size: "512 KB", modified: "Mar 28, 2026", owner: "Aria Chen", shared: 7 },
  ],
  ai: [
    { id: "f13", name: "EcoScan Results — Grid 7B.json", type: "code", size: "2.4 MB", modified: "Apr 18, 2026", owner: "EcoScan GPT-4o",  shared: 3 },
    { id: "f14", name: "Climate Forecast Q2.pdf",        type: "pdf",  size: "890 KB", modified: "Apr 17, 2026", owner: "ClimateOracle",   shared: 2 },
  ],
  legal: [],
  shared: [],
  trash: [],
};

export const FILE_ICONS = { pdf: "📄", document: "📝", spreadsheet: "📊", image: "🖼", archive: "📦", code: "{ }", video: "🎬", default: "📄" };

/** Workflow builder presets — nodes, edges, canvas hints for cc-org-dash Work → Workflows */
export const WORKFLOW_PRESETS = [
  {
    id: "w1",
    name: "Sensor Alert Pipeline",
    status: "active",
    summary: "IoT → Slack",
    nodes: [
      { id: "n1", x: 30, y: 100, type: "trigger", label: "Sensor Alert", sub: "IoT threshold breach", color: "#0891b2" },
      { id: "n2", x: 210, y: 40, type: "filter", label: "Severity Check", sub: "Critical only", color: "#9a6700" },
      { id: "n3", x: 210, y: 170, type: "action", label: "Log Event", sub: "Write to database", color: "#6e7781" },
      { id: "n4", x: 390, y: 40, type: "ai", label: "EcoScan AI", sub: "Species analysis", color: "#8250df" },
      { id: "n5", x: 390, y: 170, type: "action", label: "Create Task", sub: "Assign to team", color: "#0969da" },
      { id: "n6", x: 570, y: 40, type: "action", label: "Slack Notify", sub: "#alerts channel", color: "#1a7f37" },
      { id: "n7", x: 570, y: 170, type: "action", label: "Email Report", sub: "Weekly digest", color: "#1a7f37" },
      { id: "n8", x: 740, y: 105, type: "end", label: "Complete", sub: "Workflow done", color: "#374151" },
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
    name: "Weekly Report Digest",
    status: "inactive",
    summary: "CRM → Email",
    nodes: [
      { id: "r1", x: 40, y: 110, type: "trigger", label: "Schedule", sub: "Every Monday 08:00", color: "#0891b2" },
      { id: "r2", x: 240, y: 110, type: "action", label: "Pull CRM stats", sub: "Salesforce query", color: "#0969da" },
      { id: "r3", x: 440, y: 110, type: "ai", label: "Summarize", sub: "Exec summary", color: "#8250df" },
      { id: "r4", x: 640, y: 110, type: "action", label: "Email leaders", sub: "Distribution list", color: "#1a7f37" },
    ],
    edges: [{ f: "r1", t: "r2" }, { f: "r2", t: "r3" }, { f: "r3", t: "r4" }],
  },
  {
    id: "w3",
    name: "New User Onboarding",
    status: "active",
    summary: "Sign-up → Tasks",
    nodes: [
      { id: "u1", x: 30, y: 110, type: "trigger", label: "Account created", sub: "Auth webhook", color: "#0891b2" },
      { id: "u2", x: 200, y: 110, type: "action", label: "Welcome email", sub: "Template A", color: "#0969da" },
      { id: "u3", x: 370, y: 110, type: "filter", label: "Role check", sub: "Admin vs member", color: "#9a6700" },
      { id: "u4", x: 540, y: 50, type: "action", label: "Admin checklist", sub: "3 tasks", color: "#1a7f37" },
      { id: "u5", x: 540, y: 170, type: "action", label: "Member tour", sub: "Product tips", color: "#1a7f37" },
      { id: "u6", x: 710, y: 110, type: "end", label: "Onboarding done", sub: "Log completion", color: "#374151" },
    ],
    edges: [
      { f: "u1", t: "u2" }, { f: "u2", t: "u3" },
      { f: "u3", t: "u4" }, { f: "u3", t: "u5" },
      { f: "u4", t: "u6" }, { f: "u5", t: "u6" },
    ],
  },
];

/** Roadmap quarters — light theme, Linear-inspired structure */
export const ROADMAP_QUARTERS = [
  {
    id: "q2",
    label: "Q2 2026",
    items: [
      { id: "rm1", title: "Partner API v2 GA", icon: "🔷", status: "active", avatars: ["Priya S.", "James K."] },
      { id: "rm2", title: "EMEA pilot rollout", icon: "🌍", status: "planned", avatars: ["Marco R."] },
    ],
  },
  {
    id: "q3",
    label: "Q3 2026",
    items: [
      { id: "rm3", title: "Workflow builder v2", icon: "⚡", status: "active", avatars: ["Sarah M.", "Aria Chen"] },
      { id: "rm4", title: "Mobile approvals", icon: "📱", status: "planned", avatars: ["Luna Park"] },
    ],
  },
  {
    id: "up",
    label: "Upcoming",
    items: [
      { id: "rm5", title: "AI copilot — Finance", icon: "◈", status: "idea", avatars: ["Aria Chen"] },
    ],
  },
];

/** Active cycle snapshot — right-hand summary panel */
export const ACTIVE_CYCLE = {
  name: "Cycle 14",
  range: "Apr 7 — Apr 18, 2026",
  pctDone: 57,
  effortTotal: 328,
  effortDone: 186,
  weekdaysLeft: 1,
  burndownHint: "Slightly behind ideal; scope stable.",
  members: [
    { name: "Sarah M.", pct: 65, of: 88 },
    { name: "James K.", pct: 48, of: 72 },
    { name: "Priya S.", pct: 72, of: 94 },
    { name: "Marco R.", pct: 41, of: 54 },
  ],
};