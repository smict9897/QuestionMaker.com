"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadReadyPaper, updateReadyPaper } from "@/app/actions/ready-papers";
import type { ReadyPaper } from "@/lib/ready-papers";
import ReadyClassSubject, { type ReadyCatalog } from "./class-subject";
export default function ReadyUpload({
  papers,
  catalog,
  storageReady,
}: {
  papers: ReadyPaper[];
  catalog: ReadyCatalog;
  storageReady: boolean;
}) {
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      {!storageReady && (
        <section className="rp-panel" role="alert">
          <h2>PDF storage সংযুক্ত করা বাকি</h2>
          <p>
            Vercel-এ এই QuestionMaker প্রজেক্টের জন্য আলাদা public Blob store তৈরি
            ও সংযুক্ত করুন, তারপর redeploy করুন। সংযোগ না হওয়া পর্যন্ত PDF upload হবে
            না।
          </p>
          <p>
            Storage → Create Database / Store → Blob → Connect Project। Token
            এখানে পাঠাবেন না।
          </p>
        </section>
      )}
      <form
        key={formKey}
        className="rp-panel rp-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (!storageReady) {
            setMessage("আগে Vercel Blob storage সংযুক্ত করে redeploy করুন।");
            return;
          }
          const form = e.currentTarget,
            fd = new FormData(form);
          const file = fd.get("file");
          if (
            !(file instanceof File) ||
            file.size < 5 ||
            file.size > 3_000_000
          ) {
            setMessage(
              "প্রতিটি PDF part সর্বোচ্চ ৩ MB হতে পারবে। বড় ফাইল ছোট অংশে ভাগ করে দিন।",
            );
            return;
          }
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
        <p className="rp-muted">
          একই পরীক্ষা ও বিষয়ে একাধিক PDF upload করতে পারবেন। শিরোনামে Part 1,
          Part 2 লিখুন। প্রতিটি upload আলাদা থাকবে; আগের PDF replace হবে না।
        </p>
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
            <input
              name="title"
              placeholder="যেমন: ICT মডেল টেস্ট — Part 1"
              required
              minLength={3}
              maxLength={160}
            />
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
        <button disabled={busy || !storageReady}>
          {busy ? "সংরক্ষণ হচ্ছে…" : "PDF Upload"}
        </button>
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
