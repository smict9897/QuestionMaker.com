import { cleanText, toAsciiDigits, joinMarks } from "./text";

export type OptionKey = "A" | "B" | "C" | "D";

export type ParsedMcq = {
  number: number;
  text: string;
  options: Record<OptionKey, string>;
  correct: OptionKey | "";
  flags: string[];
};

export type ParsedShort = {
  number: number;
  text: string;
  marks: string;
};

export type ParsedCQ = {
  number: number;
  stimulus: string;
  subQuestions: { k: string; kh: string; g: string; gh: string; };
};

export type MultiSectionParseResult = {
  mcqs: ParsedMcq[];
  shortQuestions: ParsedShort[];
  cqs: ParsedCQ[];
};

const QSTART_REGEX = /(?:^|\n|\s{2,})([০-৯\d]{1,3})\s*[।\.\)]\s*/gu;

function sliceSectionByNumbers(sectionText: string) {
  const re = new RegExp(QSTART_REGEX.source, "gu");
  const matches: { index: number; num: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sectionText)) !== null) {
    const n = Number(toAsciiDigits(m[1]));
    if (!isNaN(n) && n > 0) matches.push({ index: m.index, num: n });
  }
  const chunks: { num: number; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const s = matches[i].index;
    const e = i + 1 < matches.length ? matches[i + 1].index : sectionText.length;
    chunks.push({ num: matches[i].num, text: sectionText.slice(s, e).trim() });
  }
  return chunks;
}

export function parseAllQuestionsFromText(raw: string, mode: "AUTO" | "MCQ" | "SHORT" | "CQ" = "AUTO"): MultiSectionParseResult {
  const body = joinMarks(cleanText(raw));
  const result: MultiSectionParseResult = { mcqs: [], shortQuestions: [], cqs: [] };

  if (mode === "SHORT" || mode === "AUTO") {
    const chunks = sliceSectionByNumbers(body);
    chunks.forEach(({ num, text }) => {
      if (mode === "AUTO" && text.includes("(ক)")) return; 
      const qClean = text.replace(/^\s*[০-৯\d]{1,3}\s*[।\.]\s*/, "").replace(/সং\s*ক্ষি\s*প্ত.*/u, "").trim();
      if (qClean.length > 5) result.shortQuestions.push({ number: num, text: qClean, marks: "২" });
    });
    if (mode === "SHORT") return result;
  }

  if (mode === "CQ" || mode === "AUTO") {
    const chunks = sliceSectionByNumbers(body);
    chunks.forEach(({ num, text }) => {
      const k = text.search(/\(ক\)/), kh = text.search(/\(খ\)/), g = text.search(/\(গ\)/), gh = text.search(/\(ঘ\)/);
      if (k !== -1 && kh !== -1 && g !== -1 && gh !== -1 && k < kh && kh < g && g < gh) {
        const stimulus = text.slice(0, k).replace(/^\s*[০-৯\d]{1,3}\s*[।\.]\s*/, "").trim();
        result.cqs.push({
          number: num,
          stimulus: stimulus || "উদ্দীপক",
          subQuestions: {
            k: text.slice(k, kh).replace(/^\(ক\)\s*/, "").trim(),
            kh: text.slice(kh, g).replace(/^\(খ\)\s*/, "").trim(),
            g: text.slice(g, gh).replace(/^\(গ\)\s*/, "").trim(),
            gh: text.slice(gh).replace(/^\(ঘ\)\s*/, "").trim(),
          },
        });
      }
    });
    if (mode === "CQ") return result;
  }

  if (mode === "MCQ" || mode === "AUTO") {
    const chunks = sliceSectionByNumbers(body);
    chunks.forEach(({ num, text }) => {
      const k = text.search(/(?:\(|\b)[কaA][\.\)]/u), kh = text.search(/(?:\(|\b)[খbB][\.\)]/u);
      const g = text.search(/(?:\(|\b)[গcC][\.\)]/u), gh = text.search(/(?:\(|\b)[ঘdD][\.\)]/u);
      if (k !== -1 && kh !== -1 && g !== -1 && gh !== -1 && k < kh && kh < g && g < gh) {
        result.mcqs.push({
          number: num,
          text: text.slice(0, k).replace(/^\s*[০-৯\d]{1,3}\s*[।\.]\s*/, "").trim(),
          options: {
            A: text.slice(k, kh).replace(/^(?:\(|\b)[কaA][\.\)]\s*/u, "").trim(),
            B: text.slice(kh, g).replace(/^(?:\(|\b)[খbB][\.\)]\s*/u, "").trim(),
            C: text.slice(g, gh).replace(/^(?:\(|\b)[গcC][\.\)]\s*/u, "").trim(),
            D: text.slice(gh).replace(/^(?:\(|\b)[ঘdD][\.\)]\s*/u, "").trim(),
          },
          correct: "",
          flags: [],
        });
      }
    });
  }
  return result;
}
