"use server";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { z } from "zod";
import {
  WalletError,
  changeWalletFunds,
  teacherTid,
  rechargeApprovalAmount,
  account,
  ensureWallet,
  MIN_RECHARGE_PAISA,
  quoteInTransaction,
  walletTransaction,
} from "@/lib/wallet";
import { PAYMENT_METHODS } from "@/lib/payment-info";
import { revalidatePath } from "next/cache";
const idsSchema = z.array(z.string().min(1).max(100)).min(1).max(300);
async function userId() {
  const s = await auth();
  if (!s?.user?.id) throw new WalletError("লগইন করুন।");
  return s.user.id;
}
export async function walletSummary() {
  const id = await userId();
  return ensureWallet(id);
}
export async function quoteQuestions(raw: unknown) {
  try {
    const id = await userId(),
      ids = idsSchema.parse(raw);
    const q = await walletTransaction((tx) => quoteInTransaction(tx, id, ids));
    const { unpaid, ...safe } = q;
    return { ok: true as const, ...safe };
  } catch {
    return {
      ok: false as const,
      error: "মূল্য বা balance যাচাই করা যায়নি। আবার চেষ্টা করুন।",
    };
  }
}
export async function purchaseQuestions(raw: unknown, expectedTotal: number) {
  try {
    const id = await userId(),
      ids = idsSchema.parse(raw);
    const result = await walletTransaction(async (tx) => {
      const q = await quoteInTransaction(tx, id, ids);
      if (q.total !== 0 && q.total !== expectedTotal)
        throw new WalletError("মূল্য বদলেছে। আবার মূল্য দেখুন।");
      if (!q.canAfford)
        throw new WalletError("Balance পর্যাপ্ত নয়। কমপক্ষে ৳২০ recharge করুন।");
      if (q.total > 0) {
        await changeWalletFunds(tx, id, {
          operationId: `questions:${createHash("sha256")
            .update(JSON.stringify(q.unpaid.map((item) => item.id).sort()))
            .digest("hex")}`,
          direction: "DEBIT",
          amount: q.total,
          description: "ডাটাবেজ প্রশ্ন checkout",
        });
        for (const item of q.unpaid)
          await tx.setting.create({
            data: {
              key: `wallet:question:${id}:${item.id}`,
              value: JSON.stringify({
                userId: id,
                questionId: item.id,
                amount: item.price,
                at: new Date().toISOString(),
              }),
            },
          });
      }
      return { charged: q.total, balance: q.balance - q.total };
    });
    revalidatePath("/wallet");
    return { ok: true as const, ...result };
  } catch (e) {
    return {
      ok: false as const,
      error:
        e instanceof WalletError ? e.message : "Checkout হয়নি। আবার চেষ্টা করুন।",
    };
  }
}
export async function submitRecharge(form: FormData) {
  const id = await userId();
  const amount = String(form.get("amount") || "");
  const method = String(form.get("method") || "");
  const trx = String(form.get("transactionId") || "")
    .trim()
    .toUpperCase();
  const phone = String(form.get("phone") || "").trim();
  if (
    !/^\d{2,5}$/.test(amount) ||
    Number(amount) * 100 < MIN_RECHARGE_PAISA ||
    Number(amount) > 50000 ||
    !PAYMENT_METHODS.some((m) => m.id === method) ||
    !/^[A-Z0-9]{6,30}$/.test(trx) ||
    !/^01[3-9]\d{8}$/.test(phone)
  )
    return {
      ok: false,
      error: "ন্যূনতম ৳২০, সঠিক payment method, নম্বর ও TrxID দিন।",
    };
  try {
    await walletTransaction(async (tx) => {
      const a = await account(tx, id);
      if (a.admin) throw new WalletError("ADMIN-এর recharge প্রয়োজন নেই।");
      if (
        await tx.packagePurchase.findFirst({
          where: { transactionId: { equals: trx, mode: "insensitive" } },
          select: { id: true },
        })
      )
        throw new WalletError("TrxID আগে ব্যবহৃত হয়েছে।");
      const pending = await tx.setting.findMany({
        where: { key: { startsWith: `wallet:recharge:${id}:` } },
      });
      if (pending.some((r) => JSON.parse(r.value).status === "PENDING"))
        throw new WalletError("আগের recharge যাচাই বাকি।");
      await tx.setting.create({
        data: { key: `wallet:trx:${trx}`, value: id },
      });
      await tx.setting.create({
        data: {
          key: `wallet:recharge:${id}:${trx}`,
          value: JSON.stringify({
            userId: id,
            amount: Number(amount) * 100,
            method,
            trx,
            phone,
            status: "PENDING",
            at: new Date().toISOString(),
          }),
        },
      });
    });
    revalidatePath("/wallet");
    return {
      ok: true,
      message: "অনুরোধ জমা হয়েছে। Payment যাচাইয়ের পর balance যোগ হবে।",
    };
  } catch {
    return {
      ok: false,
      error: "অনুরোধ নেওয়া যায়নি। আগের pending অনুরোধ বা ব্যবহৃত TrxID পরীক্ষা করুন।",
    };
  }
}
export async function reviewRecharge(
  key: string,
  approve: boolean,
  amountInput?: string,
  reasonInput = "",
) {
  const id = await userId();
  await walletTransaction(async (tx) => {
    const admin = await tx.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (admin?.role !== "ADMIN") throw new WalletError("অনুমতি নেই।");
    if (!key.startsWith("wallet:recharge:"))
      throw new WalletError("Invalid request");
    const row = await tx.setting.findUnique({ where: { key } });
    if (!row) throw new WalletError("Not found");
    const r = JSON.parse(row.value);
    if (r.status !== "PENDING") throw new WalletError("আগেই যাচাই হয়েছে।");
    if (
      !Number.isSafeInteger(r.amount) ||
      r.amount < MIN_RECHARGE_PAISA ||
      r.amount > 5000000
    )
      throw new WalletError("Invalid amount");
    if (
      typeof r.userId !== "string" ||
      key !== `wallet:recharge:${r.userId}:${r.trx}`
    )
      throw new WalletError("আবেদনের পরিচয় সঠিক নয়।");
    const approvedAmount = approve
      ? amountInput === undefined
        ? r.amount
        : rechargeApprovalAmount(amountInput)
      : 0;
    const reason = reasonInput.trim();
    if (
      reason.length > 500 ||
      (approve && approvedAmount !== r.amount && reason.length < 5)
    )
      throw new WalletError("পরিমাণ পরিবর্তনের কারণ লিখুন (৫–৫০০ অক্ষর)।");
    const a = await account(tx, r.userId);
    if (a.admin) throw new WalletError("ADMIN-এর recharge প্রয়োজন নেই।");
    if (approve && !Number.isSafeInteger(a.balance + approvedAmount))
      throw new WalletError("Balance সীমা অতিক্রম করেছে।");
    if (approve) {
      await changeWalletFunds(tx, r.userId, {
        operationId: `recharge:${key}`,
        direction: "CREDIT",
        source: "recharge",
        amount: approvedAmount,
        description: `অ্যাডমিন যাচাইকৃত রিচার্জ · ${r.trx}`,
      });
    }
    await tx.setting.update({
      where: { key },
      data: {
        value: JSON.stringify({
          ...r,
          status: approve ? "APPROVED" : "REJECTED",
          approvedAmount,
          requestedAmount: r.amount,
          tid: teacherTid(r.userId),
          reviewReason: reason,
          reviewer: id,
          reviewedAt: new Date().toISOString(),
        }),
      },
    });
  });
  revalidatePath("/wallet");
  revalidatePath("/admin/wallet");
  revalidatePath("/dashboard");
}

