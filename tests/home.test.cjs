const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
function load(file, custom = {}) {
  const mod = new Module(file);
  mod.require = (name) => custom[name] || require(name);
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file,
  );
  return mod.exports;
}
const data = load("lib/home-data.ts");
test("home selector matches picker category aliases", () => {
  for (const [a, b] of [
    ["Class 6", "6"],
    ["SSC", "Class 9"],
    ["HSC", "Class 11-12"],
  ])
    assert.equal(data.homeCategoryMatches(a, b), true);
  assert.equal(data.homeCategoryMatches("Class 6", "Class 7"), false);
});
test("bank aggregation retains total and groups long legends without losing questions", () => {
  const result = data.summarizeHomeBank([
    { category: "A", count: 10 },
    { category: "A", count: 20 },
    ...["B", "C", "D", "E", "F"].map((category) => ({ category, count: 2 })),
  ]);
  assert.equal(result.total, 40);
  assert.equal(result.items.length, 5);
  assert.deepEqual(result.items[0], ["A", 30]);
  assert.deepEqual(result.items[4], ["অন্যান্য", 4]);
  assert.equal(
    result.items.reduce((sum, r) => sum + r[1], 0),
    40,
  );
});
test("empty bank has no invented counts", () =>
  assert.deepEqual(data.summarizeHomeBank([]), { total: 0, items: [] }));
const Stats = load("components/home/home-stats.tsx", {
  "@/lib/home-data": data,
}).default;
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
test("statistics render real totals and seven daily bars", () => {
  const html = renderToStaticMarkup(
    React.createElement(Stats, {
      rows: [{ category: "Class 6", count: 25 }],
      daily: [1, 2, 3, 4, 5, 6, 7],
    }),
  );
  assert.match(html, /২৫/);
  assert.match(html, /২৮টি/);
  assert.match(html, /conic-gradient/);
  assert.match(html, /Class 6/);
});
test("failed statistics show unavailable message rather than a fake zero total", () => {
  const html = renderToStaticMarkup(
    React.createElement(Stats, { rows: null, daily: null }),
  );
  assert.match(html, /লোড করা যায়নি/);
  assert.doesNotMatch(html, /মোট প্রশ্ন/);
});
test("homepage retains existing entry points and reads active packages, never copied reference prices", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  for (const route of [
    "/question-builder",
    "/quiz",
    "/model-test",
    "/blog",
    "/packages",
  ])
    assert.ok(page.includes(route));
  assert.match(page, /active: true/);
  assert.match(page, /pkg.price.toLocaleString/);
  assert.match(page, /approved: true/);
});

test("curriculum chapter uses stored spelling/value so real bank question is counted and submitted", () => {
  const stored = ["তথ্য ও যোগাযোগ প্রযুক্তির গুরুত্ব"];
  const choices = data.homeBankOptions(
    ["১ম অধ্যায়: তথ্য ও যোগাযোগ প্রযুক্তির গুরুত্ব"],
    stored,
    true,
  );
  assert.deepEqual(choices, stored);
  const rows = [
    { subject: "তথ্য ও যোগাযোগ প্রযুক্তি", topic: stored[0], count: 30 },
  ];
  assert.equal(
    rows.filter((r) => r.topic === choices[0]).reduce((n, r) => n + r.count, 0),
    30,
  );
  assert.equal(
    new URLSearchParams({ topic: choices[0] }).get("topic"),
    stored[0],
  );
});
test("chapter matching ignores explicit number prefix but never merges unrelated chapter titles", () => {
  assert.equal(
    data.homeChapterKey("১. প্যাটার্ন"),
    data.homeChapterKey("1ম অধ্যায়: প্যাটার্ন"),
  );
  assert.notEqual(
    data.homeChapterKey("১ম অধ্যায়: প্যাটার্ন"),
    data.homeChapterKey("১ম অধ্যায়: মুনাফা"),
  );
  assert.deepEqual(
    data.homeBankOptions(["১ম অধ্যায়: প্যাটার্ন"], ["১ম অধ্যায়: মুনাফা"], true),
    ["১ম অধ্যায়: প্যাটার্ন", "১ম অধ্যায়: মুনাফা"],
  );
});
test("subject whitespace uses exact existing DB value, not zero-count curriculum duplicate", () => {
  assert.deepEqual(
    data.homeBankOptions(["তথ্য ও যোগাযোগ প্রযুক্তি"], [" তথ্য  ও যোগাযোগ প্রযুক্তি "]),
    [" তথ্য  ও যোগাযোগ প্রযুক্তি "],
  );
});
test("home selector includes only current users private pending plus approved; public stats stay approved-only", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  assert.match(page, /where: visibleQuestions\(session.user.id\)/);
  assert.match(page, /rows=\{\(starterBank \|\| \[\]\)/);
  assert.match(page, /unavailable=\{starterBank === null\}/);
  assert.match(page, /where: \{ approved: true \}/);
});
