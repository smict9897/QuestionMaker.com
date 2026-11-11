const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module");
function load(file, mocks = {}) {
  const m = new Module(file, module);
  m.paths = module.paths;
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
const options = load("lib/question-type-options.ts"),
  filters = load("lib/question-types.ts", {
    "./question-type-options": options,
  });
test("type options normalize safely and combined values preserve exact supported types", () => {
  assert.deepEqual(options.selectedQuestionTypes("MCQ_SHORT"), [
    "MCQ",
    "SHORT",
  ]);
  assert.deepEqual(options.selectedQuestionTypes("CQ"), ["CQ"]);
  assert.equal(options.normalizeQuestionType("FAKE"), "ALL");
  assert.deepEqual(filters.questionTypeWhere("ALL"), {});
  assert.deepEqual(filters.questionTypeWhere("MCQ"), {
    OR: [{ correct: { not: "" } }],
  });
  assert.equal(filters.questionTypeWhere("SHORT").OR[0].AND[0].correct, "");
  assert.ok(filters.questionTypeWhere("SHORT").OR[0].AND[1].NOT);
  assert.equal(filters.questionTypeWhere("MCQ_SHORT").OR.length, 2);
});
