const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
function load(file, db) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "@/lib/db"
      ? { db }
      : n === "@/components/admin-ai-generator"
        ? {
            __esModule: true,
            default: () => React.createElement("div", null, "AI generator"),
          }
        : n === "next/link"
          ? {
              __esModule: true,
              default: (p) => React.createElement("a", p, p.children),
            }
          : require(n);
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
  return m.exports.default;
}
test("admin landing loads only pending payments, not analytics, and retains controls and AI", async () => {
  let count = 0;
  const Page = load("app/admin/page.tsx", {
    packagePurchase: {
      count: async () => {
        count++;
        return 2;
      },
    },
  });
  const html = renderToStaticMarkup(await Page());
  assert.equal(count, 1);
  assert.match(html, /কন্ট্রোল প্যানেল/);
  assert.match(html, /AI generator/);
  assert.match(html, /href="\/admin\/overview"/);
  assert.doesNotMatch(
    html,
    /New students, last 6 months|Earnings|Questions by difficulty/,
  );
  assert.match(html, /২|2/);
});
test("overview retains analytics and recent results behind admin layout without generator", async () => {
  const db = {
    user: { count: async () => 7, findMany: async () => [] },
    resource: {
      aggregate: async () => ({ _sum: { downloads: 12 } }),
      count: async () => 4,
      groupBy: async () => [],
    },
    question: { count: async () => 5, groupBy: async () => [] },
    modelTest: { count: async () => 2 },
    purchase: { aggregate: async () => ({ _sum: { amount: 200 } }) },
    attempt: { findMany: async () => [] },
  };
  const Page = load("app/admin/overview/page.tsx", db);
  const html = renderToStaticMarkup(await Page());
  for (const label of [
    "Overview",
    "Students",
    "Earnings",
    "New students, last 6 months",
    "Questions by difficulty",
    "Recent test results",
  ])
    assert.ok(html.includes(label));
  assert.doesNotMatch(html, /AI generator/);
  assert.match(html, /href="\/admin"/);
  assert.match(
    fs.readFileSync("app/admin/layout.tsx", "utf8"),
    /u\?\.role !== "ADMIN"/,
  );
});
