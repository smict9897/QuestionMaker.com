import type { PageEdit } from "./ready-papers";
export type RasterPoint = { x: number; y: number };
/** Placement changes affect the box, not its pixels. Do not restart rendering mid-drag. */
export function rasterEditKey(edit: PageEdit) {
  return JSON.stringify({
    ...edit,
    printScale: 1,
    printStretchX: 1,
    printStretchY: 1,
    printX: 0.5,
    printY: 0,
  });
}
/** Coordinates are relative to the actual displayed raster, after CSS zoom/placement/stretch. */
export function sourceRasterPoint(p: RasterPoint, edit: PageEdit): RasterPoint {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    x: edit.left + clamp(p.x) * (1 - edit.left - edit.right),
    y: edit.top + clamp(p.y) * (1 - edit.top - edit.bottom),
  };
}
