const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { seal, open, destination } = require("../scripts/pdf-vault-backup.cjs");
const password = "test-only-independent-passphrase";
const payload = {
  version: 1,
  active: "v2",
  keys: { v1: "ab".repeat(32), v2: "cd".repeat(32) },
};
test("encrypted backup restores every rotation key, is randomized and rejects tampering/wrong password", async () => {
  const a = await seal(payload, password),
    b = await seal(payload, password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(payload.keys.v1));
  assert.ok(!a.includes(password));
  assert.deepEqual(await open(a, password), payload);
  await assert.rejects(open(a, "incorrect-password-long-enough"));
  for (const field of ["salt", "iv", "tag", "data"]) {
    const changed = JSON.parse(a);
    changed[field] =
      (changed[field][0] === "0" ? "1" : "0") + changed[field].slice(1);
    await assert.rejects(open(JSON.stringify(changed), password));
  }
  await assert.rejects(open(" ".repeat(65537), password));
  await assert.rejects(seal(payload, "short"));
  await assert.rejects(seal({ ...payload, active: "missing" }, password));
  await assert.rejects(seal({ ...payload, keys: { v1: "short" } }, password));
});
test("CLI creates owner-only files, verifies/restores without leaks or overwrites", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-backup-test-"));
  const env = { ...process.env };
  delete env.PDF_VAULT_KEYS;
  delete env.PDF_VAULT_ACTIVE_KEY;
  const backup = path.join(dir, "keys.backup"),
    initial = path.join(dir, "initial.env"),
    restored = path.join(dir, "restored.env");
  const run = (args, input = password, override = {}) =>
    spawnSync(process.execPath, ["scripts/pdf-vault-backup.cjs", ...args], {
      env: { ...env, ...override },
      input: input + "\n",
      encoding: "utf8",
    });
  try {
    let r = run(["create", backup, initial]);
    assert.equal(r.status, 0, r.stderr);
    const plain = fs.readFileSync(initial, "utf8");
    const key = JSON.parse(plain.split("'")[1]).v1;
    assert.equal(fs.statSync(initial).mode & 0o777, 0o600);
    assert.equal(fs.statSync(backup).mode & 0o777, 0o600);
    assert.ok(!r.stdout.includes(key));
    assert.ok(!r.stderr.includes(key));
    assert.ok(!fs.readFileSync(backup, "utf8").includes(key));
    assert.equal(run(["verify", backup]).status, 0);
    assert.equal(run(["verify", backup], "wrong-passphrase-12345").status, 1);
    assert.equal(run(["restore", backup, restored]).status, 0);
    assert.equal(fs.readFileSync(restored, "utf8"), plain);
    assert.equal(run(["restore", backup, restored]).status, 1);
    assert.equal(run(["create", backup, initial]).status, 1);
    assert.equal(fs.readFileSync(initial, "utf8"), plain);
    assert.equal(
      run(
        ["create", path.join(dir, "other"), path.join(dir, "other.env")],
        password,
        { PDF_VAULT_KEYS: "{}" },
      ).status,
      1,
    );
    assert.equal(
      run(["import", path.join(dir, "imported")], password, {
        PDF_VAULT_KEYS: JSON.stringify(payload.keys),
        PDF_VAULT_ACTIVE_KEY: "v2",
      }).status,
      0,
    );
    assert.equal(
      run(["create", path.join(dir, "rollback"), initial]).status,
      1,
    );
    assert.ok(!fs.existsSync(path.join(dir, "rollback")));
    assert.equal(fs.readFileSync(initial, "utf8"), plain);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("output rejects repository paths, including symlinked parents", () => {
  assert.throws(() => destination(path.resolve(".env.production")));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-path-test-"));
  try {
    fs.symlinkSync(process.cwd(), path.join(dir, "repo"));
    assert.throws(() => destination(path.join(dir, "repo", "secret.env")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
