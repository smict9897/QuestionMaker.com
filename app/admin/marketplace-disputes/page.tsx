import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DISPUTE_PREFIX, parseDispute } from "@/lib/marketplace-refund";
import { teacherTid } from "@/lib/wallet";
import { MarketComplaintReview } from "@/components/marketplace-dispute";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "মার্কেটপ্লেস অভিযোগ",
  robots: { index: false, follow: false },
};
export default async function Disputes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; after?: string }>;
}) {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/marketplace-disputes");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const q = await searchParams,
    status =
      q.status === "REJECTED" || q.status === "REFUNDED" ? q.status : "OPEN",
    after =
      q.after && q.after.startsWith(DISPUTE_PREFIX) && q.after.length <= 300
        ? q.after
        : undefined;
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: DISPUTE_PREFIX, ...(after ? { gt: after } : {}) },
      value: { contains: `"status":"${status}"` },
    },
    orderBy: { key: "asc" },
    take: 51,
  });
  return (
    <main className="max-w-3xl mx-auto p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">মার্কেটপ্লেস অভিযোগ ও রিফান্ড</h1>
      <nav className="flex gap-4 flex-wrap">
        <Link href="?status=OPEN">অপেক্ষমাণ</Link>
        <Link href="?status=REFUNDED">রিফান্ড</Link>
        <Link href="?status=REJECTED">অন্য নিষ্পত্তি</Link>
      </nav>
      <p>
        বিক্রেতার পর্যাপ্ত অবশিষ্ট earnings না থাকলে রিফান্ড বন্ধ থাকবে; অন্য উৎস কাটা
        বা ঋণ বানানো হবে না। তখন অভিযোগ খোলা রেখে বাহ্যিক সমন্বয় প্রয়োজন। এখানে
        bKash পেমেন্ট নয়—ওয়ালেটের মূল উৎসে ফেরত।
      </p>
      {rows.slice(0, 50).map((row) => {
        try {
          const d = parseDispute(row.key, row.value);
          return (
            <article className="border rounded-xl p-4 space-y-3" key={row.key}>
              <p className="break-all">
                ক্রেতা: {teacherTid(d.buyerId)} · {d.createdAt}
              </p>
              <Link className="underline" href={`/marketplace/${d.paperId}`}>
                বর্তমান প্রশ্নপত্রের বিবরণ →
              </Link>
              <p className="whitespace-pre-wrap break-words">{d.reason}</p>
              {d.status === "OPEN" ? (
                <MarketComplaintReview recordKey={row.key} />
              ) : (
                <p className="whitespace-pre-wrap break-words">
                  {d.status} · {d.note} · {d.reviewedAt}
                </p>
              )}
            </article>
          );
        } catch {
          return (
            <p role="alert" key={row.key}>
              একটি অভিযোগের তথ্য যাচাই হয়নি; নিষ্পত্তির আগে তদন্ত করুন।
            </p>
          );
        }
      })}
      {!rows.length && <p>এই অবস্থায় কোনো অভিযোগ নেই।</p>}
      {rows.length > 50 && (
        <Link
          href={`?status=${status}&after=${encodeURIComponent(rows[49].key)}`}
        >
          পরের পৃষ্ঠা →
        </Link>
      )}
    </main>
  );
}
