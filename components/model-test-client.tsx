"use client";

import { useRouter } from "next/navigation";
import LiveExamPlayer, { ExamQuestion, StudentInfo, AttemptResult } from "@/components/LiveExamPlayer";
import { submitModelTestAttempt, startModelTestAttempt } from "@/app/actions/model-test-attempt";

type Props = {
  testId: string;
  examTitle: string;
  questions: ExamQuestion[];
  minutes: number;
  defaultName?: string;
};

export default function ModelTestClient({ testId, examTitle, questions, minutes, defaultName }: Props) {
  const router = useRouter();

  const initialInfo: StudentInfo | undefined = defaultName
    ? { name: defaultName, className: "", roll: "", institution: "" }
    : undefined;

  async function handleSubmit(result: AttemptResult) {
    const response = await submitModelTestAttempt({
      testId,
      studentName: result.studentName,
      studentClass: result.studentClass,
      rollNumber: result.rollNumber,
      institution: result.institution,
      score: result.score,
      total: result.total,
      timeSpent: result.timeSpent,
      warnings: result.warnings,
      answers: result.answers,
    });
    if (!response.success) throw new Error(response.error);
    router.refresh();
  }

  return (
    <LiveExamPlayer
      examTitle={examTitle}
      questions={questions}
      timeInMinutes={minutes}
      studentInfo={initialInfo}
      antiCheat
      leaderboardUrl={`/api/model-test-leaderboard?testId=${testId}`}
      onStart={() => startModelTestAttempt(testId)}
      onSubmit={handleSubmit}
    />
  );
}
