import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { visibleQuestions } from "@/lib/paper-generation";

// All money is integer paisa. Settings keys provide durable unique receipts without a migration.
export const WALLET_RATES = { MCQ: 20, SHORT: 30, CQ: 50 } as const;
export const BONUS_PAISA = 2000;
export const MIN_RECHARGE_PAISA = 2000;
export class WalletError extends Error {}
type Tx = Prisma.TransactionClient;
type Wallet = { balance: number; bonus: number };
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
  if (user.role === "ADMIN") return { admin: true, balance: 0, bonus: 0 };
  const key = `wallet:account:${userId}`;
  const row = await tx.setting.findUnique({ where: { key } });
  if (!row) {
    const initial: Wallet = { balance: BONUS_PAISA, bonus: BONUS_PAISA };
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
  const value = JSON.parse(row.value) as Wallet;
  if (!Number.isSafeInteger(value.balance) || value.balance < 0)
    throw new WalletError("Balance যাচাই করা যায়নি।");
  return { admin: false, ...value };
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
      throw new WalletError(
        "আগে মূল্য দেখে প্রশ্নগুলোর checkout সম্পন্ন করুন।",
      );
  });
}
