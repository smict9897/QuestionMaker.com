export const KEYWORD_TYPES = ["Primary", "Long-tail", "Question"] as const;
export const KEYWORD_INTENTS = ["Informational", "Download", "Solution", "Preparation"] as const;
export const KEYWORD_DIFFICULTY = ["Low", "Medium", "High"] as const;

export type KeywordItem = {
  keyword: string;
  type: (typeof KEYWORD_TYPES)[number];
  intent: (typeof KEYWORD_INTENTS)[number];
  difficulty: (typeof KEYWORD_DIFFICULTY)[number];
  monthlySearchEst: string;
  usageTip: string;
};

export type SeoPack = {
  titles: string[];
  slug: string;
  metaTitle: string;
  metaDescription: string;
  hashtags: string[];
  outline: string[];
  faqs: string[];
};

const squash = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");

function pick<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  const s = squash(v);
  return list.find((x) => squash(x) === s) ?? fallback;
}

// AI-এর উত্তর যেমনই আসুক, নিরাপদ ও ঠিক ছাঁচের তালিকা বানায়
export function normalizeItems(raw: unknown, max = 12): KeywordItem[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { keywords?: unknown }).keywords)
      ? (raw as { keywords: unknown[] }).keywords
      : [];

  const seen = new Set<string>();
  const out: KeywordItem[] = [];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const keyword = String(o.keyword ?? "").replace(/\s+/g, " ").trim();
    if (!keyword || keyword.length > 120) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      keyword,
      type: pick(o.type, KEYWORD_TYPES, "Long-tail"),
      intent: pick(o.intent, KEYWORD_INTENTS, "Informational"),
      difficulty: pick(o.difficulty, KEYWORD_DIFFICULTY, "Medium"),
      monthlySearchEst: String(o.monthlySearchEst ?? "").trim() || "—",
      usageTip: String(o.usageTip ?? "").trim(),
    });
    if (out.length >= max) break;
  }
  return out;
}

// "1K-5K" বা "100-500" থেকে গড় সংখ্যা বের করে
export function parseVolume(est: string): number {
  const nums = Array.from(est.toUpperCase().replace(/,/g, "").matchAll(/(\d+(?:\.\d+)?)\s*([KM]?)/g)).map(
    (m) => parseFloat(m[1]) * (m[2] === "K" ? 1000 : m[2] === "M" ? 1_000_000 : 1),
  );
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const DIFF_WEIGHT: Record<KeywordItem["difficulty"], number> = { Low: 1, Medium: 2.5, High: 5 };

// সুযোগ স্কোর (০-১০০): বেশি সার্চ + কম কঠিন = বেশি স্কোর
export function opportunityScore(k: KeywordItem): number {
  const raw = Math.log10(parseVolume(k.monthlySearchEst) + 10) / DIFF_WEIGHT[k.difficulty];
  return Math.max(0, Math.min(100, Math.round((raw / 4) * 100)));
}

const clean = (v: unknown, len: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, len);
const strList = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.map((x) => clean(x, len)).filter(Boolean).slice(0, max) : [];

export function normalizeSeoPack(raw: unknown): SeoPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pack: SeoPack = {
    titles: strList(o.titles, 3, 120),
    slug: clean(o.slug, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    metaTitle: clean(o.metaTitle, 60),
    metaDescription: clean(o.metaDescription, 160),
    hashtags: strList(o.hashtags, 8, 40).map((s) => s.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean),
    outline: strList(o.outline, 12, 140),
    faqs: strList(o.faqs, 8, 200),
  };
  if (!pack.titles.length && !pack.metaTitle) return null;
  return pack;
    }
