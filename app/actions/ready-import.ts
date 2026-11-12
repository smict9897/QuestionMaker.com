"use server";
import { head, BlobNotFoundError } from "@vercel/blob";
import { randomUUID } from "crypto";
import { z } from "zod";
import { admin } from "@/lib/guard";
import { db } from "@/lib/db";
import { readyMetadataSchema } from "@/lib/ready-papers";
import { validReadyPair } from "@/lib/ready-paper-catalog";
import { PENDING_PART, finalizeReadyPart } from "@/lib/ready-part-storage";
import { revalidatePath } from "next/cache";
export async function beginReadyPart(raw: unknown) {
  await admin();
  const p = z
    .object({
      meta: readyMetadataSchema,
      groupId: z.string().uuid(),
      partIndex: z.number().int().min(1).max(500),
      start: z.number().int().min(1).max(500),
      end: z.number().int().min(1).max(500),
      rights: z.literal(true),
    })
    .parse(raw);
  if (
    p.end < p.start ||
    p.end - p.start >= 100 ||
    !validReadyPair(p.meta.grade, p.meta.subject)
  )
    throw Error("Invalid part metadata");
  const id = randomUUID(),
    path = `ready-papers/parts/${id}.pdf`;
  await db.setting.create({
    data: {
      key: PENDING_PART + id,
      value: JSON.stringify({
        ...p,
        id,
        path,
        groupTitle: p.meta.title,
        meta: {
          ...p.meta,
          title: `${p.meta.title.slice(0, 135)} · Part ${p.partIndex}`,
        },
        at: new Date().toISOString(),
      }),
    },
  });
  return { id, path };
}
export async function finishReadyPart(id: string, url: string) {
  await admin();
  try {
    z.string().uuid().parse(id);
    await finalizeReadyPart(id, url);
    revalidatePath("/ready-papers");
    revalidatePath("/admin/ready-papers");
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Part যাচাই/সংরক্ষণ হয়নি। Retry করুন; আগের সফল পার্ট অক্ষত আছে।",
    };
  }
}

export async function resumeReadyPart(id: string) {
  await admin();
  z.string().uuid().parse(id);
  const key = PENDING_PART + id;
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) throw Error("Missing session");
  const p = JSON.parse(row.value);
  try {
    const blob = await head(p.path);
    return { url: blob.url };
  } catch (e) {
    if (!(e instanceof BlobNotFoundError))
      throw Error("Storage সংযোগ যাচাই হয়নি। Retry করুন।");
  }
  await db.setting.update({
    where: { key },
    data: { value: JSON.stringify({ ...p, at: new Date().toISOString() }) },
  });
  return { url: null };
}
