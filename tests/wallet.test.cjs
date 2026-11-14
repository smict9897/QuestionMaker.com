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
      b: { id: "b", role: "ADMIN" },
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
                    : id.startsWith("@/lib/")
                      ? load(id.replace("@/", "") + ".ts")
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
    limits: load("lib/wallet-limits.ts"),
    limitsActions: load("app/actions/wallet-limits.ts"),
    actions: load("app/actions/wallet.ts"),
    transfers: load("app/actions/wallet-transfer.ts"),
    withdrawals: load("app/actions/wallet-withdrawal.ts"),
    handovers: load("app/actions/withdrawal-handover.ts"),
    setRole: (id, role) => {
      users[id].role = role;
    },
    purchases: load("app/actions/marketplace-purchase.ts"),
    disputes: load("app/actions/marketplace-refund.ts"),
    refundReadiness: load("app/actions/refund-readiness.ts"),
    refunds: load("lib/marketplace-refund.ts"),
    market: load("lib/marketplace.ts"),
    commerce: load("lib/marketplace-purchase.ts"),
    builder: load("lib/paper-builder.ts"),
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
function withdrawForm(
  id = "11111111-1111-1111-1111-111111111111",
  amount = "100",
) {
  const f = new FormData();
  f.set("requestId", id);
  f.set("amount", amount);
  f.set("number", "01712345678");
  f.set("confirmed", "on");
  return f;
}
async function withdrawalSetup() {
  const x = setup();
  await x.wallet.ensureWallet("u");
  x.store.set(
    "wallet:account:u",
    JSON.stringify({
      version: 2,
      balance: 52000,
      bonus: 2000,
      funds: { bonus: 2000, recharge: 10000, received: 10000, earnings: 30000 },
    }),
  );
  return x;
}
function withdrawalReview(key, decision = "REJECTED", trx = "PAYOUT123") {
  const f = new FormData();
  f.set("key", key);
  f.set("decision", decision);
  f.set("note", "verified cancellation");
  f.set("trx", trx);
  f.set("paidConfirmed", "on");
  return f;
}
test("withdrawal holds earnings only, duplicate request debits once and active request blocks another", async () => {
  const x = await withdrawalSetup(),
    f = withdrawForm();
  const result = await Promise.all(
    Array.from({ length: 8 }, () => x.withdrawals.requestWithdrawal({}, f)),
  );
  assert.ok(result.every((r) => r.ok));
  const w = await x.wallet.ensureWallet("u");
  assert.equal(w.balance, 42000);
  assert.deepEqual(w.funds, {
    bonus: 2000,
    recharge: 10000,
    received: 10000,
    earnings: 20000,
  });
  assert.equal(
    (
      await x.withdrawals.requestWithdrawal(
        {},
        withdrawForm("22222222-2222-2222-2222-222222222222"),
      )
    ).ok,
    false,
  );
  f.set("amount", "101");
  assert.equal((await x.withdrawals.requestWithdrawal({}, f)).ok, false);
});
test("withdrawal rejects non earnings, below minimum, invalid number, missing consent, unauthenticated and admin", async () => {
  const x = setup();
  await x.wallet.ensureWallet("u");
  assert.equal(
    (await x.withdrawals.requestWithdrawal({}, withdrawForm())).ok,
    false,
  );
  const y = await withdrawalSetup();
  for (const [key, value] of [
    ["amount", "99.99"],
    ["number", "01212345678"],
    ["confirmed", ""],
    ["amount", "NaN"],
    ["amount", "50001"],
  ]) {
    const f = withdrawForm();
    f.set(key, value);
    assert.equal((await y.withdrawals.requestWithdrawal({}, f)).ok, false);
  }
  y.setSession("");
  assert.equal(
    (await y.withdrawals.requestWithdrawal({}, withdrawForm())).ok,
    false,
  );
  y.setSession("a");
  assert.equal(
    (await y.withdrawals.requestWithdrawal({}, withdrawForm())).ok,
    false,
  );
});
test("withdrawal reject releases earnings once; nonadmin cannot review; paid after rejection blocked", async () => {
  const x = await withdrawalSetup();
  await x.withdrawals.requestWithdrawal({}, withdrawForm());
  const key = [...x.store.keys()].find((k) =>
      k.startsWith("wallet:withdrawal:v1:"),
    ),
    f = withdrawalReview(key);
  assert.equal((await x.withdrawals.reviewWithdrawal({}, f)).ok, false);
  x.setSession("a");
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    true,
  );
  const result = await Promise.all(
    Array.from({ length: 5 }, () => x.withdrawals.reviewWithdrawal({}, f)),
  );
  assert.ok(result.every((r) => r.ok));
  assert.equal((await x.wallet.ensureWallet("u")).funds.earnings, 30000);
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key, "PAID")))
      .ok,
    false,
  );
});
test("paid withdrawal requires actual payment confirmation and unique TrxID, no second wallet debit", async () => {
  const x = await withdrawalSetup();
  await x.withdrawals.requestWithdrawal({}, withdrawForm());
  const key = [...x.store.keys()].find((k) =>
      k.startsWith("wallet:withdrawal:v1:"),
    ),
    f = withdrawalReview(key, "PAID");
  x.setSession("a");
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    true,
  );
  f.delete("paidConfirmed");
  assert.equal((await x.withdrawals.reviewWithdrawal({}, f)).ok, false);
  f.set("paidConfirmed", "on");
  assert.equal((await x.withdrawals.reviewWithdrawal({}, f)).ok, true);
  assert.equal((await x.withdrawals.reviewWithdrawal({}, f)).ok, true);
  assert.equal((await x.wallet.ensureWallet("u")).balance, 42000);
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key))).ok,
    false,
  );
  x.setSession("u");
  await x.withdrawals.requestWithdrawal(
    {},
    withdrawForm("22222222-2222-2222-2222-222222222222"),
  );
  x.setSession("a");
  const key2 = [...x.store.keys()]
    .filter((k) => k.startsWith("wallet:withdrawal:v1:"))
    .find((k) => k !== key);
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key2))).ok,
    true,
  );
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key2, "PAID")))
      .ok,
    false,
  );
  assert.equal(JSON.parse(x.store.get(key2)).status, "HELD");
});
test("withdrawal record write failure rolls back earnings hold; rejection history failure preserves hold", async () => {
  const x = await withdrawalSetup();
  const before = new Map(x.store);
  x.setFail("wallet:withdrawal:v1:");
  assert.equal(
    (await x.withdrawals.requestWithdrawal({}, withdrawForm())).ok,
    false,
  );
  assert.deepEqual(x.store, before);
  x.setFail("");
  await x.withdrawals.requestWithdrawal({}, withdrawForm());
  const key = [...x.store.keys()].find((k) =>
    k.startsWith("wallet:withdrawal:v1:"),
  );
  x.setSession("a");
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    true,
  );
  const held = new Map(x.store);
  x.setFail("wallet:history:v1:");
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key))).ok,
    false,
  );
  assert.deepEqual(x.store, held);
});
async function marketSetup() {
  const x = setup();
  await x.wallet.ensureWallet("u");
  await x.wallet.ensureWallet("v");
  const id = "f".repeat(64),
    snapshot = {
      settings: x.builder.settingsSchema.parse({}),
      questions: [
        {
          id: "m",
          text: "Approved paper question",
          correct: "A",
          options: { A: "a", B: "b", C: "c", D: "d" },
        },
      ],
    };
  const r = {
    version: 1,
    id,
    ownerId: "v",
    sourceKey: "qbpaper:v:own",
    source: "DATABASE",
    status: "APPROVED",
    revision: 1,
    metadata: {
      examType: "বার্ষিক পরীক্ষা",
      title: "Approved paper",
      grade: "6",
      subject: "বাংলা",
      chapters: ["Chapter"],
      description: "Detailed description",
      pricePaisa: 1001,
      rights: true,
    },
    snapshot,
    snapshotHash: x.market.snapshotHash(snapshot),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  x.store.set("market:submission:v1:" + id, JSON.stringify(r));
  const f = new FormData();
  f.set("paperId", id);
  f.set("terms", x.commerce.purchaseTerms(r));
  f.set("confirmed", "on");
  return { ...x, id, r, f };
}
test("market purchase atomically splits 60/40 and stores immutable copy; concurrent retries charge once", async () => {
  const x = await marketSetup();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => x.purchases.buyMarketPaper({}, x.f)),
  );
  assert.ok(
    results.every((r) => r.ok),
    JSON.stringify(results),
  );
  assert.equal((await x.wallet.ensureWallet("u")).balance, 999);
  assert.equal((await x.wallet.ensureWallet("v")).funds.earnings, 600);
  const r = JSON.parse(x.store.get(x.commerce.purchaseKey("u", x.id)));
  assert.equal(r.platformAmount, 401);
  assert.deepEqual(r.snapshot, x.r.snapshot);
  x.store.delete("market:submission:v1:" + x.id);
  assert.equal((await x.purchases.buyMarketPaper({}, x.f)).ok, true);
  assert.equal((await x.wallet.ensureWallet("u")).balance, 999);
});
test("market purchase rejects unauthenticated, self, admin, unapproved, modified terms and snapshot", async () => {
  for (const scenario of [
    "anonymous",
    "self",
    "admin",
    "pending",
    "terms",
    "hash",
    "poor",
  ]) {
    const x = await marketSetup();
    if (scenario === "anonymous") x.setSession("");
    if (scenario === "self") x.setSession("v");
    if (scenario === "admin") x.setSession("a");
    if (scenario === "pending") {
      x.r.status = "PENDING";
      x.store.set("market:submission:v1:" + x.id, JSON.stringify(x.r));
    }
    if (scenario === "terms") {
      x.r.metadata.pricePaisa = 1000;
      x.store.set("market:submission:v1:" + x.id, JSON.stringify(x.r));
    }
    if (scenario === "hash") {
      x.r.snapshot.questions[0].text = "changed";
      x.store.set("market:submission:v1:" + x.id, JSON.stringify(x.r));
    }
    if (scenario === "poor")
      x.store.set(
        "wallet:account:u",
        JSON.stringify({ balance: 0, bonus: 2000 }),
      );
    const before = new Map(x.store);
    assert.equal(
      (await x.purchases.buyMarketPaper({}, x.f)).ok,
      false,
      scenario,
    );
    assert.deepEqual(x.store, before, scenario);
  }
});
test("market purchase seller/history/platform failure rolls back buyer debit and seller earnings", async () => {
  for (const fail of [
    "wallet:account:v",
    "wallet:history:v1:v:",
    "market:purchase:v1:",
    "market:platform:v1:",
  ]) {
    const x = await marketSetup();
    const before = new Map(x.store);
    x.setFail(fail);
    assert.equal((await x.purchases.buyMarketPaper({}, x.f)).ok, false);
    assert.deepEqual(x.store, before, fail);
    x.setFail("");
    assert.equal((await x.purchases.buyMarketPaper({}, x.f)).ok, true);
  }
});
test("buyer can change institution only, not questions/price/owner; another user cannot edit copy", async () => {
  const x = await marketSetup();
  await x.purchases.buyMarketPaper({}, x.f);
  const key = x.commerce.purchaseKey("u", x.id),
    before = JSON.parse(x.store.get(key));
  const f = new FormData();
  f.set("paperId", x.id);
  f.set("institution", "আমার বিদ্যালয়");
  f.set("snapshot", "forged");
  f.set("amount", "0");
  assert.equal((await x.purchases.savePurchasedInstitution({}, f)).ok, true);
  assert.deepEqual(JSON.parse(x.store.get(key)), {
    ...before,
    institution: "আমার বিদ্যালয়",
  });
  x.setSession("v");
  assert.equal((await x.purchases.savePurchasedInstitution({}, f)).ok, false);
  x.setSession("u");
  f.set("institution", "two\nlines");
  assert.equal((await x.purchases.savePurchasedInstitution({}, f)).ok, false);
});
test("revenue split conserves each paisa and disallows invalid prices", () => {
  const x = setup();
  for (const amount of [100, 101, 1001, 5000000]) {
    const s = x.commerce.revenueSplit(amount);
    assert.equal(s.sellerAmount + s.platformAmount, amount);
    assert.equal(s.sellerAmount, Math.floor(amount * 0.6));
  }
  for (const n of [0, -1, 100.5, NaN, 5000001])
    assert.throws(() => x.commerce.revenueSplit(n));
});
function complaintForm(id) {
  const f = new FormData();
  f.set("paperId", id);
  f.set("reason", "The purchased paper has incorrect questions.");
  f.set("confirmed", "on");
  return f;
}
function disputeReview(x, decision = "REFUNDED") {
  const f = new FormData();
  f.set("key", x.refunds.disputeKey("u", x.id));
  f.set("decision", decision);
  f.set("note", "Verified the issue against the purchased snapshot.");
  f.set("confirmed", "on");
  return f;
}
async function disputeSetup() {
  const x = await marketSetup();
  const result = await x.purchases.buyMarketPaper({}, x.f);
  assert.equal(result.ok, true);
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    true,
  );
  return x;
}
test("refund restores exact bonus/recharge/received/earnings sources and reverses seller earnings once", async () => {
  const x = await marketSetup();
  x.store.set(
    "wallet:account:u",
    JSON.stringify({
      version: 2,
      balance: 1001,
      bonus: 2000,
      funds: { bonus: 200, recharge: 300, received: 400, earnings: 101 },
    }),
  );
  assert.equal((await x.purchases.buyMarketPaper({}, x.f)).ok, true);
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    true,
  );
  x.setSession("a");
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      x.disputes.reviewMarketDispute({}, disputeReview(x)),
    ),
  );
  assert.ok(
    results.every((r) => r.ok),
    JSON.stringify(results),
  );
  assert.deepEqual((await x.wallet.ensureWallet("u")).funds, {
    bonus: 200,
    recharge: 300,
    received: 400,
    earnings: 101,
  });
  assert.equal((await x.wallet.ensureWallet("v")).funds.earnings, 0);
  const raw = x.store.get(x.commerce.purchaseKey("u", x.id));
  assert.throws(() => x.commerce.validatePurchase(raw, "u", x.id));
  assert.ok(x.commerce.validatePurchase(raw, "u", x.id, true).refundedAt);
  assert.equal(
    JSON.parse(x.store.get(`market:refund:v1:u:${x.id}`)).platformAmount,
    401,
  );
  x.setSession("u");
  assert.equal((await x.purchases.buyMarketPaper({}, x.f)).ok, false);
  const edit = new FormData();
  edit.set("paperId", x.id);
  edit.set("institution", "New School");
  assert.equal(
    (await x.purchases.savePurchasedInstitution({}, edit)).ok,
    false,
  );
});
test("only actual buyer may complain; admin required for review; explicit refund consent and reason", async () => {
  const x = await marketSetup();
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    false,
  );
  await x.purchases.buyMarketPaper({}, x.f);
  x.setSession("v");
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    false,
  );
  x.setSession("");
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    false,
  );
  x.setSession("u");
  const f = complaintForm(x.id);
  f.set("reason", "short");
  assert.equal((await x.disputes.reportMarketPurchase({}, f)).ok, false);
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    true,
  );
  assert.equal(
    (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
    false,
  );
  x.setSession("a");
  const r = disputeReview(x);
  r.delete("confirmed");
  assert.equal((await x.disputes.reviewMarketDispute({}, r)).ok, false);
  r.set("confirmed", "on");
  r.set("note", "");
  assert.equal((await x.disputes.reviewMarketDispute({}, r)).ok, false);
});
test("insufficient seller earnings or original source/platform mismatch blocks refund without taking other funds", async () => {
  for (const scenario of ["earnings", "ledger", "platform"]) {
    const x = await disputeSetup();
    if (scenario === "earnings")
      x.store.set(
        "wallet:account:v",
        JSON.stringify({
          version: 2,
          balance: 2600,
          bonus: 2000,
          funds: { bonus: 2000, recharge: 600, received: 0, earnings: 0 },
        }),
      );
    if (scenario === "ledger") {
      const key = x.refunds.marketDebitKey("u", x.id),
        r = JSON.parse(x.store.get(key));
      r.used = { bonus: 0, recharge: 1000, earnings: 0, received: 0 };
      x.store.set(key, JSON.stringify(r));
    }
    if (scenario === "platform") {
      const key = `market:platform:v1:u:${x.id}`,
        r = JSON.parse(x.store.get(key));
      r.sellerId = "wrong";
      x.store.set(key, JSON.stringify(r));
    }
    const before = new Map(x.store);
    x.setSession("a");
    assert.equal(
      (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
      false,
      scenario,
    );
    assert.deepEqual(x.store, before);
  }
});
test("refund receipt/copy/history/complaint failures roll back all money and access changes", async () => {
  for (const failure of [
    "market:refund:v1:",
    "market:purchase:v1:",
    "wallet:history:v1:u:",
    "market:dispute:v1:",
  ]) {
    const x = await disputeSetup(),
      before = new Map(x.store);
    x.setSession("a");
    x.setFail(failure);
    assert.equal(
      (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
      false,
      failure,
    );
    assert.deepEqual(x.store, before, failure);
    x.setFail("");
    assert.equal(
      (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
      true,
    );
  }
});
test("rejected complaint changes no balances and cannot later be refunded or overwritten", async () => {
  const x = await disputeSetup(),
    before = (await x.wallet.ensureWallet("u")).balance;
  x.setSession("a");
  assert.equal(
    (await x.disputes.reviewMarketDispute({}, disputeReview(x, "REJECTED"))).ok,
    true,
  );
  assert.equal(
    (await x.disputes.reviewMarketDispute({}, disputeReview(x, "REJECTED"))).ok,
    true,
  );
  assert.equal((await x.wallet.ensureWallet("u")).balance, before);
  assert.equal(
    (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
    false,
  );
  x.setSession("u");
  assert.equal(
    (await x.disputes.reportMarketPurchase({}, complaintForm(x.id))).ok,
    true,
  );
  assert.equal(
    JSON.parse(x.store.get(x.refunds.disputeKey("u", x.id))).status,
    "REJECTED",
  );
});
test("refund access checks apply to private paper and institution mutation, with complaint audit kept", () => {
  const page = fs.readFileSync("app/dashboard/library/[id]/page.tsx", "utf8"),
    action = fs.readFileSync("app/actions/marketplace-purchase.ts", "utf8"),
    helper = fs.readFileSync("lib/marketplace-purchase.ts", "utf8");
  assert.match(page, /validatePurchase\(row.value, buyerId, id\)/);
  assert.match(action, /validatePurchase\(row.value, buyerId, id\)/);
  assert.match(helper, /!includeRefunded && r.refundedAt !== undefined/);
});

function claimForm(key) {
  const f = new FormData();
  f.set("key", key);
  f.set("claimConfirmed", "on");
  return f;
}
test("withdrawal cannot settle before claim; other admin cannot steal or settle even with forged form", async () => {
  const x = await withdrawalSetup();
  await x.withdrawals.requestWithdrawal({}, withdrawForm());
  const key = [...x.store.keys()].find((k) =>
    k.startsWith("wallet:withdrawal:v1:"),
  );
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    false,
  );
  x.setSession("");
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    false,
  );
  x.setSession("a");
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key, "PAID")))
      .ok,
    false,
  );
  const missing = claimForm(key);
  missing.delete("claimConfirmed");
  assert.equal((await x.withdrawals.claimWithdrawal({}, missing)).ok, false);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      x.withdrawals.claimWithdrawal({}, claimForm(key)),
    ),
  );
  assert.ok(results.every((r) => r.ok));
  const r = JSON.parse(x.store.get(key));
  assert.equal(r.claimedBy, "a");
  assert.equal(
    [...x.store.keys()].filter((k) =>
      k.startsWith("wallet:withdrawal-claim:v1:"),
    ).length,
    1,
  );
  const before = new Map(x.store);
  x.setSession("b");
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    false,
  );
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key, "PAID")))
      .ok,
    false,
  );
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key))).ok,
    false,
  );
  assert.deepEqual(x.store, before);
  x.setSession("a");
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key, "PAID")))
      .ok,
    true,
  );
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    false,
  );
});
test("claim record write or request write failure rolls back ownership and audit; claims do not expire", async () => {
  for (const fail of ["wallet:withdrawal-claim:v1:", "wallet:withdrawal:v1:"]) {
    const x = await withdrawalSetup();
    await x.withdrawals.requestWithdrawal({}, withdrawForm());
    const key = [...x.store.keys()].find((k) =>
        k.startsWith("wallet:withdrawal:v1:"),
      ),
      before = new Map(x.store);
    x.setSession("a");
    x.setFail(fail);
    assert.equal(
      (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
      false,
    );
    assert.deepEqual(x.store, before);
    x.setFail("");
    assert.equal(
      (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
      true,
    );
    const r = JSON.parse(x.store.get(key));
    r.claimedAt = "2020-01-01T00:00:00.000Z";
    x.store.set(key, JSON.stringify(r));
    x.setSession("b");
    assert.equal(
      (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
      false,
    );
  }
});
test("claim audit mismatch or removed hold blocks payment recording without changing money", async () => {
  for (const scenario of ["audit", "hold", "invalid"]) {
    const x = await withdrawalSetup();
    await x.withdrawals.requestWithdrawal({}, withdrawForm());
    const key = [...x.store.keys()].find((k) =>
      k.startsWith("wallet:withdrawal:v1:"),
    );
    x.setSession("a");
    assert.equal(
      (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
      true,
    );
    if (scenario === "audit") {
      const audit = [...x.store.keys()].find((k) =>
        k.startsWith("wallet:withdrawal-claim:v1:"),
      );
      x.store.delete(audit);
    }
    if (scenario === "hold") x.store.set("wallet:withdrawal-active:v1:u", "");
    if (scenario === "invalid") {
      const r = JSON.parse(x.store.get(key));
      r.amount = 999999999;
      x.store.set(key, JSON.stringify(r));
    }
    const before = new Map(x.store);
    assert.equal(
      (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key, "PAID")))
        .ok,
      false,
    );
    assert.deepEqual(x.store, before);
  }
});
function limitsForm(
  revision = "0",
  transfer = "5000",
  withdraw = "50000",
  lookups = "30",
) {
  const f = new FormData();
  f.set("revision", revision);
  f.set("transferDaily", transfer);
  f.set("withdrawalMax", withdraw);
  f.set("recipientLookups", lookups);
  f.set("note", "Verified conservative financial operating limits.");
  f.set("confirmed", "on");
  return f;
}
test("wallet limits defaults preserve old behavior and reject malformed persisted configs", () => {
  const x = setup();
  assert.deepEqual(
    x.limits.parseWalletLimits(null),
    x.limits.DEFAULT_WALLET_LIMITS,
  );
  for (const raw of [
    "{}",
    "null",
    "broken",
    JSON.stringify({
      ...x.limits.DEFAULT_WALLET_LIMITS,
      revision: 1,
      updatedBy: "a",
      updatedAt: new Date().toISOString(),
      transferDaily: 0,
    }),
    JSON.stringify({
      ...x.limits.DEFAULT_WALLET_LIMITS,
      revision: 1,
      updatedBy: "a",
      updatedAt: new Date().toISOString(),
      withdrawalMax: 9999,
    }),
  ])
    assert.throws(() => x.limits.parseWalletLimits(raw));
  for (const raw of ["-1", "1e3", "NaN", "100.001", "50001"])
    assert.throws(() => x.limits.limitMoney(raw, 100, 5000000));
});
test("only fresh admin with consent and valid inputs may configure hard-bounded limits", async () => {
  const x = setup();
  assert.equal(
    (await x.limitsActions.updateWalletLimits({}, limitsForm())).ok,
    false,
  );
  x.setSession("");
  assert.equal(
    (await x.limitsActions.updateWalletLimits({}, limitsForm())).ok,
    false,
  );
  x.setSession("a");
  for (const [key, value] of [
    ["confirmed", ""],
    ["withdrawalMax", "99.99"],
    ["transferDaily", "50001"],
    ["recipientLookups", "101"],
    ["recipientLookups", "1.5"],
    ["revision", "NaN"],
    ["note", "short"],
  ]) {
    const f = limitsForm();
    f.set(key, value);
    assert.equal(
      (await x.limitsActions.updateWalletLimits({}, f)).ok,
      false,
      key,
    );
  }
  assert.equal(x.store.size, 0);
  assert.equal(
    (await x.limitsActions.updateWalletLimits({}, limitsForm())).ok,
    true,
  );
  assert.equal(
    x.limits.parseWalletLimits(x.store.get(x.limits.WALLET_LIMITS_KEY))
      .revision,
    1,
  );
});
test("concurrent limit edits accept one revision and preserve immutable before/after audit", async () => {
  const x = setup();
  x.setSession("a");
  const result = await Promise.all(
    Array.from({ length: 8 }, () =>
      x.limitsActions.updateWalletLimits(
        {},
        limitsForm("0", "1000", "500", "5"),
      ),
    ),
  );
  assert.equal(result.filter((r) => r.ok).length, 1);
  const key = "wallet:limits-audit:v1:000000000001",
    audit = JSON.parse(x.store.get(key));
  assert.equal(audit.before.revision, 0);
  assert.equal(audit.after.transferDaily, 100000);
  assert.equal(audit.after.updatedBy, "a");
  x.setSession("b");
  assert.equal(
    (
      await x.limitsActions.updateWalletLimits(
        {},
        limitsForm("1", "2000", "1000", "10"),
      )
    ).ok,
    true,
  );
  assert.equal(x.store.get(key), JSON.stringify(audit));
  assert.equal(
    JSON.parse(x.store.get("wallet:limits-audit:v1:000000000002")).after
      .updatedBy,
    "b",
  );
});
test("limit audit or config write failure rolls back both records", async () => {
  for (const failure of ["wallet:limits-audit:v1:", "wallet:limits:v1"]) {
    const x = setup();
    x.setSession("a");
    const before = new Map(x.store);
    x.setFail(failure);
    assert.equal(
      (await x.limitsActions.updateWalletLimits({}, limitsForm())).ok,
      false,
    );
    assert.deepEqual(x.store, before);
  }
});
test("latest lower Send Money limit blocks existing quote; daily lookup reduction does not reset usage", async () => {
  const x = await transferSetup();
  const q = await x.transfers.prepareWalletTransfer(
    {},
    transferForm(x.wallet.teacherTid("v"), "10"),
  );
  assert.equal(q.ok, true);
  x.setSession("a");
  assert.equal(
    (
      await x.limitsActions.updateWalletLimits(
        {},
        limitsForm("0", "5", "100", "1"),
      )
    ).ok,
    true,
  );
  x.setSession("u");
  const before = new Map(x.store),
    f = new FormData();
  f.set("quoteId", q.quoteId);
  f.set("confirmed", "on");
  assert.equal((await x.transfers.confirmWalletTransfer({}, f)).ok, false);
  assert.deepEqual(x.store, before);
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
test("new withdrawal maximum is enforced, existing hold remains settleable after reduction", async () => {
  const x = await withdrawalSetup();
  assert.equal(
    (await x.withdrawals.requestWithdrawal({}, withdrawForm(undefined, "200")))
      .ok,
    true,
  );
  const key = [...x.store.keys()].find((k) =>
    k.startsWith("wallet:withdrawal:v1:"),
  );
  x.setSession("a");
  assert.equal(
    (
      await x.limitsActions.updateWalletLimits(
        {},
        limitsForm("0", "5000", "100", "30"),
      )
    ).ok,
    true,
  );
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    true,
  );
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(key))).ok,
    true,
  );
  x.setSession("u");
  assert.equal(
    (
      await x.withdrawals.requestWithdrawal(
        {},
        withdrawForm("22222222-2222-2222-2222-222222222222", "200"),
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await x.withdrawals.requestWithdrawal(
        {},
        withdrawForm("22222222-2222-2222-2222-222222222222", "100"),
      )
    ).ok,
    true,
  );
});
test("corrupt limits fail closed for new financial requests without touching wallets", async () => {
  const x = await transferSetup();
  x.store.set(x.limits.WALLET_LIMITS_KEY, "broken");
  const before = new Map(x.store);
  assert.equal(
    (
      await x.transfers.prepareWalletTransfer(
        {},
        transferForm(x.wallet.teacherTid("v"), "1"),
      )
    ).ok,
    false,
  );
  assert.deepEqual(x.store, before);
  const y = await withdrawalSetup();
  y.store.set(y.limits.WALLET_LIMITS_KEY, "{}");
  const old = new Map(y.store);
  assert.equal(
    (await y.withdrawals.requestWithdrawal({}, withdrawForm())).ok,
    false,
  );
  assert.deepEqual(y.store, old);
});

async function handoverSetup() {
  const x = await withdrawalSetup();
  await x.withdrawals.requestWithdrawal({}, withdrawForm());
  const key = [...x.store.keys()].find((k) =>
    k.startsWith("wallet:withdrawal:v1:"),
  );
  x.setSession("a");
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(key))).ok,
    true,
  );
  return {
    ...x,
    key,
    pointer: key.replace(
      "wallet:withdrawal:v1:",
      "wallet:withdrawal-handover:v1:",
    ),
  };
}
function handoverForm(x, mode = "OFFER", patch = {}) {
  const f = new FormData(),
    r = JSON.parse(x.store.get(x.key)),
    p = x.store.has(x.pointer) ? JSON.parse(x.store.get(x.pointer)) : null;
  for (const [k, v] of Object.entries({
    key: x.key,
    mode,
    to: "b",
    note: "Payment stopped and external statement checked",
    claimedAt: r.claimedAt,
    claimHandoverId: r.handoverId || "",
    handoverId: p?.id || "",
    confirmed: "on",
    ...patch,
  }))
    f.set(k, v);
  return f;
}
test("two-party handover freezes settlement until acceptance, updates claim and keeps immutable audit without changing funds", async () => {
  const x = await handoverSetup(),
    before = x.store.get("wallet:account:u");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x))).ok,
    true,
  );
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(x.key, "PAID")))
      .ok,
    false,
  );
  assert.equal(
    (await x.withdrawals.claimWithdrawal({}, claimForm(x.key))).ok,
    false,
  );
  x.setSession("b");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "ACCEPT")))
      .ok,
    true,
  );
  const r = JSON.parse(x.store.get(x.key));
  assert.equal(r.claimedBy, "b");
  assert.equal(r.handoverId, JSON.parse(x.store.get(x.pointer)).id);
  assert.equal(x.store.get("wallet:account:u"), before);
  assert.equal(
    [...x.store.keys()].filter((k) =>
      k.startsWith("wallet:withdrawal-handover-audit:"),
    ).length,
    2,
  );
  // A stale pre-handover form cannot settle even when actor now owns the claim.
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(x.key, "PAID")))
      .ok,
    false,
  );
  const review = withdrawalReview(x.key, "PAID");
  review.set("handoverId", r.handoverId);
  assert.equal((await x.withdrawals.reviewWithdrawal({}, review)).ok, true);
  x.setSession("a");
  assert.equal((await x.withdrawals.reviewWithdrawal({}, review)).ok, false);
});
test("only current claimant can offer/cancel; only designated fresh ADMIN can accept", async () => {
  const x = await handoverSetup();
  x.setSession("b");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x))).ok,
    false,
  );
  x.setSession("a");
  for (const patch of [
    { to: "a" },
    { to: "v" },
    { to: "unknown" },
    { confirmed: "" },
    { note: "short" },
    { claimedAt: "2020-01-01T00:00:00Z" },
  ])
    assert.equal(
      (
        await x.handovers.manageWithdrawalHandover(
          {},
          handoverForm(x, "OFFER", patch),
        )
      ).ok,
      false,
    );
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x))).ok,
    true,
  );
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "ACCEPT")))
      .ok,
    false,
  );
  x.setSession("b");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "CANCEL")))
      .ok,
    false,
  );
  x.setRole("b", "TEACHER");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "ACCEPT")))
      .ok,
    false,
  );
  x.setSession("a");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "CANCEL")))
      .ok,
    true,
  );
  assert.equal(JSON.parse(x.store.get(x.key)).claimedBy, "a");
  assert.equal(
    (await x.withdrawals.reviewWithdrawal({}, withdrawalReview(x.key))).ok,
    true,
  );
});
test("failed handover audit/claim writes roll back claim, pointer and funds", async () => {
  for (const prefix of [
    "wallet:withdrawal-handover-audit:",
    "wallet:withdrawal-claim:",
    "wallet:withdrawal:v1:",
  ]) {
    const x = await handoverSetup();
    await x.handovers.manageWithdrawalHandover({}, handoverForm(x));
    const before = new Map(x.store);
    x.setSession("b");
    x.setFail(prefix);
    assert.equal(
      (
        await x.handovers.manageWithdrawalHandover(
          {},
          handoverForm(x, "ACCEPT"),
        )
      ).ok,
      false,
    );
    assert.deepEqual(x.store, before);
  }
});
test("stale/cancelled handover and changed hold/claim audit cannot transfer authority", async () => {
  const x = await handoverSetup();
  await x.handovers.manageWithdrawalHandover({}, handoverForm(x));
  const stale = handoverForm(x, "ACCEPT");
  await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "CANCEL"));
  await x.handovers.manageWithdrawalHandover({}, handoverForm(x));
  x.setSession("b");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, stale)).ok,
    false,
  );
  const active = "wallet:withdrawal-active:v1:u";
  x.store.set(active, "");
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "ACCEPT")))
      .ok,
    false,
  );
  x.store.set(active, x.key);
  x.store.set(
    "wallet:withdrawal-claim:v1:u:" + JSON.parse(x.store.get(x.key)).id,
    "{}",
  );
  assert.equal(
    (await x.handovers.manageWithdrawalHandover({}, handoverForm(x, "ACCEPT")))
      .ok,
    false,
  );
});
test("concurrent acceptance commits one transition/audit and no release or duplicate payout", async () => {
  const x = await handoverSetup();
  await x.handovers.manageWithdrawalHandover({}, handoverForm(x));
  x.setSession("b");
  const before = x.store.get("wallet:account:u"),
    f = handoverForm(x, "ACCEPT");
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      x.handovers.manageWithdrawalHandover({}, f),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(x.store.get("wallet:account:u"), before);
  assert.equal(
    [...x.store.keys()].filter((k) => k.endsWith(":ACCEPT")).length,
    1,
  );
});

