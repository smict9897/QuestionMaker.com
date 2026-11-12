const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module");
const m = new Module("search", module);
m.paths = module.paths;
m._compile(
  ts.transpileModule(fs.readFileSync("lib/ready-library-search.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "search",
);
const s = m.exports;
const papers = [
  {
    id: "a",
    title: "ICT MODEL TEST 2024",
    kind: "SCHOOL",
    grade: "SSC",
    subject: "তথ্য ও যোগাযোগ প্রযুক্তি",
    year: "2024",
    source: "Dhaka School",
  },
  {
    id: "b",
    title: "গণিত বোর্ড প্রশ্ন",
    kind: "BOARD",
    grade: "HSC",
    subject: "গণিত",
    year: "2025",
    source: "ঢাকা বোর্ড",
    groupId: "g",
    partIndex: 2,
  },
  {
    id: "c",
    title: "গণিত Part 1",
    kind: "BOARD",
    grade: "SSC",
    subject: "গণিত",
    year: "2025",
    source: "ঢাকা বোর্ড",
    groupId: "g",
    partIndex: 1,
  },
];
const index = s.indexLibrary(papers);
const find = (p) =>
  s.searchLibrary(index, { ...s.emptyLibraryFilters, ...p }).map((p) => p.id);
test("all records with no filters; each independent dropdown works alone", () => {
  assert.deepEqual(find({}), ["a", "b", "c"]);
  for (const [filter, value, ids] of [
    ["kind", "SCHOOL", ["a"]],
    ["grade", "HSC", ["b"]],
    ["subject", "গণিত", ["b", "c"]],
    ["year", "2024", ["a"]],
    ["source", "Dhaka School", ["a"]],
  ])
    assert.deepEqual(find({ [filter]: value }), ids);
});
test("case-insensitive substring matching across metadata, Bengali digits/punctuation normalized", () => {
  assert.deepEqual(find({ q: "ict mod" }), ["a"]);
  assert.deepEqual(find({ q: "২০২৪" }), ["a"]);
  assert.deepEqual(find({ q: "ঢা গণি" }), ["b", "c"]);
  assert.deepEqual(find({ q: "ICT—2024" }), ["a"]);
  assert.deepEqual(find({ q: "  \n\t" }), ["a", "b", "c"]);
});
test("combined filters AND match, zero results stay honest, group order preserved", () => {
  assert.deepEqual(find({ q: "গণিত", grade: "SSC", year: "2025" }), ["c"]);
  assert.deepEqual(find({ source: "ঢাকা বোর্ড", grade: "JSC" }), []);
  assert.deepEqual(find({ q: "unknown" }), []);
  assert.deepEqual(find({ group: "g" }), ["c", "b"]);
});
test("query parser rejects arrays/objects and bounds text; source input/order not mutated", () => {
  const raw = { q: "x".repeat(200), grade: ["SSC"], source: { x: 1 } };
  assert.equal(s.libraryFilters(raw).q.length, 120);
  assert.equal(s.libraryFilters(raw).grade, "");
  assert.equal(s.libraryFilters(raw).source, "");
  find({ group: "g" });
  assert.deepEqual(
    index.map((p) => p.paper.id),
    ["a", "b", "c"],
  );
});
test("search UI uses local indexed data and native URL updates, not per-keystroke network requests", () => {
  const c = fs.readFileSync(
    "components/ready-papers/library-browser.tsx",
    "utf8",
  );
  assert.match(c, /useMemo\(\(\) => indexLibrary/);
  assert.match(c, /window.history.replaceState/);
  assert.doesNotMatch(c, /router\.(push|replace)|fetch\(/);
  assert.match(c, /প্রশ্নপত্র দেখুন/);
  assert.doesNotMatch(c, /PDF খুলুন/);
  assert.match(c, /slice\(0, limit\)/);
  assert.match(c, /popstate/);
  const page = fs.readFileSync("app/ready-papers/page.tsx", "utf8");
  assert.match(page, /const cards = papers\?\.map/);
  assert.match(page, /<LibraryBrowser/);
});
