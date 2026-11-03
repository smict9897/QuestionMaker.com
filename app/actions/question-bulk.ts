"use server";

import { db } from "@/lib/db";
import { staff } from "@/lib/guard";
import { revalidatePath } from "next/cache";

interface BulkSaveInput {
  category: string;
  subject: string;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  lang: string;
  approved: boolean;
  questions: {
    text: string;
    options: Record<string, string>;
    correct?: string;
    explanation?: string;
    sourceType: "MCQ" | "SHORT" | "CQ";
  }[];
}

export async function bulkSaveQuestions(input: BulkSaveInput) {
  try {
    await staff();

    if (!input.questions || input.questions.length === 0) {
      return { success: false, error: "সংরক্ষণ করার মতো কোনো প্রশ্ন নির্বাচন করা হয়নি।" };
    }

    const records = input.questions.map((q) => ({
      category: input.category,
      subject: input.subject,
      topic: input.topic || "সাধারণ",
      difficulty: input.difficulty || "MEDIUM",
      lang: input.lang || "Bangla",
      text: q.text,
      options: q.options || {},
      correct: q.correct || "ক",
      explanation: q.explanation || "",
      approved: input.approved ?? false,
      source: `PDF_${q.sourceType}`,
    }));

    // ডাটাবেজে একবারে সব প্রশ্ন সেভ করা (Prisma createMany)
    const result = await db.question.createMany({
      data: records,
      skipDuplicates: true,
    });

    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");

    return { success: true, count: result.count };
  } catch (err: any) {
    console.error("Bulk save error:", err);
    return { success: false, error: err.message || "ডাটাবেজে সংরক্ষণ ব্যর্থ হয়েছে।" };
  }
}
