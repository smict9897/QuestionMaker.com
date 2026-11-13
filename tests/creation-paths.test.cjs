const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
test("creation cards render accessible native links to the existing workflows", () => {
  const mod = new Module("creation-paths");
  mod.require = (name) =>
    name === "next/link"
      ? {
          __esModule: true,
          default: ({ children, ...props }) =>
            React.createElement("a", props, children),
        }
      : require(name);
  mod._compile(
    ts.transpileModule(
      fs.readFileSync("components/home/creation-paths.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    "creation-paths",
  );
  const html = renderToStaticMarkup(React.createElement(mod.exports.default));
  assert.equal((html.match(/<a /g) || []).length, 2);
  for (const text of [
    "রেডি প্রশ্নপত্র",
    "বিভিন্ন বোর্ড প্রশ্ন থেকে প্রশ্নপত্র তৈরি করুন",
    "ডাটাবেজ থেকে প্রশ্নপত্র",
    "ডাটাবেজ থেকে বিষয় অধ্যায় টপিক নির্বাচন করে প্রশ্নপত্র তৈরি করুন",
  ])
    assert.ok(html.includes(text));
  assert.match(html, /href="\/ready-papers"/);
  assert.match(html, /href="#start"/);
  assert.match(html, /aria-labelledby="creation-heading"/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
});
test("entry cards precede the unchanged selector, demo and real statistics", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  assert.ok(page.indexOf("<CreationPaths") < page.indexOf("<HomeStarter"));
  assert.ok(page.indexOf("<HomeStarter") < page.indexOf("<PaperAnimation"));
  assert.ok(page.indexOf("<PaperAnimation") < page.indexOf("<HomeStats"));
  const selector = fs.readFileSync(
    "components/home/home-workspace.tsx",
    "utf8",
  );
  assert.match(selector, /id="start"/);
  assert.match(selector, /action="\/question-builder\/prepare"/);
  assert.doesNotMatch(selector, /<h1>/);
});
test("shared chrome theme is screen scoped and honors reduced motion", () => {
  const css = fs.readFileSync("components/design-system.css", "utf8");
  assert.match(css, /@media screen/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:input|button|article|\.a4)\s*\{/);
});
