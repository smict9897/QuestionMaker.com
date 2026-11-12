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
