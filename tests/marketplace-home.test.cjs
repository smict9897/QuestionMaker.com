const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
function load(path, mocks = {}) {
  const m = new Module(path, module);
  m.paths = module.paths;
  m.require = (n) => mocks[n] || require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    path,
  );
  return m.exports;
}
const curriculum = load("lib/nctb-data.ts");
const school = load("lib/marketplace-school-catalog.ts", {
  "@/lib/nctb-data": curriculum,
});
test("school catalog covers 6–12, reuses shared books and resolves subject chapters", () => {
  assert.equal(school.MARKET_GRADES.length, 7);
  assert.equal(school.marketGrade("12"), "12");
  assert.equal(school.marketGrade("bad"), "6");
  for (const g of school.MARKET_GRADES)
    assert.ok(school.marketSubjects(g).length > 0);
  assert.deepEqual(school.marketSubjects("10"), school.marketSubjects("9"));
  assert.deepEqual(school.marketSubjects("12"), school.marketSubjects("11"));
  const subject = school.marketSubjects("6")[0].name;
  assert.ok(school.marketChapters("6", subject).length > 0);
  assert.deepEqual(school.marketChapters("6", "unknown"), []);
});
test("new home renders all books, six-paper bounded queries, preserved subject links and honest empty states", async () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  let calls = [];
  const Home = load("app/page.tsx", {
    "next/link": { default: (p) => React.createElement("a", p, p.children) },
    "@/lib/marketplace-school-catalog": school,
    "@/lib/marketplace-catalog-data": {
      marketCatalogPage: async (filters, after, limit) => {
        calls.push({ filters, limit });
        return { papers: [] };
      },
    },
    "@/components/marketplace-paper-cards": { default: () => null },
    "@/components/marketplace-home.css": {},
  }).default;
  const html = renderToStaticMarkup(
    await Home({ searchParams: Promise.resolve({ grade: "12" }) }),
  );
  assert.equal(calls.length, school.marketSubjects("12").length);
  assert.ok(calls.every((c) => c.limit === 6 && c.filters.grade === "12"));
  assert.equal((html.match(/class="pb-subject"/g) || []).length, calls.length);
  assert.match(html, /দ্বাদশ শ্রেণির প্রশ্নপত্র/);
  assert.match(html, /আরও প্রশ্ন দেখুন/);
  assert.match(html, /এখনও অনুমোদিত প্রশ্নপত্র প্রকাশিত হয়নি/);
  assert.ok(html.includes("grade=12&amp;subject="));
  assert.doesNotMatch(html, /PaperAnimation|HomeStarter|HomeStats/);
});
test("A4 ratio, mobile two-column cards and safe metadata-only display are explicit", () => {
  const css = fs.readFileSync("components/marketplace-home.css", "utf8");
  assert.match(css, /aspect-ratio:\s*210\s*\/\s*297/);
  assert.match(css, /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  const card = fs.readFileSync(
    "components/marketplace-paper-cards.tsx",
    "utf8",
  );
  assert.doesNotMatch(card, /snapshot|dangerouslySetInnerHTML/);
  assert.match(card, /বিবরণে সীমিত পাঠ্য নমুনা দেখুন/);
  const filters = fs.readFileSync("components/marketplace-filters.tsx", "utf8");
  assert.match(filters, /setChapter\(""\)/);
  assert.match(filters, /marketChapters/);
});
