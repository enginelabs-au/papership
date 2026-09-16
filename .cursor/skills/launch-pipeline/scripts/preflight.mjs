#!/usr/bin/env node

import {
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
const defaultRepoRoot = resolve(scriptDir, "../../../..");

const requiredControlFiles = [
  "AGENTS.md",
  ".cursor/README.md",
  ".cursor/AGENTS.md",
  ".cursor/BOOTSTRAP.md",
  ".cursor/INSTRUCTIONS.md",
  ".cursor/USER.md",
  ".cursor/STATE.md",
  ".cursor/SKILLS.md",
  ".cursor/TOOLS.md",
  ".cursor/memory/MEMORY.md",
  ".cursor/instructions/LAUNCH.md",
  ".cursor/instructions/STRATEGY.md",
  ".cursor/instructions/PROJECT_PLANNING.md",
  ".cursor/instructions/SUBAGENTS.md",
  ".cursor/instructions/ROLES.md",
  ".cursor/scripts/bootstrap.sh",
  ".cursor/scripts/validate-agent-config.mjs",
  ".cursor/skills/launch-pipeline/SKILL.md",
  ".cursor/skills/launch-pipeline/scripts/preflight.mjs",
  ".cursor/skills/launch-pipeline/scripts/validate-launch.mjs",
];

const materializedDirectories = [
  "docs",
  "docs/blueprints",
  "docs/plans",
  "docs/decisions",
  "docs/handover",
  "docs/workstreams",
];

const seededIndexes = [
  "docs/README.md",
  "docs/plans/README.md",
  "docs/workstreams/README.md",
];

const jsonFiles = [
  ".cursor/hooks.json",
  ".cursor/cli.json",
  ".cursor/sandbox.json",
  ".cursor/permissions.json",
  ".cursor/config/settings.json",
];

function pathFor(repoRoot, relativePath) {
  return resolve(repoRoot, relativePath);
}

function isNonEmptyFile(repoRoot, relativePath) {
  try {
    return statSync(pathFor(repoRoot, relativePath)).isFile() &&
      statSync(pathFor(repoRoot, relativePath)).size > 0;
  } catch {
    return false;
  }
}

function isDirectory(repoRoot, relativePath) {
  try {
    return statSync(pathFor(repoRoot, relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function normalizeSectionValue(value) {
  const normalized = String(value ?? "").trim();
  if (
    /^(?:none|none\.|none recorded|none recorded\.)$/i.test(normalized) ||
    normalized.length === 0
  ) {
    return null;
  }
  return normalized;
}

export function extractSection(markdown, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown).match(
    new RegExp(
      `^##[ \\t]+${escapedHeading}[ \\t]*$\\n?([\\s\\S]*?)(?=^##[ \\t]+|(?![\\s\\S]))`,
      "m",
    ),
  );
  return match?.[1]?.trim() ?? "";
}

function firstBullet(section) {
  return section.match(/^-\s+(.+)$/m)?.[1]?.trim() ?? "";
}

export function summarizeState(markdown) {
  const currentStatus = normalizeSectionValue(
    firstBullet(extractSection(markdown, "Current Status")),
  );
  const activePlan = normalizeSectionValue(
    firstBullet(extractSection(markdown, "Active Plan")),
  );
  const activeWorkstream = normalizeSectionValue(
    firstBullet(extractSection(markdown, "Active Workstream")),
  );
  const activeRoleAndGate = normalizeSectionValue(
    firstBullet(extractSection(markdown, "Active Role and Gate")),
  );
  const pendingRemediation = normalizeSectionValue(
    firstBullet(extractSection(markdown, "Pending Remediation")),
  );
  const ownerDecision = normalizeSectionValue(
    firstBullet(extractSection(markdown, "Owner Decision")),
  );

  return {
    current_status: currentStatus,
    active_plan: activePlan,
    active_workstream: activeWorkstream,
    active_role_and_gate: activeRoleAndGate,
    pending_remediation: pendingRemediation,
    owner_decision: ownerDecision,
  };
}

export function inferModeHint(state) {
  if (state.pending_remediation) return "remediation";

  if (
    state.active_workstream &&
    state.owner_decision &&
    /owner review|owner decision|ready for owner/i.test(
      state.current_status ?? "",
    )
  ) {
    return "closure";
  }

  if (state.active_workstream || state.active_plan || state.active_role_and_gate) {
    return "resume";
  }

  return "undetermined";
}

export function classifyLifecycleMode(request, state = {}) {
  const text = String(request ?? "").toLowerCase();

  if (
    /\b(?:remediat|re-?verif|failed gate|blocking finding|security finding)\w*/i.test(
      text,
    )
  ) {
    return "remediation";
  }

  if (
    /\b(?:closure|close (?:the )?workstream|owner handoff|release readiness|final implementation checklist)\b/i.test(
      text,
    )
  ) {
    return "closure";
  }

  if (/\b(?:resume|continue|pick up|carry on)\b/i.test(text)) {
    return "resume";
  }

  if (
    /\b(?:major feature|migration|multi-system|platform change|substantial refactor)\b/i.test(
      text,
    )
  ) {
    return "major-change";
  }

  if (
    /\b(?:new idea|new product|new app|new application|start a product|build a product)\b/i.test(
      text,
    )
  ) {
    return "new-idea";
  }

  return inferModeHint(state);
}

function validateJsonFiles(repoRoot) {
  const invalid = [];

  for (const relativePath of jsonFiles) {
    try {
      JSON.parse(readFileSync(pathFor(repoRoot, relativePath), "utf8"));
    } catch (error) {
      invalid.push({
        path: relativePath,
        reason: error.message,
      });
    }
  }

  return invalid;
}

function settingsLinkStatus(repoRoot) {
  const linkPath = pathFor(repoRoot, ".cursor/settings.json");
  const targetPath = pathFor(repoRoot, ".cursor/config/settings.json");

  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return "invalid";
    return realpathSync(linkPath) === realpathSync(targetPath)
      ? "valid"
      : "invalid";
  } catch {
    return "missing";
  }
}

export function collectPreflight(repoRoot = defaultRepoRoot) {
  const missingControlFiles = requiredControlFiles.filter(
    (relativePath) => !isNonEmptyFile(repoRoot, relativePath),
  );
  const missingDirectories = materializedDirectories.filter(
    (relativePath) => !isDirectory(repoRoot, relativePath),
  );
  const missingIndexes = seededIndexes.filter(
    (relativePath) => !isNonEmptyFile(repoRoot, relativePath),
  );
  const invalidJson = validateJsonFiles(repoRoot);
  const settingsLink = settingsLinkStatus(repoRoot);

  let state = {};
  try {
    state = summarizeState(
      readFileSync(pathFor(repoRoot, ".cursor/STATE.md"), "utf8"),
    );
  } catch {
    state = summarizeState("");
  }

  const modeHint = inferModeHint(state);
  const bootstrapRequired =
    missingDirectories.length > 0 ||
    missingIndexes.length > 0 ||
    settingsLink !== "valid";
  const configurationHealthy =
    missingControlFiles.length === 0 && invalidJson.length === 0;
  const status = !configurationHealthy
    ? "BLOCKED"
    : bootstrapRequired
      ? "MATERIALIZATION_REQUIRED"
      : "READY";

  return {
    schema_version: 1,
    read_only: true,
    checked_at: new Date().toISOString(),
    status,
    repository_root: repoRoot,
    configuration: {
      healthy: configurationHealthy,
      missing_control_files: missingControlFiles,
      invalid_json: invalidJson,
    },
    materialization: {
      bootstrap_required: bootstrapRequired,
      missing_directories: missingDirectories,
      missing_indexes: missingIndexes,
      settings_link: settingsLink,
    },
    state: {
      ...state,
      mode_hint: modeHint,
    },
    question_hints:
      modeHint === "undetermined"
        ? ["lifecycle_mode"]
        : ["confirm_resume_or_start_new"],
    next_action: !configurationHealthy
      ? "Repair the reported control-plane defect before launch."
      : bootstrapRequired
        ? "Plan first; run bootstrap only after Build or authorized Agent execution."
        : "Continue to adaptive intake and lifecycle routing.",
  };
}

function main() {
  const report = collectPreflight();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.configuration.healthy) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}
