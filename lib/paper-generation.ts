import { createHash } from "crypto";
import { z } from "zod";
export const selectionSchema = z.object({
  category: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(200),
  topics: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
});
export function pendingSource(userId: string) {
  return `AI_PENDING:${createHash("sha256").update(userId).digest("hex")}`;
}
export function visibleQuestions(userId?: string) {
  return userId
    ? {
        OR: [
          { approved: true },
          { approved: false, source: pendingSource(userId) },
        ],
      }
    : { approved: true };
}
export function categoryAliases(key: string) {
  const n = key.replace(/^Class\s*/i, "");
  const values = new Set([key, n]);
  if (/^\d+$/.test(n)) values.add(`Class ${n}`);
  if (["SSC", "9", "10", "9-10"].includes(n))
    ["SSC", "9", "10", "Class 9", "Class 10", "Class 9-10"].forEach((v) =>
      values.add(v),
    );
  if (["HSC", "11", "12", "11-12"].includes(n))
    ["HSC", "11", "12", "Class 11", "Class 12", "Class 11-12"].forEach((v) =>
      values.add(v),
    );
  return [...values];
}
const text = z.string().trim().min(1).max(6000);
export const generatedSchema = z.object({
  questions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("MCQ"),
          text,
          options: z.object({ A: text, B: text, C: text, D: text }),
          correct: z.enum(["A", "B", "C", "D"]),
          explanation: text,
        }),
        z.object({ type: z.literal("SHORT"), text, explanation: text }),
        z.object({
          type: z.literal("CQ"),
          stimulus: text,
          subQuestions: z.object({ k: text, kh: text, g: text, gh: text }),
          explanation: z.string().max(6000).default(""),
        }),
      ]),
    )
    .min(1)
    .max(6),
});
