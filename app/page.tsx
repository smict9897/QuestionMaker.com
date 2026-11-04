// প্রশ্নোদয় — নতুন হোমপেজ (সার্ভার কম্পোনেন্ট)
import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSite } from "@/lib/site";
import "@/components/home/home.css";
import HomeHeader from "@/components/home/home-header";
import HeroTyping from "@/components/home/hero-typing";
import HomeFooter from "@/components/proshnoday/home/home-footer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: { absolute: `${site.siteName} — অনলাইনে প্রশ্নপত্র তৈরি করুন` },
    description: site.metaDescription,
  };
}

/* ছোট আইকন সহায়ক (ভেতরে শুধু SVG পাথ) */
const P = {
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z", "M4 19.5V21h16"],
  check: ["M20 6 9 17l-5-5"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6M8 13h8M8 17h8"],
  sliders: ["M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"],
  bolt: ["M13 2 3 14h9l-1 8 10-12h-9z"],
  pen: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"],
  layers: ["m12 2 10 5-10 5L2 7z", "m2 17 10 5 10-5M2 12l10 5 10-5"],
  print: [
    "M6 9V2h12v7",
    "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
    "M6 14h12v8H6z",
  ],
} as const;

function Ico({ n, size }: { n: keyof typeof P; size?: number }) {
  return (
    <svg
      className="qk-i"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
    >
      {P[n].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const features: { n: keyof typeof P; c: string; t: string; d: string }[] = [
  { n: "book", c: "v", t: "অধ্যায়ভিত্তিক প্রশ্ন", d: "শ্রেণি, বিষয় ও অধ্যায় বেছে নিন। শুধু প্রয়োজনীয় অংশ থেকেই প্রশ্ন আসবে।" },
  { n: "layers", c: "p", t: "তিন ধরনের প্রশ্ন", d: "MCQ, সৃজনশীল ও সংক্ষিপ্ত। বোর্ডের নিয়মে নম্বর ও অংশ ভাগ করা।" },
  { n: "sliders", c: "a", t: "নিজের মতো সাজান", d: "প্রতিষ্ঠানের নাম, পেজ সাইজ, কলাম ও ফন্ট ঠিক করে নিন।" },
  { n: "print", c: "c", t: "প্রিন্ট ও PDF", d: "A4 সাইজে পরিপাটি লেআউট। এক ক্লিকে প্রিন্ট বা ডাউনলোড।" },
  { n: "spark", c: "v", t: "AI-র সাহায্যে প্রশ্ন", d: "নতুন প্রশ্ন তৈরি হয় AI দিয়ে, যাচাইয়ের পরই ভান্ডারে যোগ হয়।" },
  { n: "bolt", c: "m", t: "কুইজ দিয়ে যাচাই", d: "শিক্ষার্থীরা অনলাইনে কুইজ দিয়ে নিজেকে যাচাই করতে পারবে।" },
];

const steps: [string, string, string][] = [
  ["০১", "শ্রেণি ও বিষয়", "আপনার শ্রেণি, বিষয় ও অধ্যায় বাছুন।"],
  ["০২", "প্রশ্নের ধরন", "কত MCQ, কত সৃজনশীল, কত নম্বর ঠিক করুন।"],
  ["০৩", "সাজান ও দেখুন", "হেডার, ফন্ট ও পেজ ঠিক করে প্রিভিউ দেখুন।"],
  ["০৪", "প্রিন্ট বা PDF", "পছন্দ হলেই ডাউনলোড বা প্রিন্ট করুন।"],
];

const classes: [label: string, small?: string][] = [
  ["১ম শ্রেণি"],
  ["২য় শ্রেণি"],
  ["৩য় শ্রেণি"],
  ["৪র্থ শ্রেণি"],
  ["৫ম শ্রেণি"],
  ["৬ষ্ঠ শ্রেণি"],
  ["৭ম শ্রেণি"],
  ["৮ম শ্রেণি"],
  ["৯ম–১০ম", "SSC"],
  ["১১শ–১২শ", "HSC"],
];
const tints = ["v", "p", "a", "c", "m"];
const thumbs: (keyof typeof P)[] = ["file", "book", "spark"];

const faqs: [string, string][] = [
  ["প্রশ্নপত্র কি প্রিন্ট করা যাবে?", "হ্যাঁ। A4 সাইজে প্রিন্ট-রেডি লেআউটে সরাসরি প্রিন্ট বা PDF করা যাবে।"],
  ["কোন ধরনের প্রশ্ন পাওয়া যাবে?", "MCQ, সৃজনশীল ও সংক্ষিপ্ত প্রশ্ন। সব প্রশ্ন শ্রেণি, বিষয় ও অধ্যায় অনুযায়ী সাজানো।"],
  ["নিজের প্রতিষ্ঠানের নাম বসানো যাবে?", "হ্যাঁ। হেডারে প্রতিষ্ঠানের নাম, পরীক্ষার নাম, সময় ও পূর্ণমান নিজের মতো লেখা যাবে।"],
  [
    "শিক্ষার্থীরা কি ব্যবহার করতে পারবে?",
    "শিক্ষার্থীরা কুইজ দিতে, লাইভ মডেল টেস্টে অংশ নিতে ও ব্লগ পড়তে পারবে। প্রশ্নপত্র বানানো মূলত শিক্ষকদের জন্য।",
  ],
];

export default async function Home() {
  const [site, session, posts] = await Promise.all([
    getSite(),
    auth().catch(() => null),
    db.post
      .findMany({
        where: { published: true, NOT: { category: { slug: "news" } } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { category: true },
      })
      .catch(() => []),
  ]);

  const loggedIn = !!session?.user;

  return (
    <div className="qk-home">
      <HomeHeader siteName={site.siteName} tagline={site.tagline} loggedIn={loggedIn} />

      <main>
        {/* হিরো */}
        <div className="qk-hero">
          <div className="qk-wrap qk-hero-grid">
            <div>
              <span className="qk-pill">
                <em>নতুন</em>AI দিয়ে প্রশ্ন তৈরি ও যাচাই
              </span>
              <h1>
                মিনিটেই তৈরি হোক আপনার <span className="qk-grad">নিখুঁত প্রশ্নপত্র</span>
              </h1>
              <p className="qk-lead">
                শ্রেণি, বিষয় ও অধ্যায় বাছুন। MCQ, সৃজনশীল ও সংক্ষিপ্ত প্রশ্ন নিজের মতো সাজিয়ে প্রিন্ট বা PDF করুন।
                হেডার, ফন্ট আর পেজ সবই আপনার নিয়ন্ত্রণে।
              </p>
              <div className="qk-cta">
                <Link href="/question-builder" className="qk-btn qk-btn-g">
                  <Ico n="pen" />
                  প্রশ্নপত্র তৈরি করুন
                </Link>
                <a href="#how" className="qk-btn qk-btn-glass">
                  কীভাবে কাজ করে
                </a>
              </div>
              <div className="qk-types">
                <span><i style={{ background: "#a78bfa" }} />MCQ</span>
                <span><i style={{ background: "#ff7eb6" }} />সৃজনশীল</span>
                <span><i style={{ background: "#ffc857" }} />সংক্ষিপ্ত</span>
                <span><i style={{ background: "#5eead0" }} />কুইজ</span>
              </div>
            </div>

            <HeroTyping />
          </div>
        </div>

        {/* ফিচার */}
        <section id="features" className="qk-section">
          <div className="qk-wrap">
            <div className="qk-sec-head">
              <span className="qk-eyebrow">কেন {site.siteName}</span>
              <h2>সময় বাঁচান, প্রশ্নের মান ধরে রাখুন</h2>
              <p>প্রশ্ন খোঁজা, সাজানো আর প্রিন্টের কাজ এক জায়গায়।</p>
            </div>
            <div className="qk-grid qk-g3">
              {features.map((f) => (
                <div key={f.t} className="qk-card">
                  <div className={`qk-ic qk-ic-${f.c}`}>
                    <Ico n={f.n} />
                  </div>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ধাপ */}
        <section id="how" className="qk-section qk-steps-bg">
          <div className="qk-wrap">
            <div className="qk-sec-head">
              <span className="qk-eyebrow">কীভাবে কাজ করে</span>
              <h2>চার ধাপে সম্পূর্ণ প্রশ্নপত্র</h2>
            </div>
            <div className="qk-grid qk-g4">
              {steps.map(([num, t, d]) => (
                <div key={num} className="qk-card qk-step">
                  <div className="qk-num">{num}</div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* শিক্ষক / শিক্ষার্থী */}
        <section id="roles" className="qk-section">
          <div className="qk-wrap">
            <div className="qk-sec-head">
              <span className="qk-eyebrow">দুই রকম অভিজ্ঞতা</span>
              <h2>শিক্ষক ও শিক্ষার্থী, দুজনের জন্য আলাদা</h2>
              <p>যে যার প্রয়োজন অনুযায়ী পরিষ্কার ড্যাশবোর্ড পাবেন।</p>
            </div>
            <div className="qk-grid qk-g2">
              <div className="qk-role qk-role-t">
                <span className="qk-tagr">
                  <Ico n="pen" size={16} />
                  শিক্ষক
                </span>
                <h3>প্রশ্নপত্র বানান, সাজান, প্রিন্ট করুন</h3>
                <ul>
                  {[
                    "সব ধরনের প্রশ্ন দিয়ে প্রশ্নপত্র তৈরি",
                    "নিজের প্রতিষ্ঠানের হেডার ও ফন্ট",
                    "আগের বানানো প্রশ্নপত্র আবার খোলা",
                  ].map((x) => (
                    <li key={x}>
                      <Ico n="check" size={18} />
                      {x}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 20, position: "relative", zIndex: 1 }}>
                  <Link href="/question-builder" className="qk-btn qk-btn-w qk-btn-sm">
                    প্রশ্নপত্র তৈরি করুন
                  </Link>
                </div>
              </div>

              <div className="qk-role qk-role-s">
                <span className="qk-tagr">
                  <Ico n="bolt" size={16} />
                  শিক্ষার্থী
                </span>
                <h3>লাইভ টেস্ট দিন, কুইজে যাচাই করুন</h3>
                <ul>
                  {[
                    "লাইভ মডেল টেস্টে অংশ নিয়ে ফলাফল ও লিডারবোর্ড",
                    "বিষয় ও অধ্যায় বেছে কুইজ, সঙ্গে সঙ্গে ব্যাখ্যা",
                    "ব্লগ ও আর্টিকেল পড়ে প্রস্তুতি",
                  ].map((x) => (
                    <li key={x}>
                      <Ico n="check" size={18} />
                      {x}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 20, position: "relative", zIndex: 1 }}>
                  <Link href="/model-test" className="qk-btn qk-btn-w qk-btn-sm">
                    লাইভ মডেল টেস্ট দেখুন
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* শ্রেণি */}
        <section id="classes" className="qk-section" style={{ paddingTop: 0 }}>
          <div className="qk-wrap">
            <div className="qk-sec-head">
              <span className="qk-eyebrow">শ্রেণি</span>
              <h2>আপনার শ্রেণি বেছে শুরু করুন</h2>
            </div>
            <div className="qk-grid qk-classes">
              {classes.map(([label, small], i) => (
                <Link key={label} href="/question-builder" className="qk-cls">
                  <span className={`qk-ic qk-ic-${tints[i % tints.length]}`}>
                    <Ico n="book" />
                  </span>
                  <span>
                    {label}
                    {small ? <small>{small}</small> : null}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="qk-section" style={{ paddingTop: 0 }}>
          <div className="qk-wrap">
            <div className="qk-band">
              <h2>এখনই প্রথম প্রশ্নপত্রটি বানিয়ে ফেলুন</h2>
              <p>কয়েকটা ক্লিকেই প্রশ্নপত্র তৈরি। শিক্ষার্থীরা চাইলে একই বিষয়ে কুইজও দিতে পারবে।</p>
              <div className="qk-cta">
                <Link href="/question-builder" className="qk-btn qk-btn-w">
                  প্রশ্নপত্র তৈরি করুন
                </Link>
                <Link href="/quiz" className="qk-btn qk-btn-glass">
                  কুইজ দেখুন
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ব্লগ (লেখা না থাকলে পুরো সেকশন লুকানো) */}
        {posts.length > 0 && (
          <section id="blog" className="qk-section qk-steps-bg">
            <div className="qk-wrap">
              <div className="qk-sec-head">
                <span className="qk-eyebrow">ব্লগ ও আর্টিকেল</span>
                <h2>পড়াশোনার কাজের লেখা</h2>
              </div>
              <div className="qk-grid qk-g3">
                {posts.map((p, i) => (
                  <Link key={p.id} href={`/blog/${p.slug ?? p.id}`} className="qk-card qk-post">
                    <div className="qk-th">
                      <Ico n={thumbs[i % thumbs.length]} size={42} />
                    </div>
                    <div className="qk-bd">
                      <span className="qk-tag">{p.category?.name ?? "ব্লগ"}</span>
                      <h3>{p.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="qk-more">
                <Link href="/blog" className="qk-btn qk-btn-g qk-btn-sm">
                  সব লেখা দেখুন
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* প্রশ্নোত্তর */}
        <section id="faq" className="qk-section">
          <div className="qk-wrap">
            <div className="qk-sec-head">
              <span className="qk-eyebrow">প্রশ্নোত্তর</span>
              <h2>সাধারণ কিছু জিজ্ঞাসা</h2>
            </div>
            <div className="qk-faq">
              {faqs.map(([qs, an]) => (
                <details key={qs}>
                  <summary>{qs}</summary>
                  <p>{an}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

// ===== ফাইল শেষ =====
