/** Opt-in integration test. Uses only an explicitly supplied disposable local DB, never production. */
const fs = require("fs"),
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
  const { PrismaClient } = require("/home/user/wallet-prisma"),
    { PrismaPg } = require("@prisma/adapter-pg");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "User" (id TEXT PRIMARY KEY,role TEXT NOT NULL)',
    );
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "Setting" (key TEXT PRIMARY KEY,value TEXT NOT NULL)',
    );
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "Question" (id TEXT PRIMARY KEY,correct TEXT NOT NULL,options JSONB NOT NULL,text TEXT NOT NULL,approved BOOLEAN NOT NULL,source TEXT NOT NULL)',
    );
    await db.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "PackagePurchase" (id TEXT PRIMARY KEY,"userId" TEXT,"status" TEXT,"expiresAt" TIMESTAMP(3),"transactionId" TEXT)',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "User","Setting","Question","PackagePurchase"',
    );
    await db.$executeRawUnsafe(
      "INSERT INTO \"User\" VALUES ('u','STUDENT'),('a','ADMIN')",
    );
    await db.$executeRawUnsafe(
      "INSERT INTO \"Question\" VALUES ('m','A','{}','sample',true,'MANUAL'),('c','','{\"stimulus\":\"story\"}','sample',true,'MANUAL')",
    );
    let session = "u";
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
              ? { auth: async () => ({ user: { id: session } }) }
              : id === "next/cache"
                ? { revalidatePath: () => {} }
                : id === "@/lib/paper-generation"
                  ? {
                      visibleQuestions: (id) => ({
                        OR: [
                          { approved: true },
                          { approved: false, source: `AI_PENDING:${id}` },
                        ],
                      }),
                    }
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
    const w = load("lib/wallet.ts"),
      a = load("app/actions/wallet.ts");
    await Promise.all(Array.from({ length: 10 }, () => w.ensureWallet("u")));
    assert.equal((await w.ensureWallet("u")).balance, 2000);
    const buys = await Promise.all(
      Array.from({ length: 10 }, () => a.purchaseQuestions(["m", "c"], 70)),
    );
    assert.ok(
      buys.every((r) => r.ok),
      JSON.stringify(buys),
    );
    assert.equal(
      buys.reduce((n, r) => n + r.charged, 0),
      70,
    );
    assert.equal((await w.ensureWallet("u")).balance, 1930);
    const f = new FormData();
    for (const [k, v] of Object.entries({
      amount: "20",
      method: "bKash",
      transactionId: "REALPG123",
      phone: "01712345678",
    }))
      f.set(k, v);
    assert.equal((await a.submitRecharge(f)).ok, true);
    session = "a";
    const approvals = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        a.reviewRecharge("wallet:recharge:u:REALPG123", true),
      ),
    );
    assert.equal(approvals.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await w.ensureWallet("u")).balance, 3930);
    // Force a receipt conflict after balance update and verify transaction rollback.
    session = "u";
    await db.$executeRawUnsafe(
      "DELETE FROM \"Setting\" WHERE key='wallet:question:u:m'",
    );
    const before = (await w.ensureWallet("u")).balance;
    await assert.rejects(
      w.walletTransaction(async (tx) => {
        await tx.setting.update({
          where: { key: "wallet:account:u" },
          data: { value: JSON.stringify({ balance: 0, bonus: 2000 }) },
        });
        throw Error("forced write failure");
      }),
    );
    assert.equal((await w.ensureWallet("u")).balance, before);
    console.log(
      "PASS: actual PostgreSQL + Prisma adapter: 10-way bonus, 10-way checkout, 5-way recharge approval, atomic rollback.",
    );
  } finally {
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
