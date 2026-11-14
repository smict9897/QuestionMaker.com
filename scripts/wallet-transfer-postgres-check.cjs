/** Opt-in: disposable localhost PostgreSQL ONLY. Never reads production DATABASE_URL. */
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  Module = require("node:module"),
  assert = require("node:assert/strict");
(async () => {
  const url = process.env.WALLET_TEST_DATABASE_URL;
  if (
    !url ||
    !/^postgresql:\/\/[^@]+@(localhost|127\.0\.0\.1):5439\//.test(url)
  )
    throw Error("Disposable localhost:5439 WALLET_TEST_DATABASE_URL required");
  if (
    !process.env.WALLET_TEST_CLIENT_PATH ||
    !process.env.WALLET_TEST_ADAPTER_PATH
  )
    throw Error(
      "Explicit local generated Prisma client and adapter paths required",
    );
  const { PrismaClient } = require(process.env.WALLET_TEST_CLIENT_PATH),
    { PrismaPg } = require(process.env.WALLET_TEST_ADAPTER_PATH);
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "User" (id TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT)',
    );
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "Setting" (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
    await db.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_recipient_history_trigger ON "Setting"',
    );
    await db.$executeRawUnsafe('TRUNCATE "User", "Setting"');
    await db.$executeRawUnsafe(
      "INSERT INTO \"User\" VALUES ('u','TEACHER','Sender'),('v','TEACHER','Recipient'),('a','ADMIN','Admin')",
    );
    let session = "u";
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
            ? { auth: async () => (session ? { user: { id: session } } : null) }
            : n === "next/cache"
              ? { revalidatePath() {} }
              : n === "@/lib/paper-generation"
                ? { visibleQuestions: () => ({}) }
                : n.startsWith("@/lib/")
                  ? load(n.replace("@/", "") + ".ts")
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
    const wallet = load("lib/wallet.ts"),
      actions = load("app/actions/wallet.ts"),
      transfers = load("app/actions/wallet-transfer.ts");
    await Promise.all(
      Array.from({ length: 8 }, () => wallet.ensureWallet("u")),
    );
    await wallet.ensureWallet("v");
    assert.equal((await wallet.ensureWallet("u")).balance, 2000);
    const key = "wallet:recharge:u:LOCAL12345";
    await db.setting.create({
      data: {
        key,
        value: JSON.stringify({
          userId: "u",
          amount: 50000,
          trx: "LOCAL12345",
          status: "PENDING",
        }),
      },
    });
    session = "a";
    await actions.reviewRecharge(key, true);
    session = "u";
    assert.equal((await wallet.ensureWallet("u")).funds.recharge, 50000);
    const form = new FormData();
    form.set("tid", wallet.teacherTid("v"));
    form.set("amount", "10");
    const quote = await transfers.prepareWalletTransfer({}, form);
    assert.equal(quote.ok, true);
    const confirm = new FormData();
    confirm.set("quoteId", quote.quoteId);
    confirm.set("confirmed", "on");
    await db.$executeRawUnsafe(
      "CREATE OR REPLACE FUNCTION fail_recipient_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key LIKE 'wallet:history:v1:v:%' THEN RAISE EXCEPTION 'forced recipient history failure'; END IF; RETURN NEW; END; $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER fail_recipient_history_trigger BEFORE INSERT ON "Setting" FOR EACH ROW EXECUTE FUNCTION fail_recipient_history()',
    );
    assert.equal(
      (await transfers.confirmWalletTransfer({}, confirm)).ok,
      false,
    );
    assert.equal((await wallet.ensureWallet("u")).balance, 52000);
    assert.equal((await wallet.ensureWallet("v")).balance, 2000);
    assert.equal(
      await db.setting.count({
        where: { key: { startsWith: "wallet:ledger:v1:v:" } },
      }),
      0,
    );
    await db.$executeRawUnsafe(
      'DROP TRIGGER fail_recipient_history_trigger ON "Setting"',
    );
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        transfers.confirmWalletTransfer({}, confirm),
      ),
    );
    assert.ok(results.every((r) => r.ok));
    const from = await wallet.ensureWallet("u"),
      to = await wallet.ensureWallet("v");
    assert.equal(from.balance, 51000);
    assert.equal(from.funds.bonus, 2000);
    assert.equal(to.balance, 3000);
    assert.equal(to.funds.received, 1000);
    assert.equal(to.funds.earnings, 0);
    assert.equal(
      await db.setting.count({
        where: { key: { startsWith: "wallet:ledger:v1:v:" } },
      }),
      1,
    );
    assert.equal(
      await db.setting.count({
        where: { key: { startsWith: "wallet:history:v1:v:" } },
      }),
      1,
    );
    assert.equal((await transfers.prepareWalletTransfer({}, form)).ok, true);
    session = "v";
    const back = new FormData();
    back.set("tid", wallet.teacherTid("u"));
    back.set("amount", "10");
    const q = await transfers.prepareWalletTransfer({}, back);
    confirm.set("quoteId", q.quoteId);
    assert.equal((await transfers.confirmWalletTransfer({}, confirm)).ok, true);
    assert.equal((await wallet.ensureWallet("u")).funds.received, 1000);
    assert.equal((await wallet.ensureWallet("u")).funds.earnings, 0);
    const withdrawals = load("app/actions/wallet-withdrawal.ts");
    await wallet.walletTransaction((tx) =>
      wallet.changeWalletFunds(tx, "u", {
        operationId: "fixture:earnings",
        amount: 30000,
        direction: "CREDIT",
        source: "earnings",
        description: "Disposable test earnings only",
      }),
    );
    session = "u";
    const wf = new FormData();
    wf.set("requestId", "11111111-1111-1111-1111-111111111111");
    wf.set("number", "01712345678");
    wf.set("amount", "100");
    wf.set("confirmed", "on");
    const beforeHold = (await wallet.ensureWallet("u")).balance;
    await db.$executeRawUnsafe(
      "CREATE OR REPLACE FUNCTION fail_withdraw_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key LIKE 'wallet:withdrawal:v1:%' THEN RAISE EXCEPTION 'forced withdrawal record failure'; END IF; RETURN NEW; END; $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER fail_withdraw_record_trigger BEFORE INSERT ON "Setting" FOR EACH ROW EXECUTE FUNCTION fail_withdraw_record()',
    );
    assert.equal((await withdrawals.requestWithdrawal({}, wf)).ok, false);
    assert.equal((await wallet.ensureWallet("u")).balance, beforeHold);
    await db.$executeRawUnsafe(
      'DROP TRIGGER fail_withdraw_record_trigger ON "Setting"',
    );
    const holds = await Promise.all(
      Array.from({ length: 8 }, () => withdrawals.requestWithdrawal({}, wf)),
    );
    assert.ok(holds.every((r) => r.ok));
    assert.equal((await wallet.ensureWallet("u")).funds.earnings, 20000);
    const review = new FormData();
    review.set(
      "key",
      "wallet:withdrawal:v1:u:11111111-1111-1111-1111-111111111111",
    );
    review.set("decision", "REJECTED");
    review.set("note", "Disposable rejection test");
    session = "a";
    assert.equal((await withdrawals.reviewWithdrawal({}, review)).ok, true);
    assert.equal((await withdrawals.reviewWithdrawal({}, review)).ok, true);
    assert.equal((await wallet.ensureWallet("u")).balance, beforeHold);
    assert.equal((await wallet.ensureWallet("u")).funds.earnings, 30000);
    console.log(
      "PASS PostgreSQL withdrawal: forced request failure rolls back hold, 8 concurrent requests hold once, rejection restores earnings once.",
    );
    console.log(
      "PASS actual disposable PostgreSQL: advisory-lock bonus once, audited recharge, recipient-history failure rolls back both wallets/ledger, 8 concurrent retries credit once, received funds never become earnings.",
    );
  } finally {
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
