"use client";

import { useEffect, useRef, useState } from "react";
import "./paper-animation.css";

const shortQuestions = [
  "মাতৃভাষা বলতে কী বোঝায়?",
  "বাংলা বর্ণমালায় স্বরবর্ণ কয়টি?",
  "বিশেষ্য পদ কাকে বলে?",
  "বাক্য কাকে বলে?",
  "প্রতিশব্দ বলতে কী বোঝায়?",
  "কবিতার মূলভাব কী?",
  "বিরামচিহ্ন কেন ব্যবহার করা হয়?",
  "সর্বনাম পদ কাকে বলে?",
  "একটি দেশপ্রেমমূলক কবিতার নাম লেখো।",
  "উপমা বলতে কী বোঝায়?",
  "সাধু ও চলিত ভাষার একটি পার্থক্য লেখো।",
  "সন্ধি কাকে বলে?",
  "বিপরীত শব্দের একটি উদাহরণ দাও।",
  "অনুচ্ছেদ বলতে কী বোঝায়?",
  "সাহিত্য পাঠের একটি উপকারিতা লেখো।",
];
const creativeQuestions = [
  {
    text: "রাফি প্রতিদিন বিদ্যালয়ে যাওয়ার পথে একটি চারা গাছে পানি দেয়। একদিন সে দেখে গাছটির ডাল ভেঙে গেছে। বন্ধুদের নিয়ে সে গাছটির পরিচর্যা শুরু করে এবং অন্যদেরও গাছ লাগাতে উৎসাহ দেয়।",
    parts: [
      "প্রকৃতি বলতে কী বোঝায়?",
      "বৃক্ষকে মানুষের বন্ধু বলা হয় কেন?",
      "রাফির কাজে প্রকৃতির প্রতি ভালোবাসা কীভাবে প্রকাশ পেয়েছে?",
      "পরিবেশ রক্ষায় রাফির মতো উদ্যোগের গুরুত্ব বিশ্লেষণ করো।",
    ],
  },
  {
    text: "মিতার বিদ্যালয়ে একটি পাঠাগার আছে। সে অবসরে সেখানে বই পড়ে এবং বন্ধুদের সঙ্গে শেখা বিষয় নিয়ে আলোচনা করে। বই পড়ার অভ্যাস তার চিন্তাকে সমৃদ্ধ করেছে।",
    parts: [
      "পাঠাগার কী?",
      "বই পড়ার অভ্যাস প্রয়োজন কেন?",
      "মিতার অভ্যাসে জ্ঞান অর্জনের কোন দিকটি ফুটে উঠেছে?",
      "সৃজনশীল চিন্তা বিকাশে বই পড়ার ভূমিকা মূল্যায়ন করো।",
    ],
  },
  {
    text: "বন্যার সময় গ্রামের কয়েকজন শিক্ষার্থী নিজেদের সঞ্চয় একত্র করে দুর্গত মানুষের জন্য খাবার সংগ্রহ করল। তাদের উদ্যোগে গ্রামের অন্য মানুষও সহযোগিতার হাত বাড়াল।",
    parts: [
      "সহমর্মিতা কী?",
      "বিপদে মানুষের পাশে দাঁড়ানো উচিত কেন?",
      "শিক্ষার্থীদের উদ্যোগে মানবিকতার পরিচয় ব্যাখ্যা করো।",
      "সম্মিলিত উদ্যোগ সমাজে ইতিবাচক পরিবর্তন আনতে পারে—বিশ্লেষণ করো।",
    ],
  },
];
const bn = (n: number) => n.toLocaleString("bn-BD");

