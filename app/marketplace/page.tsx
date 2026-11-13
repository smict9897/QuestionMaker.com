import Link from "next/link";
import { marketCatalog } from "@/lib/marketplace-catalog-data";
import { filterMarketPapers } from "@/lib/marketplace-catalog";
import { MARKET_EXAM_TYPES } from "@/lib/marketplace-exam-types";
import MarketplaceCards from "@/components/marketplace-cards";
export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষকদের প্রশ্নপত্র মার্কেটপ্লেস" };
export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const text = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).slice(0, 200) : "";
  const filters = {
    grade: text("grade"),
    subject: text("subject"),
    chapter: text("chapter"),
    examType: text("examType"),
  };
  const { papers, next } = await marketCatalog(text("after"));
  const byGrade = filterMarketPapers(papers, { grade: filters.grade });
  const subjects = [...new Set(byGrade.map((p) => p.metadata.subject))].sort();
  const chapters = [
    ...new Set(
      filterMarketPapers(byGrade, { subject: filters.subject }).flatMap(
        (p) => p.metadata.chapters,
      ),
    ),
  ].sort();
  const filtered = filterMarketPapers(papers, filters);
  const nextQuery = new URLSearchParams({ ...filters, after: next || "" });
  return (
    <main className="mx-auto max-w-6xl p-5 space-y-6">
      <Link href="/">← হোম</Link>
      <h1 className="text-3xl font-bold">শিক্ষকদের প্রশ্নপত্র মার্কেটপ্লেস</h1>
      <p className="rounded-xl bg-amber-50 p-4">
        এখন অনুমোদিত প্রশ্নপত্রের পরিচিতি দেখা যাবে। সম্পূর্ণ প্রশ্নপত্রের নমুনা, কেনাকাটা
        ও আয় বণ্টন এখনও চালু হয়নি। কোনো টাকা কাটা হবে না।
      </p>
      <nav aria-label="শ্রেণি নির্বাচন" className="flex flex-wrap gap-2">
        <Link className="rounded border px-4 py-2" href="/marketplace">
          সব শ্রেণি
        </Link>
        {[6, 7, 8, 9, 10, 11].map((n) => (
          <Link
            key={n}
            aria-current={filters.grade === String(n) ? "page" : undefined}
            className={`rounded border px-4 py-2 ${filters.grade === String(n) ? "bg-indigo-700 text-white" : "bg-white"}`}
            href={`/marketplace?grade=${n}`}
          >
            {n.toLocaleString("bn-BD")} শ্রেণি
          </Link>
        ))}
      </nav>
      <form className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="grade" value={filters.grade} />
        <label>
          বিষয়
          <select
            name="subject"
            defaultValue={filters.subject}
            className="block w-full rounded border p-2"
          >
            <option value="">সব বিষয়</option>
            {[
              ...new Set([
                ...subjects,
                ...(filters.subject ? [filters.subject] : []),
              ]),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          অধ্যায়
          <select
            name="chapter"
            defaultValue={filters.chapter}
            className="block w-full rounded border p-2"
          >
            <option value="">সব অধ্যায়</option>
            {[
              ...new Set([
                ...chapters,
                ...(filters.chapter ? [filters.chapter] : []),
              ]),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          পরীক্ষার ধরন
          <select
            name="examType"
            defaultValue={filters.examType}
            className="block w-full rounded border p-2"
          >
            <option value="">সব পরীক্ষা</option>
            {MARKET_EXAM_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-indigo-700 p-2 text-white">খুঁজুন</button>
        <Link
          className="p-2 underline"
          href={
            filters.grade
              ? `/marketplace?grade=${filters.grade}`
              : "/marketplace"
          }
        >
          ফিল্টার মুছুন
        </Link>
      </form>
      {filters.grade && (
        <section>
          <h2 className="mb-3 text-xl font-bold">বিষয় বেছে নিন</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {subjects.map((subject) => (
              <Link
                className="rounded-xl border bg-indigo-50 p-4 font-bold"
                key={subject}
                href={`/marketplace?${new URLSearchParams({ grade: filters.grade, subject })}`}
              >
                {subject}
              </Link>
            ))}
          </div>
          {!subjects.length && <p>এই পাতায় এই শ্রেণির অনুমোদিত প্রশ্নপত্র নেই।</p>}
        </section>
      )}
      <MarketplaceCards papers={filtered} />
      {!filtered.length && (
        <p>এই পাতায় নির্বাচিত ফিল্টারে অনুমোদিত প্রশ্নপত্র পাওয়া যায়নি।</p>
      )}
      <p className="text-sm text-slate-600">
        ফিল্টার ও বিষয় তালিকা বর্তমান পাতার সর্বোচ্চ ২০০টি অনুমোদিত রেকর্ডে প্রযোজ্য।
      </p>
      {next && (
        <Link
          className="inline-block rounded border p-3"
          href={`/marketplace?${nextQuery}`}
        >
          পরবর্তী পাতা →
        </Link>
      )}
    </main>
  );
}