export async function checkQuestionAccess(raw: unknown) {
  try {
    const id = await userId();
    const ids = idsSchema.parse(raw);
    const q = await walletTransaction((tx) => quoteInTransaction(tx, id, ids));
    return {
      ok: q.total === 0,
      error:
        q.total > 0
          ? "আগে মূল্য দেখে Checkout করুন। Balance কম হলে /wallet থেকে recharge করুন।"
          : "",
    };
  } catch {
    return {
      ok: false,
      error: "প্রশ্নের payment যাচাই হয়নি। আবার চেষ্টা করুন।",
    };
  }
}

export async function reviewRechargeForm(
  _previous: { ok: boolean; message: string },
  form: FormData,
): Promise<{ ok: boolean; message: string }> {
  try {
    const decision = form.get("decision");
    if (decision !== "approve" && decision !== "reject")
      throw new WalletError("সিদ্ধান্ত নির্বাচন করুন।");
    await reviewRecharge(
      String(form.get("requestKey") || ""),
      decision === "approve",
      String(form.get("amount") || ""),
      String(form.get("reason") || ""),
    );
    return {
      ok: true,
      message:
        decision === "approve"
          ? "ব্যালেন্স যোগ হয়েছে।"
          : "আবেদন প্রত্যাখ্যান করা হয়েছে।",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof WalletError
          ? error.message
          : "আবেদন যাচাই হয়নি। আবার চেষ্টা করুন।",
    };
  }
}
