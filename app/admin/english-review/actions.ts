"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { validateEnglishDraft } from "@/lib/english/draft";
export async function decideEnglishRecovery(form: FormData) {
  if ((await auth())?.user?.role !== "ADMIN") throw new Error("Forbidden");
  const key = String(form.get("key") || "");
  const status = form.get("status");
  if (
    !/^english-review:[a-f0-9-]{36}$/.test(key) ||
    !["APPROVED", "REJECTED"].includes(String(status))
  )
    return;
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return;
  const record = JSON.parse(row.value);
  if (record.status !== "PENDING") return;
  validateEnglishDraft(record.draft);
  await db.setting.updateMany({
    where: { key, value: row.value },
    data: {
      value: JSON.stringify({
        ...record,
        status,
        reviewedAt: new Date().toISOString(),
      }),
    },
  });
  revalidatePath("/admin/english-review");
}
