import Link from "next/link";
import { readyLibrary } from "@/lib/ready-paper-data";
import "@/components/ready-papers/ready.css";
import ReadyClassSubject from "@/components/ready-papers/class-subject";
import { readyPaperCatalog, readyGrade } from "@/lib/ready-paper-catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "রেডি প্রশ্নপত্র" };
export default async function ReadyLibrary({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    grade?: string;
    subject?: string;
    year?: string;
    source?: string;
  }>;
}) {
  const p = await searchParams;
  const records = await readyLibrary().catch(() => null);
  const papers =
    records
      ?.map((r) => ({ ...r, grade: readyGrade(r.grade) }))
      .filter((r) => readyPaperCatalog.some((c) => c.grade === r.grade)) ??
    null;
  const selected = Object.fromEntries(
    ["kind", "grade", "subject", "year", "source"].map((k) => [
      k,
      typeof p[k as keyof typeof p] === "string"
        ? p[k as keyof typeof p]
        : undefined,
    ]),
  );
  if (selected.grade) selected.grade = readyGrade(selected.grade);
  const filtered = papers?.filter((row) =>
    Object.entries(selected).every(
      ([k, v]) => !v || row[k as keyof typeof row] === v,
    ),
  );
  return (
    <main className="rp-root">
      <section className="rp-hero">
        <span>READY PAPER STUDIO</span>
        <h1>রেডি প্রশ্নপত্র</h1>
        <p>মূল প্রশ্নপত্র দেখুন, page বাছুন, নিজের header দিয়ে প্রিন্ট করুন।</p>
        <div className="rp-tabs">
          <Link href="/ready-papers?kind=BOARD">বোর্ড প্রশ্ন</Link>
          <Link href="/ready-papers?kind=SCHOOL">সুনামধন্য স্কুলের মডেল টেস্ট</Link>
        </div>
      </section>
      <form className="rp-panel rp-fields">
        <label>
          বিভাগ
          <select name="kind" defaultValue={selected.kind}>
            <option value="">সব বিভাগ</option>
            <option value="BOARD">বোর্ড প্রশ্ন</option>
            <option value="SCHOOL">স্কুলের মডেল টেস্ট</option>
          </select>
        </label>
        <ReadyClassSubject
          key={`${selected.grade}:${selected.subject}`}
          catalog={readyPaperCatalog}
          grade={selected.grade}
          subject={selected.subject}
        />
        {(["year", "source"] as const).map((k, i) => (
          <label key={k}>
            {["বছর", "বোর্ড / স্কুল"][i]}
            <select name={k} defaultValue={selected[k]}>
              <option value="">সব</option>
              {[
                ...new Set(
                  (papers || [])
                    .filter(
                      (row) => !selected.kind || row.kind === selected.kind,
                    )
                    .map((r) => r[k]),
                ),
              ]
                .sort()
                .map((v) => (
                  <option key={v}>{v}</option>
                ))}
            </select>
          </label>
        ))}
        <button>খুঁজুন</button>
      </form>
      {papers === null ? (
        <p role="alert">Library লোড হয়নি। আবার চেষ্টা করুন।</p>
      ) : (
        <div className="rp-library">
          {filtered?.map((r) => (
            <Link
              href={`/ready-papers/${r.id}`}
              key={r.id}
              className="rp-library-card"
            >
              <span>{r.kind === "BOARD" ? "বোর্ড প্রশ্ন" : "স্কুল মডেল টেস্ট"}</span>
              <h2>{r.title}</h2>
              <p>
                {r.grade} · {r.subject}
              </p>
              <p>
                {r.year} · {r.source}
              </p>
              <strong>PDF খুলুন →</strong>
            </Link>
          ))}
          {!filtered?.length && (
            <p>এই নির্বাচনে প্রকাশিত PDF নেই। অন্য filter বাছুন।</p>
          )}
        </div>
      )}
    </main>
  );
}
