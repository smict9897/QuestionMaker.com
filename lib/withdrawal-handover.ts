import { z } from "zod";
export const handoverSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    requestKey: z.string().min(1).max(250),
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
    claimedAt: z.string().datetime(),
    note: z.string().min(10).max(1000),
    createdAt: z.string().datetime(),
    status: z.enum(["PENDING", "ACCEPTED", "CANCELLED"]),
    closedAt: z.string().datetime().optional(),
  })
  .strict();
export type WithdrawalHandover = z.infer<typeof handoverSchema>;
export function handoverKey(key: string) {
  if (!key.startsWith("wallet:withdrawal:v1:") || key.length > 250)
    throw Error("Invalid request");
  return key.replace("wallet:withdrawal:v1:", "wallet:withdrawal-handover:v1:");
}
export function parseHandover(raw: string, key: string) {
  const h = handoverSchema.parse(JSON.parse(raw));
  if (h.requestKey !== key || h.from === h.to) throw Error("Invalid handover");
  return h;
}
export function assertNoPendingHandover(raw: string | undefined, key: string) {
  if (raw && parseHandover(raw, key).status === "PENDING")
    throw Error("Handover pending; do not pay");
}
