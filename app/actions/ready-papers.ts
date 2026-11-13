"use server";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { admin } from "@/lib/guard";
import {
  READY_PREFIX,
  readyMetadataSchema,
  readyRecordSchema,
  parseReady,
} from "@/lib/ready-papers";
import { validReadyPair } from "@/lib/ready-paper-catalog";
import { z } from "zod";
export async function uploadReadyPaper(fd: FormData) {
  await admin();
  let stage: "metadata" | "storage" | "database" | "refresh" = "metadata";
  const fail = (code: string, error: string) => ({
    ok: false as const,
    code,
    error,
  });
  try {
    const meta = readyMetadataSchema.parse({
      ...Object.fromEntries(fd),
      published: fd.get("published") === "on",
    });
    if (!validReadyPair(meta.grade, meta.subject))
      return fail(
        "CLASS_SUBJECT",
        "নির্বাচিত পরীক্ষার তালিকা থেকে সঠিক বিষয় নির্বাচন করুন।",
      );
    if (fd.get("rights") !== "on")
      return fail("RIGHTS", "প্রশ্নপত্র ব্যবহারের অনুমতি নিশ্চিত করুন।");
    const file = fd.get("file");
    if (
      !(file instanceof File) ||
      file.size < 5 ||
      file.size > 3_000_000 ||
      file.type !== "application/pdf"
    )
      return fail(
        "FILE",
        "সঠিক PDF ফাইল দিন; প্রতিটি part সর্বোচ্চ ৩ MB হতে পারবে।",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
      return fail("PDF", "ফাইলটি সঠিক PDF নয়। PDF হিসেবে export করে আবার দিন।");
    if (!process.env.BLOB_READ_WRITE_TOKEN?.trim())
      return fail(
        "STORAGE_CONFIG",
        "PDF storage যুক্ত নেই। Vercel-এ এই প্রজেক্টের জন্য public Blob store সংযুক্ত করে redeploy করুন।",
      );
    const id = randomUUID();
    stage = "storage";
    const blob = await put(`ready-papers/${id}.pdf`, Buffer.from(bytes), {
      access: "public",
      contentType: "application/pdf",
    });
    stage = "database";
    try {
      const record = readyRecordSchema.parse({
        ...meta,
        id,
        url: blob.url,
        at: new Date().toISOString(),
        presets: {},
      });
      await db.setting.create({
        data: { key: READY_PREFIX + id, value: JSON.stringify(record) },
      });
    } catch (e) {
      await del(blob.url).catch(() => {});
      throw e;
    }
    stage = "refresh";
    revalidatePath("/ready-papers");
    revalidatePath("/admin/ready-papers");
    return { ok: true as const, id };
  } catch {
    // Never return provider errors, credentials, source bytes or DB details to the browser.
    if (stage === "storage")
      return fail(
        "STORAGE",
        "PDF storage-এ upload হয়নি। Blob সংযোগ, token-এর অনুমতি ও storage quota পরীক্ষা করুন।",
      );
    if (stage === "database")
      return fail(
        "DATABASE",
        "PDF-এর তথ্য সংরক্ষণ হয়নি। ডাটাবেস সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
      );
    if (stage === "refresh") return { ok: true as const };
    return fail(
      "METADATA",
      "শিরোনাম, বিভাগ, পরীক্ষা, বিষয়, বছর (2000–2099) ও উৎস সঠিকভাবে পূরণ করুন।",
    );
  }
}
export async function updateReadyPaper(
  id: string,
  raw: unknown,
  presets?: unknown,
) {
  await admin();
  try {
    z.string().uuid().parse(id);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${id}))`;
      const row = await tx.setting.findUnique({
        where: { key: READY_PREFIX + id },
      });
      const old = row && parseReady(row.value);
      if (!old || old.deletedAt) throw Error();
      const record = readyRecordSchema.parse({
        ...old,
        ...readyMetadataSchema.parse(raw),
        presets: presets === undefined ? old.presets : presets,
      });
      if (
        (record.grade !== old.grade || record.subject !== old.subject) &&
        !validReadyPair(record.grade, record.subject)
      )
        throw Error("Invalid class/subject");
      if (old.ownerId && record.published && old.moderation !== "approved")
        throw Error("Approval required");
      await tx.setting.update({
        where: { key: READY_PREFIX + id },
        data: { value: JSON.stringify(record) },
      });
    });
    revalidatePath("/ready-papers");
    revalidatePath(`/ready-papers/${id}`);
    revalidatePath("/admin/ready-papers");
    revalidatePath("/ready-papers/upload");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Save হয়নি। তথ্য আবার যাচাই করুন।" };
  }
}

/** Archive one part only; preserve PDFs and purchases for existing owners. */
export async function deleteReadyPaper(id: string) {
  await admin();
  try {
    z.string().uuid().parse(id);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${id}))`;
      const row = await tx.setting.findUnique({
        where: { key: READY_PREFIX + id },
      });
      const old = row && parseReady(row.value);
      if (!old) throw Error("Missing");
      await tx.setting.update({
        where: { key: READY_PREFIX + id },
        data: {
          value: JSON.stringify({
            ...old,
            published: false,
            deletedAt: old.deletedAt || new Date().toISOString(),
          }),
        },
      });
    });
    revalidatePath("/ready-papers");
    revalidatePath("/admin/ready-papers");
    revalidatePath("/ready-papers/upload");
    revalidatePath(`/ready-papers/${id}`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Delete হয়নি। আবার চেষ্টা করুন।" };
  }
}
