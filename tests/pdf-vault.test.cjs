const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
const { PDFDocument, PDFName } = require("pdf-lib");
const receiptId = "a".repeat(64),
  paperId = "11111111-1111-4111-8111-111111111111";
process.env.PDF_VAULT_KEYS = JSON.stringify({ v1: "11".repeat(32) });
process.env.PDF_VAULT_ACTIVE_KEY = "v1";
process.env.BLOB_READ_WRITE_TOKEN = "test-only-token";
async function setup() {
  const store = new Map(),
    blobs = new Map(),
    deleted = [],
    calls = [];
  let session = "u",
    fail = false,
    queue = Promise.resolve(),
    fetchHook = null,
    diagnosticRole = "ADMIN",
    failDelete = false;
  const setting = {
    findUnique: async ({ where }) =>
      store.has(where.key)
        ? { key: where.key, value: store.get(where.key) }
        : null,
    create: async ({ data }) => {
      if (fail && data.key.startsWith("readyvault:v1:")) throw Error("forced");
      if (store.has(data.key)) throw Error("duplicate");
      store.set(data.key, data.value);
      return data;
    },
    update: async ({ where, data }) => {
      if (!store.has(where.key)) throw Error("missing");
      store.set(where.key, data.value);
      return data;
    },
    upsert: async ({ where, create, update }) => {
      const v = store.has(where.key) ? update : create;
      store.set(where.key, v.value);
      return v;
    },
  };
  const tx = {
    setting,
    $queryRaw: async () => [],
    user: { findUnique: async () => ({ role: diagnosticRole }) },
  };
  const transaction = (fn) => {
    const r = queue.then(async () => {
      const before = new Map(store);
      try {
        return await fn(tx);
      } catch (e) {
        store.clear();
        for (const [k, v] of before) store.set(k, v);
        throw e;
      }
    });
    queue = r.catch(() => {});
    return r;
  };
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    if (fetchHook) await fetchHook(url);
    const bytes = blobs.get(url);
    return bytes
      ? new Response(bytes)
      : new Response("not found", { status: 404 });
  };
  const cache = {};
  function load(file) {
    file = path.normalize(file);
    if (cache[file]) return cache[file];
    const m = new Module(file, module);
    m.paths = module.paths;
    m.require = (n) =>
      n === "server-only"
        ? {}
        : n === "@/lib/db"
          ? { db: { $transaction: transaction, setting } }
          : n === "@/lib/wallet"
            ? { walletTransaction: transaction }
            : n === "@/auth"
              ? {
                  auth: async () =>
                    session ? { user: { id: session } } : null,
                }
              : n === "next/cache"
                ? { revalidatePath: () => {} }
                : n === "@vercel/blob"
                  ? {
                      put: async (name, bytes) => {
                        const url =
                          "https://store.public.blob.vercel-storage.com/" +
                          name;
                        blobs.set(url, Buffer.from(bytes));
                        return { url };
                      },
                      del: async (url) => {
                        if (failDelete) throw Error("provider secret error");
                        deleted.push(url);
                        blobs.delete(url);
                      },
                    }
                  : n.startsWith("@/")
                    ? load(n.slice(2) + ".ts")
                    : n.startsWith("./")
                      ? load(path.join(path.dirname(file), n + ".ts"))
                      : require(n);
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      file,
    );
    return (cache[file] = m.exports);
  }
  const crypto = load("lib/pdf-vault.ts");
  // Fetch is resolved at invocation; isolate the real implementation behind a deterministic transport.
  const originalFetch = global.fetch;
  global.fetch = fakeFetch;
  const sourceUrl = "https://store.public.blob.vercel-storage.com/source.pdf";
  const doc = await PDFDocument.create();
  for (let i = 0; i < 4; i++) {
    const p = doc.addPage([200 + i * 10, 300]);
    p.node.set(PDFName.of("Annots"), doc.context.obj([]));
  }
  const source = Buffer.from(await doc.save());
  blobs.set(sourceUrl, source);
  const paper = {
    id: paperId,
    title: "Source paper",
    kind: "SCHOOL",
    grade: "SSC",
    subject: "ICT",
    year: "2026",
    source: "School",
    published: true,
    url: sourceUrl,
    at: "2026-11-10T00:00:00.000Z",
    presets: {},
  };
  const snap = {
    edits: {},
    header: {
      school: "School",
      exam: "Test",
      subject: "ICT",
      time: "30",
      marks: "20",
    },
    headerStyle: "simple",
    headerSettings: load("lib/paper-builder.ts").settingsSchema.parse({}),
    headerLine: true,
    headerGap: 2,
  };
  const { origin, hash } = load("lib/ready-origin.ts").createReadyOrigin({
    ownerId: "u",
    receiptId,
    createdAt: paper.at,
    source: paper,
    selected: [3, 1],
    initialSnapshot: snap,
  });
  store.set("readyorigin:v1:u:" + receiptId, JSON.stringify(origin));
  store.set(
    "readyowned:v1:u:" + receiptId,
    JSON.stringify({ id: receiptId, ownerId: "u", paperId, originHash: hash }),
  );
  return {
    store,
    blobs,
    deleted,
    calls,
    crypto,
    service: load("lib/ready-vault.ts"),
    route: load("app/api/ready-vault/[receiptId]/route.ts"),
    action: load("app/actions/ready-vault.ts"),
    load,
    diagnostic: load("lib/pdf-vault-check.ts"),
    diagnosticAction: load("app/actions/pdf-vault-check.ts"),
    setDiagnosticRole: (role) => (diagnosticRole = role),
    setFailDelete: () => (failDelete = true),
    setSession: (v) => (session = v),
    setFail: () => (fail = true),
    setFetchHook: (hook) => (fetchHook = hook),
    restore: () => (global.fetch = originalFetch),
  };
}
const withSetup = (fn) => async () => {
  const s = await setup();
  try {
    await fn(s);
  } finally {
    s.restore();
  }
};
test(
  "AES-GCM ciphertext is randomized, bound to owner/receipt/origin/hash, and integrity checked",
  withSetup(async (s) => {
    const bytes = Buffer.from("%PDF-test"),
      binding = { ownerId: "u", receiptId, originHash: "b".repeat(64) };
    const a = s.crypto.encryptVaultPdf(bytes, binding),
      b = s.crypto.encryptVaultPdf(bytes, binding),
      m = { ...binding, keyId: a.keyId, sha256: a.sha256, size: bytes.length };
    assert.notDeepEqual(a.bytes, b.bytes);
    assert.equal(a.bytes.includes(bytes), false);
    assert.deepEqual(s.crypto.decryptVaultPdf(a.bytes, m), bytes);
    for (const delta of [
      { ownerId: "v" },
      { receiptId: "c".repeat(64) },
      { originHash: "d".repeat(64) },
      { sha256: "e".repeat(64) },
    ])
      assert.throws(() =>
        s.crypto.decryptVaultPdf(a.bytes, { ...m, ...delta }),
      );
    const corrupt = Buffer.from(a.bytes);
    corrupt[corrupt.length - 1] ^= 1;
    assert.throws(() => s.crypto.decryptVaultPdf(corrupt, m));
    assert.throws(() => s.crypto.decryptVaultPdf(a.bytes.subarray(1), m));
  }),
);
test(
  "key rotation retains old reads, missing/malformed keys fail closed without plaintext fallback",
  withSetup(async (s) => {
    const original = process.env.PDF_VAULT_KEYS,
      active = process.env.PDF_VAULT_ACTIVE_KEY;
    try {
      const bytes = Buffer.from("%PDF-test"),
        binding = { ownerId: "u", receiptId, originHash: "b".repeat(64) },
        a = s.crypto.encryptVaultPdf(bytes, binding),
        m = {
          ...binding,
          keyId: a.keyId,
          sha256: a.sha256,
          size: bytes.length,
        };
      process.env.PDF_VAULT_KEYS = JSON.stringify({
        v1: "11".repeat(32),
        v2: "22".repeat(32),
      });
      process.env.PDF_VAULT_ACTIVE_KEY = "v2";
      assert.equal(s.crypto.encryptVaultPdf(bytes, binding).keyId, "v2");
      assert.deepEqual(s.crypto.decryptVaultPdf(a.bytes, m), bytes);
      process.env.PDF_VAULT_KEYS = JSON.stringify({ v2: "22".repeat(32) });
      assert.throws(() => s.crypto.decryptVaultPdf(a.bytes, m));
      process.env.PDF_VAULT_KEYS = "bad";
      assert.equal(s.crypto.vaultConfigured(), false);
      assert.throws(() => s.crypto.encryptVaultPdf(bytes, binding));
    } finally {
      process.env.PDF_VAULT_KEYS = original;
      process.env.PDF_VAULT_ACTIVE_KEY = active;
    }
  }),
);
test(
  "storage URLs reject redirects/credentials/query/private-network and non-vault paths",
  withSetup(async (s) => {
    for (const url of [
      "http://store.public.blob.vercel-storage.com/a",
      "https://127.0.0.1/a",
      "https://a.public.blob.vercel-storage.com.evil.org/a",
      "https://user@a.public.blob.vercel-storage.com/a",
      "https://a.public.blob.vercel-storage.com/a?x=1",
      "https://a.public.blob.vercel-storage.com/a#x",
      "https://a.public.blob.vercel-storage.com:444/a",
    ])
      assert.throws(() => s.crypto.trustedBlobUrl(url));
    assert.throws(() =>
      s.crypto.trustedBlobUrl(
        "https://a.public.blob.vercel-storage.com/source.pdf",
        true,
      ),
    );
    await s.service.captureReadyVault("u", receiptId);
    assert.ok(
      s.calls.every(
        (c) =>
          c.options.redirect === "error" &&
          c.options.cache === "no-store" &&
          c.options.signal,
      ),
    );
  }),
);
test(
  "server copies only purchased initial pages in order, removes annotations, encrypts storage and returns PDF without source URL",
  withSetup(async (s) => {
    await s.service.captureReadyVault("u", receiptId);
    const m = JSON.parse(s.store.get("readyvault:v1:u:" + receiptId));
    assert.equal(m.pages, 2);
    assert.deepEqual(m.selected, [3, 1]);
    assert.equal(s.blobs.get(m.url).subarray(0, 4).toString(), "PBV1");
    const bytes = await s.service.deliverReadyVault("u", receiptId),
      pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 2);
    assert.deepEqual(
      pdf.getPages().map((p) => p.getWidth()),
      [220, 200],
    );
    assert.ok(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const response = await s.route.GET(
      new Request("https://app.example/api/ready-vault/" + receiptId),
      { params: Promise.resolve({ receiptId }) },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(response.headers.get("content-disposition"), /attachment/);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  }),
);
test(
  "capture is idempotent; concurrent writers retain one manifest and delete losing ciphertexts",
  withSetup(async (s) => {
    await Promise.all(
      Array.from({ length: 8 }, () =>
        s.service.captureReadyVault("u", receiptId),
      ),
    );
    assert.equal(
      [...s.store.keys()].filter((k) => k.startsWith("readyvault:v1:")).length,
      1,
    );
    assert.equal(
      [...s.blobs.keys()].filter((k) => k.includes("/pdf-vault/")).length,
      1,
    );
    const count = s.calls.length;
    await s.service.captureReadyVault("u", receiptId);
    assert.equal(s.calls.length, count);
  }),
);
test(
  "manifest write rollback cleans uploaded ciphertext and does not create a paid receipt or financial event",
  withSetup(async (s) => {
    s.setFail();
    await assert.rejects(() => s.service.captureReadyVault("u", receiptId));
    assert.equal(s.store.has("readyvault:v1:u:" + receiptId), false);
    assert.equal(
      [...s.blobs.keys()].filter((k) => k.includes("/pdf-vault/")).length,
      0,
    );
    assert.equal(s.deleted.length, 1);
    assert.equal(
      [...s.store.keys()].some((k) => k.startsWith("wallet:")),
      false,
    );
  }),
);
test(
  "owner isolation, legacy receipt, origin tampering and refunded receipt block capture/delivery",
  withSetup(async (s) => {
    await assert.rejects(() => s.service.captureReadyVault("v", receiptId));
    await s.service.captureReadyVault("u", receiptId);
    await assert.rejects(() => s.service.deliverReadyVault("v", receiptId));
    const key = "readyowned:v1:u:" + receiptId,
      raw = s.store.get(key),
      receipt = JSON.parse(raw);
    for (const updated of [
      { ...receipt, refundedAt: "2026-11-10T01:00:00Z" },
      { ...receipt, originHash: undefined },
      { ...receipt, ownerId: "v" },
    ]) {
      s.store.set(key, JSON.stringify(updated));
      await assert.rejects(() => s.service.deliverReadyVault("u", receiptId));
    }
    s.store.set(key, raw);
    const originKey = "readyorigin:v1:u:" + receiptId,
      origin = JSON.parse(s.store.get(originKey));
    origin.selected = [2];
    s.store.set(originKey, JSON.stringify(origin));
    await assert.rejects(() => s.service.deliverReadyVault("u", receiptId));
  }),
);
test(
  "download route rejects anonymous/other-owner/range and never includes provider errors",
  withSetup(async (s) => {
    await s.service.captureReadyVault("u", receiptId);
    const request = () =>
        new Request("https://app.example/api/ready-vault/" + receiptId),
      params = { params: Promise.resolve({ receiptId }) };
    s.setSession(null);
    assert.equal((await s.route.GET(request(), params)).status, 401);
    s.setSession("v");
    const denied = await s.route.GET(request(), params);
    assert.equal(denied.status, 404);
    assert.equal(await denied.text(), "Not found or unavailable");
    s.setSession("u");
    assert.equal(
      (
        await s.route.GET(
          new Request(request(), { headers: { Range: "bytes=0-10" } }),
          params,
        )
      ).status,
      416,
    );
  }),
);
test(
  "daily attempt budget blocks provider work and unbounded downloads fail before PDF parsing",
  withSetup(async (s) => {
    s.store.set(
      "readyvault-attempt:v1:u:" + new Date().toISOString().slice(0, 10),
      "10",
    );
    await assert.rejects(() => s.service.captureReadyVault("u", receiptId));
    assert.equal(s.calls.length, 0);
    const url = "https://store.public.blob.vercel-storage.com/huge.pdf";
    s.blobs.set(url, Buffer.alloc(100));
    await assert.rejects(() => s.crypto.fetchBoundedBlob(url, 10));
  }),
);
test(
  "ciphertext tampering or manifest selection mismatch fails closed",
  withSetup(async (s) => {
    await s.service.captureReadyVault("u", receiptId);
    const key = "readyvault:v1:u:" + receiptId,
      m = JSON.parse(s.store.get(key));
    const bytes = s.blobs.get(m.url);
    bytes[bytes.length - 1] ^= 1;
    await assert.rejects(() => s.service.deliverReadyVault("u", receiptId));
    s.store.set(key, JSON.stringify({ ...m, selected: [1, 3] }));
    await assert.rejects(() => s.service.deliverReadyVault("u", receiptId));
  }),
);
test(
  "revocation during storage fetch prevents delivery at final authorization check",
  withSetup(async (s) => {
    await s.service.captureReadyVault("u", receiptId);
    s.setFetchHook((url) => {
      if (url.includes("/pdf-vault/")) {
        const key = "readyowned:v1:u:" + receiptId,
          r = JSON.parse(s.store.get(key));
        s.store.set(
          key,
          JSON.stringify({ ...r, refundedAt: new Date().toISOString() }),
        );
      }
    });
    await assert.rejects(() => s.service.deliverReadyVault("u", receiptId));
  }),
);
test(
  "server action requires login, rejects invalid identifiers and returns no provider details",
  withSetup(async (s) => {
    s.setSession(null);
    const anonymous = await s.action.saveReadySourceCheckpoint(receiptId);
    assert.equal(anonymous.ok, false);
    assert.equal(s.calls.length, 0);
    s.setSession("u");
    assert.equal(
      (await s.action.saveReadySourceCheckpoint("../bad")).ok,
      false,
    );
    assert.equal(
      (await s.action.saveReadySourceCheckpoint(receiptId)).ok,
      true,
    );
    s.setSession("v");
    const other = await s.action.saveReadySourceCheckpoint(receiptId);
    assert.equal(other.ok, false);
    assert.doesNotMatch(
      other.error,
      /test-only-token|public\.blob|AES|originHash/,
    );
  }),
);
test(
  "invalid PDF or nonexistent selected pages creates no vault object",
  withSetup(async (s) => {
    const url = "https://store.public.blob.vercel-storage.com/source.pdf";
    s.blobs.set(url, Buffer.from("not a PDF"));
    await assert.rejects(() => s.service.captureReadyVault("u", receiptId));
    const one = await PDFDocument.create();
    one.addPage([200, 300]);
    s.blobs.set(url, Buffer.from(await one.save()));
    await assert.rejects(() => s.service.captureReadyVault("u", receiptId));
    assert.equal(
      [...s.blobs.keys()].some((k) => k.includes("/pdf-vault/")),
      false,
    );
  }),
);
test("checkpoint UI states exact scope and contains no storage link or resale promise", () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const m = new Module("checkpoint", module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "@/app/actions/ready-vault"
      ? { saveReadySourceCheckpoint: async () => ({ ok: true }) }
      : require(n);
  m._compile(
    ts.transpileModule(
      fs.readFileSync("components/ready-papers/source-checkpoint.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText,
    "checkpoint",
  );
  const html = renderToStaticMarkup(
    React.createElement(m.exports.default, { receiptId }),
  );
  assert.match(html, /পরবর্তী edit বা উত্তরপত্র নয়/);
  assert.match(html, /বিক্রির অনুমতি নয়/);
  assert.doesNotMatch(html, /public\.blob|PDF_VAULT|test-only-token|mailto:/);
});
test(
  "missing key configuration hides readiness and blocks capture before storage work",
  withSetup(async (s) => {
    const keys = process.env.PDF_VAULT_KEYS;
    try {
      delete process.env.PDF_VAULT_KEYS;
      assert.equal(s.crypto.vaultConfigured(), false);
      await assert.rejects(() => s.service.captureReadyVault("u", receiptId));
      assert.equal(s.calls.length, 0);
      assert.equal(
        [...s.store.keys()].some((k) => k.startsWith("readyvault")),
        false,
      );
    } finally {
      process.env.PDF_VAULT_KEYS = keys;
    }
  }),
);
test(
  "diagnostic performs real crypto/PDF roundtrip with mock Blob and deletes only its test object",
  withSetup(async (s) => {
    const originalKeys = [...s.store.keys()];
    const r = await s.diagnostic.runPdfVaultCheck("u");
    assert.deepEqual(r, { verified: true, cleanup: true });
    assert.equal(
      [...s.blobs.keys()].filter((k) => k.includes("/pdf-vault/")).length,
      0,
    );
    assert.ok(originalKeys.every((k) => s.store.has(k)));
    const auditKey = [...s.store.keys()].find((k) =>
      k.startsWith("pdf-vault:diagnostic:audit:"),
    );
    const audit = JSON.parse(s.store.get(auditKey));
    assert.equal(audit.verified, true);
    assert.equal(audit.cleanup, true);
    assert.equal(audit.orphanUrl, undefined);
    assert.ok([...s.store.keys()].every((k) => !k.startsWith("wallet:")));
    await assert.rejects(() => s.diagnostic.runPdfVaultCheck("u"));
    assert.equal(s.calls.length, 1);
  }),
);
test(
  "diagnostic fresh admin check and explicit action consent block all provider work",
  withSetup(async (s) => {
    s.setDiagnosticRole("STUDENT");
    await assert.rejects(() => s.diagnostic.runPdfVaultCheck("u"));
    assert.equal(s.calls.length, 0);
    s.setDiagnosticRole("ADMIN");
    const no = await s.diagnosticAction.checkPdfVault({}, new FormData());
    assert.equal(no.ok, false);
    assert.equal(s.calls.length, 0);
    s.setSession(null);
    const f = new FormData();
    f.set("confirmed", "on");
    assert.equal((await s.diagnosticAction.checkPdfVault({}, f)).ok, false);
  }),
);
test(
  "diagnostic cleanup failure is not a successful rollout check and retains orphan only in private audit",
  withSetup(async (s) => {
    s.setFailDelete();
    const f = new FormData();
    f.set("confirmed", "on");
    const r = await s.diagnosticAction.checkPdfVault({}, f);
    assert.equal(r.ok, false);
    assert.doesNotMatch(
      r.message,
      /provider secret|public\.blob|test-only-token/,
    );
    const key = [...s.store.keys()].find((k) =>
        k.startsWith("pdf-vault:diagnostic:audit:"),
      ),
      audit = JSON.parse(s.store.get(key));
    assert.equal(audit.verified, true);
    assert.equal(audit.cleanup, false);
    assert.match(audit.orphanUrl, /pdf-vault/);
  }),
);
