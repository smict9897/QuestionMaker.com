const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function load(file, mocks = {}) {
  const filename = path.resolve(file),
    m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = (id) =>
    mocks[id] ||
    (id.startsWith(".")
      ? load(path.resolve(path.dirname(filename), id) + ".ts", mocks)
      : id.startsWith("@/")
        ? load(id.slice(2) + ".ts", mocks)
        : require(id));
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
const { completeArrayObjects: extract, readGenerationResponse: read } = load(
  "lib/generation-stream.ts",
);
const { recoverEnglishTasks: recover } = load("lib/english/recovery.ts");
const { workerQuestion } = load("lib/worker-question.ts");
function event(content, finish = null) {
  return (
    "data: " +
    JSON.stringify({
      choices: [{ delta: { content }, finish_reason: finish }],
    }) +
    "\n\n"
  );
}
test("extract complete root array objects only, respecting escapes and nested arrays", () => {
  const q = {
    text: 'quote " and } , { and \\ end',
    options: { A: "a" },
    nested: [{ x: 1 }],
  };
  const input = JSON.stringify({
    fake: '"questions":[{}]',
    questions: [q, { text: "second" }],
  });
  assert.deepEqual(extract(input, "questions"), [q, { text: "second" }]);
  assert.deepEqual(
    extract(
      '{"questions":[' + JSON.stringify(q) + ',{"text":"unfinished',
      "questions",
    ),
    [q],
  );
  assert.deepEqual(extract('{"nested":{"questions":[{}]}}', "questions"), []);
});
test("stream checkpoints are awaited and survive a broken later chunk", async () => {
  const saved = [];
  let step = 0;
  const response = new Response(
    new ReadableStream({
      pull(c) {
        if (step++ === 0)
          c.enqueue(
            new TextEncoder().encode(event('{"questions":[{"text":"first"},')),
          );
        else c.error(new Error("network disconnected"));
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
  await assert.rejects(
    () =>
      read(response, async (text) => {
        saved.push(...extract(text, "questions"));
      }),
    /network disconnected/,
  );
  assert.deepEqual(saved, [{ text: "first" }]);
});
test("SSE handles arbitrary byte boundaries and enforces size bounds", async () => {
  const data = new TextEncoder().encode(
    event("বাংলা") + event("", "stop") + "data: [DONE]\n\n",
  );
  let i = 0;
  const response = new Response(
    new ReadableStream({
      pull(c) {
        if (i < data.length) c.enqueue(data.slice(i, ++i));
        else c.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
  assert.equal((await read(response, async () => {})).content, "বাংলা");
  await assert.rejects(
    () => read(new Response("x".repeat(1000001)), async () => {}),
    /TOO_LARGE/,
  );
});
const selection = {
  grade: 11,
  paper: 2,
  mode: "selected",
  itemIds: ["articles", "prepositions"],
  writing: {},
  sources: {},
  includeAnswers: false,
};
const grammar = (id) => ({
  id,
  instruction: "Fill in the blanks.",
  subitems: Array.from({ length: 10 }, (_, i) => ({ text: `Blank ${i}` })),
});
test("HSC second paper recovers valid tasks but not truncated or wrong-count tasks", () => {
  const content =
    '{"passages":[],"tasks":[' +
    JSON.stringify(grammar("articles")) +
    ',{"id":"prepositions","subitems":[';
  const recovered = recover(selection, content);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].id, "articles");
  assert.equal(recovered[0].result.total, 5);
  const bad = grammar("prepositions");
  bad.subitems.pop();
  assert.equal(
    recover(
      selection,
      JSON.stringify({ passages: [], tasks: [grammar("articles"), bad] }),
    ).length,
    1,
  );
});
test("recovery preserves exact supplied source and requires original requested answers/topics", () => {
  const s = {
    grade: 6,
    paper: 1,
    mode: "selected",
    itemIds: ["paragraph"],
    writing: { paragraph: { topic: "My school" } },
    sources: {},
    includeAnswers: true,
  };
  const task = {
    id: "paragraph",
    instruction: "Write about My school in 120 words.",
    subitems: [],
  };
  assert.equal(
    recover(s, JSON.stringify({ passages: [], tasks: [task] })).length,
    0,
  );
  task.answer = "Sample";
  assert.equal(
    recover(s, JSON.stringify({ passages: [], tasks: [task] })).length,
    1,
  );
  task.instruction = "Write about Another topic in 120 words.";
  assert.equal(
    recover(s, JSON.stringify({ passages: [], tasks: [task] })).length,
    0,
  );
});
test("worker rejects incomplete answers, duplicate MCQ choices and missing CQ parts", () => {
  assert.equal(workerQuestion({ text: "Q" }, "SQ", false), null);
  assert.equal(
    workerQuestion(
      {
        text: "Q",
        options: { A: "a", B: "a", C: "c", D: "d" },
        correct: "A",
        explanation: "e",
      },
      "MCQ",
      false,
    ),
    null,
  );
  const q = {
    stimulus: "Scenario",
    k: "k",
    kh: "kh",
    g: "g",
    answers: { k: "a", kh: "b", g: "c" },
  };
  assert.ok(workerQuestion(q, "CQ", true));
  assert.equal(workerQuestion(q, "CQ", false), null);
});
test("admin worker retains pending questions and marks interrupted task failed", async () => {
  const old = global.fetch,
    oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  const created = [],
    states = [];
  let chunk = 0;
  global.fetch = async () =>
    new Response(
      new ReadableStream({
        pull(c) {
          if (chunk++ === 0)
            c.enqueue(
              new TextEncoder().encode(
                event(
                  '{"questions":[{"text":"Complete question","answer":"Complete answer"},',
                ),
              ),
            );
          else c.error(new Error("disconnected"));
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  const db = {
    aiTask: {
      updateMany: async () => ({ count: 1 }),
      findFirst: async () => ({
        id: "task",
        type: "SQ",
        category: "11",
        subject: "Bangla",
        topic: "Poetry",
        part: 1,
        totalParts: 1,
      }),
      update: async (a) => {
        states.push(a.data.status);
        return a;
      },
    },
    question: {
      findMany: async () => [],
      create: async (a) => {
        created.push(a.data);
        return a;
      },
    },
  };
  try {
    const route = load("app/api/admin/ai-worker/route.ts", {
      "@/lib/db": { db },
      "@/lib/nctb-data": { NCTB_CLASSES: [] },
      "@/lib/route-guard": { checkAdminOrCron: async () => null },
    });
    const result = await route.GET(new Request("http://example.test"));
    assert.equal(result.status, 500);
    assert.equal(created.length, 1);
    assert.equal(created[0].approved, false);
    assert.equal(states.at(-1), "FAILED");
  } finally {
    global.fetch = old;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});

test("English review decisions require ADMIN and only update a validated pending snapshot with CAS", async () => {
  let user = { role: "TEACHER" },
    reads = 0,
    updates = [];
  const draft = {
    version: 1,
    name: "Recovered",
    selection: {
      grade: 6,
      paper: 1,
      mode: "writing",
      itemIds: ["paragraph"],
      writing: { paragraph: { topic: "My school" } },
      sources: {},
      includeAnswers: false,
    },
    output: {
      passages: [],
      tasks: [
        {
          id: "paragraph",
          instruction: "Write about My school in 120 words.",
          subitems: [],
        },
      ],
    },
    header: load("lib/paper-header.ts").paperHeaderSchema.parse({}),
    fontSize: 12,
    font: "serif",
    updatedAt: new Date().toISOString(),
  };
  const row = { value: JSON.stringify({ status: "PENDING", draft }) };
  const db = {
    setting: {
      findUnique: async () => {
        reads++;
        return row;
      },
      updateMany: async (a) => {
        updates.push(a);
        return { count: 1 };
      },
    },
  };
  const { decideEnglishRecovery: decide } = load(
    "app/admin/english-review/actions.ts",
    {
      "@/auth": { auth: async () => ({ user }) },
      "@/lib/db": { db },
      "next/cache": { revalidatePath: () => {} },
    },
  );
  const form = new FormData();
  form.set("key", "english-review:12345678-1234-1234-1234-123456789abc");
  form.set("status", "APPROVED");
  await assert.rejects(() => decide(form), /Forbidden/);
  assert.equal(reads, 0);
  user = { role: "ADMIN" };
  await decide(form);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].where.value, row.value);
  assert.equal(JSON.parse(updates[0].data.value).status, "APPROVED");
  row.value = JSON.stringify({ status: "APPROVED", draft });
  await decide(form);
  assert.equal(updates.length, 1);
});

test("linked English recovered tasks retain exact supplied passage and omit unrelated sources", () => {
  const s = {
    grade: 6,
    paper: 1,
    mode: "selected",
    itemIds: ["mcq"],
    writing: {},
    sources: {
      "seen-1": { text: "Exact supplied extract.", reference: "Unit 1" },
    },
    includeAnswers: false,
  };
  const task = {
    id: "mcq",
    instruction: "Choose.",
    passageKey: "seen-1",
    subitems: Array.from({ length: 7 }, (_, i) => ({
      text: `Question ${i}`,
      options: ["A", "B", "C", "D"],
    })),
  };
  const parts = recover(s, JSON.stringify({ passages: [], tasks: [task] }));
  assert.equal(parts.length, 1);
  assert.equal(
    parts[0].result.output.passages[0].text,
    s.sources["seen-1"].text,
  );
  assert.equal(
    recover(
      s,
      JSON.stringify({
        passages: [{ key: "seen-1", text: "AI rewrite" }],
        tasks: [task],
      }),
    ).length,
    1,
  ); // server still inserts original, never provider rewrite
});

test("bank matching respects approval, topics, answer requirements and strips unrequested answers", async () => {
  const { findEnglishBankParts: find } = load("lib/english/bank.ts");
  const s = {
    grade: 6,
    paper: 1,
    mode: "writing",
    itemIds: ["paragraph"],
    writing: { paragraph: { topic: "My school" } },
    sources: {},
    includeAnswers: false,
  };
  const draft = {
    version: 1,
    name: "Bank",
    selection: { ...s, includeAnswers: true },
    output: {
      passages: [],
      tasks: [
        {
          id: "paragraph",
          instruction: "Write about My school in 120 words.",
          subitems: [],
          answer: "Sample",
        },
      ],
    },
    header: load("lib/paper-header.ts").paperHeaderSchema.parse({}),
    fontSize: 12,
    font: "serif",
    updatedAt: new Date().toISOString(),
  };
  const row = (status) => ({
    key: "english-review:x",
    value: JSON.stringify({ status, draft }),
  });
  assert.equal(
    (await find(s, async () => [row("PENDING")])).missingIds.length,
    1,
  );
  const result = await find(s, async () => [row("APPROVED")]);
  assert.equal(result.missingIds.length, 0);
  assert.equal(result.output.tasks[0].answer, undefined);
  assert.equal(
    (
      await find(
        { ...s, writing: { paragraph: { topic: "Other" } } },
        async () => [row("APPROVED")],
      )
    ).missingIds.length,
    1,
  );
  assert.equal(
    (await find({ ...s, grade: 7 }, async () => [row("APPROVED")])).missingIds
      .length,
    1,
  );
});

test("bank never mixes unrelated unseen passages and paginates past first hundred records", async () => {
  const { findEnglishBankParts: find } = load("lib/english/bank.ts");
  const base = {
    grade: 6,
    paper: 1,
    mode: "selected",
    itemIds: ["true-false", "summary"],
    writing: {},
    sources: {},
    includeAnswers: false,
  };
  function row(id, text, key) {
    return {
      key,
      value: JSON.stringify({
        status: "APPROVED",
        draft: {
          version: 1,
          name: "Bank",
          selection: { ...base, itemIds: [id] },
          output: {
            passages: [{ key: "unseen", text }],
            tasks: [
              {
                id,
                instruction: "Read the passage.",
                passageKey: "unseen",
                subitems:
                  id === "true-false"
                    ? Array.from({ length: 5 }, (_, i) => ({
                        text: `Item ${i}`,
                      }))
                    : [],
              },
            ],
          },
          header: load("lib/paper-header.ts").paperHeaderSchema.parse({}),
          fontSize: 12,
          font: "serif",
          updatedAt: new Date().toISOString(),
        },
      }),
    };
  }
  const a = row("true-false", "Original A", "a"),
    b = row("summary", "Original B", "b"),
    c = row("summary", "Original A", "c");
  assert.equal((await find(base, async () => [a, b])).missingIds.length, 2);
  const match = await find(base, async () => [a, b, c]);
  assert.equal(match.missingIds.length, 0);
  assert.equal(match.output.passages.length, 1);
  assert.equal(match.output.passages[0].text, "Original A");
  let pages = 0;
  const result = await find(
    { ...base, itemIds: ["summary"] },
    async (after) => {
      pages++;
      if (!after)
        return Array.from({ length: 100 }, (_, i) => ({
          key: String(i).padStart(3, "0"),
          value: "invalid",
        }));
      assert.equal(after, "099");
      return [c];
    },
  );
  assert.equal(pages, 2);
  assert.equal(result.missingIds.length, 0);
});
