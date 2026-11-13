import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { marketCatalog } from "@/lib/marketplace-catalog-data";
import { filterMarketPapers } from "@/lib/marketplace-catalog";
import { teacherTid } from "@/lib/wallet";
import MarketplaceCards from "@/components/marketplace-cards";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "শিক্ষকের প্রকাশ্য প্রোফাইল",
  robots: { index: false },
};
export default async function TeacherPage({
  params,
  searchParams,
}: {
  params: Promise<{ tid: string }>;
  searchParams: Promise<{ after?: string }>;
}) {
  const { tid } = await params;
  if (!/^QB-[A-F0-9]{20}$/.test(tid)) notFound();
  const identity = await db.setting.findUnique({
    where: { key: `teacher:tid:${tid}` },
  });
  if (!identity || teacherTid(identity.value) !== tid) notFound();
  const user = await db.user.findUnique({
    where: { id: identity.value },
    select: { name: true },
  });
  if (!user) notFound();
  const { after } = await searchParams;
  const { papers, next } = await marketCatalog(
    typeof after === "string" ? after : undefined,
  );
  const owned = filterMarketPapers(papers, { sellerTid: tid });
  return (
    <main className="mx-auto max-w-5xl p-5 space-y-5">
      <Link href="/marketplace">← মার্কেটপ্লেস</Link>
      <header className="rounded-2xl border bg-indigo-50 p-6">
        <h1 className="text-3xl font-bold">{user.name || "শিক্ষক"}</h1>
        <p className="break-all mt-2">TID: {tid}</p>
        <p>শিক্ষকের প্রকাশ্য প্রশ্নপত্র প্রোফাইল</p>
      </header>
      <h2 className="text-xl font-bold">অনুমোদিত প্রশ্নপত্র</h2>
      <MarketplaceCards papers={owned} />
      {!owned.length && (
        <p>বর্তমান ক্যাটালগ পাতায় এই শিক্ষকের অনুমোদিত প্রশ্নপত্র নেই।</p>
      )}
      <p className="text-sm text-slate-600">
        এই তালিকা ক্যাটালগের বর্তমান ২০০ রেকর্ডের পাতায় সীমাবদ্ধ। কেনাকাটা এখনও চালু
        হয়নি।
      </p>
      {next && (
        <Link
          className="inline-block rounded border p-3"
          href={`/teachers/${tid}?${new URLSearchParams({ after: next })}`}
        >
          পরবর্তী ক্যাটালগ পাতা →
        </Link>
      )}
    </main>
  );
}
