import { createRoot } from "react-dom/client";
import Setup from "../../components/english-setup";
import Editor from "../../components/english-editor";
import { englishBlueprint } from "../../lib/english/blueprints";
import { paperHeaderSchema } from "../../lib/paper-header";
import { validateEnglishDraft } from "../../lib/english/draft";
const grade = Number(new URLSearchParams(location.search).get("grade") || 6),
  paper = Number(new URLSearchParams(location.search).get("paper") || 1);
const b = englishBlueprint(grade, paper),
  sources = {},
  writing = {},
  passages = [];
for (const i of b.items) {
  if (i.sourceGroup && !passages.some((p) => p.key === i.sourceGroup)) {
    const text = Array.from(
      { length: 75 },
      () =>
        `This is a mock source for browser layout testing, not a textbook extract.`,
    ).join(" ");
    passages.push({ key: i.sourceGroup, text });
    if (i.sourceGroup !== "unseen")
      sources[i.sourceGroup] = { text, reference: "Mock fixture" };
  }
  if (i.section === "writing")
    writing[i.id] = {
      topic: "School life",
      ...(i.writingChoices ? { choice: i.writingChoices[0] } : {}),
    };
}
const output = {
  passages,
  tasks: b.items.map((i) => ({
    id: i.id,
    instruction:
      i.section === "writing"
        ? `Write about School life${i.words ? ` in ${i.words} words` : ""}.`
        : i.title,
    ...(i.sourceGroup ? { passageKey: i.sourceGroup } : {}),
    ...(["substitution", "information", "matching", "graph"].includes(i.id)
      ? {
          table: {
            headers: ["A", "B", "C"],
            rows: [
              ["Students", "are", "learning English."],
              ["Teachers", "help", "students."],
            ],
          },
        }
      : {}),
    ...(["gap-clues", "cloze-clues"].includes(i.id)
      ? { clues: ["learn", "read", "write", "speak", "listen"] }
      : {}),
    subitems: Array.from(
      { length: i.count || (i.id === "mcq" ? 5 : 0) },
      (_, j) => ({
        text: `Exercise ${j + 1}: Complete the requested task _____.`,
        ...(i.id === "mcq"
          ? { options: ["first", "second", "third", "fourth"], answer: "first" }
          : { answer: "A mock answer." }),
      }),
    ),
    ...(!i.count && i.id !== "mcq"
      ? { answer: "A separate mock sample answer." }
      : {}),
  })),
};
const draft = validateEnglishDraft({
  version: 1,
  name: "Mock English paper",
  selection: {
    grade,
    paper,
    mode: "full",
    itemIds: [],
    writing,
    sources,
    includeAnswers: true,
  },
  output,
  header: paperHeaderSchema.parse({}),
  fontSize: 12,
  font: "serif",
  updatedAt: /* @__PURE__ */ new Date().toISOString(),
});
createRoot(document.getElementById("root")).render(
  new URLSearchParams(location.search).has("editor") ? (
    <Editor draftKey="mock" initial={draft} />
  ) : (
    <Setup initialGrade={grade} initialPaper={paper} />
  ),
);
