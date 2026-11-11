const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
function html(props) {
  const m = new Module("prep", module);
  m.paths = module.paths;
  m.require = (n) => (n.endsWith(".css") ? {} : require(n));
  m._compile(
    ts.transpileModule(
      fs.readFileSync("components/preparation-popup.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    "prep.js",
  );
  return renderToStaticMarkup(React.createElement(m.exports.default, props));
}
test("processing popup is indeterminate without real progress and never invents scan/percentage claims", () => {
  const s = html({ subject: "গণিত", stage: 1 });
  assert.match(s, /QuestionMakerBd AI/);
  assert.match(s, /গণিত/);
  assert.doesNotMatch(s, /value="/);
  assert.doesNotMatch(s, /পাঠ্যবই স্ক্যান|৪৫%/);
  assert.match(s, /টিপ:/);
  assert.match(s, /aria-labelledby="prep-title"/);
});
test("real progress and failure are displayed; animation supports reduced motion", () => {
  const s = html({
    subject: "গণিত",
    stage: 1,
    progress: 40,
    error: "সংযোগ বিচ্ছিন্ন",
  });
  assert.match(s, /value="40"/);
  assert.match(s, /৪০%/);
  assert.match(s, /role="alert"/);
  assert.match(s, /prep-failed/);
  const css = fs.readFileSync("components/preparation-popup.css", "utf8");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /100dvh/);
  assert.match(css, /prep-scan/);
});
