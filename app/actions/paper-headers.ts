"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { paperHeaderSchema, type PaperHeaderConfig } from "@/lib/paper-header";
import { randomUUID } from "crypto";
export type SavedHeader = { id: string; header: PaperHeaderConfig };
async function ownerPrefix() {
  const id = (await auth())?.user?.id;
  if (!id) throw new Error("হেডার সেভ করতে লগইন করুন।");
  return `qbheader:${id}:`;
}
export async function listPaperHeaders(): Promise<
  { ok: true; items: SavedHeader[] } | { ok: false; error: string }
> {
  try {
    const prefix = await ownerPrefix();
    const rows = await db.setting.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { key: "asc" },
    });
    const items = rows.flatMap((row) => {
      try {
        const p = paperHeaderSchema.safeParse(JSON.parse(row.value));
        return p.success
          ? [{ id: row.key.slice(prefix.length), header: p.data }]
          : [];
      } catch {
        return [];
      }
    });
    return { ok: true, items };
  } catch {
    return { ok: false, error: "সেভ করা হেডার লোড হয়নি। আবার চেষ্টা করুন।" };
  }
}
export async function savePaperHeader(
  raw: unknown,
  id?: string,
): Promise<{ ok: true; item: SavedHeader } | { ok: false; error: string }> {
  const parsed = paperHeaderSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.name.trim())
    return { ok: false, error: "হেডারের নাম দিন (সর্বোচ্চ ১২০ অক্ষর)।" };
  if (id && !/^[a-zA-Z0-9-]{1,100}$/.test(id))
    return { ok: false, error: "অবৈধ হেডার।" };
  try {
    const prefix = await ownerPrefix();
    const key = id || randomUUID();
    const header = { ...parsed.data, enabled: true, templateId: key };
    if (id) {
      const existing = await db.setting.findUnique({
        where: { key: prefix + id },
      });
      if (!existing)
        return {
          ok: false,
          error: "হেডারটি পাওয়া যায়নি। তালিকা রিফ্রেশ করুন।",
        };
      await db.setting.update({
        where: { key: prefix + id },
        data: { value: JSON.stringify(header) },
      });
    } else
      await db.setting.create({
        data: { key: prefix + key, value: JSON.stringify(header) },
      });
    return { ok: true, item: { id: key, header } };
  } catch {
    return { ok: false, error: "হেডার সেভ হয়নি। আবার চেষ্টা করুন।" };
  }
}
