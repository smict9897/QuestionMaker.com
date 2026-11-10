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
