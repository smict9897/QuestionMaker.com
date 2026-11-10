const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  path = require("node:path");
function load(name) {
  const filename = path.resolve("lib/english", name + ".ts"),
    m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = function (id) {
    return id === "./blueprints" ? load("blueprints") : require(id);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}
const { resolveEnglishSelection: r, englishSubjectRoute: route } =
  load("selection");
const base = () => ({
  grade: 6,
  paper: 1,
  mode: "writing",
  itemIds: ["paragraph"],
  writing: { paragraph: { topic: "My school" } },
  sources: {},
  includeAnswers: false,
});
test("writing-only preserves exact topic and server-owned marks", () => {
  const p = r(base());
  assert.equal(p.total, 10);
  assert.equal(p.items.length, 1);
  assert.equal(p.selection.writing.paragraph.topic, "My school");
  assert.equal(p.items[0].words, 120);
});
test("reject missing/extra writing topics, invalid IDs, duplicates and injected fields", () => {
  for (const patch of [
    { writing: {} },
    { writing: { paragraph: { topic: " " } } },
    {
      writing: {
        paragraph: { topic: "School" },
        dialogue: { topic: "Friends" },
      },
    },
    { itemIds: ["fake"] },
    { itemIds: ["paragraph", "paragraph"] },
    { total: 999 },
    { grade: 5 },
    { paper: 3 },
  ])
    assert.throws(() => r({ ...base(), ...patch }));
});
test("selected seen tasks require exact source and reference; unseen does not", () => {
  const p = { ...base(), mode: "selected", itemIds: ["mcq"], writing: {} };
  assert.throws(() => r(p));
  assert.equal(
    r({
      ...p,
      sources: { "seen-1": { text: "Source text", reference: "Book unit 1" } },
    }).total,
    7,
  );
  assert.equal(r({ ...p, itemIds: ["summary"] }).total, 10);
});
test("writing-only rejects reading; alternatives require exactly one approved task", () => {
  assert.throws(() => r({ ...base(), itemIds: ["mcq"] }));
  const p = {
    ...base(),
    paper: 2,
    itemIds: ["letter-email"],
    writing: { "letter-email": { topic: "Leave application" } },
  };
  assert.throws(() => r(p));
  assert.equal(
    r({
      ...p,
      writing: { "letter-email": { topic: "Leave", choice: "formal-letter" } },
    }).total,
    8,
  );
});
test("English route is isolated from Bangla and unsupported classes", () => {
  assert.equal(
    route("SSC", "English Grammar and Composition"),
    "/question-builder/english?grade=9&paper=2",
  );
  assert.equal(
    route("Class 8", "English For Today"),
    "/question-builder/english?grade=8&paper=1",
  );
  assert.equal(
    route("HSC", "ইংরেজি ২য় পত্র"),
    "/question-builder/english?grade=11&paper=2",
  );
  assert.equal(route("6", "বাংলা"), null);
  assert.equal(route("5", "English"), null);
});
test("explicit class 10 and 12 routes retain the selected grade", () => {
  assert.equal(
    route("Class 10", "English For Today"),
    "/question-builder/english?grade=10&paper=1",
  );
  assert.equal(
    route("12", "ইংরেজি ২য় পত্র"),
    "/question-builder/english?grade=12&paper=2",
  );
});
test("English routes support every grade, Bengali digits/names, grouped classes and second-paper labels", () => {
  for (let grade = 6; grade <= 12; grade++) {
    for (const category of [
      String(grade),
      `Class ${grade}`,
      `শ্রেণি ${String(grade).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d])}`,
    ]) {
      assert.equal(
        route(category, "English First Paper"),
        `/question-builder/english?grade=${grade}&paper=1`,
      );
      assert.equal(
        route(category, "English Second Paper"),
        `/question-builder/english?grade=${grade}&paper=2`,
      );
    }
  }
  assert.equal(
    route("অষ্টম শ্রেণি", "ইংরেজী ২য় পত্র"),
    "/question-builder/english?grade=8&paper=2",
  );
  assert.equal(
    route("Class 11–12", "English II"),
    "/question-builder/english?grade=11&paper=2",
  );
  assert.equal(route("Class 19", "English"), null);
  assert.equal(route("Job 12", "English"), null);
});
