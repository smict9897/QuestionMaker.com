"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Sparkles,
  FileText,
  BookOpen,
  ImagePlus,
  Brain,
  Check,
  Database,
  Lightbulb,
} from "lucide-react";
import "./preparation-popup.css";
export default function PreparationPopup({
  subject,
  stage = 0,
  progress,
  error,
  children,
}: {
  subject: string;
  stage?: number;
  progress?: number;
  error?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = old;
    };
  }, []);
  const steps = [
    "নির্বাচিত বিষয় ও অধ্যায় পরীক্ষা হচ্ছে…",
    `${subject} বিষয়ের প্রশ্নভান্ডার যাচাই ও প্রশ্ন প্রস্তুত হচ্ছে…`,
    "প্রস্তুত প্রশ্নগুলো নির্বাচনের জন্য সাজানো হচ্ছে…",
  ];
  return (
    <dialog
      ref={ref}
      className={`prep-popup${error ? " prep-failed" : ""}`}
      aria-labelledby="prep-title"
      aria-describedby="prep-status"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="prep-badge">
        <Sparkles size={19} />
        QuestionMakerBd AI
      </div>
      <div className="prep-art" aria-hidden="true">
        <div className="prep-ring" />
        <div className="prep-glow" />
        <div className="prep-document">
          <FileText size={65} strokeWidth={1.8} />
          <span className="prep-scan" />
        </div>
        <span className="prep-satellite prep-book">
          <BookOpen />
        </span>
        <span className="prep-satellite prep-image">
          <ImagePlus />
        </span>
        <span className="prep-satellite prep-brain">
          <Brain />
        </span>
      </div>
      <h1 id="prep-title">
        আপনার প্রশ্নপত্র তৈরি হচ্ছে<span className="prep-dots">…</span>
      </h1>
      <ol className="prep-steps">
        {steps.map((text, i) => {
          const Icon =
            i < stage
              ? Check
              : i === 0
                ? BookOpen
                : i === 1
                  ? BookOpen
                  : Database;
          return (
            <li
              key={i}
              className={
                i < stage ? "done" : i === stage ? "active" : "waiting"
              }
              aria-current={i === stage ? "step" : undefined}
            >
              <span>
                <Icon size={23} />
              </span>
              {text}
            </li>
          );
        })}
      </ol>
      <div className="prep-progress">
        <progress
          aria-label="প্রশ্নপত্র প্রস্তুতির অগ্রগতি"
          max={100}
          value={progress}
        />
        <div id="prep-status" role="status">
          <span>
            {error
              ? "প্রস্তুতি সম্পন্ন হয়নি"
              : stage === 0
                ? "নির্বাচন যাচাই হচ্ছে"
                : stage === 2
                  ? "নির্বাচন পেজ খোলা হচ্ছে"
                  : "প্রশ্ন প্রস্তুত হচ্ছে"}
          </span>
          {progress !== undefined && (
            <strong>{Math.floor(progress).toLocaleString("bn-BD")}%</strong>
          )}
        </div>
      </div>
      <aside>
        <Lightbulb size={23} />
        <span>
          টিপ: শিক্ষকের নাম, প্রতিষ্ঠান ও পরীক্ষার তথ্য নিজের মতো লিখতে পারবেন
        </span>
      </aside>
      {error && (
        <div role="alert" className="prep-error">
          {error}
          {children}
        </div>
      )}
    </dialog>
  );
}
