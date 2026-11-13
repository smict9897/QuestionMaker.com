"use server";
import { readyAIConfigured } from "@/lib/ready-ai-config";
import { createHash, randomUUID } from "crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { account, walletTransaction, WalletError } from "@/lib/wallet";
import { READY_PREFIX, parseReady } from "@/lib/ready-papers";
import { ANSWER_PREFIX, answerEntrySchema } from "@/lib/ready-answers";
import {
  READY_UNIT_PAISA,
  READY_MONTH_PAISA,
  READY_MONTH_UNITS,
  readySelectionSchema,
  readySnapshotSchema,
  readyUnits,
  readySelectionIdentity,
  type ReadySnapshot,
  type ReadyQuote,
} from "@/lib/ready-commerce";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { READY_AI_PREFIX, initialReadyAIJob } from "@/lib/ready-ai";
type Tx = Prisma.TransactionClient;
type Plan = { id: string; expiresAt: string; remaining: number };
export type ReadyPurchase = {
  id: string;
  ownerId: string;
  paperId: string;
  title: string;
  selected: number[];
  units: number;
  amount: number;
  packageUnits: number;
  createdAt: string;
  updatedAt: string;
  answers: z.infer<typeof answerEntrySchema>[];
  snapshot: ReadySnapshot;
};
const receiptKey = (userId: string, id: string) =>
  `readyowned:v1:${userId}:${id}`;
