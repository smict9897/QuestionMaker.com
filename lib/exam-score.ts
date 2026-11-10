// Never trust a score or question count supplied by a browser.
export function scoreExam(questions: unknown, submitted: unknown) {
  if (!Array.isArray(questions) || !questions.length) throw new Error("Invalid exam questions");
  const input = submitted && typeof submitted === "object" ? submitted as Record<string, unknown> : {};
  const answers: Record<string, number> = {};
  let score = 0;
  questions.forEach((q, i) => {
    if (!q || !Array.isArray(q.options) || !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) throw new Error("Invalid answer key");
    const answer = input[String(i)];
    if (typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < q.options.length) {
      answers[String(i)] = answer;
      if (answer === q.correctAnswer) score++;
    }
  });
  return { score, total: questions.length, answers };
}
