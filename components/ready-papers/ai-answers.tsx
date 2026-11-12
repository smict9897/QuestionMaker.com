"use client";
import { useEffect, useRef, useState } from "react";
import type { ReadyAIJob } from "@/lib/ready-ai";
export default function AIAnswers({
  receiptId,
  onJob,
  onPrint,
}: {
  receiptId: string;
  onJob: (job: ReadyAIJob | null) => void;
  onPrint: () => void;
}) {
  const [job, setJob] = useState<ReadyAIJob | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [cycle, setCycle] = useState(0);
  const callback = useRef(onJob);
  callback.current = onJob;
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setJob(null);
    callback.current(null);
    setBusy(true);
    setMessage("কেনা প্রশ্নপত্রের AI উত্তর প্রস্তুত করছি…");
    async function request(run: boolean, retry = false) {
      const response = await fetch("/api/ready-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ receiptId, run, retry }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "AI উত্তর সংরক্ষণ হয়নি।");
      if (live) {
        setJob(data.job);
        callback.current(data.job);
      }
      return data as { job: ReadyAIJob; configured: boolean };
    }
    (async () => {
      try {
        let data = await request(false, cycle > 0);
        while (live) {
          if (!data.configured) {
            setMessage(
              "স্ক্যান/PDF পড়ার AI সংযোগ নেই। অ্যাডমিনকে READY_OCR_URL ও READY_OCR_TOKEN যুক্ত করতে হবে। প্রশ্নপত্র ব্যবহার করা যাবে; উত্তর এখনো প্রস্তুত হয়নি।",
            );
            break;
          }
          const pages = Object.values(data.job.pages);
          if (
            !pages.some((p) => p.status === "pending" || p.status === "running")
          ) {
            setMessage(
              pages.some((p) => p.status === "error")
                ? "কিছু পৃষ্ঠার উত্তর তৈরি হয়নি। ফাঁকা আছে; Retry করতে পারেন।"
                : "AI উত্তর অ্যাকাউন্টে সংরক্ষিত। ফাঁকা ঘরগুলো সমাধান করা যায়নি।",
            );
            break;
          }
          if (pages.some((p) => p.status === "running")) {
            await new Promise((r) => setTimeout(r, 5000));
            if (!live) break;
            data = await request(false);
          } else data = await request(true);
        }
      } catch (e) {
        if (live)
          setMessage(
            e instanceof Error
              ? e.message
              : "AI উত্তর তৈরি হয়নি। আবার চেষ্টা করুন।",
          );
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [receiptId, cycle]);
  const pages = Object.entries(job?.pages ?? {}),
    done = pages.filter(([, p]) => p.status === "done").length;
  return (
    <section className="rp-panel rp-ai-panel" data-noprint>
      <span className="rp-tag">AI উত্তরপত্র</span>
      <h2>আপনার প্রশ্নগুলোর AI উত্তর</h2>
      <p className="rp-ai-warning">
        AI-তৈরি উত্তর—যাচাই প্রয়োজন। মডেল ভুল করতে পারে। অস্পষ্ট/অনিশ্চিত উত্তর ফাঁকা
        রাখা হয়েছে; এটি অ্যাডমিন-অনুমোদিত উত্তরমালা নয়।
      </p>
      <p role="status">
        {message}{" "}
        {pages.length > 0 &&
          `${pages.length}টির মধ্যে ${done} পৃষ্ঠার চেষ্টা সম্পন্ন।`}
      </p>
      <div className="rp-toolbar">
        <button disabled={!job} onClick={onPrint}>
          AI উত্তর দেখুন / Print
        </button>
        <button disabled={busy} onClick={() => setCycle((c) => c + 1)}>
          {busy ? "উত্তর প্রস্তুত হচ্ছে…" : "Retry / সংরক্ষিত অবস্থা দেখুন"}
        </button>
      </div>
      <p className="rp-muted">
        Retry-তে প্রশ্নপত্রের টাকা কাটবে না। প্রস্তুত উত্তর পুনরায় তৈরি হয় না। ব্যর্থ
        পৃষ্ঠায় সর্বোচ্চ ৩টি চেষ্টা; ট্যাব বন্ধ করলে ফিরে এসে অবস্থা দেখা যাবে।
      </p>
      {job && (
        <details>
          <summary>AI উত্তরগুলো এখানেই দেখুন</summary>
          {pages.map(([n, p]) => (
            <div key={n} className="rp-ai-page">
              <h3>মূল প্রশ্ন পৃষ্ঠা {n}</h3>
              {p.result ? (
                <>
                  <p className="rp-muted">
                    {p.result.complete
                      ? "পৃষ্ঠার প্রশ্ন পড়ার চেষ্টা সম্পন্ন।"
                      : "সব প্রশ্ন পড়া নিশ্চিত হয়নি—মূল প্রশ্নের সঙ্গে নম্বর মিলিয়ে দেখুন।"}
                  </p>
                  {p.result.questions.length ? (
                    p.result.questions.map((q, i) => (
                      <div key={i} className="rp-ai-answer">
                        <strong>
                          {q.number}. {q.question}
                        </strong>
                        <p>
                          {q.answer ||
                            "________________ (সমাধান অনিশ্চিত / ফাঁকা)"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>প্রশ্ন পড়া যায়নি। উত্তর ফাঁকা।</p>
                  )}
                </>
              ) : (
                <p>
                  {p.error ||
                    (p.status === "running"
                      ? "AI চেষ্টা করছে…"
                      : "এখনো প্রস্তুত নয়।")}
                </p>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
export function AIAnswerSheets({
  job,
  selected,
}: {
  job: ReadyAIJob | null;
  selected: number[];
}) {
  const sheets: {
    page: number;
    blocks: {
      number: string;
      question: string;
      answer: string;
      continuation: boolean;
    }[];
    note: string;
  }[] = [];
  for (const page of selected) {
    const p = job?.pages[page];
    const blocks: {
      number: string;
      question: string;
      answer: string;
      continuation: boolean;
    }[] = [];
    for (const q of p?.result?.questions ?? []) {
      const answer = q.answer || "________________";
      for (let start = 0; start < answer.length; start += 600)
        blocks.push({
          number: q.number,
          question: start === 0 ? q.question.slice(0, 150) : "",
          answer: answer.slice(start, start + 600),
          continuation: start > 0,
        });
    }
    const note = p?.result
      ? p.result.complete
        ? ""
        : "সব প্রশ্ন পড়া নিশ্চিত হয়নি। মূল প্রশ্নের সঙ্গে মিলিয়ে দেখুন।"
      : p?.error || "এই পৃষ্ঠার AI উত্তর এখনো প্রস্তুত নয়।";
    if (!blocks.length)
      sheets.push({
        page,
        blocks: [],
        note: note || "প্রশ্ন পড়া যায়নি; উত্তর ফাঁকা।",
      });
    for (let i = 0; i < blocks.length; i += 2)
      sheets.push({ page, blocks: blocks.slice(i, i + 2), note });
  }
  return (
    <>
      {sheets.map((s, i) => (
        <article className="rp-print-sheet rp-ai-sheet" key={i}>
          <header className="rp-print-header">
            <h2>AI-তৈরি উত্তরপত্র</h2>
            <p>
              মূল প্রশ্ন পৃষ্ঠা {s.page} · উত্তরপত্র {i + 1}
            </p>
            <p>যাচাই প্রয়োজন · ফাঁকা উত্তর সমাধান করা যায়নি</p>
          </header>
          {s.note && <p>{s.note}</p>}
          {s.blocks.map((q, j) => (
            <section className="rp-ai-answer" key={j}>
              <strong>
                {q.number}
                {q.continuation ? " (চলমান)" : "."} {q.question}
              </strong>
              <p>{q.answer}</p>
            </section>
          ))}
        </article>
      ))}
    </>
  );
}
