const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("english-blueprints");
m._compile(
  ts.transpileModule(fs.readFileSync("lib/english/blueprints.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "english-blueprints.js",
);
const { englishBlueprint: b } = m.exports;
test("all fourteen reference templates reconcile total, section and item marks", () => {
  for (let grade = 6; grade <= 12; grade++)
    for (const paper of [1, 2]) {
      const p = b(grade, paper);
      assert.equal(
        p.items.reduce((s, i) => s + i.marks, 0),
        p.total,
      );
      for (const section of p.sections)
        assert.equal(
          p.items
            .filter((i) => i.section === section.id)
            .reduce((s, i) => s + i.marks, 0),
          section.marks,
        );
      assert.equal(new Set(p.items.map((i) => i.id)).size, p.items.length);
      for (const i of p.items)
        if (i.markEach)
          assert.equal((i.answerCount || i.count) * i.markEach, i.marks);
      assert.equal(p.reference.status, "user-supplied");
    }
});
test("junior grade-specific writing lengths and narration are not merged", () => {
  for (const g of [6, 7, 8]) {
    assert.equal(
      b(g, 1).items.find((i) => i.id === "paragraph").words,
      g === 6 ? 120 : 150,
    );
    assert.equal(
      b(g, 2).items.find((i) => i.id === "composition").words,
      g === 6 ? 200 : 250,
    );
    assert.equal(b(g, 2).total, 50);
  }
  assert.ok(b(6, 2).items.some((i) => i.id === "parts-of-speech"));
  assert.match(
    b(7, 2).items.find((i) => i.id === "narration").title,
    /individual/,
  );
  assert.match(
    b(8, 2).items.find((i) => i.id === "narration").title,
    /Passage/,
  );
});
test("SSC gap filling is corrected to 10; HSC references keep their actual years", () => {
  assert.equal(b(10, 2).items[0].marks, 10);
  assert.match(b(11, 1).reference.description, /2024–25/);
  assert.match(b(12, 2).reference.description, /2026/);
  assert.equal(b(12, 2).items.length, 16);
  assert.equal(b(10, 1).items.find((i) => i.id === "poems").answerCount, 5);
});
