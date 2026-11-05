"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight, BookOpen, Home, LayoutDashboard, LogIn, LogOut,
  Menu, X, ChevronDown, Sparkles, FileText, Trophy, Package, User
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

type U = { name?: string | null; role?: string } | null;

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

const navTree: NavItem[] = [
  { label: "প্রশ্নপত্র তৈরি", href: "/question-builder" },
  {
    label: "লাইভ মডেল টেস্ট",
    href: "/model-test",
    children: [
      { label: "📝 সব মডেল টেস্ট", href: "/model-test" },
      { label: "🏆 লিডারবোর্ড", href: "/model-test/leaderboard" },
    ],
  },
  { label: "কুইজ", href: "/quiz" },
  { label: "ব্লগ", href: "/blog" },
  { label: "প্যাকেজ", href: "/packages" },
];

function Announcement({ text }: { text: string }) {
  const key = `ann:${text}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem(key)) setHidden(true); } catch {} }, [key]);
  if (hidden || !text) return null;
  const close = () => { setHidden(true); try { sessionStorage.setItem(key, "1"); } catch {} };
  return (
    <div className="flex items-center gap-2 bg-gradient-to-r from-violet-700 via-fuchsia-700 to-pink-600 px-3 py-2 text-sm text-white">
      <span aria-hidden="true">🔔</span>
      <p className="min-w-0 flex-1 truncate">{text}</p>
      <Link href="/blog" className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900">
        এখনই দেখুন<ArrowRight size={14} />
      </Link>
      <button onClick={close} aria-label="Close notice" className="shrink-0 rounded p-1 hover:bg-white/10"><X size={18} /></button>
    </div>
  );
}

export default function SiteHeader({ user, logout, notice }: { user: U; logout: () => Promise<void>; notice: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const on = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));

  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open]);

  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors";
  const outline = `${btn} border border-violet-200 bg-white text-[#0d0926] hover:bg-violet-50 dark:bg-[#1a1247] dark:border-violet-900/60 dark:text-violet-50`;
  const solid = `${btn} bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-md shadow-fuchsia-500/25 hover:opacity-95 active:scale-[.98]`;

  const actions = (
    <>
      {isAdmin && (
        <Link href="/admin" className={outline}>
          <LayoutDashboard size={16} />অ্যাডমিন
        </Link>
      )}
      {user ? (
        <form action={logout}>
          <button className={`${outline} w-full`}><LogOut size={16} />লগআউট</button>
        </form>
      ) : (
        <Link href="/login" className={outline}><LogIn size={16} />লগইন</Link>
      )}
      <Link href="/question-builder" className={solid}><Sparkles size={16} />শুরু করুন</Link>
    </>
  );

  return (
    <>
      <Announcement text={notice} />
      <header className="sticky top-0 z-40 border-b border-violet-100/70 bg-white/90 backdrop-blur dark:bg-[#0d0926]/90 dark:border-violet-900/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="shrink-0 rounded-lg p-2 text-[#0d0926] hover:bg-violet-50 xl:hidden dark:text-violet-100 dark:hover:bg-violet-900/40"
            >
              <Menu size={22} />
            </button>

            <Link href="/" aria-label="প্রশ্নোদয় হোম" className="flex items-center gap-2 group shrink-0">
              <Image
                src="/logo.png"
                alt="প্রশ্নোদয় লোগো"
                width={44}
                height={44}
                priority
                unoptimized
                className="h-8 sm:h-9 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col justify-center">
                <span className="font-black text-sm sm:text-lg tracking-tight leading-none select-none">
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">প্রশ্নোদয়</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold text-violet-500 dark:text-violet-300 tracking-tight mt-0.5">
                  অনলাইনে প্রশ্নপত্র তৈরি করুন
                </span>
              </div>
            </Link>
          </div>

          <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 whitespace-nowrap xl:flex px-4">
            {navTree.map((item) => (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  aria-current={on(item.href) ? "page" : undefined}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                    on(item.href)
                      ? "bg-violet-50 text-violet-700 font-bold dark:bg-violet-900/40 dark:text-violet-100"
                      : "text-slate-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-900/40"
                  }`}
                >
                  {item.label}
                  {item.children && <ChevronDown size={14} className="text-violet-500 transition-transform group-hover:rotate-180" />}
                </Link>
                {item.children && (
                  <div className="absolute left-0 top-full hidden w-56 rounded-xl border border-violet-100 bg-white p-2 shadow-lg group-hover:block dark:bg-[#1a1247] dark:border-violet-900/50">
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-200 dark:hover:bg-violet-900/40"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/packages"
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white px-2.5 py-1.5 text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all border border-amber-400/40"
            >
              <Package size={14} className="text-amber-100" />
              <span>প্যাকেজ</span>
            </Link>
            <ThemeToggle />
            <div className="hidden items-center gap-2 xl:flex">{actions}</div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <div
        className={`fixed inset-0 z-50 xl:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl transition-transform dark:bg-[#0d0926] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3 dark:border-violet-900/50">
            <span className="font-bold text-violet-700 dark:text-violet-200">মেনু</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-violet-50 dark:hover:bg-violet-900/40">
              <X size={20} />
            </button>
          </div>
          <div className="p-2">
            {user && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-violet-50 p-3 dark:bg-violet-900/40">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-white font-bold">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{user.name ?? "ব্যবহারকারী"}</div>
                  <div className="text-xs text-violet-500 dark:text-violet-300">{isAdmin ? "অ্যাডমিন" : user.role === "STUDENT" ? "শিক্ষার্থী" : "শিক্ষক"}</div>
                </div>
              </div>
            )}
            {navTree.map((item) =>
              item.children ? (
                <div key={item.href} className="mt-1">
                  <div className="px-3 pt-2 text-xs font-bold uppercase tracking-wide text-violet-500 dark:text-violet-300">{item.label}</div>
                  {item.children.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-900/40"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-900/40"
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="mt-3 grid gap-2 border-t border-violet-100 pt-3 dark:border-violet-900/50">
              {actions}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

// ===== ফাইল শেষ =====
