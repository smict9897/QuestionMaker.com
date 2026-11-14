"use client";
import { BRAND } from "@/lib/brand";

import React, { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Sparkles, 
  Wrench, 
  FileText, 
  GraduationCap, 
  Briefcase, 
  Trophy, 
  Calculator, 
  Image as ImageIcon, 
  Menu, 
  X, 
  ChevronDown,
  Search,
  User
} from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-gray-900 tracking-tight">
                  {BRAND.nameBn}
                </span>
                <span className="text-[10px] text-gray-500 font-medium -mt-1">
                  স্মার্ট এডুকেশন প্ল্যাটফর্ম
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            
            {/* মেনু ১: প্রস্তুতি ও রিসোর্স */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50/50 transition">
                <span>প্রস্তুতি ও রিসোর্স</span>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
              </button>
              <div className="absolute top-full left-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 hidden group-hover:block transition-all duration-200">
                <Link href="/notes" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">একাডেমিক নোট</div>
                    <div className="text-xs text-gray-500">৬ষ্ঠ থেকে ১২শ শ্রেণির বিষয়ভিত্তিক নোট</div>
                  </div>
                </Link>
                <Link href="/admission" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <GraduationCap className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">ভর্তি প্রস্তুতি</div>
                    <div className="text-xs text-gray-500">বিশ্ববিদ্যালয় ও মেডিকেল প্রশ্নব্যাংক</div>
                  </div>
                </Link>
                <Link href="/ntrca" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <Briefcase className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">NTRCA ও জব প্রস্তুতি</div>
                    <div className="text-xs text-gray-500">শিক্ষক নিবন্ধন ও সরকারি চাকরির গাইড</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* মেনু ২: প্র্যাকটিস ও AI কুইজ */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50/50 transition">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>অনুশীলন ও টেস্ট</span>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
              </button>
              <div className="absolute top-full left-0 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 hidden group-hover:block transition-all duration-200">
                <Link href="/ai-quiz" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-amber-50/40 transition">
                  <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">AI কুইজ জেনারেটর</div>
                    <div className="text-xs text-gray-500">যেকোনো টপিকের ইনস্ট্যান্ট কুইজ</div>
                  </div>
                </Link>
                <Link href="/model-test" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <Trophy className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">মডেল টেস্ট ও লিডারবোর্ড</div>
                    <div className="text-xs text-gray-500">লাইভ পরীক্ষা দিয়ে র্যাংক যাচাই</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* মেনু ৩: স্টুডেন্ট টুলস */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50/50 transition">
                <span>স্টুডেন্ট টুলস</span>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
              </button>
              <div className="absolute top-full left-0 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 hidden group-hover:block transition-all duration-200">
                <Link href="/tools/gpa-calculator" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <Calculator className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">GPA ও CGPA ক্যালকুলেটর</div>
                    <div className="text-xs text-gray-500">SSC, HSC ও অনার্স রেজাল্ট প্ল্যানার</div>
                  </div>
                </Link>
                <Link href="/tools/image-resizer" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <ImageIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">ছবি ও স্বাক্ষর রিসাইজার</div>
                    <div className="text-xs text-gray-500">জব ও ভর্তির ফরমের সঠিক সাইজ</div>
                  </div>
                </Link>
                <Link href="/tools/cover-page" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <FileText className="w-5 h-5 text-pink-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">কভার পেজ মেকার</div>
                    <div className="text-xs text-gray-500">অ্যাসাইনমেন্টের ফ্রন্ট পেজ তৈরি</div>
                  </div>
                </Link>
              </div>
            </div>

            <Link href="/ebooks" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50/50 transition">
              ই-বুক
            </Link>
            <Link href="/blog" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50/50 transition">
              ব্লগ
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition">
              <User className="w-4 h-4" />
              <span>লগইন</span>
            </Link>
            <Link href="/ai-quiz" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/25 rounded-xl transition">
              কুইজ শুরু করুন
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-6 space-y-3">
          <Link href="/notes" className="block px-3 py-2 text-base font-medium text-gray-800 rounded-lg hover:bg-gray-50">
            📚 একাডেমিক নোট
          </Link>
          <Link href="/admission" className="block px-3 py-2 text-base font-medium text-gray-800 rounded-lg hover:bg-gray-50">
            🎓 ভর্তি ও NTRCA প্রস্তুতি
          </Link>
          <Link href="/ai-quiz" className="block px-3 py-2 text-base font-medium text-blue-600 font-semibold bg-blue-50 rounded-lg">
            ⚡ AI কুইজ প্র্যাকটিস
          </Link>
          <Link href="/tools/gpa-calculator" className="block px-3 py-2 text-base font-medium text-gray-800 rounded-lg hover:bg-gray-50">
            🧮 স্টুডেন্ট টুলস (GPA/রিসাইজার)
          </Link>
          <Link href="/ebooks" className="block px-3 py-2 text-base font-medium text-gray-800 rounded-lg hover:bg-gray-50">
            📖 ই-বুক ও লাইব্রেরি
          </Link>
          
          <div className="pt-4 border-t border-gray-100 flex gap-2">
            <Link href="/login" className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50">
              লগইন
            </Link>
            <Link href="/register" className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600">
              সাইন আপ
            </Link>
          </div>
        </div>
      )}
    </header>
  );
                    }
