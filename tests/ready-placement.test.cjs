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
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file,
  );
  return m.exports;
}

const p = load("lib/ready-placement.ts");
const model = load("lib/ready-papers.ts");
test("legacy placement defaults safely fit without crop; schema rejects oversize/off-page positions", () => {
  const old = model.freshEdit();
  delete old.printScale;
  delete old.printX;
  delete old.printY;
  const parsed = model.pageEditSchema.parse(old);
  assert.equal(parsed.printScale, 1);
  assert.equal(parsed.printX, 0.5);
  assert.equal(parsed.printY, 0);
  for (const patch of [
    { printScale: 1.1 },
    { printScale: 0 },
    { printX: -1 },
    { printY: 2 },
  ])
    assert.equal(
      model.pageEditSchema.safeParse({ ...parsed, ...patch }).success,
      false,
    );
});
test("drag consumes remaining space and clamps edges while preserving aspect-fit scale", () => {
  const v = { printScale: 1, printX: 0.5, printY: 0 };
  assert.deepEqual(p.placementAfterDrag(v, 500, 50, 200, 300, 200, 200), {
    ...v,
    printY: 0.5,
  });
  assert.equal(p.placementAfterDrag(v, 0, 500, 200, 300, 200, 200).printY, 1);
  assert.deepEqual(p.placementAfterDrag(v, 100, 100, 0, 0, 0, 0), v);
  const small = { ...v, printScale: 0.5 };
  assert.equal(
    p.placementAfterDrag(small, -100, 0, 200, 300, 200, 200).printX,
    0,
  );
});
test("print placement uses the same bounded image for screen and print, no header transforms", () => {
  const c = fs.readFileSync(
    "components/ready-papers/placed-question.tsx",
    "utf8",
  );
  assert.match(c, /objectPosition:/);
  assert.match(c, /transformOrigin:/);
  assert.match(c, /onPointerCancel/);
  const s = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(s, /<PlacedQuestion/);
  assert.match(s, /প্রশ্নপত্র Auto Fit/);
});
