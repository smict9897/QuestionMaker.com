export function rechargeListOptions(after?: string) {
  const cursor =
    after &&
    after.startsWith("wallet:recharge:") &&
    after.length <= 300 &&
    !/[\u0000-\u001f\u007f]/.test(after)
      ? after
      : undefined;
  return {
    cursor,
    query: {
      where: {
        key: {
          startsWith: "wallet:recharge:",
          ...(cursor ? { gt: cursor } : {}),
        },
        value: { contains: '"status":"PENDING"' },
      },
      take: 201,
      orderBy: { key: "asc" as const },
    },
  };
}
export function rechargeListPage<T extends { key: string }>(source: T[]) {
  const rows = source.slice(0, 200);
  return {
    rows,
    next:
      source.length > 200
        ? `/admin/wallet?after=${encodeURIComponent(rows[199].key)}`
        : null,
  };
}
