const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("chart");
m._compile(
  ts.transpileModule(fs.readFileSync("lib/english/chart-data.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  "chart.js",
);
const { englishBarChartData: chart } = m.exports;
test("chart values and percentages come only from explicit two-column numeric tables", () => {
  const data = chart({
    headers: ["Year", "Rate (%)"],
    rows: [
      ["2025", "10%"],
      ["2026", "25.5%"],
    ],
  });
  assert.equal(data.max, 25.5);
  assert.equal(data.points[1].display, "25.5%");
  assert.equal(data.measure, "Rate (%)");
});
test("ambiguous, mixed-unit, excessive, negative or prose data never gets a fabricated chart", () => {
  for (const rows of [
    [
      ["A", "10 students"],
      ["B", "20 students"],
    ],
    [
      ["A", "-1"],
      ["B", "2"],
    ],
    [
      ["A", "10%"],
      ["B", "20"],
    ],
    [
      ["A", "0"],
      ["B", "0"],
    ],
    [
      ["A", "10"],
      ["A", "20"],
    ],
    Array.from({ length: 13 }, (_, i) => [String(i), "2"]),
  ])
    assert.equal(chart({ headers: ["Category", "Value"], rows }), null);
  assert.equal(chart(undefined), null);
  assert.equal(
    chart({
      headers: ["A", "B", "C"],
      rows: [
        ["x", "1", "2"],
        ["y", "2", "3"],
      ],
    }),
    null,
  );
});
