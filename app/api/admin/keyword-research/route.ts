import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callGeminiJson } from "@/lib/gemini-json";
import { normalizeItems } from "@/lib/keyword-research";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  topic: z.string().trim().min(2, "বিষয় লিখুন।").max(200, "বিষয় ২০০ অক্ষরের মধ্যে লিখুন।"),
  lang: z.enum(["mixed", "bn", "en", "banglish"]).default("mixed"),
  audience: z.enum(["all", "student", "job"]).default("all"),
  count: z.coerce.number().int().min(6).max(20).default(12),
});
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

const LANG: Record<string, string> = {
  mixed: "Mix Bangla, English and Banglish (Bangla written in English letters) naturally.",
  bn: "Write every keyword in Bangla script only.",
  en: "Write every keyword in English only.",
  banglish: "Write every keyword in Banglish (Bangla words typed in English letters) only.",
};
const AUDIENCE: Record<string, string> = {
  all: "Bangladeshi students (class 1-12, SSC, HSC, admission) and job seekers (NTRCA, BCS, bank, govt jobs)",
  student: "Bangladeshi students (class 1-12, SSC, HSC, admission test)",
  job: "Bangladeshi job seekers (NTRCA, BCS, bank, govt and private jobs)",
};

export async function POST(req: Request) {
  const role = (await auth())?.user?.role;
  if (role !== "ADMIN") return fail("শুধু অ্যাডমিন এটা ব্যবহার করতে পারবেন।", 403);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("অনুরোধ পড়া যায়নি।");
  }
  const p = Body.safeParse(json);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "বিষয় লিখুন।");
  const { topic, lang, audience, count } = p.data;

  const prompt = `You are an expert SEO keyword researcher for Bangladeshi education websites. Target audience: ${AUDIENCE[audience]}.
Topic: "${topic}"

Suggest exactly ${count} realistic keywords that Bangladeshi users would actually type into Google for this topic. ${LANG[lang]} Include a mix of short primary keywords, long-tail phrases and question-style searches. Avoid near-duplicates.

Return ONLY a JSON array. Each item must have exactly these fields:
- "keyword": string
- "type": one of "Primary", "Long-tail", "Question"
- "intent": one of "Informational", "Download", "Solution", "Preparation"
- "difficulty": one of "Low", "Medium", "High"
- "monthlySearchEst": string, a rough estimate such as "1K-5K" or "100-500"
- "usageTip": a short practical tip written in Bangla about where to use it (for example H1, H2, meta description, image alt text or URL slug)`;

  const r = await callGeminiJson(prompt);
  if (!r.ok) return fail(r.error, r.status);
  const items = normalizeItems(r.data, count);
  if (!items.length) return fail("কোনো কিওয়ার্ড পাওয়া যায়নি। অন্যভাবে বিষয়টা লিখে চেষ্টা করুন।", 502);
  return NextResponse.json({ ok: true, items });
}
