export type FlowSection = {
  heading: number;
  heights: number[];
  columns: number;
  startRight?: boolean;
};
export type FlowSegment = {
  section: number;
  heading: boolean;
  columns: number[][];
};
/** Fill each section's left column first, sharing the remaining sheet with the next section. */
export function paginateContinuous(
  sections: FlowSection[],
  first: number,
  continuation: number,
): FlowSegment[][] {
  const pages: FlowSegment[][] = [[]];
  let remaining = Math.max(1, first);
  const next = () => {
    pages.push([]);
    remaining = Math.max(1, continuation);
  };
  sections.forEach((section, index) => {
    let cursor = 0;
    while (cursor < section.heights.length) {
      const heading = cursor === 0;
      const headingHeight = heading ? section.heading : 0;
      // Keep the heading with its first question, unless the question itself exceeds a sheet.
      if (
        pages.at(-1)!.length &&
        remaining < headingHeight + section.heights[cursor]
      )
        next();
      const budget = Math.max(1, remaining - headingHeight);
      const columns: number[][] = Array.from(
        { length: section.columns },
        () => [],
      );
      const used = Array(section.columns).fill(0);
      const firstColumn =
        heading && section.startRight && section.columns > 1 ? 1 : 0;
      if (firstColumn) used[0] = budget;
      for (
        let col = firstColumn;
        col < section.columns && cursor < section.heights.length;
        col++
      ) {
        while (cursor < section.heights.length) {
          const height = section.heights[cursor];
          if (used[col] + height > budget && columns[col].length) break;
          if (height > budget && col > 0) break;
          columns[col].push(cursor++);
          used[col] += height;
          if (used[col] >= budget) break;
        }
      }
      pages.at(-1)!.push({ section: index, heading, columns });
      remaining -= headingHeight + Math.max(...used);
      if (cursor < section.heights.length) next();
    }
  });
  return pages.filter((page) => page.length);
}
