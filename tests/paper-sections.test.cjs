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
