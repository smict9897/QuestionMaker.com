// প্রশ্নোদয় — ড্যাশবোর্ড শেল (সাইডবার + টপবার + মোবাইলের নিচের বার)
import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  FileText,
  FolderOpen,
  HelpCircle,
  Newspaper,
  SlidersHorizontal,
  ShieldCheck,
  Radio,
  LogOut,
  Plus,
  Search,
  PenLine,
} from "lucide-react";
import { signOut } from "@/auth";
import "./dashboard.css";

type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "শিক্ষক",
  STUDENT: "শিক্ষার্থী",
  ADMIN: "অ্যাডমিন",
};

function sideMenu(role: string): NavItem[] {
  if (role === "TEACHER" || role === "ADMIN") {
    const items: NavItem[] = [
      { key: "home", href: "/dashboard", label: "হোম", icon: Home },
      { key: "build", href: "/question-builder", label: "প্রশ্নপত্র তৈরি", icon: FileText, badge: "AI" },
      { key: "saved", href: "/question-builder/saved", label: "আমার প্রশ্নপত্র", icon: FolderOpen },
      { key: "quiz", href: "/quiz", label: "কুইজ", icon: HelpCircle },
      { key: "blog", href: "/blog", label: "ব্লগ", icon: Newspaper },
      { key: "settings", href: "/dashboard?edit=1", label: "সেটিংস", icon: SlidersHorizontal },
    ];
    if (role === "ADMIN") {
      items.push({ key: "admin", href: "/admin", label: "অ্যাডমিন", icon: ShieldCheck });
    }
    return items;
  }
  return [
    { key: "home", href: "/dashboard", label: "হোম", icon: Home },
    { key: "live", href: "/model-test", label: "লাইভ মডেল টেস্ট", icon: Radio, badge: "LIVE" },
    { key: "blog", href: "/blog", label: "ব্লগ", icon: Newspaper },
    { key: "settings", href: "/profile", label: "সেটিংস", icon: SlidersHorizontal },
  ];
}

export default function DashShell({
  role,
  name,
  siteName,
  active = "home",
  children,
}: {
  role: string;
  name: string;
  siteName: string;
  active?: string;
  children: ReactNode;
}) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const isTeacher = role === "TEACHER" || role === "ADMIN";
  const roleLabel = ROLE_LABEL[role] ?? "সদস্য";
  const shownName = name.trim() || "সদস্য";
  const initial = Array.from(shownName)[0] ?? "স";
  const items = sideMenu(role);

  return (
    <div className="qd-root">
      {/* ডেস্কটপ সাইডবার */}
      <aside className="qd-side">
        <Link href="/" className="qd-logo">
          <i>
            <PenLine className="qd-ic" />
          </i>
          <span>{siteName}</span>
        </Link>

        <nav className="qd-nav" aria-label="ড্যাশবোর্ড মেনু">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link key={it.key} href={it.href} className={active === it.key ? "qd-on" : undefined}>
                <Icon className="qd-ic" />
                {it.label}
                {it.badge ? <span className="qd-nb">{it.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="qd-me">
          <div className="qd-av">{initial}</div>
          <div className="qd-me-t">
            <b>{shownName}</b>
            <small>{roleLabel}</small>
          </div>
          <form action={logout} style={{ marginLeft: "auto" }}>
            <button type="submit" className="qd-ib" aria-label="লগআউট" title="লগআউট">
              <LogOut className="qd-ic" />
            </button>
          </form>
        </div>
      </aside>

      {/* মূল অংশ */}
      <div className="qd-main">
        <header className="qd-top">
          <Link href="/" className="qd-mlogo">
            <i>
              <PenLine className="qd-ic" />
            </i>
            <span>{siteName}</span>
          </Link>

          <form action="/search" className="qd-srch" role="search">
            <Search className="qd-ic" />
            <input
              type="search"
              name="q"
              maxLength={80}
              placeholder="প্রশ্নপত্র, কুইজ বা ব্লগ খুঁজুন…"
              aria-label="খুঁজুন"
            />
          </form>

          <div className="qd-sp" />

          <form action={logout}>
            <button type="submit" className="qd-ib qd-logout-m" aria-label="লগআউট" title="লগআউট">
              <LogOut className="qd-ic" />
            </button>
          </form>

          <div className="qd-prof">
            <div className="qd-av">{initial}</div>
            <span>
              <b>{shownName}</b>
              <small>{roleLabel}</small>
            </span>
          </div>
        </header>

        <div className="qd-wrap">{children}</div>
      </div>

      {/* মোবাইলের নিচের বার */}
      <nav className="qd-bn" aria-label="মোবাইল মেনু">
        {isTeacher ? (
          <>
            <Link href="/dashboard" className={active === "home" ? "qd-on" : undefined}>
              <Home className="qd-ic" />
              হোম
            </Link>
            <Link href="/question-builder/saved">
              <FolderOpen className="qd-ic" />
              আমার
            </Link>
            <Link href="/question-builder" className="qd-fab">
              <i>
                <Plus className="qd-ic" />
              </i>
              তৈরি
            </Link>
            <Link href="/quiz">
              <HelpCircle className="qd-ic" />
              কুইজ
            </Link>
            <Link href="/blog">
              <Newspaper className="qd-ic" />
              ব্লগ
            </Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" className={active === "home" ? "qd-on" : undefined}>
              <Home className="qd-ic" />
              হোম
            </Link>
            <Link href="/model-test">
              <Radio className="qd-ic" />
              লাইভ টেস্ট
            </Link>
            <Link href="/blog">
              <Newspaper className="qd-ic" />
              ব্লগ
            </Link>
            <Link href="/profile">
              <SlidersHorizontal className="qd-ic" />
              সেটিংস
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}

// ===== ফাইল শেষ =====
