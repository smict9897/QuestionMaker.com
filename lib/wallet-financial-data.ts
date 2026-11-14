import "server-only";
import { db } from "@/lib/db";
import {
  financialReport,
  reportRange,
  REPORT_SCAN_LIMIT,
  PLATFORM_RECEIPT_PREFIX,
} from "@/lib/wallet-financial-report";
/** A repeatable-read snapshot, not three unrelated live totals. Never scans purchased copies. */
export async function readFinancialReport(
  actorId: string,
  from?: string,
  to?: string,
) {
  if (!actorId) throw Error("Admin required");
  const range = reportRange(from, to);
  return db.$transaction(
    async (tx) => {
      if (
        (
          await tx.user.findUnique({
            where: { id: actorId },
            select: { role: true },
          })
        )?.role !== "ADMIN"
      )
        throw Error("Admin required");
      // PostgreSQL transaction time describes the common consistent read snapshot.
      const [clock] = await tx.$queryRaw<
        { at: Date }[]
      >`SELECT transaction_timestamp() AS at`;
      const query = (prefix: string) =>
        tx.setting.findMany({
          where: { key: { startsWith: prefix } },
          orderBy: { key: "asc" },
          take: REPORT_SCAN_LIMIT + 1,
          select: { key: true, value: true },
        });
      const sales = await query(PLATFORM_RECEIPT_PREFIX),
        refunds = await query("market:refund:v1:"),
        withdrawals = await query("wallet:withdrawal:v1:");
      return {
        range,
        asOf: clock.at.toISOString(),
        ...financialReport(sales, refunds, withdrawals, range),
      };
    },
    { isolationLevel: "RepeatableRead", maxWait: 5000, timeout: 20000 },
  );
}
