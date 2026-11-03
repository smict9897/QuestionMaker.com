import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { mode, type, questionType, className, subject, chapter, difficulty, count, language } = await req.json();

    // ডাটাবেজ মোড...
    if (mode === "DB") {
       // ... (আপনার ডাটাবেজ থেকে প্রশ্ন আনার আগের লজিক)
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "DEEPSEEK_API_KEY নেই!" }, { status: 400 });

    const totalCount = parseInt(count) || 10;
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
    return NextResponse.json({ success: false, error: error.message || "সার্ভার এরর" }, { status: 500 });
  }
}
