import "server-only";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { put, del } from "@vercel/blob";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  vaultConfigured,
  pdfDigest,
  encryptVaultPdf,
  decryptVaultPdf,
  fetchBoundedBlob,
  trustedBlobUrl,
  VAULT_MAX_PDF,
} from "@/lib/pdf-vault";
export const RESOURCE_PRIVATE_PREFIX = "private-resource:v1:";
const schema = z
  .object({
    version: z.literal(1),
    resourceId: z.string().min(1).max(100),
    ownerId: z.string(),
    receiptId: z.string().regex(/^[a-f0-9]{64}$/),
    originHash: z.string().regex(/^[a-f0-9]{64}$/),
    keyId: z.string(),
    url: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().min(5).max(VAULT_MAX_PDF),
    pages: z.number().int().min(1).max(100),
    createdAt: z.string().datetime(),
  })
  .strict();
export type ResourceVault = z.infer<typeof schema>;
export const resourceVaultKey = (id: string) => `resource-vault:v1:${id}`;
export const privateResourceMarker = (id: string) =>
  RESOURCE_PRIVATE_PREFIX + id;
export function parseResourceVault(raw: string, id: string) {
  const m = schema.parse(JSON.parse(raw));
  if (
    m.resourceId !== id ||
    m.ownerId !== `resource:${id}` ||
    m.receiptId !== pdfDigest(Buffer.from(id)) ||
    m.originHash !== m.sha256
  )
    throw Error("Manifest mismatch");
  trustedBlobUrl(m.url, true);
  return m;
}
export async function prepareResourcePdf(id: string, bytes: Uint8Array) {
  if (!vaultConfigured() || id.length > 100 || bytes.length > VAULT_MAX_PDF)
    throw Error("Vault unavailable or PDF too large");
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = pdf.getPageCount();
  if (pages < 1 || pages > 100) throw Error("Page limit");
  const binding = {
      ownerId: `resource:${id}`,
      receiptId: pdfDigest(Buffer.from(id)),
      originHash: pdfDigest(bytes),
    },
    encrypted = encryptVaultPdf(bytes, binding);
  const blob = await put(`pdf-vault/${randomUUID()}.bin`, encrypted.bytes, {
    access: "public",
    contentType: "application/octet-stream",
    addRandomSuffix: false,
  });
  try {
    const m = parseResourceVault(
      JSON.stringify({
        ...binding,
        version: 1,
        resourceId: id,
        keyId: encrypted.keyId,
        url: blob.url,
        sha256: encrypted.sha256,
        size: bytes.length,
        pages,
        createdAt: new Date().toISOString(),
      }),
      id,
    );
    // Verify provider read + decryption before switching any existing resource to private delivery.
    decryptVaultPdf(await fetchBoundedBlob(m.url, m.size + 32, true), {
      ...m,
      sourceSha256: m.sha256,
      selected: [1],
    });
    return m;
  } catch (e) {
    await del(blob.url).catch(() => {});
    throw e;
  }
}
export async function discardResourcePdf(m: ResourceVault) {
  await del(m.url).catch(() => {});
}
async function requireAdmin(tx: Prisma.TransactionClient, actorId: string) {
  if (
    (
      await tx.user.findUnique({
        where: { id: actorId },
        select: { role: true },
      })
    )?.role !== "ADMIN"
  )
    throw Error("Admin required");
}
export async function migrateResourcePdf(actorId: string, id: string) {
  if (!id || id.length > 100 || !vaultConfigured()) throw Error("Unavailable");
  const source = await db.$transaction(async (tx) => {
    await requireAdmin(tx, actorId);
    const row = await tx.resource.findUnique({ where: { id } });
    if (!row || row.priceBdt <= 0 || row.category === "Video")
      throw Error("Ineligible");
    if (row.fileUrl === privateResourceMarker(id)) {
      const m = await tx.setting.findUnique({
        where: { key: resourceVaultKey(id) },
      });
      if (!m) throw Error("Missing manifest");
      parseResourceVault(m.value, id);
      return null;
    }
    trustedBlobUrl(row.fileUrl);
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`resource-vault-rate:${actorId}`}))`;
    const rateKey = `resource-vault:attempt:v1:${actorId}:${new Date().toISOString().slice(0, 10)}`,
      rate = await tx.setting.findUnique({ where: { key: rateKey } }),
      used = rate ? Number(rate.value) : 0;
    if (!Number.isSafeInteger(used) || used < 0 || used >= 10)
      throw Error("Daily limit");
    if (rate)
      await tx.setting.update({
        where: { key: rateKey },
        data: { value: String(used + 1) },
      });
    else await tx.setting.create({ data: { key: rateKey, value: "1" } });
    return row;
  });
  if (!source) return;
  const bytes = await fetchBoundedBlob(source.fileUrl, VAULT_MAX_PDF),
    m = await prepareResourcePdf(id, bytes);
  let keep = false;
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${resourceVaultKey(id)}))`;
      await requireAdmin(tx, actorId);
      const current = await tx.resource.findUnique({ where: { id } });
      if (
        !current ||
        current.fileUrl !== source.fileUrl ||
        current.priceBdt <= 0 ||
        current.category === "Video"
      )
        throw Error("Source changed");
      await tx.setting.create({
        data: { key: resourceVaultKey(id), value: JSON.stringify(m) },
      });
      await tx.resource.update({
        where: { id },
        data: { fileUrl: privateResourceMarker(id) },
      });
      await tx.setting.create({
        data: {
          key: `resource-vault:migration:v1:${id}`,
          value: JSON.stringify({
            version: 1,
            actorId,
            sourceUrl: source.fileUrl,
            sourceSha256: m.sha256,
            at: m.createdAt,
            originalRetired: false,
          }),
        },
      });
    });
    keep = true;
  } finally {
    if (!keep) await discardResourcePdf(m);
  }
}
export async function readPrivateResource(actorId: string | null, id: string) {
  async function permission() {
    return db.$transaction(
      async (tx) => {
        const resource = await tx.resource.findUnique({ where: { id } });
        if (!resource || resource.fileUrl !== privateResourceMarker(id))
          throw Error("Unavailable");
        if (resource.priceBdt !== 0) {
          if (!actorId) throw Error("Forbidden");
          const user = await tx.user.findUnique({
            where: { id: actorId },
            select: { role: true },
          });
          if (!user) throw Error("Forbidden");
          if (
            user.role !== "ADMIN" &&
            !(await tx.purchase.findFirst({
              where: { userId: actorId, resourceId: id, status: "PAID" },
            }))
          )
            throw Error("Forbidden");
        }
        if (!Number.isSafeInteger(resource.priceBdt) || resource.priceBdt < 0)
          throw Error("Invalid price");
        const row = await tx.setting.findUnique({
          where: { key: resourceVaultKey(id) },
        });
        if (!row) throw Error("Unavailable");
        return parseResourceVault(row.value, id);
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  const m = await permission(),
    ciphertext = await fetchBoundedBlob(m.url, m.size + 32, true),
    bytes = decryptVaultPdf(ciphertext, {
      ...m,
      sourceSha256: m.sha256,
      selected: [1],
    });
  const current = await permission();
  if (current.sha256 !== m.sha256 || current.url !== m.url)
    throw Error("Changed source");
  return bytes;
}
