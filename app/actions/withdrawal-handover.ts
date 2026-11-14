"use server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { walletTransaction } from "@/lib/wallet";
import {
  parseWithdrawal,
  assertWithdrawalClaim,
} from "@/lib/wallet-withdrawal";
import {
  handoverKey,
  parseHandover,
  handoverSchema,
} from "@/lib/withdrawal-handover";
import { revalidatePath } from "next/cache";
export async function manageWithdrawalHandover(
  _: { ok: boolean; message: string },
  form: FormData,
) {
  try {
    const actor = (await auth())?.user?.id,
      key = String(form.get("key") || ""),
      mode = String(form.get("mode") || "");
    if (
      !actor ||
      form.get("confirmed") !== "on" ||
      !["OFFER", "ACCEPT", "CANCEL"].includes(mode)
    )
      throw Error("Invalid input");
    const pointer = handoverKey(key);
    await walletTransaction(async (tx) => {
      if (
        (
          await tx.user.findUnique({
            where: { id: actor },
            select: { role: true },
          })
        )?.role !== "ADMIN"
      )
        throw Error("Admin required");
      const row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw Error("Missing request");
      const r = parseWithdrawal(key, row.value);
      if (
        r.status !== "HELD" ||
        !r.claimedBy ||
        !r.claimedAt ||
        (
          await tx.setting.findUnique({
            where: { key: `wallet:withdrawal-active:v1:${r.userId}` },
          })
        )?.value !== key
      )
        throw Error("Invalid hold");
      const claimKey = `wallet:withdrawal-claim:v1:${r.userId}:${r.id}`,
        claim = await tx.setting.findUnique({ where: { key: claimKey } });
      assertWithdrawalClaim(claim?.value, key, r);
      const previous = await tx.setting.findUnique({ where: { key: pointer } }),
        old = previous ? parseHandover(previous.value, key) : null;
      const now = new Date().toISOString();
      if (mode === "OFFER") {
        const to = String(form.get("to") || ""),
          note = String(form.get("note") || "").trim();
        if (
          r.claimedBy !== actor ||
          String(form.get("claimHandoverId") || "") !== (r.handoverId || "") ||
          String(form.get("claimedAt") || "") !== r.claimedAt ||
          old?.status === "PENDING" ||
          to === actor ||
          to === r.userId ||
          to.length > 200 ||
          (
            await tx.user.findUnique({
              where: { id: to },
              select: { role: true },
            })
          )?.role !== "ADMIN"
        )
          throw Error("Cannot offer");
        const h = handoverSchema.parse({
          version: 1,
          id: randomUUID(),
          requestKey: key,
          from: actor,
          to,
          claimedAt: r.claimedAt,
          note,
          createdAt: now,
          status: "PENDING",
        });
        await tx.setting.create({
          data: {
            key: `wallet:withdrawal-handover-audit:v1:${h.id}:OFFER`,
            value: JSON.stringify({
              ...h,
              previousClaim: JSON.parse(claim!.value),
            }),
          },
        });
        if (previous)
          await tx.setting.update({
            where: { key: pointer },
            data: { value: JSON.stringify(h) },
          });
        else
          await tx.setting.create({
            data: { key: pointer, value: JSON.stringify(h) },
          });
      } else {
        if (
          !old ||
          String(form.get("handoverId") || "") !== old.id ||
          old.status !== "PENDING" ||
          r.claimedBy !== old.from ||
          r.claimedAt !== old.claimedAt
        )
          throw Error("Stale proposal");
        if (mode === "CANCEL" ? actor !== old.from : actor !== old.to)
          throw Error("Wrong actor");
        // A fresh recipient role check is required even when the offer was made by an admin.
        if (
          mode === "ACCEPT" &&
          (
            await tx.user.findUnique({
              where: { id: old.to },
              select: { role: true },
            })
          )?.role !== "ADMIN"
        )
          throw Error("Recipient unavailable");
        const h = {
          ...old,
          status:
            mode === "ACCEPT" ? ("ACCEPTED" as const) : ("CANCELLED" as const),
          closedAt: now,
        };
        await tx.setting.create({
          data: {
            key: `wallet:withdrawal-handover-audit:v1:${h.id}:${mode}`,
            value: JSON.stringify({
              ...h,
              actor,
              previousClaim: JSON.parse(claim!.value),
            }),
          },
        });
        if (mode === "ACCEPT") {
          await tx.setting.update({
            where: { key: claimKey },
            data: {
              value: JSON.stringify({
                version: 1,
                requestKey: key,
                reviewerId: actor,
                claimedAt: now,
                amount: r.amount,
                number: r.number,
              }),
            },
          });
          await tx.setting.update({
            where: { key },
            data: {
              value: JSON.stringify({
                ...r,
                claimedBy: actor,
                claimedAt: now,
                handoverId: old.id,
              }),
            },
          });
        }
        await tx.setting.update({
          where: { key: pointer },
          data: { value: JSON.stringify(h) },
        });
      }
    });
    revalidatePath("/admin/withdrawals");
    return {
      ok: true,
      message:
        mode === "OFFER"
          ? "হস্তান্তরের প্রস্তাব সংরক্ষিত। গ্রহণ বা বাতিল না হওয়া পর্যন্ত টাকা পাঠাবেন না।"
          : mode === "ACCEPT"
            ? "দায়িত্ব গ্রহণ হয়েছে। সর্বশেষ পেজ ও বাইরের পেমেন্টের অবস্থা যাচাই করে কাজ করুন।"
            : "প্রস্তাব বাতিল হয়েছে; আগের দায়িত্ব বহাল।",
    };
  } catch {
    return {
      ok: false,
      message:
        "হস্তান্তর হয়নি। সর্বশেষ দায়িত্ব, সম্মতি, প্রাপকের ADMIN ভূমিকা ও প্রস্তাব যাচাই করুন। টাকা পাঠানোর আগে বাইরের পেমেন্টের অবস্থা মিলিয়ে নিন।",
    };
  }
}
