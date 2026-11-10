"use server";
import { pendingSource } from "@/lib/paper-generation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const Meta = z.object({
  subject: z.string(),
  category: z.string(),
  topic: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  lang: z.enum(["Bangla", "English"]),
});
const Item = z.object({
  text: z.string().min(1),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  correct: z.enum(["A", "B", "C", "D"]),
  explanation: z.string(),
});

export async function saveQuestions(
  meta: unknown,
  items: unknown,
): Promise<{ ok: boolean; message: string }> {
  const user = (await auth())?.user;
  const role = user?.role;
  if (!user?.id || (role !== "ADMIN" && role !== "TEACHER"))
    return {
      ok: false,
      message: "Only admins and teachers can save questions.",
    };
  const m = Meta.safeParse(meta),
    q = z.array(Item).min(1).safeParse(items);
  if (!m.success || !q.success)
    return {
      ok: false,
      message:
        "Some questions are incomplete. Fill every field and save again.",
    };
  await db.question.createMany({
    data: q.data.map((i) => ({
      ...m.data,
      difficulty: m.data.difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD",
      lang: m.data.lang,
      text: i.text,
      options: i.options,
      correct: i.correct,
      explanation: i.explanation,
      approved: false,
      source: pendingSource(user!.id!),
    })),
  });
  return { ok: true, message: `${q.data.length} questions saved.` };
}
