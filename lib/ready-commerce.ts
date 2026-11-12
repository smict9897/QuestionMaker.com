import { z } from "zod";
import { pageEditSchema } from "./ready-papers";
import { settingsSchema } from "./paper-builder";
export const READY_UNIT_PAISA = 500;
export const READY_MONTH_PAISA = 9900;
export const READY_MONTH_UNITS = 30;
export const readySelectionSchema = z.object({
  paperId: z.string().uuid(),
  selected: z
    .array(z.number().int().min(1).max(100))
    .min(1)
    .max(10)
    .refine((p) => new Set(p).size === p.length, "একই page দুবার নয়।"),
});
export function readyUnits(pages: number) {
  if (!Number.isInteger(pages) || pages < 1 || pages > 10)
    throw new Error("১–১০ page নির্বাচন করুন।");
  return Math.ceil(pages / 3);
}
export const readySnapshotSchema = z.object({
  edits: z
    .record(z.string().regex(/^([1-9]|[1-9]\d|100)$/), pageEditSchema)
    .default({}),
  header: z.object({
    school: z.string().max(160),
    exam: z.string().max(160),
    subject: z.string().max(160),
    time: z.string().max(160),
    marks: z.string().max(160),
  }),
  headerStyle: z.enum(["simple", "custom", "none"]),
  headerSettings: settingsSchema,
  headerLine: z.boolean(),
  headerGap: z.number().min(0).max(15),
});
export type ReadySnapshot = z.infer<typeof readySnapshotSchema>;
export type ReadyQuote = {
  aiAvailable: boolean;
  receiptId: string;
  units: number;
  total: number;
  balance: number;
  packageUnits: number;
  packageRemaining: number;
  owned: boolean;
  admin: boolean;
};

export function readySelectionIdentity(selected: number[]) {
  return JSON.stringify([...selected].sort((a, b) => a - b));
}
