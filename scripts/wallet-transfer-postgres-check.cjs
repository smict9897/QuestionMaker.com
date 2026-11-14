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
      "INSERT INTO \"User\" VALUES ('u','TEACHER','Sender'),('v','TEACHER','Recipient'),('a','ADMIN','Admin'),('b','ADMIN','Second admin')",
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
    const claim = new FormData();
    claim.set("key", review.get("key"));
    claim.set("claimConfirmed", "on");
    const claimResults = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        session = i % 2 ? "a" : "b";
        return withdrawals.claimWithdrawal({}, claim);
      }),
    );
    const claimed = JSON.parse(
      (await db.setting.findUnique({ where: { key: review.get("key") } }))
        .value,
    );
    assert.ok(["a", "b"].includes(claimed.claimedBy));
    assert.equal(claimResults.filter((r) => r.ok).length, 4);
    assert.equal(
      await db.setting.count({
        where: { key: { startsWith: "wallet:withdrawal-claim:v1:" } },
      }),
      1,
    );
    session = claimed.claimedBy === "a" ? "b" : "a";
    assert.equal((await withdrawals.reviewWithdrawal({}, review)).ok, false);
    session = claimed.claimedBy;
    assert.equal((await withdrawals.claimWithdrawal({}, claim)).ok, true);
    assert.equal((await withdrawals.reviewWithdrawal({}, review)).ok, true);
    assert.equal((await withdrawals.reviewWithdrawal({}, review)).ok, true);
    assert.equal((await wallet.ensureWallet("u")).balance, beforeHold);
    assert.equal((await wallet.ensureWallet("u")).funds.earnings, 30000);
    console.log(
      "PASS PostgreSQL withdrawal: 8 claims across two admins yield one exclusive owner; other admin review blocked; forced request failure rolls back hold, 8 concurrent requests hold once, rejection restores earnings once.",
    );
    const purchases = load("app/actions/marketplace-purchase.ts"),
      commerce = load("lib/marketplace-purchase.ts"),
      market = load("lib/marketplace.ts"),
      builder = load("lib/paper-builder.ts");
    session = "u";
    const paperId = "f".repeat(64),
      snapshot = {
        settings: builder.settingsSchema.parse({}),
        questions: [
          {
            id: "market-q",
            text: "Disposable market paper",
            correct: "A",
            options: { A: "one", B: "two" },
          },
        ],
      };
    const sale = {
      version: 1,
      id: paperId,
      ownerId: "v",
      source: "DATABASE",
      sourceKey: "qbpaper:v:test",
      status: "APPROVED",
      revision: 1,
      metadata: {
        examType: "বার্ষিক পরীক্ষা",
        title: "Disposable paper",
        grade: "6",
        subject: "বাংলা",
        chapters: ["প্রথম"],
        description: "Disposable approved paper test",
        pricePaisa: 1001,
        rights: true,
      },
      snapshot,
      snapshotHash: market.snapshotHash(snapshot),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.setting.create({
      data: {
        key: market.MARKET_PREFIX + paperId,
        value: JSON.stringify(sale),
      },
    });
    const purchaseForm = new FormData();
    purchaseForm.set("paperId", paperId);
    purchaseForm.set("terms", commerce.purchaseTerms(sale));
    purchaseForm.set("confirmed", "on");
    const buyerBefore = await wallet.ensureWallet("u"),
      sellerBefore = await wallet.ensureWallet("v");
    await db.$executeRawUnsafe(
      "CREATE OR REPLACE FUNCTION fail_market_platform() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key LIKE 'market:platform:v1:%' THEN RAISE EXCEPTION 'forced platform receipt failure'; END IF; RETURN NEW; END; $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER fail_market_platform_trigger BEFORE INSERT ON "Setting" FOR EACH ROW EXECUTE FUNCTION fail_market_platform()',
    );
    assert.equal((await purchases.buyMarketPaper({}, purchaseForm)).ok, false);
    assert.deepEqual(await wallet.ensureWallet("u"), buyerBefore);
    assert.deepEqual(await wallet.ensureWallet("v"), sellerBefore);
    assert.equal(
      await db.setting.count({
        where: { key: commerce.purchaseKey("u", paperId) },
      }),
      0,
    );
    await db.$executeRawUnsafe(
      'DROP TRIGGER fail_market_platform_trigger ON "Setting"',
    );
    const sales = await Promise.all(
      Array.from({ length: 8 }, () =>
        purchases.buyMarketPaper({}, purchaseForm),
      ),
    );
    assert.ok(sales.every((r) => r.ok));
    assert.equal(
      (await wallet.ensureWallet("u")).balance,
      buyerBefore.balance - 1001,
    );
    assert.equal(
      (await wallet.ensureWallet("v")).funds.earnings,
      sellerBefore.funds.earnings + 600,
    );
    const copy = commerce.validatePurchase(
      (
        await db.setting.findUnique({
          where: { key: commerce.purchaseKey("u", paperId) },
        })
      ).value,
      "u",
      paperId,
    );
    assert.equal(copy.platformAmount, 401);
    const institutionForm = new FormData();
    institutionForm.set("paperId", paperId);
    institutionForm.set("institution", "Disposable school");
    assert.equal(
      (await purchases.savePurchasedInstitution({}, institutionForm)).ok,
      true,
    );
    const saved = JSON.parse(
      (
        await db.setting.findUnique({
          where: { key: commerce.purchaseKey("u", paperId) },
        })
      ).value,
    );
    assert.deepEqual(saved.snapshot, snapshot);
    assert.equal(saved.institution, "Disposable school");
    console.log(
      "PASS PostgreSQL marketplace: platform receipt failure rolls back both wallets/copy, 8 retries purchase once, exact 600/401 paisa split, institution edit preserves snapshot.",
    );
    const disputes = load("app/actions/marketplace-refund.ts"),
      refunds = load("lib/marketplace-refund.ts");
    const cf = new FormData();
    cf.set("paperId", paperId);
    cf.set("reason", "Disposable incorrect paper refund request");
    cf.set("confirmed", "on");
    assert.equal((await disputes.reportMarketPurchase({}, cf)).ok, true);
    const originalLedger = await db.setting.findUnique({
        where: { key: refunds.marketDebitKey("u", paperId) },
      }),
      originalSources = refunds.refundSources(
        originalLedger.value,
        "u",
        paperId,
        1001,
      ),
      beforeRefund = await wallet.ensureWallet("u"),
      sellerPreRefund = await wallet.ensureWallet("v");
    const rf = new FormData();
    rf.set("key", refunds.disputeKey("u", paperId));
    rf.set("decision", "REFUNDED");
    rf.set("note", "Disposable issue verified against original snapshot");
    rf.set("confirmed", "on");
    session = "a";
    await db.$executeRawUnsafe(
      "CREATE OR REPLACE FUNCTION fail_refund_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key LIKE 'market:refund:v1:%' THEN RAISE EXCEPTION 'forced refund receipt failure'; END IF; RETURN NEW; END; $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER fail_refund_receipt_trigger BEFORE INSERT ON "Setting" FOR EACH ROW EXECUTE FUNCTION fail_refund_receipt()',
    );
    assert.equal((await disputes.reviewMarketDispute({}, rf)).ok, false);
    assert.deepEqual(await wallet.ensureWallet("u"), beforeRefund);
    assert.deepEqual(await wallet.ensureWallet("v"), sellerPreRefund);
    assert.equal(
      JSON.parse(
        (
          await db.setting.findUnique({
            where: { key: refunds.disputeKey("u", paperId) },
          })
        ).value,
      ).status,
      "OPEN",
    );
    commerce.validatePurchase(
      (
        await db.setting.findUnique({
          where: { key: commerce.purchaseKey("u", paperId) },
        })
      ).value,
      "u",
      paperId,
    );
    await db.$executeRawUnsafe(
      'DROP TRIGGER fail_refund_receipt_trigger ON "Setting"',
    );
    const refundResults = await Promise.all(
      Array.from({ length: 8 }, () => disputes.reviewMarketDispute({}, rf)),
    );
    assert.ok(refundResults.every((r) => r.ok));
    const afterRefund = await wallet.ensureWallet("u");
    assert.equal(afterRefund.balance, beforeRefund.balance + 1001);
    for (const source of ["bonus", "recharge", "received", "earnings"])
      assert.equal(
        afterRefund.funds[source],
        beforeRefund.funds[source] + originalSources[source],
      );
    assert.equal(
      (await wallet.ensureWallet("v")).funds.earnings,
      sellerPreRefund.funds.earnings - 600,
    );
    const refunded = (
      await db.setting.findUnique({
        where: { key: commerce.purchaseKey("u", paperId) },
      })
    ).value;
    assert.throws(() => commerce.validatePurchase(refunded, "u", paperId));
    assert.ok(
      commerce.validatePurchase(refunded, "u", paperId, true).refundedAt,
    );
    assert.equal(
      await db.setting.count({
        where: { key: `market:refund:v1:u:${paperId}` },
      }),
      1,
    );
    console.log(
      "PASS PostgreSQL refund: forced final receipt failure rolls back both wallets/access/dispute; 8 concurrent approvals refund once to exact original sources and revoke online copy.",
    );
    session = "u";
    const pendingForm = new FormData();
    pendingForm.set("tid", wallet.teacherTid("v"));
    pendingForm.set("amount", "10");
    const pending = await transfers.prepareWalletTransfer({}, pendingForm);
    assert.equal(pending.ok, true);
    const limitActions = load("app/actions/wallet-limits.ts"),
      limitLib = load("lib/wallet-limits.ts");
    const lf = new FormData();
    lf.set("revision", "0");
    lf.set("transferDaily", "5");
    lf.set("withdrawalMax", "100");
    lf.set("recipientLookups", "1");
    lf.set("note", "Disposable concurrent limit change verification");
    lf.set("confirmed", "on");
    const edits = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        session = i % 2 ? "a" : "b";
        return limitActions.updateWalletLimits({}, lf);
      }),
    );
    assert.equal(edits.filter((r) => r.ok).length, 1);
    assert.equal((await limitLib.readWalletLimits(db)).revision, 1);
    assert.equal(
      await db.setting.count({
        where: { key: { startsWith: "wallet:limits-audit:v1:" } },
      }),
      1,
    );
    session = "u";
    const late = new FormData();
    late.set("quoteId", pending.quoteId);
    late.set("confirmed", "on");
    const beforeLate = await wallet.ensureWallet("u");
    assert.equal((await transfers.confirmWalletTransfer({}, late)).ok, false);
    assert.deepEqual(await wallet.ensureWallet("u"), beforeLate);
    console.log(
      "PASS PostgreSQL configurable limits: 8 concurrent admin edits accept one revision/audit; reduced current cap blocks earlier pending quote without changing balance.",
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
