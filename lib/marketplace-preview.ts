import {
  settingsSchema,
  restoreSettings,
  shuffled,
  duplicateIds,
  type PaperItem,
} from "@/lib/paper-builder";
import {
  PAPER_SECTION_ORDER,
  cqDivisionGroups,
  paperSectionTitle,
} from "@/lib/paper-sections";

export type MarketPreviewQuestion = {
  q: PaperItem;
  opts: [string, string][];
  ci: number;
};
export type MarketPreviewSection = {
  type: string;
  title: string;
  questions: MarketPreviewQuestion[];
};
const str = (value: unknown) => (typeof value === "string" ? value : "");
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Derive display only from the immutable application, never a fresh bank query. */
export function marketPreviewModel(
  snapshot: { settings: unknown; questions: unknown[] },
  setName?: "ক" | "খ",
) {
  if (!Array.isArray(snapshot.questions) || snapshot.questions.length > 300)
    throw new Error("Invalid snapshot");
  const s = restoreSettings(snapshot.settings);
  const selectedSet = setName ?? s.setName;
  const base = s.seed + (selectedSet === "খ" ? 7919 : 0);
  const data: PaperItem[] = snapshot.questions
    .map((raw) => {
      const r = object(raw),
        options = object(r.options);
      const cq =
        !str(r.correct) &&
        Boolean(
          options.stimulus ||
          options.k ||
          options.ক ||
          options.subQuestions ||
          str(r.text).includes("(ক)"),
        );
      const sub = object(options.subQuestions || options);
      const q: PaperItem = {
        id: str(r.id),
        text: str(r.text),
        correct: str(r.correct),
        explanation: str(r.explanation),
        category: str(r.category),
        subject: str(r.subject),
        topic: str(r.topic),
        options: Object.fromEntries(
          Object.entries(options).filter(
            (e): e is [string, string] => typeof e[1] === "string",
          ),
        ),
        type: str(r.correct) ? "MCQ" : cq ? "CQ" : "SHORT",
        stimulus: cq ? str(options.stimulus) : "",
        ...(cq
          ? {
              subQuestions: {
                k: str(sub.k || sub.ক),
                kh: str(sub.kh || sub.খ),
                g: str(sub.g || sub.গ),
                gh: str(sub.gh || sub.ঘ),
              },
            }
          : {}),
      };
      return { ...q, ...s.edits[q.id] };
    })
    .filter((q) => q.id && !s.excludedIds.includes(q.id));
  const divisions = [
    ...new Set(
      data
        .filter((q) => q.type === "CQ")
        .map((q) => s.attachments[q.id]?.division || q.topic || "সাধারণ বিভাগ"),
    ),
  ];
  const sections: MarketPreviewSection[] = PAPER_SECTION_ORDER.flatMap(
    (type) => {
      const selected = shuffled(
        data.filter((q) => q.type === type),
        base,
      );
      const groups =
        type === "CQ"
          ? cqDivisionGroups(s.show.divisions, s.cfg.divisionFilter, divisions)
          : [""];
      return groups.flatMap((group) => {
        const items = selected.filter(
          (q) =>
            !group ||
            (s.attachments[q.id]?.division || q.topic || "সাধারণ বিভাগ") ===
              group,
        );
        if (!items.length) return [];
        return [
          {
            type,
            title: paperSectionTitle(type, s.info.section, group),
            questions: items.map((q, i) => {
              const opts = shuffled(
                Object.entries(q.options || {}),
                base ? base + i + 1 : 0,
              );
              return {
                q,
                opts,
                ci: opts.findIndex(([key]) => key === q.correct),
              };
            }),
          },
        ];
      });
    },
  );
  const settings = {
    ...s,
    info: s.header.enabled
      ? s.info
      : {
          ...s.info,
          cls:
            s.info.cls ||
            [...new Set(data.map((q) => q.category).filter(Boolean))].join(
              ", ",
            ),
          subject:
            s.info.subject ||
            [...new Set(data.map((q) => q.subject).filter(Boolean))].join(", "),
          chapter:
            s.info.chapter ||
            [...new Set(data.map((q) => q.topic).filter(Boolean))].join(", "),
        },
  };
  return {
    settings,
    sections,
    duplicate: duplicateIds(data),
    setName: selectedSet,
  };
}

export function assertRenderableMarketSnapshot(snapshot: {
  settings: unknown;
  questions: unknown[];
}) {
  if (
    !settingsSchema.safeParse(snapshot.settings).success ||
    !Array.isArray(snapshot.questions) ||
    snapshot.questions.some((raw) => {
      const q = object(raw);
      return !str(q.id) || !str(q.text);
    }) ||
    !marketPreviewModel(snapshot).sections.length
  )
    throw new Error("প্রশ্নপত্রের প্রিভিউ যাচাই হয়নি।");
}
