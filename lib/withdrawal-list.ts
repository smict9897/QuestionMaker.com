export const WITHDRAWAL_LIST_PREFIX = "wallet:withdrawal:v1:";
export const WITHDRAWAL_PAGE_SIZE = 100;
export function withdrawalListOptions(rawStatus?: string, rawAfter?: string) {
  const status =
    rawStatus === "PAID" || rawStatus === "REJECTED" ? rawStatus : "HELD";
  const after =
    rawAfter &&
    rawAfter.startsWith(WITHDRAWAL_LIST_PREFIX) &&
    rawAfter.length <= 250 &&
    !/[\u0000-\u001f\u007f]/.test(rawAfter)
      ? rawAfter
      : undefined;
  return {
    status,
    after,
    query: {
      where: {
        key: {
          startsWith: WITHDRAWAL_LIST_PREFIX,
          ...(after ? { gt: after } : {}),
        },
        value: { contains: `"status":"${status}"` },
      },
      orderBy: { key: "asc" as const },
      take: WITHDRAWAL_PAGE_SIZE + 1,
    },
  };
}
/** Cursor advances by scanned keys (including corrupt rows), not rendered records. */
export function withdrawalListPage<T extends { key: string }>(
  rows: T[],
  status: string,
) {
  const page = rows.slice(0, WITHDRAWAL_PAGE_SIZE);
  return {
    rows: page,
    next:
      rows.length > WITHDRAWAL_PAGE_SIZE
        ? `/admin/withdrawals?status=${encodeURIComponent(status)}&after=${encodeURIComponent(page[page.length - 1].key)}`
        : null,
  };
}
