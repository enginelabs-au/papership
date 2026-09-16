export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const SEAT_LABEL = {
  founder: "Paid operator",
  project_lead: "Project Lead",
  operator: "Operator",
  guest: "Guest",
};

export const CONNECTOR_CATALOG = [
  {
    id: "github",
    initials: "GH",
    name: "GitHub",
    kind: "Bound repository",
    status: "configured",
    destination_class: "source_control",
    scope: "Branch, change and check are granted. Release is off. Live write stays dry-run or approval-bound.",
    verified: "Configured in Papership.",
    recovery: "",
    handoff: "Authorise the GitHub App in the browser. Papership never embeds a provider sign-in.",
  },
  {
    id: "gmail",
    initials: "GM",
    name: "Gmail",
    kind: "Comms channel",
    status: "planned",
    destination_class: "mailbox",
    scope: "Read and draft stay dry-run after connect. Send needs approval then a receipt.",
    verified: "Not enabled",
    recovery: "",
    handoff: "Continue in Google’s browser. Papership never embeds the provider sign-in.",
  },
  {
    id: "slack",
    initials: "SL",
    name: "Slack",
    kind: "Comms channel",
    status: "planned",
    destination_class: "chat",
    scope: "Read stays dry-run after connect. Messages need approval then a receipt.",
    verified: "Not enabled",
    recovery: "",
    handoff: "Continue in Slack’s browser. Papership never embeds the provider sign-in.",
  },
  {
    id: "telegram",
    initials: "TG",
    name: "Telegram",
    kind: "Comms channel",
    status: "planned",
    destination_class: "chat",
    scope: "Planned until a bot mapping is supplied.",
    verified: "Not enabled",
    recovery: "",
    handoff: "Telegram stays planned until a bot mapping is supplied.",
  },
  {
    id: "whatsapp",
    initials: "WA",
    name: "WhatsApp",
    kind: "Comms channel",
    status: "planned",
    destination_class: "chat",
    scope: "Planned until a business mapping is supplied.",
    verified: "Not enabled",
    recovery: "",
    handoff: "WhatsApp Cloud API stays planned until a business mapping is supplied.",
  },
];

let memoryToken = "";

function persistSession(value) {
  memoryToken = value || "";
  try {
    if (value) sessionStorage.setItem("papership-token", value);
    else sessionStorage.removeItem("papership-token");
    localStorage.removeItem("papership-token");
    localStorage.removeItem("engine-os-token");
  } catch {
    /* */
  }
}

function token() {
  if (memoryToken) return memoryToken;
  try {
    const session = sessionStorage.getItem("papership-token");
    if (session) {
      memoryToken = session;
      return session;
    }
    const persisted = localStorage.getItem("papership-token") || localStorage.getItem("engine-os-token") || "";
    if (persisted) {
      persistSession(persisted);
      return persisted;
    }
  } catch {
    /* */
  }
  return memoryToken;
}

function sessionExpiry(raw) {
  try {
    const payload = (raw || "").split(".")[1];
    if (!payload) return 0;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded));
    return Number(json.exp) || 0;
  } catch {
    return 0;
  }
}

function sessionIsFresh(raw) {
  return Boolean(raw) && sessionExpiry(raw) - Date.now() / 1000 > 90;
}

export function clearStoredSession() {
  persistSession("");
}

function apiUnreachable(path, cause) {
  const err = new Error(
    `Could not reach the Papership API at ${API_BASE}${path}. Start the local API (bash scripts/dev-local.sh) and retry from this same origin. The Vercel site has no store of its own.`
  );
  err.status = 0;
  err.cause = cause;
  return err;
}

async function authHeaders(extra) {
  const jwt = await ensureLocalSession();
  const headers = { Accept: "application/json", ...extra };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  return headers;
}

async function papershipRequest(path, init, retried = false) {
  const headers = await authHeaders(init.headers || {});
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (cause) {
    throw apiUnreachable(path, cause);
  }
  if (response.status === 401 && !retried) {
    clearStoredSession();
    await ensureLocalSession();
    return papershipRequest(path, init, true);
  }
  return response;
}