test("refund readiness is admin-only and read-only; ready state is not a refund", async () => {
  const x = await disputeSetup(),
    f = disputeReview(x),
    before = new Map(x.store);
  assert.equal(
    (await x.refundReadiness.inspectRefundReadiness({}, f)).ok,
    false,
  );
  x.setSession("a");
  const r = await x.refundReadiness.inspectRefundReadiness({}, f);
  assert.equal(r.ok, true);
  assert.equal(r.required, 600);
  assert.equal(r.available, 600);
  assert.equal(r.shortfall, 0);
  assert.deepEqual(x.store, before);
  x.setRole("a", "TEACHER");
  assert.equal(
    (await x.refundReadiness.inspectRefundReadiness({}, f)).ok,
    false,
  );
});
test("refund readiness excludes recharge/bonus/received/held earnings and reports exact shortfall without creating debt", async () => {
  const x = await disputeSetup();
  x.store.set(
    "wallet:account:v",
    JSON.stringify({
      version: 2,
      balance: 30050,
      bonus: 0,
      funds: { bonus: 0, recharge: 10000, received: 20000, earnings: 50 },
    }),
  );
  x.setSession("a");
  const before = new Map(x.store),
    r = await x.refundReadiness.inspectRefundReadiness({}, disputeReview(x));
  assert.equal(r.ok, true);
  assert.equal(r.shortfall, 550);
  assert.equal(r.available, 50);
  assert.deepEqual(x.store, before);
  assert.equal(
    (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
    false,
  );
  assert.deepEqual(x.store, before);
});
test("refund readiness rejects missing/mismatched receipts and source ledger, corrupt wallet and closed complaint", async () => {
  for (const scenario of ["receipt", "ledger", "wallet", "closed"]) {
    const x = await disputeSetup();
    x.setSession("a");
    if (scenario === "receipt") {
      const key = `market:platform:v1:u:${x.id}`,
        r = JSON.parse(x.store.get(key));
      r.sellerId = "wrong";
      x.store.set(key, JSON.stringify(r));
    }
    if (scenario === "ledger")
      x.store.delete(x.refunds.marketDebitKey("u", x.id));
    if (scenario === "wallet") x.store.set("wallet:account:v", "{}");
    if (scenario === "closed")
      await x.disputes.reviewMarketDispute({}, disputeReview(x, "REJECTED"));
    const before = new Map(x.store);
    const r = await x.refundReadiness.inspectRefundReadiness(
      {},
      disputeReview(x),
    );
    assert.equal(r.ok, false);
    assert.equal(r.shortfall, undefined);
    assert.deepEqual(x.store, before);
  }
});
test("an earlier ready result does not bypass financial revalidation after seller earnings change", async () => {
  const x = await disputeSetup();
  x.setSession("a");
  const r = await x.refundReadiness.inspectRefundReadiness(
    {},
    disputeReview(x),
  );
  assert.equal(r.shortfall, 0);
  x.store.set(
    "wallet:account:v",
    JSON.stringify({
      version: 2,
      balance: 2000,
      bonus: 2000,
      funds: { bonus: 2000, recharge: 0, received: 0, earnings: 0 },
    }),
  );
  const before = new Map(x.store);
  assert.equal(
    (await x.disputes.reviewMarketDispute({}, disputeReview(x))).ok,
    false,
  );
  assert.deepEqual(x.store, before);
});
