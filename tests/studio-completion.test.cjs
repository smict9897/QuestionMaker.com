const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
function load(file, mocks = {}) {
  const m = new Module(file);
  m.require = (n) => mocks[n] || require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const header = load("lib/paper-header.ts");
const lib = load("lib/paper-builder.ts", {
  "@/lib/paper-math": require("./helpers/paper-math.cjs"),
  "@/lib/paper-header": header,
});
const Rich = load("components/paper-builder/rich-paper-text.tsx", {
  "@/components/MathText": {
    default: ({ text }) => React.createElement("span", null, text),
  },
  "@/lib/paper-builder": lib,
}).default;
test("selected text format markers render nested safe elements", () => {
  const html = renderToStaticMarkup(
    React.createElement(Rich, {
      text: "Plain [b]bold [i]italic[/i][/b] [u]under[/u] [s]strike[/s]",
    }),
  );
  assert.match(html, /<strong>/);
  assert.match(html, /<em>/);
  assert.match(html, /<u>/);
  assert.match(html, /<s>/);
  assert.doesNotMatch(html, /\[b\]/);
});
test("formatting never evaluates raw HTML, URLs or unclosed markers", () => {
  const html = renderToStaticMarkup(
    React.createElement(Rich, {
      text: "<img src=x onerror=alert(1)> [b]unfinished [script]bad[/script]",
    }),
  );
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /\[b\]/);
  assert.match(html, /\[script\]/);
});
test("embedded logo accepts only bounded raster data and https, never svg or script", () => {
  assert.equal(
    lib.safeLogo("data:image/png;base64,YWJj"),
    "data:image/png;base64,YWJj",
  );
  assert.equal(lib.safeLogo("data:image/svg+xml;base64,YWJj"), "");
  assert.equal(lib.safeLogo("javascript:alert(1)"), "");
  assert.equal(lib.safeLogo("data:image/png;base64," + "A".repeat(200001)), "");
});
test("autofit and uploaded logos survive paper snapshots", () => {
  const s = lib.restoreSettings({
    cfg: { autoFit: true },
    info: { logo: "data:image/webp;base64,YWJj" },
    edits: { q: { text: "[b]সংক্ষিপ্ত[/b]" } },
  });
  assert.equal(s.cfg.autoFit, true);
  assert.equal(s.info.logo, "data:image/webp;base64,YWJj");
  assert.deepEqual(lib.restoreSettings(JSON.parse(JSON.stringify(s))), s);
});
test("autofit uses real measured question heights and bounded font reductions", () => {
  const source = fs.readFileSync(
    "components/paper-builder/preview.tsx",
    "utf8",
  );
  assert.match(source, /fittedFont > 7/);
  assert.match(source, /blocks.reduce/);
  assert.match(source, /Math.max\(7, v - 1\)/);
  assert.match(source, /data-measure-footer/);
});
test("booklet imposition orders front/back sides and pads missing pages", () => {
  assert.deepEqual(lib.bookletOrder(4), [
    [3, 0],
    [1, 2],
  ]);
  assert.deepEqual(lib.bookletOrder(3), [
    [null, 0],
    [1, 2],
  ]);
  assert.deepEqual(lib.bookletOrder(8), [
    [7, 0],
    [1, 6],
    [5, 2],
    [3, 4],
  ]);
  assert.deepEqual(lib.bookletOrder(0), []);
});

test("manual font sizes 7 through 28 survive restore; below minimum falls back safely", () => {
  for (const fontSize of [7, 8, 9, 10, 14, 28])
    assert.equal(
      lib.restoreSettings({ cfg: { fontSize } }).cfg.fontSize,
      fontSize,
    );
  assert.equal(lib.restoreSettings({ cfg: { fontSize: 6 } }).cfg.fontSize, 14);
});
