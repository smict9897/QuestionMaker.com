"use client";

import "@/components/chapter-selector.css";
import ChapterSelector from "@/components/chapter-selector";
import { useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  House,
  CirclePlus,
  FolderOpen,
  Tags,
  Gift,
  BookMarked,
  Wallet,
  ListChecks,
  Monitor,
  Phone,
  Menu,
  X,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { homeCategoryMatches } from "@/lib/home-data";
import { NCTB_CLASSES } from "@/lib/nctb-data";

type Row = { category: string; subject: string; topic: string; count: number };
const groups = [
  {
    title: "মূল মেনু",
    links: [
      ["হোম", "/", House],
      ["আমার ড্যাশবোর্ড", "/dashboard", LayoutDashboard],
      ["এখনই প্রশ্ন তৈরি করুন", "#start", CirclePlus],
      ["সংরক্ষিত প্রশ্নপত্র", "/question-builder/saved", FolderOpen],
      ["মূল্য তালিকা", "#pricing", Tags],
      ["আমাদের সুবিধা", "#features", Gift],
      ["ব্যবহার নির্দেশিকা", "#how", BookMarked],
    ],
  },
  {
    title: "ব্যবস্থাপনা",
    links: [
      ["আমার প্যাকেজ", "/packages", Wallet],
      ["আমার প্রোফাইল", "/profile", ListChecks],
    ],
  },
  {
    title: "শিক্ষার্থী ও পরীক্ষা",
    links: [
      ["অনলাইন পরীক্ষা", "/model-test", Monitor],
      ["কুইজ", "/quiz", CheckCircle2],
      ["লিডারবোর্ড", "/model-test/leaderboard", GraduationCap],
      ["ব্লগ ও আর্টিকেল", "/blog", BookOpen],
    ],
  },
  { title: "সহায়তা কেন্দ্র", links: [["যোগাযোগ", "/contact-us", Phone]] },
] as const;

export function WorkspaceShell({
  siteName,
  name,
  children,
}: {
  siteName: string;
  name?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="hm-topbar">
        <div className="hm-brand">
          <button
            className="hm-menu"
            aria-label={open ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            aria-expanded={open}
            aria-controls="home-sidebar"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link href="/">
            {siteName}
            <span>প্রশ্ন তৈরির স্মার্ট সমাধান</span>
          </Link>
        </div>
        <div className="hm-account">
          {name && <span>{name}</span>}
          <Link className="hm-outline" href={name ? "/dashboard" : "/login"}>
            {name ? "ড্যাশবোর্ড" : "লগইন"}
          </Link>
          {name ? (
            <button
              className="hm-primary"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              লগআউট
            </button>
          ) : (
            <Link className="hm-primary" href="/register">
              নিবন্ধন
            </Link>
          )}
        </div>
      </header>
      <div className="hm-layout">
        {open && (
          <button
            className="hm-scrim"
            aria-label="মেনু বন্ধ করুন"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          id="home-sidebar"
          className={`hm-sidebar ${open ? "is-open" : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <nav aria-label="হোমপেজ মেনু">
            {groups.map((group) => (
              <div className="hm-nav-group" key={group.title}>
                <p>{group.title}</p>
                {group.links.map(([label, href, Icon]) => (
                  <Link
                    className={href === "/" ? "active" : ""}
                    aria-current={href === "/" ? "page" : undefined}
                    href={href}
                    key={href}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={17} />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <div className="hm-content">{children}</div>
      </div>
    </>
  );
}

export function HomeStarter({
  rows,
  unavailable,
}: {
  rows: Row[];
  unavailable: boolean;
}) {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const classes = useMemo(
    () =>
      Array.from(
        new Set([
          ...Array.from({ length: 8 }, (_, i) => `Class ${i + 1}`),
          "SSC",
          "HSC",
          "Admission",
          "Job",
          ...NCTB_CLASSES.map((c) => c.class),
          ...rows.map((r) => r.category),
        ]),
      ),
    [rows],
  );
  const curriculum = NCTB_CLASSES.find((c) =>
    homeCategoryMatches(category, c.class),
  );
  const subjects = Array.from(
    new Set([
      ...(curriculum?.subjects.map((s) => s.name) || []),
      ...rows
        .filter((r) => homeCategoryMatches(category, r.category))
        .map((r) => r.subject),
    ]),
  );
  const data = curriculum?.subjects.find((s) => s.name === subject);
  const topics = Array.from(
    new Set([
      ...(data?.chapters || []),
      ...(data?.subCategories?.flatMap((g) => g.topics) || []),
      ...rows
        .filter(
          (r) =>
            homeCategoryMatches(category, r.category) && r.subject === subject,
        )
        .map((r) => r.topic),
    ]),
  ).filter(Boolean);
  const count = rows
    .filter(
      (r) =>
        homeCategoryMatches(category, r.category) &&
        r.subject === subject &&
        (!selectedTopics.length || selectedTopics.includes(r.topic)),
    )
    .reduce((n, r) => n + r.count, 0);
  return (
    <section id="start" className="hm-panel hm-starter">
      <div className="hm-panel-title">
        <h1>১ মিনিটে প্রশ্ন তৈরি করুন</h1>
        <p>
          শ্রেণি, বিষয় ও অধ্যায় নির্বাচন করে আপনার প্রয়োজন অনুযায়ী প্রশ্ন
          তৈরি শুরু করুন।
        </p>
      </div>
      <form action="/question-builder/prepare" className="hm-start-form">
        <label>
          শ্রেণি <b>*</b>
          <select
            required
            name="category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubject("");
              setSelectedTopics([]);
            }}
          >
            <option value="">শ্রেণি নির্বাচন করুন</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          বিষয় <b>*</b>
          <select
            required
            disabled={!category}
            name="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSelectedTopics([]);
            }}
          >
            <option value="">বিষয় নির্বাচন করুন</option>
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <ChapterSelector topics={topics} value={selectedTopics} onChange={setSelectedTopics} disabled={!subject}/>
        <p className="hm-info" role="status">
          ⓘ{" "}
          {unavailable
            ? "প্রশ্নসংখ্যা এখন লোড করা যায়নি। বিষয় বেছে প্রশ্ন খুঁজতে পারেন।"
            : subject
              ? `নির্বাচিত অংশে ${count.toLocaleString("bn-BD")}টি প্রশ্ন পাওয়া গেছে।`
              : "এখনও কোনো বিষয় নির্বাচন করা হয়নি।"}
        </p>
        <button className="hm-primary hm-next" disabled={!category || !subject}>
          পরবর্তী <ArrowRight size={18} />
        </button>
        <div className="hm-promo">
          <div>
            <small>নিজের মতো সাজিয়ে নিন</small>
            <h3>পরিপাটি প্রশ্নপত্র</h3>
            <span>সহজে · দ্রুত · অনলাইনে</span>
          </div>
          <Printer size={50} />
        </div>
      </form>
    </section>
  );
}

const guide = [
  {
    icon: GraduationCap,
    title: "শ্রেণি, বিষয় ও অধ্যায় বাছুন",
    body: "প্রয়োজনীয় শ্রেণি ও বিষয় নির্বাচন করুন। নির্দিষ্ট অধ্যায় অথবা সম্পূর্ণ বিষয় থেকে প্রশ্ন খুঁজুন।",
  },
  {
    icon: CheckCircle2,
    title: "প্রশ্ন নির্বাচন করুন",
    body: "প্রশ্নব্যাংক থেকে MCQ, সৃজনশীল ও সংক্ষিপ্ত প্রশ্ন বেছে আপনার প্রশ্নপত্রে যোগ করুন।",
  },
  {
    icon: BookMarked,
    title: "নিজের মতো প্রশ্নপত্র সাজান",
    body: "Smart ও Dynamic Header, প্রতিষ্ঠানের নাম, সময়, পূর্ণমান, ফন্ট এবং কলাম ঠিক করুন।",
  },
  {
    icon: Printer,
    title: "সংরক্ষণ, প্রিন্ট ও PDF",
    body: "প্রিভিউ দেখে প্রশ্নপত্র সংরক্ষণ করুন। ব্রাউজারের প্রিন্ট অপশন থেকে প্রিন্ট বা PDF নিন।",
  },
];
export function HomeGuide() {
  const [step, setStep] = useState(0);
  const item = guide[step];
  const Icon = item.icon;
  return (
    <section id="how" className="hm-guide">
      <div className="hm-section-title">
        <h2>কয়েক ধাপেই প্রশ্নপত্র তৈরি</h2>
        <p>ধাপে ধাপে জেনে নিন পুরো কাজের ধারা।</p>
      </div>
      <div className="hm-panel hm-guide-card">
        <button
          aria-label="আগের ধাপ"
          className="hm-guide-prev"
          onClick={() => setStep((step + guide.length - 1) % guide.length)}
        >
          <ChevronLeft />
        </button>
        <div aria-live="polite">
          <div className="hm-step-icon">
            <Icon />
            <span>{(step + 1).toLocaleString("bn-BD")}</span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <a href="#start" className="hm-primary">
            এখনই শুরু করুন <ArrowRight size={17} />
          </a>
        </div>
        <button
          className="hm-guide-next"
          aria-label="পরের ধাপ"
          onClick={() => setStep((step + 1) % guide.length)}
        >
          <ChevronRight />
        </button>
        <div className="hm-dots">
          {guide.map((s, i) => (
            <button
              key={s.title}
              aria-label={`ধাপ ${i + 1}`}
              aria-pressed={i === step}
              className={i === step ? "active" : ""}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
