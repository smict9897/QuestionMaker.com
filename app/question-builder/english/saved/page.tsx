import Link from "next/link";
import { listEnglishPapers } from "@/app/actions/english-paper";
export const dynamic = "force-dynamic";
export default async function SavedEnglishPage() {
  const papers = await listEnglishPapers();
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">আমার English draft</h1>
      <Link href="/question-builder/english">নতুন প্রশ্নপত্র</Link>
      <p>
        সর্বোচ্চ ১০০টি ব্যক্তিগত draft দেখানো হচ্ছে। এগুলো public question
        bank-এ প্রকাশিত নয়।
      </p>
      {!papers.length && (
        <p>কোনো draft পাওয়া যায়নি। শিক্ষক/অ্যাডমিন হিসেবে লগইন নিশ্চিত করুন।</p>
      )}
      {papers.map((p) => (
        <div className="rounded border p-4" key={p.key}>
          <Link
            href={`/question-builder/build?englishKey=${encodeURIComponent(p.key)}`}
          >
            {p.name}
          </Link>
          <p>{p.updatedAt}</p>
        </div>
      ))}
    </main>
  );
}
