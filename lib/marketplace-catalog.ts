import { marketMetadataSchema, type MarketMetadata } from "@/lib/marketplace";
import { teacherTid } from "@/lib/wallet";

export type PublicMarketPaper = {
  id: string;
  sellerTid: string;
  metadata: MarketMetadata;
  updatedAt: string;
};
/** Explicit allowlist: never spread submission/snapshot/owner/review into public data. */
export function publicMarketPaper(raw: string): PublicMarketPaper | null {
  try {
    const record = JSON.parse(raw);
    const metadata = marketMetadataSchema.safeParse(record.metadata);
    if (
      record.version !== 1 ||
      record.status !== "APPROVED" ||
      !metadata.success ||
      !/^[a-f0-9]{64}$/.test(record.id) ||
      typeof record.ownerId !== "string" ||
      !record.ownerId ||
      typeof record.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(record.updatedAt))
    )
      return null;
    return {
      id: record.id,
      sellerTid: teacherTid(record.ownerId),
      metadata: metadata.data,
      updatedAt: record.updatedAt,
    };
  } catch {
    return null;
  }
}
export function filterMarketPapers(
  papers: PublicMarketPaper[],
  filters: {
    grade?: string;
    subject?: string;
    chapter?: string;
    examType?: string;
    sellerTid?: string;
  },
) {
  return papers.filter(
    (p) =>
      (!filters.grade || p.metadata.grade === filters.grade) &&
      (!filters.subject || p.metadata.subject === filters.subject) &&
      (!filters.chapter || p.metadata.chapters.includes(filters.chapter)) &&
      (!filters.examType || p.metadata.examType === filters.examType) &&
      (!filters.sellerTid || p.sellerTid === filters.sellerTid),
  );
}
