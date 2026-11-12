import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { READY_PREFIX, parseReady } from "@/lib/ready-papers";
import ReadyStudio from "@/components/ready-papers/studio";
import { ANSWER_PREFIX, answerEntrySchema } from "@/lib/ready-answers";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "রেডি প্রশ্নপত্র Studio",
  robots: { index: false },
};
export default async function Paper({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const s = await auth();
  if (!s?.user?.id) redirect(`/login?next=/ready-papers/${id}`);
  const row = await db.setting.findUnique({
    where: { key: READY_PREFIX + id },
  });
  const paper = row && parseReady(row.value);
  if (!paper || (!paper.published && s.user.role !== "ADMIN")) notFound();
  const isAdminPreset =
    s.user.role === "ADMIN" && (await searchParams).preset === "1";
  const rows = await db.setting.findMany({
    where: { key: { startsWith: ANSWER_PREFIX + id + ":" } },
    take: 40,
  });
  const answerEntries = rows.flatMap((row) => {
    try {
      const r = answerEntrySchema.parse(JSON.parse(row.value));
      return isAdminPreset || r.approved ? [r] : [];
    } catch {
      return [];
    }
  });
  return (
    <ReadyStudio
      paper={paper}
      answerEntries={answerEntries}
      userId={s.user.id}
      adminPreset={
        s.user.role === "ADMIN" && (await searchParams).preset === "1"
      }
    />
  );
}
