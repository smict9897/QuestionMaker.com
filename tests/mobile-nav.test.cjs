const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
function render(path) {
  const m = new Module("mobile-nav", module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "next/navigation"
      ? { usePathname: () => path }
      : n === "next/link"
        ? {
            default: (p) => React.createElement("a", p, p.children),
            __esModule: true,
          }
        : n === "./mobile-bottom-nav.css"
          ? {}
          : require(n);
  m._compile(
    ts.transpileModule(
      fs.readFileSync("components/MobileBottomNav.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    "mobile-nav.js",
  );
  return renderToStaticMarkup(
    React.createElement(m.exports.default, { user: null }),
  );
}
test("global mobile navigation has five real destinations with create center and dashboard profile", () => {
  const html = render("/");
  for (const href of [
    "/",
    "/question-builder/saved",
    "/question-builder",
    "/wallet",
    "/dashboard",
  ])
    assert.ok(html.includes(`href="${href}"`));
  assert.equal((html.match(/<a /g) || []).length, 5);
  assert.match(html, /প্রশ্ন তৈরি/);
  assert.doesNotMatch(html, /Live Online Model Test/);
});
test("only one active link across home, saved, English saved, builder, wallet and dashboard", () => {
  for (const path of [
    "/",
    "/question-builder/saved",
    "/question-builder/english/saved",
    "/question-builder/create",
    "/wallet",
    "/dashboard",
  ])
    assert.equal((render(path).match(/aria-current="page"/g) || []).length, 1);
});
test("root bottom nav is outside path gate; CSS reserves safe area and excludes print/desktop", () => {
  const layout = fs.readFileSync("app/layout.tsx", "utf8");
  assert.doesNotMatch(layout, /<PathGate>\s*<MobileBottomNav/);
  const css = fs.readFileSync("components/mobile-bottom-nav.css", "utf8");
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media print/);
  assert.match(css, /767px/);
});
