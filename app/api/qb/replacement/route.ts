import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { POST as loadQuestions } from "../questions/route";
import { z } from "zod";
const requestSchema = z.object({
  id: z.string().min(1).max(200),
  exclude: z.array(z.string().max(200)).max(300),
});
function type(q: { correct: string; text: string; options: unknown }) {
  const o = (q.options || {}) as Record<string, unknown>;
  return q.correct?.trim()
    ? "MCQ"
    : o.stimulus || o.k || o.ক || o.subQuestions || q.text.includes("(ক)")
      ? "CQ"
      : "SHORT";
}
export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "অবৈধ অনুরোধ।" }, { status: 400 });
  try {
    const original = await db.question.findFirst({
      where: { id: parsed.data.id, approved: true },
    });
    if (!original)
      return NextResponse.json(
        { error: "মূল প্রশ্নটি পাওয়া যায়নি।" },
        { status: 404 },
      );
    const candidates = await db.question.findMany({
      where: {
        approved: true,
        category: original.category,
        subject: original.subject,
        topic: original.topic,
        id: { notIn: [...parsed.data.exclude, original.id] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const chosen = candidates.find((q) => type(q) === type(original));
    if (!chosen)
      return NextResponse.json(
        { error: "এই অধ্যায়ে একই ধরনের বিকল্প প্রশ্ন পাওয়া যায়নি।" },
        { status: 404 },
      );
    return loadQuestions(
      new Request(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [chosen.id] }),
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "প্রশ্ন বদলানো যায়নি। আবার চেষ্টা করুন।" },
      { status: 500 },
    );
  }
}
