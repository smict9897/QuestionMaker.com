import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { 
  CalendarDays, ArrowLeft, ExternalLink, ShieldCheck 
} from "lucide-react";
import { db } from "@/lib/db";
import SocialShareBar from "@/components/SocialShareBar"; // 👈 নতুন শেয়ার বাটন বার

export const dynamic = "force-dynamic";

function formatBanglaDate(date: Date) {
  const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
  return `${toBn(date.getDate())} ${months[date.getMonth()]}, ${toBn(date.getFullYear())}`;
}

// 🎯 ফেসবুক ও সোশ্যাল মিডিয়া প্রিভিউ (Open Graph & Twitter Cards)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
  });

  if (!post) return { title: "সংবাদ পাওয়া যায়নি | SaifulSir.com" };

  const siteUrl = process.env.SITE_URL || "https://saifulsir.com";
  const postUrl = `${siteUrl}/news/${post.slug || post.id}`;

  // ফেসবুকের জন্য শতভাগ সঠিক অ্যাবসলিউট ইমেজ লিংক
  let imageUrl = `${siteUrl}/logo.png`;
  if (post.coverUrl) {
    imageUrl = post.coverUrl.startsWith("http")
      ? post.coverUrl
      : `${siteUrl}${post.coverUrl.startsWith("/") ? "" : "/"}${post.coverUrl}`;
  }

  const description = post.metaDescription || post.excerpt || post.body.replace(/<[^>]*>?/gm, "").slice(0, 160);

  return {
    title: `${post.metaTitle || post.title} | শিক্ষা সংবাদ`,
    description,
    openGraph: {
      title: post.title,
      description,
      url: postUrl,
      siteName: "SaifulSir.com",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.coverAlt || post.title,
        },
      ],
      locale: "bn_BD",
      type: "article",
      publishedTime: post.createdAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SingleNewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await db.post.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
    include: { category: true },
  });

  if (!post) notFound();

  const currentUrl = `https://saifulsir.com/news/${post.slug || post.id}`;

  const relatedNews = await db.post.findMany({
    where: {
      published: true,
      category: { slug: "news" },
      id: { not: post.id },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return (
    <article className="min-h-screen bg-slate-50/60 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6">
        
        {/* ব্যাক বাটন ও ক্যাটাগরি */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
          <Link href="/news" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition">
            <ArrowLeft size={16} /> সকল সংবাদ
          </Link>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            শিক্ষা সংবাদ
          </span>
        </div>

        {/* শিরোনাম */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
          {post.title}
        </h1>

        {/* তারিখ ও অফিসিয়াল সোর্স */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200/80 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <CalendarDays size={14} className="text-blue-600" />
              প্রকাশ: {formatBanglaDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ShieldCheck size={14} /> অফিসিয়াল বিজ্ঞপ্তি সূত্র
            </span>
          </div>
        </div>

        {/* 🚀 খবরের উপরে সোশ্যাল মিডিয়া শেয়ার বাটন */}
        <div className="my-3">
          <SocialShareBar title={post.title} url={currentUrl} />
        </div>

        {/* কভার ইমেজ */}
        {post.coverUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-100 my-6 shadow-sm">
            <Image
              src={post.coverUrl}
              alt={post.coverAlt || post.title}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}

        {/* সংবাদের বডি */}
        <div className="prose prose-slate max-w-none bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs text-slate-800 leading-relaxed text-base sm:text-lg">
          <div dangerouslySetInnerHTML={{ __html: post.body }} />
        </div>

        {/* 🚀 খবরের নিচেও সোশ্যাল শেয়ার বাটন (যাতে পড়ার পর শেয়ার করতে পারে) */}
        <div className="my-6 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-700 mb-2">সংবাদটি ভালো লাগলে বন্ধুদের সাথে শেয়ার করুন:</div>
          <SocialShareBar title={post.title} url={currentUrl} />
        </div>

        {/* পিডিএফ ডাউনলোড বা সার্কুলার লিংক */}
        {post.downloadUrl && (
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-md">
            <div>
              <div className="text-sm font-bold">মূল বিজ্ঞপ্তির পিডিএফ বা সার্কুলার ফাইল</div>
              <div className="text-xs text-blue-100">সরাসরি অফিসিয়াল কপি ডাউনলোড করে দেখতে পারেন</div>
            </div>
            <a
              href={post.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition"
            >
              ডাউনলোড করুন <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* সম্পর্কিত খবর */}
        {relatedNews.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">আরও সংবাদ পড়ুন</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug ?? item.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-3 hover:border-blue-400 hover:shadow-xs transition flex flex-col justify-between"
                >
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    {formatBanglaDate(item.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </article>
  );
        }
