#!/usr/bin/env node

import {
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../..");
const errors = [];

const roleIds = [
  "product-manager-subagent",
  "ui-ux-developer-subagent",
  "software-engineer-subagent",
  "security-engineer-subagent",
  "growth-marketing-subagent",
  "project-lead-subagent",
];

const requiredFiles = [
  "AGENTS.md",
  "docs/README.md",
  "docs/plans/README.md",
  "docs/workstreams/README.md",
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
  ".cursor/skills/launch-pipeline/SKILL.md",
  ".cursor/skills/launch-pipeline/scripts/preflight.mjs",
  ".cursor/skills/launch-pipeline/scripts/preflight.test.mjs",
  ".cursor/skills/launch-pipeline/scripts/validate-launch.mjs",
  ".cursor/templates/docs-readme.md",
  ".cursor/templates/plans-readme.md",
  ".cursor/templates/workstreams-readme.md",
  ".cursor/config/README.md",
  ".cursor/hooks.json",
  ".cursor/cli.json",
  ".cursor/sandbox.json",
  ".cursor/permissions.json",
];

const requiredDirectories = [
  "docs",
  "docs/blueprints",
  "docs/plans",
  "docs/decisions",
  "docs/handover",
  "docs/workstreams",
];

function pathFor(relativePath) {
  return resolve(repoRoot, relativePath);
}

function read(relativePath) {
  return readFileSync(pathFor(relativePath), "utf8");
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function walkFiles(relativeDirectory) {
  const files = [];

  for (const entry of readdirSync(pathFor(relativeDirectory), {
    withFileTypes: true,
  })) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...walkFiles(relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files.sort();
}

function linked(kind, owners, term) {
  return { kind, owners, term };
}

function classifyControlPlaneFile(relativePath) {
  if (
    /^\.cursor\/rules\/[^/]+\.mdc$/.test(relativePath) ||
    /^\.cursor\/agents\/[^/]+\.md$/.test(relativePath) ||
    /^\.cursor\/skills\/[^/]+\/SKILL\.md$/.test(relativePath) ||
    [
      ".cursor/hooks.json",
      ".cursor/cli.json",
      ".cursor/sandbox.json",
      ".cursor/permissions.json",
    ].includes(relativePath)
  ) {
    return { kind: "native" };
  }

  const exactLinks = new Map([
    [
      ".cursor/README.md",
      linked(
        "indexed",
        [".cursor/skills/launch-pipeline/SKILL.md"],
        "../../README.md",
      ),
    ],
    [
      ".cursor/AGENTS.md",
      linked("routed", ["AGENTS.md"], ".cursor/AGENTS.md"),
    ],
    [
      ".cursor/BOOTSTRAP.md",
      linked("routed", [".cursor/AGENTS.md"], "/BOOTSTRAP.md"),
    ],
    [
      ".cursor/INSTRUCTIONS.md",
      linked("routed", [".cursor/AGENTS.md"], "/INSTRUCTIONS.md"),
    ],
    [
      ".cursor/USER.md",
      linked("routed", [".cursor/AGENTS.md"], "/USER.md"),
    ],
    [
      ".cursor/STATE.md",
      linked("routed", [".cursor/AGENTS.md"], "/STATE.md"),
    ],
    [
      ".cursor/SKILLS.md",
      linked("routed", [".cursor/AGENTS.md"], "/SKILLS.md"),
    ],
    [
      ".cursor/TOOLS.md",
      linked("routed", [".cursor/AGENTS.md"], "/TOOLS.md"),
    ],
    [
      ".cursor/memory/MEMORY.md",
      linked("routed", [".cursor/AGENTS.md"], "/memory/MEMORY.md"),
    ],
    [
      ".cursor/config/README.md",
      linked("indexed", [".cursor/README.md"], "config/README.md"),
    ],
    [
      ".cursor/config/settings.json",
      linked("indexed", [".cursor/config/README.md"], "/config/settings.json"),
    ],
    [
      ".cursor/settings.json",
      linked("compatibility", [".cursor/config/README.md"], "/settings.json"),
    ],
    [
      ".cursor/hooks/policy.mjs",
      linked("indexed", [".cursor/hooks.json"], ".cursor/hooks/policy.mjs"),
    ],
    [
      ".cursor/hooks/policy.test.mjs",
      linked("indexed", [".cursor/README.md"], "hooks/policy.test.mjs"),
    ],
    [
      ".cursor/scripts/bootstrap.sh",
      linked(
        "indexed",
        [
          ".cursor/skills/launch-pipeline/SKILL.md",
          ".cursor/BOOTSTRAP.md",
        ],
        "scripts/bootstrap.sh",
      ),
    ],
    [
      ".cursor/scripts/validate-agent-config.mjs",
      linked(
        "indexed",
        [".cursor/scripts/bootstrap.sh", ".cursor/README.md"],
        "scripts/validate-agent-config.mjs",
      ),
    ],
  ]);

  if (exactLinks.has(relativePath)) return exactLinks.get(relativePath);

  if (/^\.cursor\/instructions\/[^/]+\.md$/.test(relativePath)) {
    const name = relativePath.split("/").at(-1);
    return linked(
      "routed",
      [
        ".cursor/INSTRUCTIONS.md",
        ".cursor/skills/launch-pipeline/SKILL.md",
        ".cursor/instructions/LAUNCH.md",
      ],
      `/instructions/${name}`,
    );
  }

  if (/^\.cursor\/templates\/[^/]+$/.test(relativePath)) {
    return linked(
      "indexed",
      [".cursor/BOOTSTRAP.md"],
      relativePath.split("/").at(-1),
    );
  }

  const skillSupport = relativePath.match(
    /^\.cursor\/skills\/([^/]+)\/(.+)$/,
  );
  if (skillSupport) {
    const [, skillId, supportPath] = skillSupport;
    return linked(
      "indexed",
      [`.cursor/skills/${skillId}/SKILL.md`],
      supportPath,
    );
  }

  if (/^\.cursor\/memory\/runbooks\/[^/]+\.md$/.test(relativePath)) {
    return linked(
      "indexed",
      [".cursor/memory/MEMORY.md", ".cursor/TOOLS.md"],
      relativePath.split("/").at(-1),
    );
  }

  if (
    /^\.cursor\/memory\/(?:memories|blockers|blockers-fixed)\/.+$/.test(
      relativePath,
    )
  ) {
    return { kind: "generated-history" };
  }

  return { kind: "invalid" };
}

function validateReachability() {
  const counts = new Map();
  const files = walkFiles(".cursor");

  for (const relativePath of files) {
    const classification = classifyControlPlaneFile(relativePath);
    counts.set(
      classification.kind,
      (counts.get(classification.kind) ?? 0) + 1,
    );

    if (classification.kind === "invalid") {
      errors.push(
        `${relativePath} is orphaned: no native loader, router, index, or history classification`,
      );
      continue;
    }

    if (!classification.owners) continue;

    const referenced = classification.owners.some((owner) => {
      try {
        return read(owner).includes(classification.term);
      } catch {
        return false;
      }
    });

    expect(
      referenced,
      `${relativePath} is not linked by ${classification.owners.join(" or ")} using ${classification.term}`,
    );
  }

  try {
    expect(
      lstatSync(pathFor(".cursor/settings.json")).isSymbolicLink(),
      ".cursor/settings.json must remain a compatibility symlink",
    );
  } catch {
    errors.push(".cursor/settings.json compatibility symlink is missing");
  }

  return { counts, total: files.length };
}

for (const relativePath of requiredFiles) {
  try {
    expect(statSync(pathFor(relativePath)).size > 0, `${relativePath} is empty`);
  } catch {
    errors.push(`${relativePath} is missing`);
  }
}

for (const relativePath of requiredDirectories) {
  try {
    expect(
      statSync(pathFor(relativePath)).isDirectory(),
      `${relativePath} is not a directory`,
    );
  } catch {
    errors.push(`${relativePath} is missing`);
  }
}

for (const roleId of roleIds) {
  const adapter = `.cursor/agents/${roleId}.md`;
  try {
    expect(statSync(pathFor(adapter)).size > 0, `${adapter} is empty`);
  } catch {
    errors.push(`${adapter} is missing`);
  }
}

const references = new Map([
  [
    ".cursor/instructions/LAUNCH.md",
    [
      "AGENTS.md",
      "/AGENTS.md",
      "/BOOTSTRAP.md",
      "/scripts/bootstrap.sh",
      "/USER.md",
      "/STATE.md",
      "/INSTRUCTIONS.md",
      "/SKILLS.md",
      "/TOOLS.md",
      "/memory/MEMORY.md",
      "/instructions/STRATEGY.md",
      "/instructions/PROJECT_PLANNING.md",
      "/instructions/SUBAGENTS.md",
      "/instructions/ROLES.md",
      "/hooks.json",
      "/cli.json",
      "/sandbox.json",
      "/permissions.json",
      "First post-Build action",
      "bash .cursor/scripts/bootstrap.sh",
      ...roleIds,
    ],
  ],
  [
    ".cursor/skills/launch-pipeline/SKILL.md",
    [
      "name: launch-pipeline",
      "disable-model-invocation: true",
      ".cursor/instructions/LAUNCH.md",
      ".cursor/scripts/bootstrap.sh",
      "First post-Build action",
      "bash .cursor/scripts/bootstrap.sh",
      "scripts/preflight.mjs",
      "scripts/preflight.test.mjs",
      "scripts/validate-launch.mjs",
      "AGENTS.md",
    ],
  ],
  [
    ".cursor/scripts/bootstrap.sh",
    [
      "docs/blueprints",
      "docs/plans",
      "docs/decisions",
      "docs/handover",
      "docs/workstreams",
      "templates/docs-readme.md",
      "templates/plans-readme.md",
      "templates/workstreams-readme.md",
      "scripts/validate-agent-config.mjs",
    ],
  ],
  [".cursor/instructions/PROJECT_PLANNING.md", ["/instructions/LAUNCH.md"]],
  [".cursor/instructions/STRATEGY.md", ["/instructions/LAUNCH.md"]],
  [".cursor/instructions/SUBAGENTS.md", ["/instructions/LAUNCH.md"]],
  [".cursor/USER.md", ["/launch-pipeline"]],
  [".cursor/SKILLS.md", ["launch-pipeline", "/instructions/LAUNCH.md"]],
  [".cursor/TOOLS.md", ["/launch-pipeline", "/instructions/LAUNCH.md"]],
  [".cursor/memory/MEMORY.md", ["/launch-pipeline", "/instructions/LAUNCH.md"]],
  [
    ".cursor/BOOTSTRAP.md",
    [
      "/instructions/LAUNCH.md",
      "/skills/launch-pipeline/SKILL.md",
      "docs/blueprints/",
      "docs/plans/",
      "docs/decisions/",
      "docs/handover/",
      "docs/workstreams/",
    ],
  ],
  [".cursor/README.md", ["/launch-pipeline", "config/README.md"]],
  [
    ".cursor/config/README.md",
    ["hooks.json", "cli.json", "sandbox.json", "permissions.json"],
  ],
]);

for (const [relativePath, terms] of references) {
  try {
    const text = read(relativePath);
    for (const term of terms) {
      expect(text.includes(term), `${relativePath} does not reference ${term}`);
    }
  } catch {
    // Missing files are reported above.
  }
}

for (const relativePath of [
  ".cursor/hooks.json",
  ".cursor/cli.json",
  ".cursor/sandbox.json",
  ".cursor/permissions.json",
]) {
  try {
    JSON.parse(read(relativePath));
  } catch (error) {
    errors.push(`${relativePath} is invalid JSON: ${error.message}`);
  }
}

const reachability = validateReachability();

if (errors.length > 0) {
  for (const error of errors) {
    process.stderr.write(`launch validation error: ${error}\n`);
  }
  process.exit(1);
}

const reachabilitySummary = [...reachability.counts.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([kind, count]) => `${kind}=${count}`)
  .join(", ");

process.stdout.write(
  `launch pipeline validation complete: ${reachability.total} control-plane files (${reachabilitySummary})\n`,
);
