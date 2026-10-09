import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../src");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|jsx|js|mjs|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

test("production src does not import fixtures or store auth in localStorage", () => {
  const files = walk(srcRoot);
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const rel = relative(srcRoot, file);
    if (/data\.jsx|entities\.js/.test(text)) hits.push(`${rel}: fixture import`);
    if (/from ['"].*localStorage|localStorage\.(get|set|remove)Item/.test(text)) {
      hits.push(`${rel}: localStorage`);
    }
    if (/GoogleSignIn|demo@|founder@example/.test(text)) hits.push(`${rel}: forbidden auth pattern`);
  }
  assert.equal(hits.length, 0, hits.join("\n"));
});

test("Tauri product is Papership and loads /", () => {
  const conf = readFileSync(join(srcRoot, "../src-tauri/tauri.conf.json"), "utf8");
  assert.match(conf, /"productName": "Papership"/);
  assert.match(conf, /"title": "Papership"/);
  assert.match(conf, /devUrl": "http:\/\/127\.0\.0\.1:5173\/"/);
  assert.doesNotMatch(conf, /OrgOS|orgos/);
});

test("index.html has no external font URLs", () => {
  const html = readFileSync(join(srcRoot, "../index.html"), "utf8");
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|fonts\.google/);
  assert.match(html, /\/fonts\/local\.css/);
});
