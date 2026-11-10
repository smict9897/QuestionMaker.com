"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePaper, type SavedPaper } from "@/app/actions/qb-papers";
import { savedPaperInfo, filterSavedPapers } from "@/lib/saved-paper-list";

const bn = (n: number) => n.toLocaleString("bn-BD");
function date(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("bn-BD", {
        timeZone: "Asia/Dhaka",
        dateStyle: "short",
        timeStyle: "short",
      });
}
export default function QbSavedList({ papers }: { papers: SavedPaper[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const infos = papers.map((p) => ({ p, info: savedPaperInfo(p) }));
  const categories = [...new Set(infos.flatMap((r) => r.info.categories))];
  const subjects = [
    ...new Set(
      infos
        .filter((r) => !category || r.info.categories.includes(category))
        .flatMap((r) => r.info.subjects),
    ),
  ];
  const visible = filterSavedPapers(papers, { category, subject, query });
  function open(p: SavedPaper) {
    setError("");
    try {
      localStorage.setItem("qb:selected", JSON.stringify(p.ids));
      localStorage.setItem("qb:settings", JSON.stringify(p.settings ?? {}));
      router.push("/question-builder/build");
    } catch {
      setError(
        "ব্রাউজারে প্রশ্নপত্র খোলা যায়নি। স্টোরেজের অনুমতি যাচাই করুন।",
      );
    }
  }
  function remove(p: SavedPaper) {
    if (!confirm(`"${p.name}" মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।`))
      return;
    setError("");
    start(async () => {
      try {
        const result = await deletePaper(p.key);
        if (!result.ok) {
          setError(result.error || "মুছে ফেলা যায়নি।");
          return;
        }
        router.refresh();
      } catch {
        setError("মুছে ফেলা যায়নি। আবার চেষ্টা করুন।");
      }
    });
  }
  return (
    <div className="saved-paper-workspace">
      <header className="saved-paper-banner">
        <div>
          <h1>আমার তৈরি প্রশ্ন</h1>
          <p>আপনার সংরক্ষিত সব প্রশ্নপত্র এক জায়গায়</p>
        </div>
        <Link href="/question-builder">＋ নতুন প্রশ্নপত্র</Link>
      </header>
      <section className="saved-paper-panel" aria-label="সংরক্ষিত প্রশ্নপত্র">
        <div className="saved-paper-filters">
          <label>
            <span className="sr-only">শ্রেণি</span>
            <select
              aria-label="শ্রেণি ফিল্টার"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubject("");
              }}
            >
              <option value="">সব শ্রেণি</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">বিষয়</span>
            <select
              aria-label="বিষয় ফিল্টার"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">সব বিষয়</option>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="saved-paper-search">
            <input
              aria-label="নাম বা অধ্যায় দিয়ে খুঁজুন"
              placeholder="নাম / অধ্যায় দিয়ে খুঁজুন"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={() => {
                setQuery("");
                setCategory("");
                setSubject("");
              }}
            >
              রিসেট
            </button>
            <span role="status">
              দেখানো হচ্ছে {bn(visible.length)}টি / মোট {bn(papers.length)}টি
            </span>
          </div>
        </div>
        {error && (
          <p role="alert" className="saved-paper-error">
            {error}
          </p>
        )}
        <div
          className="saved-paper-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="প্রশ্নপত্রের তালিকা — ছোট পর্দায় পাশে স্ক্রল করুন"
        >
          <table className="saved-paper-table">
            <thead>
              <tr>
                {[
                  "ক্রম",
                  "প্রশ্নপত্র",
                  "শ্রেণি",
                  "বিষয়",
                  "অধ্যায়",
                  "প্রশ্ন সংখ্যা",
                  "পূর্ণমান",
                  "সময়",
                  "তৈরির তারিখ",
                  "সর্বশেষ বদল",
                  "কাজ",
                ].map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => {
                const info = savedPaperInfo(p);
                return (
                  <tr key={p.key}>
                    <td>{bn(i + 1)}</td>
                    <th scope="row">{p.name}</th>
                    <td>{info.categories.join(", ") || "—"}</td>
                    <td>{info.subjects.join(", ") || "—"}</td>
                    <td>{info.chapters.join(", ") || "—"}</td>
                    <td>
                      <strong>{bn(p.count)}টি</strong>
                      <div className="saved-paper-chips">
                        {Object.entries(p.typeCounts).map(([type, count]) => (
                          <span key={type}>
                            {type === "SHORT" ? "সংক্ষিপ্ত" : type} {bn(count)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{info.marks || "—"}</td>
                    <td>{info.minutes || "—"}</td>
                    <td>
                      <time dateTime={p.createdAt}>{date(p.createdAt)}</time>
                    </td>
                    <td>
                      <time dateTime={p.updatedAt}>{date(p.updatedAt)}</time>
                    </td>
                    <td>
                      <div className="saved-paper-actions">
                        <button
                          onClick={() => open(p)}
                          className="saved-paper-open"
                        >
                          খুলুন
                        </button>
                        <button
                          onClick={() => open(p)}
                          aria-label={`${p.name} এডিট করুন`}
                        >
                          এডিট
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => remove(p)}
                          className="saved-paper-delete"
                          aria-label={`${p.name} মুছুন`}
                        >
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={11} className="saved-paper-empty">
                    {papers.length
                      ? "এই ফিল্টারে কোনো প্রশ্নপত্র পাওয়া যায়নি। রিসেট করে দেখুন।"
                      : "এখনও কোনো প্রশ্নপত্র সেভ করা হয়নি। নতুন প্রশ্নপত্র তৈরি করে সেভ করুন।"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="saved-paper-note">
          এডিট করলে বিল্ডার খুলবে। পরিবর্তনের পরে নাম দিয়ে সেভ করলে নতুন কপি
          তৈরি হবে। ছোট পর্দায় তালিকাটি পাশে স্ক্রল করুন।
        </p>
      </section>
    </div>
  );
}
