"use server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { readWalletLimits } from "@/lib/wallet-limits";
import {
  walletTransaction,
  account,
  changeWalletFunds,
  teacherTid,
  WalletError,
} from "@/lib/wallet";

// Hard safety ceiling; current admin limits are re-read inside the financial lock.
export type TransferState = {
  ok: boolean;
  message: string;
  quoteId?: string;
  recipient?: string;
  tid?: string;
  amount?: number;
};
const dayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function amountPaisa(raw: unknown) {
  if (typeof raw !== "string" || !/^\d{1,5}(\.\d{1,2})?$/.test(raw.trim()))
    throw new WalletError("সঠিক পরিমাণ লিখুন।");
  const [whole, fraction = ""] = raw.trim().split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (n < 100 || n > 5000000)
    throw new WalletError(
      "সঠিক পাঠানোর পরিমাণ দিন; সর্বোচ্চ অনুমোদিত সীমা পেজে দেখুন।",
    );
  return n;
}
async function senderId() {
  const user = (await auth())?.user;
  if (!user?.id) throw new WalletError("আগে লগইন করুন।");
  return user.id;
}
const failure = (error: unknown): TransferState => ({
  ok: false,
  message:
    error instanceof WalletError
      ? error.message
      : "লেনদেন হয়নি। পরে আবার চেষ্টা করুন।",
});

export async function prepareWalletTransfer(
  _previous: TransferState,
  form: FormData,
): Promise<TransferState> {
  try {
    const id = await senderId();
    const tid = String(form.get("tid") || "")
      .trim()
      .toUpperCase();
    const amount = amountPaisa(form.get("amount"));
    if (!/^QB-[A-F0-9]{20}$/.test(tid) || tid === teacherTid(id))
      throw new WalletError("অন্য শিক্ষকের সঠিক TID দিন।");
    return await walletTransaction(async (tx) => {
      const limits = await readWalletLimits(tx);
      if (amount > limits.transferDaily)
        throw new WalletError(
          "পরিমাণ বর্তমান দৈনিক Send Money সীমার চেয়ে বেশি।",
        );
      const wallet = await account(tx, id);
      if (wallet.admin)
        throw new WalletError("ADMIN-এর জন্য Send Money প্রযোজ্য নয়।");
      const rateKey = `wallet:transfer-lookups:v1:${id}:${dayKey()}`;
      const rate = await tx.setting.findUnique({ where: { key: rateKey } });
      const attempts = rate ? Number(rate.value) : 0;
      if (
        !Number.isSafeInteger(attempts) ||
        attempts < 0 ||
        attempts >= limits.recipientLookups
      )
        throw new WalletError("আজকের প্রাপক যাচাইয়ের সীমা শেষ।");
      if (rate)
        await tx.setting.update({
          where: { key: rateKey },
          data: { value: String(attempts + 1) },
        });
      else await tx.setting.create({ data: { key: rateKey, value: "1" } });
      const identity = await tx.setting.findUnique({
        where: { key: `teacher:tid:${tid}` },
      });
      if (!identity || teacherTid(identity.value) !== tid)
        return { ok: false, message: "এই TID-তে টাকা পাঠানো যাবে না।" };
      const recipient = await tx.user.findUnique({
        where: { id: identity.value },
        select: { id: true, name: true, role: true },
      });
      if (!recipient || recipient.role === "ADMIN" || recipient.id === id)
        return { ok: false, message: "এই TID-তে টাকা পাঠানো যাবে না।" };
      const eligible = wallet.balance - wallet.funds.bonus;
      if (amount > eligible)
        return {
          ok: false,
          message: "পাঠানোর যোগ্য ব্যালেন্স পর্যাপ্ত নয়। বোনাস পাঠানো যায় না।",
        };
      const quoteId = randomUUID();
      const recipientName = recipient.name || "শিক্ষক";
      await tx.setting.create({
        data: {
          key: `wallet:transfer-quote:v1:${id}:${quoteId}`,
          value: JSON.stringify({
            senderId: id,
            recipientId: recipient.id,
            recipientName,
            tid,
            amount,
            status: "PENDING",
            expiresAt: Date.now() + 10 * 60 * 1000,
          }),
        },
      });
      return {
        ok: true,
        message: "প্রাপকের নাম ও TID মিলিয়ে নিশ্চিত করুন।",
        quoteId,
        recipient: recipientName,
        tid,
        amount,
      };
    });
  } catch (error) {
    return failure(error);
  }
}

