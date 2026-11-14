import { z } from "zod";
export const SUPPORT_PREFIX = "support:ticket:v1:";
export const supportKinds = {
  GENERAL: "সাধারণ সহায়তা",
  PRIVACY: "গোপনীয়তা / তথ্যের অনুরোধ",
  COPYRIGHT: "কপিরাইট অভিযোগ",
} as const;
export const supportInput = z.object({
  id: z.string().uuid(),
  kind: z.enum(["GENERAL", "PRIVACY", "COPYRIGHT"]),
  title: z.string().trim().min(5).max(160),
  message: z.string().trim().min(20).max(4000),
  consent: z.literal(true),
});
export const ticketSchema = supportInput
  .omit({ consent: true })
  .extend({
    version: z.literal(1),
    ownerId: z.string().min(1).max(200),
    revision: z.number().int().positive(),
    status: z.enum(["OPEN", "RESOLVED"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    reply: z.string().min(10).max(3000).optional(),
    reviewerId: z.string().min(1).max(200).optional(),
  })
  .strict();
export type SupportTicket = z.infer<typeof ticketSchema>;
export function parseSupportTicket(key: string, raw: string) {
  const t = ticketSchema.parse(JSON.parse(raw));
  if (
    key !== SUPPORT_PREFIX + t.id ||
    (t.revision > 1 && (!t.reply || !t.reviewerId))
  )
    throw Error("Invalid ticket");
  return t;
}
