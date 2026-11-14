import { scanFinancialReport } from "@/lib/wallet-financial-scan";
import "server-only";
import { db } from "@/lib/db";
import { reportRange } from "@/lib/wallet-financial-report";
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
      const report = await scanFinancialReport(
        {
          page: (prefix, after, take) =>
            tx.setting.findMany({
              where: {
                key: { startsWith: prefix, ...(after ? { gt: after } : {}) },
              },
              orderBy: { key: "asc" },
              take,
              select: { key: true, value: true },
            }),
          sales: (keys) =>
            tx.setting.findMany({
              where: { key: { in: keys } },
              take: keys.length,
              select: { key: true, value: true },
            }),
        },
        range,
      );
      return { range, asOf: clock.at.toISOString(), ...report };
    },
    { isolationLevel: "RepeatableRead", maxWait: 5000, timeout: 60000 },
  );
}
