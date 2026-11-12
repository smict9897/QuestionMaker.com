"use client";
import { readReadyPageText } from "@/lib/ready-paper-browser";
import { useState } from "react";
import { parseAnswerRows, type ReadyAnswer } from "@/lib/ready-answers";
import {
  saveReadyAnswers,
  explainReadyQuestion,
} from "@/app/actions/ready-answers";
export default function AnswerAssistant({
  id,
  url,
  pages,
  selected,
  admin,
  entries,
  onSaved,
  onPrint,
}: {
  id: string;
  url: string;
  pages: string[];
  selected: number[];
  admin: boolean;
  entries: ReadyAnswer[];
  onSaved: (entry: ReadyAnswer) => void;
  onPrint: (kind: "blank" | "answers") => void;
}) {
  const [extracted, setExtracted] = useState("");
  const [page, setPage] = useState(1),
    [source, setSource] = useState(1),
    [count, setCount] = useState(25),
    [label, setLabel] = useState(""),
    [raw, setRaw] = useState(""),
    [answers, setAnswers] = useState<ReadyAnswer["answers"]>([]),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [question, setQuestion] = useState(""),
    [explanation, setExplanation] = useState("");
  function reset() {
    setConfirmed(false);
    setAnswers([]);
  }
  return (
    <details className="rp-panel" data-noprint>
      <summary>MCQ উত্তরপত্র ও AI সহকারী</summary>
      <p>
        অনুমোদিত উত্তরমালা: {entries.filter((e) => e.approved).length} পেজ। পেজের
        ক্রম বদলালেও মূল প্রশ্ন page অনুযায়ী উত্তর মিলবে।
      </p>
      <div className="rp-toolbar">
        <button disabled={!selected.length} onClick={() => onPrint("blank")}>
          ফাঁকা উত্তরপত্র Preview
        </button>
        <button disabled={!selected.length} onClick={() => onPrint("answers")}>
          অনুমোদিত উত্তরমালা Preview
        </button>
      </div>
      {!admin && (
        <p>
          উত্তর নেই বা অমীমাংসিত হলে অ্যাডমিনকে জানান। কোনো AI খসড়াকে যাচাইকৃত উত্তর
          বলা হয় না।
        </p>
      )}
      {admin && (
        <>
          <h3>অ্যাডমিন · উৎস দেখে উত্তর যাচাই</h3>
          <div className="rp-fields">
            <label>
              মূল প্রশ্ন page
              <select
                value={page}
                onChange={(e) => {
                  setPage(+e.target.value);
                  reset();
                }}
              >
                {pages.map((_, i) => (
                  <option key={i} value={i + 1}>
                    Page {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              উত্তরমালার উৎস page
              <select
                value={source}
                onChange={(e) => {
                  setSource(+e.target.value);
                  setConfirmed(false);
                }}
              >
                {pages.map((_, i) => (
                  <option key={i} value={i + 1}>
                    Page {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              টেস্টের নাম
              <input
                maxLength={120}
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <label>
              প্রশ্নসংখ্যা
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => {
                  setCount(Math.min(100, Math.max(1, +e.target.value || 1)));
                  reset();
                }}
              />
            </label>
          </div>
          <div className="rp-page-grid">
            <img
              style={{ width: "100%" }}
              src={pages[page - 1]}
              alt="যাচাইয়ের মূল প্রশ্ন page"
            />
            <img
              style={{ width: "100%" }}
              src={pages[source - 1]}
              alt="যাচাইয়ের উৎস উত্তরমালা page"
            />
          </div>
          <p>
            শুধু এই টেস্টের উত্তর লিখুন/পেস্ট করুন: 1 K 2 L 3 M 4 N। K→ক, L→খ, M→গ,
            N→ঘ। PDF-এ অক্ষরের এই মিল নিজে যাচাই করুন। * / missing / duplicate
            উত্তর ? থাকবে। স্বয়ংক্রিয় OCR চালু নয়।
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setExtracted(await readReadyPageText(url, source));
                setMessage(
                  "Text layer নেওয়া হয়েছে; শুধু প্রয়োজনীয় টেস্টের উত্তর কপি করে নিচে দিন। বাংলা বিকৃত হলে হাতে লিখুন।",
                );
              } catch {
                setMessage("Text layer পড়া যায়নি; হাতে লিখুন।");
              } finally {
                setBusy(false);
              }
            }}
          >
            উৎস page-এর text সংগ্রহ করুন (OCR নয়)
          </button>
          {extracted && (
            <label>
              উৎসের অপরীক্ষিত text · একাধিক টেস্ট থাকলে পুরোটা পেস্ট করবেন না
              <textarea readOnly rows={5} value={extracted} />
            </label>
          )}
          <textarea
            aria-label="উৎসের উত্তর"
            rows={4}
            maxLength={10000}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setConfirmed(false);
            }}
          />
          <button
            onClick={() => {
              setAnswers(parseAnswerRows(raw, count));
              setConfirmed(false);
            }}
          >
            উত্তরগুলো সাজান
          </button>
          <button
            onClick={() => {
              const old = entries.find((e) => e.questionPage === page);
              if (old) {
                setAnswers(old.answers);
                setSource(old.sourcePage);
                setLabel(old.label);
                setCount(old.answers.length);
                setConfirmed(false);
              } else setMessage("এই page-এর saved উত্তর নেই।");
            }}
          >
            Saved উত্তর খুলুন
          </button>
          <div className="rp-fields">
            {answers.map((a, i) => (
              <label key={i}>
                প্রশ্ন {i + 1}
                {a === "?" ? " · যাচাই বাকি" : ""}
                <select
                  value={a}
                  onChange={(e) => {
                    setAnswers((v) =>
                      v.map((x, n) =>
                        n === i ? (e.target.value as typeof a) : x,
                      ),
                    );
                    setConfirmed(false);
                  }}
                >
                  {["?", "ক", "খ", "গ", "ঘ"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            মূল প্রশ্ন, প্রশ্নসংখ্যা, অপশনের ক্রম ও উৎসের উত্তর মিলিয়ে দেখেছি
          </label>
          <div className="rp-toolbar">
            {[false, true].map((approved) => (
              <button
                key={String(approved)}
                disabled={
                  busy ||
                  !answers.length ||
                  (approved && (!confirmed || answers.includes("?")))
                }
                onClick={async () => {
                  setBusy(true);
                  const entry = {
                    questionPage: page,
                    sourcePage: source,
                    label,
                    answers,
                    approved,
                  };
                  try {
                    const r = await saveReadyAnswers(id, entry);
                    setMessage(r.ok ? "উত্তরমালা সংরক্ষিত।" : r.error);
                    if (r.ok) onSaved(entry);
                  } catch {
                    setMessage("Save হয়নি।");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {approved ? "অনুমোদন ও Save" : "খসড়া Save / অনুমোদন প্রত্যাহার"}
              </button>
            ))}
          </div>
          <h3>AI ব্যাখ্যা · খসড়া, উত্তরমালা নয়</h3>
          <p>
            পরিষ্কার Unicode বাংলায় একটি প্রশ্ন, সব অপশন ও প্রয়োজনে প্রকাশনীর উত্তর
            দিন। পাঠানো লেখা DeepSeek-এ যাবে। PDF/ছবি পাঠানো হয় না। AI ভুল করতে
            পারে; ফল নিজে যাচাই করুন।
          </p>
          <textarea
            aria-label="AI প্রশ্ন ও অপশন"
            rows={5}
            maxLength={4000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            disabled={busy || question.trim().length < 10}
            onClick={async () => {
              setBusy(true);
              setExplanation("");
              try {
                const r = await explainReadyQuestion({ question });
                if (r.ok) setExplanation(r.text);
                else setMessage(r.error);
              } catch {
                setMessage("AI সংযোগ ব্যর্থ।");
              } finally {
                setBusy(false);
              }
            }}
          >
            AI দিয়ে ব্যাখ্যা খসড়া করুন
          </button>
          {explanation && (
            <div style={{ whiteSpace: "pre-wrap" }}>
              <strong>AI খসড়া · যাচাইকৃত নয়</strong>
              <p>{explanation}</p>
            </div>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </details>
  );
}
export function AnswerSheets({
  selected,
  entries,
  blank,
}: {
  selected: number[];
  entries: ReadyAnswer[];
  blank: boolean;
}) {
  return (
    <>
      {selected.flatMap((page, index) => {
        const entry = entries.find(
          (e) => e.questionPage === page && e.approved,
        );
        return Array.from(
          { length: Math.max(1, Math.ceil((entry?.answers.length || 0) / 25)) },
          (_, part) => (
            <article className="rp-print-sheet" key={`${page}:${part}`}>
              <header className="rp-print-header">
                <h2>{blank ? "MCQ উত্তরপত্র" : "অনুমোদিত উত্তরমালা"}</h2>
                <p>
                  নির্বাচিত ক্রম {index + 1} · মূল প্রশ্ন page {page} ·{" "}
                  {entry?.label || "টেস্ট"}
                </p>
                {blank && <p>নাম: __________________ রোল: __________</p>}
              </header>
              {!entry ? (
                <p>
                  এই প্রশ্ন page-এর যাচাইকৃত উত্তর/প্রশ্নসংখ্যা নেই। অ্যাডমিনের অনুমোদন
                  প্রয়োজন।
                </p>
              ) : (
                <>
                  <p>
                    উৎসের উত্তরমালা page {entry.sourcePage} · প্রশ্ন{" "}
                    {entry.answers.length}টি
                  </p>
                  <div className="rp-answer-grid">
                    {entry.answers
                      .slice(part * 25, (part + 1) * 25)
                      .map((a, i) => (
                        <div key={i}>
                          {part * 25 + i + 1}.{" "}
                          {blank ? "□ ক  □ খ  □ গ  □ ঘ" : a}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </article>
          ),
        );
      })}
    </>
  );
}
