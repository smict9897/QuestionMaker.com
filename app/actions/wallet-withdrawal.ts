"use server";
import {
  handoverKey,
  assertNoPendingHandover,
} from "@/lib/withdrawal-handover";
import { auth } from "@/auth";
import { readWalletLimits } from "@/lib/wallet-limits";
import {
  walletTransaction,
  account,
  changeWalletFunds,
  WalletError,
} from "@/lib/wallet";
import { revalidatePath } from "next/cache";
export type WithdrawalState = { ok: boolean; message: string };
import {
  parseWithdrawal,
  assertWithdrawalClaim,
  type Withdrawal,
} from "@/lib/wallet-withdrawal";
export type { Withdrawal } from "@/lib/wallet-withdrawal";
async function actor() {
  const id = (await auth())?.user?.id;
  if (!id) throw new WalletError("আগে লগইন করুন।");
  return id;
}
function failure(e: unknown): WithdrawalState {
  return {
    ok: false,
    message:
      e instanceof WalletError
        ? e.message
        : "অনুরোধ সম্পন্ন হয়নি। পরে আবার চেষ্টা করুন।",
  };
}
function refresh() {
  revalidatePath("/wallet");
  revalidatePath("/wallet/withdraw");
  revalidatePath("/admin/withdrawals");
}
export async function requestWithdrawal(
  _: WithdrawalState,
  form: FormData,
): Promise<WithdrawalState> {
  try {
    const userId = await actor(),
      id = String(form.get("requestId") || ""),
      number = String(form.get("number") || "").trim(),
      raw = String(form.get("amount") || "").trim();
    if (
      !/^[a-f0-9-]{36}$/.test(id) ||
      !/^01[3-9]\d{8}$/.test(number) ||
      !/^\d{1,5}(\.\d{1,2})?$/.test(raw) ||
      form.get("confirmed") !== "on"
    )
      throw new WalletError("সঠিক bKash নম্বর, পরিমাণ এবং সম্মতি দিন।");
    const [whole, fraction = ""] = raw.split("."),
      amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (amount < 10000 || amount > 5000000)
      throw new WalletError("৳১০০ থেকে ৳৫০,০০০ অনুরোধ করা যাবে।");
    await walletTransaction(async (tx) => {
      const wallet = await account(tx, userId);
      if (wallet.admin) throw new WalletError("ADMIN-এর জন্য প্রযোজ্য নয়।");
      const key = `wallet:withdrawal:v1:${userId}:${id}`,
        old = await tx.setting.findUnique({ where: { key } });
      if (old) {
        const r = JSON.parse(old.value) as Withdrawal;
        if (r.amount !== amount || r.number !== number)
          throw new WalletError("একই অনুরোধের তথ্য বদলেছে। পেজটি নতুন করে খুলুন।");
        return;
      }
      const limits = await readWalletLimits(tx);
      if (amount > limits.withdrawalMax)
        throw new WalletError("পরিমাণ বর্তমান উত্তোলন সীমার চেয়ে বেশি।");
      const activeKey = `wallet:withdrawal-active:v1:${userId}`;
      if ((await tx.setting.findUnique({ where: { key: activeKey } }))?.value)
        throw new WalletError("আগের অনুরোধ নিষ্পত্তি হওয়া পর্যন্ত অপেক্ষা করুন।");
      await changeWalletFunds(tx, userId, {
        operationId: `withdraw-hold:${id}`,
        amount,
        direction: "DEBIT",
        earningsOnly: true,
        description: "bKash উত্তোলন অনুরোধে বিক্রির আয় সংরক্ষিত",
      });
      const record: Withdrawal = {
        version: 1,
        id,
        userId,
        amount,
        number,
        status: "HELD",
        createdAt: new Date().toISOString(),
      };
      await tx.setting.create({ data: { key, value: JSON.stringify(record) } });
      const active = await tx.setting.findUnique({ where: { key: activeKey } });
      if (active)
        await tx.setting.update({
          where: { key: activeKey },
          data: { value: key },
        });
      else await tx.setting.create({ data: { key: activeKey, value: key } });
    });
    refresh();
    return {
      ok: true,
      message:
        "অনুরোধ নথিভুক্ত আছে। নিচের ইতিহাসে বর্তমান অবস্থা দেখুন। নতুন অনুরোধের টাকা হোল্ড থাকে; এটি স্বয়ংক্রিয় পেমেন্ট নয়।",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function reviewWithdrawal(
  _: WithdrawalState,
  form: FormData,
): Promise<WithdrawalState> {
  try {
    const reviewerId = await actor(),
      key = String(form.get("key") || ""),
      decision = String(form.get("decision") || ""),
      trx = String(form.get("trx") || "")
        .trim()
        .toUpperCase(),
      note = String(form.get("note") || "").trim();
    if (
      !key.startsWith("wallet:withdrawal:v1:") ||
      key.length > 250 ||
      !["PAID", "REJECTED"].includes(decision) ||
      note.length > 500 ||
      (decision === "REJECTED" && note.length < 3) ||
      (decision === "PAID" &&
        (!/^[A-Z0-9]{6,30}$/.test(trx) || form.get("paidConfirmed") !== "on"))
    )
      throw new WalletError(
        "পেমেন্ট নিশ্চিতকরণ ও TrxID দিন, অথবা বাতিলের কারণ লিখুন।",
      );
    await walletTransaction(async (tx) => {
      const admin = await tx.user.findUnique({
        where: { id: reviewerId },
        select: { role: true },
      });
      if (admin?.role !== "ADMIN") throw new WalletError("অনুমতি নেই।");
      const row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw new WalletError("অনুরোধ পাওয়া যায়নি।");
      const r = parseWithdrawal(key, row.value);
      assertNoPendingHandover(
        (await tx.setting.findUnique({ where: { key: handoverKey(key) } }))
          ?.value,
        key,
      );
      if (r.handoverId && String(form.get("handoverId") || "") !== r.handoverId)
        throw new WalletError(
          "দায়িত্ব বদলেছে। সর্বশেষ পেজ খুলুন; টাকা পাঠাবেন না।",
        );
      if (r.claimedBy !== reviewerId)
        throw new WalletError(
          "আগে অনুরোধটি নিজের দায়িত্বে নিন। অন্য অ্যাডমিনের দায়িত্বের অনুরোধ নিষ্পত্তি করা যাবে না।",
        );
      const claimAudit = await tx.setting.findUnique({
        where: { key: `wallet:withdrawal-claim:v1:${r.userId}:${r.id}` },
      });
      assertWithdrawalClaim(claimAudit?.value, key, r);
      if (r.status !== "HELD") {
        if (r.status === decision && (decision !== "PAID" || r.trx === trx))
          return;
        throw new WalletError("আগেই নিষ্পত্তি হয়েছে।");
      }
      const activeKey = `wallet:withdrawal-active:v1:${r.userId}`;
      if (
        (await tx.setting.findUnique({ where: { key: activeKey } }))?.value !==
        key
      )
        throw new WalletError("হোল্ডের তথ্য মেলেনি।");
      if (decision === "REJECTED")
        await changeWalletFunds(tx, r.userId, {
          operationId: `withdraw-release:${r.id}`,
          amount: r.amount,
          direction: "CREDIT",
          source: "earnings",
          description: "বাতিল উত্তোলনের সংরক্ষিত বিক্রির আয় ফেরত",
        });
      else {
        const trxKey = `wallet:withdrawal-trx:v1:${trx}`;
        if (await tx.setting.findUnique({ where: { key: trxKey } }))
          throw new WalletError("এই TrxID আগেই ব্যবহার হয়েছে।");
        await tx.setting.create({ data: { key: trxKey, value: key } });
      }
      await tx.setting.update({
        where: { key },
        data: {
          value: JSON.stringify({
            ...r,
            status: decision,
            reviewerId,
            reviewedAt: new Date().toISOString(),
            note,
            ...(decision === "PAID" ? { trx } : {}),
          }),
        },
      });
      await tx.setting.update({
        where: { key: activeKey },
        data: { value: "" },
      });
    });
    refresh();
    return {
      ok: true,
      message:
        decision === "PAID"
          ? "ম্যানুয়াল পেমেন্টের তথ্য সংরক্ষিত।"
          : "অনুরোধ বাতিল; সংরক্ষিত বিক্রির আয় ফেরত দেওয়া হয়েছে।",
    };
  } catch (e) {
    return failure(e);
  }
}

/** Non-expiring ownership. Never auto-release or steal: an external payout may already be in progress. */
export async function claimWithdrawal(
  _: WithdrawalState,
  form: FormData,
): Promise<WithdrawalState> {
  try {
    const reviewerId = await actor(),
      key = String(form.get("key") || "");
    if (
      !key.startsWith("wallet:withdrawal:v1:") ||
      key.length > 250 ||
      form.get("claimConfirmed") !== "on"
    )
      throw new WalletError("দায়িত্ব নেওয়ার শর্ত নিশ্চিত করুন।");
    await walletTransaction(async (tx) => {
      if (
        (
          await tx.user.findUnique({
            where: { id: reviewerId },
            select: { role: true },
          })
        )?.role !== "ADMIN"
      )
        throw new WalletError("অনুমতি নেই।");
      const row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw new WalletError("অনুরোধ পাওয়া যায়নি।");
      const r = parseWithdrawal(key, row.value);
      assertNoPendingHandover(
        (await tx.setting.findUnique({ where: { key: handoverKey(key) } }))
          ?.value,
        key,
      );
      if (r.status !== "HELD")
        throw new WalletError("আগেই নিষ্পত্তি হয়েছে; টাকা পাঠাবেন না।");
      if (
        (
          await tx.setting.findUnique({
            where: { key: `wallet:withdrawal-active:v1:${r.userId}` },
          })
        )?.value !== key
      )
        throw new WalletError("হোল্ডের তথ্য মেলেনি।");
      if (r.claimedBy) {
        if (r.claimedBy === reviewerId) {
          const audit = await tx.setting.findUnique({
            where: { key: `wallet:withdrawal-claim:v1:${r.userId}:${r.id}` },
          });
          assertWithdrawalClaim(audit?.value, key, r);
          return;
        }
        throw new WalletError("অন্য অ্যাডমিন দায়িত্ব নিয়েছেন। টাকা পাঠাবেন না।");
      }
      const claimedAt = new Date().toISOString();
      await tx.setting.create({
        data: {
          key: `wallet:withdrawal-claim:v1:${r.userId}:${r.id}`,
          value: JSON.stringify({
            version: 1,
            requestKey: key,
            reviewerId,
            claimedAt,
            amount: r.amount,
            number: r.number,
          }),
        },
      });
      await tx.setting.update({
        where: { key },
        data: {
          value: JSON.stringify({ ...r, claimedBy: reviewerId, claimedAt }),
        },
      });
    });
    refresh();
    return {
      ok: true,
      message:
        "অনুরোধটি আপনার দায়িত্বে আছে। পেজের বর্তমান দায়িত্ব যাচাই করে একবারই বাইরে টাকা পাঠান, তারপর TrxID লিখুন। দায়িত্বের মেয়াদ স্বয়ংক্রিয়ভাবে শেষ হবে না।",
    };
  } catch (e) {
    return failure(e);
  }
}
