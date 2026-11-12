export type Placement = {
  printScale: number;
  printX: number;
  printY: number;
  printStretchX?: number;
  printStretchY?: number;
};
export const defaultPlacement: Placement = {
  printScale: 1,
  printX: 0.5,
  printY: 0,
  printStretchX: 1,
  printStretchY: 1,
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
  const { w, h } = placementSize(value, width, height, imageWidth, imageHeight);
  const slackX = width - w,
    slackY = height - h;
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
  const fit = Math.min(cw / iw, ch / ih);
  const { w, h } = placementSize(v, cw, ch, iw, ih);
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0,
    sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  let scale = v.printScale,
    stretchX = v.printStretchX ?? 1,
    stretchY = v.printStretchY ?? 1;
  if (sx && sy) {
    const factor = 1 + (dx * sx * w + dy * sy * h) / (w * w + h * h);
    scale = Math.max(
      0.4,
      Math.min(
        1,
        v.printScale * factor,
        cw / (iw * fit * stretchX),
        ch / (ih * fit * stretchY),
      ),
    );
  } else if (sx) {
    stretchX = Math.max(
      0.4,
      Math.min(3, (w + dx * sx) / (iw * fit * scale), cw / (iw * fit * scale)),
    );
  } else if (sy) {
    stretchY = Math.max(
      0.4,
      Math.min(3, (h + dy * sy) / (ih * fit * scale), ch / (ih * fit * scale)),
    );
  }
  const { w: nw, h: nh } = placementSize(
    {
      ...v,
      printScale: scale,
      printStretchX: stretchX,
      printStretchY: stretchY,
    },
    cw,
    ch,
    iw,
    ih,
  );
  const left =
    (cw - w) * v.printX + (sx < 0 ? w - nw : sx === 0 ? (w - nw) / 2 : 0);
  const top =
    (ch - h) * v.printY + (sy < 0 ? h - nh : sy === 0 ? (h - nh) / 2 : 0);
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return {
    printScale: scale,
    printStretchX: stretchX,
    printStretchY: stretchY,
    printX: cw - nw > 1 ? clamp(left / (cw - nw)) : v.printX,
    printY: ch - nh > 1 ? clamp(top / (ch - nh)) : v.printY,
  };
}

export function placementSize(
  v: Placement,
  cw: number,
  ch: number,
  iw: number,
  ih: number,
) {
  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) return { w: 0, h: 0 };
  const fit = Math.min(cw / iw, ch / ih);
  return {
    w: Math.min(cw, iw * fit * v.printScale * (v.printStretchX ?? 1)),
    h: Math.min(ch, ih * fit * v.printScale * (v.printStretchY ?? 1)),
  };
}
