// প্রশ্নোদয় — নতুন হোমপেজ (সার্ভার কম্পোনেন্ট)
import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSite } from "@/lib/site";
import "@/components/home/home.css";
import {
  WorkspaceShell,
  HomeStarter,
  HomeGuide,
} from "@/components/home/home-workspace";
import PaperAnimation from "@/components/home/paper-animation";
import HomeStats from "@/components/home/home-stats";
import "@/components/home/workspace.css";
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
  book: [
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z",
    "M4 19.5V21h16",
  ],
  check: ["M20 6 9 17l-5-5"],
  file: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6M8 13h8M8 17h8",
  ],
  sliders: [
    "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  ],
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
  {
    n: "book",
    c: "v",
    t: "অধ্যায়ভিত্তিক প্রশ্ন",
    d: "শ্রেণি, বিষয় ও অধ্যায় বেছে নিন। শুধু প্রয়োজনীয় অংশ থেকেই প্রশ্ন আসবে।",
  },
  {
    n: "layers",
    c: "p",
    t: "তিন ধরনের প্রশ্ন",
    d: "MCQ, সৃজনশীল ও সংক্ষিপ্ত। বোর্ডের নিয়মে নম্বর ও অংশ ভাগ করা।",
  },
  {
    n: "sliders",
    c: "a",
    t: "নিজের মতো সাজান",
    d: "প্রতিষ্ঠানের নাম, পেজ সাইজ, কলাম ও ফন্ট ঠিক করে নিন।",
  },
  {
    n: "print",
    c: "c",
    t: "প্রিন্ট ও PDF",
    d: "A4 সাইজে পরিপাটি লেআউট। এক ক্লিকে প্রিন্ট বা ডাউনলোড।",
  },
  {
    n: "spark",
    c: "v",
    t: "AI-র সাহায্যে প্রশ্ন",
    d: "নতুন প্রশ্ন তৈরি হয় AI দিয়ে, যাচাইয়ের পরই ভান্ডারে যোগ হয়।",
  },
  {
    n: "bolt",
    c: "m",
    t: "কুইজ দিয়ে যাচাই",
    d: "শিক্ষার্থীরা অনলাইনে কুইজ দিয়ে নিজেকে যাচাই করতে পারবে।",
  },
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
  [
    "প্রশ্নপত্র কি প্রিন্ট করা যাবে?",
    "হ্যাঁ। A4 সাইজে প্রিন্ট-রেডি লেআউটে সরাসরি প্রিন্ট বা PDF করা যাবে।",
  ],
  [
    "কোন ধরনের প্রশ্ন পাওয়া যাবে?",
    "MCQ, সৃজনশীল ও সংক্ষিপ্ত প্রশ্ন। সব প্রশ্ন শ্রেণি, বিষয় ও অধ্যায় অনুযায়ী সাজানো।",
  ],
  [
    "নিজের প্রতিষ্ঠানের নাম বসানো যাবে?",
    "হ্যাঁ। হেডারে প্রতিষ্ঠানের নাম, পরীক্ষার নাম, সময় ও পূর্ণমান নিজের মতো লেখা যাবে।",
  ],
  [
    "শিক্ষার্থীরা কি ব্যবহার করতে পারবে?",
    "শিক্ষার্থীরা কুইজ দিতে, লাইভ মডেল টেস্টে অংশ নিতে ও ব্লগ পড়তে পারবে। প্রশ্নপত্র বানানো মূলত শিক্ষকদের জন্য।",
  ],
];

