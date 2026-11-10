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
  lane: number;
  laneCount: number;
  top: number;
  height: number;
};
/** One reading cursor across section boundaries, not a fresh grid per section. */
export function paginateContinuous(
  sections: FlowSection[],
  first: number,
  continuation: number,
): FlowSegment[][] {
  const pages: FlowSegment[][] = [[]];
  let capacity = Math.max(1, first),
    lanes = 1,
    lane = 0,
    base = 0,
    used = [0];
  const nextPage = () => {
    pages.push([]);
    capacity = Math.max(1, continuation);
    lane = 0;
    base = 0;
    used = Array(lanes).fill(0);
  };
  sections.forEach((section, sectionIndex) => {
    if (!section.heights.length) return;
    if (section.columns !== lanes) {
      // A full-width / multi-column transition is a deliberate width boundary.
      base = Math.max(base, ...used);
      lanes = section.columns;
      lane = 0;
      used = Array(lanes).fill(base);
    }
    if (section.startRight && lanes > 1 && lane === 0) lane = 1;
    section.heights.forEach((height, index) => {
      const heading = index === 0;
      const block = height + (heading ? section.heading : 0);
      if (used[lane] + block > capacity && used[lane] > base) {
        lane++;
        if (lane === lanes) nextPage();
      }
      // A width transition may have left no room in any lane.
      if (used[lane] + block > capacity && base > 0) nextPage();
      pages
        .at(-1)!
        .push({
          section: sectionIndex,
          heading,
          columns: [[index]],
          lane,
          laneCount: lanes,
          top: used[lane],
          height: block,
        });
      used[lane] += block;
    });
  });
  return pages.filter((page) => page.length);
}
