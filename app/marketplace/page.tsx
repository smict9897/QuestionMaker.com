import MarketplaceFilters from "@/components/marketplace-filters";
import Link from "next/link";
import { marketCatalogPage } from "@/lib/marketplace-catalog-data";
import { MARKET_EXAM_TYPES } from "@/lib/marketplace-exam-types";
import {
  MARKET_GRADES,
  MARKET_GRADE_NAMES,
  marketSubjects,
  marketChapters,
} from "@/lib/marketplace-school-catalog";
import MarketplacePaperCards from "@/components/marketplace-paper-cards";
import "@/components/marketplace-home.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "প্রশ্নবুক — আরও প্রশ্নপত্র" };
export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const text = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).slice(0, 200) : "";
  const grade = MARKET_GRADES.includes(
    text("grade") as (typeof MARKET_GRADES)[number],
  )
    ? text("grade")
    : "";
  const filters = {
    grade,
    subject: text("subject"),
    chapter: text("chapter"),
    examType: MARKET_EXAM_TYPES.includes(
      text("examType") as (typeof MARKET_EXAM_TYPES)[number],
    )
      ? text("examType")
      : "",
  };
  const result = await marketCatalogPage(filters, text("after"));
  return (
    <div className="pb-home">
      <nav className="pb-class-nav" aria-label="শ্রেণি নির্বাচন">
        <Link href="/marketplace" aria-current={!grade ? "page" : undefined}>
          সব শ্রেণি
        </Link>
        {MARKET_GRADES.map((n) => (
          <Link
            key={n}
            href={`/marketplace?grade=${n}`}
            aria-current={grade === n ? "page" : undefined}
          >
            {MARKET_GRADE_NAMES[n]} শ্রেণি
          </Link>
        ))}
      </nav>
      <header className="pb-home-intro">
        <div>
          <span className="pb-eyebrow">প্রশ্নবুক · প্রশ্নপত্র ক্যাটালগ</span>
          <h1>
            {filters.subject ||
              (grade
                ? `${MARKET_GRADE_NAMES[grade]} শ্রেণির প্রশ্নপত্র`
                : "সকল প্রশ্নপত্র")}
          </h1>
          <p>বিষয়, অধ্যায় ও পরীক্ষার ধরন বেছে প্রশ্নপত্র খুঁজুন।</p>
        </div>
        <Link className="pb-profile-link" href={`/?grade=${grade || "6"}`}>
          বিষয়ভিত্তিক হোম ↗
        </Link>
      </header>
      <MarketplaceFilters key={JSON.stringify(filters)} initial={filters} />
      <p className="pb-notice">
        শুধু অনুমোদিত প্রশ্নপত্র দেখানো হচ্ছে। বিবরণ থেকে মূল্য নিশ্চিত করে কিনতে পারবেন।
        বিবরণে উপলব্ধ সীমিত পাঠ্য নমুনা যাচাই করুন।
      </p>
      <MarketplacePaperCards papers={result.papers} />
      {!result.papers.length && (
        <p className="pb-empty">
          নির্বাচিত ফিল্টারে এই অনুসন্ধানের অংশে কোনো অনুমোদিত প্রশ্নপত্র পাওয়া যায়নি।
        </p>
      )}
      <div className="pb-more-row">
        {result.next && (
          <Link
            className="pb-more"
            href={`/marketplace?${new URLSearchParams({ ...filters, after: result.next })}`}
          >
            পরবর্তী প্রশ্নপত্র দেখুন →
          </Link>
        )}
      </div>
      {result.scanned >= 1000 && (
        <p className="pb-notice">
          একবারে সর্বোচ্চ ১,০০০টি সম্ভাব্য রেকর্ড যাচাই করা হয়। পরবর্তী অংশ দেখতে
          পরবর্তী পাতা খুলুন।
        </p>
      )}
    </div>
  );
}
