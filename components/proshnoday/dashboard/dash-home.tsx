// প্রশ্নোদয় — ড্যাশবোর্ডের হোম অংশ (ব্যানার, দ্রুত শুরু, শ্রেণি, প্যানেল)
import type { CSSProperties } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Plus,
  FolderOpen,
  FileText,
  HelpCircle,
  Newspaper,
  Package,
  SlidersHorizontal,
  ArrowRight,
  Radio,
  Trophy,
  ListChecks,
  PenLine,
  Type,
} from "lucide-react";

export type DashPost = {
  id: string;
  slug: string | null;
  title: string;
  category: string | null;
};

const CLASSES: { big: string; small: string }[] = [
  { big: "১ম", small: "শ্রেণি" },
  { big: "২য়", small: "শ্রেণি" },
  { big: "৩য়", small: "শ্রেণি" },
  { big: "৪র্থ", small: "শ্রেণি" },
  { big: "৫ম", small: "শ্রেণি" },
  { big: "৬ষ্ঠ", small: "শ্রেণি" },
  { big: "৭ম", small: "শ্রেণি" },
  { big: "৮ম", small: "শ্রেণি" },
  { big: "৯ম–১০ম", small: "SSC" },
  { big: "১১শ–১২শ", small: "HSC" },
];

const PALETTE: { c: string; f: string }[] = [
  { c: "#ede7ff", f: "#6d3fd1" },
  { c: "#ffe4ef", f: "#c2255c" },
  { c: "#fff3d6", f: "#b7791f" },
  { c: "#dff6fb", f: "#0e7490" },
  { c: "#dcf7e8", f: "#15803d" },
];

