const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module");
function setup(fail = false) {
  const calls = [];
  const m = new Module("summary", module);
  m.require = (n) =>
    ({
      "@/lib/db": {
        db: {
          packagePurchase: {
            findFirst: async (q) => {
              calls.push(q);
              if (fail) throw Error();
              return null;
            },
          },
          setting: {
            count: async (q) => {
              calls.push(q);
              if (fail) throw Error();
              return 3;
            },
          },
        },
      },
      "@/lib/wallet": {
        ensureWallet: async (id) => {
          calls.push(id);
          if (fail) throw Error();
          return { balance: 2000, admin: false };
        },
      },
      "@/lib/english/draft": {
        englishOwnerPrefix: (id) => "english:" + id + ":",
      },
    })[n] || require(n);
  m._compile(
    ts.transpileModule(fs.readFileSync("lib/workspace-summary.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    "summary.js",
  );
  return { api: m.exports, calls };
}
test("workspace summary queries only current account, approved unexpired package and own prefixes", async () => {
  const h = setup(),
    r = await h.api.workspaceSummary("u");
  assert.equal(r.wallet.balance, 2000);
  assert.equal(r.saved, 3);
  assert.equal(r.packagePurchase, null);
  assert.equal(h.calls[0], "u");
  const q = h.calls.find((x) => x?.where?.userId);
  assert.equal(q.where.status, "APPROVED");
  assert.equal(q.where.userId, "u");
  assert.ok(q.where.expiresAt.gt instanceof Date);
  for (const prefix of ["qbpaper:u:", "english:u:", "wallet:question:u:"])
    assert.ok(h.calls.some((q) => q?.where?.key?.startsWith === prefix));
});
test("failed balance/count/package do not masquerade as zero balance or inactive plan", async () => {
  const h = setup(true),
    r = await h.api.workspaceSummary("u");
  assert.equal(r.wallet, null);
  assert.equal(r.saved, null);
  assert.equal(r.english, null);
  assert.equal(r.packagePurchase, undefined);
});
test("history helpers reject malformed JSON and invalid dates safely", () => {
  const { api } = setup();
  assert.equal(api.safeWalletRecord("bad"), null);
  assert.equal(api.safeWalletRecord("null"), null);
  assert.equal(api.safeWalletRecord("[]"), null);
  assert.equal(api.displayDate("bad"), "—");
  assert.equal(api.safeWalletRecord('{"amount":2000}').amount, 2000);
});
