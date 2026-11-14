#!/usr/bin/env node
/* Offline operator tool. Never connects to Vercel or changes deployed keys. */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
const AAD = Buffer.from("proshnobook:pdf-vault-key-backup:v1");
const MAX = 65536;
function validatePayload(p) {
  if (
    !p ||
    p.version !== 1 ||
    typeof p.active !== "string" ||
    !p.keys ||
    typeof p.keys !== "object" ||
    Array.isArray(p.keys)
  )
    throw Error("Invalid keyring");
  const entries = Object.entries(p.keys);
  if (
    !entries.length ||
    entries.length > 100 ||
    !entries.every(
      ([id, key]) =>
        /^[a-zA-Z0-9_-]{1,40}$/.test(id) &&
        typeof key === "string" &&
        /^[a-fA-F0-9]{64}$/.test(key),
    ) ||
    !Object.hasOwn(p.keys, p.active)
  )
    throw Error("Invalid keyring");
  return { version: 1, active: p.active, keys: Object.fromEntries(entries) };
}
function passwordBytes(password) {
  if (
    typeof password !== "string" ||
    Buffer.byteLength(password) < 16 ||
    Buffer.byteLength(password) > 1024
  )
    throw Error("Use a 16–1024 byte backup passphrase");
  return Buffer.from(password);
}
async function derive(password, salt) {
  const bytes = passwordBytes(password);
  try {
    return await scrypt(bytes, salt, 32, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
  } finally {
    bytes.fill(0);
  }
}
async function seal(payload, password) {
  const plain = Buffer.from(JSON.stringify(validatePayload(payload)));
  const salt = crypto.randomBytes(32),
    iv = crypto.randomBytes(12);
  const key = await derive(password, salt);
  try {
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(AAD);
    const data = Buffer.concat([cipher.update(plain), cipher.final()]);
    return JSON.stringify({
      version: 1,
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      tag: cipher.getAuthTag().toString("hex"),
      data: data.toString("hex"),
    });
  } finally {
    key.fill(0);
    plain.fill(0);
  }
}
async function open(raw, password) {
  if (typeof raw !== "string" || Buffer.byteLength(raw) > MAX)
    throw Error("Invalid backup");
  const b = JSON.parse(raw);
  if (
    !b ||
    b.version !== 1 ||
    !["salt", "iv", "tag", "data"].every(
      (field) => typeof b[field] === "string",
    ) ||
    !/^[a-f0-9]{64}$/.test(b.salt) ||
    !/^[a-f0-9]{24}$/.test(b.iv) ||
    !/^[a-f0-9]{32}$/.test(b.tag) ||
    typeof b.data !== "string" ||
    !/^(?:[a-f0-9]{2})+$/.test(b.data)
  )
    throw Error("Invalid backup");
  const key = await derive(password, Buffer.from(b.salt, "hex"));
  let plain;
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(b.iv, "hex"),
    );
    decipher.setAAD(AAD);
    decipher.setAuthTag(Buffer.from(b.tag, "hex"));
    plain = Buffer.concat([
      decipher.update(Buffer.from(b.data, "hex")),
      decipher.final(),
    ]);
    return validatePayload(JSON.parse(plain.toString("utf8")));
  } finally {
    key.fill(0);
    if (plain) plain.fill(0);
  }
}
function destination(file) {
  const parent = fs.realpathSync(path.dirname(path.resolve(file)));
  const repo = fs.realpathSync(path.resolve(__dirname, ".."));
  if (parent === repo || parent.startsWith(repo + path.sep))
    throw Error("Output must be outside this repository");
  return path.join(parent, path.basename(file));
}
function writeNew(file, content) {
  const target = destination(file);
  const fd = fs.openSync(target, "wx", 0o600);
  try {
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
  } catch (e) {
    try {
      fs.unlinkSync(target);
    } catch {}
    throw e;
  } finally {
    fs.closeSync(fd);
  }
}
function envText(payload) {
  return `PDF_VAULT_KEYS='${JSON.stringify(payload.keys)}'\nPDF_VAULT_ACTIVE_KEY=${payload.active}\n`;
}
async function main(args) {
  const [command, file, output] = args;
  if (
    !["create", "import", "verify", "restore"].includes(command) ||
    !file ||
    (command === "create" || command === "restore" ? !output : !!output) ||
    args.length > 3
  )
    throw Error(
      "Usage: create BACKUP ENV_FILE | import BACKUP | verify BACKUP | restore BACKUP ENV_FILE; passphrase via stdin only",
    );
  // Bounded pipe input avoids command history/argv. No interactive echoing prompt.
  if (process.stdin.isTTY)
    throw Error("Pipe a passphrase from your secret manager via stdin");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk.toString("utf8");
    if (Buffer.byteLength(input) > 1026) throw Error("Passphrase too long");
  }
  const password = input.replace(/\r?\n$/, "");
  passwordBytes(password).fill(0);
  if (command === "create" || command === "import") {
    let payload;
    if (command === "create") {
      if (process.env.PDF_VAULT_KEYS || process.env.PDF_VAULT_ACTIVE_KEY)
        throw Error(
          "Existing vault environment found; use import, never replace existing keys",
        );
      payload = {
        version: 1,
        active: "v1",
        keys: { v1: crypto.randomBytes(32).toString("hex") },
      };
    } else
      payload = validatePayload({
        version: 1,
        active: process.env.PDF_VAULT_ACTIVE_KEY || "v1",
        keys: JSON.parse(process.env.PDF_VAULT_KEYS || "{}"),
      });
    const sealed = await seal(payload, password);
    // Verify decryptability before writing either file. This is not offsite recovery proof.
    const restored = await open(sealed, password);
    if (JSON.stringify(restored) !== JSON.stringify(payload))
      throw Error("Backup verification failed");
    const backup = destination(file);
    if (output) destination(output);
    writeNew(backup, sealed + "\n");
    try {
      if (output) writeNew(output, envText(restored));
    } catch (e) {
      fs.unlinkSync(backup);
      throw e;
    }
    console.log(
      "Encrypted backup created and locally decrypted successfully. Store it and its passphrase separately; perform an independent restore before production use.",
    );
  } else {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > MAX) throw Error("Invalid backup");
    const payload = await open(fs.readFileSync(file, "utf8").trim(), password);
    if (command === "restore") writeNew(output, envText(payload));
    console.log(
      command === "restore"
        ? "Restored to a new owner-only environment file. No deployed configuration changed."
        : "Backup authentication and keyring validation passed. No deployed configuration changed.",
    );
  }
}
module.exports = {
  seal,
  open,
  validatePayload,
  destination,
  writeNew,
  envText,
};
if (require.main === module)
  main(process.argv.slice(2)).catch(() => {
    console.error(
      "Vault backup operation failed. Check arguments, passphrase, input and unused external output paths. No secret details are logged.",
    );
    process.exitCode = 1;
  });
