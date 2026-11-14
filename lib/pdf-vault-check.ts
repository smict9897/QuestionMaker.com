import "server-only";
import { randomUUID, randomBytes } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  vaultConfigured,
  encryptVaultPdf,
  decryptVaultPdf,
  fetchBoundedBlob,
  trustedBlobUrl,
  pdfDigest,
} from "@/lib/pdf-vault";

export async function runPdfVaultCheck(actorId: string) {
  // Reserve once per minute across admins/tabs. No wallet/receipt/source changes.
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"pdf-vault:diagnostic"}))`;
    if (
      (
        await tx.user.findUnique({
          where: { id: actorId },
          select: { role: true },
        })
      )?.role !== "ADMIN"
    )
      throw Error("Forbidden");
    if (!vaultConfigured()) throw Error("Configuration unavailable");
    const key = "pdf-vault:diagnostic:last-attempt:v1",
      row = await tx.setting.findUnique({ where: { key } }),
      last = row ? Number(row.value) : 0,
      now = Date.now();
    if (!Number.isSafeInteger(last) || last < 0 || now - last < 60000)
      throw Error("Try later");
    if (row)
      await tx.setting.update({ where: { key }, data: { value: String(now) } });
    else await tx.setting.create({ data: { key, value: String(now) } });
  });
  const id = randomUUID();
  let url: string | undefined,
    verified = false,
    cleanup = false;
  try {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 200]);
    const bytes = await pdf.save();
    const binding = {
      ownerId: actorId,
      receiptId: randomBytes(32).toString("hex"),
      originHash: randomBytes(32).toString("hex"),
    };
    const encrypted = encryptVaultPdf(bytes, binding);
    const blob = await put(`pdf-vault/${id}.bin`, encrypted.bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
    url = blob.url;
    trustedBlobUrl(url, true);
    const downloaded = await fetchBoundedBlob(
      url,
      encrypted.bytes.length,
      true,
    );
    const restored = decryptVaultPdf(downloaded, {
      ...binding,
      version: 1,
      keyId: encrypted.keyId,
      url,
      sha256: encrypted.sha256,
      sourceSha256: pdfDigest(bytes),
      size: bytes.length,
      pages: 1,
      selected: [1],
      createdAt: new Date().toISOString(),
    });
    verified =
      pdfDigest(restored) === pdfDigest(bytes) &&
      (await PDFDocument.load(restored)).getPageCount() === 1;
  } catch {
    verified = false;
  } finally {
    if (url)
      try {
        await del(url);
        cleanup = true;
      } catch {
        cleanup = false;
      }
  }
  // Store orphan ciphertext location privately only if cleanup failed. Never return it.
  await db.setting.create({
    data: {
      key: `pdf-vault:diagnostic:audit:v1:${id}`,
      value: JSON.stringify({
        version: 1,
        actorId,
        at: new Date().toISOString(),
        verified,
        cleanup,
        ...(url && !cleanup ? { orphanUrl: url } : {}),
      }),
    },
  });
  return { verified, cleanup };
}
