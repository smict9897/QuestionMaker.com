export const PAPER_SECTION_ORDER = ["MCQ", "CQ", "SHORT"] as const;
export function paperSectionTitle(type: string, mcqTitle: string, group = "") {
  const title =
    type === "CQ"
      ? "ক-বিভাগ: সৃজনশীল অংশ"
      : type === "SHORT"
        ? "খ-বিভাগ: সংক্ষিপ্ত প্রশ্ন"
        : mcqTitle;
  return group && type === "CQ" ? `${title} — ${group}` : title;
}
export function toggleVisibleSelection(selected: string[], visible: string[]) {
  return visible.length && visible.every((id) => selected.includes(id))
    ? selected.filter((id) => !visible.includes(id))
    : [...new Set([...selected, ...visible])];
}