export async function postPapershipJson(path, body) {
  const response = await papershipRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.detail || `Papership API ${path} returned ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return payload;
}

export async function ensureLocalSession() {
  const current = token();
  if (sessionIsFresh(current)) return current;
  try {
    const response = await fetch(`${API_BASE}/auth/local-session`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return sessionIsFresh(current) ? current : "";
    const body = await response.json();
    if (body.access_token) {
      persistSession(body.access_token);
      return body.access_token;
    }
  } catch {
    /* */
  }
  return "";
}

export async function recordOqG2() {
  await ensureLocalSession();
  return postPapershipJson("/settings/oq-g2", {});
}

export async function requestErasure(confirmations) {
  return postPapershipJson("/erasure/request", { confirmations });
}

export const ENGINE_LABS_PROJECT_ID = "proj-engine-labs";
export const ENGINE_LABS_JOB_PURPOSE = "engine_labs.loop";
export const ENGINE_LABS_LOOP_STAGES = [
  "request",
  "research",
  "specification",
  "plan",
  "assignment",
  "isolated_change",
  "tests",
  "review",
  "release_proposal",
  "monitoring",
  "retained_knowledge",
];
export const ENGINE_LABS_LOOP_LOCAL_KEY = "papership-engine-labs-loop";

const LOOP_STAGE_ARTIFACT_TYPES = {
  request: "intake_brief",
  research: "research_brief",
  specification: "spec_outline",
  plan: "task_list",
  assignment: "assignment_record",
  isolated_change: "change_stub",
  tests: "test_plan",
  review: "review_checklist",
  release_proposal: "pr_draft_stub",
  monitoring: "monitoring_note",
  retained_knowledge: "knowledge_summary",
};

function buildLocalLoopStageArtifact({ stage, workItemId, jobId, title, boundRepo = "enginelabs-au/papership" }) {
  const digest = `${workItemId}:${stage}:${jobId}`.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const slug = String(Math.abs(digest)).slice(0, 8);
  const artifactType = LOOP_STAGE_ARTIFACT_TYPES[stage] || "stage_note";
  const stageLabel = stage.replace(/_/g, " ");
  const hermesRunId =
    stage === "assignment" || stage === "isolated_change" || stage === "tests"
      ? `run_stub_${slug}`
      : null;
  const lines = [
    `# Loop · ${stageLabel} · ${title}`,
    "",
    `- **Stage:** \`${stage}\``,
    `- **Work item:** \`${workItemId}\``,
    `- **Job:** \`${jobId}\``,
    `- **Repository:** \`${boundRepo}\``,
    "",
    `## ${stageLabel} output (browser mock)`,
    "",
    "This artifact was produced locally because the API was unreachable. The live API writes the same shape to the ledger.",
  ];
  if (hermesRunId) lines.push("", `- **Hermes run (stub):** \`${hermesRunId}\``);
  const bodyMarkdown = lines.join("\n");
  const ledgerPath = `.papership/loop/${workItemId}/${stage.replace(/_/g, "-")}.md`;
  return {
    id: `lart_local_${slug}_${stage}`,
    work_item_id: workItemId,
    job_id: jobId,
    stage,
    artifact_type: artifactType,
    title: `Loop · ${stageLabel} · ${title}`,
    body_markdown: bodyMarkdown,
    ledger_path: ledgerPath,
    memory_item_id: `mem_local_${slug}`,
    meta: {
      stage,
      artifact_type: artifactType,
      ledger_path: ledgerPath,
      hermes_status: "not_configured",
      live_github_open: false,
      hermes_write: false,
      ...(hermesRunId ? { hermes_run_id: hermesRunId } : {}),
      mock: true,
    },
    created_at: new Date().toISOString(),
    mock: true,
  };
}

function applyLocalStageWork(state, stage) {
  const workItem = state.workItem;
  const job = state.job;
  if (!workItem?.id || !job?.id) return state;
  const artifact = buildLocalLoopStageArtifact({
    stage,
    workItemId: workItem.id,
    jobId: job.id,
    title: workItem.title || "Engine Labs loop",
    boundRepo: state.boundRepo,
  });
  const artifacts = [...(state.artifacts || []), artifact];
  const loopEvents = [
    ...(workItem.loop || []),
    { stage, evidence: `loop.stage.artifact:${artifact.id}` },
  ];
  const workItemNext = { ...workItem, stage, loop: loopEvents };
  const jobNext = { ...job, stage, status: "running" };
  return buildEngineLabsLoopState({
    projectId: state.projectId,
    projectName: state.projectName,
    boundRepo: state.boundRepo,
    loopStages: state.loopStages,
    job: jobNext,
    workItem: workItemNext,
    currentStage: stage,
    loopEventCount: loopEvents.length,
    artifacts,
    currentArtifact: artifact,
    mock: true,
  });
}

function isLoopTransportError(err) {
  if (!err) return false;
  if (err.name === "TypeError") return true;
  if (err.status === undefined) return /fetch|network|failed/i.test(String(err.message || ""));
  return err.status >= 500 || err.status === 0;
}

