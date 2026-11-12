"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  CalendarDays,
  School,
  Layers,
  X,
} from "lucide-react";
import {
  emptyLibraryFilters,
  indexLibrary,
  searchLibrary,
  libraryFilters,
  type LibraryFilters,
  type LibraryPaper,
} from "@/lib/ready-library-search";
import type { ReadyCatalog } from "./class-subject";
export default function LibraryBrowser({
  papers,
  catalog,
  initial,
}: {
  papers: LibraryPaper[];
  catalog: ReadyCatalog;
  initial: LibraryFilters;
}) {
  const [filters, setFilters] = useState(initial),
    [limit, setLimit] = useState(24);
  const index = useMemo(() => indexLibrary(papers), [papers]);
  const results = useMemo(
    () => searchLibrary(index, filters),
    [index, filters],
  );
  const subjects = useMemo(
    () => [
      ...new Set(
        catalog
          .filter((c) => !filters.grade || c.grade === filters.grade)
          .flatMap((c) => c.subjects),
      ),
    ],
    [catalog, filters.grade],
  );
  const years = useMemo(
    () => [...new Set(papers.map((p) => p.year))].sort().reverse(),
    [papers],
  );
  const sources = useMemo(
    () =>
      [...new Set(papers.map((p) => p.source))].sort((a, b) =>
        a.localeCompare(b, "bn"),
      ),
    [papers],
  );
  useEffect(() => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) query.set(k, v);
    });
    const url =
      window.location.pathname +
      (query.size ? "?" + query.toString() : "") +
      window.location.hash;
    window.history.replaceState(window.history.state, "", url);
  }, [filters]);
  useEffect(() => {
    function back() {
      setFilters(
        libraryFilters(
          Object.fromEntries(new URLSearchParams(window.location.search)),
        ),
      );
      setLimit(24);
    }
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  function change(key: keyof LibraryFilters, value: string) {
    setLimit(24);
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "grade" &&
      !(
        value
          ? catalog.find((c) => c.grade === value)?.subjects
          : catalog.flatMap((c) => c.subjects)
      )?.includes(f.subject)
        ? { subject: "" }
        : {}),
    }));
  }
  function reset() {
    setFilters({ ...emptyLibraryFilters });
    setLimit(24);
  }
  const active = Object.values(filters).some(Boolean);
  return (
    <>
      <form
        className="rp-panel rp-library-search"
        onSubmit={(e) => {
          e.preventDefault();
          setLimit(24);
        }}
        role="search"
        aria-label="প্রশ্নপত্র খুঁজুন"
      >
        <div className="rp-library-search-heading">
          <div>
            <SlidersHorizontal size={18} />
            <h2>আপনার প্রশ্নপত্র খুঁজে নিন</h2>
          </div>
          <span>যেকোনো একটি তথ্য দিয়েই খুঁজুন</span>
        </div>
        <label className="rp-library-query">
          নাম বা বিষয় লিখুন
          <div>
            <Search size={19} aria-hidden="true" />
            <input
              name="q"
              type="search"
              value={filters.q}
              maxLength={120}
              onChange={(e) => change("q", e.target.value)}
              placeholder="যেমন: ICT, মডেল, ঢাকা, ২০২৪…"
            />
          </div>
        </label>
        <div className="rp-fields">
          <label>
            বিভাগ
            <select
              name="kind"
              value={filters.kind}
              onChange={(e) => change("kind", e.target.value)}
            >
              <option value="">সব বিভাগ</option>
              <option value="BOARD">বোর্ড প্রশ্ন</option>
              <option value="SCHOOL">স্কুল মডেল টেস্ট</option>
            </select>
          </label>
          <label>
            শ্রেণি / পরীক্ষা
            <select
              name="grade"
              value={filters.grade}
              onChange={(e) => change("grade", e.target.value)}
            >
              <option value="">সব পরীক্ষা</option>
              {catalog.map((c) => (
                <option key={c.grade}>{c.grade}</option>
              ))}
            </select>
          </label>
          <label>
            বিষয় ও পত্র
            <select
              name="subject"
              value={filters.subject}
              onChange={(e) => change("subject", e.target.value)}
            >
              <option value="">সব বিষয়</option>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            বছর
            <select
              name="year"
              value={filters.year}
              onChange={(e) => change("year", e.target.value)}
            >
              <option value="">সব বছর</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            বোর্ড / স্কুল
            <select
              name="source"
              value={filters.source}
              onChange={(e) => change("source", e.target.value)}
            >
              <option value="">সব বোর্ড / স্কুল</option>
              {sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="rp-search-submit" type="submit">
            <Search size={17} />
            খুঁজুন
          </button>
        </div>
      </form>
      <div className="rp-library-results-bar">
        <p role="status" aria-live="polite">
          <strong>{results.length.toLocaleString("bn-BD")}</strong>টি প্রশ্নপত্র
          পাওয়া গেছে{filters.group && " · একই মূল ফাইলের পার্ট"}
        </p>
        {active && (
          <button type="button" onClick={reset}>
            <X size={15} />
            সব ফিল্টার মুছুন
          </button>
        )}
      </div>
      {results.length ? (
        <div className="rp-library rp-professional-library">
          {results.slice(0, limit).map((p) => (
            <article
              className={`rp-paper-card ${p.kind === "BOARD" ? "rp-paper-board" : ""}`}
              key={p.id}
            >
              <div className="rp-paper-top">
                <span className="rp-paper-icon" aria-hidden="true">
                  <FileText size={27} />
                </span>
                <span className="rp-paper-badge">
                  {p.kind === "BOARD" ? "বোর্ড প্রশ্ন" : "স্কুল মডেল টেস্ট"}
                </span>
                <span className="rp-paper-year">
                  <CalendarDays size={13} />
                  {p.year}
                </span>
              </div>
              <div className="rp-paper-content">
                <div className="rp-paper-grade">
                  {p.grade} · {p.subject}
                </div>
                <h2>
                  <Link href={`/ready-papers/${p.id}`}>{p.title}</Link>
                </h2>
                <p className="rp-paper-source">
                  <School size={15} aria-hidden="true" />
                  {p.source}
                </p>
                {p.groupTitle && (
                  <p className="rp-paper-group">
                    <Layers size={14} aria-hidden="true" />
                    {p.groupTitle} · পৃষ্ঠা {p.pageStart}–{p.pageEnd}
                  </p>
                )}
              </div>
              <div className="rp-paper-bottom">
                <Link
                  className="rp-paper-open"
                  href={`/ready-papers/${p.id}`}
                  aria-label={`${p.title} — প্রশ্নপত্র দেখুন`}
                >
                  প্রশ্নপত্র দেখুন
                  <ArrowUpRight size={18} />
                </Link>
                {p.groupId && (
                  <Link
                    href={`/ready-papers?group=${p.groupId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setFilters({ ...emptyLibraryFilters, group: p.groupId! });
                      setLimit(24);
                    }}
                    className="rp-paper-parts"
                  >
                    সব পার্ট দেখুন →
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rp-library-empty">
          <Search size={32} aria-hidden="true" />
          <h2>মিল পাওয়া যায়নি</h2>
          <p>নামের ছোট অংশ লিখুন অথবা একটি ফিল্টার দিয়ে আবার চেষ্টা করুন।</p>
          <button onClick={reset}>সব ফিল্টার মুছুন</button>
        </section>
      )}
      {results.length > limit && (
        <div className="rp-library-more">
          <button onClick={() => setLimit((n) => n + 24)}>
            আরও প্রশ্নপত্র দেখুন ({(results.length - limit).toLocaleString("bn-BD")}
            )
          </button>
        </div>
      )}
    </>
  );
}
