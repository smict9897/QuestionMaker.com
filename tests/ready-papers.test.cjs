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
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const nctb = load("lib/nctb-data.ts");
const catalog = load("lib/ready-paper-catalog.ts", { "./nctb-data": nctb });
const model = load("lib/ready-papers.ts");
const record = {
  title: "English Board Test",
  kind: "BOARD",
  grade: "SSC",
  subject: "English Grammar and Composition",
  year: "2025",
  source: "Sylhet Board",
  published: true,
  id: "14ca01ef-c381-444f-b3c3-f02976799834",
  url: "https://test.public.blob.vercel-storage.com/ready-papers/x.pdf",
  at: "2026-01-01T00:00:00.000Z",
  presets: {},
};
test("ready metadata restricts categories, trusted HTTPS storage, years and bounds", () => {
  assert.ok(model.readyRecordSchema.safeParse(record).success);
  for (const patch of [
    { kind: "OTHER" },
    { url: "http://127.0.0.1/x" },
    { url: "https://test.public.blob.vercel-storage.com.evil.test/x" },
    { year: "x" },
    { presets: { 101: model.freshEdit() } },
  ])
    assert.equal(
      model.readyRecordSchema.safeParse({ ...record, ...patch }).success,
      false,
    );
  assert.equal(
    model.pageEditSchema.safeParse({ ...model.freshEdit(), top: 0.9 }).success,
    false,
  );
  assert.equal(
    model.boxSchema.safeParse({ x: 0.9, y: 0.1, w: 0.5, h: 0.1 }).success,
    false,
  );
  assert.equal(model.parseReady("bad"), null);
});
test("clean processing is bounded, leaves alpha and preserves dark text on bright page", () => {
  const p = new Uint8ClampedArray([
    220, 220, 220, 255, 0, 0, 0, 255, 240, 240, 240, 255, 255, 255, 255, 255,
  ]);
  model.cleanPixels(p, 2, 2, 1, false);
  assert.equal(p[4], 0);
  assert.ok(p[0] > 220);
  assert.equal(p[3], 255);
  const q = new Uint8ClampedArray([200, 200, 200, 255, 0, 0, 0, 255]);
  model.cleanPixels(q, 2, 1, 0.5, true);
  assert.equal(q[0], 255);
  assert.equal(q[4], 0);
});
test("catalog hides unpublished/corrupt records except admin, preserves newest ordering", async () => {
  const api = load("lib/ready-paper-data.ts", {
    "@/lib/db": {
      db: {
        setting: {
          findMany: async () => [
            { value: JSON.stringify(record) },
            {
              value: JSON.stringify({
                ...record,
                published: false,
                title: "Draft model",
              }),
            },
            { value: "bad" },
          ],
        },
      },
    },
    "./ready-papers": model,
  });
  assert.equal((await api.readyLibrary()).length, 1);
  assert.equal((await api.readyLibrary(true)).length, 2);
});
process.env.BLOB_READ_WRITE_TOKEN = "test-only-mocked-storage";
function actions(allow = true, failure = "") {
  let puts = 0,
    writes = 0,
    deletes = 0;
  const storedKeys = [],
    paths = [];
  const api = load("app/actions/ready-papers.ts", {
    "@/lib/guard": {
      admin: async () => {
        if (!allow) throw Error("Unauthorized");
      },
    },
    "@/lib/db": {
      db: {
        setting: {
          findUnique: async () => ({ value: JSON.stringify(record) }),
          create: async (data) => {
            if (failure === "database") throw Error("private-db-detail");
            storedKeys.push(data.data.key);
            writes++;
          },
          update: async () => {
            writes++;
          },
        },
      },
    },
    "@/lib/ready-papers": model,
    "@/lib/ready-paper-catalog": catalog,
    "@vercel/blob": {
      put: async (path) => {
        paths.push(path);
        puts++;
        if (failure === "storage") throw Error("private-token-value");
        return { url: record.url };
      },
      del: async () => {
        deletes++;
      },
    },
    "next/cache": {
      revalidatePath: () => {
        if (failure === "refresh") throw Error("refresh-error");
      },
    },
  });
  return {
    api,
    storedKeys,
    paths,
    get deletes() {
      return deletes;
    },
    get puts() {
      return puts;
    },
    get writes() {
      return writes;
    },
  };
}
function fd(bytes = "%PDF-1.4 test") {
  const f = new FormData();
  for (const [k, v] of Object.entries(record))
    if (typeof v === "string") f.set(k, v);
  f.set("rights", "on");
  f.set("published", "on");
  f.set("file", new File([bytes], "test.pdf", { type: "application/pdf" }));
  return f;
}
test("upload and preset mutations reject non-admin before storage or DB", async () => {
  const h = actions(false);
  await assert.rejects(h.api.uploadReadyPaper(fd()));
  await assert.rejects(h.api.updateReadyPaper(record.id, record));
  assert.equal(h.puts, 0);
  assert.equal(h.writes, 0);
});
test("upload validates rights and PDF magic before storage; valid admin upload writes once", async () => {
  const h = actions();
  assert.equal((await h.api.uploadReadyPaper(fd("not-a-pdf"))).ok, false);
  const f = fd();
  f.delete("rights");
  assert.equal((await h.api.uploadReadyPaper(f)).ok, false);
  assert.equal(h.puts, 0);
  assert.equal((await h.api.uploadReadyPaper(fd())).ok, true);
  assert.equal(h.puts, 1);
  assert.equal(h.writes, 1);
});
test("invalid preset cannot be saved and actual metadata changes use existing source URL", async () => {
  const h = actions();
  assert.equal(
    (
      await h.api.updateReadyPaper(record.id, record, {
        1: { ...model.freshEdit(), rotation: 17 },
      })
    ).ok,
    false,
  );
  assert.equal(h.writes, 0);
  assert.equal(
    (await h.api.updateReadyPaper(record.id, { ...record, published: false }))
      .ok,
    true,
  );
  assert.equal(h.writes, 1);
});

