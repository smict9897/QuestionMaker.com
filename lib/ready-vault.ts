import "server-only";
import { randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { PDFDocument, PDFName } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { walletTransaction } from "@/lib/wallet";
import { readReadyOrigin, readyOriginKey } from "@/lib/ready-origin";
import {
  activeVaultKey,
  decryptVaultPdf,
  encryptVaultPdf,
  fetchBoundedBlob,
  pdfDigest,
  trustedBlobUrl,
  vaultKey,
  vaultManifestSchema,
  VAULT_MAX_PDF,
  VAULT_MAX_SOURCE,
  type VaultManifest,
} from "@/lib/pdf-vault";

async function binding(
  tx: Prisma.TransactionClient,
  ownerId: string,
  receiptId: string,
) {
  vaultKey(ownerId, receiptId);
  const row = await tx.setting.findUnique({
    where: { key: `readyowned:v1:${ownerId}:${receiptId}` },
  });
  if (!row) throw Error("Unavailable");
  const receipt = JSON.parse(row.value);
  if (
    receipt.ownerId !== ownerId ||
    receipt.id !== receiptId ||
    receipt.refundedAt !== undefined ||
    typeof receipt.originHash !== "string"
  )
    throw Error("Unverified receipt");
  const source = await tx.setting.findUnique({
    where: { key: readyOriginKey(ownerId, receiptId) },
  });
  if (!source) throw Error("Unverified origin");
  const origin = readReadyOrigin(
    source.value,
    ownerId,
    receiptId,
    receipt.originHash,
  );
  if (origin.source.id !== receipt.paperId) throw Error("Source mismatch");
  return { origin, originHash: receipt.originHash as string };
}
function manifest(
  raw: string,
  ownerId: string,
  receiptId: string,
  b: Awaited<ReturnType<typeof binding>>,
) {
  const m = vaultManifestSchema.parse(JSON.parse(raw));
  if (
    m.ownerId !== ownerId ||
    m.receiptId !== receiptId ||
    m.originHash !== b.originHash ||
    m.pages !== b.origin.selected.length ||
    JSON.stringify(m.selected) !== JSON.stringify(b.origin.selected)
  )
    throw Error("Manifest mismatch");
  trustedBlobUrl(m.url, true);
  return m;
}
/** Explicit, additive source checkpoint. Does not charge, authorize resale, or alter the editable draft. */
export async function captureReadyVault(ownerId: string, receiptId: string) {
  activeVaultKey();
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim())
    throw Error("Storage unavailable");
  const key = vaultKey(ownerId, receiptId);
  const prepared = await walletTransaction(async (tx) => {
    const b = await binding(tx, ownerId, receiptId);
    const old = await tx.setting.findUnique({ where: { key } });
    if (old) {
      manifest(old.value, ownerId, receiptId, b);
      return { b, existing: true };
    }
    // Per-account/day attempt cap bounds provider work even on repeated failures/concurrent requests.
    const day = new Date().toISOString().slice(0, 10),
      rateKey = `readyvault-attempt:v1:${ownerId}:${day}`;
    const rate = await tx.setting.findUnique({ where: { key: rateKey } });
    const used = rate ? Number(rate.value) : 0;
    if (!Number.isSafeInteger(used) || used < 0 || used >= 10)
      throw Error("Daily limit");
    await tx.setting.upsert({
      where: { key: rateKey },
      create: { key: rateKey, value: String(used + 1) },
      update: { value: String(used + 1) },
    });
    return { b, existing: false };
  });
  if (prepared.existing) return;
  const bytes = await fetchBoundedBlob(
    prepared.b.origin.source.url,
    VAULT_MAX_SOURCE,
  );
  if (bytes.subarray(0, 5).toString() !== "%PDF-")
    throw Error("Invalid source");
  const original = await PDFDocument.load(bytes, { updateMetadata: false });
  if (original.getPageCount() > 100) throw Error("Too many pages");
  const selected = prepared.b.origin.selected;
  if (selected.some((n) => n > original.getPageCount()))
    throw Error("Invalid selection");
  const pdf = await PDFDocument.create();
  for (const page of await pdf.copyPages(
    original,
    selected.map((n) => n - 1),
  )) {
    // Do not preserve source annotations/actions/forms/attachments in a delivered checkpoint.
    for (const name of ["Annots", "AA", "Metadata", "PieceInfo"])
      page.node.delete(PDFName.of(name));
    pdf.addPage(page);
  }
  const output = await pdf.save({ useObjectStreams: true });
  if (output.length > VAULT_MAX_PDF) throw Error("Output too large");
  const encrypted = encryptVaultPdf(output, {
    ownerId,
    receiptId,
    originHash: prepared.b.originHash,
  });
  const blob = await put(`pdf-vault/${randomUUID()}.bin`, encrypted.bytes, {
    access: "public",
    contentType: "application/octet-stream",
    addRandomSuffix: false,
  });
  let keep = false;
  try {
    const m: VaultManifest = vaultManifestSchema.parse({
      version: 1,
      ownerId,
      receiptId,
      originHash: prepared.b.originHash,
      keyId: encrypted.keyId,
      url: blob.url,
      sha256: encrypted.sha256,
      sourceSha256: pdfDigest(bytes),
      size: output.length,
      pages: selected.length,
      selected,
      createdAt: new Date().toISOString(),
    });
    trustedBlobUrl(m.url, true);
    keep = await walletTransaction(async (tx) => {
      const current = await binding(tx, ownerId, receiptId);
      if (current.originHash !== prepared.b.originHash)
        throw Error("Source changed");
      const existing = await tx.setting.findUnique({ where: { key } });
      if (existing) {
        manifest(existing.value, ownerId, receiptId, current);
        return false;
      }
      await tx.setting.create({ data: { key, value: JSON.stringify(m) } });
      return true;
    });
  } finally {
    if (!keep) await del(blob.url).catch(() => {});
  }
}
export async function deliverReadyVault(ownerId: string, receiptId: string) {
  const m = await db.$transaction(
    async (tx) => {
      const b = await binding(tx, ownerId, receiptId);
      const row = await tx.setting.findUnique({
        where: { key: vaultKey(ownerId, receiptId) },
      });
      if (!row) throw Error("Unavailable");
      return manifest(row.value, ownerId, receiptId, b);
    },
    { isolationLevel: "RepeatableRead" },
  );
  const ciphertext = await fetchBoundedBlob(m.url, m.size + 32, true);
  const pdf = decryptVaultPdf(ciphertext, m);
  // Recheck revocation after storage I/O, before returning bytes.
  const latest = await db.$transaction((tx) => binding(tx, ownerId, receiptId));
  if (latest.originHash !== m.originHash) throw Error("Source changed");
  return pdf;
}
