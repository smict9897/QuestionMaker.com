import Link from "next/link";
import type { PublicMarketPaper } from "@/lib/marketplace-catalog";
import { formatMoney } from "@/lib/wallet";
import { MARKET_GRADE_NAMES } from "@/lib/marketplace-school-catalog";
import "./marketplace-home.css";
export default function MarketplacePaperCards({
  papers,
}: {
  papers: PublicMarketPaper[];
}) {
  return (
    <div className="pb-paper-grid">
      {papers.map((p) => (
        <article key={p.id} className="pb-paper-card">
          <Link
            href={`/marketplace/${p.id}`}
            className="pb-paper-sheet"
            aria-label={`${p.metadata.title} — বিবরণ দেখুন`}
          >
            <span className="pb-paper-label">প্রশ্নপত্রের পরিচিতি</span>
            <span className="pb-paper-subject">{p.metadata.subject}</span>
            <span className="pb-paper-exam">{p.metadata.examType}</span>
            <span className="pb-paper-rule" />
            <strong className="pb-paper-title">{p.metadata.title}</strong>
            <span className="pb-paper-class">
              {MARKET_GRADE_NAMES[p.metadata.grade]} শ্রেণি
            </span>
            <span className="pb-paper-chapters">
              {p.metadata.chapters.join(" · ")}
            </span>
            <span className="pb-paper-disclaimer">
              বিবরণে সীমিত পাঠ্য নমুনা দেখুন
            </span>
          </Link>
          <div className="pb-paper-info">
            <strong>{formatMoney(p.metadata.pricePaisa)}</strong>
            <Link href={`/marketplace/${p.id}`}>বিবরণ দেখুন ↗</Link>
          </div>
          <Link className="pb-seller" href={`/teachers/${p.sellerTid}`}>
            বিক্রেতার প্রোফাইল →
          </Link>
        </article>
      ))}
    </div>
  );
}
