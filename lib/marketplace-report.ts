export const PLATFORM_RECEIPT_PREFIX = "market:platform:v1:";
export type SaleReceipt = {
  buyerId: string;
  sellerId: string;
  paperId: string;
  amount: number;
  sellerAmount: number;
  platformAmount: number;
  at: string;
};
/** Do not read purchased snapshots merely to report financial receipts. */
export function saleReceipt(key: string, raw: string): SaleReceipt | null {
  try {
    const r = JSON.parse(raw);
    if (
      !r ||
      typeof r.buyerId !== "string" ||
      !r.buyerId ||
      typeof r.sellerId !== "string" ||
      !r.sellerId ||
      r.buyerId === r.sellerId ||
      typeof r.paperId !== "string" ||
      !/^[a-f0-9]{64}$/.test(r.paperId) ||
      key !== `${PLATFORM_RECEIPT_PREFIX}${r.buyerId}:${r.paperId}` ||
      !Number.isSafeInteger(r.amount) ||
      r.amount < 100 ||
      r.amount > 5000000 ||
      r.sellerAmount !== Math.floor((r.amount * 60) / 100) ||
      r.platformAmount !== r.amount - r.sellerAmount ||
      typeof r.at !== "string" ||
      !Number.isFinite(Date.parse(r.at))
    )
      return null;
    return {
      buyerId: r.buyerId,
      sellerId: r.sellerId,
      paperId: r.paperId,
      amount: r.amount,
      sellerAmount: r.sellerAmount,
      platformAmount: r.platformAmount,
      at: r.at,
    };
  } catch {
    return null;
  }
}
export function pageRevenue(receipts: SaleReceipt[]) {
  return receipts.reduce(
    (sum, r) => ({
      count: sum.count + 1,
      amount: sum.amount + r.amount,
      sellerAmount: sum.sellerAmount + r.sellerAmount,
      platformAmount: sum.platformAmount + r.platformAmount,
    }),
    { count: 0, amount: 0, sellerAmount: 0, platformAmount: 0 },
  );
}
