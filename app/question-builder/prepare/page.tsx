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
  }>;
}) {
  const p = await searchParams;
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
      append={p.append === "1"}
    />
  );
}
