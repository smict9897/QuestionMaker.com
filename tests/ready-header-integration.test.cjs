const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
test("Ready Papers reuses existing header manager and renderer, first selected page only", () => {
  const s = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(
    s,
    /import HeaderManager from "@\/components\/paper-builder\/header-manager"/,
  );
  assert.match(
    s,
    /import HeaderPreview from "@\/components\/paper-builder\/header-preview"/,
  );
  assert.match(
    s,
    /i === 0 &&\s*headerStyle === "custom" &&\s*headerSettings.header.enabled/,
  );
  assert.match(s, /<HeaderPreview header=\{currentHeader\(headerSettings\)\}/);
  assert.match(s, /<option value="none">/);
});
test("draft restores validated header settings with legacy simple fallback; shared CSS stays single source", () => {
  const s = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(s, /headerStyle,\s*headerSettings/);
  assert.match(s, /settingsSchema.parse\(\s*data.headerSettings/);
  assert.match(s, /includes\(data.headerStyle\)/);
  const css = fs.readFileSync("components/paper-builder/paper.css", "utf8");
  assert.match(css, /@import "\.\/header.css"/);
  assert.doesNotMatch(css, /\.custom-paper-header \{/);
  const h = fs.readFileSync("components/paper-builder/header.css", "utf8");
  assert.match(h, /\.header-code-boxes/);
  assert.match(h, /\.custom-paper-header-dynamic/);
  assert.match(h, /print-color-adjust: exact/);
});
