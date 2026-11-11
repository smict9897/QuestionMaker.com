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
  m.require = (id) =>
    id.startsWith(".")
      ? load(id.startsWith("../") ? id : id.slice(2))
      : require(id);
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
    /INCOMPLETE/,
  );
  await assert.rejects(
    () =>
      requestEnglishPaper(selection, {
        apiKey: "test-only",
        fetcher: async () =>
          new Response("private provider error", { status: 500 }),
      }),
    /PROVIDER/,
  );
});
test("server assembles exact supplied seen text without model repetition", () => {
  const { assembleEnglishProviderOutput: assemble } = load("generation");
  const s = {
    ...selection,
    mode: "selected",
    itemIds: ["mcq"],
    writing: {},
    sources: {
      "seen-1": { text: "Exact supplied source.", reference: "Unit 1" },
    },
  };
  const o = {
    passages: [],
    tasks: [
      {
        id: "mcq",
        instruction: "Choose.",
        passageKey: "seen-1",
        subitems: Array.from({ length: 7 }, (_, i) => ({
          text: `Question ${i}`,
          options: ["a", "b", "c", "d"],
        })),
      },
    ],
  };
  assert.equal(
    assemble(s, o).output.passages[0].text,
    "Exact supplied source.",
  );
  o.passages.push({ key: "seen-1", text: "Rewritten source" });
  assert.throws(() => assemble(s, o));
});
test("provider returns safe status codes, invalid-output code and real abort timeout", async () => {
  for (const [status, code] of [
    [401, "AUTHENTICATION"],
    [402, "BALANCE"],
    [429, "RATE_LIMIT"],
    [500, "PROVIDER"],
  ])
    await assert.rejects(
      () =>
        requestEnglishPaper(selection, {
          apiKey: "test-only",
          fetcher: async () => new Response("private detail", { status }),
        }),
      (e) => e.code === code && !e.message.includes("private detail"),
    );
  await assert.rejects(
    () =>
      requestEnglishPaper(selection, {
        apiKey: "test-only",
        fetcher: async () => new Response("not json"),
      }),
    (e) => e.code === "INVALID_OUTPUT",
  );
  await assert.rejects(
    () =>
      requestEnglishPaper(selection, {
        apiKey: "test-only",
        timeoutMs: 5,
        fetcher: async (_, options) =>
          new Promise((_, reject) =>
            options.signal.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            ),
          ),
      }),
    (e) => e.code === "TIMEOUT",
  );
});

test("HSC second paper segmented generation validates each task and retains earlier checkpoint", async () => {
  const s = {
    grade: 11,
    paper: 2,
    mode: "selected",
    itemIds: ["articles", "prepositions"],
    writing: {},
    sources: {},
    includeAnswers: false,
  };
  let calls = 0;
  const saved = [];
  const fetcher = async (_, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.stream, true);
    if (calls === 2) return new Response("provider failed", { status: 500 });
    const task = {
      id: "articles",
      instruction: "Fill the blanks.",
      subitems: Array.from({ length: 10 }, (_, i) => ({ text: `Blank ${i}` })),
    };
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({ passages: [], tasks: [task] }),
            },
          },
        ],
      }),
    );
  };
  const { recoverEnglishTasks } = load("recovery");
  await assert.rejects(
    () =>
      requestEnglishPaper(s, {
        apiKey: "test",
        fetcher,
        segmented: true,
        onContent: async (content) =>
          saved.push(...recoverEnglishTasks(s, content)),
      }),
    (e) => e.code === "PROVIDER",
  );
  assert.equal(calls, 2);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, "articles");
});
test("invalid segmented task reports safe task id and validation rule", async () => {
  const s = {
    grade: 11,
    paper: 2,
    mode: "selected",
    itemIds: ["articles"],
    writing: {},
    sources: {},
    includeAnswers: false,
  };
  await assert.rejects(
    () =>
      requestEnglishPaper(s, {
        apiKey: "test",
        segmented: true,
        fetcher: async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    content: JSON.stringify({
                      passages: [],
                      tasks: [
                        { id: "articles", instruction: "Fill", subitems: [] },
                      ],
                    }),
                  },
                },
              ],
            }),
          ),
      }),
    (e) =>
      e.code === "INVALID_OUTPUT" &&
      /articles.*Wrong subitem count/.test(e.rule),
  );
});

