const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "server-only"
      ? {}
      : n === "@/lib/wallet"
        ? { teacherTid: () => "TID" }
        : n.startsWith("@/lib/")
          ? load(n.replace("@/", "") + ".ts")
          : require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return (cache[file] = m.exports);
}
const { publicMarketSample } = load("lib/marketplace-sample.ts"),
  { snapshotHash } = load("lib/marketplace.ts"),
  { settingsSchema } = load("lib/paper-builder.ts");
const id = "f".repeat(64);
function fixture(count = 20) {
  const snapshot = {
    settings: settingsSchema.parse({}),
    questions: Array.from({ length: count }, (_, i) => ({
      id: "PRIVATE_ID_" + i,
      text:
        "বাংলাদেশের ঐতিহাসিক স্থাপত্য সম্পর্কে বিস্তারিত আলোচনা করো এবং প্রাসঙ্গিক উদাহরণ উল্লেখ করো " +
        i,
      correct: "SECRET_ANSWER",
      explanation: "SECRET_SOLUTION",
      options: { A: "PRIVATE_OPTION", B: "other" },
    })),
  };
  return {
    version: 1,
    id,
    ownerId: "PRIVATE_OWNER",
    status: "APPROVED",
    revision: 1,
    metadata: {
      examType: "বার্ষিক পরীক্ষা",
      title: "নমুনা প্রশ্নপত্র",
      grade: "6",
      subject: "বাংলা",
      chapters: ["প্রথম"],
      description: "অনুমোদিত প্রশ্নপত্রের বিবরণ",
      pricePaisa: 100,
      rights: true,
    },
    snapshot,
    snapshotHash: snapshotHash(snapshot),
  };
}
test("sample is deterministic allowlisted bounded excerpt, never full question or private fields", () => {
  for (const count of [1, 4, 5, 10, 100, 300]) {
    const r = fixture(count),
      raw = JSON.stringify(r),
      s = publicMarketSample(raw, id);
    assert.equal(s.questionCount, count);
    assert.equal(
      s.excerpts.length,
      Math.min(2, Math.max(1, Math.floor(count / 5))),
    );
    assert.deepEqual(s, publicMarketSample(raw, id));
    assert.deepEqual(Object.keys(s), ["version", "questionCount", "excerpts"]);
    for (const text of s.excerpts) {
      assert.ok(Array.from(text).length <= 161);
      assert.ok(!r.snapshot.questions.some((q) => text.includes(q.text)));
    }
    assert.doesNotMatch(
      JSON.stringify(s),
      /PRIVATE|SECRET|snapshot|correct|options|settings|ownerId/,
    );
  }
});
test("unapproved, tampered, wrong identity or malformed snapshots fail closed", () => {
  for (const mutate of [
    (r) => (r.status = "PENDING"),
    (r) => (r.snapshot.questions[0].text = "tampered"),
    (r) => (r.id = "a".repeat(64)),
    (r) => (r.snapshot = null),
    (r) => (r.metadata.pricePaisa = 0),
  ]) {
    const r = fixture();
    mutate(r);
    assert.equal(publicMarketSample(JSON.stringify(r), id), null);
  }
  assert.equal(publicMarketSample("broken", id), null);
});
test("short stems, embedded resources, HTML and obvious inline solutions are not exposed", () => {
  for (const text of [
    "short",
    '<img src="https://private.example/secret">',
    "প্রশ্নের উত্তর ও ব্যাখ্যা এখানে লেখা আছে সঠিক উত্তর ঢাকা",
    "Question with answer: this should never be public",
    "A long question with data:image/private encoded payload",
  ]) {
    const r = fixture(1);
    r.snapshot.questions[0].text = text;
    r.snapshotHash = snapshotHash(r.snapshot);
    assert.deepEqual(publicMarketSample(JSON.stringify(r), id).excerpts, []);
  }
});
test("sample endpoint has no client-controlled paging, snapshot prop or HTML injection", () => {
  const page = fs.readFileSync("app/marketplace/[id]/page.tsx", "utf8"),
    component = fs.readFileSync("components/marketplace-sample.tsx", "utf8");
  assert.match(page, /publicMarketSample\(row!\.value,\s*id\)/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|snapshot|fetch\(/);
  assert.match(component, /market-sample-watermark/);
});
