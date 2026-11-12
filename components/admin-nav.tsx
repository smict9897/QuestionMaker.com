"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  FileUp,
  ListChecks,
  Megaphone,
  Newspaper,
  Pencil,
  Globe,
  FilePlus2,
  FolderTree,
  Images,
  Settings,
  Users,
  FileText,
  Library,
} from "lucide-react";

const items = [
  ["ড্যাশবোর্ড", "/admin", LayoutDashboard],
  ["Question Bank", "/admin/questions", Library],
  ["Posts", "/admin/posts", Newspaper],
  ["New post", "/admin/blog", FilePlus2],
  ["Categories", "/admin/categories", FolderTree],
  ["Pages", "/admin/pages", FileText],
  ["Media", "/admin/media", Images],
  ["Notices", "/admin/notices", Megaphone],
  ["Materials & Videos", "/admin/pdf", FileUp],
  ["AI Questions", "/admin/ai", Sparkles],
  ["Model Tests", "/admin/tests", ListChecks],
  ["Users", "/admin/users", Users],
  ["Site settings", "/admin/settings", Settings],
  ["Edit / Delete", "/admin/manage", Pencil],
  ["পরিসংখ্যান / Overview", "/admin/overview", BarChart3],
] as const;

const menuGroups = [
  {
    title: "মডেল টেস্ট",
    links: [
      ["মডেল টেস্ট ম্যানেজ", "/admin/model-test"],
      ["পাবলিক ফিড", "/model-test"],
      ["Global Leaderboard", "/model-test/leaderboard"],
    ],
  },
  {
    title: "প্যাকেজ ও পেমেন্ট",
    links: [
      ["পেমেন্ট অনুরোধ", "/admin/package-requests"],
      ["Recharge যাচাই", "/admin/wallet"],
      ["প্যাকেজ ম্যানেজ", "/admin/packages"],
      ["পাবলিক প্যাকেজ পেজ", "/packages"],
    ],
  },
  {
    title: "কনটেন্ট ও সাইট",
    links: [
      ["ম্যাটেরিয়াল / PDF", "/admin/pdf"],
      ["হোমপেজ পপ-আপ", "/admin/promo"],
      ["হোম পেজ দেখুন", "/"],
      ["Instant Exam", "/exam"],
      ["Practice Test", "/tests"],
      ["প্রোফাইল ড্যাশবোর্ড", "/profile"],
    ],
  },
] as const;

export default function AdminNav({
  name,
  role,
  pendingPayments = 0,
}: {
  name: string;
  role?: string;
  pendingPayments?: number;
}) {
  const path = usePathname();
  const on = (h: string) =>
    h === "/admin" || h === "/admin/blog" ? path === h : path.startsWith(h);
  return (
    <aside className="shrink-0 lg:w-64">
      <div className="rounded-2xl bg-white p-3 shadow-sm lg:sticky lg:top-20">
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto lg:flex-col"
        >
          {items.map(([l, h, Icon]) => (
            <Link
              key={h}
              href={h}
              aria-current={on(h) ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${on(h) ? "bg-royal text-white shadow" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <Icon size={18} />
              {l}
            </Link>
          ))}
          {menuGroups
            .flatMap<readonly [string, string]>((group) => group.links)
            .filter(
              ([, href]) => !items.some(([, existing]) => existing === href),
            )
            .map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium ${path === href ? "bg-royal text-white shadow" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Globe size={18} />
                {label}
                {href === "/admin/package-requests" && pendingPayments > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                    {pendingPayments}
                  </span>
                )}
              </Link>
            ))}
        </nav>
        <div className="mt-3 hidden border-t border-slate-200 pt-3 lg:block">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Globe size={18} />
            View website
          </Link>
          <p className="mt-2 px-3 text-sm font-semibold">{name}</p>
          <p className="px-3 text-xs text-slate-500">
            {role === "ADMIN" ? "Administrator" : "Teacher"}
          </p>
        </div>
      </div>
    </aside>
  );
}
