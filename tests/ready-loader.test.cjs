const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
const m = new Module("loader", module);
m.paths = module.paths;
m._compile(
  ts.transpileModule(
    fs.readFileSync("components/ready-papers/page-loader.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText,
  "loader",
);
const html = (completed, total) =>
  renderToStaticMarkup(
    React.createElement(m.exports.default, { completed, total }),
  );
test("loader shows actual completed page count and calculated percentage", () => {
  const s = html(7, 19);
  assert.match(s, /aria-valuenow="7"/);
  assert.match(s, /aria-valuemax="19"/);
  assert.match(s, /width:36%/);
  assert.match(s, /১৯/);
  assert.match(s, /৭/);
  assert.doesNotMatch(s, /AI scanning|স্ক্যান করছি/);
});
test("unknown total is indeterminate, real final page is100%; bounds clamp", () => {
  const s = html(0, 0);
  assert.doesNotMatch(s, /aria-valuenow=|aria-valuemax=|>০%</);
  assert.match(s, /PDF খোলা হচ্ছে/);
  assert.match(html(19, 19), /width:100%/);
  assert.match(html(25, 19), /aria-valuenow="19"/);
  assert.match(html(-1, 19), /width:0%/);
});
test("PDF loading has separate lifecycle from payment/save busy; failure dismisses loader", () => {
  const s = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(s, /pageLoading \? \(/);
  assert.match(s, /<PageLoader/);
  assert.match(s, /setPageProgress\(\{ completed: n, total \}\)/);
  assert.equal((s.match(/setPageLoading\(false\)/g) || []).length, 2);
  const css = fs.readFileSync("components/ready-papers/ready.css", "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.rp-page-loader \*\s*\{\s*animation: none !important/);
});
