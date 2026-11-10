"use server";

import { scoreExam } from "@/lib/exam-score";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasPremium } from "@/lib/premium";
import { revalidatePath } from "next/cache";

export type SubmitAttemptInput = {
  testId: string;
  studentName: string;
  studentClass: string;
  rollNumber: string;
  institution?: string;
  score: number;
  total: number;
  timeSpent: number;
  warnings: number;
  answers?: Record<number, number>;
};

// পরীক্ষা শেষ হওয়ার পরেও জমা দেওয়ার অতিরিক্ত সময় (মিনিট)
const SUBMIT_GRACE_MINUTES = 5;

export async function submitModelTestAttempt(input: SubmitAttemptInput) {
  const parsed = z.object({
    testId: z.string().min(1).max(200), studentName: z.string().max(100),
    studentClass: z.string().max(100), rollNumber: z.string().max(100),
    institution: z.string().max(300).optional(), warnings: z.number().int().min(0).max(1000),
    answers: z.record(z.number().int()).optional(),
  }).safeParse(input);
  if (!parsed.success) return { success: false, error: "অবৈধ উত্তর।" };
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return { success: false, error: "লগইন প্রয়োজন।" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return { success: false, error: "ইউজার পাওয়া যায়নি, আবার লগইন করুন।" };
  }

  const test = await db.modelTest.findUnique({ where: { id: input.testId } });
  if (!test) {
    return { success: false, error: "টেস্ট খুঁজে পাওয়া যায়নি।" };
  }

  // আগে জমা দেওয়া থাকলে নতুন করে কিছু চেক না করেই সফল ধরা হবে
  const existing = await db.attempt.findUnique({
    where: { testId_userId: { testId: input.testId, userId: user.id } },
  });

  if (existing) {
    return { success: true, alreadySubmitted: true };
  }

  // ---------- সার্ভার-সাইড সুরক্ষা ----------

  // ১) Draft টেস্টে জমা নেওয়া হবে না
  if (test.status !== "PUBLISHED") {
    return { success: false, error: "এই পরীক্ষা এখনো প্রকাশিত হয়নি।" };
  }

  // ২) সময়ের জানালা
  const now = Date.now();
  if (test.startAt && now < new Date(test.startAt).getTime()) {
    return { success: false, error: "পরীক্ষা এখনো শুরু হয়নি।" };
  }
  if (test.endAt) {
    const hardEnd =
      new Date(test.endAt).getTime() +
      ((test.minutes || 0) + SUBMIT_GRACE_MINUTES) * 60 * 1000;
    if (now > hardEnd) {
      return { success: false, error: "পরীক্ষার সময় শেষ হয়ে গেছে।" };
    }
  }

  // ৩) Paid টেস্টে Premium বাধ্যতামূলক
  if (test.isPaid) {
    const premium = await hasPremium(user.id);
    if (!premium) {
      return {
        success: false,
        error: "এটি Premium পরীক্ষা। অংশ নিতে প্যাকেজ নিন।",
      };
    }
  }

  const start = await db.modelTestStart.findUnique({ where: { testId_userId: { testId: test.id, userId: user.id } } });
  if (!start) return { success: false, error: "আগে পরীক্ষা শুরু করুন।" };
  const elapsed = Math.max(1, Math.floor((now - start.startedAt.getTime()) / 1000));
  if (elapsed > (test.minutes + SUBMIT_GRACE_MINUTES) * 60) return { success: false, error: "পরীক্ষার সময় শেষ।" };
  const { score, total, answers: answersToSave } = scoreExam(test.questions, input.answers);

  await db.attempt.upsert({
    where: { testId_userId: { testId: test.id, userId: user.id } },
    update: {},
    create: {
      testId: input.testId,
      userId: user.id,
      userName: input.studentName || user.name || "পরীক্ষার্থী",
      userImage: user.image || null,
      rollNumber: input.rollNumber || "0",
      studentClass: input.studentClass || "N/A",
      institution: input.institution || null,
      score,
      total,
      timeSpent: elapsed,
      warnings: input.warnings,
      answers: answersToSave,
    },
  });

  revalidatePath(`/model-test/${input.testId}`);
  revalidatePath(`/admin/model-test`);

  return { success: true };
}

// ===== ফাইল শেষ =====

export async function startModelTestAttempt(testId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("লগইন প্রয়োজন।");
  const test = await db.modelTest.findUnique({ where: { id: testId } });
  const now = new Date();
  if (!test || test.status !== "PUBLISHED" || now < test.startAt || now > test.endAt) throw new Error("এখন পরীক্ষা শুরু করা যাবে না।");
  if (test.isPaid && !(await hasPremium(session.user.id))) throw new Error("Premium প্রয়োজন।");
  const start = await db.modelTestStart.upsert({
    where: { testId_userId: { testId, userId: session.user.id } }, update: {},
    create: { testId, userId: session.user.id },
  });
  const remaining = test.minutes * 60 - Math.floor((now.getTime() - start.startedAt.getTime()) / 1000);
  if (remaining <= 0) throw new Error("পরীক্ষার সময় শেষ।");
  return remaining;
}
