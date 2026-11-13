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

/** Filter before pagination; exact metadata predicates narrow the source scan. */
export async function marketCatalogPage(
  filters: {
    grade?: string;
    subject?: string;
    chapter?: string;
    examType?: string;
  },
  after?: string,
  limit = 24,
) {
  const { filterMarketPapers } = await import("@/lib/marketplace-catalog");
  const size = Math.min(24, Math.max(1, limit));
  let cursor =
    after && /^[a-f0-9]{64}$/.test(after) ? MARKET_PREFIX + after : undefined;
  const papers: ReturnType<typeof publicMarketPaper>[] = [];
  let next: string | null = null;
  let scanned = 0;
  for (let batch = 0; batch < 10; batch++) {
    const predicates = Object.entries(filters)
      .filter(([key, value]) => key !== "chapter" && value)
      .map(([key, value]) => ({
        value: { contains: `${JSON.stringify(key)}:${JSON.stringify(value)}` },
      }));
    const rows = await db.setting.findMany({
      where: {
        key: { startsWith: MARKET_PREFIX, ...(cursor ? { gt: cursor } : {}) },
        AND: [{ value: { contains: '"status":"APPROVED"' } }, ...predicates],
      },
      orderBy: { key: "asc" },
      take: 100,
    });
    if (!rows.length) {
      next = null;
      break;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      scanned++;
      cursor = row.key;
      const paper = publicMarketPaper(row.value);
      if (
        paper &&
        row.key === MARKET_PREFIX + paper.id &&
        filterMarketPapers([paper], filters).length
      )
        papers.push(paper);
      if (papers.length === size) {
        next =
          i < rows.length - 1 || rows.length === 100
            ? row.key.slice(MARKET_PREFIX.length)
            : null;
        return {
          papers: papers.filter((p): p is NonNullable<typeof p> => !!p),
          next,
          scanned,
        };
      }
    }
    if (rows.length < 100) {
      next = null;
      break;
    }
    next = cursor!.slice(MARKET_PREFIX.length);
  }
  return {
    papers: papers.filter((p): p is NonNullable<typeof p> => !!p),
    next,
    scanned,
  };
}
