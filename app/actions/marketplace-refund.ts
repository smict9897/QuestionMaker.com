"use server";
import { auth } from "@/auth";
import {
  walletTransaction,
  account,
  changeWalletFunds,
  WalletError,
} from "@/lib/wallet";
import { purchaseKey, validatePurchase } from "@/lib/marketplace-purchase";
import {
  disputeKey,
  parseDispute,
  marketDebitKey,
  refundSources,
  type MarketDispute,
} from "@/lib/marketplace-refund";
import { saleReceipt } from "@/lib/marketplace-report";
import { revalidatePath } from "next/cache";
export type DisputeState = { ok: boolean; message: string };
async function actor() {
  const id = (await auth())?.user?.id;
  if (!id) throw new WalletError("আগে লগইন করুন।");
  return id;
}
function fail(e: unknown): DisputeState {
  return {
    ok: false,
    message:
      e instanceof WalletError
        ? e.message
        : "কাজটি হয়নি। কোনো আংশিক রিফান্ড হয়নি; পরে আবার চেষ্টা করুন।",
  };
}
function refresh(id: string) {
  revalidatePath("/wallet");
  revalidatePath("/dashboard/library");
  revalidatePath(`/dashboard/library/${id}`);
  revalidatePath(`/dashboard/library/${id}/report`);
  revalidatePath("/admin/marketplace-disputes");
  revalidatePath("/admin/marketplace-revenue");
}
export async function reportMarketPurchase(
  _: DisputeState,
  form: FormData,
): Promise<DisputeState> {
  try {
    const buyerId = await actor(),
      id = String(form.get("paperId") || ""),
      reason = String(form.get("reason") || "").trim();
    if (
      !/^[a-f0-9]{64}$/.test(id) ||
      reason.length < 10 ||
      reason.length > 2000 ||
      form.get("confirmed") !== "on"
    )
      throw new WalletError("১০–২০০০ অক্ষরে সমস্যা লিখে সম্মতি দিন।");
    await walletTransaction(async (tx) => {
      const buyer = await account(tx, buyerId);
      if (buyer.admin) throw new WalletError("ADMIN-এর জন্য প্রযোজ্য নয়।");
      const key = disputeKey(buyerId, id),
        existing = await tx.setting.findUnique({ where: { key } });
      if (existing) {
        parseDispute(key, existing.value);
        return;
      }
      const row = await tx.setting.findUnique({
        where: { key: purchaseKey(buyerId, id) },
      });
      if (!row)
        throw new WalletError("শুধু নিজের কেনা প্রশ্নপত্রে অভিযোগ করা যাবে।");
      validatePurchase(row.value, buyerId, id);
      const record: MarketDispute = {
        version: 1,
        buyerId,
        paperId: id,
        reason,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      };
      await tx.setting.create({ data: { key, value: JSON.stringify(record) } });
    });
    refresh(id);
    return {
      ok: true,
      message:
        "অভিযোগ নথিভুক্ত আছে। নিচে বর্তমান অবস্থা দেখুন। এটি স্বয়ংক্রিয় রিফান্ড নয়।",
    };
  } catch (e) {
    return fail(e);
  }
}
export async function reviewMarketDispute(
  _: DisputeState,
  form: FormData,
): Promise<DisputeState> {
  try {
    const reviewerId = await actor(),
      key = String(form.get("key") || ""),
      decision = String(form.get("decision") || ""),
      note = String(form.get("note") || "").trim();
    if (
      !key.startsWith("market:dispute:v1:") ||
      key.length > 300 ||
      !["REJECTED", "REFUNDED"].includes(decision) ||
      note.length < 10 ||
      note.length > 1000 ||
      (decision === "REFUNDED" && form.get("confirmed") !== "on")
    )
      throw new WalletError(
        "সিদ্ধান্ত, ১০–১০০০ অক্ষরের নোট এবং রিফান্ডের সম্মতি দিন।",
      );
    const id = await walletTransaction(async (tx) => {
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
      if (!row) throw new WalletError("অভিযোগ পাওয়া যায়নি।");
      const d = parseDispute(key, row.value);
      if (d.status !== "OPEN") {
        if (d.status === decision) return d.paperId;
        throw new WalletError("আগেই নিষ্পত্তি হয়েছে।");
      }
      if (decision === "REFUNDED") {
        const copyKey = purchaseKey(d.buyerId, d.paperId),
          copy = await tx.setting.findUnique({ where: { key: copyKey } });
        if (!copy) throw new WalletError("কেনার রসিদ পাওয়া যায়নি।");
        const purchase = validatePurchase(copy.value, d.buyerId, d.paperId);
        const ledger = await tx.setting.findUnique({
          where: { key: marketDebitKey(d.buyerId, d.paperId) },
        });
        if (!ledger)
          throw new WalletError(
            "মূল source ledger নেই; স্বয়ংক্রিয় রিফান্ড বন্ধ। আগে হিসাব যাচাই করুন।",
          );
        const sources = refundSources(
          ledger.value,
          d.buyerId,
          d.paperId,
          purchase.amount,
        );
        const platformKey = `market:platform:v1:${d.buyerId}:${d.paperId}`,
          platform = await tx.setting.findUnique({
            where: { key: platformKey },
          }),
          receipt = platform && saleReceipt(platformKey, platform.value);
        if (
          !receipt ||
          receipt.sellerId !== purchase.sellerId ||
          receipt.amount !== purchase.amount
        )
          throw new WalletError("প্ল্যাটফর্ম রসিদ মেলেনি।");
        const seller = await account(tx, purchase.sellerId);
        if (seller.admin || seller.funds.earnings < purchase.sellerAmount)
          throw new WalletError(
            "বিক্রেতার অবশিষ্ট বিক্রির আয় যথেষ্ট নয়। অভিযোগ খোলা আছে; বাহ্যিক সমন্বয় ছাড়া রিফান্ড করা যাবে না। অন্য উৎসের টাকা কাটা হয়নি।",
          );
        await changeWalletFunds(tx, purchase.sellerId, {
          operationId: `market-refund:${d.buyerId}:${d.paperId}`,
          amount: purchase.sellerAmount,
          direction: "DEBIT",
          earningsOnly: true,
          description: "মার্কেটপ্লেস রিফান্ডে বিক্রির আয় ফেরত",
        });
        for (const source of [
          "bonus",
          "recharge",
          "received",
          "earnings",
        ] as const) {
          if (sources[source])
            await changeWalletFunds(tx, d.buyerId, {
              operationId: `market-refund:${d.paperId}:${source}`,
              amount: sources[source],
              direction: "CREDIT",
              source,
              description: "মার্কেটপ্লেস রিফান্ড: মূল উৎসে টাকা ফেরত",
            });
        }
        const refundedAt = new Date().toISOString();
        await tx.setting.update({
          where: { key: copyKey },
          data: { value: JSON.stringify({ ...purchase, refundedAt }) },
        });
        await tx.setting.create({
          data: {
            key: `market:refund:v1:${d.buyerId}:${d.paperId}`,
            value: JSON.stringify({
              version: 1,
              buyerId: d.buyerId,
              paperId: d.paperId,
              sellerId: purchase.sellerId,
              amount: purchase.amount,
              sellerAmount: purchase.sellerAmount,
              platformAmount: purchase.platformAmount,
              sources,
              refundedAt,
              reviewerId,
              note,
            }),
          },
        });
      }
      await tx.setting.update({
        where: { key },
        data: {
          value: JSON.stringify({
            ...d,
            status: decision,
            note,
            reviewerId,
            reviewedAt: new Date().toISOString(),
          }),
        },
      });
      return d.paperId;
    });
    refresh(id);
    return {
      ok: true,
      message:
        decision === "REFUNDED"
          ? "সম্পূর্ণ মূল্য মূল উৎসে ফেরত; অনলাইন কেনা কপির অ্যাক্সেস বন্ধ।"
          : "অভিযোগ নোটসহ নিষ্পত্তি হয়েছে; টাকা পরিবর্তন হয়নি।",
    };
  } catch (e) {
    return fail(e);
  }
}