export function readLocalEngineLabsLoop() {
  try {
    const raw = localStorage.getItem(ENGINE_LABS_LOOP_LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalEngineLabsLoop(state) {
  try {
    if (state) localStorage.setItem(ENGINE_LABS_LOOP_LOCAL_KEY, JSON.stringify(state));
    else localStorage.removeItem(ENGINE_LABS_LOOP_LOCAL_KEY);
  } catch {
    /* */
  }
}

function buildEngineLabsLoopState({
  projectId,
  projectName,
  boundRepo,
  loopStages,
  job,
  workItem,
  currentStage,
  loopEventCount,
  mock = false,
  artifacts = null,
  currentArtifact = null,
}) {
  const stages = loopStages?.length ? loopStages : ENGINE_LABS_LOOP_STAGES;
  const stage = currentStage || workItem?.stage || job?.stage || null;
  const idx = stage ? stages.indexOf(stage) : -1;
  const nextStage =
    job && idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : job ? null : null;
  const resolvedArtifacts =
    artifacts ??
    workItem?.artifacts ??
    (currentArtifact || workItem?.current_artifact ? [currentArtifact || workItem?.current_artifact].filter(Boolean) : []);
  const resolvedCurrent =
    currentArtifact ?? workItem?.current_artifact ?? (resolvedArtifacts.length ? resolvedArtifacts[resolvedArtifacts.length - 1] : null);
  return {
    projectId: projectId || ENGINE_LABS_PROJECT_ID,
    projectName: projectName || "Engine Labs · Papership",
    boundRepo: boundRepo || "enginelabs-au/papership",
    loopStages: stages,
    job: job && stage ? { ...job, stage } : job,
    workItem: workItem
      ? {
          ...workItem,
          artifacts: resolvedArtifacts,
          current_artifact: resolvedCurrent,
        }
      : workItem,
    currentStage: stage,
    nextStage,
    loopEventCount: loopEventCount ?? (workItem?.loop?.length || 0),
    artifacts: resolvedArtifacts,
    currentArtifact: resolvedCurrent,
    mock,
  };
}

function localStartEngineLabsJob(projectId, title = "Engine Labs loop") {
  const now = Date.now();
  const jid = `job_local_${now}`;
  const wid = `wi_local_${now}`;
  const stage = "request";
  const job = {
    id: jid,
    status: "queued",
    purpose: ENGINE_LABS_JOB_PURPOSE,
    project_id: projectId,
    work_item_id: wid,
    stage,
    title,
    live_github_open: false,
    hermes_write: false,
    mock: true,
  };
  const workItem = {
    id: wid,
    title,
    stage,
    project_id: projectId,
    job_id: jid,
    loop: [{ stage, evidence: "engine_labs.job.start" }],
  };
  let state = buildEngineLabsLoopState({
    projectId,
    job,
    workItem,
    currentStage: stage,
    loopEventCount: 1,
    mock: true,
  });
  state = applyLocalStageWork(state, stage);
  writeLocalEngineLabsLoop(state);
  return { ...job, stage, status: "running", current_artifact: state.currentArtifact, mock: true };
}

function localAdvanceEngineLabsLoopStage(workItemId, stage, evidence) {
  const prev = readLocalEngineLabsLoop();
  if (!prev?.workItem?.id || prev.workItem.id !== workItemId) {
    throw new Error("No local loop job. Start the Founder loop first.");
  }
  const loopEvents = [...(prev.workItem.loop || []), { stage, evidence: `founder.advance.${stage}` }];
  const workItem = { ...prev.workItem, stage, loop: loopEvents };
  let state = buildEngineLabsLoopState({
    projectId: prev.projectId,
    projectName: prev.projectName,
    boundRepo: prev.boundRepo,
    loopStages: prev.loopStages,
    job: prev.job,
    workItem,
    currentStage: stage,
    loopEventCount: loopEvents.length,
    artifacts: prev.artifacts,
    currentArtifact: prev.currentArtifact,
    mock: true,
  });
  state = applyLocalStageWork(state, stage);
  writeLocalEngineLabsLoop(state);
  return state.workItem;
}

export function coalesceEngineLabsLoop(apiLoop) {
  if (apiLoop?.job?.work_item_id) {
    writeLocalEngineLabsLoop({ ...apiLoop, mock: false });
    return apiLoop;
  }
  const local = readLocalEngineLabsLoop();
  if (local?.job) return local;
  return apiLoop || local || null;
}

export async function startEngineLabsJob(projectId, title = "Engine Labs loop") {
  try {
    await ensureLocalSession();
    const result = await postPapershipJson(`/projects/${projectId}/jobs`, {
      title,
      purpose: ENGINE_LABS_JOB_PURPOSE,
    });
    return { ...result, mock: false };
  } catch (err) {
    if (isLoopTransportError(err)) {
      return localStartEngineLabsJob(projectId, title);
    }
    throw err;
  }
}

export async function advanceEngineLabsLoopStage(workItemId, stage, evidence = "founder.advance") {
  try {
    const body = await postPapershipJson(`/work-items/${workItemId}/stage`, { stage, evidence });
    return { ...body, mock: false };
  } catch (err) {
    if (isLoopTransportError(err)) {
      return localAdvanceEngineLabsLoopStage(workItemId, stage, evidence);
    }
    throw err;
  }
}

/** Latest engine_labs.loop job + work-item stage from the managed project (live API). */
export async function fetchEngineLabsLoopState(projectId = ENGINE_LABS_PROJECT_ID) {
  try {
    const project = await fetchPapershipJson(`/projects/${projectId}`);
    const stages = project.loop_stages || ENGINE_LABS_LOOP_STAGES;
    const purpose = project.job_purpose || ENGINE_LABS_JOB_PURPOSE;
    const loopJobs = (project.jobs || []).filter((j) => j.purpose === purpose);
    const job = loopJobs[0] || null;
    if (!job?.work_item_id) {
      const empty = buildEngineLabsLoopState({
        projectId,
        projectName: project.name,
        boundRepo: project.bound_repo,
        loopStages: stages,
        job: null,
        workItem: null,
        currentStage: null,
        loopEventCount: 0,
        mock: false,
      });
      return coalesceEngineLabsLoop(empty);
    }
    const workItem = await fetchPapershipJson(`/work-items/${job.work_item_id}`);
    const currentStage = workItem.stage || job.stage || "request";
    const state = buildEngineLabsLoopState({
      projectId,
      projectName: project.name,
      boundRepo: project.bound_repo,
      loopStages: stages,
      job,
      workItem,
      currentStage,
      loopEventCount: (workItem.loop || []).length,
      artifacts: workItem.artifacts,
      currentArtifact: workItem.current_artifact,
      mock: false,
    });
    writeLocalEngineLabsLoop(state);
    return state;
  } catch (err) {
    const local = readLocalEngineLabsLoop();
    if (local) return local;
    if (isLoopTransportError(err)) {
      return buildEngineLabsLoopState({
        projectId,
        job: null,
        workItem: null,
        currentStage: null,
        loopEventCount: 0,
        mock: true,
      });
    }
    throw err;
  }
}

export async function fetchHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function mapHealth(health) {
  if (!health) return null;
  const row = (label, ok, detail) => ({
    label,
    state: ok ? "Healthy" : "Unreachable",
    dot: ok ? "var(--green)" : "var(--amber)",
    detail: String(detail || (ok ? "ok" : "not reachable")),
    checked: "now",
  });
  return {
    stamp: "Last check now",
    kpis: [
      row("API", health.status === "ok" || health.db === "ok", health.status || health.db),
      row("Workers · Hermes", health.hermes === "reachable" || health.hermes === "ok", health.hermes),
      row("Database", health.db === "ok", health.db),
      row(
        "Bound repository",
        health.github === "reachable" || health.github === "ok",
        health.github
      ),
    ],
  };
}

export async function fetchPapershipJson(path) {
  const response = await papershipRequest(path, { method: "GET" });
  if (!response.ok) {
    const err = new Error(`Papership API ${path} returned ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export const TRIAL_RATE_CARD = {
  version: 2,
  published: true,
  trial: true,
  charges_enabled: false,
  currency: "USD",
  aud_per_usd: 1.5,
  credit_increment_usd: 10,
  plans: [
    { id: "free", label: "Free", usd_month: 0, seats: "1", tokens_month: 50000, token_scope: "organisation", overage: "none", overage_usd_per_100k: null, note: "Try Hey Papership. Hard stop at the pool — add Pro to continue." },
    { id: "pro", label: "Pro", usd_month: 24, seats: "1+", tokens_month: 200000, token_scope: "per_seat", overage: "credits", overage_usd_per_100k: 8, note: "Paid operator seat for one founder/solo operator. All Papership domains. Charges stay off until enabled." },
    { id: "max", label: "Max", usd_month: 120, seats: "1+", tokens_month: 800000, token_scope: "per_seat", overage: "credits", overage_usd_per_100k: 6, note: "Power seat (5× Pro price, 4× Pro tokens). Cheaper overage than Pro." },
    { id: "enterprise", label: "Enterprise", usd_month: 32, seats: "5 minimum", tokens_month: 400000, token_scope: "per_seat_pooled", overage: "credits", overage_usd_per_100k: 5, note: "Affordable org seats. Tokens pool across the tenant. Floor 5 × $32 = $160 / month." },
  ],
  usage_tiers: [
    { id: "usage_1", label: "Usage 1", overage_cap_multiple: 1, unlock: "Default after the first paid invoice or credit purchase." },
    { id: "usage_2", label: "Usage 2", overage_cap_multiple: 2, unlock: "$50 usage credits purchased and 7 days on a paid plan." },
    { id: "usage_3", label: "Usage 3", overage_cap_multiple: 4, unlock: "$150 usage credits purchased and 7 days on a paid plan." },
    { id: "usage_4", label: "Usage 4", overage_cap_multiple: 8, unlock: "$500 usage credits purchased and 14 days on a paid plan." },
    { id: "usage_5", label: "Usage 5", overage_cap_multiple: 16, unlock: "$1,000 usage credits purchased and 30 days on a paid plan." },
  ],
};

export function formatPlanTier(plan) {
  const aud = Math.round((plan.usd_month || 0) * 1.5);
  const price = plan.usd_month ? `US$${plan.usd_month} / seat / mo · ≈ A$${aud}` : "US$0";
  const tokens = `${Number(plan.tokens_month).toLocaleString("en-US")} tokens / mo (${plan.token_scope})`;
  const overage =
    plan.overage === "credits"
      ? `Overage: US$${plan.overage_usd_per_100k} / 100k via US$10 credit packs`
      : "No overage — upgrade to continue";
  return { label: plan.label, price, tokens, overage, note: plan.note || "" };
}

export async function loadPapershipOverlay() {
  const jwt = await ensureLocalSession();
  if (!jwt) {
    return {
      source: "unauthenticated",
      apiBase: API_BASE,
      people: [],
      guests: [],
      teams: [],
      connections: CONNECTOR_CATALOG,
      threads: [],
      measurement: defaultMeasurement(),
      rateCard: TRIAL_RATE_CARD,
      health: mapHealth(await fetchHealth()),
      hermesHost: {
        status: "not_configured",
        message: "Hermes Host is not configured. Local mock mode — no Cam HostHatch secrets required.",
        write_tools: false,
        mock: true,
        pin: null,
      },
      operatorSeat: null,
      erasure: { status: "none", destroyed: false, items: [] },
      memory: [],
      strategy: [],
      personalisation: defaultPersonalisation(),
      view: { fallback: true, personalisation: false },
      domains: [],
      managedProjects: [],
      packs: [],
      proposals: [],
      evidence: [],
      references: defaultReferences(),
      schedules: [],
      engineLabsLoop: coalesceEngineLabsLoop(null),
    };
  }
  try {
    const [people, teams, inbox, connections, measurement, memory, strategy, personalisation, view, domains, projects, references, schedules, packs, proposals, evidence, erasure, rateCard, health, hermesHost, operatorSeat, engineLabsLoop] = await Promise.all([
      fetchPapershipJson("/people"),
      fetchPapershipJson("/teams"),
      fetchPapershipJson("/inbox"),
      fetchPapershipJson("/connections"),
      fetchPapershipJson("/settings/measurement"),
      fetchPapershipJson("/memory"),
      fetchPapershipJson("/strategy"),
      fetchPapershipJson("/settings/personalisation"),
      fetchPapershipJson("/views/current"),
      fetchPapershipJson("/domains/catalogue"),
      fetchPapershipJson("/projects").catch(() => ({ items: [] })),
      fetchPapershipJson("/references"),
      fetchPapershipJson("/schedules"),
      fetchPapershipJson("/packs"),
      fetchPapershipJson("/payments/proposals"),
      fetchPapershipJson("/field-evidence"),
      fetchPapershipJson("/erasure/status").catch(() => ({ status: "none", destroyed: false, items: [] })),
      fetchPapershipJson("/billing/rate-card").catch(() => TRIAL_RATE_CARD),
      fetchHealth(),
      fetchPapershipJson("/hermes/host").catch(() => null),
      fetchPapershipJson("/seats/operator").catch(() => null),
      fetchEngineLabsLoopState().catch(() => null),
    ]);
    return {
      source: "api",
      apiBase: API_BASE,
      people: people.items || [],
      guests: people.guests || [],
      teams: teams.items || [],
      connections: connections.items || CONNECTOR_CATALOG,
      threads: inbox.items || [],
      measurement,
      inboxState: inbox.state,
      peopleState: people.state,
      memory: memory.items || [],
      strategy: strategy.items || [],
      strategyKpi: strategy.kpi_status || "not_captured",
      personalisation,
      view,
      domains: domains.items || [],
      managedProjects: projects.items || [],
      packs: packs.items || [],
      proposals: proposals.items || [],
      evidence: evidence.items || [],
      erasure: erasure || { status: "none", destroyed: false, items: [] },
      rateCard: rateCard?.published ? rateCard : TRIAL_RATE_CARD,
      health: mapHealth(health),
      hermesHost: hermesHost || {
        status: health?.hermes || "not_configured",
        message: "Hermes Host status from health probe.",
        write_tools: false,
        mock: health?.hermes !== "reachable",
        pin: health?.hermes_pin || null,
      },
      operatorSeat,
      engineLabsLoop: coalesceEngineLabsLoop(engineLabsLoop),
      references,
      schedules: schedules.items || [],
    };
  } catch (error) {
    return {
      source: "error",
      apiBase: API_BASE,
      error: error.message,
      people: [],
      guests: [],
      teams: [],
      connections: CONNECTOR_CATALOG,
      threads: [],
      measurement: defaultMeasurement(),
      rateCard: TRIAL_RATE_CARD,
      health: mapHealth(await fetchHealth()),
      erasure: { status: "none", destroyed: false, items: [] },
      memory: [],
      strategy: [],
      personalisation: defaultPersonalisation(),
      view: { fallback: true, personalisation: false },
      domains: [],
      managedProjects: [],
      packs: [],
      proposals: [],
      evidence: [],
      references: defaultReferences(),
      schedules: [],
      engineLabsLoop: coalesceEngineLabsLoop(null),
    };
  }
}

export const OFFLINE_QUEUE_KEY = "papership-offline-queue";

export function readOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineEvidence(item) {
  const next = [...readOfflineQueue(), item];
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

export function wipeOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    sessionStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    /* */
  }
}

export async function syncOfflineQueue() {
  const queued = readOfflineQueue();
  if (!queued.length || !navigator.onLine) return queued;
  const remaining = [];
  for (const item of queued) {
    try {
      await fetch(`${API_BASE}/field-evidence`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(item),
      });
    } catch {
      remaining.push(item);
    }
  }
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    /* */
  }
  return remaining;
}

export function defaultPersonalisation() {
  return { enabled: false, default: false, inspect: { intent: "fallback", fallback: true, why: "Personalisation is off." }, pins: [], current: { fallback: true } };
}

export function defaultReferences() {
  return { currency: "AUD", calendar: "en-AU", timezone: "Australia/Sydney", kpi_default: "not_captured", metrics: [], status_labels: ["planned", "configured", "working", "unavailable"] };
}

export function defaultMeasurement() {
  return {
    title: "What Papership measures",
    owner: "Papership does not own your content. You do.",
    items: [
      "First-party, in-tenant usage events only.",
      "Identifier and enum fields: event name, ids, seat template, outcome code, token counts, tool-class counts, duration, cost band.",
      "No prompt text, names, emails, file contents, repository diffs, or secrets.",
      "No third-party analytics SDK, pixel, or replay.",
      "Events stay in the tenant store. A second seat is blocked until this notice is recorded on the API store (OQ-G2).",
      "Recording writes oq_g2_recorded on the Papership API. The Vercel static site cannot store this flag by itself.",
    ],
    oq_g2_recorded: false,
  };
}

function mapPerson(row) {
  const template = row.template || "member";
  const founder = row.id === "principal-founder";
  const availability = row.availability || "unknown";
  const workload = row.workload || "unknown";
  return {
    name: founder ? "Cam Douglas" : SEAT_LABEL[template] || row.id,
    initials: founder ? "CD" : (SEAT_LABEL[template] || "SE").slice(0, 2).toUpperCase(),
    av: founder ? "linear-gradient(135deg,#2563eb,#a78bfa)" : "var(--t3)",
    seat: SEAT_LABEL[template] || template,
    email: founder ? "founder@enginelabs.com.au" : "not issued",
    status: founder ? "Active" : "Issued",
    dot: founder ? "var(--green)" : "var(--t3)",
    availability,
    workload,
    leave: row.leave_reference || "",
    capacity: `${availability} · ${workload}`,
  };
}

function mapTeam(row) {
  return {
    name: row.name,
    meta: row.department || "Team",
    members: row.id || "",
  };
}

function statusStyle(status) {
  if (status === "working") {
    return { bg: "var(--green-soft)", ink: "var(--green)", dot: "var(--green)", bd: "var(--line)", glyphBg: "var(--t1)", glyphInk: "var(--canvas)" };
  }
  if (status === "configured") {
    return { bg: "var(--blue-soft)", ink: "var(--blue)", dot: "var(--blue)", bd: "var(--line)", glyphBg: "var(--raised)", glyphInk: "var(--t3)" };
  }
  if (status === "unavailable") {
    return { bg: "var(--red-soft)", ink: "var(--red)", dot: "var(--red)", bd: "rgba(225,29,72,.35)", glyphBg: "var(--raised)", glyphInk: "var(--t3)" };
  }
  return { bg: "var(--line2)", ink: "var(--t3)", dot: "var(--t3)", bd: "var(--line)", glyphBg: "var(--raised)", glyphInk: "var(--t3)" };
}

export function mapConnection(row, ui = {}) {
  const status = row.status || "planned";
  const styles = statusStyle(status);
  const provider = row.id;
  const actions =
    status === "configured" || status === "working"
      ? [
          { label: "Detail", bd: "var(--line)", ink: "var(--t2)", go: () => {} },
          { label: "Revoke", bd: "var(--red)", ink: "var(--red)", go: () => ui.setModal?.("revoke") },
        ]
      : [{ label: "Set up", bd: "var(--line)", ink: "var(--t2)", go: () => ui.openWizard?.(provider) }];
  return {
    id: provider,
    initials: row.initials || (row.label || row.name || row.id || "?").slice(0, 2).toUpperCase(),
    name: row.label || row.name || row.id,
    kind: row.kind || row.destination_class || "Connector",
    status,
    scope: row.scope || row.handoff || "",
    verified: row.verified || (row.last_sync ? `Last sync ${row.last_sync}` : "Not live"),
    recovery: row.recovery || "",
    actions,
    ...styles,
  };
}

export function applyPapershipOverlay(view, overlay, ui = {}) {
  const controls = typeof ui === "function" ? { setModal: ui } : ui;
  const out = { ...view };
  const measurement = overlay.measurement || defaultMeasurement();
  out.apiSource = overlay.source;
  out.apiError = overlay.error || "";
  out.apiBase = API_BASE;
  out.measurement = measurement;
  out.rateCard = overlay.rateCard || TRIAL_RATE_CARD;
  out.planTiers = (out.rateCard.plans || []).map(formatPlanTier);
  out.set_data = view.setTitle === "Data & retention";

  if (overlay.source === "loading") {
    out.people = [];
    out.peopleNote = "Loading people from Papership…";
    out.teams = [];
    out.teamsNote = "Loading teams from Papership…";
    out.threads = [];
    out.messages = [];
    out.ticketDetails = [];
    out.inboxNote = "Loading inbox from Papership…";
  } else {
    out.people = (overlay.people || []).map(mapPerson);
    out.peopleNote =
      overlay.source === "error"
        ? overlay.error
        : overlay.source === "unauthenticated"
          ? "No Papership API session. People stay empty until a local founder session is minted."
          : out.people.length
            ? ""
            : "No members yet.";
    const teams = overlay.teams && overlay.teams.length ? overlay.teams : [];
    out.teams = teams.map(mapTeam);
    out.teamsNote = out.teams.length ? "" : "No teams loaded. Founder can create teams after the API session is present.";
    out.threads = overlay.threads || [];
    out.messages = overlay.threads?.length ? view.messages : [];
    out.ticketDetails = overlay.threads?.length ? view.ticketDetails : [];
    out.inboxNote =
      overlay.source === "error"
        ? overlay.error
        : out.threads.length
          ? ""
          : "Inbox is empty. Papership does not show fixture mail on the product path.";
  }

  const catalog = overlay.connections?.length ? overlay.connections : CONNECTOR_CATALOG;
  out.connections = catalog.map((row) => mapConnection(row, controls));
  out.wizardProviders = catalog;

  const memoryItems = overlay.memory || [];
  const kinds = ["Sessions", "Preferences", "Projects", "Domains", "Organisation", "Skills"];
  out.memoryNav = kinds.map((label) => {
    const n = memoryItems.filter((item) => (item.kind || "").toLowerCase() === label.toLowerCase()).length;
    return { label, n: String(n), bg: n ? "var(--blue-soft)" : "transparent", fw: n ? "600" : "500" };
  });
  out.memoryRows = memoryItems.map((item, index) => ({
    title: item.title || item.id,
    kind: item.kind || "project",
    cls: item.class || item.content_class || "source",
    version: `v${item.version || 1}`,
    bg: index === 0 ? "var(--blue-soft)" : "transparent",
  }));
  const first = memoryItems[0];
  out.provenance = first
    ? [
        { k: "Source", v: first.provenance?.source || "native" },
        { k: "Owner", v: first.provenance?.owner || first.owner_principal_id || "" },
        { k: "Class", v: first.class || "" },
        { k: "Version", v: String(first.version || 1) },
        { k: "Restriction", v: first.restriction_scope || "none" },
      ]
    : [];
  out.memoryNote =
    overlay.source === "unauthenticated"
      ? "No Papership API session. Memory stays empty until a local founder session is minted."
      : overlay.source === "error"
        ? overlay.error
        : memoryItems.length
          ? ""
          : "No memory yet. Knowledge the assistant retains will appear here with its source.";
  out.memoryEmpty = !memoryItems.length;

  const personalisation = overlay.personalisation || defaultPersonalisation();
  if (view.setTitle === "Personalisation" || view.setPane === "Personalisation") {
    out.setDesc = personalisation.enabled ? "Adaptive views can apply trusted definitions." : "Adaptive views are off by default. Inspect, disable and reset live here.";
    out.setRows = [
      { k: "Adaptive views", v: personalisation.enabled ? "On" : "Off" },
      { k: "Intent", v: personalisation.inspect?.intent || "fallback" },
      { k: "Fallback", v: personalisation.inspect?.fallback ? "Seat template" : "Adapted" },
    ];
  }
  out.personalisation = personalisation;
  out.adaptedBadge = overlay.view?.fallback || !personalisation.enabled ? "" : `Adapted for: ${overlay.view?.intent || personalisation.inspect?.intent || "intent"}`;

  const strategy = overlay.strategy || [];
  out.strategyKpi = overlay.strategyKpi || overlay.references?.kpi_default || "not_captured";
  if (overlay.source !== "loading") {
    const goals = strategy.filter((row) => row.kind === "goal" || row.kind === "initiative");
    const decisions = strategy.filter((row) => row.kind === "decision" || row.kind === "risk_appetite");
    out.railPriorities = goals.map((row) => ({
      label: row.title,
      meta: `${row.kind} · KPI ${row.kpi_status || "not_captured"}`,
      pct: 0,
      pctw: "0%",
      due: "",
      dot: "var(--t3)",
      open: () => {},
    }));
    out.railDecisions = decisions.map((row) => ({
      label: row.title,
      meta: `${row.kind} · ${row.kpi_status || "not_captured"}`,
      open: () => {},
    }));
  }
  out.domainShells = overlay.domains || [];
  out.managedProjects = overlay.managedProjects || [];
  out.hermesHost = overlay.hermesHost || null;
  out.operatorSeat = overlay.operatorSeat || null;
  const loop = overlay.engineLabsLoop || null;
  out.engineLabsLoop = loop;
  out.lastEngineLabsJob =
    overlay.lastEngineLabsJob ||
    loop?.job ||
    null;
  out.packs = overlay.packs || [];
  out.proposals = overlay.proposals || [];
  out.evidence = overlay.evidence || [];
  out.references = overlay.references || defaultReferences();
  out.schedules = overlay.schedules || [];
  out.erasure = overlay.erasure || { status: "none", destroyed: false, items: [] };
  out.actionError = overlay.actionError || "";
  if (overlay.health?.kpis?.length) {
    out.healthStamp = overlay.health.stamp || "Last check now";
    out.kpis = overlay.health.kpis;
  }
  if (out.modes) {
    out.modes = out.modes.map((mode) => {
      if (!String(mode.label).startsWith("Automate")) return mode;
      return { ...mode, label: "Automate · configured", cursor: "pointer", ink: "var(--t2)" };
    });
  }

  // Prefer live domain catalogue statuses for the Integrations registry.
  if (overlay.domains?.length === 43) {
    const chip = (s) =>
      s === "working"
        ? { bg: "var(--green-soft)", ink: "var(--green)", dot: "var(--green)", action: "Open" }
        : s === "configured"
          ? { bg: "var(--blue-soft)", ink: "var(--blue)", dot: "var(--blue)", action: "Review" }
          : s === "unavailable"
            ? { bg: "var(--red-soft)", ink: "var(--red)", dot: "var(--red)", action: "Recover" }
            : { bg: "var(--line2)", ink: "var(--t3)", dot: "var(--t3)", action: "Plan" };
    const bRows = overlay.domains
      .filter((d) => String(d.id).startsWith("B"))
      .map((d) => ({ code: d.id, label: d.label, status: d.status || "planned", ...chip(d.status || "planned") }));
    const pRows = overlay.domains
      .filter((d) => String(d.id).startsWith("P"))
      .map((d) => ({ code: d.id, label: d.label, status: d.status || "planned", ...chip(d.status || "planned") }));
    out.registrySections = [
      { title: "Business domains", range: "B01–B24 · 24 groups", rows: bRows },
      { title: "Platform domains", range: "P01–P19 · 19 groups", rows: pRows },
    ];
    const all = bRows.concat(pRows);
    const cnt = (s) => String(all.filter((r) => r.status === s).length);
    out.registryFilters = [
      { label: "All", n: "43", dot: "var(--t3)", bg: "var(--surface)", bd: "var(--line)", ink: "var(--t1)" },
      { label: "Working", n: cnt("working"), dot: "var(--green)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
      { label: "Configured", n: cnt("configured"), dot: "var(--blue)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
      { label: "Planned", n: cnt("planned"), dot: "var(--t3)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
      { label: "Unavailable", n: cnt("unavailable"), dot: "var(--red)", bg: "transparent", bd: "var(--line)", ink: "var(--t2)" },
    ];
  }

  // Surface the first managed project (Papership / Engine Labs) at the top of Work → Projects.
  if (overlay.managedProjects?.length && Array.isArray(out.projects)) {
    const mapped = overlay.managedProjects.map((p) => ({
      name: p.name,
      key: p.slug || p.id,
      dept: "Engine Labs",
      status: p.status === "active" ? "on_track" : p.status || "planning",
      dot: "var(--blue)",
      priority: "Highest",
      pct: 0,
      pctw: "0%",
      due: "—",
      open: typeof out.projects[0]?.open === "function" ? out.projects[0].open : () => {},
      managed: true,
      projectId: p.id,
    }));
    const fixtureKeys = new Set(mapped.map((p) => p.key));
    out.projects = [...mapped, ...out.projects.filter((p) => !fixtureKeys.has(p.key))];
  }
  return out;
}
