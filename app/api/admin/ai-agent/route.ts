import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdmin } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

// প্রতি অংশে কয়টি প্রশ্ন (ai-worker ফাইলের সংখ্যার সাথে হুবহু মিলতে হবে)
const PER_PART: Record<string, number> = { MCQ: 10, SQ: 10, CQ: 3 };
const ALLOWED_TYPES = ["BLOG", "MCQ", "CQ", "SQ"];

// 🔒 খরচ বাঁচাতে সীমা
const MAX_QUESTIONS = 100; // একবারে সর্বোচ্চ প্রশ্ন (প্রতি অধ্যায়ে)
const MAX_TOPICS = 60; // একবারে সর্বোচ্চ অধ্যায়
const MAX_TASKS = 400; // একবারে মোট কাজ
const MAX_PROMPT = 1000; // বাড়তি নির্দেশনার সর্বোচ্চ অক্ষর

function bad(msg: string) {
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}

export async function POST(req: Request) {
  // 🔒 শুধু লগইন করা ADMIN
  const denied = await checkAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { type, category, subject, mcqCount } = body;
    const prompt = typeof body.prompt === "string" ? body.prompt : "";

    const topics: string[] = Array.isArray(body.topics)
      ? body.topics.filter((t: unknown) => typeof t === "string" && t.trim()).map((t: string) => t.trim())
      : [];

    if (topics.length === 0) {
      return bad("কোনো অধ্যায় সিলেক্ট করা হয়নি।");
    }
    if (topics.length > MAX_TOPICS) {
      return bad(`একবারে সর্বোচ্চ ${MAX_TOPICS}টি অধ্যায়ের কাজ দেওয়া যাবে।`);
    }
    if (prompt.length > MAX_PROMPT) {
      return bad(`বাড়তি নির্দেশনা সর্বোচ্চ ${MAX_PROMPT} অক্ষরের হতে পারবে।`);
    }

    // ধরন ঠিক করা: অচেনা কিছু এলে আগের মতোই MCQ ধরা হবে
    const rawType = String(type || "BLOG").toUpperCase();
    const taskType = ALLOWED_TYPES.includes(rawType) ? rawType : "MCQ";

    const totalQuestions = Number(mcqCount) || 10;
    if (taskType !== "BLOG" && totalQuestions > MAX_QUESTIONS) {
      return bad(`একবারে সর্বোচ্চ ${MAX_QUESTIONS}টি প্রশ্ন বানানো যাবে। সংখ্যা কমিয়ে আবার চেষ্টা করুন।`);
    }

    const catStr = typeof category === "string" && category ? category : null;
    const subStr = typeof subject === "string" && subject ? subject : null;

    const tasksData: any[] = [];

    topics.forEach((topic: string) => {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const defaultPrompt = `ক্লাস: ${catStr}, বিষয়: ${subStr}, অধ্যায়: ${topic}`;

      if (taskType === "BLOG") {
        // 🎯 আর্টিকেল: ৩ পার্টে ভাগ হবে
        for (let p = 1; p <= 3; p++) {
          tasksData.push({
            prompt: prompt || defaultPrompt,
            type: taskType, category: catStr, subject: subStr, topic: topic || null,
            status: "PENDING", part: p, totalParts: 3, batchId: batchId
          });
        }
      } else {
        // 🎯 MCQ / SQ: ১০টি করে, CQ: ৩টি করে অংশে ভাগ হবে
        const perPart = PER_PART[taskType] ?? 10;
        const parts = Math.max(1, Math.ceil(totalQuestions / perPart));

        for (let p = 1; p <= parts; p++) {
          tasksData.push({
            prompt: prompt || defaultPrompt,
            type: taskType, category: catStr, subject: subStr, topic: topic || null,
            status: "PENDING", part: p, totalParts: parts, batchId: batchId
          });
        }
      }
    });

    if (tasksData.length > MAX_TASKS) {
      return bad(`মোট কাজ ${tasksData.length}টি হয়ে যাচ্ছে, সর্বোচ্চ ${MAX_TASKS}টি। অধ্যায় বা প্রশ্নের সংখ্যা কমান।`);
    }

    await db.aiTask.createMany({ data: tasksData });
    return NextResponse.json({ success: true, message: `${tasksData.length} টি কাজ লাইনে যোগ হয়েছে!` });
  } catch (error: any) {
    console.error("ai-agent error:", error?.message);
    return NextResponse.json({ success: false, error: "সার্ভারে সমস্যা হয়েছে।" }, { status: 500 });
  }
}

// ===== ফাইল শেষ =====
