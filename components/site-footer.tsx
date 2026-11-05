import Image from "next/image";
import Link from "next/link";
import { 
  Mail, Phone, FileText, PenTool, 
  Users, LayoutDashboard, Trophy, LogIn, 
  Home, Sparkles, ShieldCheck, HelpCircle, Library
} from "lucide-react";

import { db } from "@/lib/db";
import { getSite } from "@/lib/site";

type Item = [label: string, href: string, icon: any];

const groups: { title: string; items: Item[] }[] = [
  { 
    title: "প্রশ্নোদয়", 
    items: [
      ["হোম", "/", Home],
      ["প্রশ্নপত্র তৈরি", "/question-builder", PenTool],
      ["কুইজ", "/quiz", Sparkles],
      ["ব্লগ", "/blog", FileText],
      ["প্যাকেজ", "/packages", Library],
    ] 
  },
  { 
    title: "শিক্ষক ও শিক্ষার্থী", 
    items: [
      ["ড্যাশবোর্ড", "/dashboard", LayoutDashboard],
      ["লাইভ মডেল টেস্ট", "/model-test", Sparkles],
      ["লিডারবোর্ড", "/model-test/leaderboard", Trophy],
      ["লগইন", "/login", LogIn],
    ] 
  },
  { 
    title: "নীতিমালা ও সহায়তা", 
    items: [
      ["আমাদের সম্পর্কে", "/about-us", Users],
      ["যোগাযোগ", "/contact-us", Mail],
      ["গোপনীয়তা নীতি", "/privacy", ShieldCheck],
      ["ব্যবহারের শর্ত", "/terms", FileText],
      ["দাবিত্যাগ", "/disclaimer", HelpCircle],
      ["DMCA নীতি", "/dmca", FileText],
    ] 
  },
];

export default async function SiteFooter() {
  const [site, pages] = await Promise.all([
    getSite(),
    db.page.findMany({ select: { slug: true, title: true }, orderBy: { title: "asc" } }).catch(() => [])
  ]);

  const { contact, footerText } = site;
  const links = site.social ? site.social.filter((s) => s.url) : [];

  return (
    <footer className="mt-20 bg-[#0d0926] pb-24 text-sm text-slate-300 md:pb-0 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-14">
        {/* Top Info Section */}
        <div className="mb-12 pb-10 border-b border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-md">
            <Link href="/" aria-label="প্রশ্নোদয় হোম" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#f43f8e] shadow-lg shadow-fuchsia-500/20 group-hover:scale-105 transition-transform">
                <PenTool size={20} className="text-white" />
              </div>
              <div>
                <span className="block font-extrabold text-xl text-white tracking-tight">প্রশ্নোদয়</span>
                <span className="block text-[10px] text-violet-400 font-semibold mt-0.5">অনলাইনে প্রশ্নপত্র তৈরি করুন</span>
              </div>
            </Link>
            <p className="mt-4 text-slate-400 leading-relaxed text-sm">
              {footerText || "অনলাইনে প্রশ্নপত্র তৈরি, কুইজ ও লাইভ মডেল টেস্টের এক ঠিকানা।"}
            </p>
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {links.map(({ name, icon: Icon, url }) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 border border-white/10 transition hover:scale-105 hover:bg-white/10 hover:text-white">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Links Grid Sections */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-5">
                <h2 className="text-base font-bold text-white tracking-wide">{g.title}</h2>
                <span className="mt-2 block h-1 w-8 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
              </div>

              <ul className="space-y-3">
                {g.items.map(([label, href, Icon]) => (
                  <li key={href}>
                    <Link 
                      href={href} 
                      className="group flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/5 group-hover:bg-violet-500/20 group-hover:border-violet-500/30 group-hover:text-violet-300 transition-all">
                        <Icon size={15} />
                      </span>
                      <span className="font-medium">{label}</span>
                    </Link>
                  </li>
                ))}
                
                {/* Custom Pages from DB (if any) */}
                {g.title === "নীতিমালা ও সহায়তা" && Array.isArray(pages) && pages.map((pg) => (
                  <li key={pg.slug}>
                    <Link 
                      href={`/p/${pg.slug}`} 
                      className="group flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/5 group-hover:bg-violet-500/20 group-hover:border-violet-500/30 group-hover:text-violet-300 transition-all">
                        <FileText size={15} />
                      </span>
                      <span className="font-medium truncate">{pg.title}</span>
                    </Link>
                  </li>
                ))}

                {/* Contact Info */}
                {g.title === "নীতিমালা ও সহায়তা" && contact?.phone && (
                  <li>
                    <a 
                      href={`tel:${contact.phone}`} 
                      className="group flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                        <Phone size={15} />
                      </span>
                      <span className="font-medium">{contact.phone}</span>
                    </a>
                  </li>
                )}

                {g.title === "নীতিমালা ও সহায়তা" && contact?.email && (
                  <li>
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="group flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:bg-sky-500/20 transition-all">
                        <Mail size={15} />
                      </span>
                      <span className="font-medium">{contact.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} প্রশ্নোদয়। সর্বস্বত্ব সংরক্ষিত।
      </div>
    </footer>
  );
}

// ===== ফাইল শেষ =====
