import { z } from "zod";
import {
  englishBlueprint,
  type EnglishGrade,
  type EnglishPaper,
} from "./blueprints";
export const englishSelectionSchema = z
  .object({
    grade: z.number().int().min(6).max(12),
    paper: z.union([z.literal(1), z.literal(2)]),
    mode: z.enum(["full", "selected", "writing"]),
    itemIds: z.array(z.string().max(80)).max(20),
    writing: z.record(
      z
        .object({
          topic: z.string().trim().min(1).max(500),
          choice: z.string().max(80).optional(),
          words: z.number().int().min(20).max(2000).optional(),
          instruction: z.string().trim().max(1000).optional(),
        })
        .strict(),
    ),
    sources: z.record(
      z
        .object({
          text: z.string().trim().min(1).max(20000),
          reference: z.string().trim().min(1).max(500),
        })
        .strict(),
    ),
    includeAnswers: z.boolean(),
  })
  .strict();
export function resolveEnglishSelection(raw: unknown) {
  const selection = englishSelectionSchema.parse(raw);
  const blueprint = englishBlueprint(
    selection.grade as EnglishGrade,
    selection.paper as EnglishPaper,
  );
  const ids = selection.itemIds;
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !blueprint.items.some((i) => i.id === id))
  )
    throw new Error("Invalid or duplicate item selection.");
  const items = blueprint.items.filter(
    (i) =>
      selection.mode === "full" ||
      (selection.mode === "writing"
        ? i.section === "writing" && ids.includes(i.id)
        : ids.includes(i.id)),
  );
  if (!items.length) throw new Error("Select at least one item.");
  if (
    selection.mode === "writing" &&
    ids.some(
      (id) => blueprint.items.find((i) => i.id === id)?.section !== "writing",
    )
  )
    throw new Error("Writing Only cannot include reading or grammar.");
  const writing = items.filter((i) => i.section === "writing");
  if (
    Object.keys(selection.writing).some(
      (id) => !writing.some((i) => i.id === id),
    )
  )
    throw new Error("Unexpected writing topic.");
  for (const item of writing) {
    const request = selection.writing[item.id];
    if (!request) throw new Error(`Enter a topic for ${item.title}.`);
    if (
      item.writingChoices &&
      !item.writingChoices.includes(request.choice || "")
    )
      throw new Error(`Choose one task type for ${item.title}.`);
    if (!item.writingChoices && request.choice)
      throw new Error("Unexpected writing task type.");
  }
  const requiredSources = [
    ...new Set(
      items
        .map((i) => i.sourceGroup)
        .filter((s): s is NonNullable<typeof s> => !!s && s !== "unseen"),
    ),
  ];
  if (
    Object.keys(selection.sources).some(
      (key) =>
        !requiredSources.includes(key as (typeof requiredSources)[number]),
    )
  )
    throw new Error("Unexpected source text.");
  for (const key of requiredSources)
    if (!selection.sources[key])
      throw new Error(`Provide the textbook text and reference for ${key}.`);
  return {
    selection,
    blueprint,
    items,
    total: items.reduce((sum, i) => sum + i.marks, 0),
    requiredSources,
  };
}
export function englishSubjectRoute(category: string, subject: string) {
  if (!/english|ইংরেজি/i.test(subject)) return null;
  const grade = /HSC|11|12/.test(category)
    ? 11
    : /SSC|9|10/.test(category)
      ? 9
      : Number(category.replace(/^Class\s*/i, ""));
  if (!Number.isInteger(grade) || grade < 6 || grade > 12) return null;
  const paper = /2|২|grammar/i.test(subject) ? 2 : 1;
  return `/question-builder/english?grade=${grade}&paper=${paper}`;
}
