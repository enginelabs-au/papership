import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("product title is Papership", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /<title>Papership<\/title>/);
});

test("canonical product route is /papership", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  assert.match(app, /path="\/papership" element=\{<Papership/);
  assert.match(app, /path="\/cc-org-dash" element=\{<Navigate to="\/papership"/);
  assert.match(app, /path="\/" element=\{<Navigate to="\/papership"/);
});

test("localStorage keys are papership-* with legacy migrate", () => {
  const shell = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  assert.match(shell, /const AUTH_KEY = "papership-auth"/);
  assert.match(shell, /const THEME_KEY = "papership-theme"/);
  assert.match(shell, /const LEGACY_AUTH_KEY = "cc-org-dash-auth"/);
  assert.match(shell, /function migrateStored/);
});

test("narrow chrome uses blueprint-2 bottom tabs", () => {
  const app = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  const css = readFileSync(join(root, "src/blueprint2/blueprint2.css"), "utf8");
  assert.match(app, /className="bp2-bottom"/);
  assert.match(app, /BOTTOM_TABS = \["today", "work", "inbox"\]/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.bp2-hey \{/);
});

test("today compose has no unpublished allowance quantity", () => {
  const screens = readFileSync(join(root, "src/blueprint2/screens.jsx"), "utf8");
  const app = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  assert.doesNotMatch(screens, /184640|Remaining allowance:\s*\d/);
  assert.doesNotMatch(app, /184640|Remaining allowance:\s*\d/);
  assert.match(screens, /Remaining allowance: not captured/);
  assert.match(app, /Remaining allowance: not captured/);
});

test("trial rate card uses Free Pro Max Enterprise", () => {
  const api = readFileSync(join(root, "src/api/papership.js"), "utf8");
  assert.match(api, /id: "free"/);
  assert.match(api, /id: "pro"/);
  assert.match(api, /id: "max"/);
  assert.match(api, /id: "enterprise"/);
  assert.match(api, /tokens_month: 50000/);
  assert.match(api, /tokens_month: 200000/);
  assert.match(api, /tokens_month: 800000/);
  assert.match(api, /usd_month: 24/);
});

test("Data view has no unpublished trace counts or leftover prices", () => {
  const app = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  const leftover = readFileSync(join(root, "src/components/cc-org-dash/DataScreen.jsx"), "utf8");
  assert.match(app, /Traces · 24h[\s\S]*not captured/);
  assert.doesNotMatch(app, /value: "128"/);
  assert.doesNotMatch(leftover, /\$0\./);
});

test("PWA starts at /papership and registers a shell service worker", () => {
  const manifest = readFileSync(join(root, "public/manifest.json"), "utf8");
  const html = readFileSync(join(root, "index.html"), "utf8");
  const sw = readFileSync(join(root, "public/sw.js"), "utf8");
  assert.match(manifest, /"start_url": "\/papership"/);
  assert.match(html, /serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(sw, /papership-shell-v1/);
  assert.match(sw, /method !== "GET"/);
});

test("live API client has no OrgOS product name", () => {
  const api = readFileSync(join(root, "src/api/papership.js"), "utf8");
  assert.doesNotMatch(api, /OrgOS|orgos|cc-org/);
  assert.match(api, /papership-token/);
});

test("founder JWT stays in memory and sessionStorage, not localStorage", () => {
  const api = readFileSync(join(root, "src/api/papership.js"), "utf8");
  const app = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  assert.match(api, /sessionStorage\.setItem\("papership-token"/);
  assert.match(api, /localStorage\.removeItem\("papership-token"/);
  assert.match(api, /export function clearStoredSession/);
  assert.doesNotMatch(api, /localStorage\.setItem\("papership-token"/);
  assert.doesNotMatch(app, /localStorage\.setItem\("papership-token"/);
  assert.match(app, /clearStoredSession/);
});

test("API posts mint a local founder session when the JWT is missing", () => {
  const api = readFileSync(join(root, "src/api/papership.js"), "utf8");
  assert.match(api, /async function authHeaders/);
  assert.match(api, /await ensureLocalSession\(\)/);
  assert.match(api, /function sessionIsFresh/);
  assert.match(api, /response.status === 401 && !retried/);
});

test("local sign-in continues without a password check", () => {
  const app = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  assert.doesNotMatch(app, /if \(!email\.trim\(\) \|\| !password\)/);
  assert.match(app, /email and password are ignored/);
});

test("command room seat and workflows are deep-linkable", () => {
  const app = readFileSync(join(root, "src/blueprint2/App.jsx"), "utf8");
  const screens = readFileSync(join(root, "src/blueprint2/screens.jsx"), "utf8");
  assert.match(app, /#settings\/\$\{toSlug\(setPane/);
  assert.match(app, /goWorkflows/);
  assert.match(app, /goSeat/);
  assert.match(app, /commandRoom/);
  assert.match(app, /Work · Workflows/);
  assert.match(screens, /bp2-command-room/);
  assert.match(screens, /Start Founder loop/);
  assert.match(screens, /Advance to/);
  assert.match(app, /advanceEngineLabsLoop/);
  assert.match(screens, /seatSummary/);
});
