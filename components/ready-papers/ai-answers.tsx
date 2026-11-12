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
  const blankRetry = useRef(false);
  const callback = useRef(onJob);
  callback.current = onJob;
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setJob(null);
    callback.current(null);
    setBusy(true);
    setMessage("কেনা প্রশ্নপত্রের AI উত্তর প্রস্তুত করছি…");
    async function request(
      run: boolean,
      retry = false,
      extra: Record<string, unknown> = {},
    ) {
      const response = await fetch("/api/ready-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ receiptId, run, retry, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "AI উত্তর সংরক্ষণ হয়নি।");
      if (live) {
        setJob(data.job);
        callback.current(data.job);
      }
      return data as {
        job: ReadyAIJob;
        configured: boolean;
        work?: { page: number; url: string; lease: string };
      };
    }
    (async () => {
      try {
        let data = await request(false, cycle > 0, {
          retryBlanks: blankRetry.current,
        });
        blankRetry.current = false;
        while (live) {
          if (!data.configured) {
            setMessage(
              "DeepSeek সংযোগ নেই। অ্যাডমিনকে DEEPSEEK_API_KEY যুক্ত করতে হবে। প্রশ্নপত্র ব্যবহার করা যাবে; উত্তর এখনো প্রস্তুত হয়নি।",
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
                : "AI-এর চেষ্টার ফল অ্যাকাউন্টে সংরক্ষিত। ফাঁকা উত্তর তৈরি হয়নি—কারণ দেখুন বা ফাঁকা উত্তর আবার চেষ্টা করুন।",
            );
            break;
          }
          if (pages.some((p) => p.status === "running")) {
            await new Promise((r) => setTimeout(r, 5000));
            if (!live) break;
            data = await request(false);
          } else {
            data = await request(true);
            if (data.work) {
              const work = data.work;
              const { readPurchasedPage } =
                await import("@/lib/ready-browser-ocr");
              let ocr;
              try {
                ocr = await readPurchasedPage(
                  work.url,
                  work.page,
                  controller.signal,
                  (text) => {
                    if (live) setMessage(text);
                  },
                );
              } catch (e) {
                if (live)
                  await request(false, false, {
                    page: work.page,
                    lease: work.lease,
                    ocrFailed: true,
                  });
                throw e;
              }
              if (!live) break;
              setMessage(
                `পৃষ্ঠা ${work.page}: DeepSeek লেখা সংশোধন → উত্তর তৈরি করছে…`,
              );
              data = await request(false, false, {
                page: work.page,
                lease: work.lease,
                ocr,
              });
            }
          }
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
  const questions = pages.flatMap(([, p]) => p.result?.questions ?? []),
    answered = questions.filter((q) => !!q.answer).length;
  return (
    <section className="rp-panel rp-ai-panel" data-noprint>
      <span className="rp-tag">AI উত্তরপত্র</span>
      <h2>আপনার প্রশ্নগুলোর AI উত্তর</h2>
      <p className="rp-muted">
        OCR আপনার ব্রাউজারেই চলে—আলাদা hosting লাগবে না। প্রথমবার ভাষার ফাইল
        নামবে; ট্যাব খোলা রাখুন। দুর্বল মোবাইলে ধীর হতে পারে। OCR-এর লেখা DeepSeek-এ
        যায়; DeepSeek API-এর খরচ আলাদা।
      </p>
      <p className="rp-muted">
        ধাপ: লেখা বের করা → AI সংশোধন → উত্তর তৈরি। ✓ মানে ধাপ সম্পন্ন; সঠিকতা বা
        অ্যাডমিন যাচাই নয়। সংশোধনে DeepSeek-এর অতিরিক্ত API ব্যবহার হয়।
      </p>
      <p className="rp-ai-warning">
        AI-তৈরি উত্তর—যাচাই প্রয়োজন। OCR-এর পড়া লেখা ও মডেলের উত্তর দুটোতেই ভুল হতে
        পারে। অস্পষ্ট/অনিশ্চিত উত্তর ফাঁকা রাখা হয়েছে; এটি অ্যাডমিন-অনুমোদিত উত্তরমালা
        নয়।
      </p>
      <p role="status">
        {message}{" "}
        {pages.length > 0 &&
          `${pages.length}টির মধ্যে ${done} পৃষ্ঠার চেষ্টা সম্পন্ন।`}
      </p>
      <p>
        {answered}টি উত্তর পাওয়া গেছে · {questions.length - answered}টি চিহ্নিত
        প্রশ্ন ফাঁকা। OCR কিছু প্রশ্ন বাদ দিয়ে থাকতে পারে।
      </p>
      <div className="rp-toolbar">
        <button disabled={!job} onClick={onPrint}>
          AI উত্তর দেখুন / Print
        </button>
        <button disabled={busy} onClick={() => setCycle((c) => c + 1)}>
          {busy ? "উত্তর প্রস্তুত হচ্ছে…" : "Retry / সংরক্ষিত অবস্থা দেখুন"}
        </button>
        <button
          disabled={
            busy ||
            !pages.some(
              ([, p]) =>
                p.status === "done" &&
                (!p.result?.questions.length ||
                  p.result.questions.some((q) => !q.answer)) &&
                (p.solverVersion !== 4 || (p.blankRetries ?? 0) < 2),
            )
          }
          onClick={() => {
            blankRetry.current = true;
            setCycle((c) => c + 1);
          }}
        >
          ফাঁকা উত্তর আবার চেষ্টা করুন
        </button>
      </div>
      <p className="rp-muted">
        Retry-তে প্রশ্নপত্রের টাকা কাটবে না। পাওয়া উত্তর রাখা হবে। ফাঁকা উত্তরের জন্য
        আলাদা বোতামে সর্বোচ্চ ২ বার নতুন চেষ্টা করা যাবে। ব্যর্থ পৃষ্ঠায় সর্বোচ্চ ৩টি
        চেষ্টা; ট্যাব বন্ধ করলে ফিরে এসে অবস্থা দেখা যাবে।
      </p>
      {job && (
        <details>
          <summary>AI উত্তরগুলো এখানেই দেখুন</summary>
          {pages.map(([n, p]) => (
            <div key={n} className="rp-ai-page">
              <h3>মূল প্রশ্ন পৃষ্ঠা {n}</h3>
              {p.result ? (
                <>
                  {p.result.transcription && (
                    <section className="rp-transcription">
                      <p>
                        ✓ লেখা বের করা ·{" "}
                        {p.result.transcription.status === "accepted"
                          ? "✓ সংশোধন ধাপ সম্পন্ন (AI)"
                          : "⚠ সংশোধন গ্রহণ হয়নি—মূল লেখা রাখা হয়েছে"}{" "}
                        · ✓ উত্তর তৈরির চেষ্টা সম্পন্ন
                      </p>
                      <p className="rp-ai-warning">
                        {p.result.transcription.warning}
                      </p>
                      <details>
                        <summary>মূল লেখা ও সংশোধিত লেখা / পরিবর্তন দেখুন</summary>
                        <div className="rp-transcription-compare">
                          <div>
                            <h4>মূল extracted লেখা</h4>
                            <pre>{p.result.transcription.originalText}</pre>
                          </div>
                          <div>
                            <h4>AI সংশোধিত / ব্যবহৃত লেখা</h4>
                            <pre>{p.result.transcription.correctedText}</pre>
                          </div>
                        </div>
                        <ul>
                          {p.result.transcription.changes.map((c, i) => (
                            <li key={i}>
                              <del>{c.before}</del> → <ins>{c.after}</ins> —{" "}
                              {c.reason}
                            </li>
                          ))}
                        </ul>
                        {!p.result.transcription.changes.length && (
                          <p>কোনো সংশোধন প্রয়োগ করা হয়নি।</p>
                        )}
                        {p.result.transcription.uncertainties.map((note, i) => (
                          <p key={i}>⚠ {note}</p>
                        ))}
                      </details>
                    </section>
                  )}
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
                          {q.answer
                            ? `✓ ${q.answer}`
                            : "________________ (সমাধান অনিশ্চিত / ফাঁকা)"}
                        </p>
                        {!q.answer && (
                          <small>
                            {q.blankReason ||
                              "আগের ফলের কারণ পাওয়া যায়নি—ফাঁকা উত্তর আবার চেষ্টা করুন।"}
                          </small>
                        )}
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
      const answer = q.answer
        ? `✓ ${q.answer}`
        : `________________\n${q.blankReason || "সমাধান পাওয়া যায়নি।"}`;
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
