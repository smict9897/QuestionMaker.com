import { UPLOAD_INDEX, REVIEW_INDEX } from "./ready-submissions";
import { db } from "@/lib/db";
import { head } from "@vercel/blob";
import { PDFDocument } from "pdf-lib";
import { readyRecordSchema, READY_PREFIX } from "./ready-papers";
export const PENDING_PART = "readypartpending:v1:";
export async function finalizeReadyPart(id: string, url: string) {
  const row = await db.setting.findUnique({
    where: { key: PENDING_PART + id },
  });
  if (!row) throw Error("Upload session নেই।");
  const pending = JSON.parse(row.value);
  const existing = await db.setting.findUnique({
    where: { key: READY_PREFIX + id },
  });
  if (existing) return;
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    !u.hostname.endsWith(".public.blob.vercel-storage.com") ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/" + pending.path
  )
    throw Error("Invalid storage URL");
  const info = await head(url);
  if (
    info.pathname !== pending.path ||
    info.size > 10_000_000 ||
    info.contentType !== "application/pdf"
  )
    throw Error("Part limit exceeded");
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error("PDF unavailable");
  // Bounded stream: never trust a remote Content-Length alone.
  const reader = response.body?.getReader();
  if (!reader) throw Error("PDF unavailable");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 10_000_000) throw Error("Part too large");
      chunks.push(r.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw Error("Not PDF");
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPageCount();
  if (pages < 1 || pages > 100 || pages !== pending.end - pending.start + 1)
    throw Error("Invalid page count");
  const record = readyRecordSchema.parse({
    ...pending.meta,
    ownerId: pending.ownerId,
    uploaderName: pending.uploaderName,
    moderation: pending.ownerId ? "pending" : undefined,
    published: pending.ownerId ? false : pending.meta.published,
    id,
    url,
    at: pending.at,
    presets: {},
    groupId: pending.groupId,
    groupTitle: pending.groupTitle,
    partIndex: pending.partIndex,
    pageStart: pending.start,
    pageEnd: pending.end,
  });
  await db.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key: READY_PREFIX + id },
      create: { key: READY_PREFIX + id, value: JSON.stringify(record) },
      update: {},
    });
    if (record.ownerId) {
      for (const key of [
        `${UPLOAD_INDEX}${record.ownerId}:${id}`,
        `${REVIEW_INDEX}${id}`,
      ])
        await tx.setting.upsert({
          where: { key },
          create: { key, value: JSON.stringify({ id }) },
          update: {},
        });
    }
  });
}