export default async function Home() {
  const [site, session, posts, bank, packages, daily] = await Promise.all([
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
    db.question
      .groupBy({
        by: ["category", "subject", "topic"],
        where: { approved: true },
        _count: { _all: true },
      })
      .catch(() => null),
    db.package
      .findMany({ where: { active: true }, orderBy: { price: "asc" } })
      .catch(() => null),
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - (6 - i));
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        return db.question.count({
          where: { approved: true, createdAt: { gte: start, lt: end } },
        });
      }),
    ).catch(() => null),
  ]);

  const loggedIn = !!session?.user;

  return (
    <div className="qk-home">
      <WorkspaceShell
        siteName={site.siteName}
        name={loggedIn ? session?.user?.name || "আমার অ্যাকাউন্ট" : null}
      >
        <main>
          <div className="hm-hero-stack">
            <HomeStarter
              rows={(bank || []).map((r) => ({
                category: r.category,
                subject: r.subject,
                topic: r.topic,
                count: r._count._all,
              }))}
              unavailable={bank === null}
            />
            <PaperAnimation />
            <HomeStats
              rows={
                bank === null
                  ? null
                  : bank.map((r) => ({
                      category: r.category,
                      count: r._count._all,
                    }))
              }
              daily={daily}
            />
          </div>
          <HomeGuide />
          <section id="pricing" className="hm-pricing">
            <div className="hm-price-band">
              <div>
                <h2>আপনার প্রয়োজনের প্যাকেজ</h2>
                <p>চলমান প্যাকেজ ও সুবিধাগুলো এক জায়গায় দেখুন।</p>
              </div>
              <Link href="/packages" className="hm-outline">
                সকল প্যাকেজ →
              </Link>
            </div>
            <div className="hm-section-title">
              <h2>সাবস্ক্রিপশন মূল্যতালিকা</h2>
              <p>আপনার সাইটের বর্তমান সক্রিয় প্যাকেজসমূহ</p>
            </div>
            {packages?.length ? (
              <div className="hm-package-grid">
                {packages.map((pkg) => (
                  <article key={pkg.id} className="hm-panel hm-package">
                    <span className="hm-package-tag">প্রিমিয়াম</span>
                    <h3>{pkg.title}</h3>
                    {pkg.description && <p>{pkg.description}</p>}
                    <div className="hm-price">
                      ৳{pkg.price.toLocaleString("bn-BD")}
                      <small>
                        {" "}
                        / {pkg.durationDays.toLocaleString("bn-BD")} দিন
                      </small>
                    </div>
                    <ul>
                      <li>✓ প্যাকেজের সুবিধা ও শর্ত বিস্তারিত দেখুন</li>
                      <li>✓ বিদ্যমান নিরাপদ ক্রয় প্রক্রিয়া</li>
                    </ul>
                    <Link href="/packages" className="hm-primary">
                      প্যাকেজ দেখুন →
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="hm-panel hm-empty">
                <p>
                  {packages === null
                    ? "প্যাকেজের তথ্য এখন লোড করা যায়নি।"
                    : "বর্তমানে কোনো সক্রিয় প্যাকেজ নেই।"}
                </p>
                <Link href="/packages">প্যাকেজের বিস্তারিত দেখুন →</Link>
              </div>
            )}
          </section>

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
                  <div
                    style={{ marginTop: 20, position: "relative", zIndex: 1 }}
                  >
                    <Link
                      href="/question-builder"
                      className="qk-btn qk-btn-w qk-btn-sm"
                    >
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
                  <div
                    style={{ marginTop: 20, position: "relative", zIndex: 1 }}
                  >
                    <Link
                      href="/model-test"
                      className="qk-btn qk-btn-w qk-btn-sm"
                    >
                      লাইভ মডেল টেস্ট দেখুন
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* শ্রেণি */}
          <section
            id="classes"
            className="qk-section"
            style={{ paddingTop: 0 }}
          >
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
                <p>
                  কয়েকটা ক্লিকেই প্রশ্নপত্র তৈরি। শিক্ষার্থীরা চাইলে একই বিষয়ে
                  কুইজও দিতে পারবে।
                </p>
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
                    <Link
                      key={p.id}
                      href={`/blog/${p.slug ?? p.id}`}
                      className="qk-card qk-post"
                    >
                      <div className="qk-th">
                        <Ico n={thumbs[i % thumbs.length]} size={42} />
                      </div>
                      <div className="qk-bd">
                        <span className="qk-tag">
                          {p.category?.name ?? "ব্লগ"}
                        </span>
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
      </WorkspaceShell>
      <HomeFooter />
      {site.social.find((s) => s.name === "WhatsApp" && s.url) && (
        <a
          className="hm-whatsapp"
          href={site.social.find((s) => s.name === "WhatsApp")!.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp-এ যোগাযোগ করুন"
        >
          যোগাযোগ ↗
        </a>
      )}
    </div>
  );
}

// ===== ফাইল শেষ =====
