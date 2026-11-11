const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
function setup() {
  const store = new Map(),
    users = {
      u: { id: "u", role: "STUDENT" },
      a: { id: "a", role: "ADMIN" },
      v: { id: "v", role: "TEACHER" },
    },
    questions = [
      { id: "m", correct: "A", options: {} },
      { id: "s", correct: "", options: {} },
      { id: "c", correct: "", options: { stimulus: "story" } },
    ];
  let session = "u",
    pkg = false,
    queue = Promise.resolve();
  const tx = {
    user: { findUnique: async ({ where }) => users[where.id] },
    question: {
      findMany: async ({ where }) =>
        questions.filter((q) => where.id.in.includes(q.id)),
    },
    packagePurchase: { findFirst: async () => (pkg ? { id: "pkg" } : null) },
    setting: {
      findUnique: async ({ where }) =>
        store.has(where.key)
          ? { key: where.key, value: store.get(where.key) }
          : null,
      findMany: async ({ where }) =>
        [...store]
          .filter(([key]) =>
            where.key.in
              ? where.key.in.includes(key)
              : key.startsWith(where.key.startsWith),
          )
          .map(([key, value]) => ({ key, value })),
      create: async ({ data }) => {
        if (store.has(data.key)) throw Error("duplicate");
        store.set(data.key, data.value);
        return data;
      },
      update: async ({ where, data }) => {
        if (!store.has(where.key)) throw Error("missing");
        store.set(where.key, data.value);
        return data;
      },
    },
    $queryRaw: async () => [],
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
    if (cache[file]) return cache[file];
    const m = new Module(file, module);
    m.paths = module.paths;
    m.require = (id) =>
      id === "@/lib/db"
        ? { db }
        : id === "@/auth"
          ? { auth: async () => (session ? { user: users[session] } : null) }
          : id === "next/cache"
            ? { revalidatePath: () => {} }
            : id === "@/lib/paper-generation"
              ? { visibleQuestions: () => ({ approved: true }) }
              : id === "@/lib/payment-info"
                ? { PAYMENT_METHODS: [{ id: "bKash" }, { id: "Nagad" }] }
                : id === "@/lib/wallet"
                  ? load("lib/wallet.ts")
                  : require(id);
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
  return {
    wallet: load("lib/wallet.ts"),
    actions: load("app/actions/wallet.ts"),
    store,
    setSession: (id) => (session = id),
    setPackage: (v) => (pkg = v),
  };
}
test("integer prices and CQ identification including text-only legacy CQ", () => {
  const { wallet: w } = setup();
  assert.deepEqual(w.WALLET_RATES, { MCQ: 20, SHORT: 30, CQ: 50 });
  assert.equal(
    w.questionPriceType({ correct: "", options: {}, text: "(ক) প্রশ্ন" }),
    "CQ",
  );
  assert.equal(w.formatMoney(20), "৳0.20");
});
test("concurrent first-login wallet provisioning awards one bonus only; ADMIN exempt", async () => {
  const { wallet: w, store } = setup();
  await Promise.all(Array.from({ length: 8 }, () => w.ensureWallet("u")));
  assert.equal(JSON.parse(store.get("wallet:account:u")).balance, 2000);
  assert.equal(
    [...store.keys()].filter((k) => k === "wallet:bonus:u").length,
    1,
  );
  assert.equal((await w.ensureWallet("a")).admin, true);
  assert.ok(!store.has("wallet:account:a"));
});
test("server quote deduplicates IDs and ignores client prices; checkout charges once across retries", async () => {
  const { actions: a, store } = setup();
  const q = await a.quoteQuestions(["m", "m", "s", "c"]);
  assert.equal(q.total, 100);
  const results = await Promise.all([
    a.purchaseQuestions(["m", "s", "c"], 100),
    a.purchaseQuestions(["m", "s", "c"], 100),
  ]);
  assert.ok(results.every((r) => r.ok));
  assert.equal(
    results.reduce((n, r) => n + r.charged, 0),
    100,
  );
  assert.equal(JSON.parse(store.get("wallet:account:u")).balance, 1900);
  assert.equal((await a.quoteQuestions(["m", "s", "c"])).total, 0);
});
test("insufficient balance and stale amount fail without debit/entitlement", async () => {
  const { actions: a, store } = setup();
  await a.walletSummary();
  store.set("wallet:account:u", JSON.stringify({ balance: 10, bonus: 2000 }));
  assert.equal((await a.purchaseQuestions(["m"], 20)).ok, false);
  assert.equal(JSON.parse(store.get("wallet:account:u")).balance, 10);
  assert.ok(!store.has("wallet:question:u:m"));
  store.set("wallet:account:u", JSON.stringify({ balance: 2000, bonus: 2000 }));
  assert.equal((await a.purchaseQuestions(["m"], 1)).ok, false);
});
test("active package and fresh database ADMIN role bypass charges", async () => {
  const x = setup();
  x.setPackage(true);
  assert.equal((await x.actions.quoteQuestions(["c"])).total, 0);
  assert.equal((await x.actions.purchaseQuestions(["c"], 0)).charged, 0);
  x.setPackage(false);
  x.setSession("a");
  assert.equal((await x.actions.quoteQuestions(["c"])).admin, true);
  assert.equal((await x.actions.purchaseQuestions(["c"], 0)).charged, 0);
});
test("unknown IDs, excessive selection and unauthenticated access fail closed", async () => {
  const x = setup();
  assert.equal((await x.actions.quoteQuestions(["private"])).ok, false);
  assert.equal(
    (await x.actions.quoteQuestions(Array(301).fill("m"))).ok,
    false,
  );
  x.setSession(null);
  assert.equal((await x.actions.purchaseQuestions(["m"], 20)).ok, false);
});
function form(amount = "20", trx = "ABC12345") {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    amount,
    method: "bKash",
    transactionId: trx,
    phone: "01712345678",
  }))
    f.set(k, v);
  return f;
}
test("recharge minimum enforced and submission alone cannot credit balance", async () => {
  const x = setup();
  assert.equal((await x.actions.submitRecharge(form("19"))).ok, false);
  assert.equal((await x.actions.submitRecharge(form())).ok, true);
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 2000);
  assert.equal(
    (await x.actions.submitRecharge(form("20", "OTHER123"))).ok,
    false,
  );
});
test("only ADMIN can approve; approved request credits once, repeated review cannot replay", async () => {
  const x = setup();
  await x.actions.submitRecharge(form());
  const key = "wallet:recharge:u:ABC12345";
  await assert.rejects(x.actions.reviewRecharge(key, true));
  x.setSession("a");
  await x.actions.reviewRecharge(key, true);
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 4000);
  await assert.rejects(x.actions.reviewRecharge(key, true));
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 4000);
});
test("rejected recharge has no credit and reused transaction ID rejected across accounts", async () => {
  const x = setup();
  await x.actions.submitRecharge(form());
  x.setSession("a");
  await x.actions.reviewRecharge("wallet:recharge:u:ABC12345", false);
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 2000);
  x.setSession("v");
  assert.equal((await x.actions.submitRecharge(form())).ok, false);
});
test("save/export authorization fails before checkout and passes after purchase", async () => {
  const x = setup();
  await assert.rejects(x.wallet.requirePaidQuestions("u", ["m"]));
  await x.actions.purchaseQuestions(["m"], 20);
  await x.wallet.requirePaidQuestions("u", ["m"]);
});
