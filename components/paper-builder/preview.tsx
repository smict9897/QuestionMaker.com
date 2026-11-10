"use client";
import { useEffect, useRef, useState } from "react";
import HeaderPreview from "./header-preview";
import { currentHeader } from "@/lib/paper-header";
import RichPaperText from "./rich-paper-text";
import {
  bn,
  preparePaperMath,
  paperDimensions,
  optionLabel,
  labels,
  paginate,
  safeImage,
  safeLogo,
  type PaperItem,
  type PaperSettings,
} from "@/lib/paper-builder";
function PaperMathText({ text }: { text: string }) {
  return <RichPaperText text={text} />;
}

export type PreviewQuestion = {
  q: PaperItem;
  opts: [string, string][];
  ci: number;
};
const families = {
  adorsho: "var(--font-bn), var(--font-en), serif",
  hind: "var(--qk-body), sans-serif",
  anek: "var(--qk-head), sans-serif",
  serif: "var(--font-en), var(--font-bn), serif",
};
export default function PaperPreview({
  s,
  questions,
  type,
  setName,
  duplicate,
  onImageSize,
  title,
  onQuestionAction,
  previewScale = 1,
  mode = "questions",
}: {
  onQuestionAction?: (
    id: string,
    action: "remove" | "reset" | "exchange",
  ) => void;
  s: PaperSettings;
  questions: PreviewQuestion[];
  type: string;
  setName: string;
  duplicate: Set<string>;
  onImageSize: (id: string, size: number | undefined) => void;
  title: string;
  previewScale?: number;
  mode?: "questions" | "answers" | "omr";
}) {
  const [pages, setPages] = useState<number[][][]>([]);
  const [oversized, setOversized] = useState(false);
  const [fittedFont, setFittedFont] = useState(s.cfg.fontSize);
  useEffect(() => setFittedFont(s.cfg.fontSize), [s, questions]);
  const measure = useRef<HTMLDivElement>(null);
  const [width, height] = paperDimensions(s);
  const cols =
    mode === "omr"
      ? 3
      : mode === "answers" && type === "MCQ"
        ? 4
        : type === "MCQ"
          ? s.cfg.cols
          : s.cfg.cqColumns;
  const numberToAnswer = Math.min(
    questions.length,
    (type === "MCQ"
      ? s.cfg.mcqAnswer
      : type === "CQ"
        ? s.cfg.cqAnswer
        : s.cfg.shortAnswer) || questions.length,
  );
  const legacyHeader = (
    <div className="paper-heading text-center">
      {s.show.title && (
        <h2 style={{ fontSize: "1.65em", fontWeight: 700, margin: 0 }}>
          {s.info.inst || "আপনার প্রতিষ্ঠানের নাম"}
        </h2>
      )}
      {s.show.address && <p>{s.info.address || "প্রতিষ্ঠানের ঠিকানা"}</p>}
      {s.show.exam && s.info.exam && (
        <p className="font-semibold">{s.info.exam}</p>
      )}
      <p>
        {[s.show.cls && s.info.cls, s.show.subject && s.info.subject]
          .filter(Boolean)
          .join(" — ")}
      </p>
      {s.show.chapter && s.info.chapter && <p>({s.info.chapter})</p>}
      {s.show.subjCode && <p>বিষয় কোড: {s.info.code || "…………"}</p>}
      <div className="my-2 flex justify-between border-y-2 border-black py-1 font-bold">
        <span>সময়– {s.info.minutes || "…………"}</span>
        <span>{(s.show.setCode || s.show.autoSet) && `সেট ${setName}`}</span>
        <span>পূর্ণমান– {s.info.marks || "…………"}</span>
      </div>
      {s.show.examinee && (
        <p className="my-2 text-left">
          নাম: …………………………… রোল: …………… শাখা: ……………
        </p>
      )}
      {s.show.obtained && (
        <div className="mb-2 border border-black p-2 text-right">
          প্রাপ্ত নম্বর: ……………
        </div>
      )}
      {s.show.instr && <p className="mb-2 italic">{s.info.instr}</p>}
      <h3 className="font-bold underline">
        {title}
        {mode === "questions" && type === "MCQ"
          ? " (প্রতিটি প্রশ্নের মান ১)"
          : ""}
      </h3>
      {mode === "questions" && (
        <p className="mb-3 text-right text-[0.85em]">
          {bn(questions.length)}টির মধ্যে {bn(numberToAnswer)}টির উত্তর দাও।
        </p>
      )}
    </div>
  );
  const paperHeader = s.header.enabled ? (
    <div className="paper-heading">
      <HeaderPreview
        header={currentHeader(s)}
        setName={setName}
        autoSet={s.show.autoSet}
        sectionTitle={
          mode !== "questions" || type !== "MCQ" ? title : undefined
        }
      />
      {s.show.examinee &&
        !s.header.fields.studentName.enabled &&
        !s.header.fields.studentRoll.enabled && (
          <p className="my-2 text-left">
            নাম: …………………………… রোল: …………… শাখা: ……………
          </p>
        )}
      {s.show.obtained && (
        <div className="mb-2 border border-black p-2 text-right">
          প্রাপ্ত নম্বর: ……………
        </div>
      )}
      {mode === "questions" && (
        <p className="mb-3 text-right text-[0.85em]">
          {bn(questions.length)}টির মধ্যে {bn(numberToAnswer)}টির উত্তর দাও।
        </p>
      )}
    </div>
  ) : (
    legacyHeader
  );
  const header = (
    <>
      {s.show.logo && safeLogo(s.info.logo) && (
        <img
          src={safeLogo(s.info.logo)!}
          alt="প্রতিষ্ঠানের লোগো"
          className="mx-auto mb-2 h-16 w-16 object-contain"
        />
      )}
      {s.show.brandHeader && (
        <p className="mb-2 border-b pb-1 text-center font-bold">
          <RichPaperText text={s.info.brandHeader} />
        </p>
      )}
      {s.show.instructor && (
        <p className="mb-2 text-center">{s.info.instructor}</p>
      )}
      {paperHeader}
    </>
  );
  function question(v: PreviewQuestion, index: number) {
    const { q, opts, ci } = v;
    if (mode !== "questions")
      return (
        <div
          className="paper-question"
          style={{ paddingBottom: "0.7em", breakInside: "avoid" }}
        >
          <b>{bn(index + 1)}। </b>
          {mode === "omr" ? (
            labels[s.cfg.label].map((l) => `◯${l}`).join("  ")
          ) : type === "MCQ" ? (
            ci >= 0 ? (
              labels[s.cfg.label][ci] || bn(ci + 1)
            ) : (
              "উত্তর নেই"
            )
          ) : (
            <PaperMathText
              text={
                q.explanation ||
                Object.values(q.answers || {}).join("; ") ||
                "উত্তর সংযুক্ত নেই"
              }
            />
          )}
        </div>
      );

    const attachment = s.attachments[q.id];
    const image = safeImage(attachment?.image || "");
    const marked = s.cfg.format === "qa" || s.cfg.format === "sug";
    return (
      <div
        className={`paper-question ${s.show.duplicates && duplicate.has(q.id) ? "paper-duplicate" : ""}`}
        style={{ paddingBottom: "0.7em", breakInside: "avoid" }}
      >
        {onQuestionAction && (
          <div
            data-noprint
            className="mb-2 flex gap-2 rounded bg-slate-100 p-1 text-xs text-slate-700"
          >
            {(
              [
                ["remove", "মুছুন"],
                ["reset", "মূল লেখা"],
                ["exchange", "Exchange"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                onClick={() => onQuestionAction(q.id, action)}
                className="rounded border bg-white px-2 py-1"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-start gap-1.5">
          <b className="shrink-0">{bn(String(index + 1).padStart(2, "0"))}।</b>
          <div className="min-w-0 flex-1">
            <span>
              {s.show.important && attachment?.important && (
                <b aria-label="গুরুত্বপূর্ণ প্রশ্ন">★ </b>
              )}
              <PaperMathText
                text={type === "CQ" ? q.stimulus || q.text : q.text}
              />
            </span>
            {s.show.marks && (
              <span className="float-right">
                [{type === "CQ" ? "১০" : "১"}]
              </span>
            )}
            {image && (
              <div
                className={`paper-image-wrap group ${s.cfg.imagePosition === "center" ? "text-center" : "text-left"}`}
              >
                <img
                  src={image}
                  alt="প্রশ্নের চিত্র"
                  referrerPolicy="no-referrer"
                  style={{
                    width: attachment?.size || s.cfg.imageSize,
                    maxWidth: "100%",
                    height: "auto",
                    display: "inline-block",
                    margin: "6px 0",
                  }}
                />
                <div data-noprint className="flex justify-center gap-2 text-xs">
                  <button
                    onClick={() =>
                      onImageSize(
                        q.id,
                        Math.max(
                          80,
                          (attachment?.size || s.cfg.imageSize) - 20,
                        ),
                      )
                    }
                  >
                    −
                  </button>
                  <button onClick={() => onImageSize(q.id, undefined)}>
                    রিসেট
                  </button>
                  <button
                    onClick={() =>
                      onImageSize(
                        q.id,
                        Math.min(
                          600,
                          (attachment?.size || s.cfg.imageSize) + 20,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            {type === "MCQ" && (
              <div
                className="mt-1 grid gap-x-3 gap-y-0.5"
                style={{
                  gridTemplateColumns: `repeat(${s.cfg.optCols},minmax(0,1fr))`,
                }}
              >
                {opts.map(([key, value], i) => {
                  const label = labels[s.cfg.label][i] || bn(i + 1);
                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-1 ${marked && i === ci ? "font-bold underline" : ""}`}
                    >
                      <span className="shrink-0">
                        {s.cfg.style === "paren"
                          ? `(${label})`
                          : s.cfg.style === "close"
                            ? `${label})`
                            : s.cfg.style === "dot"
                              ? `${label}.`
                              : `◦ ${label}`}
                      </span>
                      <PaperMathText text={value} />
                    </div>
                  );
                })}
              </div>
            )}
            {type === "CQ" && q.subQuestions && (
              <div className="mt-2 space-y-1">
                {Object.entries(q.subQuestions).map(([key, text], i) => (
                  <p key={key}>
                    <b>{optionLabel(labels.bn[i], s.cfg.cqStyle)} </b>
                    <PaperMathText text={text} />
                    <span className="float-right">{bn(i + 1)}</span>
                  </p>
                ))}
              </div>
            )}
            {marked && type !== "MCQ" && (
              <p className="mt-2">
                <b>উত্তর: </b>
                <PaperMathText
                  text={
                    q.explanation ||
                    Object.values(q.answers || {}).join("; ") ||
                    "উত্তর সংযুক্ত নেই"
                  }
                />
              </p>
            )}
            {s.show.tags && (
              <p className="mt-1 text-[0.72em]">
                {[q.topic, q.source].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  useEffect(() => {
    const root = measure.current;
    if (!root) return;
    let frame = 0;
    const calculate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const h =
          root
            .querySelector<HTMLElement>("[data-measure-header]")
            ?.getBoundingClientRect().height || 0;
        const continuationAvailable =
          (height * 96) / 25.4 -
          s.cfg.marginTop -
          s.cfg.marginBottom -
          28 -
          (s.show.brandFooter
            ? (root
                .querySelector<HTMLElement>("[data-measure-footer]")
                ?.getBoundingClientRect().height || 0) + 12
            : 0);
        const available = continuationAvailable - h;
        const blocks = Array.from(
          root.querySelectorAll<HTMLElement>("[data-measure-question]"),
        ).map((el) => el.getBoundingClientRect().height);
        if (
          s.cfg.autoFit &&
          mode === "questions" &&
          fittedFont > 7 &&
          blocks.reduce((sum, v) => sum + v, 0) >
            Math.max(50, available) * (s.show.rightStart ? 1 : cols)
        ) {
          setFittedFont((v) => Math.max(7, v - 1));
          return;
        }
        setOversized(blocks.some((v) => v > continuationAvailable));
        const reserved =
          s.show.rightStart && cols > 1
            ? Array(cols - 1).fill(Math.max(50, available))
            : [];
        const paginated = paginate(
          [...reserved, ...blocks],
          Math.max(50, available),
          cols,
          Math.max(50, continuationAvailable),
        );
        setPages(
          paginated.map((page) =>
            page.map((column) =>
              column
                .filter((i) => i >= reserved.length)
                .map((i) => i - reserved.length),
            ),
          ),
        );
      });
    };
    const observer = new ResizeObserver(calculate);
    observer.observe(root);
    root
      .querySelectorAll("[data-measure-question],img")
      .forEach((el) => observer.observe(el));
    document.fonts.ready.then(calculate);
    calculate();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [s, questions, height, cols, title, mode, fittedFont]);
  const style = {
    width: `${width}mm`,
    minHeight: `${height}mm`,
    padding: `${s.cfg.marginTop}px ${s.cfg.marginRight}px ${s.cfg.marginBottom}px ${s.cfg.marginLeft}px`,
    color: s.cfg.ink,
    fontWeight: s.cfg.bold ? 700 : 400,
    fontStyle: s.cfg.italic ? "italic" : "normal",
    textDecoration:
      [s.cfg.underline ? "underline" : "", s.cfg.strike ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || "none",
    fontFamily: families[s.cfg.font],
    fontSize: `${s.cfg.autoFit ? fittedFont : s.cfg.fontSize}pt`,
    lineHeight: 1.45,
    textAlign: s.cfg.align,
  } as const;
  return (
    <>
      <div
        aria-hidden="true"
        data-noprint
        ref={measure}
        className="paper-measure"
        style={{
          ...style,
          position: "absolute",
          left: "-100000px",
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <div data-measure-header>{header}</div>
        {s.show.brandFooter && (
          <div
            data-measure-footer
            className="border-t pt-1 text-center text-[0.75em]"
          >
            <RichPaperText text={s.info.brandFooter} />
          </div>
        )}
        <div
          style={{
            width: `calc((100% - ${(cols - 1) * s.cfg.columnGap}px) / ${cols} - 11px)`,
          }}
        >
          {questions.map((v, i) => (
            <div data-measure-question key={v.q.id}>
              {question(v, i)}
            </div>
          ))}
        </div>
      </div>
      {s.cfg.autoFit && mode === "questions" && (
        <p data-noprint role="status" className="mb-2 text-xs text-emerald-700">
          Auto-fit: {fittedFont}pt — প্রয়োজনে সর্বনিম্ন ৭pt; না ধরলে পরের
          পাতায় যাবে।
        </p>
      )}
      {oversized && (
        <p
          data-noprint
          role="status"
          className="mb-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          কিছু প্রশ্ন এক পাতার চেয়ে বড়। ফন্ট বা ছবির আকার ছোট করুন; প্রিন্টে
          বড় প্রশ্ন একাধিক পাতায় ভাগ হতে পারে।
        </p>
      )}
      {(mode !== "questions" || s.cfg.format !== "ans") &&
        pages.map((columns, page) => (
          <div
            className="paper-page-viewport"
            style={{ zoom: previewScale }}
            key={page}
          >
            <div className="paper-sheet" style={style} key={page}>
              {s.show.watermark && (
                <div className="paper-watermark" aria-hidden="true">
                  {s.info.watermark || s.info.inst || "খসড়া"}
                </div>
              )}
              <div className="relative z-[1]">
                {page === 0 && header}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
                    gap: s.cfg.columnGap,
                  }}
                >
                  {columns.map((indexes, col) => (
                    <div
                      key={col}
                      style={{
                        borderLeft:
                          s.show.divider && col > 0
                            ? "1px solid #888"
                            : undefined,
                        paddingLeft: col > 0 ? 10 : 0,
                      }}
                    >
                      {indexes.map((i) => (
                        <div key={questions[i].q.id}>
                          {question(questions[i], i)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {s.show.brandFooter && (
                  <p className="mt-3 border-t pt-1 text-center text-[0.75em]">
                    <RichPaperText text={s.info.brandFooter} />
                  </p>
                )}
                {s.show.pageNumbers && (
                  <p className="mt-3 text-center text-[0.7em]">
                    {bn(page + 1)} / {bn(pages.length)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      {mode === "questions" && s.show.omr && type === "MCQ" && (
        <PaperPreview
          s={s}
          questions={questions}
          type={type}
          setName={setName}
          duplicate={duplicate}
          onImageSize={onImageSize}
          title={`OMR — সেট ${setName}`}
          previewScale={previewScale}
          mode="omr"
        />
      )}
      {mode === "questions" && (s.cfg.ansKey || s.cfg.format === "ans") && (
        <PaperPreview
          s={s}
          questions={questions}
          type={type}
          setName={setName}
          duplicate={duplicate}
          onImageSize={onImageSize}
          title={`উত্তরমালা — ${title} — সেট ${setName}`}
          previewScale={previewScale}
          mode="answers"
        />
      )}
    </>
  );
}