function grad(a: string, b: string) {
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function iconStyle(a: string, b: string, shadow: string): CSSProperties {
  return { background: grad(a, b), ["--sh" as string]: shadow } as CSSProperties;
}

type Card = {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  from: string;
  to: string;
  shadow: string;
};

function QuickCard({ c }: { c: Card }) {
  const Icon = c.icon;
  return (
    <Link href={c.href} className="qd-qc">
      <span className="qd-qi" style={iconStyle(c.from, c.to, c.shadow)}>
        <Icon className="qd-ic" />
      </span>
      <b>{c.title}</b>
      <small>{c.text}</small>
      <span className="qd-go">
        <ArrowRight className="qd-ic" />
      </span>
    </Link>
  );
}

function Row({
  href,
  title,
  text,
  icon: Icon,
  from,
  to,
}: {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  from: string;
  to: string;
}) {
  return (
    <Link href={href} className="qd-row">
      <span className="qd-ri" style={{ background: grad(from, to) }}>
        <Icon className="qd-ic" />
      </span>
      <span className="qd-rt">
        <b>{title}</b>
        <small>{text}</small>
      </span>
      <ArrowRight className="qd-ic qd-arr" />
    </Link>
  );
}

export default function DashHome({
  role,
  greet,
  questionCount,
  posts,
}: {
  role: string;
  greet: string;
  questionCount: number;
  posts: DashPost[];
}) {
  const isTeacher = role === "TEACHER" || role === "ADMIN";
  const classHref = isTeacher ? "/question-builder" : "/model-test";
  const settingsHref = isTeacher ? "/dashboard?edit=1" : "/profile";
  const countBn = questionCount.toLocaleString("bn-BD");

  const common: Card[] = [
    {
      href: "/quiz",
      title: "কুইজ",
      text: "বিষয়ভিত্তিক কুইজ দিয়ে প্রস্তুতি যাচাই করুন",
      icon: HelpCircle,
      from: "#fbbf24",
      to: "#f97316",
      shadow: "rgba(249,115,22,.35)",
    },
    {
      href: "/blog",
      title: "ব্লগ",
      text: "পড়াশোনা ও পরীক্ষার কাজের লেখা",
      icon: Newspaper,
      from: "#34d399",
      to: "#059669",
      shadow: "rgba(5,150,105,.35)",
    },
    {
      href: "/packages",
      title: "প্যাকেজ",
      text: "আপনার প্রয়োজন অনুযায়ী প্যাকেজ দেখুন ও বেছে নিন",
      icon: Package,
      from: "#fb923c",
      to: "#ea580c",
      shadow: "rgba(234,88,12,.35)",
    },
    {
      href: settingsHref,
      title: "সেটিংস",
      text: "প্রোফাইল ও অ্যাকাউন্ট",
      icon: SlidersHorizontal,
      from: "#8b5cf6",
      to: "#3b82f6",
      shadow: "rgba(99,102,241,.35)",
    },
  ];

  const cards: Card[] = isTeacher
    ? [
        {
          href: "/question-builder/saved",
          title: "আমার প্রশ্নপত্র",
          text: "সংরক্ষিত প্রশ্নপত্র দেখুন ও আবার ডাউনলোড করুন",
          icon: FolderOpen,
          from: "#22d3ee",
          to: "#3b82f6",
          shadow: "rgba(59,130,246,.35)",
        },
        ...common,
      ]
    : [
        {
          href: "/model-test/leaderboard",
          title: "লিডারবোর্ড",
          text: "লাইভ টেস্টে কে কেমন করল দেখুন",
          icon: Trophy,
          from: "#22d3ee",
          to: "#3b82f6",
          shadow: "rgba(59,130,246,.35)",
        },
        ...common,
      ];

  return (
    <>
      {/* ব্যানার */}
      <section className={isTeacher ? "qd-hero qd-rise" : "qd-hero qd-solo qd-rise"}>
        <div>
          <div className="qd-pills">
            <span className="qd-hi">
              <Sparkles className="qd-ic" />
              {greet} {isTeacher ? "প্রিয় শিক্ষক" : "প্রিয় শিক্ষার্থী"}
            </span>
          </div>

          {isTeacher ? (
            <h1>
              আজ কী <em>প্রশ্ন তৈরি</em> করবেন?
            </h1>
          ) : (
            <h1>
              আজ কোন বিষয়ে <em>প্রস্তুতি</em> নেবেন?
            </h1>
          )}

          <p>
            {isTeacher
              ? "শ্রেণি ও বিষয় বেছে নিন — MCQ, সৃজনশীল আর সংক্ষিপ্ত প্রশ্ন নিয়ে মিনিটেই পূর্ণ প্রশ্নপত্র তৈরি হবে।"
              : "লাইভ মডেল টেস্টে অংশ নিন, কুইজ দিন আর ব্লগ পড়ে নিজেকে তৈরি রাখুন।"}
          </p>

          <div className="qd-cta">
            {isTeacher ? (
              <>
                <Link href="/question-builder" className="qd-btn qd-btn-p">
                  <Plus className="qd-ic" />
                  নতুন প্রশ্নপত্র
                </Link>
                <Link href="/question-builder/saved" className="qd-btn qd-btn-g">
                  <FolderOpen className="qd-ic" />
                  আমার প্রশ্নপত্র
                </Link>
              </>
            ) : (
              <>
                <Link href="/model-test" className="qd-btn qd-btn-p">
                  <Radio className="qd-ic" />
                  লাইভ টেস্ট দেখুন
                </Link>
                <Link href="/blog" className="qd-btn qd-btn-g">
                  <Newspaper className="qd-ic" />
                  ব্লগ পড়ুন
                </Link>
              </>
            )}
          </div>
        </div>

        {isTeacher ? (
          <div className="qd-mock" aria-hidden="true">
            <div className="qd-mh">প্রশ্নপত্র</div>
            <div className="qd-ln qd-ln-t" style={{ ["--d" as string]: "0s" } as CSSProperties} />
            <div className="qd-ln qd-ln-h" style={{ ["--d" as string]: ".3s" } as CSSProperties} />
            <div className="qd-ln" style={{ ["--d" as string]: ".6s" } as CSSProperties} />
            <div className="qd-ln" style={{ ["--d" as string]: ".9s" } as CSSProperties} />
            <div className="qd-ln" style={{ ["--d" as string]: "1.2s" } as CSSProperties} />
            <div className="qd-ln" style={{ ["--d" as string]: "1.5s" } as CSSProperties} />
            <span className="qd-chip">PDF প্রস্তুত</span>
          </div>
        ) : null}
      </section>

      {/* দ্রুত শুরু */}
      <div className="qd-sh">
        <h2>দ্রুত শুরু</h2>
        <p>এক ট্যাপেই যেখানে যেতে চান</p>
      </div>

      <div className="qd-qa qd-rise">
        {isTeacher ? (
          <Link href="/question-builder" className="qd-qc qd-feat">
            <span className="qd-qi" style={{ background: "rgba(255,255,255,.2)" }}>
              <FileText className="qd-ic" />
            </span>
            <b>প্রশ্নপত্র তৈরি</b>
            <small>শ্রেণি, বিষয় ও অধ্যায় বেছে মিনিটেই পূর্ণাঙ্গ প্রশ্নপত্র তৈরি করুন</small>
            <span className="qd-fb">
              শুরু করুন
              <ArrowRight className="qd-ic" />
            </span>
          </Link>
        ) : (
          <Link href="/model-test" className="qd-qc qd-feat">
            <span className="qd-qi" style={{ background: "rgba(255,255,255,.2)" }}>
              <Radio className="qd-ic" />
            </span>
            <span className="qd-lv">LIVE</span>
            <b>লাইভ মডেল টেস্ট</b>
            <small>নির্দিষ্ট সময়ে সবার সাথে পরীক্ষা দিন, ফল ও র‍্যাঙ্ক দেখুন</small>
            <span className="qd-fb">
              দেখুন
              <ArrowRight className="qd-ic" />
            </span>
          </Link>
        )}

        {cards.map((c) => (
          <QuickCard key={c.href + c.title} c={c} />
        ))}
      </div>

      {/* শ্রেণি */}
      <div className="qd-sh">
        <h2>{isTeacher ? "শ্রেণি বেছে প্রশ্নপত্র শুরু করুন" : "শ্রেণি বেছে লাইভ টেস্ট দেখুন"}</h2>
        <p>শ্রেণি বেছে নিন</p>
      </div>

      <div className="qd-cls qd-rise">
        {CLASSES.map((c, i) => {
          const p = PALETTE[i % PALETTE.length];
          return (
            <Link
              key={c.big}
              href={classHref}
              className="qd-cc"
              style={{ ["--c" as string]: p.c, ["--f" as string]: p.f } as CSSProperties}
            >
              <b>{c.big}</b>
              <small>{c.small}</small>
            </Link>
          );
        })}
      </div>

      {/* প্যানেল */}
      {isTeacher ? (
        <div className="qd-two qd-rise">
          <div className="qd-pn">
            <div className="qd-sh">
              <h2>সাম্প্রতিক প্রশ্নপত্র</h2>
            </div>
            <Row
              href="/question-builder/saved"
              title="সেভ করা প্রশ্নপত্র দেখুন"
              text="আগে বানানো প্রশ্নপত্র খুলুন ও আবার ডাউনলোড করুন"
              icon={FolderOpen}
              from="#22d3ee"
              to="#3b82f6"
            />
            <p className="qd-note">প্রশ্নব্যাংকে এখন {countBn} টি অনুমোদিত প্রশ্ন আছে।</p>
          </div>

          <div className="qd-pn">
            <div className="qd-sh">
              <h2>প্রশ্নের ধরন</h2>
            </div>
            <Row
              href="/question-builder"
              title="MCQ"
              text="বহুনির্বাচনি প্রশ্ন"
              icon={ListChecks}
              from="#8b5cf6"
              to="#6366f1"
            />
            <Row
              href="/question-builder"
              title="সৃজনশীল"
              text="উদ্দীপকসহ ৩/৪ অংশের প্রশ্ন"
              icon={PenLine}
              from="#ec4899"
              to="#f43f5e"
            />
            <Row
              href="/question-builder"
              title="সংক্ষিপ্ত"
              text="সংক্ষিপ্ত উত্তরের প্রশ্ন"
              icon={Type}
              from="#fbbf24"
              to="#f97316"
            />
          </div>
        </div>
      ) : (
        <div className={posts.length > 0 ? "qd-two qd-rise" : "qd-two qd-one qd-rise"}>
          <div className="qd-pn">
            <div className="qd-sh">
              <h2>লাইভ মডেল টেস্ট</h2>
            </div>
            <Row
              href="/model-test"
              title="লাইভ টেস্ট দেখুন"
              text="চলমান ও আসন্ন পরীক্ষাগুলো এখানে পাবেন"
              icon={Radio}
              from="#8b5cf6"
              to="#6366f1"
            />
            <Row
              href="/model-test/leaderboard"
              title="লিডারবোর্ড"
              text="সেরাদের তালিকা দেখুন"
              icon={Trophy}
              from="#fbbf24"
              to="#f97316"
            />
          </div>

          {posts.length > 0 ? (
            <div className="qd-pn">
              <div className="qd-sh">
                <h2>ব্লগ থেকে</h2>
                <Link href="/blog">সব দেখুন</Link>
              </div>
              {posts.map((p) => (
                <Row
                  key={p.id}
                  href={`/blog/${p.slug ?? p.id}`}
                  title={p.title}
                  text={p.category ?? "ব্লগ"}
                  icon={Newspaper}
                  from="#34d399"
                  to="#059669"
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

// ===== ফাইল শেষ =====
