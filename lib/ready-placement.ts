export type Placement = { printScale: number; printX: number; printY: number };
export const defaultPlacement: Placement = {
  printScale: 1,
  printX: 0.5,
  printY: 0,
};
export function placementAfterDrag(
  value: Placement,
  dx: number,
  dy: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
): Placement {
  if (width <= 0 || height <= 0 || imageWidth <= 0 || imageHeight <= 0)
    return value;
  const fit =
    Math.min(width / imageWidth, height / imageHeight) * value.printScale;
  const slackX = width - imageWidth * fit,
    slackY = height - imageHeight * fit;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return {
    ...value,
    printX: slackX > 1 ? clamp(value.printX + dx / slackX) : value.printX,
    printY: slackY > 1 ? clamp(value.printY + dy / slackY) : value.printY,
  };
}

export function placementAfterZoom(
  value: Placement,
  factor: number,
): Placement {
  if (!Number.isFinite(factor) || factor <= 0) return value;
  return {
    ...value,
    printScale: Math.max(0.4, Math.min(1, value.printScale * factor)),
  };
}

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export function placementAfterResize(
  v: Placement,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  cw: number,
  ch: number,
  iw: number,
  ih: number,
): Placement {
  if (
    cw <= 0 ||
    ch <= 0 ||
    iw <= 0 ||
    ih <= 0 ||
    ![dx, dy, cw, ch, iw, ih].every(Number.isFinite)
  )
    return v;
  const fit = Math.min(cw / iw, ch / ih),
    w = iw * fit * v.printScale,
    h = ih * fit * v.printScale;
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0,
    sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const factor =
    1 + (dx * sx * w + dy * sy * h) / ((sx ? w * w : 0) + (sy ? h * h : 0));
  const scale = Math.max(0.4, Math.min(1, v.printScale * factor));
  const nw = iw * fit * scale,
    nh = ih * fit * scale;
  const left =
    (cw - w) * v.printX + (sx < 0 ? w - nw : sx === 0 ? (w - nw) / 2 : 0);
  const top =
    (ch - h) * v.printY + (sy < 0 ? h - nh : sy === 0 ? (h - nh) / 2 : 0);
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return {
    printScale: scale,
    printX: cw - nw > 1 ? clamp(left / (cw - nw)) : v.printX,
    printY: ch - nh > 1 ? clamp(top / (ch - nh)) : v.printY,
  };
}
