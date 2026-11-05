"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight, LogIn, LogOut, Menu, X, ChevronDown, 
  Sparkles, PenTool, Package, User, LayoutDashboard
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
      <Link href="/blog" className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 transition-transform hover:scale-105">
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

  const btnBase = "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 active:scale-95";
  const btnOutline = `${btnBase} border border-violet-200 bg-white/50 text-[#16112e] hover:bg-violet-50 hover:border-violet-300 backdrop-blur-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10`;
  const btnSolid = `${btnBase} bg-gradient-to-r from-[#7c3aed] to-[#f43f8e] text-white shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50`;

  const actions = (
    <>
      {isAdmin && (
        <Link href="/admin" className={btnOutline}>
          <LayoutDashboard size={16} />অ্যাডমিন
        </Link>
      )}
      {user ? (
        <form action={logout}>
          <button className={`${btnOutline} w-full`}><LogOut size={16} />লগআউট</button>
        </form>
      ) : (
        <Link href="/login" className={btnOutline}><LogIn size={16} />লগইন</Link>
      )}
      <Link href="/question-builder" className={btnSolid}><Sparkles size={16} />শুরু করুন</Link>
    </>
  );

  return (
    <>
      <Announcement text={notice} />
      {/* Glassmorphism Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/80 backdrop-blur-xl dark:bg-[#0d0926]/80 dark:border-white/10 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
          
          {/* Brand Logo Area */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="shrink-0 rounded-lg p-2 text-[#16112e] hover:bg-violet-50 xl:hidden dark:text-white dark:hover:bg-white/10"
            >
              <Menu size={22} />
            </button>

            <Link href="/" aria-label="প্রশ্নোদয় হোম" className="flex items-center gap-2.5 group shrink-0">
              {/* হোমপেজের মতো গ্লাসমরফিক লোগো আইকন */}
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#f43f8e] shadow-md shadow-fuchsia-500/20 group-hover:scale-105 transition-transform">
                <PenTool size={18} className="text-white sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-[#16112e] dark:text-white">
                  প্রশ্নোদয়
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-violet-500 dark:text-violet-300 mt-0.5">
                  অনলাইনে প্রশ্নপত্র তৈরি করুন
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-2 whitespace-nowrap xl:flex px-4">
            {navTree.map((item) => (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  aria-current={on(item.href) ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    on(item.href)
                      ? "bg-violet-50 text-[#7c3aed] dark:bg-violet-900/30 dark:text-violet-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#16112e] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.children && <ChevronDown size={14} className={`transition-transform group-hover:rotate-180 ${on(item.href) ? "text-[#7c3aed]" : "text-slate-400"}`} />}
                </Link>
                {item.children && (
                  <div className="absolute left-0 top-full mt-1 hidden w-56 rounded-xl border border-slate-100 bg-white/95 backdrop-blur-xl p-2 shadow-xl group-hover:block dark:bg-[#1a1247] dark:border-white/10">
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-[#7c3aed] dark:text-slate-300 dark:hover:bg-violet-900/40 dark:hover:text-white transition-colors"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/packages"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-3 py-1.5 text-xs font-bold hover:bg-amber-200 transition-colors border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50"
            >
              <Package size={14} />
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
          className={`absolute inset-0 bg-[#0d0926]/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl transition-transform dark:bg-[#0d0926] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-white/10">
            <span className="font-bold text-lg text-[#16112e] dark:text-white">মেনু</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
          <div className="p-3">
            {user && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 border border-violet-100 dark:from-violet-900/20 dark:to-fuchsia-900/20 dark:border-white/5">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#f43f8e] text-white font-bold shadow-md">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#16112e] dark:text-white">{user.name ?? "ব্যবহারকারী"}</div>
                  <div className="text-xs font-medium text-[#7c3aed] dark:text-violet-300">
                    {isAdmin ? "অ্যাডমিন" : user.role === "STUDENT" ? "শিক্ষার্থী" : "শিক্ষক"}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              {navTree.map((item) =>
                item.children ? (
                  <div key={item.href} className="mt-2">
                    <div className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</div>
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-[#7c3aed] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
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
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-violet-50 hover:text-[#7c3aed] dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
              {actions}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

// ===== ফাইল শেষ =====
