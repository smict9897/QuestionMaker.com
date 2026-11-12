"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
  ["Overview", "/admin", LayoutDashboard],
  ["Posts", "/admin/posts", Newspaper],
  ["New post", "/admin/blog", FilePlus2],
  ["Categories", "/admin/categories", FolderTree],
  ["Pages", "/admin/pages", FileText],
  ["Media", "/admin/media", Images],
  ["Notices", "/admin/notices", Megaphone],
  ["Materials & Videos", "/admin/pdf", FileUp],
  ["AI Questions", "/admin/ai", Sparkles],
  ["Question Bank", "/admin/questions", Library],
  ["Model Tests", "/admin/tests", ListChecks],
  ["Users", "/admin/users", Users],
  ["Site settings", "/admin/settings", Settings],
  ["Edit / Delete", "/admin/manage", Pencil],
] as const;

export default function AdminNav({
  name,
  role,
}: {
  name: string;
  role?: string;
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
