"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { staff } from "@/lib/guard";
import { z } from "zod";

const redirectErr = (msg: string) => redirect(`/admin/questions?err=${encodeURIComponent(msg)}`);
const redirectOk = (msg: string) => redirect(`/admin/questions?ok=${encodeURIComponent(msg)}`);

// ১. 🎯 PDF থেকে আসা এক্সট্র্যাক্ট করা প্রশ্ন ডাটাবেজে বাল্ক সেভ
export async function saveExtracted(fd: FormData): Promise<void> {
  let count = 0;
  try {
    await staff();

    const category = String(fd.get("category") || "SSC").trim();
    const subject = String(fd.get("subject") || "").trim();
    const topic = String(fd.get("topic") || "সাধারণ").trim();
    const difficultyRaw = String(fd.get("difficulty") || "MEDIUM").trim();
    const lang = String(fd.get("lang") || "Bangla").trim();
    const source = String(fd.get("source") || "PDF_IMPORT").trim();
    const approved = fd.get("approved") === "true";
    const itemsRaw = String(fd.get("items") || "[]");

    const difficulty = z.enum(["EASY", "MEDIUM", "HARD"]).parse(difficultyRaw);

    if (!subject) {
      redirectErr("বিষয়ের নাম পূরণ করা বাধ্যতামূলক।");
    }

    const items = JSON.parse(itemsRaw);
    if (!Array.isArray(items) || items.length === 0) {
      redirectErr("সংরক্ষণ করার মতো কোনো প্রশ্ন পাওয়া যায়নি।");
    }

    // 🎯 টাইপ ফিক্স সহ রেকর্ডস তৈরি
    const records = items
      .map((it: any) => ({
        category,
        subject,
        topic,
        difficulty,
        lang,
        source,
        approved,
        text: String(it.text || "").trim(),
        options: {
          A: String(it.options?.A || "").trim(),
          B: String(it.options?.B || "").trim(),
          C: String(it.options?.C || "").trim(),
          D: String(it.options?.D || "").trim(),
        },
        correct: it.correct && ["A", "B", "C", "D"].includes(it.correct) ? (it.correct as string) : "",
        explanation: String(it.explanation || "").trim(),
      }))
      .filter((r: { text: string }) => r.text.length > 0);

    const res = await db.question.createMany({
      data: records,
      skipDuplicates: true,
    });

    count = res.count;
    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirectErr(e?.message || "প্রশ্ন সংরক্ষণে ত্রুটি হয়েছে।");
  }

  redirectOk(`সফলভাবে ${count}টি প্রশ্ন ডাটাবেজে যুক্ত হয়েছে।`);
}

// ২. একক প্রশ্ন যোগ করা
export async function addQuestion(fd: FormData): Promise<void> {
  try {
    await staff();
    const category = String(fd.get("category") || "").trim();
    const subject = String(fd.get("subject") || "").trim();
    const topic = String(fd.get("topic") || "").trim();
    const text = String(fd.get("text") || "").trim();
    const difficulty = z.enum(["EASY", "MEDIUM", "HARD"]).parse(String(fd.get("difficulty") || "MEDIUM"));
    const lang = String(fd.get("lang") || "Bangla").trim();
    const correct = String(fd.get("correct") || "").trim();
    const explanation = String(fd.get("explanation") || "").trim();

    const options = {
      A: String(fd.get("optA") || "").trim(),
      B: String(fd.get("optB") || "").trim(),
      C: String(fd.get("optC") || "").trim(),
      D: String(fd.get("optD") || "").trim(),
    };

    if (!category || !subject || !text) {
      redirectErr("শ্রেণি, বিষয় এবং প্রশ্ন দেওয়া বাধ্যতামূলক।");
    }

    await db.question.create({
      data: {
        category,
        subject,
        topic: topic || "সাধারণ",
        difficulty,
        lang,
        text,
        options,
        correct,
        explanation,
        approved: fd.get("approved") === "on",
        source: "MANUAL",
      },
    });

    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirectErr(e?.message || "প্রশ্ন যোগ করা যায়নি।");
  }

  redirectOk("প্রশ্নটি সফলভাবে ডাটাবেজে যুক্ত হয়েছে।");
}

// ৩. অনুমোদন টগল
export async function toggleApprove(id: string, current: boolean): Promise<void> {
  try {
    await staff();
    await db.question.update({
      where: { id },
      data: { approved: !current },
    });
    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirectErr(e?.message || "অনুমোদন স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।");
  }

  redirectOk("প্রশ্নের অনুমোদন স্ট্যাটাস আপডেট হয়েছে।");
}

// ৪. প্রশ্ন মোছা
export async function deleteQuestion(id: string): Promise<void> {
  try {
    await staff();
    await db.question.delete({ where: { id } });
    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirectErr(e?.message || "প্রশ্ন মোছা যায়নি।");
  }

  redirectOk("প্রশ্নটি মুছে ফেলা হয়েছে।");
}

// ৫. একসাথে সব অপেক্ষমাণ প্রশ্ন অনুমোদন
export async function approveAllPending(): Promise<void> {
  let count = 0;
  try {
    await staff();
    const res = await db.question.updateMany({
      where: { approved: false },
      data: { approved: true },
    });
    count = res.count;
    revalidatePath("/admin/questions");
    revalidatePath("/question-builder");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirectErr(e?.message || "অনুমোদন ব্যর্থ হয়েছে।");
  }

  redirectOk(`মোট ${count}টি প্রশ্ন সফলভাবে অনুমোদন করা হয়েছে।`);
}
