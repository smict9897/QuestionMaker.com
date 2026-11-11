export const QUESTION_TYPE_OPTIONS = [
  { value: "ALL", label: "সকল প্রকার" },
  { value: "MCQ", label: "MCQ" },
  { value: "SHORT", label: "সংক্ষিপ্ত" },
  { value: "CQ", label: "সৃজনশীল" },
  { value: "MCQ_SHORT", label: "MCQ, সংক্ষিপ্ত" },
  { value: "MCQ_SHORT_CQ", label: "MCQ, সংক্ষিপ্ত, সৃজনশীল" },
] as const;
export function normalizeQuestionType(value: unknown) {
  return QUESTION_TYPE_OPTIONS.some((o) => o.value === value)
    ? String(value)
    : "ALL";
}
export function selectedQuestionTypes(value: unknown): string[] {
  const v = normalizeQuestionType(value);
  return v === "ALL" ? ["MCQ", "SHORT", "CQ"] : v.split("_");
}
