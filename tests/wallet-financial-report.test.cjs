const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) =>
    n.startsWith("@/lib/") ? load(n.replace("@/", "") + ".ts") : require(n);
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
const { financialReport, reportRange, REPORT_SCAN_LIMIT } = load(
  "lib/wallet-financial-report.ts",
);
const paperId = "f".repeat(64),
  sale = {
    buyerId: "buyer",
    sellerId: "seller",
    paperId,
    amount: 1001,
    sellerAmount: 600,
    platformAmount: 401,
    at: "2026-11-01T17:59:59.999Z",
  };
function saleRow(s = sale) {
  return {
    key: `market:platform:v1:${s.buyerId}:${s.paperId}`,
    value: JSON.stringify(s),
  };
}
function refundRow(patch = {}) {
  return {
    key: `market:refund:v1:buyer:${paperId}`,
    value: JSON.stringify({
      version: 1,
      ...sale,
      refundedAt: "2026-11-01T18:00:00.000Z",
      ...patch,
    }),
  };
}
function withdrawal(status = "HELD", patch = {}) {
  const id = "11111111-1111-1111-1111-111111111111";
  return {
    key: `wallet:withdrawal:v1:u:${id}`,
    value: JSON.stringify({
      version: 1,
      id,
      userId: "u",
      number: "01712345678",
      amount: 10000,
      status,
      createdAt: "2026-10-01T00:00:00.000Z",
      ...(status !== "HELD"
        ? {
            reviewedAt: "2026-11-01T18:00:00.000Z",
            reviewerId: "admin",
            trx: "PAYOUT123",
          }
        : {}),
      ...patch,
    }),
  };
}
test("Dhaka day range is inclusive through end day and rejects incomplete/invalid/reversed dates", () => {
  assert.equal(reportRange(), null);
  const r = reportRange("2026-11-02", "2026-11-02");
  assert.equal(new Date(r.start).toISOString(), "2026-11-01T18:00:00.000Z");
  assert.equal(r.end - r.start, 86400000);
  for (const [a, b] of [
    ["2026-02-30", "2026-03-01"],
    ["bad", "2026-11-01"],
    ["2026-11-02", undefined],
    ["2026-11-03", "2026-11-02"],
  ])
    assert.throws(() => reportRange(a, b));
});
test("sale and refund use separate event dates; earlier sale refunded today produces negative flow not profit", () => {
  const day = reportRange("2026-11-02", "2026-11-02"),
    r = financialReport([saleRow()], [refundRow()], [], day);
  assert.equal(r.complete, true);
  assert.equal(r.gross.amount, 0);
  assert.equal(r.refunds.amount, 1001);
  assert.equal(r.adjusted.amount, -1001);
  assert.equal(r.adjusted.platformAmount, -401);
  const all = financialReport([saleRow()], [refundRow()], [], null);
  assert.equal(all.gross.amount, 1001);
  assert.equal(all.adjusted.amount, 0);
});
test("payout/rejection dates filtered independently while held total always uses current snapshot", () => {
  const r = financialReport(
    [],
    [],
    [
      withdrawal("HELD", {
        claimedBy: "admin",
        claimedAt: "2026-10-01T01:00:00Z",
      }),
      withdrawal("PAID"),
      withdrawal("REJECTED"),
    ],
    reportRange("2026-11-02", "2026-11-02"),
  );
  assert.deepEqual(r.held, { count: 1, amount: 10000, claimed: 1 });
  assert.deepEqual(r.payout, { count: 1, amount: 10000 });
  assert.deepEqual(r.rejected, { count: 1, amount: 10000 });
  assert.equal(r.complete, true);
});
test("mismatched/orphan/backdated refunds and corrupt payout/records are flagged not silently totaled", () => {
  const r = financialReport(
    [saleRow(), { key: "bad", value: "{}" }],
    [
      refundRow({ amount: 1000 }),
      refundRow({ refundedAt: "2026-01-01T00:00:00Z" }),
      refundRow({ buyerId: "other" }),
    ],
    [
      withdrawal("PAID", { trx: "" }),
      withdrawal("REJECTED", { reviewedAt: "bad" }),
    ],
    null,
  );
  assert.equal(r.complete, false);
  assert.equal(r.invalidSales, 1);
  assert.equal(r.invalidRefunds, 3);
  assert.equal(r.invalidWithdrawals, 2);
  assert.equal(r.refunds.amount, 0);
  assert.equal(r.payout.amount, 0);
});
test("scan bounds cannot masquerade as lifetime totals and only validated first batch is aggregated", () => {
  const rows = Array.from({ length: REPORT_SCAN_LIMIT + 1 }, (_, i) =>
    saleRow({ ...sale, buyerId: "b" + i }),
  );
  const r = financialReport(rows, [], [], null);
  assert.equal(r.truncated, true);
  assert.equal(r.complete, false);
  assert.equal(r.gross.count, REPORT_SCAN_LIMIT);
  assert.equal(r.scanned.sales, REPORT_SCAN_LIMIT);
});
test("data boundary uses repeatable-read, fresh admin check and bounded receipt prefixes, never wallet/purchased content", () => {
  const s = fs.readFileSync("lib/wallet-financial-data.ts", "utf8");
  assert.match(s, /RepeatableRead/);
  assert.ok(s.indexOf('role !== "ADMIN"') < s.indexOf("const sales"));
  assert.match(s, /REPORT_SCAN_LIMIT \+ 1/);
  assert.doesNotMatch(s, /market:purchase|wallet:account|snapshot\.questions/);
});
test("data loader denies nonadmin before reads and returns transaction timestamp with consistent options", async () => {
  let role = "STUDENT",
    reads = 0,
    options;
  const db = {
    $transaction: async (fn, o) => {
      options = o;
      return fn({
        user: { findUnique: async () => ({ role }) },
        $queryRaw: async () => [{ at: new Date("2026-11-10T00:00:00Z") }],
        setting: {
          findMany: async () => {
            reads++;
            return [];
          },
        },
      });
    },
  };
  const file = "lib/wallet-financial-data.ts",
    m = new Module(file, module);
  m.paths = module.paths;
  m.require = (n) =>
    n === "server-only"
      ? {}
      : n === "@/lib/db"
        ? { db }
        : n === "@/lib/wallet-financial-report"
          ? load("lib/wallet-financial-report.ts")
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
  await assert.rejects(() => m.exports.readFinancialReport("user"));
  assert.equal(reads, 0);
  role = "ADMIN";
  const r = await m.exports.readFinancialReport("admin");
  assert.equal(reads, 3);
  assert.equal(options.isolationLevel, "RepeatableRead");
  assert.equal(r.asOf, "2026-11-10T00:00:00.000Z");
  assert.equal(r.complete, true);
  assert.equal(r.gross.amount, 0);
});
