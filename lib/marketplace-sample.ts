import "server-only";
import { saleRecord } from "@/lib/marketplace-purchase";
import { marketPreviewModel } from "@/lib/marketplace-preview";
export type MarketSample = {
  version: 1;
  questionCount: number;
  excerpts: string[];
};
/** Public boundary: deterministic, strictly bounded text only. Never return snapshots,
 * IDs, answers/options, settings, attachments or URLs. Changing query parameters
 * cannot reveal further slices of the paper. A watermark is not DRM. */
export function publicMarketSample(
  raw: string,
  id: string,
): MarketSample | null {
  try {
    const r = saleRecord(raw, id);
    const model = marketPreviewModel(r.snapshot);
    const questions = model.sections.flatMap((section) => section.questions);
    const limit = Math.min(2, Math.max(1, Math.floor(questions.length / 5)));
    const excerpts: string[] = [];
    for (const { q } of questions) {
      const text = q.text
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // No external resources or obvious inline solution material. Render as escaped
      // React text, not HTML/Markdown, even if a submission contains markup.
      if (
        text.length < 24 ||
        /https?:|data:|<|>|উত্তর|সমাধান|ব্যাখ্যা|answer|solution|explanation/i.test(
          text,
        )
      )
        continue;
      const chars = Array.from(text);
      const length = Math.min(160, Math.floor(chars.length / 2));
      excerpts.push(chars.slice(0, length).join("") + "…");
      if (excerpts.length >= limit) break;
    }
    return { version: 1, questionCount: questions.length, excerpts };
  } catch {
    return null;
  }
}
