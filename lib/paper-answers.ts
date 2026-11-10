export type AnswerPart = { label?: string; text: string };
const keys = ["k", "kh", "g", "gh"];
const bengali = ["ক", "খ", "গ", "ঘ"];
export function answerParts(
  explanation: string | undefined,
  answers: Record<string, string> | undefined,
  cq: boolean,
): AnswerPart[] {
  if (cq && answers) {
    const structured = keys
      .map((key, i) => ({
        label: bengali[i],
        text:
          typeof (answers[key] || answers[bengali[i]]) === "string"
            ? answers[key] || answers[bengali[i]]
            : "",
      }))
      .filter((p) => p.text.trim());
    if (structured.length) return structured;
  }
  const text =
    explanation ||
    Object.values(answers || {}).join("; ") ||
    "উত্তর সংযুক্ত নেই";
  if (!cq) return [{ text }];
  const markers =
    /(?<![\p{L}\p{N}])\((kh|gh|k|g|ক|খ|গ|ঘ)\)|(?:^|[\s;])(kh|gh|k|g|ক|খ|গ|ঘ)\s*:/giu;
  const parts: AnswerPart[] = [];
  let last = 0,
    label: string | undefined;
  for (const match of text.matchAll(markers)) {
    const content = text.slice(last, match.index).trim();
    if (content) parts.push({ label, text: content });
    const key = (match[1] || match[2]).toLowerCase();
    label = bengali.includes(key) ? key : bengali[keys.indexOf(key)];
    last = match.index! + match[0].length;
  }
  const tail = text.slice(last).trim();
  if (tail) parts.push({ label, text: tail });
  return parts.length ? parts : [{ text }];
}
/** Split only top-level semicolons/newlines/equalities. Never rewrite algebra. */
export function answerLines(text: string): string[] {
  if (/\[\/?[bius]\]/.test(text)) return [text];
  const lines: string[] = [];
  let start = 0,
    depth = 0,
    math = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "$" && text[i - 1] !== "\\") math = !math;
    if (!math) {
      if ("({[".includes(c)) depth++;
      if (")}]".includes(c)) depth = Math.max(0, depth - 1);
      if (!depth && (c === ";" || c === "\n")) {
        if (text.slice(start, i).trim())
          lines.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  if (text.slice(start).trim()) lines.push(text.slice(start).trim());
  return lines;
}
export function equalitySteps(
  text: string,
): { left: string; right: string[] } | null {
  // An already formatted environment must be left to KaTeX unchanged.
  if (/\\(?:begin|text|url|href|verb)\b|\[\/?[bius]\]/.test(text)) return null;
  const wrapped = /^\$[^$]+\$$/.test(text);
  const source = wrapped ? text.slice(1, -1) : text;
  const chunks: string[] = [];
  let start = 0,
    depth = 0,
    math = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "$" && source[i - 1] !== "\\") math = !math;
    if (math) continue;
    if ("({[".includes(c)) depth++;
    if (")}]".includes(c)) depth = Math.max(0, depth - 1);
    if (
      !depth &&
      c === "=" &&
      !/[<>!=]/.test(source[i - 1] || "") &&
      !/[=>]/.test(source[i + 1] || "")
    ) {
      chunks.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (!chunks.length) return null;
  chunks.push(source.slice(start).trim());
  if (chunks.some((c) => !c)) return null;
  // "x = 4 and y = 3" is two conditions, not the equality chain x=4=3.
  if (
    chunks
      .slice(1, -1)
      .some((c) => /[\u0980-\u09FF]|\b(?:and|or|where|when|if|then)\b/i.test(c))
  )
    return null;
  const format = (s: string) => (wrapped ? `$${s}$` : s);
  return { left: format(chunks[0]), right: chunks.slice(1).map(format) };
}
