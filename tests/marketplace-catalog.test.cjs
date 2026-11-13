const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
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
const exams = load("lib/marketplace-exam-types.ts");
const market = load("lib/marketplace.ts", {
  "@/lib/marketplace-exam-types": exams,
});
const lib = load("lib/marketplace-catalog.ts", {
  "@/lib/marketplace": market,
  "@/lib/wallet": { teacherTid: (id) => `public-${id}` },
});
const record = {
  version: 1,
  id: "a".repeat(64),
  ownerId: "u",
  status: "APPROVED",
  updatedAt: "2026-11-10T00:00:00Z",
  metadata: {
    title: "বাংলা পরীক্ষা",
    grade: "9",
    subject: "বাংলা",
    chapters: ["গদ্য"],
    examType: "বার্ষিক পরীক্ষা",
    description: "পরীক্ষার বিস্তারিত বিবরণ",
    pricePaisa: 5000,
    rights: true,
  },
  snapshot: {
    questions: ["SECRET_QUESTION"],
    settings: { address: "PRIVATE_ADDRESS" },
  },
  review: { note: "PRIVATE_NOTE" },
  sourceKey: "PRIVATE_KEY",
};
test("public catalog explicitly strips snapshots, personal settings, source keys and review", () => {
  const p = lib.publicMarketPaper(JSON.stringify(record));
  assert.ok(p);
  assert.deepEqual(Object.keys(p).sort(), [
    "id",
    "metadata",
    "sellerTid",
    "updatedAt",
  ]);
  const out = JSON.stringify(p);
  for (const secret of [
    "SECRET_QUESTION",
    "PRIVATE_ADDRESS",
    "PRIVATE_NOTE",
    "PRIVATE_KEY",
    '"ownerId"',
  ])
    assert.ok(!out.includes(secret));
});
test("pending, rejected, malformed, missing-type and invalid records are not public", () => {
  for (const patch of [
    { status: "PENDING" },
    { status: "CHANGES" },
    { status: "REJECTED" },
    { version: 2 },
    { id: "bad" },
    { ownerId: "" },
    { updatedAt: "bad" },
    { metadata: { ...record.metadata, examType: undefined } },
  ])
    assert.equal(
      lib.publicMarketPaper(JSON.stringify({ ...record, ...patch })),
      null,
    );
  assert.equal(lib.publicMarketPaper("invalid"), null);
});
test("class, subject, chapter, exam and teacher filters combine independently", () => {
  const p = lib.publicMarketPaper(JSON.stringify(record));
  assert.equal(
    lib.filterMarketPapers([p], {
      grade: "9",
      subject: "বাংলা",
      chapter: "গদ্য",
      examType: "বার্ষিক পরীক্ষা",
      sellerTid: "public-u",
    }).length,
    1,
  );
  for (const filters of [
    { grade: "6" },
    { subject: "গণিত" },
    { chapter: "পদ্য" },
    { examType: "নির্বাচনী পরীক্ষা" },
    { sellerTid: "public-v" },
  ])
    assert.equal(lib.filterMarketPapers([p], filters).length, 0);
});
test("catalog pages use bounded cursor pagination and project data before returning", async () => {
  let query;
  const rows = Array.from({ length: 201 }, (_, i) => {
    const id = i.toString(16).padStart(64, "0");
    return {
      key: market.MARKET_PREFIX + id,
      value: JSON.stringify({ ...record, id }),
    };
  });
  const data = load("lib/marketplace-catalog-data.ts", {
    "server-only": {},
    "@/lib/db": {
      db: {
        setting: {
          findMany: async (q) => {
            query = q;
            return rows;
          },
        },
      },
    },
    "@/lib/marketplace": market,
    "@/lib/marketplace-catalog": lib,
  });
  const result = await data.marketCatalog("b".repeat(64));
  assert.equal(query.take, 201);
  assert.equal(query.where.key.gt, market.MARKET_PREFIX + "b".repeat(64));
  assert.equal(result.papers.length, 200);
  assert.equal(result.next, rows[199].key.slice(market.MARKET_PREFIX.length));
  assert.ok(!JSON.stringify(result).includes("SECRET_QUESTION"));
});
