const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  { PDFDocument } = require("pdf-lib");
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
const model = load("lib/ready-papers.ts");
const meta = {
    title: "ICT source",
    kind: "SCHOOL",
    grade: "SSC",
    subject: "ICT",
    year: "2026",
    source: "School",
    published: true,
  },
  groupId = "11111111-1111-4111-8111-111111111111";
function setup() {
  const store = new Map();
  let authorized = true,
    bytes,
    headSize = 10,
    fetches = 0;
  const setting = {
    findUnique: async ({ where }) =>
      store.has(where.key)
        ? { key: where.key, value: store.get(where.key) }
        : null,
    create: async ({ data }) => {
      store.set(data.key, data.value);
      return data;
    },
    update: async ({ where, data }) => {
      store.set(where.key, data.value);
      return data;
    },
    upsert: async ({ where, create }) => {
      if (!store.has(where.key)) store.set(where.key, create.value);
    },
  };
  const guard = {
    admin: async () => {
      if (!authorized) throw Error("unauthorized");
      return { id: "admin" };
    },
  };
  class BlobNotFoundError extends Error {}
  const blob = {
    head: async (url) => {
      if (!bytes) throw new BlobNotFoundError();
      return {
        pathname: url.startsWith("https:")
          ? new URL(url).pathname.slice(1)
          : url,
        size: headSize,
        contentType: "application/pdf",
        url: url.startsWith("https:")
          ? url
          : "https://test.public.blob.vercel-storage.com/" + url,
      };
    },
    BlobNotFoundError,
  };
  const storage = load("lib/ready-part-storage.ts", {
    "@/lib/db": { db: { setting } },
    "@vercel/blob": blob,
    "./ready-papers": model,
  });
  const action = load("app/actions/ready-import.ts", {
    "@/lib/db": { db: { setting } },
    "@/lib/guard": guard,
    "@vercel/blob": blob,
    "@/lib/ready-papers": model,
    "@/lib/ready-paper-catalog": { validReadyPair: () => true },
    "@/lib/ready-part-storage": storage,
    "next/cache": { revalidatePath: () => {} },
  });
  return {
    store,
    action,
    storage,
    setAuth: (v) => (authorized = v),
    setBytes: (v) => (bytes = v),
    setSize: (v) => (headSize = v),
    installFetch: () => {
      const old = global.fetch;
      global.fetch = async () => {
        fetches++;
        return new Response(bytes);
      };
      return () => (global.fetch = old);
    },
    getFetches: () => fetches,
    begin: () =>
      action.beginReadyPart({
        meta,
        groupId,
        partIndex: 1,
        start: 1,
        end: 100,
        rights: true,
      }),
  };
}
async function pdf(n) {
  const d = await PDFDocument.create();
  for (let i = 0; i < n; i++) d.addPage();
  return d.save();
}
test("only admin creates sessions; signed path and rights cannot be omitted", async () => {
  const s = setup();
  s.setAuth(false);
  await assert.rejects(() => s.begin());
  s.setAuth(true);
  await assert.rejects(() =>
    s.action.beginReadyPart({
      meta,
      groupId,
      partIndex: 1,
      start: 1,
      end: 101,
      rights: true,
    }),
  );
  await assert.rejects(() =>
    s.action.beginReadyPart({
      meta,
      groupId,
      partIndex: 1,
      start: 1,
      end: 100,
      rights: false,
    }),
  );
  const p = await s.begin();
  assert.match(p.path, /ready-papers\/parts\/.*\.pdf/);
  assert.equal(s.store.size, 1);
});
test("finalize verifies real100-page PDF, preserves group/source range and idempotent record", async () => {
  const s = setup(),
    p = await s.begin();
  s.setBytes(await pdf(100));
  const restore = s.installFetch();
  try {
    const url = "https://test.public.blob.vercel-storage.com/" + p.path;
    assert.equal((await s.action.finishReadyPart(p.id, url)).ok, true);
    const r = JSON.parse(s.store.get(model.READY_PREFIX + p.id));
    assert.equal(r.groupId, groupId);
    assert.equal(r.title, "ICT source · Part 1");
    assert.equal(r.pageEnd, 100);
    assert.equal((await s.action.finishReadyPart(p.id, url)).ok, true);
    assert.equal(s.getFetches(), 1);
  } finally {
    restore();
  }
});
test("reject untrusted URL, oversized bytes, mismatching page count; no library record on failure", async () => {
  const s = setup(),
    p = await s.begin();
  s.setBytes(await pdf(101));
  const restore = s.installFetch();
  try {
    assert.equal(
      (await s.action.finishReadyPart(p.id, "https://example.org/" + p.path))
        .ok,
      false,
    );
    assert.equal(s.getFetches(), 0);
    const url = "https://test.public.blob.vercel-storage.com/" + p.path;
    assert.equal((await s.action.finishReadyPart(p.id, url)).ok, false);
    s.setSize(10_000_001);
    assert.equal((await s.action.finishReadyPart(p.id, url)).ok, false);
    assert.equal(s.store.has(model.READY_PREFIX + p.id), false);
  } finally {
    restore();
  }
});
test("resume recovers uploaded URL, refreshes missing-object session without duplicate record", async () => {
  const s = setup(),
    p = await s.begin();
  assert.equal((await s.action.resumeReadyPart(p.id)).url, null);
  s.setBytes(await pdf(100));
  assert.equal(
    (await s.action.resumeReadyPart(p.id)).url,
    "https://test.public.blob.vercel-storage.com/" + p.path,
  );
  assert.equal(s.store.size, 1);
  s.setAuth(false);
  await assert.rejects(() => s.action.resumeReadyPart(p.id));
});
test("all100-page schemas retain bounds and old presets remain valid", () => {
  assert.equal(
    model.readyRecordSchema.safeParse({
      ...meta,
      id: groupId,
      url: "https://test.public.blob.vercel-storage.com/x.pdf",
      at: new Date().toISOString(),
      presets: { 100: model.freshEdit() },
    }).success,
    true,
  );
  assert.equal(
    model.readyRecordSchema.safeParse({
      ...meta,
      id: groupId,
      url: "https://test.public.blob.vercel-storage.com/x.pdf",
      at: new Date().toISOString(),
      presets: { 101: model.freshEdit() },
    }).success,
    false,
  );
});
