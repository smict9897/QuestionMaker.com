import type { SavedPaper } from "@/app/actions/qb-papers";
export function savedPaperInfo(paper: SavedPaper) {
  const settings =
    paper.settings && typeof paper.settings === "object"
      ? (paper.settings as Record<string, unknown>)
      : {};
  const info =
    settings.info && typeof settings.info === "object"
      ? (settings.info as Record<string, unknown>)
      : {};
  const text = (key: string) =>
    typeof info[key] === "string" ? (info[key] as string) : "";
  return {
    categories: text("cls") ? [text("cls")] : paper.categories,
    subjects: text("subject") ? [text("subject")] : paper.subjects,
    chapters: text("chapter") ? [text("chapter")] : paper.chapters,
    marks: text("marks"),
    minutes: text("minutes"),
  };
}
export function filterSavedPapers(
  papers: SavedPaper[],
  filters: { category: string; subject: string; query: string },
) {
  const query = filters.query.trim().toLocaleLowerCase();
  return papers.filter((p) => {
    const info = savedPaperInfo(p);
    return (
      (!filters.category || info.categories.includes(filters.category)) &&
      (!filters.subject || info.subjects.includes(filters.subject)) &&
      (!query ||
        [p.name, ...info.chapters]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query))
    );
  });
}
