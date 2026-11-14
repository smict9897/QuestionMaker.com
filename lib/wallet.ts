import {
  normalizeWallet,
  creditFunds,
  debitFunds,
  type FundSource,
  type FundWallet,
} from "@/lib/wallet-funds";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { visibleQuestions } from "@/lib/paper-generation";

// All money is integer paisa. Settings keys provide durable unique receipts without a migration.
export const WALLET_RATES = { MCQ: 20, SHORT: 30, CQ: 50 } as const;
export const BONUS_PAISA = 2000;
export const MIN_RECHARGE_PAISA = 2000;
export class WalletError extends Error {}
/** Stable public account identifier; never an authentication credential. */
export function teacherTid(userId: string) {
  if (!userId) throw new WalletError("অ্যাকাউন্ট পাওয়া যায়নি।");
  return `QB-${createHash("sha256").update(`teacher:${userId}`).digest("hex").slice(0, 20).toUpperCase()}`;
}
export function rechargeApprovalAmount(raw: unknown) {
  if (typeof raw !== "string" || !/^\d{1,5}(\.\d{1,2})?$/.test(raw.trim()))
    throw new WalletError("সঠিক টাকার পরিমাণ লিখুন।");
  const [whole, fraction = ""] = raw.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    !Number.isSafeInteger(amount) ||
    amount < MIN_RECHARGE_PAISA ||
    amount > 5000000
  )
    throw new WalletError("রিচার্জের পরিমাণ ৳২০ থেকে ৳৫০,০০০ হতে হবে।");
  return amount;
}
type Tx = Prisma.TransactionClient;
type Wallet = FundWallet;
export function questionPriceType(q: {
  correct: string;
  options: unknown;
  text?: string;
}): keyof typeof WALLET_RATES {
  const o = q.options as Record<string, unknown> | null;
  return q.correct.trim()
    ? "MCQ"
    : (o && (o.stimulus || o.subQuestions || o.k || o.ক)) ||
        q.text?.includes("(ক)")
      ? "CQ"
      : "SHORT";
}
export function formatMoney(paisa: number) {
  return `৳${(paisa / 100).toFixed(2)}`;
}
export async function walletTransaction<T>(fn: (tx: Tx) => Promise<T>) {
  return db.$transaction(
    async (tx) => {
      // One global financial lock serializes bonus, checkout and recharge approvals.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(937201026)`;
      return fn(tx);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export async function account(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) throw new WalletError("লগইন করুন।");
  const tid = teacherTid(userId);
  const identityKey = `teacher:tid:${tid}`;
  const identity = await tx.setting.findUnique({ where: { key: identityKey } });
  if (identity && identity.value !== userId)
    throw new WalletError("TID যাচাই ব্যর্থ হয়েছে।");
  if (!identity)
    await tx.setting.create({ data: { key: identityKey, value: userId } });
  if (user.role === "ADMIN")
    return { admin: true, ...normalizeWallet({ balance: 0, bonus: 0 }) };
  const key = `wallet:account:${userId}`;
  const row = await tx.setting.findUnique({ where: { key } });
  if (!row) {
    const initial: Wallet = normalizeWallet({
      balance: BONUS_PAISA,
      bonus: BONUS_PAISA,
    });
    await tx.setting.create({ data: { key, value: JSON.stringify(initial) } });
    await tx.setting.create({
      data: {
        key: `wallet:bonus:${userId}`,
        value: JSON.stringify({
          userId,
          amount: BONUS_PAISA,
          at: new Date().toISOString(),
        }),
      },
    });
    return { admin: false, ...initial };
  }
  try {
    return { admin: false, ...normalizeWallet(JSON.parse(row.value)) };
  } catch {
    throw new WalletError("Balance-এর উৎস যাচাই করা যায়নি।");
  }
}
export async function ensureWallet(userId: string) {
  return walletTransaction((tx) => account(tx, userId));
}
export async function quoteInTransaction(
  tx: Tx,
  userId: string,
  ids: string[],
) {
  const wallet = await account(tx, userId);
  const unique = [...new Set(ids)];
  const questions = await tx.question.findMany({
    where: { id: { in: unique }, ...visibleQuestions(userId) },
    select: { id: true, correct: true, options: true, text: true },
  });
  if (questions.length !== unique.length)
    throw new WalletError(
      "কিছু প্রশ্ন পাওয়া যায়নি বা অনুমতি নেই। আবার নির্বাচন করুন।",
    );
  const purchased = await tx.setting.findMany({
    where: {
      key: { in: unique.map((id) => `wallet:question:${userId}:${id}`) },
    },
    select: { key: true },
  });
  const owned = new Set(purchased.map((p) => p.key));
  const pkg = await tx.packagePurchase.findFirst({
    where: { userId, status: "APPROVED", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  const counts = { MCQ: 0, SHORT: 0, CQ: 0 };
  let subtotal = 0;
  const unpaid: { id: string; price: number }[] = [];
  for (const q of questions) {
    const type = questionPriceType(q);
    counts[type]++;
    if (!owned.has(`wallet:question:${userId}:${q.id}`)) {
      unpaid.push({ id: q.id, price: WALLET_RATES[type] });
      subtotal += WALLET_RATES[type];
    }
  }
  const total = wallet.admin || pkg ? 0 : subtotal;
  return {
    balance: wallet.balance,
    admin: wallet.admin,
    packageCovered: !!pkg,
    total,
    subtotal,
    counts,
    unpaid,
    canAfford: wallet.admin || total <= wallet.balance,
  };
}
export async function requirePaidQuestions(userId: string, ids: string[]) {
  return walletTransaction(async (tx) => {
    const quote = await quoteInTransaction(tx, userId, ids);
    if (quote.total > 0)
      throw new WalletError("আগে মূল্য দেখে প্রশ্নগুলোর checkout সম্পন্ন করুন।");
  });
}

/** Call only inside walletTransaction so balance, ledger and business receipts commit together. */
export async function changeWalletFunds(
  tx: Tx,
  userId: string,
  input: {
    operationId: string;
    amount: number;
    direction: "DEBIT" | "CREDIT";
    source?: FundSource;
    transfer?: boolean;
    earningsOnly?: boolean;
    description: string;
  },
) {
  if (
    !input.operationId ||
    input.operationId.length > 300 ||
    !input.description ||
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0
  )
    throw new WalletError("অবৈধ লেনদেন।");
  const current = await account(tx, userId);
  if (current.admin) throw new WalletError("ADMIN-এর ওয়ালেট লেনদেন প্রযোজ্য নয়।");
  const key = `wallet:ledger:v1:${userId}:${createHash("sha256").update(input.operationId).digest("hex")}`;
  const existing = await tx.setting.findUnique({ where: { key } });
  if (existing) {
    const receipt = JSON.parse(existing.value);
    if (
      receipt.amount !== input.amount ||
      receipt.direction !== input.direction ||
      receipt.source !== (input.source ?? null) ||
      receipt.transfer !== !!input.transfer ||
      !!receipt.earningsOnly !== !!input.earningsOnly
    )
      throw new WalletError("লেনদেনের তথ্য মেলেনি।");
    return { balance: current.balance, replay: true, receipt };
  }
  const openingKey = `wallet:opening:v1:${userId}`;
  if (!(await tx.setting.findUnique({ where: { key: openingKey } }))) {
    await tx.setting.create({
      data: {
        key: openingKey,
        value: JSON.stringify({
          userId,
          balance: current.balance,
          funds: current.funds,
          at: new Date().toISOString(),
          note: "Source ledger opening; legacy bonus allocation is conservative, not reconstructed history.",
        }),
      },
    });
  }
  let next: FundWallet;
  let used = null;
  try {
    if (input.direction === "CREDIT") {
      if (!input.source || input.transfer || input.earningsOnly)
        throw new Error("Credit source required");
      next = creditFunds(current, input.source, input.amount);
    } else if (input.direction === "DEBIT") {
      const result = debitFunds(
        current,
        input.amount,
        input.transfer,
        input.earningsOnly,
      );
      next = result.wallet;
      used = result.used;
    } else throw new Error("Invalid direction");
  } catch {
    throw new WalletError(
      "যোগ্য ব্যালেন্স পর্যাপ্ত নয় অথবা লেনদেনের পরিমাণ সঠিক নয়।",
    );
  }
  const receipt = {
    userId,
    operationId: input.operationId,
    direction: input.direction,
    amount: input.amount,
    source: input.source ?? null,
    transfer: !!input.transfer,
    earningsOnly: !!input.earningsOnly,
    used,
    balanceBefore: current.balance,
    balanceAfter: next.balance,
    fundsAfter: next.funds,
    description: input.description,
    at: new Date().toISOString(),
  };
  await tx.setting.update({
    where: { key: `wallet:account:${userId}` },
    data: { value: JSON.stringify(next) },
  });
  await tx.setting.create({ data: { key, value: JSON.stringify(receipt) } });
  await tx.setting.create({
    data: {
      key: `wallet:history:v1:${userId}:${receipt.at}:${key.split(":").pop()}`,
      value: JSON.stringify(receipt),
    },
  });
  return { balance: next.balance, replay: false, receipt };
}
