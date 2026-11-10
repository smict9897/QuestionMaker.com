import QbBuilder from "@/components/qb-builder";
import QbSavePaper from "@/components/qb-save-paper";

export const dynamic = "force-dynamic";
export const metadata = { title: "প্রশ্নপত্র বিল্ডার" };

export default function BuildPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6">
      <div data-noprint className="mb-4">
        <QbSavePaper />
      </div>
      <QbBuilder />
    </main>
  );
}

