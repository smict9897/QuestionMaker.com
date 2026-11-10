"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkPaperTopics,
  preparePaperTopic,
} from "@/app/actions/prepare-paper";
import "./paper-preparation.css";
export default function PaperPreparation({
  category,
  subject,
  topics,
  append,
}: {
  category: string;
  subject: string;
  topics: string[];
  append: boolean;
}) {
  const taskCache = useRef(
    new Map<string, ReturnType<typeof preparePaperTopic>>(),
  );
  const router = useRouter(),
    started = useRef(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("অনুমোদিত প্রশ্নব্যাংক পরীক্ষা হচ্ছে…"),
    [done, setDone] = useState(0),
    [total, setTotal] = useState(0),
    [retry, setRetry] = useState(0),
    [generated, setGenerated] = useState(0);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let stopped = false;
    (async () => {
      setError("");
      setDone(0);
      setTotal(0);
      setGenerated(0);
      setMessage("অনুমোদিত প্রশ্নব্যাংক পরীক্ষা হচ্ছে…");
      try {
        const plan = await checkPaperTopics({ category, subject, topics });
        if (stopped) return;
        if (!plan.ok) {
          setError(plan.error);
          return;
        }
        setTotal(plan.topics.length);
        for (let i = 0; i < plan.topics.length; i++) {
          if (stopped) return;
          setMessage(
            `${plan.topics[i]} — প্রশ্ন খোঁজা হচ্ছে; না থাকলে AI তৈরি করবে…`,
          );
          const key = JSON.stringify([category, subject, plan.topics[i]]);
          if (!taskCache.current.has(key))
            taskCache.current.set(
              key,
              preparePaperTopic({
                category,
                subject,
                topics: [plan.topics[i]],
              }),
            );
          const result = await taskCache.current.get(key)!;
          if (stopped) return;
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone(i + 1);
          if (result.generated) setGenerated((n) => n + result.count);
        }
        if (stopped) return;
        setMessage("প্রশ্ন প্রস্তুত। নির্বাচন পেজ খোলা হচ্ছে…");
        const params = new URLSearchParams({ category, subject });
        topics.forEach((t) => params.append("topic", t));
        if (append) params.set("append", "1");
        router.replace(`/question-builder/create?${params}`);
      } catch {
        if (!stopped) setError("সংযোগ বিচ্ছিন্ন হয়েছে। আবার চেষ্টা করুন।");
      }
    })();
    return () => {
      stopped = true;
      started.current = false;
    };
  }, [category, subject, topics, append, router, retry]);
  return (
    <main className="paper-preparation">
      <section className="preparation-card" aria-busy={!error}>
        <span className="preparation-badge">✧ প্রশ্নপত্র প্রস্তুতি</span>
        <div
          className={`preparation-orbit ${error ? "stopped" : ""}`}
          aria-hidden="true"
        >
          <span>▤</span>
        </div>
        <h1>আপনার প্রশ্নপত্র প্রস্তুত হচ্ছে…</h1>
        <p className="preparation-selection">
          {category} · {subject}
        </p>
        <ol>
          <li>✓ নির্বাচিত বিষয় ও অধ্যায় পরীক্ষা</li>
          <li>অনুমোদিত প্রশ্ন থাকলে সেখান থেকেই ব্যবহার</li>
          <li>
            না থাকলে AI প্রশ্ন তৈরি ও অ্যাডমিনের অপেক্ষমাণ তালিকায় সংরক্ষণ
          </li>
        </ol>
        <p role="status" className="preparation-status">
          {message}
        </p>
        {total > 0 && (
          <>
            <progress max={total} value={done} />
            <p>
              {done.toLocaleString("bn-BD")} / {total.toLocaleString("bn-BD")}টি
              অধ্যায় প্রস্তুত
            </p>
          </>
        )}
        {generated > 0 && (
          <p>{generated.toLocaleString("bn-BD")}টি নতুন প্রশ্ন তৈরি হয়েছে।</p>
        )}
        <aside>
          AI প্রশ্ন আপনি এখন ব্যবহার করতে পারবেন। অ্যাডমিন অনুমোদনের আগে অন্য
          ব্যবহারকারীরা পাবেন না। AI-এর উত্তর ব্যবহারের আগে যাচাই করুন।
        </aside>
        {error && (
          <div role="alert">
            <p className="preparation-error">{error}</p>
            <button
              onClick={() => {
                started.current = false;
                taskCache.current.clear();
                setRetry((n) => n + 1);
              }}
            >
              আবার চেষ্টা করুন
            </button>{" "}
            <a href="/question-builder">নির্বাচনে ফিরুন</a>
          </div>
        )}
      </section>
    </main>
  );
}