test("Ready catalog exposes only JSC/SSC/HSC with exact NCTB subject names", () => {
  assert.deepEqual(
    catalog.readyPaperCatalog.map((c) => c.grade),
    ["JSC", "SSC", "HSC"],
  );
  for (const [i, source] of ["Class 8", "Class 9", "Class 11-12"].entries()) {
    assert.deepEqual(catalog.readyPaperCatalog[i].subjects, [
      ...new Set(
        nctb.NCTB_CLASSES.find((c) => c.class === source).subjects.map(
          (s) => s.name,
        ),
      ),
    ]);
  }
  assert.equal(catalog.validReadyPair("Class 6", "English 2nd Paper"), false);
  assert.equal(catalog.validReadyPair("SSC", "not a subject"), false);
  assert.equal(catalog.readyGrade("Class 8"), "JSC");
});
test("admin upload rejects unsupported class and subject before Blob write", async () => {
  const h = actions();
  for (const [grade, subject] of [
    ["Class 6", "English 2nd Paper"],
    ["SSC", "unknown"],
  ]) {
    const f = fd();
    f.set("grade", grade);
    f.set("subject", subject);
    assert.equal((await h.api.uploadReadyPaper(f)).ok, false);
  }
  assert.equal(h.puts, 0);
  assert.equal(h.writes, 0);
});

test("missing Blob config has a safe specific error and makes no storage write", async () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  try {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const h = actions();
    const result = await h.api.uploadReadyPaper(fd());
    assert.equal(result.code, "STORAGE_CONFIG");
    assert.equal(h.puts, 0);
    assert.equal(h.writes, 0);
  } finally {
    process.env.BLOB_READ_WRITE_TOKEN = token;
  }
});
test("storage and DB failures are distinguished without exposing internal errors", async () => {
  for (const stage of ["storage", "database"]) {
    const h = actions(true, stage);
    const result = await h.api.uploadReadyPaper(fd());
    assert.equal(result.code, stage.toUpperCase());
    assert.equal(JSON.stringify(result).includes("private-"), false);
    assert.equal(h.deletes, stage === "database" ? 1 : 0);
  }
});
test("same subject parts create independent records and Blob paths, never overwrite", async () => {
  const h = actions();
  const ids = [];
  for (const part of [1, 2]) {
    const f = fd();
    f.set("title", `ICT Model Test Part ${part}`);
    const result = await h.api.uploadReadyPaper(f);
    assert.equal(result.ok, true);
    ids.push(result.id);
  }
  assert.equal(h.puts, 2);
  assert.equal(h.writes, 2);
  assert.equal(new Set(ids).size, 2);
  assert.equal(new Set(h.storedKeys).size, 2);
  assert.equal(new Set(h.paths).size, 2);
});
test("cache refresh failure after persisted upload does not invite duplicate retry", async () => {
  const h = actions(true, "refresh");
  assert.equal((await h.api.uploadReadyPaper(fd())).ok, true);
  assert.equal(h.writes, 1);
  assert.equal(h.deletes, 0);
});

test("blue watermark control defaults off for legacy presets and rejects invalid levels", () => {
  const old = model.freshEdit();
  delete old.blueWatermark;
  assert.equal(model.pageEditSchema.parse(old).blueWatermark, 0);
  for (const level of [-1, 1.1, NaN, Infinity])
    assert.equal(
      model.pageEditSchema.safeParse({ ...old, blueWatermark: level }).success,
      false,
    );
});
test("blue suppression preserves dark ink, grayscale, red and alpha; light cyan is reduced", () => {
  const p = new Uint8ClampedArray([
    180, 220, 240, 255, 25, 30, 35, 255, 180, 180, 180, 255, 240, 180, 180, 255,
    255, 255, 255, 255,
  ]);
  const old = p.slice();
  model.reduceBlueWatermark(p, 1);
  assert.deepEqual([...p.slice(0, 4)], [255, 255, 255, 255]);
  assert.deepEqual(p.slice(4), old.slice(4));
  for (const level of [0, NaN, Infinity]) {
    const q = old.slice();
    model.reduceBlueWatermark(q, level);
    assert.deepEqual(q, old);
  }
  const mid = old.slice();
  model.reduceBlueWatermark(mid, 0.5);
  assert.ok(mid[0] > old[0] && mid[0] < 255);
});
test("watermark rendering is before grayscale and original comparison explicitly resets controls", () => {
  const browser = fs.readFileSync("lib/ready-paper-browser.ts", "utf8");
  assert.ok(
    browser.indexOf("reduceBlueWatermark(pixels.data") <
      browser.indexOf("cleanPixels("),
  );
  const studio = fs.readFileSync("components/ready-papers/studio.tsx", "utf8");
  assert.match(
    studio,
    /original\s*\? \{ \.\.\.freshEdit\(\), rotation: rasterEdit.rotation \}\s*: rasterEdit/,
  );
  assert.match(studio, /update\(\{ blueWatermark:/);
});
