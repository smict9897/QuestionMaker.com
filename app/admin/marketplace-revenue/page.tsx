import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatMoney, teacherTid } from "@/lib/wallet";
import {
  PLATFORM_RECEIPT_PREFIX,
  saleReceipt,
  pageRevenue,
  matchingRefund,
} from "@/lib/marketplace-report";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "মার্কেটপ্লেস বিক্রির হিসাব",
  robots: { index: false, follow: false },
};
export default async function Revenue({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/marketplace-revenue");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const after = (await searchParams).after;
  const cursor =
    after && after.length <= 250 && after.startsWith(PLATFORM_RECEIPT_PREFIX)
      ? after
      : undefined;
  const rows = await db.setting.findMany({
    where: {
      key: {
        startsWith: PLATFORM_RECEIPT_PREFIX,
        ...(cursor ? { gt: cursor } : {}),
      },
    },
    orderBy: { key: "asc" },
    take: 51,
  });
  const page = rows.slice(0, 50),
    receipts = page.flatMap((row) => {
      const r = saleReceipt(row.key, row.value);
      return r ? [r] : [];
    }),
    totals = pageRevenue(receipts);
  const refundRows = receipts.length
    ? await db.setting.findMany({
        where: {
          key: {
            in: receipts.map(
              (r) => `market:refund:v1:${r.buyerId}:${r.paperId}`,
            ),
          },
        },
      })
    : [];
  const refunds = new Map(refundRows.map((row) => [row.key, row.value]));
  const reversed = receipts.filter((r) => {
    const raw = refunds.get(`market:refund:v1:${r.buyerId}:${r.paperId}`);
    return !!raw && matchingRefund(raw, r);
  });
  const reversals = pageRevenue(reversed);
  const invalidRefunds = refundRows.length - reversed.length;
  return (
    <main className="mx-auto max-w-5xl p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">মার্কেটপ্লেস বিক্রির হিসাব</h1>
      <p>
        প্রতি পৃষ্ঠায় সর্বোচ্চ ৫০টি স্থায়ী বিক্রির রসিদ। নিচের যোগফল শুধু এই পৃষ্ঠার
        যাচাইকৃত রসিদের—সর্বকালের আয়, হাতে থাকা নগদ, নিট লাভ বা নিষ্পত্তিকৃত bKash
        টাকা নয়। ক্রম রসিদের ID অনুযায়ী, সময় অনুযায়ী নয়।
      </p>
      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="font-bold">এই পৃষ্ঠার হিসাব</h2>
        <p>
          বিক্রি: {totals.count} · মোট মূল্য: {formatMoney(totals.amount)}
        </p>
        <p>
          বিক্রেতার আয়: {formatMoney(totals.sellerAmount)} · প্ল্যাটফর্ম অংশ:{" "}
          {formatMoney(totals.platformAmount)}
        </p>
        <p>
          এই পৃষ্ঠার বিক্রির রিফান্ড: {reversals.count}টি ·{" "}
          {formatMoney(reversals.amount)}। সংশ্লিষ্ট প্ল্যাটফর্ম অংশ ফেরত:{" "}
          {formatMoney(reversals.platformAmount)}।
        </p>
        <p>
          যাচাইকৃত রিফান্ড বাদে এই পৃষ্ঠার বিক্রি:{" "}
          {formatMoney(totals.amount - reversals.amount)} · বিক্রেতার অংশ{" "}
          {formatMoney(totals.sellerAmount - reversals.sellerAmount)} · প্ল্যাটফর্ম
          অংশ {formatMoney(totals.platformAmount - reversals.platformAmount)}।
          এটি নিট লাভ বা নগদ নয়।
        </p>
      </section>
      {invalidRefunds > 0 && (
        <p role="alert">
          {invalidRefunds}টি রিফান্ড রসিদ মেলেনি; নিচের সমন্বিত হিসাব চূড়ান্ত নয়।
          তদন্ত করুন।
        </p>
      )}
      <Link className="block underline" href="/admin/marketplace-disputes">
        অভিযোগ ও রিফান্ড নিষ্পত্তি →
      </Link>
      {page.length !== receipts.length && (
        <p role="alert">
          {page.length - receipts.length}টি রসিদের তথ্য যাচাই হয়নি; যোগফল থেকে
          বাদ। আর্থিক নিষ্পত্তির আগে তদন্ত করুন।
        </p>
      )}
      <Link className="block underline" href="/admin/withdrawals">
        উত্তোলনের হোল্ড / ম্যানুয়াল নিষ্পত্তি দেখুন →
      </Link>
      {receipts.map((r) => (
        <article
          key={`${r.buyerId}:${r.paperId}`}
          className="border rounded-xl p-4 space-y-2 break-all"
        >
          <p>{r.at}</p>
          {reversed.some(
            (refund) =>
              refund.buyerId === r.buyerId && refund.paperId === r.paperId,
          ) && <p>পূর্ণ রিফান্ড হয়েছে; মূল রসিদ অডিটের জন্য রাখা আছে।</p>}
          <p>
            ক্রেতা: {teacherTid(r.buyerId)} · বিক্রেতা: {teacherTid(r.sellerId)}
          </p>
          <p>
            মূল্য {formatMoney(r.amount)} · বিক্রেতা {formatMoney(r.sellerAmount)}{" "}
            · প্ল্যাটফর্ম {formatMoney(r.platformAmount)}
          </p>
          <Link className="underline" href={`/marketplace/${r.paperId}`}>
            প্রশ্নপত্রের বর্তমান বিবরণ →
          </Link>
          <p className="text-sm">
            বিবরণ সরানো হলেও এই রসিদ থাকে। এটি পূর্ণ প্রশ্নপত্রের অ্যাক্সেস দেয় না।
          </p>
        </article>
      ))}
      {!rows.length && <p>এই পৃষ্ঠায় কোনো বিক্রির রসিদ নেই।</p>}
      {rows.length > 50 && (
        <Link
          className="block underline"
          href={`?after=${encodeURIComponent(page[49].key)}`}
        >
          পরের ৫০টি →
        </Link>
      )}
    </main>
  );
}
