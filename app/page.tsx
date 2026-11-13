import type { Metadata } from "next";
import Link from "next/link";
import { marketCatalogPage } from "@/lib/marketplace-catalog-data";
import {
  marketGrade,
  marketSubjects,
  MARKET_GRADES,
  MARKET_GRADE_NAMES,
} from "@/lib/marketplace-school-catalog";
import MarketplacePaperCards from "@/components/marketplace-paper-cards";
import "@/components/marketplace-home.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "প্রশ্নবুক — শ্রেণি ও বিষয়ভিত্তিক প্রশ্নপত্র" },
  description:
    "ষষ্ঠ থেকে দ্বাদশ শ্রেণির বিষয় ও পরীক্ষার ধরন অনুযায়ী শিক্ষকদের অনুমোদিত প্রশ্নপত্রের পরিচিতি দেখুন।",
};
export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ grade?: string }>;
}) {
  const grade = marketGrade((await searchParams)?.grade);
  const books = marketSubjects(grade);
  const sections: {
    subject: string;
    papers: Awaited<ReturnType<typeof marketCatalogPage>>["papers"];
    unavailable: boolean;
  }[] = [];
  // Keep connection pressure bounded on the current database plan.
  for (let i = 0; i < books.length; i += 4) {
    const batch = await Promise.all(
      books.slice(i, i + 4).map(async (book) => {
        try {
          const result = await marketCatalogPage(
            { grade, subject: book.name },
            undefined,
            6,
          );
          return {
            subject: book.name,
            papers: result.papers,
            unavailable: false,
          };
        } catch {
          return { subject: book.name, papers: [], unavailable: true };
        }
      }),
    );
    sections.push(...batch);
  }
  return (
    <div className="pb-home">
      <nav className="pb-class-nav" aria-label="শ্রেণি নির্বাচন">
        {MARKET_GRADES.map((n) => (
          <Link
            key={n}
            href={`/?grade=${n}`}
            aria-current={grade === n ? "page" : undefined}
          >
            {MARKET_GRADE_NAMES[n]} শ্রেণি
          </Link>
        ))}
      </nav>
      <header className="pb-home-intro">
        <div>
          <span className="pb-eyebrow">PROSHNOBOOK.COM</span>
          <h1>{MARKET_GRADE_NAMES[grade]} শ্রেণির প্রশ্নপত্র</h1>
          <p>
            আপনার বিষয় বেছে নিন। অর্ধ বার্ষিক, বার্ষিক ও নির্বাচনী পরীক্ষার অনুমোদিত
            প্রশ্নপত্রের পরিচিতি এক জায়গায়।
          </p>
        </div>
        <Link href="/dashboard" className="pb-profile-link">
          আমার প্রোফাইল ↗
        </Link>
      </header>
      <p className="pb-notice">
        ক্যাটালগ প্রস্তুতি পর্যায়ে আছে। কার্ডগুলো A4-অনুপাতের পরিচিতি—মূল প্রশ্নপত্রের নমুনা
        নয়। কেনাকাটা এখনও চালু হয়নি; কোনো টাকা কাটা হবে না।
      </p>
      {sections.map((section, index) => (
        <section
          className="pb-subject"
          key={section.subject}
          aria-labelledby={`subject-${index}`}
        >
          <div className="pb-subject-heading">
            <span className="pb-subject-no">
              {(index + 1).toLocaleString("bn-BD")}
            </span>
            <h2 id={`subject-${index}`}>{section.subject}</h2>
          </div>
          {section.papers.length ? (
            <MarketplacePaperCards papers={section.papers} />
          ) : (
            <p className="pb-empty">
              {section.unavailable
                ? "প্রশ্নপত্র লোড করা যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।"
                : "এই বিষয়ে এখনও অনুমোদিত প্রশ্নপত্র প্রকাশিত হয়নি।"}
            </p>
          )}
          <div className="pb-more-row">
            <Link
              className="pb-more"
              href={`/marketplace?${new URLSearchParams({ grade, subject: section.subject })}`}
            >
              আরও প্রশ্ন দেখুন →
            </Link>
          </div>
        </section>
      ))}
      <footer className="pb-home-footer">
        <span>
          বিষয় ও অধ্যায়ের তালিকা ওয়েবসাইটের বিদ্যমান পাঠ্যসূচি অনুযায়ী। নবম–দশম ও
          একাদশ–দ্বাদশে যৌথ বইয়ের তালিকা ব্যবহৃত।
        </span>
        <Link href={`/marketplace?grade=${grade}`}>
          এই শ্রেণির সব অনুমোদিত প্রশ্নপত্র →
        </Link>
      </footer>
    </div>
  );
}
