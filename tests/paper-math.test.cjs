const { test } = require("node:test");
const assert = require("node:assert/strict");
const { formatPaperFractions: f } = require("./helpers/paper-math.cjs");
test("paper reciprocals become stacked fractions with intact powers", () => {
  for (const [s, d] of [
    ["1/x", "x"],
    ["1/x^2", "x^2"],
    ["1/x³", "x^{3}"],
    ["1/x⁴", "x^{4}"],
    ["1/x^{12}", "x^{12}"],
  ])
    assert.equal(f(s), `$\\frac{1}{${d}}$`);
  assert.equal(f("x⁴ + 1/x⁴ = 194"), "x⁴ + $\\frac{1}{x^{4}}$ = 194");
  assert.equal(f("p/q + x/y"), "$\\frac{p}{q}$ + $\\frac{x}{y}$");
});
test("existing math delimiters, explicit fractions and grouped denominators", () => {
  assert.equal(f("$x^2 + 1/x^2$"), "$x^2 + \\frac{1}{x^2}$");
  assert.equal(f("$\\frac{1}{x^4}$"), "$\\frac{1}{x^4}$");
  assert.equal(f("1/(x+1)"), "$\\frac{1}{x+1}$");
  assert.equal(f(f("1/x⁴")), f("1/x⁴"));
});
test("do not guess ambiguous identifiers, dates, chained quotients or URL paths", () => {
  for (const s of [
    "1/x4",
    "https://example.com/1/x",
    "www.example.com/a/b",
    "10/11/2026",
    "a/b/c",
    "word/x",
    "/1/x",
    "$\\text{a/b}$",
  ])
    assert.equal(f(s), s);
});
test("Bengali numerals in variable fractions normalize without changing prose", () => {
  assert.equal(f("প্রশ্ন ০১: ১/x⁴"), "প্রশ্ন ০১: $\\frac{1}{x^{4}}$");
  assert.equal(f("1/x^২"), "$\\frac{1}{x^2}$");
});
test("real rich paper renderer produces KaTeX fraction markup, not a slash", () => {
  const fs = require("node:fs"),
    ts = require("typescript"),
    Module = require("node:module"),
    React = require("react");
  function load(file, mocks = {}) {
    const m = new Module(file);
    m.require = (n) => mocks[n] || require(n);
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      file,
    );
    return m.exports;
  }
  const math = load("components/MathText.tsx").default;
  const rich = load("components/paper-builder/rich-paper-text.tsx", {
    "@/components/MathText": math,
    "@/lib/paper-builder": { preparePaperMath: f },
  }).default;
  const html = require("react-dom/server").renderToStaticMarkup(
    React.createElement(rich, { text: "[b]1/x² + 1/x³ + 1/x⁴[/b]" }),
  );
  assert.equal((html.match(/class="mfrac"/g) || []).length, 3);
  assert.ok(!html.includes("katex-error"));
  assert.ok(html.includes("<strong>"));
  assert.ok(html.includes("<mfrac>"));
});
