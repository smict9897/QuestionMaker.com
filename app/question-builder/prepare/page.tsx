import { redirect } from "next/navigation";
import { englishSubjectRoute } from "@/lib/english/selection";
import PaperPreparation from "@/components/paper-preparation";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export default async function PreparePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    subject?: string;
    topic?: string | string[];
    append?: string;
    questionType?: string;
  }>;
}) {
  const p = await searchParams;
  const englishRoute = englishSubjectRoute(
    typeof p.category === "string" ? p.category : "",
    typeof p.subject === "string" ? p.subject : "",
  );
  if (englishRoute && p.append !== "1") redirect(englishRoute);
  return (
    <PaperPreparation
      category={typeof p.category === "string" ? p.category : ""}
      subject={typeof p.subject === "string" ? p.subject : ""}
      topics={
        Array.isArray(p.topic)
          ? p.topic
          : typeof p.topic === "string"
            ? [p.topic]
            : []
      }
      questionType={typeof p.questionType === "string" ? p.questionType : "ALL"}
      append={p.append === "1"}
    />
  );
}
