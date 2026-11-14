import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";

export const VAULT_MAX_PDF = 3_000_000;
export const VAULT_MAX_SOURCE = 10_000_000;
const MAGIC = Buffer.from("PBV1");
export const pdfDigest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export const vaultManifestSchema = z
  .object({
    version: z.literal(1),
    ownerId: z.string().min(1).max(200),
    receiptId: z.string().regex(/^[a-f0-9]{64}$/),
    originHash: z.string().regex(/^[a-f0-9]{64}$/),
    keyId: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
    url: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().min(5).max(VAULT_MAX_PDF),
    pages: z.number().int().min(1).max(10),
    selected: z.array(z.number().int().min(1).max(100)).min(1).max(10),
    createdAt: z.string().datetime(),
  })
  .strict();
export type VaultManifest = z.infer<typeof vaultManifestSchema>;
export function vaultKey(ownerId: string, receiptId: string) {
  if (!ownerId || ownerId.length > 200 || !/^[a-f0-9]{64}$/.test(receiptId))
    throw Error("Invalid identity");
  return `readyvault:v1:${ownerId}:${receiptId}`;
}
// Keep old keys when rotating. Missing keys fail closed; no plaintext fallback.
function keyring() {
  const keys: unknown = JSON.parse(process.env.PDF_VAULT_KEYS || "{}");
  return z
    .record(
      z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
      z.string().regex(/^[a-fA-F0-9]{64}$/),
    )
    .parse(keys);
}
export function activeVaultKey() {
  const id = process.env.PDF_VAULT_ACTIVE_KEY || "v1";
  const key = keyring()[id];
  if (!key) throw Error("Vault not configured");
  return { id, key: Buffer.from(key, "hex") };
}
export function vaultConfigured() {
  try {
    activeVaultKey();
    return !!process.env.BLOB_READ_WRITE_TOKEN?.trim();
  } catch {
    return false;
  }
}
function aad(
  m: Pick<
    VaultManifest,
    "ownerId" | "receiptId" | "originHash" | "sha256" | "keyId"
  >,
) {
  return Buffer.from(
    JSON.stringify([
      "Proshnobook PDF vault v1",
      m.ownerId,
      m.receiptId,
      m.originHash,
      m.sha256,
      m.keyId,
    ]),
  );
}
export function encryptVaultPdf(
  bytes: Uint8Array,
  binding: Pick<VaultManifest, "ownerId" | "receiptId" | "originHash">,
) {
  if (
    bytes.length > VAULT_MAX_PDF ||
    Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-"
  )
    throw Error("Invalid PDF");
  const { id: keyId, key } = activeVaultKey(),
    nonce = randomBytes(12),
    sha256 = pdfDigest(bytes);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad({ ...binding, keyId, sha256 }));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    bytes: Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext]),
    keyId,
    sha256,
  };
}
export function decryptVaultPdf(bytes: Uint8Array, m: VaultManifest) {
  if (
    bytes.length !== m.size + 32 ||
    !Buffer.from(bytes.subarray(0, 4)).equals(MAGIC)
  )
    throw Error("Invalid ciphertext");
  const key = keyring()[m.keyId];
  if (!key) throw Error("Key unavailable");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    bytes.subarray(4, 16),
  );
  decipher.setAuthTag(bytes.subarray(16, 32));
  decipher.setAAD(aad(m));
  const pdf = Buffer.concat([
    decipher.update(bytes.subarray(32)),
    decipher.final(),
  ]);
  if (pdfDigest(pdf) !== m.sha256 || pdf.subarray(0, 5).toString() !== "%PDF-")
    throw Error("Integrity failed");
  return pdf;
}
export function trustedBlobUrl(raw: string, vaultOnly = false) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    !/^[a-zA-Z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(u.hostname) ||
    u.port ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (vaultOnly &&
      !/^\/pdf-vault\/[a-f0-9-]+(?:-[a-zA-Z0-9]+)?\.bin$/.test(u.pathname))
  )
    throw Error("Untrusted storage");
  return u.href;
}
/** No redirects, no content-length trust, bounded streaming and one deadline for headers + body. */
export async function fetchBoundedBlob(
  url: string,
  maximum: number,
  vaultOnly = false,
) {
  const response = await fetch(trustedBlobUrl(url, vaultOnly), {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.body) throw Error("Storage unavailable");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) throw Error("File too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks, size);
}
