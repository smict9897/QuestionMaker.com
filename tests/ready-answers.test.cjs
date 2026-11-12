const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module");
function load(file, mocks = {}) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) => mocks[n] || require(n);
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
  return m.exports;
}

const answers = load("lib/ready-answers.ts");
const paper = load("lib/ready-papers.ts");
test("parser accepts Bengali numbers and KLMN with gaps/stars/duplicates unresolved", () => {
  assert.deepEqual(answers.parseAnswerRows("১ K 2 L 3 M 4 N 5 * 6 ক 7 ঘ", 8), [
    "ক",
    "খ",
    "গ",
    "ঘ",
    "?",
    "ক",
    "ঘ",
    "?",
  ]);
  assert.deepEqual(answers.parseAnswerRows("1 K 1 L", 2), ["?", "?"]);
  assert.deepEqual(answers.parseAnswerRows("K L M N", 2), ["?", "?"]);
});
const entry = {
  questionPage: 18,
  sourcePage: 21,
  label: "Model 18",
  answers: ["ক", "খ"],
  approved: true,
};
test("answer schema requires resolved approved entries and bounded source pages", () => {
  assert.ok(answers.answerEntrySchema.safeParse(entry).success);
  for (const patch of [
    { answers: ["?"] },
    { questionPage: 0 },
    { sourcePage: 101 },
    { answers: [] },
    { answers: ["K"] },
  ])
    assert.equal(
      answers.answerEntrySchema.safeParse({ ...entry, ...patch }).success,
      false,
    );
  assert.ok(
    answers.answerEntrySchema.safeParse({
      ...entry,
      approved: false,
      answers: ["?"],
    }).success,
  );
  assert.ok(paper.pageEditSchema.safeParse(paper.freshEdit()).success);
});
function api(authorized = true) {
  let saved;
  return {
    get saved() {
      return saved;
    },
    actions: load("app/actions/ready-answers.ts", {
      "@/lib/guard": {
        admin: async () => {
          if (!authorized) throw Error("denied");
          return { id: "admin" };
        },
      },
      "@/lib/db": {
        db: {
          setting: {
            findUnique: async () => ({ value: "valid" }),
            upsert: async (v) => {
              saved = v;
            },
          },
        },
      },
      "@/lib/ready-papers": { READY_PREFIX: "r:", parseReady: () => ({}) },
      "@/lib/ready-answers": answers,
      "next/cache": { revalidatePath: () => {} },
    }),
  };
}
const id = "14ca01ef-c381-444f-b3c3-f02976799834";
test("admin-only save/explain, approved unresolved key never persists", async () => {
  const denied = api(false);
  await assert.rejects(denied.actions.saveReadyAnswers(id, entry));
  await assert.rejects(
    denied.actions.explainReadyQuestion({ question: "test" }),
  );
  const a = api();
  assert.equal(
    (await a.actions.saveReadyAnswers(id, { ...entry, answers: ["?"] })).ok,
    false,
  );
  assert.equal(a.saved, undefined);
  assert.equal((await a.actions.saveReadyAnswers(id, entry)).ok, true);
  assert.equal(a.saved.where.key, answers.ANSWER_PREFIX + id + ":18");
});
test("AI rejects invalid input without provider access", async () => {
  const a = api();
  assert.equal(
    (await a.actions.explainReadyQuestion({ question: "" })).ok,
    false,
  );
  assert.equal(a.saved, undefined);
});

test("answer print pagination and selection mapping excludes unapproved keys", () => {
  const ui = load("components/ready-papers/answer-assistant.tsx", {
    "@/lib/ready-answers": answers,
    "@/lib/ready-paper-browser": {},
    "@/app/actions/ready-answers": {},
  });
  const render = require("react-dom/server").renderToStaticMarkup;
  const html = render(
    ui.AnswerSheets({
      selected: [18],
      entries: [{ ...entry, answers: Array(100).fill("ক") }],
      blank: false,
    }),
  );
  assert.equal((html.match(/class="rp-print-sheet"/g) || []).length, 4);
  assert.ok(html.includes("100."));
  assert.ok(html.includes("page 18"));
  const blank = render(
    ui.AnswerSheets({ selected: [18], entries: [entry], blank: true }),
  );
  assert.ok(blank.includes("□ ক"));
  const draft = render(
    ui.AnswerSheets({
      selected: [18],
      entries: [{ ...entry, approved: false }],
      blank: false,
    }),
  );
  assert.ok(draft.includes("অনুমোদন"));
});
