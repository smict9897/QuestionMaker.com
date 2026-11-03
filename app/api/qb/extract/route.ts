import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staff } from "@/lib/guard";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await staff();

    const body = await req.json();
    const { category, subject, topic, difficulty, lang, source, approved, questions } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ ok: false, error: "সংরক্ষণ করার মতো কোনো প্রশ্ন পাওয়া যায়নি।" }, { status: 400 });
    }

    // Prisma Question টেবিলে বাল্ক ইনসার্ট ফরম্যাট
    const records = questions.map((q: any) => ({
      category: category || "SSC",
      subject: subject || "রসায়ন",
      topic: topic || "অধ্যায় ১",
      difficulty: difficulty || "MEDIUM",
      lang: lang || "Bangla",
      text: q.text,
      options: q.options || {},
      correct: q.correct || "",
      explanation: q.explanation || "",
      approved: Boolean(approved),
      source: source || `PDF_${q.sourceType || "EXTRACT"}`,
    }));

    // একবারে সব প্রশ্ন ডাটাবেজে সংরক্ষণ (Prisma createMany)
    const result = await db.question.createMany({
      data: records,
      skipDuplicates: true,
    });

    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");

    return NextResponse.json({
      ok: true,
      count: result.count,
      approved: Boolean(approved),
    });
  } catch (err: any) {
    console.error("QB Extract API Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "সার্ভার এরর হয়েছে।" }, { status: 500 });
  }
}
