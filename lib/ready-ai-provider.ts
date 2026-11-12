import { PDFDocument } from "pdf-lib";
import { READY_AI_PROMPT, safeAIPage } from "./ready-ai";
export async function solveReadyAIPage(url: string, page: number) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Error("AI vision সংযোগ নেই।");
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    !u.hostname.endsWith(".public.blob.vercel-storage.com") ||
    u.username ||
    u.password
  )
    throw Error("Invalid source");
  const res = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw Error("Source unavailable");
  const reader = res.body?.getReader();
  if (!reader) throw Error("Source unavailable");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 10_000_000) throw Error("Source too large");
      chunks.push(r.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const doc = await PDFDocument.load(bytes);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > doc.getPageCount() ||
    doc.getPageCount() > 100
  )
    throw Error("Page unavailable");
  const out = await PDFDocument.create();
  out.addPage((await out.copyPages(doc, [page - 1]))[0]);
  const pdf = await out.save();
  if (pdf.length > 10_000_000) throw Error("Page too large");
  const model = process.env.READY_ANSWER_GEMINI_MODEL || "gemini-2.5-flash";
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model)) throw Error("Invalid model");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(55000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: READY_AI_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Read and solve source page ${page}. No other page context is supplied.`,
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: Buffer.from(pdf).toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 10000,
        },
      }),
    },
  );
  if (!response.ok) throw Error("AI service unavailable");
  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw Error("Incomplete AI response");
  const text = candidate.content?.parts
    ?.filter((p: { thought?: boolean; text?: string }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text || text.length > 500000) throw Error("Invalid AI output");
  return safeAIPage(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
}
