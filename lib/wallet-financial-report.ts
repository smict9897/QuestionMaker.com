import {
  saleReceipt,
  matchingRefund,
  pageRevenue,
  PLATFORM_RECEIPT_PREFIX,
} from "@/lib/marketplace-report";
import { parseWithdrawal } from "@/lib/wallet-withdrawal";
export type ReportRow = { key: string; value: string };
export const REPORT_SCAN_LIMIT = 10000;
export type ReportRange = {
  from: string;
  to: string;
  start: number;
  end: number;
};
function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error("Invalid report date");
  const n = Date.parse(value + "T00:00:00+06:00");
  if (
    !Number.isFinite(n) ||
    new Date(n + 6 * 3600000).toISOString().slice(0, 10) !== value
  )
    throw Error("Invalid report date");
  return n;
}
export function reportRange(from?: string, to?: string): ReportRange | null {
  if (!from && !to) return null;
  if (!from || !to) throw Error("দুটি তারিখই দিন।");
  const start = date(from),
    end = date(to) + 86400000;
  if (start >= end) throw Error("শুরুর তারিখ শেষ তারিখের পরে নয়।");
  return { from, to, start, end };
}
function inRange(value: string, range: ReportRange | null) {
  const n = Date.parse(value);
  return Number.isFinite(n) && (!range || (n >= range.start && n < range.end));
}
/** Pure read model; sale/refund counted by their own event date, holds as of snapshot.
 * Refunded originals are retained in gross sale history, never silently removed. */
export function financialReport(
  sales: ReportRow[],
  refunds: ReportRow[],
  withdrawals: ReportRow[],
  range: ReportRange | null,
) {
  const truncated =
    sales.length > REPORT_SCAN_LIMIT ||
    refunds.length > REPORT_SCAN_LIMIT ||
    withdrawals.length > REPORT_SCAN_LIMIT;
  const allSales = sales.slice(0, REPORT_SCAN_LIMIT).flatMap((row) => {
    const r = saleReceipt(row.key, row.value);
    return r ? [r] : [];
  });
  const index = new Map(allSales.map((r) => [`${r.buyerId}:${r.paperId}`, r]));
  const gross = pageRevenue(allSales.filter((r) => inRange(r.at, range)));
  let invalidSales =
      Math.min(sales.length, REPORT_SCAN_LIMIT) - allSales.length,
    invalidRefunds = 0,
    invalidWithdrawals = 0;
  const refundTotals = {
    count: 0,
    amount: 0,
    sellerAmount: 0,
    platformAmount: 0,
  };
  for (const row of refunds.slice(0, REPORT_SCAN_LIMIT)) {
    try {
      const r = JSON.parse(row.value),
        sale = index.get(`${r.buyerId}:${r.paperId}`);
      if (
        !sale ||
        row.key !== `market:refund:v1:${r.buyerId}:${r.paperId}` ||
        !matchingRefund(row.value, sale) ||
        Date.parse(r.refundedAt) < Date.parse(sale.at)
      )
        throw Error();
      if (inRange(r.refundedAt, range)) {
        refundTotals.count++;
        refundTotals.amount += sale.amount;
        refundTotals.sellerAmount += sale.sellerAmount;
        refundTotals.platformAmount += sale.platformAmount;
      }
    } catch {
      invalidRefunds++;
    }
  }
  const payout = { count: 0, amount: 0 },
    rejected = { count: 0, amount: 0 },
    held = { count: 0, amount: 0, claimed: 0 };
  for (const row of withdrawals.slice(0, REPORT_SCAN_LIMIT)) {
    try {
      const r = parseWithdrawal(row.key, row.value);
      if (r.status === "HELD") {
        held.count++;
        held.amount += r.amount;
        if (r.claimedBy) held.claimed++;
      } else {
        if (
          typeof r.reviewedAt !== "string" ||
          !Number.isFinite(Date.parse(r.reviewedAt)) ||
          Date.parse(r.reviewedAt) < Date.parse(r.createdAt) ||
          typeof r.reviewerId !== "string" ||
          !r.reviewerId ||
          (r.status === "PAID" && (!r.trx || !/^[A-Z0-9]{6,30}$/.test(r.trx)))
        )
          throw Error();
        if (inRange(r.reviewedAt, range)) {
          const total = r.status === "PAID" ? payout : rejected;
          total.count++;
          total.amount += r.amount;
        }
      }
    } catch {
      invalidWithdrawals++;
    }
  }
  return {
    truncated,
    invalidSales,
    invalidRefunds,
    invalidWithdrawals,
    complete:
      !truncated && !invalidSales && !invalidRefunds && !invalidWithdrawals,
    gross,
    refunds: refundTotals,
    adjusted: {
      amount: gross.amount - refundTotals.amount,
      sellerAmount: gross.sellerAmount - refundTotals.sellerAmount,
      platformAmount: gross.platformAmount - refundTotals.platformAmount,
    },
    payout,
    rejected,
    held,
    scanned: {
      sales: Math.min(sales.length, REPORT_SCAN_LIMIT),
      refunds: Math.min(refunds.length, REPORT_SCAN_LIMIT),
      withdrawals: Math.min(withdrawals.length, REPORT_SCAN_LIMIT),
    },
  };
}
export { PLATFORM_RECEIPT_PREFIX };
