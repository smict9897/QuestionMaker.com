"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  SUPPORT_PREFIX,
  supportInput,
  parseSupportTicket,
} from "@/lib/support-tickets";
import { revalidatePath } from "next/cache";
import { z } from "zod";
export type SupportState = { ok: boolean; message: string };
function refresh() {
  revalidatePath("/support");
  revalidatePath("/admin/support");
}
export async function createSupportTicket(
  _: SupportState,
  form: FormData,
): Promise<SupportState> {
  try {
    const userId = (await auth())?.user?.id;
    if (!userId) throw Error("Login");
    const input = supportInput.parse({
      id: form.get("id"),
      kind: form.get("kind"),
      title: form.get("title"),
      message: form.get("message"),
      consent: form.get("consent") === "on",
    });
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`support-rate:${userId}`}))`;
      if (
        !(await tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        }))
      )
        throw Error("Missing account");
      const key = SUPPORT_PREFIX + input.id;
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${key}))`;
      const existing = await tx.setting.findUnique({ where: { key } });
      if (existing) {
        const t = parseSupportTicket(key, existing.value);
        if (
          t.ownerId !== userId ||
          t.kind !== input.kind ||
          t.title !== input.title ||
          t.message !== input.message
        )
          throw Error("Changed request");
        return;
      }
      const now = new Date().toISOString(),
        rateKey = `support:rate:v1:${userId}:${now.slice(0, 10)}`,
        rate = await tx.setting.findUnique({ where: { key: rateKey } }),
        used = rate ? Number(rate.value) : 0;
      if (!Number.isSafeInteger(used) || used < 0 || used >= 5)
        throw Error("Rate limited");
      const { consent, ...content } = input;
      await tx.setting.create({
        data: {
          key,
          value: JSON.stringify({
            ...content,
            version: 1,
            ownerId: userId,
            revision: 1,
            status: "OPEN",
            createdAt: now,
            updatedAt: now,
          }),
        },
      });
      await tx.setting.create({
        data: {
          key: `support:owner:v1:${userId}:${input.id}`,
          value: JSON.stringify({ id: input.id }),
        },
      });
      if (rate)
        await tx.setting.update({
          where: { key: rateKey },
          data: { value: String(used + 1) },
        });
      else await tx.setting.create({ data: { key: rateKey, value: "1" } });
    });
    refresh();
    return {
      ok: true,
      message: "অনুরোধ সংরক্ষিত। এই পাতায় ফিরে উত্তর দেখুন; ইমেইল/SMS পাঠানো হয়নি।",
    };
  } catch {
    return {
      ok: false,
      message:
        "অনুরোধ সংরক্ষণ হয়নি। লগইন, সঠিক তথ্য ও সম্মতি যাচাই করুন। দিনে সর্বোচ্চ ৫টি নতুন অনুরোধ করা যায়।",
    };
  }
}
export async function reviewSupportTicket(
  _: SupportState,
  form: FormData,
): Promise<SupportState> {
  try {
    const reviewerId = (await auth())?.user?.id;
    if (!reviewerId) throw Error("Login");
    const input = z
      .object({
        id: z.string().uuid(),
        revision: z.coerce.number().int().positive(),
        reply: z.string().trim().min(10).max(3000),
        status: z.enum(["OPEN", "RESOLVED"]),
        confirmed: z.literal("on"),
      })
      .parse(Object.fromEntries(form));
    await db.$transaction(async (tx) => {
      const key = SUPPORT_PREFIX + input.id;
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${key}))`;
      if (
        (
          await tx.user.findUnique({
            where: { id: reviewerId },
            select: { role: true },
          })
        )?.role !== "ADMIN"
      )
        throw Error("Admin required");
      const row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw Error("Missing ticket");
      const current = parseSupportTicket(key, row.value);
      if (current.revision !== input.revision) throw Error("Stale revision");
      const updated = {
        ...current,
        revision: current.revision + 1,
        reply: input.reply,
        status: input.status,
        reviewerId,
        updatedAt: new Date().toISOString(),
      };
      await tx.setting.create({
        data: {
          key: `support:audit:v1:${input.id}:${updated.revision}`,
          value: JSON.stringify({ previous: current, next: updated }),
        },
      });
      await tx.setting.update({
        where: { key },
        data: { value: JSON.stringify(updated) },
      });
    });
    refresh();
    return {
      ok: true,
      message:
        "উত্তর ও অবস্থা সংরক্ষিত। এটি টাকা ফেরত, account deletion বা copyright takedown কার্যকর করে না।",
    };
  } catch {
    return {
      ok: false,
      message:
        "উত্তর সংরক্ষণ হয়নি। ADMIN অনুমতি, উত্তর ও সর্বশেষ revision যাচাই করুন।",
    };
  }
}