export async function confirmWalletTransfer(
  _previous: TransferState,
  form: FormData,
): Promise<TransferState> {
  try {
    const id = await senderId(),
      quoteId = String(form.get("quoteId") || "");
    if (!/^[0-9a-f-]{36}$/.test(quoteId) || form.get("confirmed") !== "on")
      throw new WalletError("প্রাপকের তথ্য মিলিয়ে নিশ্চিত করুন।");
    const result = await walletTransaction(async (tx) => {
      const key = `wallet:transfer-quote:v1:${id}:${quoteId}`;
      const row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw new WalletError("আবার প্রাপকের তথ্য যাচাই করুন।");
      const quote = JSON.parse(row.value);
      if (quote.senderId !== id) throw new WalletError("অনুমতি নেই।");
      if (quote.status === "COMPLETED")
        return {
          ok: true,
          message: "এই Send Money আগেই সম্পন্ন হয়েছে; আবার টাকা কাটা হয়নি।",
        };
      const limits = await readWalletLimits(tx);
      if (
        quote.status !== "PENDING" ||
        !Number.isFinite(quote.expiresAt) ||
        quote.expiresAt < Date.now() ||
        !Number.isSafeInteger(quote.amount) ||
        quote.amount < 100 ||
        quote.amount > limits.transferDaily ||
        quote.recipientId === id ||
        teacherTid(quote.recipientId) !== quote.tid
      )
        throw new WalletError("তথ্য বা মেয়াদ বদলেছে। আবার প্রাপক যাচাই করুন।");
      const sender = await account(tx, id),
        recipient = await account(tx, quote.recipientId);
      if (sender.admin || recipient.admin)
        throw new WalletError("এই অ্যাকাউন্টে Send Money প্রযোজ্য নয়।");
      const dailyKey = `wallet:transfer-daily:v1:${id}:${dayKey()}`;
      const daily = await tx.setting.findUnique({ where: { key: dailyKey } });
      const spent = daily ? Number(daily.value) : 0;
      if (
        !Number.isSafeInteger(spent) ||
        spent < 0 ||
        spent + quote.amount > limits.transferDaily
      )
        throw new WalletError("বর্তমান দৈনিক Send Money সীমা অতিক্রম করেছে।");
      await changeWalletFunds(tx, id, {
        operationId: `transfer:${quoteId}:out`,
        amount: quote.amount,
        direction: "DEBIT",
        transfer: true,
        description: `Send Money → ${quote.tid}`,
      });
      await changeWalletFunds(tx, quote.recipientId, {
        operationId: `transfer:${quoteId}:in`,
        amount: quote.amount,
        direction: "CREDIT",
        source: "received",
        description: `Send Money ← ${teacherTid(id)}`,
      });
      if (daily)
        await tx.setting.update({
          where: { key: dailyKey },
          data: { value: String(spent + quote.amount) },
        });
      else
        await tx.setting.create({
          data: { key: dailyKey, value: String(spent + quote.amount) },
        });
      await tx.setting.update({
        where: { key },
        data: {
          value: JSON.stringify({
            ...quote,
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
          }),
        },
      });
      return {
        ok: true,
        message:
          "টাকা পাঠানো হয়েছে। প্রাপক তৈরি/কেনায় ব্যবহার করতে পারবেন; এই প্রাপ্ত টাকা উত্তোলনযোগ্য নয়।",
      };
    });
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    revalidatePath("/wallet/send");
    return result;
  } catch (error) {
    return failure(error);
  }
}
