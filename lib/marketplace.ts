import { MARKET_EXAM_TYPES } from "@/lib/marketplace-exam-types";
import { z } from "zod";
import { createHash } from "node:crypto";

export const MARKET_PREFIX = "market:submission:v1:";
export const marketMetadataSchema = z.object({
  examType: z.enum(MARKET_EXAM_TYPES),
  title: z.string().trim().min(3).max(120),
  grade: z.enum(["6", "7", "8", "9", "10", "11", "12"]),
  subject: z.string().trim().min(2).max(100),
  chapters: z.array(z.string().trim().min(1).max(150)).min(1).max(30),
  description: z.string().trim().min(10).max(2000),
  pricePaisa: z.number().int().min(100).max(5000000),
  rights: z.literal(true),
});
export type MarketMetadata = z.infer<typeof marketMetadataSchema>;
export type MarketSubmission = {
  version: 1;
  id: string;
  ownerId: string;
  sourceKey: string;
  source: "DATABASE";
  status: "PENDING" | "APPROVED" | "CHANGES" | "REJECTED";
  revision: number;
  metadata: MarketMetadata;
  snapshot: { settings: unknown; questions: unknown[] };
  snapshotHash: string;
  createdAt: string;
  updatedAt: string;
  review?: { reviewerId: string; note: string; at: string };
};
export function marketSubmissionId(ownerId: string, sourceKey: string) {
  return createHash("sha256")
    .update(JSON.stringify([ownerId, sourceKey]))
    .digest("hex");
}
export function snapshotHash(snapshot: MarketSubmission["snapshot"]) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
export function databasePaperOwner(raw: string, key: string, userId: string) {
  const paper = JSON.parse(raw);
  if (
    !key.startsWith(`qbpaper:${userId}:`) ||
    paper.ownerId !== userId ||
    !Array.isArray(paper.ids) ||
    !paper.ids.length ||
    paper.ids.length > 300 ||
    !paper.ids.every((id: unknown) => typeof id === "string" && id.length > 0)
  )
    throw new Error("নিজের সংরক্ষিত ডাটাবেজ প্রশ্নপত্র নির্বাচন করুন।");
  return {
    ids: [...new Set(paper.ids as string[])],
    settings: paper.settings ?? null,
  };
}
export function assertReviewable(record: MarketSubmission, revision: number) {
  if (
    record.version !== 1 ||
    record.status !== "PENDING" ||
    record.revision !== revision ||
    snapshotHash(record.snapshot) !== record.snapshotHash
  )
    throw new Error("আবেদন বদলেছে বা আগে যাচাই হয়েছে। সর্বশেষ কপি খুলুন।");
}

export function marketPricePaisa(raw: unknown) {
  if (typeof raw !== "string" || !/^\d{1,5}(\.\d{1,2})?$/.test(raw)) return NaN;
  const [whole, fraction = ""] = raw.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
