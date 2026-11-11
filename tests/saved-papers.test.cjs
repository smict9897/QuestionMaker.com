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
const { filterSavedPapers, savedPaperInfo } = load("lib/saved-paper-list.ts");
const paper = {
  key: "qbpaper:u:a",
  name: "গণিত পরীক্ষা",
  ids: ["q"],
  count: 1,
  settings: {
    info: { cls: "নবম", subject: "গণিত", marks: "৫০", minutes: "৬০" },
  },
  categories: ["SSC"],
  subjects: ["Math"],
  chapters: ["বীজগণিত"],
  createdAt: "2026-11-10",
  updatedAt: "2026-11-10",
  typeCounts: { MCQ: 1 },
};
test("saved paper metadata prefers snapshot and falls back to bank chapters", () => {
  const i = savedPaperInfo(paper);
  assert.deepEqual(i.categories, ["নবম"]);
  assert.deepEqual(i.chapters, ["বীজগণিত"]);
  assert.equal(i.marks, "৫০");
});
test("saved paper filters combine class subject name and chapter search", () => {
  const papers = [paper];
  assert.equal(
    filterSavedPapers(papers, {
      category: "নবম",
      subject: "গণিত",
      query: "বীজগণিত",
    }).length,
    1,
  );
  assert.equal(
    filterSavedPapers(papers, { category: "অষ্টম", subject: "", query: "" })
      .length,
    0,
  );
  assert.equal(
    filterSavedPapers(papers, { category: "", subject: "", query: "পরীক্ষা" })
      .length,
    1,
  );
});
function api(user, rows = [], paid = user?.role !== "STUDENT") {
  let deleted = false,
    created;
  return {
    get deleted() {
      return deleted;
    },
    get created() {
      return created;
    },
    actions: load("app/actions/qb-papers.ts", {
      "@/lib/wallet": {
        requirePaidQuestions: async () => {
          if (!paid) throw Error("checkout required");
        },
      },
      "@/lib/paper-generation": {
        visibleQuestions: () => ({ approved: true }),
      },
      "@/auth": { auth: async () => ({ user }) },
      "next/cache": { revalidatePath: () => {} },
      "@/lib/db": {
        db: {
          setting: {
            findMany: async () => rows,
            findUnique: async ({ where }) =>
              rows.find((r) => r.key === where.key),
            create: async (args) => {
              created = args.data;
            },
            delete: async () => {
              deleted = true;
            },
          },
          question: {
            findMany: async () => [
              {
                id: "q",
                category: "SSC",
                subject: "Math",
                topic: "Algebra",
                correct: "A",
                options: {},
              },
            ],
          },
        },
      },
    }),
  };
}
const row = (owner, key = "qbpaper:u:a") => ({
  key,
  value: JSON.stringify({
    ownerId: owner,
    name: "Test",
    ids: ["q"],
    createdAt: "2026-11-10",
  }),
});
test("teachers only list their owned papers and cannot see legacy or other owner", async () => {
  const a = api({ id: "u", role: "TEACHER" }, [
    row("u"),
    row("v", "qbpaper:v:b"),
    row(undefined, "qbpaper:old"),
  ]);
  const p = await a.actions.listPapers();
  assert.equal(p.length, 1);
  assert.deepEqual(p[0].categories, ["SSC"]);
  assert.deepEqual(p[0].typeCounts, { MCQ: 1 });
});
test("cross-owner deletion is refused and owner deletion succeeds", async () => {
  const a = api({ id: "u", role: "TEACHER" }, [row("v")]);
  assert.equal((await a.actions.deletePaper("qbpaper:u:a")).ok, false);
  assert.equal(a.deleted, false);
  const b = api({ id: "u", role: "TEACHER" }, [row("u")]);
  assert.equal((await b.actions.deletePaper("qbpaper:u:a")).ok, true);
  assert.equal(b.deleted, true);
});
test("ownerless legacy papers remain admin-only", async () => {
  const a = api({ id: "admin", role: "ADMIN" }, [row(undefined)]);
  assert.equal((await a.actions.listPapers()).length, 1);
});
test("new saves include owner and scoped key; unpaid students cannot save", async () => {
  const a = api({ id: "u", role: "TEACHER" });
  assert.equal(
    (await a.actions.savePaper({ name: "Test", ids: ["q"], settings: {} })).ok,
    true,
  );
  assert.match(a.created.key, /^qbpaper:u:/);
  assert.equal(JSON.parse(a.created.value).ownerId, "u");
  const b = api({ id: "s", role: "STUDENT" });
  assert.equal(
    (await b.actions.savePaper({ name: "Test", ids: ["q"] })).ok,
    false,
  );
});

test("paid student may save only an owned paper", async () => {
  const a = api({ id: "s", role: "STUDENT" }, [], true);
  const r = await a.actions.savePaper({
    name: "Paid paper",
    ids: ["q"],
    settings: {},
  });
  assert.equal(r.ok, true);
  assert.match(a.created.key, /^qbpaper:s:/);
});
