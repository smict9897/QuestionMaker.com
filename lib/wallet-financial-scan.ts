import {
  financialReport,
  PLATFORM_RECEIPT_PREFIX,
  type ReportRange,
  type ReportRow,
} from "@/lib/wallet-financial-report";

export const REPORT_BATCH_SIZE = 500;
export type ReportPrefix =
  | typeof PLATFORM_RECEIPT_PREFIX
  | "market:refund:v1:"
  | "wallet:withdrawal:v1:";
type Reader = {
  page: (
    prefix: ReportPrefix,
    after: string | undefined,
    take: number,
  ) => Promise<ReportRow[]>;
  sales: (keys: string[]) => Promise<ReportRow[]>;
};
function exact(n: number) {
  if (!Number.isSafeInteger(n))
    throw Error("Report total exceeds safe integer precision");
  return n;
}
function add<T extends Record<string, number>>(a: T, b: T): T {
  return Object.fromEntries(
    Object.keys(a).map((k) => [k, exact(a[k] + b[k])]),
  ) as T;
}
/** Constant batch memory. Caller must keep every read in one repeatable-read snapshot.
 * Timeout/query failures throw; never label a partial scan complete. No purchased snapshots read.
 */
export async function scanFinancialReport(
  reader: Reader,
  range: ReportRange | null,
) {
  const total = financialReport([], [], [], range);
  async function scan(
    prefix: ReportPrefix,
    consume: (rows: ReportRow[]) => Promise<void>,
  ) {
    let after: string | undefined;
    while (true) {
      const rows = await reader.page(prefix, after, REPORT_BATCH_SIZE);
      if (rows.length > REPORT_BATCH_SIZE) throw Error("Report batch overflow");
      let last = after;
      for (const row of rows) {
        if (
          !row.key.startsWith(prefix) ||
          (last !== undefined && row.key <= last)
        )
          throw Error("Invalid report cursor");
        last = row.key;
      }
      if (rows.length) await consume(rows);
      if (rows.length < REPORT_BATCH_SIZE) return;
      after = last;
    }
  }
  await scan(PLATFORM_RECEIPT_PREFIX, async (rows) => {
    const r = financialReport(rows, [], [], range);
    total.gross = add(total.gross, r.gross);
    total.invalidSales = exact(total.invalidSales + r.invalidSales);
    total.scanned.sales = exact(total.scanned.sales + rows.length);
  });
  await scan("market:refund:v1:", async (rows) => {
    // Match by immutable receipt key, not arbitrary JSON identities. Original sales may
    // be in another scan batch or outside the selected event-date range.
    const keys = rows.map(
      (r) => PLATFORM_RECEIPT_PREFIX + r.key.slice("market:refund:v1:".length),
    );
    const expected = new Set(keys);
    const sales = await reader.sales(keys);
    if (
      sales.length > keys.length ||
      sales.some((r) => !expected.has(r.key)) ||
      new Set(sales.map((r) => r.key)).size !== sales.length
    )
      throw Error("Invalid sale lookup");
    const r = financialReport(sales, rows, [], range);
    total.refunds = add(total.refunds, r.refunds);
    total.invalidRefunds = exact(total.invalidRefunds + r.invalidRefunds);
    total.scanned.refunds = exact(total.scanned.refunds + rows.length);
  });
  await scan("wallet:withdrawal:v1:", async (rows) => {
    const r = financialReport([], [], rows, range);
    total.payout = add(total.payout, r.payout);
    total.rejected = add(total.rejected, r.rejected);
    total.held = add(total.held, r.held);
    total.invalidWithdrawals = exact(
      total.invalidWithdrawals + r.invalidWithdrawals,
    );
    total.scanned.withdrawals = exact(total.scanned.withdrawals + rows.length);
  });
  total.adjusted = {
    amount: exact(total.gross.amount - total.refunds.amount),
    sellerAmount: exact(total.gross.sellerAmount - total.refunds.sellerAmount),
    platformAmount: exact(
      total.gross.platformAmount - total.refunds.platformAmount,
    ),
  };
  total.complete =
    !total.invalidSales && !total.invalidRefunds && !total.invalidWithdrawals;
  return total;
}
