import { z } from "zod";
export const ANSWER_PREFIX = "readyanswers:v1:";
export const answerEntrySchema = z
  .object({
    questionPage: z.number().int().min(1).max(100),
    sourcePage: z.number().int().min(1).max(100),
    label: z.string().trim().min(1).max(120),
    answers: z
      .array(z.enum(["ক", "খ", "গ", "ঘ", "?"]))
      .min(1)
      .max(100),
    approved: z.boolean(),
  })
  .refine(
    (v) => !v.approved || !v.answers.includes("?"),
    "অমীমাংসিত উত্তর অনুমোদন করা যাবে না।",
  );
export type ReadyAnswer = z.infer<typeof answerEntrySchema>;
export function parseAnswerRows(text: string, count: number) {
  const result: string[] = Array.from(
    { length: Math.min(100, Math.max(1, count)) },
    () => "?",
  );
  const seen = new Set<number>();
  const normalized = text.replace(/[০-৯]/g, (c) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(c)),
  );
  const map: Record<string, string> = {
    K: "ক",
    L: "খ",
    M: "গ",
    N: "ঘ",
    ক: "ক",
    খ: "খ",
    গ: "গ",
    ঘ: "ঘ",
    "*": "?",
    "?": "?",
  };
  for (const match of normalized.matchAll(
    /(\d{1,3})\s*[.):-]?\s*([KLMNকখগঘ*?])(?![A-Za-z])/g,
  )) {
    const n = Number(match[1]);
    if (n < 1 || n > result.length) continue;
    result[n - 1] = seen.has(n) ? "?" : map[match[2]];
    seen.add(n);
  }
  return result as ReadyAnswer["answers"];
}
