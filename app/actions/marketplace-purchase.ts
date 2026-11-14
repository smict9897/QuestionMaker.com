"use server";
import { auth } from "@/auth";
import { MARKET_PREFIX } from "@/lib/marketplace";
import {
  purchaseKey,
  purchaseTerms,
  saleRecord,
  revenueSplit,
  validatePurchase,
  type MarketPurchase,
} from "@/lib/marketplace-purchase";
import {
  walletTransaction,
  account,
  changeWalletFunds,
  WalletError,
} from "@/lib/wallet";
import { revalidatePath } from "next/cache";
export type PurchaseState = { ok: boolean; message: string; paperId?: string };
async function actor() {
  const id = (await auth())?.user?.id;
  if (!id) throw new WalletError("আগে লগইন করুন।");
  return id;
}
function fail(e: unknown): PurchaseState {
  return {
    ok: false,
    message:
      e instanceof WalletError
        ? e.message
        : "লেনদেন হয়নি। তথ্য নতুন করে খুলে আবার চেষ্টা করুন।",
  };
}
export async function buyMarketPaper(
  _: PurchaseState,
  form: FormData,
): Promise<PurchaseState> {
  try {
    const buyerId = await actor(),
      id = String(form.get("paperId") || ""),
      terms = String(form.get("terms") || "");
    if (
      !/^[a-f0-9]{64}$/.test(id) ||
      !/^[a-f0-9]{64}$/.test(terms) ||
      form.get("confirmed") !== "on"
    )
      throw new WalletError("মূল্য ও কেনার শর্ত নিশ্চিত করুন।");
    await walletTransaction(async (tx) => {
      const buyer = await account(tx, buyerId);
      if (buyer.admin)
        throw new WalletError("ADMIN নিজের জন্য এই checkout ব্যবহার করবেন না।");
      const key = purchaseKey(buyerId, id),
        previous = await tx.setting.findUnique({ where: { key } });
      if (previous) {
        validatePurchase(previous.value, buyerId, id);
        return;
      }
      const row = await tx.setting.findUnique({
        where: { key: MARKET_PREFIX + id },
      });
      if (!row) throw new WalletError("প্রশ্নপত্র পাওয়া যায়নি।");
      const r = saleRecord(row.value, id);
      if (r.ownerId === buyerId)
        throw new WalletError("নিজের প্রশ্নপত্র কেনা যাবে না।");
      if (purchaseTerms(r) !== terms)
        throw new WalletError(
          "মূল্য বা প্রশ্নপত্র বদলেছে। নতুন করে বিবরণ খুলে নিশ্চিত করুন।",
        );
      const seller = await account(tx, r.ownerId);
      if (seller.admin)
        throw new WalletError("এই বিক্রেতার checkout এখন উপলব্ধ নয়।");
      const amount = r.metadata.pricePaisa,
        split = revenueSplit(amount),
        operation = `market-buy:${buyerId}:${id}`;
      await changeWalletFunds(tx, buyerId, {
        operationId: operation,
        amount,
        direction: "DEBIT",
        description: `প্রশ্নপত্র কেনা: ${r.metadata.title}`,
      });
      await changeWalletFunds(tx, r.ownerId, {
        operationId: operation,
        amount: split.sellerAmount,
        direction: "CREDIT",
        source: "earnings",
        description: `প্রশ্নপত্র বিক্রির ৬০% আয়: ${r.metadata.title}`,
      });
      const purchase: MarketPurchase = {
        version: 1,
        buyerId,
        paperId: id,
        sellerId: r.ownerId,
        title: r.metadata.title,
        amount,
        ...split,
        snapshot: r.snapshot,
        snapshotHash: r.snapshotHash,
        revision: r.revision,
        purchasedAt: new Date().toISOString(),
        institution: "",
      };
      await tx.setting.create({
        data: { key, value: JSON.stringify(purchase) },
      });
      await tx.setting.create({
        data: {
          key: `market:platform:v1:${buyerId}:${id}`,
          value: JSON.stringify({
            buyerId,
            sellerId: r.ownerId,
            paperId: id,
            ...split,
            amount,
            at: purchase.purchasedAt,
          }),
        },
      });
    });
    revalidatePath("/wallet");
    revalidatePath("/dashboard/library");
    revalidatePath(`/marketplace/${id}`);
    return {
      ok: true,
      message: "কেনা কপি লাইব্রেরিতে সংরক্ষিত আছে। আবার খুললে চার্জ হবে না।",
      paperId: id,
    };
  } catch (e) {
    return fail(e);
  }
}
export async function savePurchasedInstitution(
  _: PurchaseState,
  form: FormData,
): Promise<PurchaseState> {
  try {
    const buyerId = await actor(),
      id = String(form.get("paperId") || ""),
      institution = String(form.get("institution") || "").trim();
    if (
      !/^[a-f0-9]{64}$/.test(id) ||
      institution.length < 2 ||
      institution.length > 200 ||
      /[\r\n\x00-\x1f]/.test(institution)
    )
      throw new WalletError("এক লাইনে ২–২০০ অক্ষরের প্রতিষ্ঠানের নাম দিন।");
    await walletTransaction(async (tx) => {
      await account(tx, buyerId);
      const key = purchaseKey(buyerId, id),
        row = await tx.setting.findUnique({ where: { key } });
      if (!row) throw new WalletError("আগে প্রশ্নপত্রটি কিনুন।");
      const r = validatePurchase(row.value, buyerId, id);
      await tx.setting.update({
        where: { key },
        data: { value: JSON.stringify({ ...r, institution }) },
      });
    });
    revalidatePath(`/dashboard/library/${id}`);
    return { ok: true, message: "প্রতিষ্ঠানের নাম সংরক্ষিত।", paperId: id };
  } catch (e) {
    return fail(e);
  }
}
