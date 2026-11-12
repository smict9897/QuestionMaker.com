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

test("zoom preserves placement, clamps safe-fit limits and ignores invalid factors", () => {
  const value = { printScale: 0.6, printX: 0.3, printY: 0.8 };
  const zoomed = p.placementAfterZoom(value, 1.5);
  assert.ok(Math.abs(zoomed.printScale - 0.9) < 1e-10);
  assert.equal(zoomed.printX, value.printX);
  assert.equal(zoomed.printY, value.printY);
  assert.equal(p.placementAfterZoom(value, 100).printScale, 1);
  assert.equal(p.placementAfterZoom(value, 0.01).printScale, 0.4);
  for (const factor of [NaN, Infinity, 0, -1])
    assert.deepEqual(p.placementAfterZoom(value, factor), value);
});

test("resize handles preserve aspect scale, opposite edge and safe bounds", () => {
  const v = { printScale: 0.6, printX: 0.5, printY: 0.5 };
  const grown = p.placementAfterResize(v, "se", 30, 30, 300, 400, 300, 300);
  assert.ok(grown.printScale > v.printScale);
  const oldLeft = (300 - 300 * v.printScale) * v.printX;
  assert.ok(
    Math.abs((300 - 300 * grown.printScale) * grown.printX - oldLeft) < 1e-8,
  );
  for (const h of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
    const next = p.placementAfterResize(
      v,
      h,
      10000,
      -10000,
      300,
      400,
      300,
      300,
    );
    assert.ok(next.printScale >= 0.4 && next.printScale <= 1);
    assert.ok(next.printX >= 0 && next.printX <= 1);
    assert.ok(next.printY >= 0 && next.printY <= 1);
  }
  assert.deepEqual(p.placementAfterResize(v, "se", 1, 1, 0, 0, 0, 0), v);
});
