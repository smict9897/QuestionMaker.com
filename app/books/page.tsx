import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getBooksCatalog, BookItem } from "@/app/actions/book";
import { Star, Search, Filter, ArrowUpDown, BookOpen, Gift, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const toBn = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const currentCat = params?.category || "all";
  const searchQ = params?.q || "";

  const books = await getBooksCatalog(currentCat, searchQ);

  const categories = [
    { label: "সকল বই", slug: "all" },
    { label: "এইচএসসি (HSC)", slug: "HSC" },
    { label: "এসএসসি (SSC)", slug: "SSC" },
    { label: "NTRCA শিক্ষক নিবন্ধন", slug: "NTRCA" },
    { label: "চাকরি ও বিসিএস", slug: "Job" },
    { label: "হ্যান্ডনোট ও শিট", slug: "Note" },
    { label: "ইংলিশ গ্রামার", slug: "English" },
  ];

  return (
    <main className="min-h-screen bg-[#f8f9fa] pb-24 font-sans text-slate-800">
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="mx-auto max-w-5xl">
          <form action="/books" method="GET" className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 focus-within:border-blue-600 focus-within:bg-white transition">
              <Search size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                name="q"
                defaultValue={searchQ}
                placeholder="বইয়ের নাম বা লেখকের নাম দিয়ে খুঁজুন..."
                className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar text-xs">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/books?category=${c.slug}${searchQ ? `&q=${searchQ}` : ""}`}
              className={`rounded-full px-3.5 py-1.5 font-bold transition shrink-0 ${
                currentCat === c.slug
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900">
              eBooks &amp; ডিজিটাল বইঘর
            </h1>
            <p className="text-[11px] text-slate-500">
              (মোট {toBn(books.length)}টি বই প্রদর্শিত হচ্ছে)
            </p>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 my-6">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">কোনো বই পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-2.5 transition hover:border-blue-500 hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-100 shadow-xs group-hover:scale-102 transition-transform duration-300">
                    <Image
                      src={book.coverUrl || "/placeholder.jpg"}
                      alt={book.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 220px"
                      className="object-cover"
                    />
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    {book.isFree ? (
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-0.5">
                        <Gift size={10} /> ফ্রি
                      </span>
                    ) : book.isAffiliate ? (
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-0.5">
                        <ExternalLink size={10} /> অ্যাফিলিয়েট
                      </span>
                    ) : (
                      <span className="rounded bg-[#0284c7] px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                        eBook
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      {book.category}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                    {book.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {book.author}
                  </p>

                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} fill="currentColor" />
                      ))}
                    </div>
                    <span>({toBn(book.reviewCount || 25)})</span>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2 flex items-baseline justify-between">
                  <div>
                    {book.isFree ? (
                      <span className="text-xs sm:text-sm font-black text-emerald-600">
                        ফ্রি PDF
                      </span>
                    ) : book.isAffiliate ? (
                      <span className="text-xs sm:text-sm font-black text-indigo-600">
                        রকমারি লিংক
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        TK. {toBn(book.pdfPrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                    দেখুন &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
