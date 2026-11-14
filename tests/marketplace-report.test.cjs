const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("report", module);
m._compile(
  ts.transpileModule(fs.readFileSync("lib/marketplace-report.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  "report",
);
const { saleReceipt, pageRevenue, PLATFORM_RECEIPT_PREFIX: p } = m.exports;
const r = {
    buyerId: "buyer",
    sellerId: "seller",
    paperId: "f".repeat(64),
    amount: 1001,
    sellerAmount: 600,
    platformAmount: 401,
    at: new Date().toISOString(),
  },
  key = p + r.buyerId + ":" + r.paperId;
test("receipt report allowlists fields and sums integer paisa for this page only", () => {
  const receipt = saleReceipt(
    key,
    JSON.stringify({ ...r, snapshot: "PRIVATE", number: "PRIVATE" }),
  );
  assert.deepEqual(receipt, r);
  assert.deepEqual(pageRevenue([receipt, receipt]), {
    count: 2,
    amount: 2002,
    sellerAmount: 1200,
    platformAmount: 802,
  });
  assert.equal(pageRevenue([]).amount, 0);
});
test("invalid amounts, identities, mismatched keys and dates excluded", () => {
  for (const patch of [
    { amount: 100.5 },
    { amount: 0 },
    { amount: 5000001 },
    { sellerAmount: 601 },
    { platformAmount: 400 },
    { buyerId: "seller" },
    { paperId: "bad" },
    { at: "bad" },
    { buyerId: null },
  ])
    assert.equal(saleReceipt(key, JSON.stringify({ ...r, ...patch })), null);
  assert.equal(saleReceipt(key + "wrong", JSON.stringify(r)), null);
  assert.equal(saleReceipt(key, "malformed"), null);
});
test("revenue route verifies fresh admin role before querying receipts, bounded and paginated without snapshots", () => {
  const s = fs.readFileSync("app/admin/marketplace-revenue/page.tsx", "utf8");
  assert.ok(s.indexOf('role !== "ADMIN"') < s.indexOf("db.setting.findMany"));
  assert.match(s, /take: 51/);
  assert.match(s, /encodeURIComponent/);
  assert.doesNotMatch(s, /purchaseKey|snapshot|dangerouslySetInnerHTML/);
});
