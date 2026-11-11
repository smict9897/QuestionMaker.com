import PaidBuilderGate from "@/components/paid-builder-gate";
import { loadEnglishPaper } from "@/app/actions/english-paper";
import EnglishEditor from "@/components/english-editor";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import QbBuilder from "@/components/qb-builder";
import QbSavePaper from "@/components/qb-save-paper";

export const dynamic = "force-dynamic";
export const metadata = { title: "প্রশ্নপত্র বিল্ডার" };

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{ englishKey?: string }>;
}) {
  const { englishKey } = await searchParams;
  if (englishKey) {
    if (englishKey.length > 250) notFound();
    const draft = await loadEnglishPaper(englishKey);
    if (!draft) notFound();
    return <EnglishEditor draftKey={englishKey} initial={draft} />;
  }
  const site = await getSite();
  const support = site.social.find((s) => s.name === "WhatsApp")?.url;
  const tutorial = site.social.find((s) => s.name === "YouTube")?.url;
  return (
    <PaidBuilderGate>
      <main className="mx-auto max-w-[1440px] px-4 py-6">
        <div data-noprint className="mb-4">
          <QbSavePaper />
        </div>
        <QbBuilder
          supportHref={
            support?.startsWith("https://") ? support : "/contact-us"
          }
          tutorialHref={tutorial?.startsWith("https://") ? tutorial : undefined}
        />
      </main>
    </PaidBuilderGate>
  );
}
