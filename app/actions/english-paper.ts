"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createHash, randomUUID } from "crypto";
import { requestEnglishPaper } from "@/lib/english/provider";
import { resolveEnglishSelection } from "@/lib/english/selection";
import {
  validateEnglishDraft,
  englishOwnerPrefix,
  ownsEnglishDraft,
} from "@/lib/english/draft";
import { paperHeaderSchema } from "@/lib/paper-header";
async function owner() {
  const user = (await auth())?.user;
  return user?.id && (user.role === "ADMIN" || user.role === "TEACHER")
    ? user
    : null;
}
export async function generateEnglishPaper(raw: unknown) {
  const user = await owner();
  if (!user?.id)
    return {
      ok: false as const,
      error: "শিক্ষক বা অ্যাডমিন হিসেবে লগইন করুন।",
    };
  let acquired = false;
  const token = randomUUID(),
    lock = `englishai:lock:${createHash("sha256").update(user.id).digest("hex")}`;
  try {
    const request = resolveEnglishSelection(raw);
    if (JSON.stringify(raw).length > 150000)
      return { ok: false as const, error: "নির্বাচিত পাঠ্যাংশ অত্যন্ত বড়।" };
    if (!process.env.DEEPSEEK_API_KEY)
      return { ok: false as const, error: "Generation সংযোগ কনফিগার করা নেই।" };
    await db.setting.deleteMany({
      where: { key: lock, value: { lt: String(Date.now() - 180000) } },
    });
    try {
      await db.setting.create({
        data: { key: lock, value: `${Date.now()}:${token}` },
      });
      acquired = true;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      return {
        ok: false as const,
        error: "আপনার একটি generation চলছে। কিছুক্ষণ অপেক্ষা করুন।",
      };
    }
    const day = new Date().toISOString().slice(0, 10);
    let reserved = false;
    for (let i = 0; i < 10; i++) {
      try {
        await db.setting.create({
          data: {
            key: `englishai:quota:${createHash("sha256").update(user.id).digest("hex")}:${day}:${i}`,
            value: token,
          },
        });
        reserved = true;
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e;
      }
    }
    if (!reserved)
      return {
        ok: false as const,
        error: "আজকের English generation সীমা (১০ বার) শেষ।",
      };
    const generated = await requestEnglishPaper(request.selection, {
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    const header = paperHeaderSchema.parse({});
    for (const f of Object.values(header.fields)) f.enabled = false;
    Object.assign(header, { enabled: true });
    Object.assign(header.fields.institute, {
      enabled: true,
      value: "Your institution",
    });
    Object.assign(header.fields.program, {
      enabled: true,
      value: "Practice examination 2027",
    });
    Object.assign(header.fields.class, {
      enabled: true,
      value: `Class ${request.selection.grade}`,
    });
    Object.assign(header.fields.subject, {
      enabled: true,
      value: `English ${request.selection.paper === 1 ? "1st" : "2nd"} Paper`,
    });
    Object.assign(header.fields.fullMarks, {
      enabled: true,
      value: String(generated.total),
    });
    const draft = validateEnglishDraft({
      version: 1,
      name: `English ${request.selection.grade} — Paper ${request.selection.paper}`,
      selection: request.selection,
      output: generated.output,
      header,
      fontSize: 12,
      font: "serif",
      updatedAt: new Date().toISOString(),
    });
    const key = englishOwnerPrefix(user.id) + randomUUID();
    await db.setting.create({ data: { key, value: JSON.stringify(draft) } });
    return { ok: true as const, key };
  } catch {
    return {
      ok: false as const,
      error:
        "প্রশ্ন তৈরি বা সংরক্ষণ হয়নি। Output অসম্পূর্ণ বা ভুল হলে সেটি গ্রহণ করা হয় না। আবার চেষ্টা করলে দৈনিক সীমা থেকে আরেকবার গণনা হবে।",
    };
  } finally {
    if (acquired)
      await db.setting
        .deleteMany({ where: { key: lock, value: { endsWith: token } } })
        .catch(() => {});
  }
}
export async function loadEnglishPaper(key: string) {
  const user = await owner();
  if (!user?.id || !ownsEnglishDraft(key, user.id)) return null;
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return validateEnglishDraft(JSON.parse(row.value));
  } catch {
    return null;
  }
}
export async function listEnglishPapers() {
  const user = await owner();
  if (!user?.id) return [];
  const rows = await db.setting.findMany({
    where: { key: { startsWith: englishOwnerPrefix(user.id) } },
    take: 100,
    orderBy: { key: "desc" },
  });
  return rows.flatMap((row) => {
    try {
      const d = validateEnglishDraft(JSON.parse(row.value));
      return [{ key: row.key, name: d.name, updatedAt: d.updatedAt }];
    } catch {
      return [];
    }
  });
}
export async function saveEnglishPaper(key: string, raw: unknown) {
  const user = await owner();
  if (!user?.id || !ownsEnglishDraft(key, user.id))
    return { ok: false, error: "অনুমতি নেই।" };
  try {
    const draft = validateEnglishDraft(raw);
    const changed = await db.setting.updateMany({
      where: { key },
      data: {
        value: JSON.stringify({
          ...draft,
          updatedAt: new Date().toISOString(),
        }),
      },
    });
    return changed.count
      ? { ok: true }
      : { ok: false, error: "Draft পাওয়া যায়নি।" };
  } catch {
    return {
      ok: false,
      error: "সেভ হয়নি। প্রশ্নের কাঠামো, topic ও source অপরিবর্তিত রাখুন।",
    };
  }
}
