import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
export const POLICY_UPDATED = "2026-11-10";
export default function PolicyLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 text-slate-800 space-y-6 leading-relaxed break-words">
        <Link className="underline" href="/">
          ← {BRAND.nameBn}
        </Link>
        <header className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          <p className="text-sm text-slate-600">
            {BRAND.nameBn} / {BRAND.nameEn} · হালনাগাদ:{" "}
            <time dateTime={POLICY_UPDATED}>{POLICY_UPDATED}</time>
          </p>
        </header>
        {children}
        <nav
          aria-label="সেবার তথ্য ও নীতিমালা"
          className="flex flex-wrap gap-x-5 gap-y-3 border-t pt-5 text-sm"
        >
          <Link className="underline" href="/about-us">
            পরিচিতি
          </Link>
          <Link className="underline" href="/contact-us">
            যোগাযোগ
          </Link>
          <Link className="underline" href="/privacy">
            গোপনীয়তা
          </Link>
          <Link className="underline" href="/terms">
            ব্যবহারের শর্ত
          </Link>
          <Link className="underline" href="/cookie-policy">
            কুকি ও স্থানীয় সংরক্ষণ
          </Link>
          <Link className="underline" href="/dmca">
            কপিরাইট অভিযোগ
          </Link>
          <Link className="underline" href="/disclaimer">
            সীমাবদ্ধতা
          </Link>
        </nav>
      </article>
    </main>
  );
}
export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
