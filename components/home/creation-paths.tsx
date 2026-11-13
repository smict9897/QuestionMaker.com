import Link from "next/link";
import { ArrowUpRight, FileStack, Layers3, Check } from "lucide-react";

/** Server-rendered entry points: no new requests, timers or client state. */
export default function CreationPaths() {
  return (
    <section className="hm-creation" aria-labelledby="creation-heading">
      <div className="hm-creation-heading">
        <div>
          <span className="hm-creation-eyebrow">
            QUESTIONMAKERBD.COM · আপনার প্রশ্নপত্রের কর্মক্ষেত্র
          </span>
          <h1 id="creation-heading">প্রশ্নপত্র তৈরি শুরু করুন</h1>
          <p>আপনার প্রয়োজন অনুযায়ী বেছে নিন একটি সহজ পথ।</p>
        </div>
        <span className="hm-creation-note">
          <Check size={16} aria-hidden="true" />
          নিজের মতো সাজান, তারপর প্রিন্ট করুন
        </span>
      </div>
      <div className="hm-creation-grid">
        <Link
          href="/ready-papers"
          className="hm-path-card hm-path-ready"
          aria-labelledby="ready-path-title"
          aria-describedby="ready-path-description"
        >
          <div className="hm-path-top">
            <span className="hm-path-icon">
              <FileStack size={29} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span className="hm-path-kind">READY PAPER</span>
            <ArrowUpRight
              className="hm-path-arrow"
              size={23}
              aria-hidden="true"
            />
          </div>
          <h2 id="ready-path-title">রেডি প্রশ্নপত্র</h2>
          <p id="ready-path-description">
            বিভিন্ন বোর্ড প্রশ্ন থেকে প্রশ্নপত্র তৈরি করুন
          </p>
          <div className="hm-path-bottom">
            <span>বোর্ড ও স্কুলের প্রশ্নপত্র</span>
            <strong>
              প্রশ্নপত্র বেছে নিন <span aria-hidden="true">→</span>
            </strong>
          </div>
        </Link>
        <Link
          href="/question-builder"
          className="hm-path-card hm-path-database"
          aria-labelledby="database-path-title"
          aria-describedby="database-path-description"
        >
          <div className="hm-path-top">
            <span className="hm-path-icon">
              <Layers3 size={29} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span className="hm-path-kind">QUESTION DATABASE</span>
            <ArrowUpRight
              className="hm-path-arrow"
              size={23}
              aria-hidden="true"
            />
          </div>
          <h2 id="database-path-title">ডাটাবেজ থেকে প্রশ্নপত্র</h2>
          <p id="database-path-description">
            ডাটাবেজ থেকে বিষয় অধ্যায় টপিক নির্বাচন করে প্রশ্নপত্র তৈরি করুন
          </p>
          <div className="hm-path-bottom">
            <span>বিষয় · অধ্যায় · টপিক</span>
            <strong>
              বিষয় নির্বাচন করুন <span aria-hidden="true">→</span>
            </strong>
          </div>
        </Link>
      </div>
    </section>
  );
}
