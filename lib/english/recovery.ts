import { completeArrayObjects } from "../generation-stream";
import { resolveEnglishSelection } from "./selection";
import { assembleEnglishProviderOutput } from "./generation";
/** Each task is independently validated with its original requested topics and linked passage. */
export function recoverEnglishTasks(rawSelection: unknown, content: string) {
  const request = resolveEnglishSelection(rawSelection);
  const passages = completeArrayObjects(content, "passages");
  const tasks = completeArrayObjects(content, "tasks");
  const recovered = [];
  for (const item of request.items) {
    const matches = tasks.filter((t: any) => t?.id === item.id);
    if (matches.length !== 1) continue;
    const candidate = matches[0] as { passageKey?: string };
    const selection = {
      ...request.selection,
      mode: "selected" as const,
      itemIds: [item.id],
      writing:
        item.section === "writing"
          ? { [item.id]: request.selection.writing[item.id] }
          : {},
      sources:
        item.sourceGroup && item.sourceGroup !== "unseen"
          ? { [item.sourceGroup]: request.selection.sources[item.sourceGroup] }
          : {},
    };
    try {
      const result = assembleEnglishProviderOutput(selection, {
        passages: passages.filter(
          (p: any) =>
            p?.key === candidate.passageKey &&
            !Object.hasOwn(selection.sources, p.key),
        ),
        tasks: [candidate],
      });
      recovered.push({ selection, result, id: item.id });
    } catch {
      /* incomplete/invalid task must never enter review */
    }
  }
  return recovered;
}
