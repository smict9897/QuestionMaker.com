import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { 
  CalendarDays, Clock, ArrowRight, Flame, 
  Search, Newspaper, Tag 
} from "lucide-react";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "শিক্ষা সংবাদ | সর্বশেষ শিক্ষা ও পরীক্ষার খবর",
  description: "স্কুল, কলেজ, বিশ্ববিদ্যালয় ভর্তি, এইচএসসি, এসএসসি, NTRCA ও শিক্ষা মন্ত্রণালয়ের সর্বশেষ নোটিশ ও সংবাদ।",
};

function formatBanglaDate(date: Date) {
  const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();

  return `${toBn(d)} ${m}, ${toBn(y)}`;
}

function isRecent(date: Date) {
  const diffInHours = (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60);
  return diffInHours <= 48;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  // ⚡ ডাটাবেজে 'news' ক্যাটাগরি না থাকলে নিজে থেকেই তৈরি হয়ে যাবে
  await db.category.upsert({
    where: { slug: "news" },
    update: {},
    create: {
      name: "শিক্ষা সংবাদ",
      slug: "news",
    },
  }).catch(() => null);

  const params = await searchParams;
  const query = params?.q || "";
  const tagFilter = params?.tag || "";

  // 'news' ক্যাটাগরির সমস্ত সংবাদ ফেচ করা
  const allNews = await db.post.findMany({
    where: {
      published: true,
      category: { slug: "news" },
      ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
      ...(tagFilter ? { tags: { has: tagFilter } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { category: true },
    take: 30,
  }).catch(() => []);

  const [leadNews, ...otherNews] = allNews;

  const popularTags = ["ভর্তি", "NTRCA", "রুটিন", "রেজাল্ট", "বৃত্তি", "এইচএসসি", "এসএসসি", "বোর্ড নোটিশ"];

  return (
    <main className="min-h-screen bg-slate-50/60 pb-16">
      
      {/* 🔴 আপডেট বার */}
      <div className="border-b border-rose-100 bg-rose-50/70 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs text-rose-900">
          <span className="flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 font-bold text-white uppercase text-[10px] tracking-wide animate-pulse">
            <Flame size={12} /> আপডেট
          </span>
          <p className="min-w-0 flex-1 truncate font-medium">
            {leadNews ? leadNews.title : "শিক্ষা বিষয়ক নির্ভরযোগ্য সংবাদ ও সরকারি প্রজ্ঞাপন এক ঠিকানায়"}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        
        {/* হেডার ও সার্চ বার */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <Newspaper className="text-blue-600" size={30} />
              শিক্ষা সংবাদ ও বিজ্ঞপ্তি
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              মন্ত্রণালয়, মাধ্যমিক ও উচ্চশিক্ষা অধিদপ্তর, শিক্ষা বোর্ড ও NTRCA-এর নির্ভরযোগ্য তথ্য
            </p>
          </div>

          <form action="/news" method="GET" className="flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-1.5 shadow-sm w-full md:w-72">
            <Search size={16} className="text-slate-400 mr-2 shrink-0" />
            <input
              name="q"
              defaultValue={query}
              placeholder="সংবাদ খুঁজুন..."
              className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-800"
            />
          </form>
        </div>

        {/* ফিল্টার ট্যাগ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 no-scrollbar text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 shrink-0">
            <Tag size={13} /> টপিক:
          </span>
          <Link
            href="/news"
            className={`rounded-full px-3 py-1 font-semibold transition shrink-0 ${
              !tagFilter ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            সকল
          </Link>
          {popularTags.map((tag) => (
            <Link
              key={tag}
              href={`/news?tag=${encodeURIComponent(tag)}`}
              className={`rounded-full px-3 py-1 font-semibold transition shrink-0 ${
                tagFilter === tag
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>

        {allNews.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <Newspaper size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold">কোনো সংবাদ পাওয়া যায়নি।</p>
            <p className="text-xs text-slate-400 mt-1">অ্যাডমিন প্যানেল থেকে &apos;শিক্ষা সংবাদ&apos; ক্যাটাগরিতে পোস্ট যোগ করুন।</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 🌟 প্রধান বড় সংবাদ (Lead Story) */}
            {leadNews && !tagFilter && !query && (
              <Link
                href={`/news/${leadNews.slug ?? leadNews.id}`}
                className="group grid gap-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md md:grid-cols-12 items-center"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-100 md:col-span-7">
                  <Image
                    src={leadNews.coverUrl || "/placeholder.jpg"}
                    alt={leadNews.coverAlt || leadNews.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {isRecent(leadNews.createdAt) && (
                    <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> নতুন সংবাদ
                    </span>
                  )}
                </div>

                <div className="md:col-span-5 flex flex-col justify-between h-full py-1">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 tracking-wide uppercase">
                      প্রধান সংবাদ
                    </span>
                    <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition">
                      {leadNews.title}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
                      {leadNews.metaDescription || leadNews.excerpt || leadNews.body.slice(0, 150)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} /> {formatBanglaDate(leadNews.createdAt)}
                    </span>
                    <span className="font-bold text-blue-600 flex items-center gap-1">
                      বিস্তারিত পড়ুন <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* 📰 অন্যান্য খবরের গ্রিড */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(query || tagFilter ? allNews : otherNews).map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug ?? item.id}`}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-blue-400 hover:shadow-md"
                >
                  <div>
                    <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
                      <Image
                        src={item.coverUrl || "/placeholder.jpg"}
                        alt={item.coverAlt || item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 350px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {isRecent(item.createdAt) && (
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                          নতুন
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug group-hover:text-blue-600 transition line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.metaDescription || item.excerpt || item.body.slice(0, 90)}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} /> {formatBanglaDate(item.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Clock size={12} /> {Math.max(1, Math.ceil(item.body.length / 900))} মি. পাঠ
                    </span>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
