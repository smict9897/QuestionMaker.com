import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/wallet";
import { reportRange, REPORT_SCAN_LIMIT } from "@/lib/wallet-financial-report";
import { readFinancialReport } from "@/lib/wallet-financial-data";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "সমন্বিত আর্থিক রিপোর্ট",
  robots: { index: false, follow: false },
};
export default async function FinancialReport({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/financial-report");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const q = await searchParams;
  let invalid = false;
  try {
    reportRange(q.from, q.to);
  } catch {
    invalid = true;
  }
  const report = invalid ? null : await readFinancialReport(id, q.from, q.to);
  return (
    <main className="max-w-4xl mx-auto p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">সমন্বিত আর্থিক রিপোর্ট</h1>
      <form
        method="get"
        className="rounded-xl border p-4 flex flex-wrap gap-4 items-end"
      >
        <label>
          শুরু (বাংলাদেশ)
          <input
            className="block border rounded p-3"
            type="date"
            name="from"
            defaultValue={q.from}
          />
        </label>
        <label>
          শেষ (বাংলাদেশ, দিনসহ)
          <input
            className="block border rounded p-3"
            type="date"
            name="to"
            defaultValue={q.to}
          />
        </label>
        <button className="bg-slate-900 text-white p-3 rounded">
          রিপোর্ট দেখুন
        </button>
        <Link className="underline" href="/admin/financial-report">
          সব সময়
        </Link>
      </form>
      {invalid ? (
        <p role="alert">
          সঠিক শুরু ও শেষ তারিখ দুটিই দিন; শুরু শেষের পরে হতে পারবে না।
        </p>
      ) : (
        report && (
          <>
            <p>
              সময়:{" "}
              {report.range
                ? `${report.range.from} থেকে ${report.range.to} (বাংলাদেশ সময়)`
                : "সংরক্ষিত সব সময়ের রসিদ"}
              । একই database snapshot: {report.asOf} (UTC)।
            </p>
            {!report.complete && (
              <div
                role="alert"
                className="rounded border border-amber-500 bg-amber-50 p-4"
              >
                <strong>অসম্পূর্ণ / যাচাই প্রয়োজন—এটি চূড়ান্ত মোট নয়।</strong>
                <p>
                  {report.truncated
                    ? `কোনো রেকর্ডের ধরন ${REPORT_SCAN_LIMIT}টির বেশি; সীমিত স্ক্যান হয়েছে। বড় ডেটার জন্য আলাদা reconciled aggregation প্রয়োজন।`
                    : "অবৈধ বা অসম্পূর্ণ রেকর্ড বাদ পড়েছে।"}
                </p>
                <p>
                  অযাচাইকৃত: বিক্রি {report.invalidSales}, রিফান্ড{" "}
                  {report.invalidRefunds}, উত্তোলন {report.invalidWithdrawals}।
                </p>
              </div>
            )}
            <section className="border rounded-xl p-5 space-y-3">
              <h2 className="text-xl font-bold">নির্বাচিত সময়ের আর্থিক ঘটনা</h2>
              <p>
                বিক্রি: {report.gross.count}টি ·{" "}
                {formatMoney(report.gross.amount)}
              </p>
              <p>
                বিক্রির বিক্রেতা অংশ: {formatMoney(report.gross.sellerAmount)} ·
                প্ল্যাটফর্ম অংশ: {formatMoney(report.gross.platformAmount)}
              </p>
              <p>
                রিফান্ড: {report.refunds.count}টি ·{" "}
                {formatMoney(report.refunds.amount)}
              </p>
              <p>
                ফেরত বিক্রেতা অংশ: {formatMoney(report.refunds.sellerAmount)} ·
                ফেরত প্ল্যাটফর্ম অংশ: {formatMoney(report.refunds.platformAmount)}
              </p>
              <p>
                বিক্রি − রিফান্ড: {formatMoney(report.adjusted.amount)} · বিক্রেতা
                অংশ {formatMoney(report.adjusted.sellerAmount)} · প্ল্যাটফর্ম অংশ{" "}
                {formatMoney(report.adjusted.platformAmount)}
              </p>
              <p>
                ম্যানুয়াল payout নথিভুক্ত: {report.payout.count}টি ·{" "}
                {formatMoney(report.payout.amount)}
              </p>
              <p>
                বাতিল উত্তোলনের হোল্ড ফেরত: {report.rejected.count}টি ·{" "}
                {formatMoney(report.rejected.amount)}
              </p>
            </section>
            <section className="border rounded-xl p-5 space-y-3">
              <h2 className="text-xl font-bold">
                snapshot-এর সময়ের বর্তমান হোল্ড — তারিখ ফিল্টার নয়
              </h2>
              <p>
                অপেক্ষমাণ উত্তোলন: {report.held.count}টি ·{" "}
                {formatMoney(report.held.amount)} · অ্যাডমিন দায়িত্বে{" "}
                {report.held.claimed}টি
              </p>
              <p>
                এটি ইতিমধ্যে ব্যবহারযোগ্য earnings থেকে আলাদা করে রাখা টাকা; আবার
                নতুন খরচ হিসেবে যোগ করবেন না।
              </p>
            </section>
            <p>
              স্ক্যান: বিক্রি {report.scanned.sales}, রিফান্ড{" "}
              {report.scanned.refunds}, উত্তোলন {report.scanned.withdrawals}। একই
              snapshot-এ সর্বোচ্চ প্রতি ধরনে {REPORT_SCAN_LIMIT}টি রেকর্ড হিসাব করা
              হয়।
            </p>
            <p>
              বিক্রি কেনার সময়, রিফান্ড ফেরতের সময়, payout/বাতিল নিষ্পত্তির সময়
              অনুযায়ী গণনা হয়। আগের সময়ের বিক্রি এই সময়ে রিফান্ড হলে বিক্রি − রিফান্ড
              ঋণাত্মক হতে পারে।
            </p>
            <p>
              এটি ওয়ালেটের সব ব্যালেন্স, রিচার্জ, তৈরি করার চার্জ, Send Money,
              ব্যাংক/bKash statement, provider-verified payment বা নিট লাভের
              রিপোর্ট নয়। PAID মানে অ্যাডমিন TrxID দিয়ে ম্যানুয়াল পেমেন্ট নথিভুক্ত
              করেছেন; বাইরের statement মিলিয়ে যাচাই করতে হবে। এই রিপোর্ট কোনো
              টাকা পাঠায় না বা ব্যালেন্স পরিবর্তন করে না।
            </p>
          </>
        )
      )}
      <nav className="flex gap-4 flex-wrap">
        <Link className="underline" href="/admin/marketplace-revenue">
          বিক্রির রসিদ
        </Link>
        <Link className="underline" href="/admin/marketplace-disputes">
          রিফান্ড / অভিযোগ
        </Link>
        <Link className="underline" href="/admin/withdrawals">
          হোল্ড / payout
        </Link>
      </nav>
    </main>
  );
}
