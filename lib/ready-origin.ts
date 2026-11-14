import { createHash } from "node:crypto";
import { z } from "zod";
import { readyRecordSchema, type ReadyPaper } from "@/lib/ready-papers";
import {
  readySelectionSchema,
  readySnapshotSchema,
  type ReadySnapshot,
} from "@/lib/ready-commerce";

export const READY_ORIGIN_PREFIX = "readyorigin:v1:";
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const originSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("READY_ASSEMBLY"),
    ownerId: z.string().min(1).max(200),
    receiptId: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime(),
    source: readyRecordSchema,
    selected: readySelectionSchema.shape.selected,
    initialSnapshot: readySnapshotSchema,
    classification: z.enum(["LIBRARY_ASSEMBLY", "UPLOADED_SOURCE"]),
    // An origin record is evidence of a server checkout, NOT publication rights.
    resaleAuthorized: z.literal(false),
  })
  .strict();
export type ReadyOrigin = z.infer<typeof originSchema>;
export function readyOriginKey(ownerId: string, receiptId: string) {
  if (!ownerId || ownerId.length > 200 || !/^[a-f0-9]{64}$/.test(receiptId))
    throw Error("Invalid origin identity");
  return `${READY_ORIGIN_PREFIX}${ownerId}:${receiptId}`;
}
/** Only call with the server-loaded source and server-confirmed receipt, never browser origin fields. */
export function createReadyOrigin(input: {
  ownerId: string;
  receiptId: string;
  createdAt: string;
  source: ReadyPaper;
  selected: number[];
  initialSnapshot: ReadySnapshot;
}) {
  const origin = originSchema.parse({
    ...input,
    version: 1,
    kind: "READY_ASSEMBLY",
    classification: input.source.ownerId
      ? "UPLOADED_SOURCE"
      : "LIBRARY_ASSEMBLY",
    resaleAuthorized: false,
  });
  return { origin, hash: digest(origin) };
}
/** Missing historical records are unverified. Never infer ownership from a client draft or backfill history. */
export function readReadyOrigin(
  raw: string,
  ownerId: string,
  receiptId: string,
  expectedHash: string,
): ReadyOrigin {
  const origin = originSchema.parse(JSON.parse(raw));
  if (
    origin.ownerId !== ownerId ||
    origin.receiptId !== receiptId ||
    digest(origin) !== expectedHash ||
    origin.classification !==
      (origin.source.ownerId ? "UPLOADED_SOURCE" : "LIBRARY_ASSEMBLY")
  )
    throw Error("Origin mismatch");
  return origin;
}
