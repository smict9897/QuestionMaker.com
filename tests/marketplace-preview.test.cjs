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
      },
    }).outputText,
    path,
  );
  return m.exports;
}
const header = load("lib/paper-header.ts");
const builder = load("lib/paper-builder.ts", {
  "@/lib/paper-header": header,
  "@/lib/paper-math": require("./helpers/paper-math.cjs"),
});
const { marketPreviewModel, assertRenderableMarketSnapshot } = load(
  "lib/marketplace-preview.ts",
  {
    "@/lib/paper-builder": builder,
    "@/lib/paper-sections": load("lib/paper-sections.ts"),
  },
);
const questions = [
  {
    id: "m",
    text: "MCQ?",
    correct: "B",
    options: { A: "one", B: "two", C: "three", D: "four" },
    category: "নবম",
    subject: "বাংলা",
    topic: "গদ্য",
  },
  {
    id: "c",
    text: "CQ",
    correct: "",
    options: {
      stimulus: "উদ্দীপক",
      ক: "ক প্রশ্ন",
      খ: "খ প্রশ্ন",
      গ: "গ প্রশ্ন",
      ঘ: "ঘ প্রশ্ন",
    },
    topic: "গদ্য",
  },
  { id: "s", text: "Short?", correct: "", options: {} },
];
test("immutable snapshot renders mixed MCQ/CQ/SHORT sections and Bengali CQ keys", () => {
  const model = marketPreviewModel({ settings: {}, questions });
  assert.deepEqual(
    model.sections.map((s) => s.type),
    ["MCQ", "CQ", "SHORT"],
  );
  assert.equal(model.sections[0].questions[0].ci, 1);
  assert.equal(model.sections[1].questions[0].q.stimulus, "উদ্দীপক");
  assert.equal(model.sections[1].questions[0].q.subQuestions.k, "ক প্রশ্ন");
  assert.equal(model.settings.info.subject, "বাংলা");
});
test("saved edits, exclusions, font and dimensions are preserved without mutating snapshot", () => {
  const snapshot = {
    settings: {
      edits: {
        m: { text: "edited MCQ", options: { A: "new one", B: "new two" } },
      },
      excludedIds: ["s"],
      cfg: { font: "kalpurush" },
    },
    questions,
  };
  const before = JSON.stringify(snapshot);
  const model = marketPreviewModel(snapshot);
  assert.equal(model.sections.length, 2);
  assert.equal(model.sections[0].questions[0].q.text, "edited MCQ");
  assert.equal(model.settings.cfg.font, "kalpurush");
  assert.equal(model.sections[0].questions[0].opts[1][1], "new two");
  assert.equal(JSON.stringify(snapshot), before);
});
test("set shuffle is deterministic and division groups keep CQ visible", () => {
  const snapshot = {
    settings: {
      seed: 123,
      show: { divisions: true },
      cfg: { divisionFilter: "missing group" },
    },
    questions,
  };
  assert.deepEqual(
    marketPreviewModel(snapshot, "খ"),
    marketPreviewModel(snapshot, "খ"),
  );
  assert.ok(marketPreviewModel(snapshot).sections.some((s) => s.type === "CQ"));
});
test("approval rejects empty, excluded, invalid-settings and malformed snapshots", () => {
  assertRenderableMarketSnapshot({ settings: {}, questions });
  for (const snapshot of [
    { settings: {}, questions: [] },
    { settings: null, questions },
    { settings: {}, questions: [null] },
    { settings: { excludedIds: ["m", "c", "s"] }, questions },
  ])
    assert.throws(() => assertRenderableMarketSnapshot(snapshot));
});
test("private preview route gates owner or fresh database admin and validates checksum", () => {
  const route = fs.readFileSync("app/dashboard/sell/[id]/page.tsx", "utf8");
  assert.match(route, /record.ownerId !== user.id && user.role !== "ADMIN"/);
  assert.match(
    route,
    /snapshotHash\(record.snapshot\) === record.snapshotHash/,
  );
  assert.match(route, /db.user.findUnique/);
  const component = fs.readFileSync(
    "components/marketplace-paper-preview.tsx",
    "utf8",
  );
  assert.match(component, /PaperPreview/);
  assert.doesNotMatch(
    component,
    /onQuestionAction=|savePaper|purchaseQuestions/,
  );
});
