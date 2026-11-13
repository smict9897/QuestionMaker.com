import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MARKET_PREFIX } from "@/lib/marketplace";
import { publicMarketPaper } from "@/lib/marketplace-catalog";
import { formatMoney } from "@/lib/wallet";
export const dynamic = "force-dynamic";
export const metadata = { title: "প্রশ্নপত্রের বিবরণ" };
export default async function MarketDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) notFound();
  const row = await db.setting.findUnique({
    where: { key: MARKET_PREFIX + id },
  });
  const paper = row && publicMarketPaper(row.value);
  if (!paper || paper.id !== id) notFound();
  return (
    <main className="mx-auto max-w-3xl p-5 space-y-4">
      <Link href="/marketplace">← মার্কেটপ্লেস</Link>
      <p className="text-indigo-700">{paper.metadata.examType}</p>
      <h1 className="text-3xl font-bold">{paper.metadata.title}</h1>
      <p>
        শ্রেণি {Number(paper.metadata.grade).toLocaleString("bn-BD")} ·{" "}
        {paper.metadata.subject}
      </p>
      <p>{paper.metadata.chapters.join(" · ")}</p>
      <p className="whitespace-pre-wrap break-words">
        {paper.metadata.description}
      </p>
      <p className="text-2xl font-bold">
        {formatMoney(paper.metadata.pricePaisa)}
      </p>
      <Link href={`/teachers/${paper.sellerTid}`} className="block underline">
        বিক্রেতার প্রোফাইল · {paper.sellerTid}
      </Link>
      <div className="rounded-xl bg-amber-50 p-4">
        <p>
          কেনাকাটা ও সম্পূর্ণ প্রশ্নপত্রের প্রিভিউ এখনও চালু হয়নি। এখন কোনো টাকা কাটা
          হবে না।
        </p>
      </div>
    </main>
  );
}
