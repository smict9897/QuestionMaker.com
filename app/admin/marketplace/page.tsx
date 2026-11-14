import { marketExamLabel } from "@/lib/marketplace-exam-types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MARKET_PREFIX, type MarketSubmission } from "@/lib/marketplace";
import { MarketplaceReview } from "@/components/marketplace-submission";
import { formatMoney, teacherTid } from "@/lib/wallet";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "বিক্রির আবেদন যাচাই",
  robots: { index: false },
};
export default async function MarketplaceAdmin() {
  const actor = (await auth())?.user;
  if (!actor?.id) redirect("/login?next=/admin/marketplace");
  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") redirect("/dashboard");
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: MARKET_PREFIX },
      value: { contains: '"status":"PENDING"' },
    },
    take: 100,
    orderBy: { key: "asc" },
  });
  const submissions = rows.flatMap((row) => {
    try {
      const r = JSON.parse(row.value) as MarketSubmission;
      return r.status === "PENDING" ? [r] : [];
    } catch {
      return [];
    }
  });
  return (
    <main className="mx-auto max-w-4xl p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">বিক্রির আবেদন যাচাই</h1>
      <p>
        অনুমোদন দিলে ক্যাটালগে পরিচিতি ও বিক্রেতার প্রকাশ্য প্রোফাইলের লিংক দেখা যাবে।
        সম্পূর্ণ প্রশ্নপত্র প্রকাশিত হবে না। অনুমোদিত প্রশ্নপত্র কিনলে ক্রেতার ওয়ালেট থেকে
        মূল্য কাটবে ও বিক্রেতা ৬০% আয় পাবেন। সম্পূর্ণ স্থির কপি এবং বিষয়/অধ্যায়ের
        যথার্থতা যাচাই করুন।
      </p>
      {!submissions.length && <p>অপেক্ষমাণ আবেদন নেই।</p>}
      {submissions.map((r) => (
        <section key={r.id} className="rounded-xl border p-5">
          <h2 className="text-xl font-bold">{r.metadata.title}</h2>
          <p>পরীক্ষার ধরন: {marketExamLabel(r.metadata.examType)}</p>
          <p>
            TID: {teacherTid(r.ownerId)} · শ্রেণি {r.metadata.grade} ·{" "}
            {r.metadata.subject} · {formatMoney(r.metadata.pricePaisa)}
          </p>
          <p>{r.metadata.chapters.join(" · ")}</p>
          <p>{r.metadata.description}</p>
          <Link
            href={`/dashboard/sell/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="my-3 inline-block rounded bg-indigo-700 px-4 py-2 text-white"
          >
            সম্পূর্ণ প্রশ্নপত্রের পৃষ্ঠা প্রিভিউ খুলুন ↗
          </Link>
          <details>
            <summary className="cursor-pointer font-bold p-3">
              সম্পূর্ণ স্থির প্রশ্নপত্র ও সেটিংস দেখুন
            </summary>
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-sm">
              {JSON.stringify(r.snapshot, null, 2)}
            </pre>
          </details>
          <p className="break-all text-xs">
            Snapshot SHA-256: {r.snapshotHash}
          </p>
          <MarketplaceReview id={r.id} revision={r.revision} />
        </section>
      ))}
    </main>
  );
}
