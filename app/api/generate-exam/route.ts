import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "লগইন প্রয়োজন।" }, { status: 401 });
    const parsedInput = z.object({
      mode: z.enum(["DB", "AI"]).default("AI"),
      type: z.enum(["EXAM", "MCQ", "SHORT", "CQ", "MIXED"]).optional(),
      questionType: z.enum(["EXAM", "MCQ", "SHORT", "CQ", "MIXED"]).optional(),
      className: z.string().min(1).max(150), subject: z.string().min(1).max(150),
      chapter: z.string().max(300).default(""), count: z.coerce.number().int().min(1).max(50).default(10),
    }).safeParse(await req.json());
    if (!parsedInput.success) return NextResponse.json({ success: false, error: "Invalid exam parameters" }, { status: 400 });
    const { mode, type, questionType, className, subject, chapter, count } = parsedInput.data;
    if (mode === "DB") {
      const rows = await db.question.findMany({
        where: { approved: true, subject, category: className, ...(chapter && chapter !== "সম্পূর্ণ বই / সিলেবাস" ? { topic: chapter } : {}) },
        take: 500, orderBy: { createdAt: "desc" },
      });
      const requestedType = questionType || type || "MCQ";
      const questions = rows.flatMap<Record<string, unknown>>((q) => {
        const options = q.options as Record<string, unknown>;
        if (!options || typeof options !== "object") return [];
        if (!q.correct) {
          if ((requestedType === "SHORT" || requestedType === "MIXED") && !options.stimulus && !options.subQuestions && !options.k) return [{ type: "SHORT", question: q.text, answer: q.explanation }];
          if ((requestedType === "CQ" || requestedType === "MIXED") && (options.stimulus || options.subQuestions || options.k)) return [{ type: "CQ", question: q.text, ...options }];
          return [];
        }
        if (!["EXAM", "MCQ", "MIXED"].includes(requestedType)) return [];
        const keys = Object.keys(options);
        const correctAnswer = keys.indexOf(q.correct);
        if (correctAnswer < 0 || !Object.values(options).every((v) => typeof v === "string")) return [];
        return [{ type: "MCQ", question: q.text, options: Object.values(options), correctAnswer, explanation: q.explanation }];
      });
      // Shuffle before selecting so consecutive papers do not all use the newest rows.
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      return NextResponse.json({ success: true, questions: questions.slice(0, count), source: "DB" });
    }
    // Atomic database-backed quota, shared by all app instances (10 calls/user/UTC hour).
    const key = `generate-exam:${session.user.id}:${new Date().toISOString().slice(0, 13)}`;
    const usage = await db.apiUsage.upsert({ where: { key }, create: { key }, update: { count: { increment: 1 } } });
    if (usage.count > 10) return NextResponse.json({ success: false, error: "Hourly generation limit reached. Try again next hour." }, { status: 429 });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "DEEPSEEK_API_KEY নেই!" }, { status: 400 });

    const totalCount = count;
    const reqType = questionType || type || "MCQ"; 
    let prompt = "";

    if (reqType === "EXAM" || reqType === "MCQ") {
      prompt = `Generate exactly ${totalCount} MCQ in Bengali for Class: ${className}, Subject: ${subject}, Chapter: ${chapter}. Return JSON: { "questions": [{ "type": "MCQ", "question": "প্রশ্ন", "options": ["ক", "খ", "গ", "ঘ"], "correctAnswer": 0, "explanation": "ব্যাখ্যা" }] }`;
    } else if (reqType === "SHORT") {
      prompt = `Generate exactly ${totalCount} Short Questions in Bengali for Class: ${className}, Subject: ${subject}, Chapter: ${chapter}. Return JSON: { "questions": [{ "type": "SHORT", "question": "প্রশ্ন", "answer": "উত্তর" }] }`;
    } else if (reqType === "CQ") {
      prompt = `Generate exactly ${totalCount} Creative Questions (CQ) in Bengali for Class: ${className}, Subject: ${subject}, Chapter: ${chapter}. Return JSON: { "questions": [{ "type": "CQ", "stimulus": "উদ্দীপক", "subQuestions": { "k": "ক", "kh": "খ", "g": "গ", "gh": "ঘ" } }] }`;
    } else {
      const mcqCount = Math.ceil(totalCount * 0.5);
      const shortCount = Math.floor(totalCount * 0.25);
      const cqCount = Math.floor(totalCount * 0.25);
      prompt = `Generate a mixed paper in Bengali: ${mcqCount} MCQ, ${shortCount} Short, ${cqCount} CQ for Class: ${className}, Subject: ${subject}. Return JSON: { "questions": [{ "type": "MCQ", "question": "প্রশ্ন", "options": ["ক", "খ", "গ", "ঘ"], "correctAnswer": 0, "explanation": "ব্যাখ্যা" }, { "type": "SHORT", "question": "প্রশ্ন", "answer": "উত্তর" }, { "type": "CQ", "stimulus": "উদ্দীপক", "subQuestions": { "k": "ক", "kh": "খ", "g": "গ", "gh": "ঘ" } }] }`;
    }

    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      signal: AbortSignal.timeout(55000),
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: "You are a Bengali exam generator. Output only valid JSON." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!deepseekRes.ok) return NextResponse.json({ success: false, error: `DeepSeek API Error: ${deepseekRes.status}` }, { status: 500 });
    const data = await deepseekRes.json();
    let rawText = data?.choices?.[0]?.message?.content;

    if (!rawText) return NextResponse.json({ success: false, error: "AI থেকে রেসপন্স পাওয়া যায়নি।" }, { status: 500 });

    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ success: true, questions: parsed.questions || parsed, source: "DeepSeek" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: "সার্ভার এরর" }, { status: 500 });
  }
}
