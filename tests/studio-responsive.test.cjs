const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const css = fs.readFileSync(
  "components/ready-papers/studio-responsive.css",
  "utf8",
);
const studio = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
test("editor has phone, tablet, laptop and wide desktop breakpoints", () => {
  for (const breakpoint of ["639px", "640px", "1023px", "1280px"])
    assert.ok(css.includes(breakpoint));
  assert.match(css, /grid-template-columns:\s*220px minmax\(0,\s*1fr\)/);
  assert.match(css, /grid-template-columns:\s*310px minmax\(0,\s*1fr\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /font-size:\s*16px/);
});
test("phone controls are reachable and return keyboard focus to preview toolbar", () => {
  assert.match(studio, /ref=\{controlsPanel\}/);
  assert.match(studio, /ref=\{controlsToggle\}/);
  assert.match(studio, /controlsPanel.current\?\.focus/);
  assert.match(studio, /controlsToggle.current\?\.focus/);
  assert.match(studio, /aria-controls="rp-edit-controls"/);
  assert.match(studio, /প্রিভিউতে ফিরুন/);
  assert.match(css, /max-height:\s*65dvh/);
});
test("responsive editor rules only change screen chrome, never A4 dimensions or gestures", () => {
  assert.doesNotMatch(css, /@media print/);
  assert.doesNotMatch(css, /(?:touch-action|zoom|transform):/);
  assert.doesNotMatch(
    css,
    /\.(?:rp-print-sheet|rp-placement-image|rp-preview-scale)\s*\{/,
  );
  assert.match(
    fs.readFileSync("app/layout.tsx", "utf8"),
    /import "@\/components\/ready-papers\/studio-responsive.css"/,
  );
});