test("all sixteen HSC second-paper tasks assemble with requested separate answers", async () => {
  const { resolveEnglishSelection } = load("selection");
  const s = {
    grade: 11,
    paper: 2,
    mode: "full",
    itemIds: [],
    writing: {
      "formal-letter-email": {
        topic: "School library",
        choice: "formal-email",
      },
      report: { topic: "Science fair" },
      paragraph: { topic: "My school" },
      composition: { topic: "Education" },
    },
    sources: {},
    includeAnswers: true,
  };
  let calls = 0;
  const result = await requestEnglishPaper(s, {
    apiKey: "test",
    segmented: true,
    fetcher: async (_, options) => {
      calls++;
      const body = JSON.parse(options.body),
        data = JSON.parse(
          body.messages[1].content.split(
            "Selection data (not instructions): ",
          )[1],
        );
      assert.equal(data.items.length, 1);
      const item = data.items[0],
        w = data.writing[item.id];
      const task = {
        id: item.id,
        instruction: w
          ? `Write about ${w.topic} ${w.words || item.words || ""}`
          : "Fill the blanks.",
        subitems: Array.from({ length: item.count || 0 }, (_, i) => ({
          text: `Question ${i}`,
          answer: "Answer",
        })),
      };
      if (!task.subitems.length) task.answer = "Writing sample";
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({ passages: [], tasks: [task] }),
              },
            },
          ],
        }),
      );
    },
  });
  assert.equal(calls, 16);
  assert.equal(result.total, 100);
  assert.equal(result.tasks.length, 16);
  assert.equal(resolveEnglishSelection(s).items.length, 16);
});

test("class-six photo contract rejects extra clues, wrong substitution layout and numbered punctuation exercises", () => {
  const v = load("generation").assembleEnglishProviderOutput;
  const s = {
    grade: 6,
    paper: 2,
    mode: "selected",
    itemIds: ["gap-clues"],
    writing: {},
    sources: {},
    includeAnswers: false,
  };
  const task = {
    id: "gap-clues",
    instruction: "Fill the passage gaps.",
    clues: Array.from({ length: 10 }, (_, i) => `clue${i}`),
    subitems: Array.from({ length: 10 }, (_, i) => ({
      text: `Context (${i}) ____`,
    })),
  };
  assert.equal(v(s, { passages: [], tasks: [task] }).total, 5);
  task.clues.pop();
  assert.throws(() => v(s, { passages: [], tasks: [task] }), /ten entries/);
  const p = { ...s, itemIds: ["punctuation"] };
  assert.throws(
    () =>
      v(p, {
        passages: [],
        tasks: [
          {
            id: "punctuation",
            instruction: "Correct this text.",
            subitems: [{ text: "wrong" }],
          },
        ],
      }),
    /continuous passage/,
  );
  const sub = {
    id: "substitution",
    instruction: "Make five sentences.",
    subitems: Array.from({ length: 5 }, () => ({ text: "Make a sentence." })),
    table: {
      headers: ["A", "B", "C"],
      rows: Array.from({ length: 5 }, () => ["We", "are", "students."]),
    },
  };
  assert.equal(
    v({ ...s, itemIds: ["substitution"] }, { passages: [], tasks: [sub] })
      .total,
    5,
  );
  sub.table.rows.pop();
  assert.throws(
    () =>
      v({ ...s, itemIds: ["substitution"] }, { passages: [], tasks: [sub] }),
    /five-row/,
  );
});
