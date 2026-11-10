const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const m = new Module("continuous");
m._compile(
  ts.transpileModule(fs.readFileSync("lib/continuous-paper.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "continuous.js",
);
const { paginateContinuous } = m.exports;
test("three small sections share the same page in order", () => {
  const pages = paginateContinuous(
    [1, 2, 3].map(() => ({ heading: 20, heights: [60], columns: 1 })),
    400,
    500,
  );
  assert.equal(pages.length, 1);
  assert.deepEqual(
    pages[0].map((s) => s.section),
    [0, 1, 2],
  );
});
test("overflow starts a new page, not a new page per section", () => {
  const pages = paginateContinuous(
    [
      { heading: 20, heights: [100, 100], columns: 1 },
      { heading: 20, heights: [100, 100], columns: 1 },
    ],
    350,
    450,
  );
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[0][1].columns, [[0]]);
  assert.deepEqual(pages[1][0].columns, [[1]]);
  assert.equal(pages[1][0].heading, false);
});
test("heading stays with first question and later pages have full capacity", () => {
  const pages = paginateContinuous(
    [
      { heading: 20, heights: [220], columns: 1 },
      { heading: 40, heights: [80, 80, 80], columns: 1 },
    ],
    300,
    400,
  );
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[1][0].columns, [[0, 1, 2]]);
  assert.equal(pages[1][0].heading, true);
});
test("different column counts consume actual maximum column height", () => {
  const pages = paginateContinuous(
    [
      { heading: 20, heights: [80, 80, 80, 80], columns: 2 },
      { heading: 20, heights: [40], columns: 1 },
    ],
    220,
    300,
  );
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[0][0].columns, [
    [0, 1],
    [2, 3],
  ]);
});
test("oversized questions terminate and are retained; empty sections create no sheets", () => {
  assert.deepEqual(paginateContinuous([], 100, 100), []);
  const p = paginateContinuous(
    [{ heading: 20, heights: [900, 20], columns: 2 }],
    100,
    100,
  );
  assert.deepEqual(
    p.flatMap((p) => p.flatMap((s) => s.columns.flat())),
    [0, 1],
  );
});
test("every question appears exactly once across large mixed sections", () => {
  const sections = Array.from({ length: 3 }, (_, i) => ({
    heading: 20,
    heights: Array.from({ length: 50 }, (_, j) => 30 + (j % 5) * 17),
    columns: i === 1 ? 1 : 2,
  }));
  const pages = paginateContinuous(sections, 450, 600);
  sections.forEach((s, i) =>
    assert.deepEqual(
      pages.flatMap((p) =>
        p
          .filter((seg) => seg.section === i)
          .flatMap((seg) => seg.columns.flat()),
      ),
      s.heights.map((_, i) => i),
    ),
  );
});
test("right-column start reserves the first column only on a section start", () => {
  const p = paginateContinuous(
    [{ heading: 10, heights: [40, 40, 40], columns: 2, startRight: true }],
    100,
    100,
  );
  assert.deepEqual(p[0][0].columns, [[], [0, 1]]);
  assert.deepEqual(p[1][0].columns, [[2], []]);
});
test("print layout never re-enables the nonprint toolbar", () => {
  const css = fs.readFileSync("components/paper-builder/paper.css", "utf8");
  assert.match(css, /> div:not\(\[data-noprint\]\)/);
  assert.match(css, /\.paper-page-viewport\s*\{\s*break-after: page/);
});
