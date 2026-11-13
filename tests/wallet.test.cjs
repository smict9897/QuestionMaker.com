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
    queue = Promise.resolve(),
    failKey = "";
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
        if (failKey && data.key.startsWith(failKey))
          throw Error("forced failure");
        if (store.has(data.key)) throw Error("duplicate");
        store.set(data.key, data.value);
        return data;
      },
      update: async ({ where, data }) => {
        if (failKey && where.key.startsWith(failKey))
          throw Error("forced failure");
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
      id === "@/lib/wallet-funds"
        ? load("lib/wallet-funds.ts")
        : id === "@/lib/db"
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
    transfers: load("app/actions/wallet-transfer.ts"),
    store,
    setFail: (key) => (failKey = key),
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

test("TID is stable, unique per account, registered without another bonus", async () => {
  const x = setup();
  const tid = x.wallet.teacherTid("u");
  assert.match(tid, /^QB-[A-F0-9]{20}$/);
  assert.notEqual(tid, x.wallet.teacherTid("v"));
  await x.wallet.ensureWallet("u");
  await x.wallet.ensureWallet("u");
  assert.equal(x.store.get(`teacher:tid:${tid}`), "u");
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 2000);
});
test("admin can credit verified override amount, with reason and requested amount preserved", async () => {
  const x = setup();
  await x.actions.submitRecharge(form());
  x.setSession("a");
  const key = "wallet:recharge:u:ABC12345";
  await assert.rejects(x.actions.reviewRecharge(key, true, "30"));
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 2000);
  await x.actions.reviewRecharge(key, true, "30.50", "Statement verified");
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 5050);
  const receipt = JSON.parse(x.store.get(key));
  assert.equal(receipt.requestedAmount, 2000);
  assert.equal(receipt.approvedAmount, 3050);
  assert.equal(receipt.reviewer, "a");
  assert.equal(receipt.tid, x.wallet.teacherTid("u"));
  await assert.rejects(
    x.actions.reviewRecharge(key, true, "30.50", "Statement verified"),
  );
});
test("recharge amount validation uses integer paisa and rejects invalid limits", () => {
  const { wallet: w } = setup();
  assert.equal(w.rechargeApprovalAmount("20.01"), 2001);
  assert.equal(w.rechargeApprovalAmount("50000"), 5000000);
  for (const value of [
    "",
    "0",
    "-20",
    "19.99",
    "50000.01",
    "1e3",
    "20.001",
    "Infinity",
    null,
  ]) {
    assert.throws(() => w.rechargeApprovalAmount(value));
  }
});
test("recharge form rejects non-admin and malformed decisions without credit", async () => {
  const x = setup();
  await x.actions.submitRecharge(form());
  const f = new FormData();
  f.set("requestKey", "wallet:recharge:u:ABC12345");
  f.set("decision", "approve");
  f.set("amount", "200");
  f.set("reason", "Verified statement");
  assert.equal((await x.actions.reviewRechargeForm({}, f)).ok, false);
  x.setSession("a");
  f.set("decision", "unknown");
  assert.equal((await x.actions.reviewRechargeForm({}, f)).ok, false);
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 2000);
});
test("concurrent override approvals credit exactly once and preserve bonus", async () => {
  const x = setup();
  await x.actions.submitRecharge(form());
  x.setSession("a");
  const key = "wallet:recharge:u:ABC12345";
  const results = await Promise.allSettled([
    x.actions.reviewRecharge(key, true, "200", "Payment verified"),
    x.actions.reviewRecharge(key, true, "200", "Payment verified"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const wallet = JSON.parse(x.store.get("wallet:account:u"));
  assert.equal(wallet.balance, 22000);
  assert.equal(wallet.bonus, 2000);
});
test("legacy funded wallet gets TID without bonus reset; mismatched request fails closed", async () => {
  const x = setup();
  x.store.set("wallet:account:u", JSON.stringify({ balance: 12345, bonus: 0 }));
  await x.wallet.ensureWallet("u");
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 12345);
  assert.ok(!x.store.has("wallet:bonus:u"));
  await x.actions.submitRecharge(form());
  const key = "wallet:recharge:u:ABC12345";
  const r = JSON.parse(x.store.get(key));
  r.userId = "v";
  x.store.set(key, JSON.stringify(r));
  x.setSession("a");
  await assert.rejects(x.actions.reviewRecharge(key, true));
  assert.ok(!x.store.has("wallet:account:v"));
});

test("source ledger integrates debit/recharge, preserves funds and prevents duplicate operation", async () => {
  const x = setup();
  await x.actions.purchaseQuestions(["m"], 20);
  let wallet = JSON.parse(x.store.get("wallet:account:u"));
  assert.equal(wallet.version, 2);
  assert.equal(wallet.funds.bonus, 1980);
  await x.actions.submitRecharge(form());
  x.setSession("a");
  await x.actions.reviewRecharge("wallet:recharge:u:ABC12345", true);
  wallet = JSON.parse(x.store.get("wallet:account:u"));
  assert.equal(wallet.funds.recharge, 2000);
  assert.equal(wallet.funds.earnings, 0);
  const input = {
    operationId: "test:credit",
    amount: 100,
    direction: "CREDIT",
    source: "earnings",
    description: "Test seller credit",
  };
  await x.wallet.walletTransaction((tx) =>
    x.wallet.changeWalletFunds(tx, "u", input),
  );
  await x.wallet.walletTransaction((tx) =>
    x.wallet.changeWalletFunds(tx, "u", input),
  );
  wallet = JSON.parse(x.store.get("wallet:account:u"));
  assert.equal(wallet.funds.earnings, 100);
  await assert.rejects(
    x.wallet.walletTransaction((tx) =>
      x.wallet.changeWalletFunds(tx, "u", { ...input, amount: 200 }),
    ),
  );
  assert.equal(
    [...x.store.keys()].filter((k) => k.startsWith("wallet:history:v1:u:"))
      .length,
    3,
  );
});
function transferForm(tid, amount = "10") {
  const f = new FormData();
  f.set("tid", tid);
  f.set("amount", amount);
  return f;
}
async function transferSetup() {
  const x = setup();
  await x.wallet.ensureWallet("u");
  await x.wallet.ensureWallet("v");
  await x.actions.submitRecharge(form("100"));
  x.setSession("a");
  await x.actions.reviewRecharge("wallet:recharge:u:ABC12345", true);
  x.setSession("u");
  return x;
}
test("TID Send Money requires preview/confirmation and credits nonwithdrawable received funds once", async () => {
  const x = await transferSetup();
  const quote = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("v")),
  );
  assert.equal(quote.ok, true);
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 12000);
  const f = new FormData();
  f.set("quoteId", quote.quoteId);
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, false);
  f.set("confirmed", "on");
  const results = await Promise.all([
    x.transfers.confirmWalletTransfer({}, f),
    x.transfers.confirmWalletTransfer({}, f),
  ]);
  assert.ok(results.every((r) => r.ok));
  const from = JSON.parse(x.store.get("wallet:account:u")),
    to = JSON.parse(x.store.get("wallet:account:v"));
  assert.equal(from.balance, 11000);
  assert.equal(from.funds.bonus, 2000);
  assert.equal(to.balance, 3000);
  assert.equal(to.funds.received, 1000);
  assert.equal(to.funds.earnings, 0);
});
test("bonus-only, self, invalid, expired, cross-user and unauthenticated transfers cannot debit", async () => {
  const x = setup();
  await x.wallet.ensureWallet("u");
  await x.wallet.ensureWallet("v");
  assert.equal(
    (
      await x.transfers.prepareWalletTransfer(
        {},
        transferForm(x.wallet.teacherTid("v")),
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await x.transfers.prepareWalletTransfer(
        {},
        transferForm(x.wallet.teacherTid("u")),
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await x.transfers.prepareWalletTransfer(
        {},
        transferForm("QB-" + "F".repeat(20)),
      )
    ).ok,
    false,
  );
  const y = await transferSetup();
  const q = await y.transfers.prepareWalletTransfer(
    {},
    transferForm(y.wallet.teacherTid("v")),
  );
  const f = new FormData();
  f.set("quoteId", q.quoteId);
  f.set("confirmed", "on");
  y.setSession("v");
  assert.equal((await y.transfers.confirmWalletTransfer({}, f)).ok, false);
  y.setSession("u");
  const key = `wallet:transfer-quote:v1:u:${q.quoteId}`,
    r = JSON.parse(y.store.get(key));
  r.expiresAt = 0;
  y.store.set(key, JSON.stringify(r));
  assert.equal((await y.transfers.confirmWalletTransfer({}, f)).ok, false);
  y.setSession(null);
  assert.equal(
    (
      await y.transfers.prepareWalletTransfer(
        {},
        transferForm(y.wallet.teacherTid("v")),
      )
    ).ok,
    false,
  );
  assert.equal(JSON.parse(y.store.get("wallet:account:u")).balance, 12000);
});
test("transfer failure rolls back both wallets, source ledger and confirmation; retry succeeds", async () => {
  const x = await transferSetup();
  const quote = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("v")),
  );
  const f = new FormData();
  f.set("quoteId", quote.quoteId);
  f.set("confirmed", "on");
  const before = new Map(x.store);
  x.setFail("wallet:account:v");
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, false);
  assert.deepEqual(x.store, before);
  x.setFail("");
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, true);
});
test("daily Send Money cap and lookup quota are enforced on server", async () => {
  const x = setup();
  await x.wallet.ensureWallet("u");
  await x.wallet.ensureWallet("v");
  await x.actions.submitRecharge(form("10000"));
  x.setSession("a");
  await x.actions.reviewRecharge("wallet:recharge:u:ABC12345", true);
  x.setSession("u");
  const q = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("v"), "5000"),
  );
  assert.equal(q.ok, true);
  const f = new FormData();
  f.set("quoteId", q.quoteId);
  f.set("confirmed", "on");
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, true);
  const q2 = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("v"), "1"),
  );
  f.set("quoteId", q2.quoteId);
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, false);
  assert.equal(JSON.parse(x.store.get("wallet:account:u")).balance, 502000);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  x.store.set(`wallet:transfer-lookups:v1:u:${day}`, "30");
  assert.equal(
    (
      await x.transfers.prepareWalletTransfer(
        {},
        transferForm(x.wallet.teacherTid("v"), "1"),
      )
    ).ok,
    false,
  );
});
test("received transfer can be sent again but never becomes earnings", async () => {
  const x = await transferSetup();
  const q = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("v")),
  );
  const f = new FormData();
  f.set("quoteId", q.quoteId);
  f.set("confirmed", "on");
  await x.transfers.confirmWalletTransfer({}, f);
  x.setSession("v");
  const back = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("u")),
  );
  f.set("quoteId", back.quoteId);
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, true);
  const wallet = JSON.parse(x.store.get("wallet:account:u"));
  assert.equal(wallet.funds.received, 1000);
  assert.equal(wallet.funds.earnings, 0);
});
