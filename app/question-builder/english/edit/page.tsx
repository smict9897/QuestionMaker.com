import { loadEnglishPaper } from "@/app/actions/english-paper";
import EnglishEditor from "@/components/english-editor";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function EnglishEditPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!key || key.length > 250) notFound();
  const draft = await loadEnglishPaper(key);
  if (!draft) notFound();
  return <EnglishEditor draftKey={key} initial={draft} />;
}
