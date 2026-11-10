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

test("next section begins exactly where previous section ends in the same lane", () => {
  for (const columns of [1, 2]) {
    const p = paginateContinuous(
      [
        { heading: 20, heights: [60, 60], columns },
        { heading: 30, heights: [40], columns },
      ],
      400,
      500,
    );
    assert.equal(p.length, 1);
    assert.deepEqual(
      p[0].map((s) => s.top),
      [0, 80, 140],
    );
    assert.ok(p[0].every((s) => s.lane === 0));
  }
});
test("section boundary continues into remaining right column before next sheet", () => {
  const p = paginateContinuous(
    [
      { heading: 20, heights: [100, 100, 100], columns: 2 },
      { heading: 20, heights: [100, 100], columns: 2 },
    ],
    250,
    300,
  );
  assert.equal(p.length, 2);
  assert.deepEqual(
    p[0].map((s) => [s.section, s.lane, s.top]),
    [
      [0, 0, 0],
      [0, 0, 120],
      [0, 1, 0],
      [1, 1, 100],
    ],
  );
  assert.equal(p[1][0].heading, false);
});
test("heading and first question move together into next lane", () => {
  const p = paginateContinuous(
    [
      { heading: 10, heights: [180], columns: 2 },
      { heading: 30, heights: [40], columns: 2 },
    ],
    220,
    300,
  );
  assert.equal(p.length, 1);
  assert.equal(p[0][1].lane, 1);
  assert.equal(p[0][1].top, 0);
  assert.equal(p[0][1].heading, true);
});
test("one-column overflow keeps all questions and does not repeat heading", () => {
  const p = paginateContinuous(
    [
      { heading: 20, heights: [100, 100], columns: 1 },
      { heading: 20, heights: [100, 100], columns: 1 },
    ],
    350,
    450,
  );
  assert.equal(p.length, 2);
  assert.equal(p[1][0].heading, false);
  assert.equal(p[1][0].top, 0);
});
test("width changes span below previous region without overlap", () => {
  const p = paginateContinuous(
    [
      { heading: 20, heights: [60, 60], columns: 2 },
      { heading: 20, heights: [60], columns: 1 },
    ],
    400,
    500,
  );
  assert.equal(p[0][2].top, 140);
  assert.equal(p[0][2].laneCount, 1);
});
test("oversized questions terminate; all questions retained once", () => {
  const sections = Array.from({ length: 3 }, (_, i) => ({
    heading: 20,
    heights: Array.from({ length: 50 }, (_, j) => 30 + (j % 5) * 17),
    columns: i === 1 ? 1 : 2,
  }));
  const p = paginateContinuous(sections, 450, 600);
  sections.forEach((s, i) =>
    assert.deepEqual(
      p.flatMap((page) =>
        page
          .filter((seg) => seg.section === i)
          .flatMap((seg) => seg.columns.flat()),
      ),
      s.heights.map((_, i) => i),
    ),
  );
  assert.equal(
    paginateContinuous(
      [{ heading: 20, heights: [900, 20], columns: 2 }],
      100,
      100,
    ).flat().length,
    2,
  );
  assert.deepEqual(paginateContinuous([], 100, 100), []);
});
test("explicit right-start remains supported", () => {
  const p = paginateContinuous(
    [{ heading: 10, heights: [40, 40, 40], columns: 2, startRight: true }],
    100,
    100,
  );
  assert.equal(p[0][0].lane, 1);
  assert.equal(p[1][0].lane, 0);
});
test("print layout never re-enables nonprint toolbar", () => {
  const css = fs.readFileSync("components/paper-builder/paper.css", "utf8");
  assert.match(css, /> div:not\(\[data-noprint\]\)/);
});
