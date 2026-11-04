"use client";

import { useEffect, useRef, useState } from "react";

type Block = { c: string; t: string[]; s?: string };

// হিরোর নমুনা প্রশ্নপত্র: একটার পর একটা লাইন নিজে নিজে লেখা হবে
const BLOCKS: Block[] = [
  { c: "ph1", t: ["নমুনা উচ্চ বিদ্যালয়"], s: "হেডার তৈরি হচ্ছে…" },
  { c: "ph2", t: ["বার্ষিক পরীক্ষা — ২০২৬"] },
  { c: "ph3", t: ["শ্রেণি: অষ্টম | বিষয়: বিজ্ঞান"] },
  { c: "row", t: ["সময়: ২ ঘণ্টা", "পূর্ণমান: ৫০"] },
  { c: "sec", t: ["ক-বিভাগ: সঠিক উত্তরটি বাছাই করো", "১×২=২"], s: "MCQ যোগ হচ্ছে…" },
  { c: "q", t: ["১। উদ্ভিদ খাদ্য তৈরি করে কোন প্রক্রিয়ায়?"] },
  { c: "opts", t: ["(ক) শ্বসন", "(খ) সালোকসংশ্লেষণ", "(গ) প্রস্বেদন", "(ঘ) অঙ্কুরোদগম"] },
  { c: "q", t: ["২। পানির রাসায়নিক সংকেত কোনটি?"] },
  { c: "opts", t: ["(ক) CO₂", "(খ) H₂O", "(গ) O₂", "(ঘ) NaCl"] },
  { c: "sec", t: ["খ-বিভাগ: সংক্ষিপ্ত প্রশ্ন", "২×২=৪"], s: "সংক্ষিপ্ত প্রশ্ন যোগ হচ্ছে…" },
  { c: "q", t: ["১। সালোকসংশ্লেষণ কাকে বলে?"] },
  { c: "q", t: ["২। পরিস্রুতি ও বাষ্পীভবনের পার্থক্য লেখো।"] },
  { c: "sec", t: ["গ-বিভাগ: সৃজনশীল প্রশ্ন", "১০×১=১০"], s: "সৃজনশীল প্রশ্ন যোগ হচ্ছে…" },
  { c: "stim", t: ["উদ্দীপক: রহিম একটি টবে চারা গাছ লাগিয়ে জানালার ধারে রাখল।"] },
  { c: "sub", t: ["ক. সালোকসংশ্লেষণ কী? (১)"] },
  { c: "sub", t: ["খ. গাছ জানালার দিকে বাঁকা হয় কেন? (২)"] },
  { c: "sub", t: ["গ. উদ্দীপকের প্রক্রিয়াটি ব্যাখ্যা করো। (৩)"] },
  { c: "sub", t: ["ঘ. প্রক্রিয়াটি না ঘটলে কী হতো? বিশ্লেষণ করো। (৪)"] },
];

type Segmenter = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string, opts: { granularity: string }) => Segmenter;

export default function HeroTyping() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("শুরু হচ্ছে…");

  useEffect(() => {
    const sheet = sheetRef.current;
    const inner = innerRef.current;
    if (!sheet || !inner) return;

    let cancelled = false;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const SegCtor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
    const seg = SegCtor ? new SegCtor("bn", { granularity: "grapheme" }) : null;

    function graphemes(s: string): string[] {
      if (seg) return Array.from(seg.segment(s), (x) => x.segment);
      return Array.from(s);
    }

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    function fit() {
      if (!sheet || !inner) return;
      const over = inner.offsetHeight - sheet.clientHeight + 6;
      inner.style.transform = over > 0 ? `translateY(-${over}px)` : "";
    }

    function build(b: Block): HTMLSpanElement[] {
      const el = document.createElement("div");
      el.className = "qk-b qk-" + b.c;
      const spans = b.t.map(() => {
        const s = document.createElement("span");
        el.appendChild(s);
        return s;
      });
      inner!.appendChild(el);
      return spans;
    }

    if (reduce) {
      inner.innerHTML = "";
      BLOCKS.forEach((b) => {
        const sp = build(b);
        sp.forEach((s, i) => {
          s.textContent = b.t[i];
        });
      });
      setStatus("PDF প্রস্তুত ✓");
      return () => {
        cancelled = true;
      };
    }

    async function loop() {
      while (!cancelled) {
        inner!.style.opacity = "1";
        inner!.innerHTML = "";
        inner!.style.transform = "";
        setStatus("শুরু হচ্ছে…");
        await sleep(700);
        if (cancelled) return;

        for (let bi = 0; bi < BLOCKS.length; bi++) {
          const b = BLOCKS[bi];
          if (b.s) setStatus(b.s);
          const spans = build(b);

          for (let i = 0; i < b.t.length; i++) {
            const tn = document.createTextNode("");
            const caret = document.createElement("i");
            caret.className = "qk-caret";
            spans[i].appendChild(tn);
            spans[i].appendChild(caret);

            const chars = graphemes(b.t[i]);
            const speed = b.c === "ph1" || b.c === "sec" ? 26 : 15;
            let out = "";
            for (let k = 0; k < chars.length; k++) {
              out += chars[k];
              tn.data = out;
              fit();
              await sleep(speed);
              if (cancelled) return;
            }
            caret.remove();
          }
          await sleep(140);
          if (cancelled) return;
        }

        setStatus("PDF প্রস্তুত ✓");
        await sleep(3800);
        if (cancelled) return;
        inner!.style.opacity = "0";
        await sleep(550);
      }
    }

    loop();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="qk-stage">
      <span className="qk-chip qk-chip-a">
        <span className="qk-chip-d">
          <svg className="qk-i" style={{ width: 15, height: 15 }} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
          </svg>
        </span>
        <span>{status}</span>
      </span>

      <div className="qk-glass">
        <div className="qk-tbar">
          <span>শ্রেণি: অষ্টম</span>
          <span>বিজ্ঞান</span>
          <span>A4</span>
          <span>২ কলাম</span>
          <span className="qk-live">
            <i className="qk-dot" />
            লাইভ
          </span>
        </div>
        <div className="qk-sheet" ref={sheetRef} aria-hidden="true">
          <div className="qk-sheet-in" ref={innerRef} />
        </div>
      </div>

      <span className="qk-chip qk-chip-b">
        <span className="qk-chip-d">
          <svg className="qk-i" style={{ width: 15, height: 15 }} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
        </span>
        PDF ডাউনলোড
      </span>
    </div>
  );
}

// ===== ফাইল শেষ =====
