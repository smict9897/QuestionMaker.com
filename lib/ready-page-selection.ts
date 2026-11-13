/** Append a page without removing/reordering the user's existing selection.
 * A full selection must not silently drop another page to make room. */
export function selectionWithPage(
  selected: number[],
  page: number,
): number[] | null {
  if (selected.includes(page)) return selected;
  if (selected.length >= 10) return null;
  return [...selected, page];
}
