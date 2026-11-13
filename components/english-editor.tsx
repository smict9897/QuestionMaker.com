"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type EnglishDraft, validateEnglishDraft } from "@/lib/english/draft";
import {
  englishOutputSchema,
  validateEnglishOutput,
} from "@/lib/english/generation";
import { saveEnglishPaper } from "@/app/actions/english-paper";
import HeaderPreview from "@/components/paper-builder/header-preview";
import RichTextField from "@/components/paper-builder/rich-text-field";
import RichPaperText from "@/components/paper-builder/rich-paper-text";
import HeaderManager from "@/components/paper-builder/header-manager";
import { restoreSettings } from "@/lib/paper-builder";
import { applyHeader } from "@/lib/paper-header";
import { headerFieldDefinitions } from "@/lib/paper-header";
import "./english-paper.css";
import "./english-theme.css";
import {
  englishBlueprint,
  englishMarksLabel,
  type EnglishGrade,
} from "@/lib/english/blueprints";
import EnglishDataChart from "@/components/english-data-chart";
import PaperSettingsPanel from "@/components/paper-builder/settings";
import { currentHeader } from "@/lib/paper-header";
export default function EnglishEditor({
  draftKey,
  initial,
}: {
  draftKey: string;
  initial: EnglishDraft;
}) {
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [answerMode, setAnswerMode] = useState(false),
    [dirty, setDirty] = useState(false);
  const latest = useRef(initial),
    past = useRef<EnglishDraft[]>([]),
    future = useRef<EnglishDraft[]>([]);
  function travel(direction: "undo" | "redo") {
    const from = direction === "undo" ? past : future,
      to = direction === "undo" ? future : past;
    const next = from.current.pop();
    if (!next) return;
    to.current.push(latest.current);
    const restored = { ...next, updatedAt: latest.current.updatedAt };
    latest.current = restored;
    setDraft(restored);
    setDirty(true);
    setMessage("পরিবর্তন সেভ করা হয়নি।");
  }
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [settingsOpen, setSettingsOpen] = useState(false),
    [edit, setEdit] = useState(false);
  const pageSettings = applyHeader(restoreSettings({}), draft.header);
  Object.assign(pageSettings.cfg, draft.layout, {
    fontSize: draft.fontSize,
    font: draft.font === "sans-serif" ? "hind" : draft.font,
  });
  const family =
    draft.font === "kalpurush"
      ? '"QmPaperKalpurush", var(--font-en), serif'
      : draft.font === "serif"
        ? "var(--font-en), Georgia, serif"
        : draft.font === "anek"
          ? "var(--qk-head), sans-serif"
          : draft.font === "adorsho"
            ? "AdorshoLipi, serif"
            : "var(--qk-body), sans-serif";
  const result = (() => {
    try {
      return validateEnglishOutput(draft.selection, draft.output);
    } catch {
      return null;
    }
  })();
  function update(next: EnglishDraft) {
    past.current = [...past.current.slice(-9), latest.current];
    future.current = [];
    latest.current = next;
    setDraft(next);
    setDirty(true);
    setMessage("পরিবর্তন সেভ করা হয়নি।");
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      validateEnglishDraft(draft);
      const response = await saveEnglishPaper(draftKey, draft);
      if (response.ok && response.updatedAt) {
        const changed = latest.current !== draft;
        const saved = { ...latest.current, updatedAt: response.updatedAt };
        latest.current = saved;
        setDraft(saved);
        setDirty(changed);
        setMessage(
          changed
            ? "সেভ হয়েছে; সেভ চলার সময় করা নতুন পরিবর্তন এখনও সেভ হয়নি।"
            : "সেভ হয়েছে।",
        );
      } else setMessage(response.error || "সেভ হয়নি।");
    } catch {
      setMessage(
        "কাঠামো, source, topic বা word limit বদলে গেছে। ঠিক করে সেভ করুন।",
      );
    } finally {
      setBusy(false);
    }
  }
  function editTask(
    index: number,
    patch: Partial<EnglishDraft["output"]["tasks"][number]>,
  ) {
    update({
      ...draft,
      output: {
        ...draft.output,
        tasks: draft.output.tasks.map((t, i) =>
          i === index ? { ...t, ...patch } : t,
        ),
      },
    });
  }
  return (
    <main className="english-workspace mx-auto max-w-6xl p-4">
      <div className="english-controls space-y-4">
        <h1 className="text-2xl font-bold">প্রশ্নপত্রের Page Setup — English</h1>
        <button onClick={() => setSettingsOpen(true)}>
          ⚙ Page Setup / সেটিংস
        </button>
        <div className="flex flex-wrap gap-4">
          <button
            disabled={!past.current.length || busy}
            onClick={() => travel("undo")}
          >
            Undo
          </button>
          <button
            disabled={!future.current.length || busy}
            onClick={() => travel("redo")}
          >
            Redo
          </button>
          <Link href="/question-builder/english/saved">আমার draft</Link>
          <Link href="/question-builder/english">নতুন প্রশ্নপত্র</Link>
          <button disabled={busy} onClick={save}>
            {busy ? "সেভ হচ্ছে…" : "সেভ করুন"}
          </button>
          <button
            disabled={!result}
            onClick={() => {
              if (dirty && !confirm("পরিবর্তন সেভ করা হয়নি। তবুও print করবেন?"))
                return;
              window.print();
            }}
          >
            Print / Save as PDF
          </button>
        </div>
        <p role="status">{message}</p>
        <p>
          AI-generated draft: প্রশ্ন, passage, grammar ও answer ব্যবহারের আগে নিজে
          যাচাই করুন। English draft আলাদা editor-এ রাখা হয়েছে; বাংলা builder-এর
          layout/settings বদলাবে না।
        </p>
        <label className="block">
          Draft name
          <input
            className="w-full rounded border p-2"
            maxLength={120}
            value={draft.name}
            onChange={(e) => update({ ...draft, name: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label>
            <input
              type="checkbox"
              disabled={!draft.selection.includeAnswers}
              checked={answerMode}
              onChange={(e) => setAnswerMode(e.target.checked)}
            />{" "}
            পৃথক উত্তরপত্র দেখুন/print করুন
          </label>
        </div>
        <HeaderManager
          settings={applyHeader(restoreSettings({}), draft.header)}
          update={(settings) => update({ ...draft, header: settings.header })}
        />
        <details>
          <summary>Header fields সরাসরি সম্পাদনা</summary>
          {headerFieldDefinitions.map(([key, label]) => (
            <label className="block p-2" key={key}>
              <input
                type="checkbox"
                checked={draft.header.fields[key].enabled}
                onChange={(e) =>
                  update({
                    ...draft,
                    header: {
                      ...draft.header,
                      fields: {
                        ...draft.header.fields,
                        [key]: {
                          ...draft.header.fields[key],
                          enabled: e.target.checked,
                        },
                      },
                    },
                  })
                }
              />
              {label}
              <input
                className="w-full rounded border p-2"
                maxLength={2000}
                value={draft.header.fields[key].value}
                onChange={(e) =>
                  update({
                    ...draft,
                    header: {
                      ...draft.header,
                      fields: {
                        ...draft.header.fields,
                        [key]: {
                          ...draft.header.fields[key],
                          value: e.target.value,
                        },
                      },
                    },
                  })
                }
              />
            </label>
          ))}
        </details>
        <details open={edit} onToggle={(e) => setEdit(e.currentTarget.open)}>
          <summary>প্রশ্ন ও উত্তর সম্পাদনা</summary>
          <p>
            Topic/word limit/source ও প্রশ্নের সংখ্যা অক্ষুণ্ণ রাখুন। Table ও subitems
            প্রয়োজনে JSON editor-এ সম্পাদনা করা যাবে।
          </p>
          {draft.output.tasks.map((task, index) => (
            <section className="space-y-3 border-b p-3" key={task.id}>
              <h3>{task.id}</h3>
              <RichTextField
                label="Instruction"
                value={task.instruction}
                onChange={(value) => editTask(index, { instruction: value })}
              />
              {task.subitems.map((s, j) => (
                <div key={j}>
                  <RichTextField
                    label={`Subitem ${j + 1}`}
                    value={s.text}
                    onChange={(value) =>
                      editTask(index, {
                        subitems: task.subitems.map((sub, k) =>
                          k === j ? { ...sub, text: value } : sub,
                        ),
                      })
                    }
                  />
                  {s.options?.map((option, k) => (
                    <label className="block" key={k}>
                      Option {k + 1}
                      <input
                        className="w-full border p-2"
                        value={option}
                        onChange={(e) =>
                          editTask(index, {
                            subitems: task.subitems.map((sub, n) =>
                              n === j
                                ? {
                                    ...sub,
                                    options: sub.options!.map((o, m) =>
                                      m === k ? e.target.value : o,
                                    ),
                                  }
                                : sub,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  {s.answer !== undefined && (
                    <RichTextField
                      label="Answer"
                      value={s.answer}
                      onChange={(value) =>
                        editTask(index, {
                          subitems: task.subitems.map((sub, k) =>
                            k === j ? { ...sub, answer: value } : sub,
                          ),
                        })
                      }
                    />
                  )}
                </div>
              ))}
              {task.answer !== undefined && (
                <RichTextField
                  label="Separate answer/sample"
                  value={task.answer}
                  onChange={(value) => editTask(index, { answer: value })}
                />
              )}
              <details>
                <summary>Advanced task JSON (clues/table)</summary>
                <TaskJson
                  key={JSON.stringify(task)}
                  value={task}
                  onApply={(value) => editTask(index, value)}
                />
              </details>
            </section>
          ))}
        </details>
        {!result && (
          <p role="alert">
            Output validation ব্যর্থ। সেভ/print করার আগে ত্রুটি ঠিক করুন।
          </p>
        )}
      </div>
      <div className="english-document-grid">
        <PaperSettingsPanel
          english
          settings={pageSettings}
          update={(next) =>
            update({
              ...draft,
              header: currentHeader(next),
              font: next.cfg.font,
              fontSize: next.cfg.fontSize,
              layout: {
                paper: next.cfg.paper,
                align: next.cfg.align,
                marginTop: next.cfg.marginTop,
                marginBottom: next.cfg.marginBottom,
                marginLeft: next.cfg.marginLeft,
                marginRight: next.cfg.marginRight,
              },
            })
          }
          edit={edit}
          setEdit={setEdit}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          counts={{ MCQ: 0, CQ: 0, SHORT: 0 }}
          onPrint={() => {
            if (result) window.print();
          }}
          onUndo={() => {}}
          onRedo={() => {}}
          canUndo={false}
          canRedo={false}
        />
        <style>{`@media print{@page{size:${draft.layout.paper};margin:${draft.layout.marginTop}px ${draft.layout.marginRight}px ${draft.layout.marginBottom}px ${draft.layout.marginLeft}px}}`}</style>
        <article
          id="paper"
          className="english-paper"
          style={{
            fontFamily: family,
            fontSize: `${draft.fontSize}pt`,
            textAlign: draft.layout.align,
          }}
        >
          <HeaderPreview header={draft.header} />
          {answerMode && <h2>Answer key / sample answers</h2>}
          {result &&
            result.tasks.map((task, index) => {
              const previous = result.tasks[index - 1];
              const sectionStart =
                !previous || previous.section !== task.section;
              const group = task.passageKey;
              const firstGroup =
                group &&
                !result.tasks
                  .slice(0, index)
                  .some((t) => t.passageKey === group);
              return (
                <section key={task.id} className="english-task">
                  {sectionStart && (
                    <h2>
                      Part {task.section === "writing" ? "B" : "A"}:{" "}
                      {task.section[0].toUpperCase() + task.section.slice(1)}{" "}
                      (Marks –{" "}
                      {result.tasks
                        .filter((t) => t.section === task.section)
                        .reduce((s, t) => s + t.marks, 0)}{" "}
                      )
                    </h2>
                  )}
                  {!answerMode && firstGroup && (
                    <div className="english-passage">
                      <p>
                        <strong>
                          Read the following text and answer the linked
                          questions.
                        </strong>
                      </p>
                      <RichPaperText
                        text={
                          draft.output.passages.find((p) => p.key === group)!
                            .text
                        }
                      />
                    </div>
                  )}
                  <div className="english-question-heading">
                    <strong>
                      {task.number}. <RichPaperText text={task.instruction} />
                    </strong>
                    <span className="english-mark-formula">
                      {englishMarksLabel(
                        englishBlueprint(
                          draft.selection.grade as EnglishGrade,
                          draft.selection.paper,
                        ).items.find((i) => i.id === task.id)!,
                      )}
                    </span>
                  </div>
                  {task.answerCount && (
                    <p>
                      Answer any {task.answerCount} of the following{" "}
                      {task.subitems.length} questions.
                    </p>
                  )}
                  {!answerMode && task.clues && (
                    <div className="english-clues">
                      {task.clues.map((c, i) => (
                        <span key={i}>
                          <RichPaperText text={c} />
                        </span>
                      ))}
                    </div>
                  )}
                  {!answerMode && task.id === "graph" && (
                    <EnglishDataChart table={task.table} />
                  )}
                  {!answerMode && task.table && (
                    <table>
                      <thead>
                        <tr>
                          {task.table.headers.map((h, i) => (
                            <th key={i}>
                              <RichPaperText text={h} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {task.table.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((c, j) => (
                              <td key={j}>
                                <RichPaperText text={c} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <ol type="a">
                    {task.subitems.map((s, i) => (
                      <li key={i}>
                        <RichPaperText
                          text={answerMode ? s.answer || "" : s.text}
                        />
                        {!answerMode && s.options && (
                          <ol type="i" className="english-options">
                            {s.options.map((option, j) => (
                              <li key={j}>
                                <RichPaperText text={option} />
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ol>
                  {answerMode && task.answer && (
                    <RichPaperText text={task.answer} />
                  )}
                </section>
              );
            })}
        </article>
      </div>
    </main>
  );
}
function TaskJson({
  value,
  onApply,
}: {
  value: EnglishDraft["output"]["tasks"][number];
  onApply: (value: EnglishDraft["output"]["tasks"][number]) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2)),
    [error, setError] = useState("");
  return (
    <div>
      <textarea
        aria-label="Task JSON"
        className="w-full border p-2 font-mono"
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          try {
            const parsed = JSON.parse(text);
            if (
              !parsed ||
              typeof parsed !== "object" ||
              parsed.id !== value.id ||
              !Array.isArray(parsed.subitems)
            )
              throw Error();
            englishOutputSchema.parse({ passages: [], tasks: [parsed] });
            onApply(parsed);
            setError("");
          } catch {
            setError("JSON সঠিক নয়।");
          }
        }}
      >
        Apply JSON
      </button>
      <p role="status">{error}</p>
    </div>
  );
}
