import { marketExamLabel } from "@/lib/marketplace-exam-types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listPapers } from "@/app/actions/qb-papers";
import { MARKET_PREFIX, type MarketSubmission } from "@/lib/marketplace";
import { MarketplaceSubmission } from "@/components/marketplace-submission";
import { formatMoney } from "@/lib/wallet";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "প্রশ্নপত্র বিক্রির আবেদন",
  robots: { index: false },
};
export default async function SellPage() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login?next=/dashboard/sell");
  const papers = await listPapers();
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: MARKET_PREFIX },
      value: { contains: JSON.stringify(user.id) },
    },
    take: 200,
    orderBy: { key: "asc" },
  });
  const submissions = rows.flatMap((row) => {
    try {
      const r = JSON.parse(row.value) as MarketSubmission;
      return r.ownerId === user.id ? [r] : [];
    } catch {
      return [];
    }
  });
  const labels = {
    PENDING: "অনুমোদনের অপেক্ষায়",
    APPROVED: "অনুমোদিত — ক্যাটালগে পরিচিতি প্রকাশিত; কেনাকাটা বন্ধ",
    CHANGES: "সংশোধন প্রয়োজন",
    REJECTED: "বাতিল",
  };
  return (
    <main className="mx-auto max-w-3xl p-5 space-y-5">
      <Link href="/dashboard">← ড্যাশবোর্ড</Link>
      <h1 className="text-2xl font-bold">প্রশ্নপত্র বিক্রির আবেদন</h1>
      <p className="rounded bg-amber-50 p-4">
        প্রথম পর্যায়ে শুধু নিজের ডাটাবেজ থেকে তৈরি সংরক্ষিত প্রশ্নপত্রের আবেদন নেওয়া
        হচ্ছে। অনুমোদিত হলে ক্যাটালগে পরিচিতি প্রকাশিত হবে। PDF প্রস্তুত কপি, কেনাকাটা
        ও আয় বণ্টন এখনও চালু হয়নি। আবেদন জমায় কোনো নতুন টাকা কাটবে না।
      </p>
      {papers.length ? (
        <MarketplaceSubmission
          papers={papers.map((p) => ({ key: p.key, name: p.name }))}
        />
      ) : (
        <p>
          আগে{" "}
          <Link className="underline" href="/question-builder">
            ডাটাবেজ থেকে প্রশ্নপত্র তৈরি ও সংরক্ষণ করুন
          </Link>
          ।
        </p>
      )}
      <h2 className="text-xl font-bold">আমার আবেদন</h2>
      {submissions.map((r) => (
        <section key={r.id} className="rounded-xl border p-4">
          <h3 className="font-bold">{r.metadata.title}</h3>
          <p>পরীক্ষার ধরন: {marketExamLabel(r.metadata.examType)}</p>
          <p>
            {labels[r.status]} · {formatMoney(r.metadata.pricePaisa)} · সংস্করণ{" "}
            {r.revision}
          </p>
          {r.review && <p>অ্যাডমিনের নোট: {r.review.note || "—"}</p>}
        </section>
      ))}
      {!submissions.length && <p>এখনও কোনো আবেদন নেই।</p>}
    </main>
  );
}
