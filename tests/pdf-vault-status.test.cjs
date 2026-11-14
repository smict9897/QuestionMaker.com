const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript"),
  Module = require("module");
const m = new Module("status", module);
m._compile(
  ts.transpileModule(fs.readFileSync("lib/pdf-vault-status.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "status",
);
const { pdfVaultStatus } = m.exports;
test("vault diagnostics distinguish missing credentials without exposing secrets", () => {
  const key = "ab".repeat(32),
    token = "private-token",
    env = {
      PDF_VAULT_KEYS: JSON.stringify({ v1: key }),
      BLOB_READ_WRITE_TOKEN: token,
    };
  assert.equal(pdfVaultStatus({}).configured, false);
  assert.equal(pdfVaultStatus(env).configured, true);
  assert.equal(
    pdfVaultStatus({ ...env, PDF_VAULT_ACTIVE_KEY: "v2" }).activeKeyPresent,
    false,
  );
  assert.equal(
    pdfVaultStatus({ ...env, BLOB_READ_WRITE_TOKEN: " " }).configured,
    false,
  );
  const result = JSON.stringify(pdfVaultStatus(env));
  assert.ok(!result.includes(key));
  assert.ok(!result.includes(token));
});
test("malformed keyrings fail closed", () => {
  for (const raw of [
    "null",
    "[]",
    '"secret"',
    "{",
    '{"v1":"short"}',
    '{"bad id":"' + "ab".repeat(32) + '"}',
  ]) {
    const r = pdfVaultStatus({
      PDF_VAULT_KEYS: raw,
      BLOB_READ_WRITE_TOKEN: "token",
    });
    assert.equal(r.keyringValid, false);
    assert.equal(r.configured, false);
  }
});
