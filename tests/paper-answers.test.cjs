const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("answers");
m._compile(
  ts.transpileModule(fs.readFileSync("lib/paper-answers.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "answers.js",
);
const { answerParts, answerLines, equalitySteps } = m.exports;
test("CQ legacy English markers become independent Bengali parts", () => {
  assert.deepEqual(
    answerParts(
      "(k) x = 1; kh: y = 2; (g) z = 3; gh: done",
      undefined,
      true,
    ).map((p) => p.label),
    ["ক", "খ", "গ", "ঘ"],
  );
  assert.equal(answerParts("f(k) = 2", undefined, true)[0].label, undefined);
});
test("structured CQ answers retain Bengali keys and order", () => {
  assert.deepEqual(
    answerParts("summary", { gh: "D", k: "A", kh: "B", g: "C" }, true),
    [
      { label: "ক", text: "A" },
      { label: "খ", text: "B" },
      { label: "গ", text: "C" },
      { label: "ঘ", text: "D" },
    ],
  );
  assert.equal(
    answerParts(undefined, undefined, true)[0].text,
    "উত্তর সংযুক্ত নেই",
  );
});
test("chain equality split preserves every side and order without computing answers", () => {
  assert.deepEqual(equalitySteps("x² + 1/x² = (x + 1/x)² − 2 = 4² − 2 = 14"), {
    left: "x² + 1/x²",
    right: ["(x + 1/x)² − 2", "4² − 2", "14"],
  });
  assert.deepEqual(equalitySteps("$x^2 = 4^2 - 2 = 14$"), {
    left: "$x^2$",
    right: ["$4^2 - 2$", "$14$"],
  });
});
test("conditions, relations and explicit latex are not damaged", () => {
  for (const s of [
    "x >= 2",
    "x <= 2",
    "x != 2",
    "x => 2",
    "$\\begin{aligned}x&=2\\end{aligned}$",
    "$\\text{x=2}$",
  ])
    assert.equal(equalitySteps(s), null);
  assert.deepEqual(equalitySteps("f(x=2) = 4"), {
    left: "f(x=2)",
    right: ["4"],
  });
  assert.equal(equalitySteps("x ="), null);
});
test("solution lines split outside math and parentheses only", () => {
  assert.deepEqual(answerLines("x = 1; y = 2\nশেষ"), ["x = 1", "y = 2", "শেষ"]);
  assert.deepEqual(answerLines("$a;b$; f(a;b)"), ["$a;b$", "f(a;b)"]);
  assert.equal(answerParts("k: prose", undefined, false)[0].text, "k: prose");
});
test("do not turn separate conditions or rich formatting into false equality chains", () => {
  assert.equal(equalitySteps("x = 4 এবং y = 3"), null);
  assert.equal(equalitySteps("x = 4 and y = 3"), null);
  assert.equal(equalitySteps("[b]x = 2 = 1+1[/b]"), null);
  assert.deepEqual(answerLines("[b]x = 2; y = 3[/b]"), ["[b]x = 2; y = 3[/b]"]);
});
