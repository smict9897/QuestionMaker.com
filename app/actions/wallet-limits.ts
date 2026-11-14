"use server";
import { auth } from "@/auth";
import { walletTransaction, WalletError } from "@/lib/wallet";
import {
  readWalletLimits,
  limitMoney,
  WALLET_LIMITS_KEY,
  type WalletLimits,
} from "@/lib/wallet-limits";
import { revalidatePath } from "next/cache";
export type LimitsState = { ok: boolean; message: string };
export async function updateWalletLimits(
  _: LimitsState,
  form: FormData,
): Promise<LimitsState> {
  try {
    const id = (await auth())?.user?.id;
    if (!id) throw new WalletError("আগে লগইন করুন।");
    if (form.get("confirmed") !== "on")
      throw new WalletError("পরিবর্তনের প্রভাব বুঝে নিশ্চিত করুন।");
    const transferDaily = limitMoney(form.get("transferDaily"), 100, 5000000),
      withdrawalMax = limitMoney(form.get("withdrawalMax"), 10000, 5000000),
      raw = String(form.get("recipientLookups") || ""),
      revision = String(form.get("revision") || ""),
      note = String(form.get("note") || "").trim();
    if (
      !/^\d{1,3}$/.test(raw) ||
      Number(raw) < 1 ||
      Number(raw) > 100 ||
      !/^\d{1,10}$/.test(revision) ||
      note.length < 10 ||
      note.length > 500
    )
      throw new WalletError("সঠিক সীমা ও ১০–৫০০ অক্ষরের পরিবর্তনের কারণ দিন।");
    await walletTransaction(async (tx) => {
      if (
        (await tx.user.findUnique({ where: { id }, select: { role: true } }))
          ?.role !== "ADMIN"
      )
        throw new WalletError("অনুমতি নেই।");
      const current = await readWalletLimits(tx);
      if (current.revision !== Number(revision))
        throw new WalletError(
          "অন্য অ্যাডমিন ইতিমধ্যে সীমা বদলেছেন। পেজ নতুন করে খুলুন।",
        );
      const next: WalletLimits = {
        version: 1,
        revision: current.revision + 1,
        transferDaily,
        recipientLookups: Number(raw),
        withdrawalMax,
        updatedBy: id,
        updatedAt: new Date().toISOString(),
      };
      await tx.setting.create({
        data: {
          key: `wallet:limits-audit:v1:${String(next.revision).padStart(12, "0")}`,
          value: JSON.stringify({
            version: 1,
            before: current,
            after: next,
            note,
          }),
        },
      });
      if (current.revision === 0)
        await tx.setting.create({
          data: { key: WALLET_LIMITS_KEY, value: JSON.stringify(next) },
        });
      else
        await tx.setting.update({
          where: { key: WALLET_LIMITS_KEY },
          data: { value: JSON.stringify(next) },
        });
    });
    for (const path of [
      "/admin/wallet-limits",
      "/wallet/send",
      "/wallet/withdraw",
    ])
      revalidatePath(path);
    return {
      ok: true,
      message:
        "সীমা ও অডিট সংরক্ষিত। নতুন অনুরোধে সর্বশেষ সীমা প্রযোজ্য। পেজ নতুন করে খুলে বর্তমান মান দেখুন।",
    };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof WalletError
          ? e.message
          : "সীমা সংরক্ষণ হয়নি। মান যাচাই করে পরে চেষ্টা করুন।",
    };
  }
}
