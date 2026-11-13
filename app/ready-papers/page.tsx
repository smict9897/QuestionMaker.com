import Link from "next/link";
import { FilePlus2, ArrowUpRight } from "lucide-react";
import { readyLibrary } from "@/lib/ready-paper-data";
import "@/components/ready-papers/ready.css";
import LibraryBrowser from "@/components/ready-papers/library-browser";
import { libraryFilters } from "@/lib/ready-library-search";
import { readyPaperCatalog, readyGrade } from "@/lib/ready-paper-catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "রেডি প্রশ্নপত্র" };
export default async function ReadyLibrary({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    grade?: string;
    subject?: string;
    year?: string;
    source?: string;
    group?: string;
  }>;
}) {
  const p = await searchParams;
  const records = await readyLibrary().catch(() => null);
  const papers =
    records
      ?.map((r) => ({ ...r, grade: readyGrade(r.grade) }))
      .filter((r) => readyPaperCatalog.some((c) => c.grade === r.grade)) ??
    null;
  const initial = libraryFilters(p);
  if (initial.grade) initial.grade = readyGrade(initial.grade);
  const cards = papers?.map(
    ({
      id,
      title,
      kind,
      grade,
      subject,
      year,
      source,
      groupId,
      groupTitle,
      partIndex,
      pageStart,
      pageEnd,
    }) => ({
      id,
      title,
      kind,
      grade,
      subject,
      year,
      source,
      groupId,
      groupTitle,
      partIndex,
      pageStart,
      pageEnd,
    }),
  );
  return (
    <main className="rp-root">
      <section className="rp-hero">
        <span>READY PAPER STUDIO</span>
        <h1>রেডি প্রশ্নপত্র</h1>
        <Link href="/ready-papers/saved">আমার প্রশ্নপত্র ও ৳৯৯ প্যাকেজ →</Link>
        <p>
          প্রতি ১–৩ পৃষ্ঠা ৳৫ · মাসিক ৳৯৯-এ ৩০ ইউনিট · সেটআপের আগে মূল্য নিশ্চিত করুন।
        </p>
        <p>মূল প্রশ্নপত্র দেখুন, page বাছুন, নিজের header দিয়ে প্রিন্ট করুন।</p>
        <div className="rp-tabs">
          <Link href="/ready-papers?kind=BOARD">বোর্ড প্রশ্ন</Link>
          <Link href="/ready-papers?kind=SCHOOL">সুনামধন্য স্কুলের মডেল টেস্ট</Link>
          <Link href="/ready-papers/upload" className="rp-upload-cta">
            <FilePlus2 size={21} aria-hidden="true" />
            <span>নিজের PDF থেকে প্রশ্নপত্র বানান</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      {cards === undefined ? (
        <p role="alert">Library লোড হয়নি। আবার চেষ্টা করুন।</p>
      ) : (
        <LibraryBrowser
          key={JSON.stringify(initial)}
          papers={cards}
          catalog={readyPaperCatalog}
          initial={initial}
        />
      )}
    </main>
  );
}
