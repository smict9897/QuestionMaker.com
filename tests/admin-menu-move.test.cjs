const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
test("marked dashboard controls and overview shortcut are removed while generator/payment alert remain", () => {
  const page = fs.readFileSync("app/admin/page.tsx", "utf8");
  assert.doesNotMatch(
    page,
    /PanelGroup|<details|কন্ট্রোল প্যানেল|href="\/admin\/overview"/,
  );
  assert.match(page, /<AdminAIGenerator/);
  assert.match(page, /pendingPayments > 0/);
  assert.doesNotMatch(
    fs.readFileSync("app/admin/layout.tsx", "utf8"),
    /CONTENT_LINKS|কনটেন্ট ও সাইট/,
  );
});
test("admin menu contains all relocated destinations and pending count in native disclosure groups", () => {
  const m = new Module("admin-menu", module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "next/navigation"
      ? { usePathname: () => "/admin" }
      : n === "next/link"
        ? {
            __esModule: true,
            default: (p) => React.createElement("a", p, p.children),
          }
        : require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync("components/admin-nav.tsx", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    "admin-menu.js",
  );
  const html = renderToStaticMarkup(
    React.createElement(m.exports.default, {
      name: "Admin",
      role: "ADMIN",
      pendingPayments: 3,
    }),
  );
  for (const route of [
    "/admin/overview",
    "/admin/model-test",
    "/model-test",
    "/model-test/leaderboard",
    "/admin/package-requests",
    "/admin/wallet",
    "/admin/packages",
    "/packages",
    "/admin/pdf",
    "/admin/promo",
    "/",
    "/exam",
    "/tests",
    "/profile",
  ])
    assert.ok(html.includes(`href="${route}"`), route);
  assert.equal((html.match(/<details/g) || []).length, 3);
  assert.match(html, /কন্ট্রোল প্যানেল মেনু/);
  assert.match(html, /প্যাকেজ ও পেমেন্ট/);
  assert.match(html, />3</);
  assert.doesNotMatch(
    html,
    /\/admin\/(books|orders|inquiries|jobs|testimonials)/,
  );
});
