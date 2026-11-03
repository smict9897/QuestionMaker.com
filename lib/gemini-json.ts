// Gemini-কে প্রশ্ন করে JSON উত্তর ফেরত আনে (শুধু সার্ভারে চলে)
export async function callGeminiJson(
  prompt: string,
  temperature = 0.7,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "সার্ভারে GEMINI_API_KEY সেট করা নেই।", status: 500 };
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50_000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error("gemini failed:", res.status, (await res.text()).slice(0, 300));
      return { ok: false, error: "AI সার্ভিস সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।", status: 502 };
    }
    const j = await res.json();
    const text: string = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { ok: true, data: JSON.parse(text.replace(/```json|```/g, "").trim()) };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      return { ok: false, error: "অনেক সময় লাগছে। আবার চেষ্টা করুন।", status: 504 };
    console.error("gemini json failed:", e);
    return { ok: false, error: "AI-এর উত্তর পড়া যায়নি। আবার চেষ্টা করুন।", status: 500 };
  } finally {
    clearTimeout(timer);
  }
}