async function userId() {
  const s = await auth();
  if (!s?.user?.id) throw new WalletError("লগইন করুন।");
  return s.user.id;
}
function error(e: unknown) {
  return {
    ok: false as const,
    error:
      e instanceof WalletError
        ? e.message
        : "কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।",
  };
}
async function plan(tx: Tx, id: string): Promise<Plan | null> {
  const row = await tx.setting.findUnique({
    where: { key: `readyplan:v1:${id}` },
  });
  if (!row) return null;
  const p = JSON.parse(row.value) as Plan;
  if (!Number.isInteger(p.remaining) || p.remaining < 0 || p.remaining > 30)
    throw new WalletError("প্যাকেজ যাচাই হয়নি।");
  return new Date(p.expiresAt).getTime() > Date.now() ? p : null;
}
async function quote(tx: Tx, id: string, raw: unknown) {
  const input = readySelectionSchema.parse(raw);
  const row = await tx.setting.findUnique({
    where: { key: READY_PREFIX + input.paperId },
  });
  const paper = row && parseReady(row.value);
  const wallet = await account(tx, id);
  if (!paper) throw new WalletError("প্রশ্নপত্র পাওয়া যায়নি।");
  // Same page set from the same source is reusable; reordering/retries never debit twice.
  const receiptId = createHash("sha256")
    .update(
      JSON.stringify([
        paper.id,
        paper.url,
        readySelectionIdentity(input.selected),
      ]),
    )
    .digest("hex");
  const owned = await tx.setting.findUnique({
    where: { key: receiptKey(id, receiptId) },
  });
  const available =
    !paper.deletedAt &&
    ((paper.published && (!paper.ownerId || paper.moderation === "approved")) ||
      paper.ownerId === id);
  if (!available && !wallet.admin && !owned)
    throw new WalletError("প্রশ্নপত্র পাওয়া যায়নি।");
  const p = await plan(tx, id),
    units = readyUnits(input.selected.length);
  const packageUnits =
    owned || wallet.admin ? 0 : Math.min(units, p?.remaining ?? 0);
  const total =
    owned || wallet.admin ? 0 : (units - packageUnits) * READY_UNIT_PAISA;
  const q: ReadyQuote = {
    aiAvailable: readyAIConfigured(),
    receiptId,
    units,
    total,
    balance: wallet.balance,
    packageUnits,
    packageRemaining: p?.remaining ?? 0,
    owned: !!owned,
    admin: wallet.admin,
  };
  return { q, input, paper, p, owned, wallet };
}
export async function quoteReadyPaper(raw: unknown) {
  try {
    const id = await userId();
    return {
      ok: true as const,
      ...(await walletTransaction(async (tx) => (await quote(tx, id, raw)).q)),
    };
  } catch (e) {
    return error(e);
  }
}
export async function checkoutReadyPaper(
  raw: unknown,
  expected: unknown,
  snapshot: unknown,
) {
  try {
    const id = await userId();
    const agreed = z
      .object({
        total: z.number().int().nonnegative(),
        packageUnits: z.number().int().nonnegative(),
      })
      .parse(expected);
    const saved = readySnapshotSchema.parse(snapshot);
    const result = await walletTransaction(async (tx) => {
      const { q, input, paper, p, owned, wallet } = await quote(tx, id, raw);
      if (owned) return { receiptId: q.receiptId, charged: 0 };
      if (q.total !== agreed.total || q.packageUnits !== agreed.packageUnits)
        throw new WalletError("মূল্য বা প্যাকেজ বদলেছে। আবার মূল্য দেখুন।");
      if (!wallet.admin && q.total > wallet.balance)
        throw new WalletError("ব্যালেন্স পর্যাপ্ত নয়। Wallet থেকে recharge করুন।");
      // Snapshot, receipt, plan use and debit commit together; a failed transaction costs nothing.
      const answers = [];
      for (const n of input.selected) {
        const a = await tx.setting.findUnique({
          where: { key: ANSWER_PREFIX + paper.id + ":" + n },
        });
        if (a) {
          const parsed = answerEntrySchema.safeParse(JSON.parse(a.value));
          if (parsed.success && parsed.data.approved) answers.push(parsed.data);
        }
      }
      const now = new Date().toISOString();
      const purchase: ReadyPurchase = {
        id: q.receiptId,
        ownerId: id,
        paperId: paper.id,
        title: paper.title,
        selected: input.selected,
        units: q.units,
        amount: q.total,
        packageUnits: q.packageUnits,
        createdAt: now,
        updatedAt: now,
        answers,
        snapshot: {
          ...saved,
          edits: Object.fromEntries(
            input.selected
              .map((n) => [n, saved.edits[n] ?? paper.presets[n]])
              .filter(([, v]) => v),
          ),
        },
      };
      await tx.setting.create({
        data: {
          key: receiptKey(id, q.receiptId),
          value: JSON.stringify(purchase),
        },
      });
      await tx.setting.create({
        data: {
          key: `${READY_AI_PREFIX}${id}:${q.receiptId}`,
          value: JSON.stringify(initialReadyAIJob(q.receiptId, input.selected)),
        },
      });
      if (q.total > 0)
        await tx.setting.update({
          where: { key: `wallet:account:${id}` },
          data: {
            value: JSON.stringify({
              balance: wallet.balance - q.total,
              bonus: wallet.bonus,
            }),
          },
        });
      if (q.packageUnits && p)
        await tx.setting.update({
          where: { key: `readyplan:v1:${id}` },
          data: {
            value: JSON.stringify({
              ...p,
              remaining: p.remaining - q.packageUnits,
            }),
          },
        });
      return { receiptId: q.receiptId, charged: q.total };
    });
    revalidatePath("/ready-papers/saved");
    revalidatePath("/wallet");
    return { ok: true as const, ...result };
  } catch (e) {
    return error(e);
  }
}
export async function readyPlanSummary() {
  try {
    const id = await userId();
    return {
      ok: true as const,
      ...(await walletTransaction(async (tx) => ({
        wallet: await account(tx, id),
        plan: await plan(tx, id),
      }))),
    };
  } catch (e) {
    return error(e);
  }
}
export async function buyReadyPlan() {
  try {
    const id = await userId();
    const result = await walletTransaction(async (tx) => {
      const w = await account(tx, id);
      const p = await plan(tx, id);
      if (p)
        throw new WalletError(
          "বর্তমান প্যাকেজের মেয়াদ শেষ হলে নতুন প্যাকেজ নিতে পারবেন।",
        );
      if (w.admin)
        throw new WalletError(
          "Admin-এর জন্য প্রশ্নপত্র বিনামূল্যে। প্যাকেজ প্রয়োজন নেই।",
        );
      if (w.balance < READY_MONTH_PAISA)
        throw new WalletError(
          "প্যাকেজের জন্য ব্যালেন্সে ৳৯৯ প্রয়োজন। Wallet থেকে recharge করুন।",
        );
      const now = new Date(),
        purchaseId = randomUUID();
      const next: Plan = {
        id: purchaseId,
        remaining: READY_MONTH_UNITS,
        expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
      };
      await tx.setting.update({
        where: { key: `wallet:account:${id}` },
        data: {
          value: JSON.stringify({
            balance: w.balance - READY_MONTH_PAISA,
            bonus: w.bonus,
          }),
        },
      });
      await tx.setting.upsert({
        where: { key: `readyplan:v1:${id}` },
        create: { key: `readyplan:v1:${id}`, value: JSON.stringify(next) },
        update: { value: JSON.stringify(next) },
      });
      await tx.setting.create({
        data: {
          key: `readyplanreceipt:v1:${id}:${purchaseId}`,
          value: JSON.stringify({
            amount: READY_MONTH_PAISA,
            units: 30,
            at: now.toISOString(),
            ...next,
          }),
        },
      });
      return next;
    });
    revalidatePath("/wallet");
    revalidatePath("/ready-papers/saved");
    return { ok: true as const, plan: result };
  } catch (e) {
    return error(e);
  }
}
export async function saveReadyPurchase(
  receiptId: string,
  raw: unknown,
  selected?: unknown,
) {
  try {
    const id = await userId();
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(receiptId);
    const snapshot = readySnapshotSchema.parse(raw);
    await walletTransaction(async (tx) => {
      const key = receiptKey(id, receiptId);
      const row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw new WalletError("আগে প্রশ্নপত্রের checkout করুন।");
      const owned = JSON.parse(row.value) as ReadyPurchase;
      if (owned.ownerId !== id) throw new WalletError("অনুমতি নেই।");
      if (selected !== undefined) {
        const order = readySelectionSchema.parse({
          paperId: owned.paperId,
          selected,
        }).selected;
        if (
          readySelectionIdentity(order) !==
          readySelectionIdentity(owned.selected)
        )
          throw new WalletError("নতুন পৃষ্ঠা নির্বাচনের checkout করুন।");
        owned.selected = order;
      }
      owned.snapshot = {
        ...snapshot,
        edits: Object.fromEntries(
          owned.selected
            .map((n) => [n, snapshot.edits[n]])
            .filter(([, v]) => v),
        ),
      };
      owned.updatedAt = new Date().toISOString();
      await tx.setting.update({
        where: { key },
        data: { value: JSON.stringify(owned) },
      });
    });
    revalidatePath("/ready-papers/saved");
    return { ok: true as const };
  } catch (e) {
    return error(e);
  }
}
export async function listReadyPurchases() {
  const id = await userId();
  const rows = await db.setting.findMany({
    where: { key: { startsWith: `readyowned:v1:${id}:` } },
  });
  return rows
    .flatMap((r) => {
      try {
        const p = JSON.parse(r.value) as ReadyPurchase;
        return p.ownerId === id ? [p] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getReadyPurchase(receiptId: string) {
  const id = await userId();
  if (!/^[a-f0-9]{64}$/.test(receiptId)) return null;
  return walletTransaction(async (tx) => {
    const key = receiptKey(id, receiptId);
    const row = await tx.setting.findUnique({ where: { key } });
    if (!row) return null;
    const p = JSON.parse(row.value) as ReadyPurchase;
    if (p.ownerId !== id) return null;
    let changed = false;
    for (const n of p.selected) {
      if (p.answers.some((a) => a.questionPage === n)) continue;
      const row = await tx.setting.findUnique({
        where: { key: ANSWER_PREFIX + p.paperId + ":" + n },
      });
      if (!row) continue;
      const a = answerEntrySchema.safeParse(JSON.parse(row.value));
      if (a.success && a.data.approved) {
        p.answers.push(a.data);
        changed = true;
      }
    }
    if (changed)
      await tx.setting.update({
        where: { key },
        data: { value: JSON.stringify(p) },
      });
    return p;
  });
}
