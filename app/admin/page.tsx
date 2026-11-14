import AdminAIGenerator from "@/components/admin-ai-generator";
import Link from "next/link";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export default async function Admin() {
  const pendingPayments = await db.packagePurchase.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="grid gap-4">
      <h1 className="sr-only">অ্যাডমিন ড্যাশবোর্ড</h1>
      <Link href="/admin/withdrawals" className="rounded-xl border p-4">
        বিক্রির আয় উত্তোলন অনুরোধ নিষ্পত্তি →
      </Link>
      <Link href="/admin/marketplace-revenue" className="rounded-xl border p-4">
        মার্কেটপ্লেস বিক্রির আর্থিক রসিদ →
      </Link>
      <Link
        href="/admin/marketplace-disputes"
        className="rounded-xl border p-4"
      >
        মার্কেটপ্লেস অভিযোগ / রিফান্ড →
      </Link>
      <Link href="/admin/wallet-limits" className="rounded-xl border p-4">
        Send Money ও উত্তোলনের সীমা নিয়ন্ত্রণ →
      </Link>
      <Link href="/admin/financial-report" className="rounded-xl border p-4">
        তারিখভিত্তিক / সর্বমোট আর্থিক রিপোর্ট →
      </Link>
      <Link href="/admin/support" className="rounded-xl border p-4">
        সহায়তা / গোপনীয়তা / কপিরাইট অনুরোধ →
      </Link>
      <Link href="/admin/pdf-storage" className="rounded-xl border p-4">
        PDF storage প্রস্তুতি ও পরীক্ষা →
      </Link>
      {/* 🔔 পেন্ডিং পেমেন্ট সতর্কতা */}
      {pendingPayments > 0 && (
        <Link
          href="/admin/package-requests"
          className="flex items-center justify-between rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          <span>⏳ {pendingPayments} টি পেমেন্ট অনুরোধ যাচাইয়ের অপেক্ষায়</span>
          <span className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white">
            দেখুন →
          </span>
        </Link>
      )}

      {/* 🎯 এআই জেনারেটর */}
      <AdminAIGenerator />
    </div>
  );
}

// ===== ফাইল শেষ =====
