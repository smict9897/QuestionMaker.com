import { Prisma } from "@prisma/client";
import { selectedQuestionTypes } from "./question-type-options";
export function questionTypeWhere(value: unknown): Prisma.QuestionWhereInput {
  const types = selectedQuestionTypes(value);
  if (types.length === 3) return {};
  const cq: Prisma.QuestionWhereInput = {
    OR: [
      { text: { contains: "(ক)" } },
      ...["stimulus", "k", "ক", "subQuestions"].map((key) => ({
        options: { path: [key], not: Prisma.AnyNull },
      })),
    ],
  };
  return {
    OR: types.map((type) =>
      type === "MCQ"
        ? { correct: { not: "" } }
        : type === "CQ"
          ? { AND: [{ correct: "" }, cq] }
          : { AND: [{ correct: "" }, { NOT: cq }] },
    ),
  };
}
