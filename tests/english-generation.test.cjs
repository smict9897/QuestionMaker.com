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
  m.require = (id) => (id.startsWith("./") ? load(id.slice(2)) : require(id));
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
const { validateEnglishOutput: v, englishGenerationPrompt: prompt } =
  load("generation");
const selection = {
  grade: 6,
  paper: 1,
  mode: "writing",
  itemIds: ["paragraph"],
  writing: { paragraph: { topic: "My school" } },
  sources: {},
  includeAnswers: false,
};
const output = () => ({
  passages: [],
  tasks: [
    {
      id: "paragraph",
      instruction: "Write a paragraph about My school in 120 words.",
      subitems: [],
    },
  ],
});
test("validated paper keeps server marks and original template numbering", () => {
  const p = v(selection, output());
  assert.equal(p.total, 10);
  assert.equal(p.tasks[0].number, 12);
  assert.equal(p.tasks[0].marks, 10);
  assert.equal(p.tasks[0].section, "writing");
  assert.match(prompt(selection), /NOT Bengali CQ/);
});
test("reject extra tasks, hallucinated marks, topics, missing limits and leaked answers", () => {
  for (const mutate of [
    (o) => o.tasks.push({ ...o.tasks[0] }),
    (o) => (o.tasks[0].marks = 50),
    (o) => (o.tasks[0].instruction = "Write about a river in 120 words."),
    (o) => (o.tasks[0].instruction = "Write about My school."),
    (o) => (o.tasks[0].answer = "Sample"),
    (o) => o.passages.push({ key: "extra", text: "extra" }),
  ]) {
    const o = output();
    mutate(o);
    assert.throws(() => v(selection, o));
  }
});
test("writing answer request requires separate sample", () => {
  assert.throws(() => v({ ...selection, includeAnswers: true }, output()));
  const o = output();
  o.tasks[0].answer = "Sample answer";
  assert.equal(v({ ...selection, includeAnswers: true }, o).total, 10);
});
test("seen MCQ requires exact shared source, count and valid option keys", () => {
  const s = {
    ...selection,
    mode: "selected",
    itemIds: ["mcq"],
    writing: {},
    includeAnswers: true,
    sources: { "seen-1": { text: "Exact source.", reference: "Unit 1" } },
  };
  const o = {
    passages: [{ key: "seen-1", text: "Exact source." }],
    tasks: [
      {
        id: "mcq",
        instruction: "Choose the correct answer.",
        passageKey: "seen-1",
        subitems: Array.from({ length: 7 }, (_, i) => ({
          text: `Question ${i}`,
          options: ["a", "b", "c", "d"],
          answer: "b",
        })),
      },
    ],
  };
  assert.equal(v(s, o).total, 7);
  o.passages[0].text = "Altered";
  assert.throws(() => v(s, o));
  o.passages[0].text = "Exact source.";
  o.tasks[0].subitems[0].answer = "wrong";
  assert.throws(() => v(s, o));
  o.tasks[0].subitems.pop();
  assert.throws(() => v(s, o));
});
const { requestEnglishPaper } = load("provider");
test("provider validates output and rejects truncation without exposing provider error", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output()) },
          },
        ],
      }),
    );
  };
  assert.equal(
    (await requestEnglishPaper(selection, { apiKey: "test-only", fetcher }))
      .total,
    10,
  );
  assert.equal(calls, 1);
  await assert.rejects(() =>
    requestEnglishPaper(
      { ...selection, grade: 3 },
      { apiKey: "test-only", fetcher },
    ),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      requestEnglishPaper(selection, {
        apiKey: "test-only",
        fetcher: async () =>
          new Response(
            JSON.stringify({
              choices: [
                { finish_reason: "length", message: { content: "{}" } },
              ],
            }),
          ),
      }),
    /incomplete/,
  );
  await assert.rejects(
    () =>
      requestEnglishPaper(selection, {
        apiKey: "test-only",
        fetcher: async () =>
          new Response("private provider error", { status: 500 }),
      }),
    /request failed/,
  );
});
