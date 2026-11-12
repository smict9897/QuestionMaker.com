import { z } from "zod";
export const READY_PREFIX = "readypaper:v1:";
export const boxSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0.001).max(1),
    h: z.number().min(0.001).max(1),
  })
  .refine((b) => b.x + b.w <= 1.001 && b.y + b.h <= 1.001, "Box outside page");
export const pageEditSchema = z
  .object({
    top: z.number().min(0).max(0.4),
    bottom: z.number().min(0).max(0.4),
    left: z.number().min(0).max(0.25),
    right: z.number().min(0).max(0.25),
    deskew: z.number().min(-10).max(10).default(0),
    rotation: z.union([
      z.literal(0),
      z.literal(90),
      z.literal(180),
      z.literal(270),
    ]),
    mode: z.enum(["original", "clean", "bw"]),
    strength: z.number().min(0).max(1),
    printStretchX: z.number().min(0.4).max(3).default(1),
    printStretchY: z.number().min(0.4).max(3).default(1),
    printScale: z.number().min(0.4).max(1).default(1),
    printX: z.number().min(0).max(1).default(0.5),
    printY: z.number().min(0).max(1).default(0),
    blueWatermark: z.number().min(0).max(1).default(0),
    masks: z.array(boxSchema).max(40),
    texts: z
      .array(
        z.object({
          x: z.number().min(0).max(0.95),
          y: z.number().min(0).max(0.98),
          text: z.string().max(500),
          size: z.number().min(10).max(60),
        }),
      )
      .max(30),
  })
  .refine((e) => e.top + e.bottom < 0.8 && e.left + e.right < 0.5);
export type PageEdit = z.infer<typeof pageEditSchema>;
export const freshEdit = (): PageEdit => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  rotation: 0,
  deskew: 0,
  mode: "original",
  strength: 0.5,
  blueWatermark: 0,
  printScale: 1,
  printStretchX: 1,
  printStretchY: 1,
  printX: 0.5,
  printY: 0,
  masks: [],
  texts: [],
});
export const readyMetadataSchema = z.object({
  title: z.string().trim().min(3).max(160),
  kind: z.enum(["BOARD", "SCHOOL"]),
  grade: z.string().trim().min(1).max(60),
  subject: z.string().trim().min(1).max(100),
  year: z.string().regex(/^20\d{2}$/),
  source: z.string().trim().min(2).max(160),
  published: z.boolean(),
});
export const readyRecordSchema = readyMetadataSchema.extend({
  id: z.string().uuid(),
  deletedAt: z.string().datetime().optional(),
  url: z
    .string()
    .url()
    .refine((v) => {
      try {
        const u = new URL(v);
        return (
          u.protocol === "https:" &&
          u.hostname.endsWith(".public.blob.vercel-storage.com") &&
          !u.username &&
          !u.password
        );
      } catch {
        return false;
      }
    }, "Trusted PDF storage required"),
  groupId: z.string().uuid().optional(),
  groupTitle: z.string().max(160).optional(),
  partIndex: z.number().int().min(1).max(500).optional(),
  pageStart: z.number().int().min(1).max(500).optional(),
  pageEnd: z.number().int().min(1).max(500).optional(),
  at: z.string().datetime(),
  presets: z
    .record(z.string().regex(/^([1-9]|[1-9]\d|100)$/), pageEditSchema)
    .default({}),
});
export type ReadyPaper = z.infer<typeof readyRecordSchema>;
export function parseReady(value: string) {
  try {
    return readyRecordSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
export function cleanPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  bw: boolean,
) {
  // Local illumination normalization; preserves original by operating only on a fresh canvas.
  const s = Math.min(1, Math.max(0, strength)),
    radius = 24,
    iw = width + 1,
    integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      integral[(y + 1) * iw + x + 1] = integral[y * iw + x + 1] + row;
    }
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4,
        l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
        x0 = Math.max(0, x - radius),
        x1 = Math.min(width, x + radius + 1),
        y0 = Math.max(0, y - radius),
        y1 = Math.min(height, y + radius + 1),
        mean =
          (integral[y1 * iw + x1] -
            integral[y0 * iw + x1] -
            integral[y1 * iw + x0] +
            integral[y0 * iw + x0]) /
          ((x1 - x0) * (y1 - y0));
      const normalized = Math.min(255, (l * 245) / Math.max(100, mean)),
        v = bw
          ? l < mean - (8 + 12 * s)
            ? 0
            : 255
          : l * (1 - s) + normalized * s;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  return data;
}

/** Optional light blue/cyan suppression, not content reconstruction or secure redaction.
 * Operates on fresh raster pixels before grayscale, preserving dark/neutral ink.
 */
export function reduceBlueWatermark(data: Uint8ClampedArray, strength: number) {
  const amount = Number.isFinite(strength)
    ? Math.max(0, Math.min(1, strength))
    : 0;
  if (!amount) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    // Restrict to light blue/cyan. Dark ink and low-chroma gray are untouched.
    if (r < 110 || g < 140 || b < 165 || b - r < 18 || g - r < 6 || b < g - 8)
      continue;
    const blend = amount * Math.min(1, (b - r - 12) / 18);
    for (let c = 0; c < 3; c++) data[i + c] += (255 - data[i + c]) * blend;
  }
}
