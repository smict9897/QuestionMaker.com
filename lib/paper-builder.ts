import { z } from "zod";
import { paperHeaderSchema } from "@/lib/paper-header";
export type PaperItem = {
  id: string;
  text: string;
  options?: Record<string, string>;
  correct?: string;
  explanation?: string;
  category?: string;
  subject?: string;
  topic?: string;
  source?: string;
  type?: string;
  stimulus?: string;
  subQuestions?: { k: string; kh: string; g: string; gh: string };
  answers?: Record<string, string>;
};
const bool = (value = false) => z.boolean().catch(value).default(value);
const text = (value = "") => z.string().max(10000).catch(value).default(value);
const number = (value: number, min: number, max: number) =>
  z.number().int().min(min).max(max).catch(value).default(value);
export const settingsSchema = z.object({
  version: z.literal(2).default(2),
  header: paperHeaderSchema
    .catch(() => paperHeaderSchema.parse({}))
    .default({}),
  show: z
    .object({
      title: bool(true),
      address: bool(),
      cls: bool(true),
      subject: bool(true),
      chapter: bool(true),
      exam: bool(true),
      instr: bool(true),
      examinee: bool(),
      tags: bool(),
      marks: bool(),
      omr: bool(),
      pageNumbers: bool(true),
      logo: bool(),
      brandHeader: bool(),
      brandFooter: bool(),
      standardCheck: bool(),
      instructor: bool(),
      answerSheet: bool(),
      rightStart: bool(),
      divider: bool(true),
      subjCode: bool(),
      obtained: bool(),
      setCode: bool(),
      important: bool(),
      divisions: bool(),
      duplicates: bool(),
      watermark: bool(),
      autoSet: bool(),
    })
    .default({}),
  info: z
    .object({
      logo: z.string().max(200000).catch("").default(""),
      brandHeader: text(),
      brandFooter: text(),
      instructor: text(),
      inst: text(),
      address: text(),
      exam: text(),
      cls: text(),
      subject: text(),
      chapter: text(),
      minutes: text(),
      marks: text(),
      code: text(),
      section: text("বহুনির্বাচনি অংশ"),
      instr: text("[প্রশ্নপত্রে কোনো প্রকার দাগ/চিহ্ন দেয়া যাবে না]"),
      watermark: text("খসড়া"),
    })
    .default({}),
  cfg: z
    .object({
      format: z.enum(["q", "qa", "ans", "sug"]).catch("q").default("q"),
      autoFit: bool(),
      booklet: bool(),
      orientation: z
        .enum(["portrait", "landscape"])
        .catch("portrait")
        .default("portrait"),
      marginTop: number(45, 0, 150),
      marginBottom: number(45, 0, 150),
      marginLeft: number(45, 0, 150),
      marginRight: number(45, 0, 150),
      columnGap: number(20, 0, 80),
      cqStyle: z
        .enum(["circle", "paren", "dot", "close"])
        .catch("paren")
        .default("paren"),
      bold: bool(),
      italic: bool(),
      underline: bool(),
      strike: bool(),
      ink: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .catch("#111111")
        .default("#111111"),
      cqColumns: number(1, 1, 3),
      expectedMCQ: number(0, 0, 300),
      expectedCQ: number(0, 0, 300),
      expectedSHORT: number(0, 0, 300),
      cols: number(2, 1, 3),
      optCols: number(2, 1, 4),
      style: z
        .enum(["circle", "paren", "dot", "close"])
        .catch("paren")
        .default("paren"),
      label: z.enum(["bn", "abc", "num", "roman"]).catch("bn").default("bn"),
      ansKey: bool(),
      paper: z.enum(["A4", "Letter", "Legal", "A5"]).catch("A4").default("A4"),
      align: z
        .enum(["left", "center", "right", "justify"])
        .catch("justify")
        .default("justify"),
      font: z
        .enum(["adorsho", "hind", "anek", "serif"])
        .catch("hind")
        .default("hind"),
      fontSize: number(14, 7, 28),
      imageSize: number(280, 80, 600),
      imagePosition: z.enum(["left", "center"]).catch("left").default("left"),
      divisionFilter: text(),
      cqAnswer: number(0, 0, 300),
      shortAnswer: number(0, 0, 300),
      mcqAnswer: number(0, 0, 300),
    })
    .default({}),
  excludedIds: z.array(z.string()).max(300).catch([]).default([]),
  edits: z
    .record(
      z.object({
        text: text(),
        options: z.record(z.string()).optional(),
        stimulus: z.string().optional(),
        subQuestions: z
          .object({
            k: z.string(),
            kh: z.string(),
            g: z.string(),
            gh: z.string(),
          })
          .optional(),
      }),
    )
    .default({}),
  attachments: z
    .record(
      z.object({
        image: text(),
        size: z.number().int().min(80).max(600).optional(),
        division: text(),
        important: bool(),
      }),
    )
    .default({}),
  seed: number(0, 0, 1000000),
  setName: z.enum(["ক", "খ"]).catch("ক").default("ক"),
});
export type PaperSettings = z.infer<typeof settingsSchema>;
export const defaults = () => settingsSchema.parse({});
export function restoreSettings(raw: unknown): PaperSettings {
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaults();
}
export const dimensions = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
  A5: [148, 210],
} as const;
export const bn = (n: number | string) =>
  String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export const labels = {
  bn: ["ক", "খ", "গ", "ঘ"],
  abc: ["a", "b", "c", "d"],
  num: ["১", "২", "৩", "৪"],
  roman: ["i", "ii", "iii", "iv"],
};
export function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  if (!seed) return out;
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function questionType(q: PaperItem) {
  return q.type || (q.stimulus ? "CQ" : q.correct ? "MCQ" : "SHORT");
}
export function duplicateIds(items: PaperItem[]) {
  const groups = new Map<string, string[]>();
  for (const q of items) {
    const key = (q.stimulus || q.text)
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (key) groups.set(key, [...(groups.get(key) || []), q.id]);
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
}
export function safeImage(url: string) {
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}
// Deterministic sequential column filling: left column first, then right, then next sheet.
export function paginate(
  heights: number[],
  available: number,
  columns: number,
  continuationAvailable: number = available,
): number[][][] {
  const pages: number[][][] = [];
  let page: number[][] = Array.from({ length: columns }, () => []);
  let col = 0,
    used = 0;
  heights.forEach((height, index) => {
    if (
      page[col].length &&
      used + height > (pages.length === 0 ? available : continuationAvailable)
    ) {
      col++;
      used = 0;
    }
    if (col === columns) {
      pages.push(page);
      page = Array.from({ length: columns }, () => []);
      col = 0;
    }
    page[col].push(index);
    used += height;
  });
  if (page.some((c) => c.length)) pages.push(page);
  return pages;
}

// KaTeX's bundled math fonts do not contain Bengali numerals. Normalize only
// math fragments/fractions, leaving Bengali numbering and prose unchanged.
export function preparePaperMath(text: string) {
  const latin = (value: string) =>
    value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  return text
    .replace(/\$[^$]+\$/g, latin)
    .replace(/[০-৯]+\s*\/\s*[০-৯]+/g, latin);
}

export function paperDimensions(s: PaperSettings): [number, number] {
  const [w, h] = dimensions[s.cfg.paper];
  return s.cfg.orientation === "landscape" ? [h, w] : [w, h];
}
export function optionLabel(
  value: string,
  style: PaperSettings["cfg"]["style"],
) {
  return style === "paren"
    ? `(${value})`
    : style === "close"
      ? `${value})`
      : style === "dot"
        ? `${value}.`
        : `◯${value}`;
}

export function safeLogo(url: string) {
  return (
    safeImage(url) ||
    (url.length <= 200000 &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(url)
      ? url
      : "")
  );
}

// Each pair is one physical side. Pad to a multiple of four for duplex folding.
export function bookletOrder(pageCount: number): (number | null)[][] {
  const count = Math.ceil(Math.max(0, pageCount) / 4) * 4;
  const index = (n: number) => (n < pageCount ? n : null);
  const sides: (number | null)[][] = [];
  for (let first = 0, last = count - 1; first < last; first += 2, last -= 2) {
    sides.push(
      [index(last), index(first)],
      [index(first + 1), index(last - 1)],
    );
  }
  return sides;
}
