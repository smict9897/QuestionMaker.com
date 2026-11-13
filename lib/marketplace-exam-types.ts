/** Shared by seller profiles, admin review and future marketplace filters. */
export const MARKET_EXAM_TYPES = [
  "অর্ধ বার্ষিক পরীক্ষা",
  "বার্ষিক পরীক্ষা",
  "নির্বাচনী পরীক্ষা",
] as const;

export function marketExamLabel(examType: unknown) {
  return MARKET_EXAM_TYPES.includes(
    examType as (typeof MARKET_EXAM_TYPES)[number],
  )
    ? String(examType)
    : "পরীক্ষার ধরন উল্লেখ করা হয়নি";
}
