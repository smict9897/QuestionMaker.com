const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  fs = require("node:fs"),
  Module = require("node:module");
const m = new Module("funds");
m.require = require;
m._compile(
  ts.transpileModule(fs.readFileSync("lib/wallet-funds.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "funds.js",
);
const f = m.exports;
test("legacy total preserved, bonus reserved conservatively and earnings never invented", () => {
  for (const [balance, bonus] of [
    [0, 2000],
    [500, 2000],
    [8000, 2000],
    [12345, 0],
  ]) {
    const w = f.normalizeWallet({ balance, bonus });
    assert.equal(w.balance, balance);
    assert.equal(w.funds.bonus, Math.min(balance, bonus));
    assert.equal(w.funds.earnings, 0);
    assert.equal(
      Object.values(w.funds).reduce((a, b) => a + b, 0),
      balance,
    );
  }
});
test("spend nonwithdrawable sources first and never transfer bonus", () => {
  let w = f.normalizeWallet({ balance: 2000, bonus: 2000 });
  w = f.creditFunds(w, "recharge", 3000);
  w = f.creditFunds(w, "received", 1000);
  w = f.creditFunds(w, "earnings", 4000);
  const debit = f.debitFunds(w, 6500);
  assert.deepEqual(debit.used, {
    bonus: 2000,
    recharge: 3000,
    received: 1000,
    earnings: 500,
  });
  assert.equal(debit.wallet.funds.earnings, 3500);
  assert.equal(w.balance, 10000);
  const transfer = f.debitFunds(w, 3500, true);
  assert.equal(transfer.used.bonus, 0);
  assert.equal(transfer.wallet.funds.bonus, 2000);
  assert.throws(() =>
    f.debitFunds(f.normalizeWallet({ balance: 2000, bonus: 2000 }), 100, true),
  );
});
test("corrupt, overflowing or fractional wallets and amounts fail closed", () => {
  for (const w of [
    { balance: -1, bonus: 0 },
    { balance: 1.5, bonus: 0 },
    { balance: 10, bonus: -1 },
    { version: 3, balance: 0, bonus: 0 },
    {
      version: 2,
      balance: 1,
      bonus: 0,
      funds: { bonus: 0, recharge: 0, earnings: 0, received: 0 },
    },
  ])
    assert.throws(() => f.normalizeWallet(w));
  const w = f.normalizeWallet({ balance: 20, bonus: 0 });
  for (const n of [0, -1, 0.1, Infinity, NaN, Number.MAX_SAFE_INTEGER])
    assert.throws(() => f.creditFunds(w, "earnings", n));
  assert.throws(() => f.debitFunds(w, 21));
});
test("all existing balance mutation paths go through audited source-aware helper", () => {
  for (const file of [
    "app/actions/wallet.ts",
    "app/actions/ready-commerce.ts",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /changeWalletFunds/);
    assert.doesNotMatch(source, /where:\s*\{ key: `wallet:account:/);
  }
  const component = fs.readFileSync("components/wallet-transfer.tsx", "utf8");
  assert.match(component, /প্রাপকের নাম যাচাই করুন/);
  assert.match(component, /name="confirmed"/);
  assert.match(component, /quoteId/);
});
