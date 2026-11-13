import "server-only";
import { db } from "@/lib/db";
import { MARKET_PREFIX } from "@/lib/marketplace";
import { publicMarketPaper } from "@/lib/marketplace-catalog";

export async function marketCatalog(after?: string) {
  const cursor =
    after && /^[a-f0-9]{64}$/.test(after) ? MARKET_PREFIX + after : undefined;
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: MARKET_PREFIX, ...(cursor ? { gt: cursor } : {}) },
      value: { contains: '"status":"APPROVED"' },
    },
    orderBy: { key: "asc" },
    take: 201,
  });
  return {
    papers: rows.slice(0, 200).flatMap((row) => {
      const paper = publicMarketPaper(row.value);
      return paper && row.key === MARKET_PREFIX + paper.id ? [paper] : [];
    }),
    next: rows.length > 200 ? rows[199].key.slice(MARKET_PREFIX.length) : null,
  };
}
