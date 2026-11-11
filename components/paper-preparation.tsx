"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkPaperTopics,
  preparePaperTopic,
} from "@/app/actions/prepare-paper";
import PreparationPopup from "./preparation-popup";
export default function PaperPreparation({
  category,
  subject,
  topics,
  append,
  questionType = "ALL",
}: {
  category: string;
  subject: string;
  topics: string[];
  append: boolean;
  questionType?: string;
}) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState<number | undefined>(undefined);
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
      setStage(0);
      setProgress(undefined);
      setDone(0);
      setTotal(0);
      setGenerated(0);
      setMessage("অনুমোদিত প্রশ্নব্যাংক পরীক্ষা হচ্ছে…");
      try {
        const plan = await checkPaperTopics({
          category,
          subject,
          topics,
          questionType,
        });
        if (stopped) return;
        if (!plan.ok) {
          setError(plan.error);
          return;
        }
        setTotal(plan.topics.length);
        setStage(1);
        for (let i = 0; i < plan.topics.length; i++) {
          if (stopped) return;
          let ready = false;
          for (let batch = 0; batch < 12; batch++) {
            if (stopped) return;
            setMessage(
              `${plan.topics[i]} — প্রশ্ন প্রস্তুত হচ্ছে (ধাপ ${batch + 1})…`,
            );
            const key = JSON.stringify([
              category,
              subject,
              plan.topics[i],
              batch,
              questionType,
            ]);
            if (!taskCache.current.has(key))
              taskCache.current.set(
                key,
                preparePaperTopic({
                  questionType,
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
            setMessage(
              `${plan.topics[i]} — ${result.count.toLocaleString("bn-BD")} / ৩০টি প্রশ্ন প্রস্তুত`,
            );
            setProgress(
              Math.min(
                99,
                Math.floor(
                  ((i + Math.min(result.count, 30) / 30) / plan.topics.length) *
                    100,
                ),
              ),
            );
            if (result.generated) setGenerated((n) => n + (result.added || 0));
            if (result.count >= 30) {
              ready = true;
              break;
            }
          }
          if (!ready) {
            setError(
              "এই দফায় ৩০টি প্রশ্ন সম্পূর্ণ হয়নি। তৈরি প্রশ্নগুলো রাখা আছে। আবার চেষ্টা করলে বাকি অংশ পূরণ হবে।",
            );
            return;
          }
          setDone(i + 1);
        }
        if (stopped) return;
        setStage(2);
        setProgress(100);
        setMessage("প্রশ্ন প্রস্তুত। নির্বাচন পেজ খোলা হচ্ছে…");
        const params = new URLSearchParams({ category, subject, questionType });
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
  }, [category, subject, topics, append, questionType, router, retry]);
  return (
    <PreparationPopup
      subject={subject}
      stage={stage}
      progress={progress}
      error={error}
    >
      {error && (
        <>
          <button
            type="button"
            onClick={() => {
              started.current = false;
              taskCache.current.clear();
              setRetry((n) => n + 1);
            }}
          >
            আবার চেষ্টা করুন
          </button>
          <a href="/question-builder">নির্বাচনে ফিরুন</a>
        </>
      )}
    </PreparationPopup>
  );
}