export default function PaperAnimation() {
  const root = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState(0);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
    };
  }, []);
  useEffect(() => {
    if (!active || reduced) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setFrame((f) => (f + 1) % 44);
    }, 650);
    return () => window.clearInterval(timer);
  }, [active, reduced]);
  // 15 short questions, reading hold, crossfade, then 3 complete creative questions.
  const creative = !reduced && frame >= 23;
  const count = reduced
    ? 15
    : creative
      ? Math.min(3, Math.floor((frame - 23) / 4) + 1)
      : Math.min(15, frame + 1);
  const fading = !reduced && (frame === 22 || frame === 43);
  return (
    <section
      ref={root}
      className="paper-demo"
      aria-label="প্রশ্নপত্রের ডেমো অ্যানিমেশন"
    >
      <div className="paper-demo-caption">
        <span>
          <i /> প্রশ্নপত্র তৈরির এক ঝলক
        </span>
        <small>ডেমো অ্যানিমেশন</small>
      </div>
      <div className={`paper-demo-sheet ${fading ? "paper-demo-fade" : ""}`}>
        <div className="paper-demo-header">
          <div className="paper-demo-school">
            <div className="paper-demo-emblem" role="img" aria-label="নমুনা বিদ্যালয় লোগো · প্রতিষ্ঠিত ১৯৬৩">
              <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth=".7" />
                <path d="M17 22q8-4 15 1q7-5 15-1v20q-8-4-15 1q-7-5-15-1Z M32 23v20 M21 27l7 1 M21 32l7 1 M36 28l7-1 M36 33l7-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="m32 10 1.4 3 3.3.4-2.4 2.3.6 3.3-2.9-1.6-2.9 1.6.6-3.3-2.4-2.3 3.3-.4Z" fill="currentColor" />
              </svg>
              <span>প্রতিষ্ঠিত ১৯৬৩</span>
            </div>
            <h2>শরৎচন্দ্র নন্দলাল পাবলিক উচ্চ বিদ্যালয় ও কলেজ</h2>
          </div>
          <p>প্রথম সাময়িক মূল্যায়ন — ২০২৬</p>
          <p>শ্রেণি: নবম · বিষয়: বাংলা</p>
        </div>
        <div className="paper-demo-meta">
          <span>সময় — {creative ? "২ ঘণ্টা" : "৩০ মিনিট"}</span>
          <span>পূর্ণমান — ৩০</span>
        </div>
        <div className="paper-demo-student">
          <span>
            শিক্ষার্থীর নাম: ..........................................
          </span>
          <span>রোল: ............</span>
        </div>
        <div
          className="paper-demo-body"
          key={creative ? "creative" : "short"}
          aria-hidden="true"
        >
          <h3>{creative ? "সৃজনশীল প্রশ্ন" : "সংক্ষিপ্ত প্রশ্ন"}</h3>
          <p className="paper-demo-instruction">
            {creative
              ? "উদ্দীপক পড়ে প্রশ্নগুলোর উত্তর দাও।"
              : "নিচের প্রশ্নগুলোর সংক্ষেপে উত্তর দাও। প্রতিটি প্রশ্নের মান ২।"}
          </p>
          <div className="paper-demo-columns">
            {creative
              ? creativeQuestions.slice(0, count).map((q, i) => (
                  <div className="paper-demo-question paper-demo-cq" key={i}>
                    <p>
                      <b>{bn(i + 1)}। উদ্দীপক:</b> {q.text}
                    </p>
                    {q.parts.map((part, j) => (
                      <p key={part}>
                        <b>({["ক", "খ", "গ", "ঘ"][j]})</b> {part}
                        <em>{bn(j + 1)}</em>
                      </p>
                    ))}
                  </div>
                ))
              : shortQuestions.slice(0, count).map((q, i) => (
                  <p className="paper-demo-question" key={q}>
                    <b>{bn(i + 1)}।</b> {q}
                  </p>
                ))}
          </div>
          {!reduced && (
            <p className="paper-demo-writing">
              <span /> লেখা হচ্ছে…
            </p>
          )}
        </div>
        <p className="paper-demo-accessible">
          ১৫টি সংক্ষিপ্ত প্রশ্নের পরে সৃজনশীল প্রশ্ন সাজানোর নমুনা। এটি শুধু
          প্রদর্শনী, আসল প্রশ্নপত্র নয়।
        </p>
        <div className="paper-demo-page" aria-hidden="true">
          ১
        </div>
      </div>
      <p className="paper-demo-note">
        আপনার প্রশ্নপত্রও সাজান নিজের পছন্দের হেডার ও প্রতিষ্ঠানের নামে।
      </p>
    </section>
  );
}
