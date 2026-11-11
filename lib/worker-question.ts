/** Fail closed on incomplete worker output. No default answer or missing CQ parts. */
export function workerQuestion(
  raw: unknown,
  kind: "MCQ" | "CQ" | "SQ",
  three: boolean,
) {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, any>;
  const text = (v: unknown) =>
    typeof v === "string" && v.trim().length <= 20000 ? v.trim() : "";
  const main = text(
    kind === "CQ" ? (q.stimulus ?? q.text) : (q.text ?? q.question),
  );
  if (!main) return null;
  if (kind === "MCQ") {
    const options = Object.fromEntries(
      ["A", "B", "C", "D"].map((k) => [
        k,
        text(q.options?.[k]).replace(/[✓✔☑]/g, "").trim(),
      ]),
    );
    if (
      Object.values(options).some((v) => !v) ||
      new Set(Object.values(options)).size !== 4 ||
      !["A", "B", "C", "D"].includes(q.correct) ||
      !text(q.explanation)
    )
      return null;
    return {
      text: main,
      options,
      correct: q.correct as string,
      explanation: text(q.explanation),
    };
  }
  if (kind === "SQ") {
    const answer = text(q.answer ?? q.ans);
    return answer
      ? { text: main, options: { answer }, correct: "", explanation: answer }
      : null;
  }
  const a = q.answers ?? q.ans ?? {};
  const keys = three
    ? [
        ["k", "ক"],
        ["kh", "খ"],
        ["g", "গ"],
      ]
    : [
        ["k", "ক"],
        ["kh", "খ"],
        ["g", "গ"],
        ["gh", "ঘ"],
      ];
  const options: Record<string, any> = { stimulus: main, ans: {} };
  for (const [latin, bn] of keys) {
    const prompt = text(q[latin] ?? q[bn]),
      answer = text(a[latin] ?? a[bn]);
    if (!prompt || !answer) return null;
    options[bn] = prompt;
    options.ans[bn] = answer;
  }
  return { text: main, options, correct: "", explanation: "" };
}
