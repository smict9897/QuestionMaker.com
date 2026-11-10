const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
test("global paper-only print isolation does not hide booklet clones outside #paper", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");
  assert.match(css, /body:not\(\.booklet-print\):has\(#paper\)/);
  assert.match(
    css,
    /body\.booklet-print \.booklet-output,body\.booklet-print \.booklet-output \*\{visibility:visible !important\}/,
  );
});
test("ordinary download explicitly prints normal mode regardless of saved booklet preference", () => {
  const src = fs.readFileSync("components/qb-builder.tsx", "utf8");
  assert.match(
    src,
    /async function print\(mode: "normal" \| "booklet" = "normal"\)/,
  );
  assert.match(src, /onClick=\{\(\) => void print\("normal"\)\}/);
  assert.match(src, /onPrint=\{\(\) => void print\("normal"\)\}/);
  assert.match(src, /if \(mode === "normal"\)/);
  assert.doesNotMatch(src, /if \(!s.cfg.booklet\)/);
  assert.match(src, /printCleanup.current\?\.\(\)/);
  assert.match(src, /window.confirm\(/);
});
test("print media cannot repaginate from the hidden zero-height measurement tree", () => {
  const src = fs.readFileSync("components/paper-builder/preview.tsx", "utf8");
  assert.match(
    src,
    /window.matchMedia\("print"\).matches \|\| !root.getClientRects\(\).length/,
  );
  assert.ok(
    src.indexOf('window.matchMedia("print").matches') <
      src.indexOf("const continuationAvailable"),
  );
});
