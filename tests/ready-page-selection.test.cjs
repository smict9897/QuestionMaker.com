const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const mod = new Module("ready-page-selection");
mod._compile(
  ts.transpileModule(fs.readFileSync("lib/ready-page-selection.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  "ready-page-selection",
);
const { selectionWithPage } = mod.exports;
test("page shortcut selects the clicked page and preserves existing selection order", () => {
  assert.deepEqual(selectionWithPage([], 2), [2]);
  const old = [4, 1];
  assert.deepEqual(selectionWithPage(old, 2), [4, 1, 2]);
  assert.deepEqual(old, [4, 1]);
  assert.deepEqual(selectionWithPage([4, 1], 1), [4, 1]);
});
test("page shortcut respects the ten page cap without dropping existing pages", () => {
  const full = Array.from({ length: 10 }, (_, i) => i + 1);
  assert.equal(selectionWithPage(full, 11), null);
  assert.deepEqual(selectionWithPage(full, 5), full);
  assert.deepEqual(selectionWithPage(full.slice(0, 9), 10), full);
});
test("shortcut preserves checkbox and routes exact new selection through existing checkout gate", () => {
  const studio = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(studio, /onChange=\{\(\) => togglePage\(i \+ 1\)\}/);
  assert.match(studio, /onClick=\{\(\) => createFromPage\(i \+ 1\)\}/);
  assert.match(studio, /selectionWithPage\(selected, page\)/);
  assert.match(studio, /setSelected\(next\);\s*openSetup\(next\)/);
  assert.match(studio, /paidSelection === readySelectionIdentity\(selection\)/);
  assert.match(studio, /else setCheckout\(true\)/);
  assert.match(studio, /selected=\{selected\}/);
  assert.match(studio, /className="rp-page-create"\s*disabled=\{busy\}/);
});
