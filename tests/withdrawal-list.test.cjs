const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const m = new Module("withdrawal-list", module);
m._compile(
  ts.transpileModule(fs.readFileSync("lib/withdrawal-list.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  "withdrawal-list",
);
const { withdrawalListOptions, withdrawalListPage } = m.exports;
const key = (n) => "wallet:withdrawal:v1:user:" + String(n).padStart(5, "0");
test("withdrawal paging requests sentinel row and retains filters with strict keyset cursor", () => {
  for (const status of ["HELD", "PAID", "REJECTED"]) {
    const options = withdrawalListOptions(status, key(100));
    assert.equal(options.query.take, 101);
    assert.deepEqual(options.query.orderBy, { key: "asc" });
    assert.equal(options.query.where.key.gt, key(100));
    assert.equal(options.query.where.value.contains, `"status":"${status}"`);
  }
});
test("over 100 pending requests remain reachable without duplication", () => {
  const source = Array.from({ length: 251 }, (_, i) => ({
    key: key(i + 1),
    value: "test",
  }));
  const seen = [];
  let after;
  do {
    const o = withdrawalListOptions("HELD", after);
    const page = withdrawalListPage(
      source.filter((r) => !o.after || r.key > o.after).slice(0, o.query.take),
      o.status,
    );
    seen.push(...page.rows.map((r) => r.key));
    after = page.next
      ? new URL(page.next, "https://proshnobook.com").searchParams.get("after")
      : undefined;
  } while (after);
  assert.equal(seen.length, 251);
  assert.equal(new Set(seen).size, 251);
  assert.deepEqual(
    seen,
    source.map((r) => r.key),
  );
});
test("cursor includes scanned corrupt records and encodes exact status and key safely", () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({
    key: key(i + 1),
    value: i === 99 ? "{" : "{}",
  }));
  const page = withdrawalListPage(rows, "REJECTED"),
    u = new URL(page.next, "https://proshnobook.com");
  assert.equal(u.searchParams.get("after"), key(100));
  assert.equal(u.searchParams.get("status"), "REJECTED");
  assert.equal(page.rows.length, 100);
});
test("invalid cursors reset safely and last/empty pages do not invent next pages", () => {
  for (const after of [
    "wallet:account:u",
    "https://evil.test",
    "wallet:withdrawal:v1:u\n",
    "wallet:withdrawal:v1:" + "a".repeat(251),
  ])
    assert.equal(withdrawalListOptions("bad", after).after, undefined);
  assert.equal(withdrawalListOptions("bad").status, "HELD");
  assert.equal(withdrawalListPage([], "HELD").next, null);
  assert.equal(
    withdrawalListPage(
      Array.from({ length: 100 }, (_, i) => ({ key: key(i) })),
      "HELD",
    ).next,
    null,
  );
});
const recharge = new Module("recharge-list", module);
recharge._compile(
  ts.transpileModule(fs.readFileSync("lib/recharge-list.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  "recharge-list",
);
test("recharge queue over 200 remains reachable with bounded pending-only keyset queries", () => {
  const { rechargeListOptions: options, rechargeListPage: page } =
    recharge.exports;
  const rows = Array.from({ length: 403 }, (_, i) => ({
    key: "wallet:recharge:user:" + String(i).padStart(5, "0"),
  }));
  let cursor;
  const seen = [];
  do {
    const o = options(cursor);
    assert.equal(o.query.take, 201);
    assert.equal(o.query.where.value.contains, '"status":"PENDING"');
    const p = page(
      rows.filter((r) => !o.cursor || r.key > o.cursor).slice(0, o.query.take),
    );
    seen.push(...p.rows.map((r) => r.key));
    cursor = p.next
      ? new URL(p.next, "https://proshnobook.com").searchParams.get("after")
      : undefined;
  } while (cursor);
  assert.equal(seen.length, 403);
  assert.equal(new Set(seen).size, 403);
  assert.equal(options("wallet:account:u").cursor, undefined);
  assert.equal(options("wallet:recharge:x\n").cursor, undefined);
});
