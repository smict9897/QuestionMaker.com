import Link from "next/link";
import type { PublicMarketPaper } from "@/lib/marketplace-catalog";
import { formatMoney } from "@/lib/wallet";
export default function MarketplaceCards({
  papers,
}: {
  papers: PublicMarketPaper[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {papers.map((p) => (
        <article
          key={p.id}
          className="min-w-0 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-indigo-700">{p.metadata.examType}</p>
          <h2 className="my-2 text-xl font-bold break-words">
            <Link href={`/marketplace/${p.id}`}>{p.metadata.title}</Link>
          </h2>
          <p>
            শ্রেণি {Number(p.metadata.grade).toLocaleString("bn-BD")} ·{" "}
            {p.metadata.subject}
          </p>
          <p className="text-sm break-words">
            {p.metadata.chapters.join(" · ")}
          </p>
          <p className="mt-3 font-bold">{formatMoney(p.metadata.pricePaisa)}</p>
          <Link
            href={`/teachers/${p.sellerTid}`}
            className="block mt-2 text-sm underline break-all"
          >
            বিক্রেতার প্রোফাইল · {p.sellerTid}
          </Link>
          <Link
            href={`/marketplace/${p.id}`}
            className="mt-4 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-white"
          >
            বিবরণ দেখুন
          </Link>
          <p className="mt-2 text-xs text-slate-600">কেনাকাটা এখনও চালু হয়নি।</p>
        </article>
      ))}
    </div>
  );
}
