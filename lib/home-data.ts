// Match the category aliases accepted by the existing question picker.
export function homeCategoryMatches(selected: string, stored: string) {
  const normalize = (value: string) => value.trim().replace(/^Class\s*/i, "");
  const a = normalize(selected),
    b = normalize(stored);
  if (a === b) return true;
  const secondary = ["SSC", "9", "10", "9-10"];
  const higher = ["HSC", "11", "12", "11-12"];
  return (
    (secondary.includes(a) && secondary.includes(b)) ||
    (higher.includes(a) && higher.includes(b))
  );
}

export function summarizeHomeBank(rows: { category: string; count: number }[]) {
  const categories = new Map<string, number>();
  rows.forEach((r) =>
    categories.set(r.category, (categories.get(r.category) || 0) + r.count),
  );
  const sorted = [...categories].sort((a, b) => b[1] - a[1]);
  const items = sorted.slice(0, 4);
  if (sorted.length > 4)
    items.push(["অন্যান্য", sorted.slice(4).reduce((sum, r) => sum + r[1], 0)]);
  return { total: rows.reduce((sum, r) => sum + r.count, 0), items };
}

/** Conservative text matching only: never merge unrelated chapters by number alone. */
export function homeLabelKey(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function homeChapterKey(value: string) {
  return homeLabelKey(value)
    .replace(/[০-৯]/g, (n) => String("০১২৩৪৫৬৭৮৯".indexOf(n)))
    .replace(
      /^(?:অধ্যা(?:য়|য়)\s*[0-9]+\s*[:.।\-–]\s*|[0-9]+\s*(?:(?:ম|য়|য়|র্থ|ষ্ঠ|শ)\s*অধ্যা(?:য়|য়))?\s*[:.।\-–]\s*)/u,
      "",
    )
    .trim();
}
/** Keep database strings as submitted values, rather than a curriculum-only spelling. */
export function homeBankOptions(
  curriculum: string[],
  stored: string[],
  chapter = false,
) {
  const key = chapter ? homeChapterKey : homeLabelKey;
  const actual = Array.from(new Set(stored.filter(Boolean)));
  return Array.from(
    new Set([
      ...curriculum.map(
        (label) => actual.find((value) => key(value) === key(label)) ?? label,
      ),
      ...actual,
    ]),
  );
}
