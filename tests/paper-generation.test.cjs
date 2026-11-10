const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
function load(file, mocks = {}) {
  const m = new Module(file);
  m.require = (n) => mocks[n] || require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const lib = load("lib/paper-generation.ts");
const home = load("lib/home-data.ts");
function api({
  user = { id: "owner" },
  counts = [0, 0],
  quota = false,
  existing = [],
} = {}) {
  let aiCalls = 0,
    created = [],
    queries = [];
  const db = {
    question: {
      findMany: async () => existing,
      count: async (args) => {
        queries.push(args.where);
        return counts.length ? counts.shift() : 0;
      },
      create: (args) => {
        created.push(args.data);
        return Promise.resolve({ id: "q" });
      },
    },
    setting: {
      deleteMany: async () => ({ count: 0 }),
      create: async (args) => {
        if (quota && args.data.key.includes("quota:")) throw { code: "P2002" };
        return args.data;
      },
    },
    $transaction: async (tasks) => Promise.all(tasks),
  };
  const actions = load("app/actions/prepare-paper.ts", {
    "@/auth": { auth: async () => ({ user }) },
    "@/lib/db": { db },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/paper-generation": lib,
    "@/lib/home-data": home,
    "@/lib/nctb-data": { NCTB_CLASSES: [] },
  });
  return { actions, created, queries };
}
const input = { category: "SSC", subject: "Math", topics: ["Algebra"] };
test("visibility is approved-public OR exactly owner private pending", () => {
  const a = lib.visibleQuestions("a"),
    b = lib.visibleQuestions("b");
  assert.deepEqual(lib.visibleQuestions(), { approved: true });
  assert.notEqual(a.OR[1].source, b.OR[1].source);
  assert.equal(a.OR[1].approved, false);
  assert.ok(!a.OR[1].source.includes(":a"));
});
test("validates topic limits and complete AI question structure", () => {
  assert.equal(
    lib.selectionSchema.safeParse({ ...input, topics: Array(13).fill("X") })
      .success,
    false,
  );
  assert.equal(
    lib.generatedSchema.safeParse({ questions: [{ type: "MCQ", text: "X" }] })
      .success,
    false,
  );
});
test("existing database questions avoid AI and need no API key", async () => {
  const a = api({ counts: [30] });
  const result = await a.actions.preparePaperTopic(input);
  assert.deepEqual(result, { ok: true, generated: false, count: 30 });
  assert.equal(a.created.length, 0);
});
test("unauthenticated callers cannot check or generate", async () => {
  const a = api({ user: null });
  assert.equal((await a.actions.checkPaperTopics(input)).ok, false);
  assert.equal((await a.actions.preparePaperTopic(input)).ok, false);
  assert.equal(a.queries.length, 0);
});
test("new AI questions stay pending and are correctly encoded for the creator", async () => {
  const oldFetch = global.fetch,
    oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              questions: [
                {
                  type: "SHORT",
                  text: "Define algebra",
                  explanation: "A branch of mathematics",
                },
                {
                  type: "CQ",
                  stimulus: "A field has length 4.",
                  subQuestions: {
                    k: "Define length",
                    kh: "Explain",
                    g: "Calculate",
                    gh: "Analyze",
                  },
                },
              ],
            }),
          },
        },
      ],
    }),
  });
  try {
    const a = api();
    const result = await a.actions.preparePaperTopic(input);
    assert.equal(result.ok, true);
    assert.equal(result.generated, true);
    assert.equal(a.created.length, 2);
    assert.ok(
      a.created.every(
        (q) => q.approved === false && q.source === lib.pendingSource("owner"),
      ),
    );
    assert.deepEqual(a.created[1].options.subQuestions, {
      k: "Define length",
      kh: "Explain",
      g: "Calculate",
      gh: "Analyze",
    });
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});
test("daily quota exhaustion refuses AI before calling provider", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test";
  try {
    const a = api({ quota: true });
    assert.equal((await a.actions.preparePaperTopic(input)).ok, false);
    assert.equal(a.created.length, 0);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("missing provider configuration returns actionable error without saving", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  try {
    const a = api();
    const result = await a.actions.preparePaperTopic(input);
    assert.equal(result.ok, false);
    assert.match(result.error, /কনফিগার/);
    assert.equal(a.created.length, 0);
  } finally {
    if (old !== undefined) process.env.DEEPSEEK_API_KEY = old;
  }
});
test("all-chapter existing bank skips generation tasks", async () => {
  const a = api({ counts: [30] });
  assert.deepEqual(await a.actions.checkPaperTopics({ ...input, topics: [] }), {
    ok: true,
    topics: [],
  });
});
test("an incomplete chapter is topped up and response reports cumulative count", async () => {
  const oldFetch = global.fetch,
    oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              questions: [
                { type: "SHORT", text: "New one", explanation: "Answer one" },
                { type: "SHORT", text: "New two", explanation: "Answer two" },
                { type: "SHORT", text: "Extra", explanation: "Answer" },
              ],
            }),
          },
        },
      ],
    }),
  });
  try {
    const a = api({ counts: [28, 28] });
    const result = await a.actions.preparePaperTopic(input);
    assert.equal(result.ok, true);
    assert.equal(result.count, 30);
    assert.equal(result.added, 2);
    assert.equal(a.created.length, 2);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});
test("repeated questions are not saved across batches", async () => {
  const oldFetch = global.fetch,
    oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              questions: [
                {
                  type: "SHORT",
                  text: " ALREADY   EXISTS ",
                  explanation: "Answer",
                },
              ],
            }),
          },
        },
      ],
    }),
  });
  try {
    const a = api({ counts: [6, 6], existing: [{ text: "already exists" }] });
    const result = await a.actions.preparePaperTopic(input);
    assert.equal(result.ok, false);
    assert.equal(a.created.length, 0);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});
test("preparation does not advance before 30 and uses bounded sequential batches", () => {
  const source = fs.readFileSync("components/paper-preparation.tsx", "utf8");
  assert.match(source, /batch\s*<\s*12/);
  assert.match(source, /result.count\s*>=\s*30/);
  assert.match(source, /if\s*\(!ready\)/);
  assert.doesNotMatch(source, /AI তৈরি করবে/);
});
