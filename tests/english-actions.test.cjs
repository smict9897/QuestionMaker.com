const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  path = require("node:path");
function harness() {
  const rows = new Map();
  let user = { id: "teacher:one", role: "TEACHER" },
    calls = 0,
    provider = null;
  const code = () => {
    const e = new Error();
    e.code = "P2002";
    throw e;
  };
  const db = {
    $transaction: async (operations) => Promise.all(operations),
    setting: {
      create: async ({ data }) => {
        if (rows.has(data.key)) code();
        rows.set(data.key, data.value);
        return data;
      },
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [k, v] of rows)
          if (
            k === where.key &&
            (!where.value ||
              (where.value.lt && v < where.value.lt) ||
              (where.value.endsWith && v.endsWith(where.value.endsWith)))
          ) {
            rows.delete(k);
            count++;
          }
        return { count };
      },
      findUnique: async ({ where }) =>
        rows.has(where.key)
          ? { key: where.key, value: rows.get(where.key) }
          : null,
      updateMany: async ({ where, data }) => {
        if (
          !rows.has(where.key) ||
          (where.value !== undefined && rows.get(where.key) !== where.value)
        )
          return { count: 0 };
        rows.set(where.key, data.value);
        return { count: 1 };
      },
      findMany: async ({ where }) =>
        [...rows]
          .filter(([k]) => k.startsWith(where.key.startsWith))
          .map(([key, value]) => ({ key, value })),
    },
  };
  const cache = {};
  function load(file) {
    file = path.resolve(file);
    if (cache[file]) return cache[file].exports;
    const m = new Module(file, module);
    m.filename = file;
    m.paths = module.paths;
    cache[file] = m;
    m.require = (id) => {
      if (id === "@/auth") return { auth: async () => ({ user }) };
      if (id === "@/lib/db") return { db };
      if (id === "@/lib/english/provider")
        return {
          requestEnglishPaper: async (s, options) => {
            calls++;
            if (provider) return provider(s, options);
            return {
              total: 10,
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
            };
          },
        };
      if (id.startsWith("@/")) return load(id.slice(2) + ".ts");
      if (id.startsWith("."))
        return load(path.resolve(path.dirname(file), id) + ".ts");
      return require(id);
    };
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
  return {
    actions: load("app/actions/english-paper.ts"),
    rows,
    setUser: (u) => (user = u),
    setProvider: (p) => (provider = p),
    get calls() {
      return calls;
    },
  };
}
const selection = {
  grade: 6,
  paper: 1,
  mode: "writing",
  itemIds: ["paragraph"],
  writing: { paragraph: { topic: "My school" } },
  sources: {},
  includeAnswers: false,
};
test("English generation denies unauthorized users before provider or database writes", async () => {
  const h = harness();
  h.setUser(null);
  assert.equal((await h.actions.generateEnglishPaper(selection)).ok, false);
  assert.equal(h.calls, 0);
  assert.equal(h.rows.size, 0);
  h.setUser({ id: "", role: "STUDENT" });
  assert.equal((await h.actions.generateEnglishPaper(selection)).ok, false);
  assert.equal(h.calls, 0);
  assert.equal(h.rows.size, 0);
});
test("private drafts support save/reopen but deny a second teacher; daily quota is enforced", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness();
    const result = await h.actions.generateEnglishPaper(selection);
    assert.equal(result.ok, true);
    const draft = await h.actions.loadEnglishPaper(result.key);
    assert.equal(draft.name, "English 6 — Paper 1");
    assert.equal(
      (
        await h.actions.saveEnglishPaper(result.key, {
          ...draft,
          name: "Edited",
        })
      ).ok,
      true,
    );
    assert.equal((await h.actions.loadEnglishPaper(result.key)).name, "Edited");
    h.setUser({ id: "teacher:two", role: "TEACHER" });
    assert.equal(await h.actions.loadEnglishPaper(result.key), null);
    assert.equal(
      (await h.actions.saveEnglishPaper(result.key, draft)).ok,
      false,
    );
    assert.equal((await h.actions.listEnglishPapers()).length, 0);
    h.setUser({ id: "teacher:one", role: "TEACHER" });
    for (let i = 1; i < 10; i++)
      assert.equal((await h.actions.generateEnglishPaper(selection)).ok, true);
    assert.equal((await h.actions.generateEnglishPaper(selection)).ok, false);
    assert.equal(h.calls, 10);
    assert.equal(
      [...h.rows.keys()].some((k) => k.startsWith("englishai:lock:")),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("concurrent generation requests allow only one provider call", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness();
    const results = await Promise.all([
      h.actions.generateEnglishPaper(selection),
      h.actions.generateEnglishPaper(selection),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1);
    assert.equal(h.calls, 1);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("draft save rejects stale tabs instead of silently overwriting newer edits", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness(),
      r = await h.actions.generateEnglishPaper(selection),
      original = await h.actions.loadEnglishPaper(r.key);
    const saved = await h.actions.saveEnglishPaper(r.key, {
      ...original,
      name: "Tab one",
    });
    assert.equal(saved.ok, true);
    assert.ok(saved.updatedAt > original.updatedAt);
    const stale = await h.actions.saveEnglishPaper(r.key, {
      ...original,
      name: "Tab two",
    });
    assert.equal(stale.ok, false);
    assert.equal(stale.conflict, true);
    assert.equal((await h.actions.loadEnglishPaper(r.key)).name, "Tab one");
    const current = await h.actions.loadEnglishPaper(r.key);
    assert.equal(
      (
        await h.actions.saveEnglishPaper(r.key, {
          ...current,
          name: "Reloaded",
        })
      ).ok,
      true,
    );
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});

test("admin bypasses daily quota including existing full quota, but retains generation lock", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness();
    for (let i = 0; i < 10; i++)
      assert.equal((await h.actions.generateEnglishPaper(selection)).ok, true);
    h.setUser({ id: "teacher:one", role: "ADMIN" });
    for (let i = 0; i < 12; i++)
      assert.equal((await h.actions.generateEnglishPaper(selection)).ok, true);
    assert.equal(
      [...h.rows.keys()].filter((k) => k.startsWith("englishai:quota:")).length,
      10,
    );
    const results = await Promise.all([
      h.actions.generateEnglishPaper(selection),
      h.actions.generateEnglishPaper(selection),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1);
    h.setUser({ id: "teacher:one", role: "TEACHER" });
    assert.equal((await h.actions.generateEnglishPaper(selection)).ok, false);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});

test("English action durably checkpoints valid tasks before later provider failure and denies other owner", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test";
  try {
    const h = harness();
    h.setProvider(async (s, options) => {
      const content = JSON.stringify({
        passages: [],
        tasks: [
          {
            id: "paragraph",
            instruction: "Write about My school in 120 words.",
            subitems: [],
          },
        ],
      });
      await options.onContent(content);
      await options.onContent(content);
      throw new Error("network lost");
    });
    const result = await h.actions.generateEnglishPaper(selection);
    assert.equal(result.ok, false);
    assert.match(result.error, /1টি সম্পূর্ণ অংশ/);
    await h.actions.generateEnglishPaper(selection);
    const keys = [...h.rows.keys()],
      review = keys.filter((k) => k.startsWith("english-review:"));
    assert.equal(review.length, 1);
    const record = JSON.parse(h.rows.get(review[0]));
    assert.equal(record.status, "PENDING");
    assert.ok(await h.actions.loadEnglishPaper(record.draftKey));
    h.setUser({ id: "other", role: "TEACHER" });
    assert.equal(await h.actions.loadEnglishPaper(record.draftKey), null);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});

test("approved bank is checked before provider configuration/quota; pending and mismatched records never cross owners", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test";
  try {
    const h = harness();
    const initial = await h.actions.generateEnglishPaper(selection);
    const draft = await h.actions.loadEnglishPaper(initial.key);
    h.rows.set(
      "english-review:bank-test",
      JSON.stringify({ status: "PENDING", draft }),
    );
    h.setUser({ id: "teacher:two", role: "TEACHER" });
    delete process.env.DEEPSEEK_API_KEY;
    assert.equal((await h.actions.generateEnglishPaper(selection)).ok, false);
    h.rows.set(
      "english-review:bank-test",
      JSON.stringify({ status: "APPROVED", draft }),
    );
    const result = await h.actions.generateEnglishPaper(selection);
    assert.equal(result.ok, true);
    assert.equal(h.calls, 1);
    assert.ok(await h.actions.loadEnglishPaper(result.key));
    assert.equal(
      [...h.rows.keys()].filter((k) => k.startsWith("englishai:quota:")).length,
      1,
    );
    assert.equal(
      (
        await h.actions.generateEnglishPaper({
          ...selection,
          includeAnswers: true,
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await h.actions.generateEnglishPaper({
          ...selection,
          writing: { paragraph: { topic: "Different topic" } },
        })
      ).ok,
      false,
    );
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("partial bank hit sends only missing task to provider and combines validated output", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test";
  try {
    const h = harness();
    let requested = [];
    h.setProvider(async (s) => {
      requested.push(s.itemIds);
      return {
        total: 5,
        output: {
          passages: [],
          tasks: s.itemIds.map((id) => ({
            id,
            instruction: "Fill blanks.",
            subitems: Array.from({ length: 10 }, (_, i) => ({
              text: `Item ${i}`,
            })),
          })),
        },
      };
    });
    const s = {
      grade: 11,
      paper: 2,
      mode: "selected",
      itemIds: ["articles"],
      writing: {},
      sources: {},
      includeAnswers: false,
    };
    const first = await h.actions.generateEnglishPaper(s);
    const draft = await h.actions.loadEnglishPaper(first.key);
    h.rows.set(
      "english-review:approved",
      JSON.stringify({ status: "APPROVED", draft }),
    );
    const result = await h.actions.generateEnglishPaper({
      ...s,
      itemIds: ["articles", "prepositions"],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(requested, [["articles"], ["prepositions"]]);
    const loaded = await h.actions.loadEnglishPaper(result.key);
    assert.deepEqual(
      loaded.output.tasks.map((t) => t.id),
      ["articles", "prepositions"],
    );
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});

test("signed-in STUDENT can generate, save, list and reopen only their own English drafts", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness();
    h.setUser({ id: "student:one", role: "STUDENT" });
    const r = await h.actions.generateEnglishPaper(selection);
    assert.equal(r.ok, true);
    assert.equal(h.calls, 1);
    const draft = await h.actions.loadEnglishPaper(r.key);
    assert.ok(draft);
    assert.equal(
      (
        await h.actions.saveEnglishPaper(r.key, {
          ...draft,
          name: "Student paper",
        })
      ).ok,
      true,
    );
    assert.ok(
      (await h.actions.listEnglishPapers()).some(
        (p) => p.name === "Student paper",
      ),
    );
    for (const u of [
      { id: "student:two", role: "STUDENT" },
      { id: "teacher:other", role: "TEACHER" },
      null,
    ]) {
      h.setUser(u);
      assert.equal(await h.actions.loadEnglishPaper(r.key), null);
      assert.equal((await h.actions.saveEnglishPaper(r.key, draft)).ok, false);
      assert.equal((await h.actions.listEnglishPapers()).length, 0);
    }
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("STUDENT keeps one-generation lock and ten-per-day quota; never gets ADMIN bypass", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness();
    h.setUser({ id: "student:quota", role: "STUDENT" });
    const concurrent = await Promise.all([
      h.actions.generateEnglishPaper(selection),
      h.actions.generateEnglishPaper(selection),
    ]);
    assert.equal(concurrent.filter((r) => r.ok).length, 1);
    for (let i = 1; i < 10; i++)
      assert.equal((await h.actions.generateEnglishPaper(selection)).ok, true);
    const denied = await h.actions.generateEnglishPaper(selection);
    assert.equal(denied.ok, false);
    assert.match(denied.error, /সীমা/);
    assert.equal(h.calls, 10);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
test("STUDENT interrupted generation checkpoints remain private and pending approval", async () => {
  const old = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    const h = harness();
    h.setUser({ id: "student:recover", role: "STUDENT" });
    h.setProvider(async (s, options) => {
      await options.onContent(
        JSON.stringify({
          passages: [],
          tasks: [
            {
              id: "paragraph",
              instruction: "Write about My school in 120 words.",
              subitems: [],
            },
          ],
        }),
      );
      throw Error("network lost");
    });
    const r = await h.actions.generateEnglishPaper(selection);
    assert.equal(r.ok, false);
    const records = [...h.rows].filter(([k]) =>
      k.startsWith("english-review:"),
    );
    assert.equal(records.length, 1);
    const record = JSON.parse(records[0][1]);
    assert.equal(record.status, "PENDING");
    assert.ok(await h.actions.loadEnglishPaper(record.draftKey));
    h.setUser({ id: "student:other", role: "STUDENT" });
    assert.equal(await h.actions.loadEnglishPaper(record.draftKey), null);
  } finally {
    if (old === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = old;
  }
});
