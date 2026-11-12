"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadReadyPaper, updateReadyPaper } from "@/app/actions/ready-papers";
import type { ReadyPaper } from "@/lib/ready-papers";
import ReadyClassSubject, { type ReadyCatalog } from "./class-subject";
export default function ReadyUpload({
  papers,
  catalog,
}: {
  papers: ReadyPaper[];
  catalog: ReadyCatalog;
}) {
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      <form
        key={formKey}
        className="rp-panel rp-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const form = e.currentTarget,
            fd = new FormData(form);
          setBusy(true);
          setMessage("Upload হচ্ছে…");
          try {
            const r = await uploadReadyPaper(fd);
            if (r.ok) {
              form.reset();
              setFormKey((k) => k + 1);
              setMessage(
                "PDF সংরক্ষিত। Preview খুলে পরিষ্কার ও crop preset যাচাই করুন।",
              );
              router.refresh();
            } else setMessage(r.error);
          } catch {
            setMessage("সংযোগ সমস্যা। আবার চেষ্টা করুন।");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>নতুন প্রশ্নপত্র PDF</h2>
        <div className="rp-fields">
          <label>
            বিভাগ
            <select name="kind">
              <option value="BOARD">বোর্ড প্রশ্ন</option>
              <option value="SCHOOL">স্কুলের মডেল টেস্ট</option>
            </select>
          </label>
          <label>
            শিরোনাম
            <input name="title" required minLength={3} maxLength={160} />
          </label>
          <ReadyClassSubject catalog={catalog} required />
          <label>
            বছর
            <input name="year" type="number" min={2000} max={2099} required />
          </label>
          <label>
            মূল বোর্ড / স্কুল / উৎস
            <input name="source" required minLength={2} maxLength={160} />
          </label>
        </div>
        <label>
          PDF · সর্বোচ্চ ৩ MB · সর্বোচ্চ ২০ page
          <input name="file" type="file" accept="application/pdf" required />
        </label>
        <label className="rp-check">
          <input type="checkbox" name="rights" required />
          এই প্রশ্নপত্র ব্যবহারের প্রয়োজনীয় অনুমতি আছে
        </label>
        <label className="rp-check">
          <input type="checkbox" name="published" />
          Library-তে প্রকাশ করুন (আগে preview যাচাই করা ভালো)
        </label>
        <button disabled={busy}>{busy ? "সংরক্ষণ হচ্ছে…" : "PDF Upload"}</button>
        <p role="status">{message}</p>
      </form>
      <section className="rp-panel">
        <h2>প্রশ্নপত্র পরিচালনা</h2>
        {!papers.length && <p>এখনও PDF নেই।</p>}
        {papers.map((p) => (
          <div className="rp-admin-row" key={p.id}>
            <div>
              <strong>{p.title}</strong>
              <p>
                {p.grade} · {p.subject} · {p.year} · {p.source}
              </p>
            </div>
            <a href={`/ready-papers/${p.id}?preset=1`}>Preview ও preset</a>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await updateReadyPaper(p.id, {
                    ...p,
                    published: !p.published,
                  });
                  setMessage(r.ok ? "প্রকাশের অবস্থা বদলেছে" : r.error);
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {p.published ? "প্রকাশ বন্ধ" : "প্রকাশ করুন"}
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
