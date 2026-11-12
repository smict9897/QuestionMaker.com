const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module");
function load(file) {
  const m = new Module(file, module);
  m.paths = module.paths;
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
const r = load("lib/ready-raster.ts"),
  model = load("lib/ready-papers.ts");
test("crop-aware source coordinates use raster-local fractions after screen zoom/stretch", () => {
  const e = {
    ...model.freshEdit(),
    left: 0.1,
    right: 0.2,
    top: 0.15,
    bottom: 0.1,
  };
  const p = r.sourceRasterPoint({ x: 0.5, y: 0.4 }, e);
  assert.ok(Math.abs(p.x - 0.45) < 1e-9);
  assert.ok(Math.abs(p.y - 0.45) < 1e-9);
  assert.deepEqual(r.sourceRasterPoint({ x: -1, y: 2 }, e), { x: 0.1, y: 0.9 });
});
test("placement movement/scaling does not re-render pixels or interrupt pointer gestures", () => {
  const e = model.freshEdit();
  assert.equal(
    r.rasterEditKey(e),
    r.rasterEditKey({
      ...e,
      printX: 0.8,
      printY: 0.4,
      printScale: 0.5,
      printStretchX: 1.4,
      printStretchY: 1.8,
    }),
  );
  for (const p of [
    { left: 0.1 },
    { rotation: 90 },
    { blueWatermark: 0.5 },
    { masks: [{ x: 0.1, y: 0.1, w: 0.1, h: 0.1 }] },
    { texts: [{ x: 0.1, y: 0.1, text: "test", size: 20 }] },
  ])
    assert.notEqual(r.rasterEditKey(e), r.rasterEditKey({ ...e, ...p }));
});
test("one setup A4 displays shared header even while raster is pending; next preview retains first-only header", () => {
  const s = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.doesNotMatch(s, /<canvas|canvas\.current/);
  assert.match(s, /renderPageHeader\(active === selected\[0\]\)/);
  assert.match(s, /renderPageHeader\(i === 0\)/);
  assert.ok(
    s.indexOf("renderPageHeader(active === selected[0])") <
      s.indexOf("{liveReview && liveReviewPage === active ?"),
  );
  assert.match(s, /<RasterTools/);
  assert.match(s, /onCommit=\{commitRaster\}/);
  assert.match(s, /tool === "view" &&\s*placementMode/);
});
test("drawing capture is isolated from placement, cancel does not commit, overlay hidden in print", () => {
  const s = fs.readFileSync("components/ready-papers/raster-tools.tsx", "utf8");
  assert.match(s, /e.stopPropagation\(\)/);
  assert.match(s, /onPointerCancel=\{cancel\}/);
  assert.match(s, /onLostPointerCapture=\{cancel\}/);
  assert.match(s, /setPointerCapture/);
  assert.match(s, /sourceRasterPoint\(g.start, edit\)/);
  const css = fs.readFileSync("components/ready-papers/ready.css", "utf8");
  assert.match(css, /@media print\s*\{\s*\.rp-raster-tools/);
});
