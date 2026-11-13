"use server";
import { admin } from "@/lib/guard";
import { db } from "@/lib/db";
import { readyUploadActor } from "@/lib/ready-submissions";
import {
  READY_PREFIX,
  parseReady,
  readyMetadataSchema,
} from "@/lib/ready-papers";
import { validReadyPair } from "@/lib/ready-paper-catalog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
function refresh(id: string) {
  for (const path of [
    "/ready-papers",
    "/ready-papers/upload",
    "/admin/ready-papers",
    `/ready-papers/${id}`,
  ])
    revalidatePath(path);
}
export async function reviewReadySubmission(raw: unknown) {
  const reviewer = await admin();
  try {
    const input = z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "changes", "rejected"]),
        note: z.string().trim().max(1000),
        reviewed: z.literal(true),
        revision: z.string(),
      })
      .parse(raw);
    if (input.decision !== "approved" && !input.note) throw Error("কারণ লিখুন।");
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${input.id}))`;
      const row = await tx.setting.findUnique({
          where: { key: READY_PREFIX + input.id },
        }),
        p = row && parseReady(row.value);
      if (
        !p?.ownerId ||
        p.deletedAt ||
        `${p.at}:${p.reviewedAt || ""}` !== input.revision
      )
        throw Error("ফাইলের তথ্য বদলেছে। আবার preview খুলুন।");
      await tx.setting.update({
        where: { key: READY_PREFIX + input.id },
        data: {
          value: JSON.stringify({
            ...p,
            moderation: input.decision,
            published: input.decision === "approved",
            reviewNote: input.note,
            reviewedBy: reviewer.id,
            reviewedAt: new Date().toISOString(),
          }),
        },
      });
    });
    refresh(input.id);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "সিদ্ধান্ত সংরক্ষণ হয়নি। কারণ, preview ও সর্বশেষ তথ্য যাচাই করুন।",
    };
  }
}
export async function reviseReadySubmission(id: string, raw: unknown) {
  const actor = await readyUploadActor();
  try {
    z.string().uuid().parse(id);
    const meta = readyMetadataSchema.parse(raw);
    if (!validReadyPair(meta.grade, meta.subject))
      throw Error("Invalid subject");
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${id}))`;
      const row = await tx.setting.findUnique({
          where: { key: READY_PREFIX + id },
        }),
        p = row && parseReady(row.value);
      if (
        !p ||
        p.ownerId !== actor.id ||
        p.deletedAt ||
        p.moderation === "approved"
      )
        throw Error("Not editable");
      await tx.setting.update({
        where: { key: READY_PREFIX + id },
        data: {
          value: JSON.stringify({
            ...p,
            ...meta,
            published: false,
            moderation: "pending",
            reviewNote: undefined,
            reviewedAt: undefined,
            reviewedBy: undefined,
            at: new Date().toISOString(),
          }),
        },
      });
    });
    refresh(id);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "তথ্য সংশোধন হয়নি। নিজের অপ্রকাশিত PDF-এর সঠিক তথ্য দিন।",
    };
  }
}
