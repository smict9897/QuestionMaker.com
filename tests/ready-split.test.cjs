const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  { PDFDocument, PDFName } = require("pdf-lib"),
  { randomBytes } = require("crypto");
function load(file, mocks = {}) {
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) => mocks[n] || require(n);
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
const split = load("lib/ready-split.ts");
async function pdf(n) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([200 + i, 300]);
  return doc.save();
}
test("automatic100-page parts preserve page order/geometry and source bytes", async () => {
  const source = await pdf(205),
    copy = source.slice(),
    parts = [],
    progress = [];
  await split.splitReadyPdf(
    source,
    async (p) => parts.push(p),
    (n, t) => progress.push([n, t]),
  );
  assert.deepEqual(
    parts.map((p) => [p.start, p.end]),
    [
      [1, 100],
      [101, 200],
      [201, 205],
    ],
  );
  for (const p of parts) {
    const d = await PDFDocument.load(p.bytes);
    assert.equal(d.getPageCount(), p.end - p.start + 1);
    assert.equal(d.getPages()[0].getWidth(), 199 + p.start);
    assert.ok(p.bytes.length <= 10_000_000);
  }
  assert.deepEqual(source, copy);
  assert.deepEqual(progress.at(-1), [205, 205]);
});
test("byte-bound splitting occurs before100 pages without rasterization", async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 2; i++) {
    const page = doc.addPage();
    page.node.set(
      PDFName.of("Contents"),
      doc.context.register(
        doc.context.stream("%" + randomBytes(2_600_000).toString("hex") + "\n"),
      ),
    );
  }
  const bytes = await doc.save(),
    parts = [];
  assert.ok(bytes.length > 10_000_000);
  await split.splitReadyPdf(bytes, async (p) => parts.push(p));
  assert.equal(parts.length, 2);
  assert.ok(parts.every((p) => p.bytes.length <= 10_000_000));
});
test("oversize single-page asks compression; source safety caps and malformed PDF fail clearly", async () => {
  const doc = await PDFDocument.create(),
    page = doc.addPage();
  page.node.set(
    PDFName.of("Contents"),
    doc.context.register(
      doc.context.stream("%" + randomBytes(5_100_000).toString("hex")),
    ),
  );
  const bytes = await doc.save();
  await assert.rejects(
    () =>
      split.splitReadyPdf(bytes, async () => {
        assert.fail("must not emit");
      }),
    /কমপ্রেস/,
  );
  await assert.rejects(
    () => split.splitReadyPdf(new Uint8Array(50_000_001), async () => {}),
    /৫০ MB/,
  );
  await assert.rejects(
    () => split.splitReadyPdf(new Uint8Array([1, 2, 3]), async () => {}),
    /PDF খোলা/,
  );
  const tooMany = await pdf(501);
  await assert.rejects(
    () => split.splitReadyPdf(tooMany, async () => {}),
    /৫০০/,
  );
});
test("worker pauses for upload acknowledgement; heavy split code is lazy and upload uses token size/auth gates", () => {
  const worker = fs.readFileSync("lib/ready-split.worker.ts", "utf8"),
    client = fs.readFileSync("lib/ready-auto-import.ts", "utf8"),
    admin = fs.readFileSync("components/ready-papers/admin-upload.tsx", "utf8"),
    route = fs.readFileSync("app/api/ready-upload/route.ts", "utf8");
  assert.match(worker, /new Promise<void>/);
  assert.match(worker, /resume = resolve/);
  assert.match(client, /completed.has\(key\)/);
  assert.match(client, /resumeReadyPart\(part.id\)/);
  assert.match(client, /worker\?\.terminate/);
  assert.match(admin, /await import\("@\/lib\/ready-auto-import"\)/);
  assert.match(route, /await admin\(\)/);
  assert.match(route, /maximumSizeInBytes: 10_000_000/);
  assert.match(route, /addRandomSuffix: false/);
});
test("thumbnail renders bounded900px; selected pages upgrade2400px without increasing10-page checkout cap", () => {
  const b = fs.readFileSync("lib/ready-paper-browser.ts", "utf8"),
    s = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(b, /selected \? 2400 : 900/);
  assert.match(b, /doc.numPages > 100/);
  assert.match(s, /await qualityPage\(active\)/);
  assert.match(s, /await qualityPage\(n\)/);
  assert.match(s, /qualityCache.current.size > 10/);
});
