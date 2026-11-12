"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateReadyPaper } from "@/app/actions/ready-papers";
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
  const importJob = useRef<ReturnType<
    typeof import("@/lib/ready-auto-import").createReadyImport
  > | null>(null);
  useEffect(() => () => importJob.current?.cancel(), []);
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
            !importJob.current &&
            (!(file instanceof File) || file.size < 5 || file.size > 50_000_000)
          ) {
            setMessage("মূল PDF সর্বোচ্চ ৫০ MB। বড় হলে PDF কমপ্রেস বা ভাগ করুন।");
            return;
          }
          setBusy(true);
          setMessage("Upload হচ্ছে…");
          try {
            const { createReadyImport } =
              await import("@/lib/ready-auto-import");
            if (!importJob.current) importJob.current = createReadyImport(fd);
            const count = await importJob.current.run(setMessage);
            importJob.current = null;
            form.reset();
            setFormKey((k) => k + 1);
            setMessage(`${count}টি পার্ট সংরক্ষিত। Preview যাচাই করুন।`);
            router.refresh();
          } catch (e) {
            setMessage(
              (e instanceof Error ? e.message : "সংযোগ সমস্যা।") +
                " Retry চাপলে সফল পার্ট আবার upload হবে না।",
            );
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>নতুন প্রশ্নপত্র PDF</h2>
        <p className="rp-muted">
          একটি বড় PDF দিন—সিস্টেম স্বয়ংক্রিয়ভাবে Part 1, Part 2… বানাবে। প্রতি পার্ট
          সর্বোচ্চ ১০ MB / ১০০ পৃষ্ঠা। পুরোনো ফাইল বদলাবে না; লেখা rasterize বা ঝাপসা
          করা হবে না।
        </p>
        <p className="rp-muted">
          Import শেষ হওয়া পর্যন্ত এই ট্যাব খোলা রাখুন। একই ট্যাবে Retry করলে সফল পার্ট
          আবার upload হবে না। খুব বড়/জটিল PDF হলে কম্পিউটার ব্যবহার করুন।
        </p>
        <fieldset
          disabled={busy || !!importJob.current}
          className="rp-import-fields"
        >
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
            মূল PDF · সর্বোচ্চ ৫০ MB / ৫০০ পৃষ্ঠা · Automatic split
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
        </fieldset>
        <button disabled={busy || !storageReady}>
          {busy
            ? "ভাগ ও সংরক্ষণ হচ্ছে…"
            : importJob.current
              ? "Retry Import"
              : "PDF ভাগ করে Upload"}
        </button>
        {busy && (
          <button type="button" onClick={() => importJob.current?.cancel()}>
            Import থামান (সফল পার্ট থাকবে)
          </button>
        )}
        {importJob.current && !busy && (
          <button
            type="button"
            onClick={() => {
              importJob.current = null;
              setMessage("নতুন import প্রস্তুত। আগের সফল পার্টগুলো রাখা হয়েছে।");
            }}
          >
            এই অসমাপ্ত import ছেড়ে নতুন ফাইল দিন
          </button>
        )}
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
                {p.groupTitle && (
                  <>
                    {" "}
                    · মূল ফাইল: {p.groupTitle} · পৃষ্ঠা {p.pageStart}–{p.pageEnd}
                  </>
                )}
              </p>
            </div>
            {p.groupId && (
              <a href={`/ready-papers?group=${p.groupId}`}>এই ফাইলের সব পার্ট</a>
            )}
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
