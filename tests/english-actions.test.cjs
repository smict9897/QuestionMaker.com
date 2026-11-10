const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  path = require("node:path");
function harness() {
  const rows = new Map();
  let user = { id: "teacher:one", role: "TEACHER" },
    calls = 0;
  const code = () => {
    const e = new Error();
    e.code = "P2002";
    throw e;
  };
  const db = {
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
          requestEnglishPaper: async (s) => {
            calls++;
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
  h.setUser({ id: "student", role: "STUDENT" });
  assert.equal((await h.actions.generateEnglishPaper(selection)).ok, false);
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
