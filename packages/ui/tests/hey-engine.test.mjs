import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/HeyEngineButton.tsx"), "utf8");

test("Hey Papership button opens assistant only", () => {
  assert.match(src, /Hey Papership/);
  assert.match(src, /onOpenAssistant/);
  assert.doesNotMatch(src, /Demo/);
  assert.doesNotMatch(src, /fake|simulated|canned/i);
  assert.doesNotMatch(src, /reply/);
});
