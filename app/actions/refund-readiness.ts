"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  parseDispute,
  marketDebitKey,
  refundSources,
} from "@/lib/marketplace-refund";
import { purchaseKey, validatePurchase } from "@/lib/marketplace-purchase";
import { saleReceipt } from "@/lib/marketplace-report";
import { normalizeWallet } from "@/lib/wallet-funds";
export type RefundReadiness = {
  ok: boolean;
  message: string;
  shortfall?: number;
  required?: number;
  available?: number;
};
/** Advisory read only: financial approval still validates everything atomically at execution. */
export async function inspectRefundReadiness(
  _: RefundReadiness,
  form: FormData,
): Promise<RefundReadiness> {
  try {
    const actor = (await auth())?.user?.id,
      key = String(form.get("key") || "");
    if (!actor || !key.startsWith("market:dispute:v1:") || key.length > 300)
      throw Error("Invalid request");
    return await db.$transaction(
      async (tx) => {
        if (
          (
            await tx.user.findUnique({
              where: { id: actor },
              select: { role: true },
            })
          )?.role !== "ADMIN"
        )
          throw Error("Forbidden");
        const row = await tx.setting.findUnique({ where: { key } });
        if (!row) throw Error("Missing");
        const d = parseDispute(key, row.value);
        if (d.status !== "OPEN")
          return {
            ok: false,
            message: "অভিযোগ আগেই নিষ্পত্তি হয়েছে। নতুন করে টাকা ফেরত দেবেন না।",
          };
        const copy = await tx.setting.findUnique({
          where: { key: purchaseKey(d.buyerId, d.paperId) },
        });
        if (!copy) throw Error("Receipt missing");
        const p = validatePurchase(copy.value, d.buyerId, d.paperId);
        const debit = await tx.setting.findUnique({
          where: { key: marketDebitKey(d.buyerId, d.paperId) },
        });
        if (!debit) throw Error("Sources missing");
        refundSources(debit.value, d.buyerId, d.paperId, p.amount);
        const platformKey = `market:platform:v1:${d.buyerId}:${d.paperId}`,
          platform = await tx.setting.findUnique({
            where: { key: platformKey },
          }),
          sale = platform && saleReceipt(platformKey, platform.value);
        if (
          !sale ||
          sale.sellerId !== p.sellerId ||
          sale.amount !== p.amount ||
          sale.sellerAmount !== p.sellerAmount ||
          sale.platformAmount !== p.platformAmount
        )
          throw Error("Receipt mismatch");
        const seller = await tx.user.findUnique({
          where: { id: p.sellerId },
          select: { role: true },
        });
        if (!seller || seller.role === "ADMIN")
          throw Error("Seller unavailable");
        const wallet = await tx.setting.findUnique({
          where: { key: `wallet:account:${p.sellerId}` },
        });
        // Do not provision/migrate wallets merely to inspect a complaint.
        const available = wallet
            ? normalizeWallet(JSON.parse(wallet.value)).funds.earnings
            : 0,
          required = p.sellerAmount,
          shortfall = Math.max(0, required - available);
        return {
          ok: true,
          available,
          required,
          shortfall,
          message: shortfall
            ? "বিক্রেতার অবশিষ্ট earnings-এ ঘাটতি আছে। অভিযোগ খোলা রাখুন; অন্য উৎস কাটা, ঋণ তৈরি বা বাইরে টাকা পাঠানো হয়নি। বিক্রেতার বৈধ নতুন earnings এলে আবার যাচাই করা যাবে। বাহ্যিক সমন্বয়কে সরাসরি earnings হিসেবে লিখবেন না।"
            : "এই মুহূর্তে প্রয়োজনীয় seller earnings ও মূল রসিদ পাওয়া গেছে। এটি রিফান্ডের অনুমোদন নয়; সিদ্ধান্ত সংরক্ষণের সময় আবার সব যাচাই হবে।",
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 10000 },
    );
  } catch {
    return {
      ok: false,
      message:
        "রিফান্ডের প্রস্তুতি যাচাই হয়নি। বর্তমান ADMIN অনুমতি, মূল রসিদ, source ledger ও seller wallet-এর হিসাব যাচাই করুন। কোনো টাকা বা অভিযোগের অবস্থা বদলায়নি।",
    };
  }
}
