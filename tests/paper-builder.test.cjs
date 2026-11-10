const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const mod = new Module("paper-builder");
mod.require = require;
mod._compile(
  ts.transpileModule(fs.readFileSync("lib/paper-builder.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "paper-builder.js",
);
const {
  defaults,
  restoreSettings,
  shuffled,
  paginate,
  duplicateIds,
  safeImage,
  bn,
} = mod.exports;
test("safe print defaults: A4, two columns, 2x2 options, no answer leakage", () => {
  const s = defaults();
  assert.equal(s.cfg.paper, "A4");
  assert.equal(s.cfg.cols, 2);
  assert.equal(s.cfg.optCols, 2);
  assert.equal(s.cfg.format, "q");
  assert.equal(s.cfg.ansKey, false);
});
test("legacy settings are migrated with metadata intact", () => {
  const s = restoreSettings({
    info: { inst: "School", minutes: "30" },
    cfg: { format: "qa", cols: 3 },
    show: { setCode: true },
  });
  assert.equal(s.info.inst, "School");
  assert.equal(s.cfg.cols, 3);
  assert.equal(s.cfg.paper, "A4");
  assert.equal(s.show.setCode, true);
});
test("invalid enum and numeric values reset safely", () => {
  const s = restoreSettings({
    cfg: { paper: "BAD", fontSize: 500, cols: -1 },
    show: { divider: "bad" },
  });
  assert.equal(s.cfg.paper, "A4");
  assert.equal(s.cfg.fontSize, 14);
  assert.equal(s.cfg.cols, 2);
  assert.equal(s.show.divider, true);
});
test("edited text, images, custom divisions and set order survive roundtrip", () => {
  const s = defaults();
  s.edits.q = { text: "Changed", options: { A: "one" } };
  s.attachments.q = {
    image: "https://example.com/img.png",
    size: 300,
    division: "A",
    important: true,
  };
  s.seed = 741;
  s.setName = "খ";
  assert.deepEqual(restoreSettings(JSON.parse(JSON.stringify(s))), s);
});
test("shuffling is deterministic and never mutates or drops items", () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = shuffled(list, 7919);
  assert.deepEqual(a, shuffled(list, 7919));
  assert.deepEqual([...a].sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.notDeepEqual(a, list);
});
test("pagination fills left then right without missing questions", () => {
  assert.deepEqual(paginate([40, 40, 40, 40, 40], 100, 2), [
    [
      [0, 1],
      [2, 3],
    ],
    [[4], []],
  ]);
});
test("oversized questions are retained rather than clipped or dropped", () =>
  assert.deepEqual(paginate([200, 40], 100, 2), [[[0], [1]]]));
test("empty pagination has no blank pages", () =>
  assert.deepEqual(paginate([], 100, 2), []));
test("duplicates normalize whitespace and mark both occurrences", () =>
  assert.deepEqual(
    [
      ...duplicateIds([
        { id: "a", text: "এক  দুই" },
        { id: "b", text: "এক দুই" },
        { id: "c", text: "তিন" },
      ]),
    ],
    ["a", "b"],
  ));
test("only HTTPS images are accepted", () => {
  assert.equal(safeImage("javascript:alert(1)"), "");
  assert.equal(safeImage("http://example.com/x"), "");
  assert.equal(safeImage("https://example.com/x"), "https://example.com/x");
});
test("Bengali numbering preserves padded digits", () =>
  assert.equal(bn("01"), "০১"));

test("Bengali math numerals normalize without changing prose", () => {
  assert.equal(
    mod.exports.preparePaperMath("প্রশ্ন ০১: ১/২ এবং $৩+৪$"),
    "প্রশ্ন ০১: 1/2 এবং $3+4$",
  );
});
