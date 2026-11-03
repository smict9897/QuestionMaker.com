"use client";

import React, { useState } from "react";
import { 
  Facebook, 
  Send, 
  Twitter, 
  Link2, 
  Check, 
  Share2 
} from "lucide-react";

interface ShareProps {
  title: string;
  url: string;
}

export default function SocialShareBar({ title, url }: ShareProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  // ১. লিংক কপি করার ফাংশন
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  // ২. মোবাইলের নেটিভ শেয়ার শিট (Facebook, Messenger, IMO ইত্যাদি সবই পাবে)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err) {
        // ইউজার ক্যানসেল করলে কিছু করার দরকার নেই
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
        <Share2 size={14} /> শেয়ার করুন:
      </span>

      {/* 🔵 Facebook Share Button */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="flex items-center gap-1.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
      >
        <Facebook size={14} fill="currentColor" />
        <span>Facebook</span>
      </a>

      {/* 🟢 WhatsApp Share Button */}
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
      >
        <span className="font-bold">WhatsApp</span>
      </a>

      {/* ✈️ Telegram Share Button */}
      <a
        href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Telegram"
        className="flex items-center gap-1.5 rounded-xl bg-[#229ED9] hover:bg-[#1f8fc4] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
      >
        <Send size={13} />
        <span>Telegram</span>
      </a>

      {/* 🐦 Twitter / X Share Button */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
      >
        <Twitter size={13} fill="currentColor" />
        <span>X</span>
      </a>

      {/* 🔗 লিংক কপি বাটন */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
          copied
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-600" />
            <span>কপি হয়েছে!</span>
          </>
        ) : (
          <>
            <Link2 size={14} />
            <span>লিংক কপি</span>
          </>
        )}
      </button>

      {/* 📱 মোবাইলের জন্য অল-ইন-ওয়ান শেয়ার বাটন */}
      <button
        onClick={handleNativeShare}
        className="flex sm:hidden items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
      >
        <Share2 size={13} />
        <span>অন্যান্য অ্যাপ</span>
      </button>
    </div>
  );
}
