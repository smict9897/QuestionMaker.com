"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles, CheckCircle2, Download, ArrowRight, BookOpen } from "lucide-react";
import { PromoSettings } from "@/app/actions/promo";

const toBn = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function PromoBookPopup({ promo }: { promo: PromoSettings | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!promo || !promo.active) return;

    // ভিজিটর ঢোকার ১.৫ সেকেন্ড পর পপ-আপ ভেসে উঠবে
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [promo]);

  const handleClose = () => {
    setOpen(false);
  };

  if (!open || !promo || !promo.active) return null;

  const discountPercent = promo.pdfRegularPrice > promo.pdfPrice 
    ? Math.round(((promo.pdfRegularPrice - promo.pdfPrice) / promo.pdfRegularPrice) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* ক্লোজ বাটন */}
        <button
          onClick={handleClose}
          aria-label="Close offer"
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <X size={18} />
        </button>

        {/* টপ অফার হেডার */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-royal px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              <Sparkles size={11} className="text-amber-300 animate-pulse" /> {promo.badge || "বিশেষ অফার"}
            </span>
            <span className="text-xs text-blue-100 font-medium">ইনস্ট্যান্ট PDF ডাউনলোড</span>
          </div>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            
            {/* কভার ইমেজ (unoptimized সহ যাতে বেস৬৪ ইমেজ সরাসরি লোড হয়) */}
            <div className="relative h-36 w-24 sm:h-44 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-md border border-slate-200 flex items-center justify-center">
              {promo.coverUrl ? (
                <Image
                  src={promo.coverUrl}
                  alt={promo.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-blue-600 p-2 text-center">
                  <BookOpen size={36} />
                  <span className="text-[10px] font-bold mt-1">E-BOOK</span>
                </div>
              )}
            </div>

            {/* শিরোনাম ও বিবরণ */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {promo.title}
              </h2>
              {promo.subtitle && (
                <p className="text-xs text-blue-700 font-semibold mt-1">
                  {promo.subtitle}
                </p>
              )}
              {promo.description && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                  {promo.description}
                </p>
              )}

              <div className="mt-3 space-y-1 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>মোবাইল বা কম্পিউটারে সহজে পড়ার সুবিধা</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>পেমেন্ট করলেই তাৎক্ষণিক ডাউনলোড লিংক</span>
                </div>
              </div>
            </div>
          </div>

          {/* প্রাইস বক্স */}
          <div className="mt-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-900 block">
                📱 ডিজিটাল PDF সংস্করণ
              </span>
              <span className="text-[10px] text-emerald-700">ডেলিভারি চার্জ সম্পূর্ণ ফ্রি (৳০)</span>
            </div>
            <div className="text-right">
              {promo.pdfRegularPrice > promo.pdfPrice && (
                <span className="text-xs text-slate-400 line-through mr-1.5">
                  ৳{toBn(promo.pdfRegularPrice)}
                </span>
              )}
              <span className="text-xl font-black text-emerald-600">
                ৳{toBn(promo.pdfPrice)}
              </span>
              {discountPercent > 0 && (
                <span className="ml-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                  {toBn(discountPercent)}% ছাড়
                </span>
              )}
            </div>
          </div>

          {/* অ্যাকশন বাটন */}
          <div className="mt-4 space-y-2">
            <Link
              href="/order?type=pdf"
              onClick={handleClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition active:scale-98"
            >
              <Download size={16} />
              <span>ইনস্ট্যান্ট PDF সংগ্রহ করুন (৳{toBn(promo.pdfPrice)})</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
