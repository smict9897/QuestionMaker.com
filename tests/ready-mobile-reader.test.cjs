const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
test("mobile reader single-column cards, collapsible controls and safe print scale reset remain scoped", () => {
  const css = fs.readFileSync("components/ready-papers/ready.css", "utf8");
  assert.match(
    css,
    /\.rp-studio \.rp-page-grid\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(css, /\.rp-controls:not\(\.rp-controls-open\)/);
  assert.match(css, /zoom: 1 !important/);
  assert.match(css, /safe-area-inset-bottom/);
});
test("enlarged page dialog traps focus natively, supports Escape and restores body scroll", () => {
  const s = fs.readFileSync("components/ready-papers/page-viewer.tsx", "utf8");
  assert.match(s, /showModal\(\)/);
  assert.match(s, /onCancel=\{onClose\}/);
  assert.match(s, /document.body.style.overflow = old/);
  assert.match(s, /ResizeObserver/);
  assert.match(s, /createPortal/);
});

test("page enlarge action has an unbroken rotated Bengali caption in a fixed side rail", () => {
  const studio = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  const css = fs.readFileSync("components/ready-papers/ready.css", "utf8");
  assert.match(studio, /বড় করে দেখতে এখানে ক্লিক করুন/);
  assert.match(studio, /className="rp-page-open-caption"/);
  assert.match(css, /\.rp-root \.rp-page-open\s*\{[^}]*display: grid;/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 44px/);
  assert.match(
    css,
    /\.rp-page-open-caption\s*\{[^}]*white-space: nowrap;[^}]*rotate\(-90deg\)/,
  );
});
