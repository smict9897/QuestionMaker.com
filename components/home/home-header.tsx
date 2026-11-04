"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  siteName: string;
  tagline: string;
  loggedIn: boolean;
};

const LINKS = [
  { href: "#features", label: "ফিচার" },
  { href: "#how", label: "কীভাবে কাজ করে" },
  { href: "#roles", label: "শিক্ষক ও শিক্ষার্থী" },
  { href: "#blog", label: "ব্লগ" },
  { href: "#faq", label: "প্রশ্নোত্তর" },
];

export default function HomeHeader({ siteName, tagline, loggedIn }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="qk-header">
      <div className="qk-wrap qk-bar">
        <Link href="/" className="qk-logo" aria-label={siteName}>
          <span className="qk-mark">
            <svg className="qk-i" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </span>
          <span>
            <b>{siteName}</b>
            <small>{tagline}</small>
          </span>
        </Link>

        <nav className="qk-links" aria-label="প্রধান মেনু">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="qk-head-r">
          {loggedIn ? (
            <Link href="/dashboard" className="qk-btn qk-btn-g qk-btn-sm">
              ড্যাশবোর্ড
            </Link>
          ) : (
            <>
              <Link href="/login" className="qk-btn qk-btn-glass qk-btn-sm qk-hide-sm">
                লগইন
              </Link>
              <Link href="/question-builder" className="qk-btn qk-btn-g qk-btn-sm">
                শুরু করুন
              </Link>
            </>
          )}
          <button
            type="button"
            className="qk-burger"
            aria-label="মেনু"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="qk-i" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className={open ? "qk-mobnav qk-open" : "qk-mobnav"}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        {!loggedIn && (
          <Link href="/login" onClick={() => setOpen(false)}>
            লগইন
          </Link>
        )}
      </div>
    </header>
  );
}

// ===== ফাইল শেষ =====
