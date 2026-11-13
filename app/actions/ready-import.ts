"use server";
import { head, BlobNotFoundError } from "@vercel/blob";
import { randomUUID } from "crypto";
import { z } from "zod";
import { readyUploadActor, canManagePending } from "@/lib/ready-submissions";
import { db } from "@/lib/db";
import { readyMetadataSchema } from "@/lib/ready-papers";
import { validReadyPair } from "@/lib/ready-paper-catalog";
import { PENDING_PART, finalizeReadyPart } from "@/lib/ready-part-storage";
import { revalidatePath } from "next/cache";
export async function beginReadyPart(raw: unknown) {
  const actor = await readyUploadActor();
  const p = z
    .object({
      meta: readyMetadataSchema,
      groupId: z.string().uuid(),
      partIndex: z.number().int().min(1).max(500),
      start: z.number().int().min(1).max(500),
      end: z.number().int().min(1).max(500),
      rights: z.literal(true),
      submission: z.boolean().optional(),
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
  const userSubmission = !actor.admin || p.submission === true;
  const data = {
    key: PENDING_PART + id,
    value: JSON.stringify({
      ...p,
      ownerId: userSubmission ? actor.id : undefined,
      uploaderName: userSubmission ? actor.name : undefined,
      id,
      path,
      groupTitle: p.meta.title,
      meta: {
        ...p.meta,
        published: userSubmission ? false : p.meta.published,
        title: `${p.meta.title.slice(0, 135)} · Part ${p.partIndex}`,
      },
      at: new Date().toISOString(),
    }),
  };
  if (actor.admin) await db.setting.create({ data });
  else
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${actor.id}))`;
      const key = `readyuploadquota:v1:${actor.id}:${new Date().toISOString().slice(0, 10)}`;
      const previous = await tx.setting.findUnique({ where: { key } });
      const used = previous ? Number(previous.value) : 0;
      if (!Number.isInteger(used) || used >= 100)
        throw Error("আজকের ১০০ পার্ট upload সীমা শেষ। পরের দিন চেষ্টা করুন।");
      await tx.setting.upsert({
        where: { key },
        create: { key, value: String(used + 1) },
        update: { value: String(used + 1) },
      });
      await tx.setting.create({ data });
    });
  return { id, path };
}
export async function finishReadyPart(id: string, url: string) {
  const actor = await readyUploadActor();
  try {
    z.string().uuid().parse(id);
    const row = await db.setting.findUnique({
      where: { key: PENDING_PART + id },
    });
    if (!row || !canManagePending(actor, JSON.parse(row.value)))
      throw Error("Not owner");
    await finalizeReadyPart(id, url);
    revalidatePath("/ready-papers");
    revalidatePath("/admin/ready-papers");
    revalidatePath("/ready-papers/upload");
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Part যাচাই/সংরক্ষণ হয়নি। Retry করুন; আগের সফল পার্ট অক্ষত আছে।",
    };
  }
}

export async function resumeReadyPart(id: string) {
  const actor = await readyUploadActor();
  z.string().uuid().parse(id);
  const key = PENDING_PART + id;
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) throw Error("Missing session");
  const p = JSON.parse(row.value);
  if (!canManagePending(actor, p)) throw Error("Not owner");
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
