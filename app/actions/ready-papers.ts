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
  try {
    const meta = readyMetadataSchema.parse({
      ...Object.fromEntries(fd),
      published: fd.get("published") === "on",
    });
    if (!validReadyPair(meta.grade, meta.subject))
      throw Error("Invalid class/subject");
    if (fd.get("rights") !== "on") throw Error("ব্যবহারের অনুমতি নিশ্চিত করুন।");
    const file = fd.get("file");
    if (
      !(file instanceof File) ||
      file.size < 5 ||
      file.size > 3_000_000 ||
      file.type !== "application/pdf"
    )
      throw Error("সর্বোচ্চ ৩ MB PDF দিন।");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
      throw Error("সঠিক PDF নয়।");
    const id = randomUUID();
    const blob = await put(`ready-papers/${id}.pdf`, Buffer.from(bytes), {
      access: "public",
      contentType: "application/pdf",
    });
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
    revalidatePath("/ready-papers");
    revalidatePath("/admin/ready-papers");
    return { ok: true as const, id };
  } catch {
    return {
      ok: false as const,
      error:
        "Upload হয়নি। PDF (৩ MB), metadata, অনুমতি ও Blob storage configuration পরীক্ষা করুন।",
    };
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
    const row = await db.setting.findUnique({
      where: { key: READY_PREFIX + id },
    });
    const old = row && parseReady(row.value);
    if (!old) throw Error();
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
    await db.setting.update({
      where: { key: READY_PREFIX + id },
      data: { value: JSON.stringify(record) },
    });
    revalidatePath("/ready-papers");
    revalidatePath(`/ready-papers/${id}`);
    revalidatePath("/admin/ready-papers");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Save হয়নি। তথ্য আবার যাচাই করুন।" };
  }
}
