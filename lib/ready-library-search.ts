export type LibraryPaper = {
  id: string;
  title: string;
  kind: "BOARD" | "SCHOOL";
  grade: string;
  subject: string;
  year: string;
  source: string;
  groupId?: string;
  groupTitle?: string;
  partIndex?: number;
  pageStart?: number;
  pageEnd?: number;
};
export type LibraryFilters = {
  q: string;
  kind: string;
  grade: string;
  subject: string;
  year: string;
  source: string;
  group: string;
};
export const emptyLibraryFilters: LibraryFilters = {
  q: "",
  kind: "",
  grade: "",
  subject: "",
  year: "",
  source: "",
  group: "",
};
export function normalizeLibraryText(text: string) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c)))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}
export function libraryFilters(raw: Record<string, unknown>): LibraryFilters {
  return Object.fromEntries(
    Object.keys(emptyLibraryFilters).map((k) => [
      k,
      typeof raw[k] === "string"
        ? (raw[k] as string).slice(0, k === "q" ? 120 : 200)
        : "",
    ]),
  ) as LibraryFilters;
}
export function indexLibrary(papers: LibraryPaper[]) {
  return papers.map((p) => ({
    paper: p,
    text: normalizeLibraryText(
      [
        p.title,
        p.grade,
        p.subject,
        p.year,
        p.source,
        p.groupTitle,
        p.kind === "BOARD"
          ? "বোর্ড প্রশ্ন board"
          : "স্কুল মডেল টেস্ট school model test",
      ]
        .filter(Boolean)
        .join(" "),
    ),
  }));
}
export function searchLibrary(
  index: ReturnType<typeof indexLibrary>,
  f: LibraryFilters,
) {
  const tokens = normalizeLibraryText(f.q).split(" ").filter(Boolean);
  const result = index
    .filter(
      ({ paper: p, text }) =>
        (!f.kind || p.kind === f.kind) &&
        (!f.grade || p.grade === f.grade) &&
        (!f.subject || p.subject === f.subject) &&
        (!f.year || p.year === f.year) &&
        (!f.source || p.source === f.source) &&
        (!f.group || p.groupId === f.group) &&
        tokens.every((t) => text.includes(t)),
    )
    .map((r) => r.paper);
  return f.group
    ? result.sort((a, b) => (a.partIndex ?? 0) - (b.partIndex ?? 0))
    : result;
}
