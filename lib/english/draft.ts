import { z } from "zod";
import { englishSelectionSchema, resolveEnglishSelection } from "./selection";
import { englishOutputSchema, validateEnglishOutput } from "./generation";
import { paperHeaderSchema } from "../paper-header";
export const englishDraftSchema = z
  .object({
    version: z.literal(1),
    name: z.string().trim().min(1).max(120),
    selection: englishSelectionSchema,
    output: englishOutputSchema,
    header: paperHeaderSchema,
    fontSize: z.number().int().min(10).max(22),
    font: z.enum(["serif", "sans-serif"]),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type EnglishDraft = z.infer<typeof englishDraftSchema>;
export function validateEnglishDraft(raw: unknown) {
  const draft = englishDraftSchema.parse(raw);
  resolveEnglishSelection(draft.selection);
  validateEnglishOutput(draft.selection, draft.output);
  if (JSON.stringify(draft).length > 600000)
    throw new Error("Draft too large.");
  return draft;
}
export function englishOwnerPrefix(userId: string) {
  return `englishpaper:${encodeURIComponent(userId)}:`;
}
export function ownsEnglishDraft(key: string, userId: string) {
  return (
    key.startsWith(englishOwnerPrefix(userId)) &&
    /^[a-f0-9-]{36}$/.test(key.slice(englishOwnerPrefix(userId).length))
  );
}
