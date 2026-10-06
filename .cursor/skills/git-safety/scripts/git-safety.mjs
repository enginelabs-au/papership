#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const CURSOR_ANONYMOUS_NAME = "Cursor Agent";
export const CURSOR_ANONYMOUS_EMAIL = "cursoragent@noreply.github.com";

const MAX_SCAN_BYTES = 1_000_000;
const PEM_BEGIN = `-----${"BEGIN"}`;
const PEM_KEY_END = `KEY${"-----"}`;

const SECRET_CONTENT_RULES = [
  { id: "private-key", re: new RegExp(`${PEM_BEGIN}(?: [A-Z0-9]+)* PRIVATE ${PEM_KEY_END}`) },
  { id: "pkcs8-key", re: new RegExp(`${PEM_BEGIN} ENCRYPTED PRIVATE ${PEM_KEY_END}`) },
  { id: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-token", re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { id: "stripe-live-key", re: /\bsk_live_[0-9a-zA-Z]{10,}\b/ },
  { id: "slack-token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  {
    id: "assignment-secret",
    re: /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|password|passwd|secret)\b\s*[:=]\s*['"][^'"]{8,}['"]/i,
  },
];

function normalize(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^file:\/\//, "")
    .replace(/\/+/g, "/");
}

function fileName(value) {
  return normalize(value).split("/").at(-1) ?? "";
}

