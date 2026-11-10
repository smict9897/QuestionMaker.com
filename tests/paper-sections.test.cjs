const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const m = new Module("sections");
m._compile(
  ts.transpileModule(fs.readFileSync("lib/paper-sections.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "sections.js",
);
const lib = m.exports;
test("mixed papers follow MCQ CQ SQ order regardless of selection order", () =>
  assert.deepEqual(lib.PAPER_SECTION_ORDER, ["MCQ", "CQ", "SHORT"]));
test("CQ and SQ have requested Bengali division headings", () => {
  assert.equal(lib.paperSectionTitle("CQ", "MCQ"), "ক-বিভাগ: সৃজনশীল অংশ");
  assert.equal(
    lib.paperSectionTitle("SHORT", "MCQ"),
    "খ-বিভাগ: সংক্ষিপ্ত প্রশ্ন",
  );
  assert.equal(lib.paperSectionTitle("MCQ", "Custom MCQ"), "Custom MCQ");
  assert.equal(
    lib.paperSectionTitle("CQ", "MCQ", "Algebra"),
    "ক-বিভাগ: সৃজনশীল অংশ — Algebra",
  );
});
test("select all toggles only the visible tab without clearing other types", () => {
  assert.deepEqual(lib.toggleVisibleSelection(["mcq", "cq"], ["mcq"]), ["cq"]);
  assert.deepEqual(lib.toggleVisibleSelection(["mcq"], ["cq", "sq"]), [
    "mcq",
    "cq",
    "sq",
  ]);
  assert.deepEqual(lib.toggleVisibleSelection(["mcq"], []), ["mcq"]);
});

test("mixed ID API does not silently truncate later types at 200", async () => {
  const Module = require("node:module");
  const rows = Array.from({ length: 240 }, (_, i) => ({
    id: `q${i}`,
    text: `Question ${i}`,
    options:
      i === 238 ? { stimulus: "CQ", k: "k", kh: "kh", g: "g", gh: "gh" } : {},
    correct: i < 238 ? "a" : "",
    source: "Manual",
    approved: true,
  }));
  const mod = new Module("mixed-api");
  mod.require = (n) =>
    ({
      "@/auth": { auth: async () => ({ user: { id: "owner" } }) },
      "@/lib/paper-generation": {
        visibleQuestions: () => ({ approved: true }),
      },
      "@/lib/db": {
        db: {
          question: {
            findMany: async ({ where }) =>
              rows.filter((r) => where.id.in.includes(r.id)),
          },
        },
      },
      "next/server": {
        NextResponse: {
          json: (data, opts) => ({ data, status: opts?.status || 200 }),
        },
      },
    })[n] || require(n);
  mod._compile(
    ts.transpileModule(
      fs.readFileSync("app/api/qb/questions/route.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    "mixed-api.js",
  );
  const res = await mod.exports.POST({
    json: async () => ({ ids: rows.map((r) => r.id) }),
  });
  assert.equal(res.data.items.length, 240);
  assert.equal(res.data.items[238].type, "CQ");
  assert.equal(res.data.items[239].type, "SHORT");
  assert.equal(
    (
      await mod.exports.POST({
        json: async () => ({
          ids: Array.from({ length: 301 }, (_, i) => `${i}`),
        }),
      })
    ).status,
    400,
  );
});
test("CQ SQ column control is exposed and defaults to one", () => {
  assert.match(
    fs.readFileSync("components/paper-builder/settings.tsx", "utf8"),
    /label="কলাম \(CQ \/ SQ\)"/,
  );
  assert.match(
    fs.readFileSync("lib/paper-builder.ts", "utf8"),
    /cqColumns: number\(1, 1, 3\)/,
  );
});
