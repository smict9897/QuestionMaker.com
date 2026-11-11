"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  LogOut,
  Wallet,
  ArrowUpRight,
  Plus,
  FolderOpen,
  BookOpen,
  Monitor,
  UserRound,
  Home,
  Menu,
} from "lucide-react";
import BrandWordmark from "@/components/brand-wordmark";
import "./teacher-workspace.css";
export const workspaceLinks = [
  {
    label: "প্রশ্ন তৈরি",
    description: "শ্রেণি, বিষয় ও অধ্যায় বেছে শুরু করুন",
    href: "/#start",
    icon: Plus,
    tone: "green",
  },
  {
    label: "সংরক্ষিত প্রশ্নপত্র",
    description: "আপনার সেভ করা প্রশ্নপত্র খুলুন",
    href: "/question-builder/saved",
    icon: FolderOpen,
    tone: "blue",
  },
  {
    label: "English draft",
    description: "English full ও writing প্রশ্নপত্র",
    href: "/question-builder/english/saved",
    icon: BookOpen,
    tone: "purple",
  },
  {
    label: "অনলাইন পরীক্ষা",
    description: "মডেল টেস্টে অংশ নিন",
    href: "/model-test",
    icon: Monitor,
    tone: "amber",
  },
  {
    label: "আমার ওয়ালেট",
    description: "Balance, recharge ও লেনদেন",
    href: "/wallet",
    icon: Wallet,
    tone: "green",
  },
  {
    label: "আমার প্রোফাইল",
    description: "অ্যাকাউন্টের তথ্য দেখুন",
    href: "/profile",
    icon: UserRound,
    tone: "blue",
  },
];
export default function TeacherWorkspace({
  name,
  email,
  balance,
  admin,
  children,
}: {
  name: string;
  email: string;
  balance: string;
  admin: boolean;
  children: React.ReactNode;
}) {
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = () =>
      header.current
        ?.querySelectorAll("details[open]")
        .forEach((d) => d.removeAttribute("open"));
    const click = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const open = header.current?.querySelector("details[open]");
        open?.removeAttribute("open");
        (open?.querySelector("summary") as HTMLElement)?.focus();
      }
    };
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div className="tw-root">
      <header ref={header} className="tw-header">
        <Link href="/" className="tw-brand">
          <BrandWordmark name="QuestionMakerBd.com" />
        </Link>
        <nav aria-label="অ্যাকাউন্ট মেনু">
          <Link className="tw-recharge" href="/wallet#recharge">
            রিচার্জ
          </Link>
          <Link className="tw-balance" href="/wallet">
            <Wallet size={16} />
            <span>{admin ? "ADMIN" : balance}</span>
          </Link>
          <details className="tw-dropdown">
            <summary aria-label="অ্যাপস খুলুন">
              <LayoutGrid size={21} />
            </summary>
            <div className="tw-appmenu">
              <strong>QuestionMakerBd অ্যাপস</strong>
              <div>
                {workspaceLinks.map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <Icon size={23} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </details>
          <details className="tw-dropdown">
            <summary aria-label="প্রোফাইল মেনু">
              {name.slice(0, 1).toUpperCase() || "U"}
            </summary>
            <div className="tw-profile">
              <strong>{name}</strong>
              <small>{email}</small>
              <Link href="/dashboard">
                <Home size={17} />
                আমার ড্যাশবোর্ড
              </Link>
              {workspaceLinks.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
              <Link href="/packages">আমার প্যাকেজ</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut size={17} />
                লগআউট
              </button>
            </div>
          </details>
        </nav>
      </header>
      {children}
      <footer className="tw-footer">
        QuestionMakerBd.com · আপনার প্রশ্ন, আপনার প্রস্তুতি।{" "}
        <Link href="/contact-us">সহায়তা</Link>
      </footer>
    </div>
  );
}
export function WorkspaceCards() {
  return (
    <div className="tw-cards">
      {workspaceLinks.map(({ label, description, href, icon: Icon, tone }) => (
        <Link className={`tw-feature tw-${tone}`} key={href} href={href}>
          <span className="tw-icon">
            <Icon size={26} />
          </span>
          <h3>{label}</h3>
          <p>{description}</p>
          <span className="tw-go">
            খুলুন <ArrowUpRight size={18} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CopyPaymentNumber({ number }: { number: string }) {
  const [status, setStatus] = useState("");
  return (
    <span>
      <button
        className="tw-copy"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(number);
            setStatus("কপি হয়েছে");
          } catch {
            setStatus("কপি হয়নি—নম্বরটি হাতে কপি করুন");
          }
        }}
      >
        কপি
      </button>
      <span role="status" style={{ fontSize: ".8rem", display: "block" }}>
        {status}
      </span>
    </span>
  );
}
