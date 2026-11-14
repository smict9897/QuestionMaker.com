const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module"),
  path = require("path");
const paperId = "11111111-1111-4111-8111-111111111111";
function setup() {
  const store = new Map();
  let session = "u",
    queue = Promise.resolve(),
    fail = "";
  const users = {
    u: { id: "u", role: "STUDENT" },
    v: { id: "v", role: "STUDENT" },
    a: { id: "a", role: "ADMIN" },
  };
  const tx = {
    user: { findUnique: async ({ where }) => users[where.id] },
    $queryRaw: async () => [],
    setting: {
      findUnique: async ({ where }) =>
        store.has(where.key)
          ? { key: where.key, value: store.get(where.key) }
          : null,
      findMany: async ({ where }) =>
        [...store]
          .filter(([k]) => k.startsWith(where.key.startsWith))
          .map(([key, value]) => ({ key, value })),
      create: async ({ data }) => {
        if (fail && data.key.startsWith(fail)) throw Error("forced");
        if (store.has(data.key)) throw Error("duplicate");
        store.set(data.key, data.value);
        return data;
      },
      update: async ({ where, data }) => {
        if (fail && where.key.startsWith(fail)) throw Error("forced");
        if (!store.has(where.key)) throw Error("missing");
        store.set(where.key, data.value);
        return data;
      },
      upsert: async ({ where, create, update }) => {
        const d = store.has(where.key) ? update : create;
        store.set(where.key, d.value);
        return d;
      },
    },
  };
  const db = {
    ...tx,
    $transaction: (fn) => {
      const run = queue.then(async () => {
        const before = new Map(store);
        try {
          return await fn(tx);
        } catch (e) {
          store.clear();
          for (const [k, v] of before) store.set(k, v);
          throw e;
        }
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  const cache = {};
  function load(file) {
    file = path.normalize(file);
    if (cache[file]) return cache[file];
    const m = new Module(file, module);
    m.paths = module.paths;
    m.require = (n) =>
      n === "@/lib/db"
        ? { db }
        : n === "@/auth"
          ? { auth: async () => (session ? { user: users[session] } : null) }
          : n === "next/cache"
            ? { revalidatePath: () => {} }
            : n === "@/lib/paper-generation"
              ? { visibleQuestions: () => ({}) }
              : n.startsWith("@/lib/")
                ? load(n.replace("@/", "") + ".ts")
                : n.startsWith("./")
                  ? load(path.join(path.dirname(file), n + ".ts"))
                  : require(n);
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      file,
    );
    return (cache[file] = m.exports);
  }
  const model = load("lib/ready-papers.ts"),
    pricing = load("lib/ready-commerce.ts");
  const record = {
    id: paperId,
    title: "ICT test",
    kind: "SCHOOL",
    grade: "SSC",
    subject: "ICT",
    year: "2026",
    source: "School",
    published: true,
    url: "https://example.public.blob.vercel-storage.com/test.pdf",
    at: new Date().toISOString(),
    presets: {},
  };
  store.set(model.READY_PREFIX + paperId, JSON.stringify(record));
  const snap = {
    edits: { 1: model.freshEdit() },
    header: {
      school: "School",
      exam: "Test",
      subject: "ICT",
      time: "30",
      marks: "25",
    },
    headerStyle: "simple",
    headerSettings: load("lib/paper-builder.ts").settingsSchema.parse({}),
    headerLine: true,
    headerGap: 2,
  };
  const actions = load("app/actions/ready-commerce.ts");
  const input = (n) => ({
    paperId,
    selected: Array.from({ length: n }, (_, i) => i + 1),
  });
  const checkout = async (n = 3) => {
    const raw = input(n),
      q = await actions.quoteReadyPaper(raw);
    assert.equal(q.ok, true);
    return actions.checkoutReadyPaper(raw, q, snap);
  };
  return {
    actions,
    pricing,
    store,
    snap,
    input,
    checkout,
    setSession: (s) => (session = s),
    setFail: (f) => (fail = f),
    credit: (amount) =>
      store.set(
        "wallet:account:u",
        JSON.stringify({ balance: amount, bonus: 2000 }),
      ),
    wallet: () => JSON.parse(store.get("wallet:account:u")),
  };
}
test("ready page grouping 1–3/4–6/7–9/10, validates unique bounded selections", () => {
  const s = setup();
  for (const [n, u] of [
    [1, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [9, 3],
    [10, 4],
  ])
    assert.equal(s.pricing.readyUnits(n), u);
  for (const n of [0, -1, 11, 1.5])
    assert.throws(() => s.pricing.readyUnits(n));
  assert.equal(
    s.pricing.readySelectionSchema.safeParse({ paperId, selected: [1, 1] })
      .success,
    false,
  );
  assert.equal(
    s.pricing.readySelectionSchema.safeParse({ paperId, selected: [101] })
      .success,
    false,
  );
});
test("quote never charges; bonus20 buys four 3-page units, retry is free", async () => {
  const s = setup();
  const q = await s.actions.quoteReadyPaper(s.input(3));
  assert.equal(q.total, 500);
  assert.equal(s.wallet().balance, 2000);
  const r = await s.checkout();
  assert.equal(r.ok, true);
  assert.equal(s.wallet().balance, 1500);
  const r2 = await s.checkout();
  assert.equal(r2.charged, 0);
  assert.equal(s.wallet().balance, 1500);
  for (const pages of [
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
  ]) {
    const raw = { paperId, selected: pages },
      q = await s.actions.quoteReadyPaper(raw);
    assert.equal((await s.actions.checkoutReadyPaper(raw, q, s.snap)).ok, true);
  }
  assert.equal(s.wallet().balance, 0);
  const fifth = { paperId, selected: [13] };
  const fq = await s.actions.quoteReadyPaper(fifth);
  assert.equal(
    (await s.actions.checkoutReadyPaper(fifth, fq, s.snap)).ok,
    false,
  );
});
test("concurrent checkout double click debits once and creates one durable receipt", async () => {
  const s = setup();
  const raw = s.input(6),
    q = await s.actions.quoteReadyPaper(raw);
  const r = await Promise.all([
    s.actions.checkoutReadyPaper(raw, q, s.snap),
    s.actions.checkoutReadyPaper(raw, q, s.snap),
  ]);
  assert.ok(r.every((x) => x.ok));
  assert.equal(s.wallet().balance, 1000);
  assert.equal((await s.actions.listReadyPurchases()).length, 1);
});
test("server ignores tampered totals, rejects anonymous and unpublished access", async () => {
  const s = setup();
  s.credit(2000);
  assert.equal(
    (
      await s.actions.checkoutReadyPaper(
        s.input(4),
        { total: 0, packageUnits: 0 },
        s.snap,
      )
    ).ok,
    false,
  );
  assert.equal(s.wallet().balance, 2000);
  s.setSession(null);
  assert.equal((await s.actions.quoteReadyPaper(s.input(1))).ok, false);
  s.setSession("u");
  const row = JSON.parse(s.store.get("readypaper:v1:" + paperId));
  row.published = false;
  s.store.set("readypaper:v1:" + paperId, JSON.stringify(row));
  assert.equal((await s.actions.quoteReadyPaper(s.input(1))).ok, false);
});
test("failed receipt or wallet write rolls back charge and ownership", async () => {
  const s = setup();
  s.credit(2000);
  s.setFail("wallet:account:");
  const r = await s.checkout();
  assert.equal(r.ok, false);
  assert.equal(s.wallet().balance, 2000);
  assert.equal((await s.actions.listReadyPurchases()).length, 0);
  s.setFail("");
  assert.equal((await s.checkout()).ok, true);
});
test("saved answers are server-approved selected pages only, ownership isolated", async () => {
  const s = setup();
  for (const [n, approved] of [
    [1, true],
    [2, false],
    [4, true],
  ])
    s.store.set(
      `readyanswers:v1:${paperId}:${n}`,
      JSON.stringify({
        questionPage: n,
        sourcePage: 20,
        label: "Test",
        answers: ["ক", "খ"],
        approved,
      }),
    );
  const r = await s.checkout();
  const p = await s.actions.getReadyPurchase(r.receiptId);
  assert.equal(p.answers.length, 1);
  assert.equal(p.answers[0].questionPage, 1);
  s.setSession("v");
  assert.equal(await s.actions.getReadyPurchase(r.receiptId), null);
  assert.deepEqual(await s.actions.listReadyPurchases(), []);
  assert.equal(
    (await s.actions.saveReadyPurchase(r.receiptId, s.snap)).ok,
    false,
  );
  s.setSession("u");
  const changed = { ...s.snap, headerGap: 8 };
  assert.equal(
    (await s.actions.saveReadyPurchase(r.receiptId, changed)).ok,
    true,
  );
  assert.equal(
    (await s.actions.getReadyPurchase(r.receiptId)).snapshot.headerGap,
    8,
  );
});
test("monthly99 plan30 units, quota debit serialized, partial quota uses wallet, no existing-package bypass", async () => {
  const s = setup();
  s.credit(12000);
  const [a, b] = await Promise.all([
    s.actions.buyReadyPlan(),
    s.actions.buyReadyPlan(),
  ]);
  assert.equal([a, b].filter((r) => r.ok).length, 1);
  assert.equal(s.wallet().balance, 2100);
  const summary = await s.actions.readyPlanSummary();
  assert.equal(summary.plan.remaining, 30);
  let p = summary.plan;
  p.remaining = 1;
  s.store.set("readyplan:v1:u", JSON.stringify(p));
  const raw = s.input(6),
    q = await s.actions.quoteReadyPaper(raw);
  assert.equal(q.packageUnits, 1);
  assert.equal(q.total, 500);
  assert.equal((await s.actions.checkoutReadyPaper(raw, q, s.snap)).ok, true);
  assert.equal(s.wallet().balance, 1600);
  assert.equal((await s.actions.readyPlanSummary()).plan.remaining, 0);
});
test("expired plan not spent, renewal charged once, admin free", async () => {
  const s = setup();
  s.credit(15000);
  s.store.set(
    "readyplan:v1:u",
    JSON.stringify({
      id: "old",
      remaining: 30,
      expiresAt: "2020-01-01T00:00:00.000Z",
    }),
  );
  assert.equal((await s.actions.quoteReadyPaper(s.input(3))).total, 500);
  assert.equal((await s.actions.buyReadyPlan()).ok, true);
  s.setSession("a");
  const q = await s.actions.quoteReadyPaper(s.input(10));
  assert.equal(q.total, 0);
  assert.equal(q.admin, true);
  assert.equal(
    (await s.actions.checkoutReadyPaper(s.input(10), q, s.snap)).ok,
    true,
  );
});
test("quota change requires fresh consent without debit", async () => {
  const s = setup();
  s.credit(12000);
  await s.actions.buyReadyPlan();
  const raw = s.input(6),
    q = await s.actions.quoteReadyPaper(raw);
  const p = JSON.parse(s.store.get("readyplan:v1:u"));
  p.remaining = 0;
  s.store.set("readyplan:v1:u", JSON.stringify(p));
  assert.equal((await s.actions.checkoutReadyPaper(raw, q, s.snap)).ok, false);
  assert.equal(s.wallet().balance, 2100);
});

test("reordering a purchased set is free and durable, adding pages cannot mutate paid selection", async () => {
  const s = setup(),
    r = await s.checkout();
  const q = await s.actions.quoteReadyPaper({ paperId, selected: [3, 2, 1] });
  assert.equal(q.total, 0);
  assert.equal(q.receiptId, r.receiptId);
  assert.equal(
    (await s.actions.saveReadyPurchase(r.receiptId, s.snap, [3, 2, 1])).ok,
    true,
  );
  assert.deepEqual(
    (await s.actions.getReadyPurchase(r.receiptId)).selected,
    [3, 2, 1],
  );
  assert.equal(
    (await s.actions.saveReadyPurchase(r.receiptId, s.snap, [1, 2, 3, 4])).ok,
    false,
  );
  assert.equal(s.wallet().balance, 1500);
});
test("later approved missing answers are attached on reopen without further charge", async () => {
  const s = setup(),
    r = await s.checkout();
  s.store.set(
    `readyanswers:v1:${paperId}:2`,
    JSON.stringify({
      questionPage: 2,
      sourcePage: 25,
      label: "New approved",
      approved: true,
      answers: ["গ"],
    }),
  );
  const p = await s.actions.getReadyPurchase(r.receiptId);
  assert.equal(p.answers.length, 1);
  assert.equal(p.answers[0].questionPage, 2);
  assert.equal(s.wallet().balance, 1500);
  assert.equal((await s.actions.listReadyPurchases())[0].answers.length, 1);
});
test("plan receipt write failure rolls back wallet and entitlement", async () => {
  const s = setup();
  s.credit(12000);
  s.setFail("readyplanreceipt:");
  assert.equal((await s.actions.buyReadyPlan()).ok, false);
  assert.equal(s.wallet().balance, 12000);
  assert.equal((await s.actions.readyPlanSummary()).plan, null);
});
test("snapshot validation rejects invalid gap before charging; answer injection ignored", async () => {
  const s = setup();
  s.credit(2000);
  const raw = s.input(3),
    q = await s.actions.quoteReadyPaper(raw);
  assert.equal(
    (await s.actions.checkoutReadyPaper(raw, q, { ...s.snap, headerGap: 100 }))
      .ok,
    false,
  );
  assert.equal(s.wallet().balance, 2000);
  const r = await s.actions.checkoutReadyPaper(raw, q, {
    ...s.snap,
    answers: [{ approved: true }],
  });
  assert.equal(r.ok, true);
  assert.equal(
    (await s.actions.getReadyPurchase(r.receiptId)).answers.length,
    0,
  );
});
test("UI entry requires checkout and server save is scoped to receipt; dedicated plan does not bypass old billing", () => {
  const c = fs.readFileSync("components/ready-papers/studio.tsx", "utf8"),
    a = fs.readFileSync("app/actions/ready-commerce.ts", "utf8");
  assert.match(c, /onClick=\{startSetup\}/);
  assert.match(c, /if \(!paid\)/);
  assert.match(c, /beforePurchase=/);
  assert.match(c, /saveReadyPurchase\(receipt, snapshot\(\), selected\)/);
  assert.doesNotMatch(a, /packagePurchase\.findFirst/);
  assert.match(a, /walletTransaction/);
  assert.match(a, /owned\.ownerId !== id/);
});

test("own pending submission uses unchanged paid checkout; others blocked until approval", async () => {
  const s = setup(),
    key = "readypaper:v1:" + paperId,
    record = JSON.parse(s.store.get(key));
  s.store.set(
    key,
    JSON.stringify({
      ...record,
      ownerId: "u",
      moderation: "pending",
      published: false,
    }),
  );
  s.credit(1000);
  const quote = await s.actions.quoteReadyPaper(s.input(3));
  assert.equal(quote.ok, true);
  assert.equal(quote.total, 500);
  const paid = await s.checkout(3);
  assert.equal(paid.ok, true);
  assert.equal(JSON.parse(s.store.get("wallet:account:u")).balance, 500);
  s.setSession("v");
  assert.equal((await s.actions.quoteReadyPaper(s.input(3))).ok, false);
  s.store.set(
    key,
    JSON.stringify({
      ...record,
      ownerId: "u",
      moderation: "approved",
      published: true,
    }),
  );
  assert.equal((await s.actions.quoteReadyPaper(s.input(3))).ok, true);
});

test("checkout records immutable server source and filtered initial snapshot, ignoring browser provenance", async () => {
  const s = setup();
  s.credit(2000);
  const q = await s.actions.quoteReadyPaper(s.input(3));
  const r = await s.actions.checkoutReadyPaper(s.input(3), q, {
    ...s.snap,
    ownerId: "v",
    source: { ownerId: "v" },
    resaleAuthorized: true,
  });
  assert.equal(r.ok, true);
  const origin = await s.actions.getReadyPurchaseOrigin(r.receiptId);
  assert.equal(origin.ownerId, "u");
  assert.equal(origin.kind, "READY_ASSEMBLY");
  assert.equal(origin.source.id, paperId);
  assert.equal(origin.classification, "LIBRARY_ASSEMBLY");
  assert.equal(origin.resaleAuthorized, false);
  assert.deepEqual(origin.selected, [1, 2, 3]);
  assert.equal(origin.initialSnapshot.header.school, "School");
  const receipt = await s.actions.getReadyPurchase(r.receiptId);
  assert.match(receipt.originHash, /^[a-f0-9]{64}$/);
});
test("origin and paid receipt roll back together on provenance write failure", async () => {
  const s = setup();
  s.credit(2000);
  s.setFail("readyorigin:v1:");
  assert.equal((await s.checkout()).ok, false);
  assert.equal(s.wallet().balance, 2000);
  assert.equal(
    [...s.store.keys()].filter(
      (k) =>
        k.startsWith("readyowned:") ||
        k.startsWith("readyorigin:") ||
        k.startsWith("readyai:"),
    ).length,
    0,
  );
});
test("origin remains immutable across paid edit, source replacement, archive and checkout retry", async () => {
  const s = setup();
  s.credit(2000);
  const r = await s.checkout();
  assert.equal(r.ok, true);
  const key = "readyorigin:v1:u:" + r.receiptId,
    first = s.store.get(key);
  assert.equal(
    (
      await s.actions.saveReadyPurchase(
        r.receiptId,
        { ...s.snap, header: { ...s.snap.header, school: "Changed" } },
        [3, 2, 1],
      )
    ).ok,
    true,
  );
  assert.equal(s.store.get(key), first);
  assert.equal((await s.checkout()).charged, 0);
  assert.equal(s.store.get(key), first);
  const source = JSON.parse(s.store.get("readypaper:v1:" + paperId));
  s.store.set(
    "readypaper:v1:" + paperId,
    JSON.stringify({
      ...source,
      url: "https://example.public.blob.vercel-storage.com/replaced.pdf",
      deletedAt: new Date().toISOString(),
      published: false,
    }),
  );
  const origin = await s.actions.getReadyPurchaseOrigin(r.receiptId);
  assert.equal(origin.source.url, source.url);
  assert.equal(origin.initialSnapshot.header.school, "School");
  assert.equal(
    (await s.actions.getReadyPurchase(r.receiptId)).snapshot.header.school,
    "Changed",
  );
  assert.equal(
    [...s.store.keys()].filter((k) => k.startsWith("readyorigin:")).length,
    1,
  );
});
test("uploaded approved source cannot acquire library provenance or resale authorization", async () => {
  const s = setup();
  s.credit(2000);
  const key = "readypaper:v1:" + paperId;
  s.store.set(
    key,
    JSON.stringify({
      ...JSON.parse(s.store.get(key)),
      ownerId: "v",
      moderation: "approved",
    }),
  );
  const r = await s.checkout();
  assert.equal(r.ok, true);
  const origin = await s.actions.getReadyPurchaseOrigin(r.receiptId);
  assert.equal(origin.classification, "UPLOADED_SOURCE");
  assert.equal(origin.source.ownerId, "v");
  assert.equal(origin.resaleAuthorized, false);
});
test("origin access is owner scoped and unauthenticated access fails", async () => {
  const s = setup();
  s.credit(2000);
  const r = await s.checkout();
  s.setSession("v");
  assert.equal(await s.actions.getReadyPurchaseOrigin(r.receiptId), null);
  s.setSession(null);
  await assert.rejects(() => s.actions.getReadyPurchaseOrigin(r.receiptId));
});
test("missing or changed new provenance fails closed; historical receipts stay explicitly unverified", async () => {
  const s = setup();
  s.credit(2000);
  const r = await s.checkout();
  const key = "readyorigin:v1:u:" + r.receiptId,
    original = s.store.get(key);
  const corrupt = JSON.parse(original);
  corrupt.source.title = "Forged";
  s.store.set(key, JSON.stringify(corrupt));
  await assert.rejects(() => s.actions.getReadyPurchaseOrigin(r.receiptId));
  s.store.delete(key);
  await assert.rejects(() => s.actions.getReadyPurchaseOrigin(r.receiptId));
  const receiptKey = "readyowned:v1:u:" + r.receiptId,
    old = JSON.parse(s.store.get(receiptKey));
  delete old.originHash;
  s.store.set(receiptKey, JSON.stringify(old));
  assert.equal(await s.actions.getReadyPurchaseOrigin(r.receiptId), null);
  assert.equal((await s.checkout()).charged, 0);
  assert.equal(s.store.has(key), false);
});
test("concurrent checkout creates one origin and charges once", async () => {
  const s = setup();
  s.credit(2000);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => s.checkout()),
  );
  assert.ok(results.every((r) => r.ok));
  assert.equal(
    results.reduce((sum, r) => sum + r.charged, 0),
    500,
  );
  assert.equal(
    [...s.store.keys()].filter((k) => k.startsWith("readyorigin:")).length,
    1,
  );
});

test("archived source URL cannot silently charge for a replacement PDF", async () => {
  const s = setup();
  s.credit(2000);
  const input = {
    ...s.input(3),
    sourceUrl: "https://example.public.blob.vercel-storage.com/old.pdf",
  };
  assert.equal((await s.actions.quoteReadyPaper(input)).ok, false);
  assert.equal(
    (
      await s.actions.checkoutReadyPaper(
        input,
        { total: 500, packageUnits: 0 },
        s.snap,
      )
    ).ok,
    false,
  );
  assert.equal(s.wallet().balance, 2000);
  assert.equal(
    [...s.store.keys()].filter((k) => k.startsWith("readyorigin:")).length,
    0,
  );
});
