import { resolveEnglishSelection } from "./selection";
import {
  validateEnglishOutput,
  validateEnglishReferenceShape,
  type EnglishGeneratedOutput,
} from "./generation";
import { validateEnglishDraft } from "./draft";

type Selection = ReturnType<typeof resolveEnglishSelection>["selection"];
export function englishSubset(selection: Selection, ids: string[]) {
  const request = resolveEnglishSelection(selection);
  const items = request.items.filter((i) => ids.includes(i.id));
  const sources = new Set(items.map((i) => i.sourceGroup));
  return {
    ...selection,
    mode: "selected" as const,
    itemIds: items.map((i) => i.id),
    writing: Object.fromEntries(
      Object.entries(selection.writing).filter(([id]) => ids.includes(id)),
    ),
    sources: Object.fromEntries(
      Object.entries(selection.sources).filter(([key]) =>
        sources.has(key as any),
      ),
    ),
  };
}
function signature(selection: Selection, id: string) {
  const request = resolveEnglishSelection(selection);
  const item = request.items.find((i) => i.id === id)!;
  const w = selection.writing[id],
    source = item.sourceGroup && selection.sources[item.sourceGroup];
  return JSON.stringify([
    selection.grade,
    selection.paper,
    id,
    w
      ? [
          w.topic,
          w.choice || "",
          w.words ?? item.words ?? null,
          w.instruction || "",
        ]
      : null,
    source ? [source.text, source.reference] : null,
  ]);
}
/** Only admin-approved immutable review snapshots can cross account boundaries. */
export async function findEnglishBankParts(
  raw: unknown,
  page: (after?: string) => Promise<{ key: string; value: string }[]>,
) {
  const request = resolveEnglishSelection(raw);
  const groups = new Map<string, typeof request.items>();
  for (const item of request.items) {
    const key = item.sourceGroup || item.id;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  const candidates = new Map<
    string,
    {
      task: EnglishGeneratedOutput["tasks"][number];
      passages: EnglishGeneratedOutput["passages"];
    }[]
  >();
  const output: EnglishGeneratedOutput = { tasks: [], passages: [] };
  let after: string | undefined;
  while (groups.size) {
    const rows = await page(after);
    for (const row of rows) {
      try {
        const record = JSON.parse(row.value);
        if (record.status !== "APPROVED") continue;
        const draft = validateEnglishDraft(record.draft);
        if (request.selection.includeAnswers && !draft.selection.includeAnswers)
          continue;
        for (const task of draft.output.tasks) {
          const item = request.items.find((i) => i.id === task.id);
          if (
            !item ||
            signature(request.selection, item.id) !==
              signature(draft.selection, item.id)
          )
            continue;
          const passages = draft.output.passages.filter(
            (p) => p.key === task.passageKey,
          );
          const group = item.sourceGroup || item.id;
          // Same passage text is mandatory across every task sharing a source group.
          const key = JSON.stringify([group, passages]);
          const list = candidates.get(key) || [];
          if (!list.some((c) => c.task.id === task.id))
            list.push({ task, passages });
          candidates.set(key, list);
          const required = groups.get(group);
          if (
            !required ||
            !required.every((i) => list.some((c) => c.task.id === i.id))
          )
            continue;
          const selected = required.map(
            (i) => list.find((c) => c.task.id === i.id)!.task,
          );
          const tasks = selected.map((t) =>
            request.selection.includeAnswers
              ? t
              : {
                  ...t,
                  answer: undefined,
                  subitems: t.subitems.map((s) => ({
                    ...s,
                    answer: undefined,
                  })),
                },
          );
          const result = validateEnglishOutput(
            englishSubset(
              request.selection,
              required.map((i) => i.id),
            ),
            { tasks, passages },
          );
          validateEnglishReferenceShape(
            englishSubset(
              request.selection,
              required.map((i) => i.id),
            ),
            result.output,
          );
          output.tasks.push(...result.output.tasks);
          output.passages.push(...result.output.passages);
          groups.delete(group);
        }
      } catch {
        /* untrusted/malformed legacy bank entries are never reusable */
      }
    }
    if (rows.length < 100 || rows.at(-1)?.key === after) break;
    after = rows.at(-1)!.key;
  }
  output.tasks.sort(
    (a, b) =>
      request.items.findIndex((i) => i.id === a.id) -
      request.items.findIndex((i) => i.id === b.id),
  );
  return { output, missingIds: [...groups.values()].flat().map((i) => i.id) };
}