function stripQuotes(value) {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export function isAllowedAnonymousEmail(email) {
  const value = stripQuotes(email).toLowerCase();
  return (
    value === CURSOR_ANONYMOUS_EMAIL ||
    /^[a-z0-9._+-]+@users\.noreply\.github\.com$/.test(value)
  );
}

export function isSecretPath(value) {
  const path = normalize(value);
  const name = fileName(path);

  if (
    /^\.env(?:\.|$)/i.test(name) &&
    !/^\.env\.(?:example|sample|template)$/i.test(name)
  ) {
    return true;
  }

  return (
    /\.(?:pem|key|p12|pfx|p8|keystore|jks)$/i.test(name) ||
    /^(?:credentials?|secrets?|auth)\.json$/i.test(name) ||
    /service[-_]?account.*\.json$/i.test(name) ||
    /^id_(?:rsa|ed25519|ecdsa|dsa)$/i.test(name) ||
    /(^|\/)\.aws\/credentials$/i.test(path) ||
    /(^|\/)\.config\/gcloud\/application_default_credentials\.json$/i.test(path) ||
    /(^|\/)\.docker\/config\.json$/i.test(path) ||
    /(^|\/)(?:\.netrc|\.npmrc|\.pypirc)$/i.test(path)
  );
}

export function commandReferencesSecret(command) {
  const value = String(command ?? "");
  const withoutTemplates = value
    .replace(/\.env\.(?:example|sample|template)\b/gi, "")
    .replace(/\bid_(?:rsa|ed25519|ecdsa|dsa)\.pub\b/gi, "");

  return (
    /(^|[\s"'=:/\\])\.env(?:\.[\w.-]+)?\b/i.test(withoutTemplates) ||
    /\.(?:pem|key|p12|pfx|p8|keystore|jks)\b/i.test(value) ||
    /\b(?:credentials?|secrets?|auth)\.json\b/i.test(value) ||
    /service[-_]?account.*\.json/i.test(value) ||
    /(?:^|[\s"'=:/\\])(?:\.netrc|\.npmrc|\.pypirc)\b/i.test(value) ||
    /\.aws[\\/]credentials\b/i.test(value) ||
    /application_default_credentials\.json\b/i.test(value)
  );
}

export function isGitConfigMutation(command) {
  const value = String(command ?? "");
  if (!/\bgit\s+config\b/i.test(value)) return false;
  return !/\bgit\s+config\b[^;&|\n]*(?:--get(?:-all|-regexp)?|--list|-l)\b/i.test(
    value,
  );
}

function hasFlag(command, flag) {
  const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s=])${escaped}(?:\\s|$)`).test(command);
}

export function isGitCommitCreating(command) {
  const value = String(command ?? "");
  if (!/(?:^|[;&|\s])git\s+/i.test(value)) return false;
  if (
    hasFlag(value, "--help") ||
    hasFlag(value, "-h") ||
    hasFlag(value, "--abort") ||
    hasFlag(value, "--quit")
  ) {
    return false;
  }
  if (/\bgit\b[\s\S]*\b(?:commit(?:-tree)?|cherry-pick|\bam\b)\b/i.test(value)) {
    return true;
  }
  if (/\bgit\b[\s\S]*\brebase\b/i.test(value)) return true;
  if (/\bgit\b[\s\S]*\bmerge\b/i.test(value) && !hasFlag(value, "--ff-only")) {
    return true;
  }
  if (/\bgit\b[\s\S]*\bpull\b/i.test(value) && !hasFlag(value, "--ff-only")) {
    return true;
  }
  if (/\bgit\b[\s\S]*\btag\b/i.test(value) && /\s-(?:a|s|u)\b/.test(value)) {
    return true;
  }
  if (/\bgit\b[\s\S]*\bnotes\s+add\b/i.test(value)) return true;
  return false;
}

function extractAssignment(command, name) {
  const match = String(command ?? "").match(
    new RegExp(`(?:^|[\\s;|&])${name}=([^\\s;|&]+)`),
  );
  return match ? stripQuotes(match[1]) : "";
}

export function extractGitIdentityEmails(command) {
  const value = String(command ?? "");
  const emails = [];
  const author = extractAssignment(value, "GIT_AUTHOR_EMAIL");
  const committer = extractAssignment(value, "GIT_COMMITTER_EMAIL");
  if (author) emails.push(author);
  if (committer) emails.push(committer);
  for (const match of value.matchAll(/(?:^|\s)-c\s+user\.email=([^\s;|&]+)/gi)) {
    emails.push(stripQuotes(match[1]));
  }
  return emails;
}

export function usesForbiddenGitIdentity(command) {
  if (isGitConfigMutation(command)) return true;
  if (!isGitCommitCreating(command)) return false;

  const emails = extractGitIdentityEmails(command);
  if (emails.some((email) => !isAllowedAnonymousEmail(email))) return true;

  const hasDashC = emails.some((email) =>
    String(command).toLowerCase().includes(`user.email=${email.toLowerCase()}`),
  );
  const hasAuthor = Boolean(extractAssignment(command, "GIT_AUTHOR_EMAIL") || hasDashC);
  const hasCommitter = Boolean(
    extractAssignment(command, "GIT_COMMITTER_EMAIL") || hasDashC,
  );
  return !(hasAuthor && hasCommitter);
}

export function requiredAnonymousGitPrefix() {
  return [
    `GIT_AUTHOR_NAME='${CURSOR_ANONYMOUS_NAME}'`,
    `GIT_AUTHOR_EMAIL='${CURSOR_ANONYMOUS_EMAIL}'`,
    `GIT_COMMITTER_NAME='${CURSOR_ANONYMOUS_NAME}'`,
    `GIT_COMMITTER_EMAIL='${CURSOR_ANONYMOUS_EMAIL}'`,
  ].join(" ");
}

export function scanTextForSecretRuleIds(text) {
  const value = String(text ?? "");
  const hits = [];
  for (const rule of SECRET_CONTENT_RULES) {
    if (rule.re.test(value)) hits.push(rule.id);
  }
  return hits;
}

function identEmail(ident) {
  const match = String(ident ?? "").match(/<([^>]+)>/);
  return match?.[1] ?? "";
}

function gitVar(name) {
  try {
    return execFileSync("git", ["var", name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function currentCommitEmails() {
  return {
    author:
      process.env.GIT_AUTHOR_EMAIL || identEmail(gitVar("GIT_AUTHOR_IDENT")),
    committer:
      process.env.GIT_COMMITTER_EMAIL ||
      identEmail(gitVar("GIT_COMMITTER_IDENT")),
  };
}

export function assertAnonymousCommitIdentity() {
  const { author, committer } = currentCommitEmails();
  const rejected = [author, committer].filter(
    (email) => !isAllowedAnonymousEmail(email),
  );
  if (rejected.length === 0) return;

  process.stderr.write(
    "git-safety: refusing git identity that is not the Cursor anonymous email " +
      `(${CURSOR_ANONYMOUS_EMAIL}) or a GitHub noreply address.\n` +
      `Use:\n  ${requiredAnonymousGitPrefix()} git <command>\n`,
  );
  process.exit(1);
}

function stagedNames() {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "-z"],
    { encoding: "utf8" },
  );
  return output.split("\0").filter(Boolean);
}

export function assertNoStagedSecrets() {
  const names = stagedNames();
  const blocked = [];

  for (const name of names) {
    if (isSecretPath(name)) {
      blocked.push(`${name} (secret-bearing path)`);
      continue;
    }

    try {
      const size = Number(
        execFileSync("git", ["cat-file", "-s", `:${name}`], {
          encoding: "utf8",
        }).trim(),
      );
      if (!Number.isFinite(size) || size <= 0 || size > MAX_SCAN_BYTES) continue;
      const bytes = execFileSync("git", ["cat-file", "-p", `:${name}`]);
      if (bytes.includes(0)) continue;
      const hits = scanTextForSecretRuleIds(bytes.toString("utf8"));
      if (hits.length > 0) {
        blocked.push(`${name} (${hits.join(", ")})`);
      }
    } catch {
      // Missing or deleted staged paths are not secret-bearing content.
    }
  }

  if (blocked.length === 0) return;

  process.stderr.write(
    "git-safety: refusing to commit secret or credential material:\n" +
      blocked.map((item) => `  - ${item}\n`).join(""),
  );
  process.exit(1);
}

export function assertPushIdentities(range) {
  if (!range) return;
  const output = execFileSync(
    "git",
    ["log", "--format=%ae%n%ce", range],
    { encoding: "utf8" },
  );
  const emails = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (emails.some((email) => !isAllowedAnonymousEmail(email))) {
    process.stderr.write(
      "git-safety: push contains a commit that does not use the Cursor anonymous email " +
        `or a GitHub noreply address. Required: ${CURSOR_ANONYMOUS_EMAIL}\n`,
    );
    process.exit(1);
  }
}

function checkPushStdin() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) return;
  for (const line of input.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const localSha = parts[1];
    const remoteSha = parts[3];
    if (/^0+$/.test(localSha)) continue;
    const range = /^0+$/.test(remoteSha)
      ? localSha
      : `${remoteSha}..${localSha}`;
    assertPushIdentities(range);
  }
}

function main(argv) {
  const mode = argv[2];
  if (mode === "identity") {
    assertAnonymousCommitIdentity();
    return;
  }
  if (mode === "staged") {
    assertNoStagedSecrets();
    return;
  }
  if (mode === "commit") {
    assertAnonymousCommitIdentity();
    assertNoStagedSecrets();
    return;
  }
  if (mode === "push") {
    checkPushStdin();
    return;
  }
  process.stderr.write(
    "git-safety usage: identity | staged | commit | push\n",
  );
  process.exit(2);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv);
}
