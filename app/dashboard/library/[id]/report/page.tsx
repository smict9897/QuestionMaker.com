import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { purchaseKey, validatePurchase } from "@/lib/marketplace-purchase";
import { disputeKey, parseDispute } from "@/lib/marketplace-refund";
import { MarketComplaint } from "@/components/marketplace-dispute";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "কেনা প্রশ্নপত্রের অভিযোগ",
  robots: { index: false, follow: false },
};
export default async function Report({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) notFound();
  const buyerId = (await auth())?.user?.id;
  if (!buyerId) redirect(`/login?next=/dashboard/library/${id}/report`);
  if (
    !(await db.user.findUnique({
      where: { id: buyerId },
      select: { id: true },
    }))
  )
    notFound();
  const row = await db.setting.findUnique({
    where: { key: purchaseKey(buyerId, id) },
  });
  if (!row) notFound();
  let copy;
  try {
    copy = validatePurchase(row.value, buyerId, id, true);
  } catch {
    notFound();
  }
  const key = disputeKey(buyerId, id),
    record = await db.setting.findUnique({ where: { key } });
  let d;
  try {
    d = record ? parseDispute(key, record.value) : null;
  } catch {
    throw Error("অভিযোগ যাচাই হয়নি।");
  }
  return (
    <main className="max-w-2xl mx-auto p-5 space-y-5">
      <Link href="/dashboard/library">← কেনা প্রশ্নপত্র</Link>
      <h1 className="text-2xl font-bold">{copy.title} — অভিযোগ</h1>
      <p>
        প্রতি কেনা কপিতে একটি অভিযোগ নথিভুক্ত করা যাবে। অ্যাডমিন কারণ যাচাই করবেন।
        স্বয়ংক্রিয় বা নির্দিষ্ট সময়ে রিফান্ডের নিশ্চয়তা নয়। রিফান্ড হলে সম্পূর্ণ মূল্য মূল
        উৎসে ফেরত যাবে, অনলাইন কপি বন্ধ হবে। আগের ডাউনলোড/প্রিন্ট ফিরিয়ে নেওয়া
        প্রযুক্তিগতভাবে সম্ভব নয়; সেগুলো আর ব্যবহার/বিতরণ করা যাবে না। অভিযোগে
        পাসওয়ার্ড বা পেমেন্টের গোপন তথ্য লিখবেন না।
      </p>
      {d ? (
        <section className="border rounded p-4 space-y-3">
          <p>
            অবস্থা:{" "}
            {d.status === "OPEN"
              ? "যাচাইয়ের অপেক্ষায়"
              : d.status === "REFUNDED"
                ? "রিফান্ড সম্পন্ন"
                : "রিফান্ড ছাড়া নিষ্পত্তি"}
          </p>
          <p className="whitespace-pre-wrap break-words">{d.reason}</p>
          {d.note && (
            <p className="whitespace-pre-wrap break-words">
              অ্যাডমিনের নোট: {d.note}
            </p>
          )}
        </section>
      ) : copy.refundedAt ? (
        <p>এই ক্রয় রিফান্ড হয়েছে।</p>
      ) : (
        <MarketComplaint paperId={id} />
      )}
    </main>
  );
}
