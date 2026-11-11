import "@/components/saved-papers.css";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listPapers } from "@/app/actions/qb-papers";
import QbSavedList from "@/components/qb-saved-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "আমার তৈরি প্রশ্ন" };

export default async function SavedPapers() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/question-builder/saved");
  const papers = await listPapers().catch(() => null);

  return (
    <main className="saved-papers-page">
      {papers ? (
        <QbSavedList papers={papers} />
      ) : (
        <div role="alert" className="saved-paper-error">
          প্রশ্নপত্রের তালিকা লোড হয়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।
        </div>
      )}
    </main>
  );
}
