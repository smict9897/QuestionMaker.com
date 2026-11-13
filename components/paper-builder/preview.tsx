"use client";
import { useEffect, useRef, useState } from "react";
import { paginateContinuous, type FlowSegment } from "@/lib/continuous-paper";
import PaperAnswer from "./paper-answer";
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
export type PreviewSection = {
  type: string;
  title: string;
  questions: PreviewQuestion[];
};
const families = {
  kalpurush: '"QmPaperKalpurush", var(--font-en), serif',
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
  sections,
  auxiliaryOnly = false,
}: {
  onQuestionAction?: (
    id: string,
    action: "remove" | "reset" | "exchange",
  ) => void;
  sections?: PreviewSection[];
  auxiliaryOnly?: boolean;
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
  const [flowPages, setFlowPages] = useState<FlowSegment[][]>([]);
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
      {!sections && (
        <h3 className="font-bold underline">
          {title}
          {mode === "questions" && type === "MCQ"
            ? " (প্রতিটি প্রশ্নের মান ১)"
            : ""}
        </h3>
      )}
      {mode === "questions" && !sections && (
        <p className="mb-3 text-right text-[0.85em]">
          {bn(questions.length)}টির মধ্যে {bn(numberToAnswer)}টির উত্তর দাও।
        </p>
      )}
    </div>
  );
  const paperHeader = s.header.enabled ? (
    <div className="paper-heading">
      <HeaderPreview
        header={
          sections
            ? {
                ...currentHeader(s),
                fields: {
                  ...currentHeader(s).fields,
                  questionType: {
                    ...currentHeader(s).fields.questionType,
                    enabled: false,
                  },
                },
              }
            : currentHeader(s)
        }
        setName={setName}
        autoSet={s.show.autoSet}
        sectionTitle={
          !sections && (mode !== "questions" || type !== "MCQ")
            ? title
            : undefined
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
      {mode === "questions" && !sections && (
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
  function question(v: PreviewQuestion, index: number, typeOverride = type) {
    const type = typeOverride;
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
            <PaperAnswer
              explanation={q.explanation}
              answers={q.answers}
              cq={type === "CQ"}
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
              <div className="mt-2">
                <b>উত্তর: </b>
                <PaperAnswer
                  explanation={q.explanation}
                  answers={q.answers}
                  cq={type === "CQ"}
                />
              </div>
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
  function sectionHeading(section: PreviewSection, id?: string) {
    const answer =
      (section.type === "MCQ"
        ? s.cfg.mcqAnswer
        : section.type === "CQ"
          ? s.cfg.cqAnswer
          : s.cfg.shortAnswer) || section.questions.length;
    return (
      <div id={id} style={{ paddingTop: "0.5em", paddingBottom: "0.5em" }}>
        <h3 className="font-bold underline">
          {section.title}
          {section.type === "MCQ" ? " (প্রতিটি প্রশ্নের মান ১)" : ""}
        </h3>
        <p
          className="text-right"
          style={{ fontSize: "0.85em", marginBottom: 0 }}
        >
          {bn(section.questions.length)}টির মধ্যে{" "}
          {bn(Math.min(answer, section.questions.length))}টির উত্তর দাও।
        </p>
      </div>
    );
  }
  const sectionColumns = (section: PreviewSection) =>
    section.type === "MCQ" ? s.cfg.cols : s.cfg.cqColumns;
  useEffect(() => {
    const root = measure.current;
    if (!root) return;
    let frame = 0;
    const calculate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Print CSS hides the measurement tree. Never repaginate from zero heights
        // while the native print dialog is opening (especially at mobile widths).
        if (window.matchMedia("print").matches || !root.getClientRects().length)
          return;
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
        if (sections) {
          const measurements = sections.map((section, index) => {
            const node = root.querySelector<HTMLElement>(
              `[data-flow-section="${index}"]`,
            )!;
            return {
              heading: node
                .querySelector<HTMLElement>("[data-flow-heading]")!
                .getBoundingClientRect().height,
              heights: Array.from(
                node.querySelectorAll<HTMLElement>("[data-measure-question]"),
              ).map((el) => el.getBoundingClientRect().height),
              columns: sectionColumns(section),
              startRight: s.show.rightStart,
            };
          });
          if (
            s.cfg.autoFit &&
            fittedFont > 7 &&
            measurements.reduce(
              (sum, section) =>
                sum +
                section.heading +
                section.heights.reduce((a, b) => a + b, 0) / section.columns,
              0,
            ) > Math.max(50, available)
          ) {
            setFittedFont((v) => Math.max(7, v - 1));
            return;
          }
          setOversized(
            measurements.some((section) =>
              section.heights.some(
                (h) => h + section.heading > continuationAvailable,
              ),
            ),
          );
          setFlowPages(
            paginateContinuous(
              measurements,
              Math.max(50, available),
              Math.max(50, continuationAvailable),
            ),
          );
          return;
        }
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
  }, [s, questions, height, cols, title, mode, fittedFont, sections]);
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
        {sections ? (
          sections.map((section, index) => (
            <div data-flow-section={index} key={index}>
              <div
                data-flow-heading
                style={{
                  width: `calc((100% - ${(sectionColumns(section) - 1) * s.cfg.columnGap}px) / ${sectionColumns(section)} - 11px)`,
                }}
              >
                {sectionHeading(section)}
              </div>
              <div
                style={{
                  width: `calc((100% - ${(sectionColumns(section) - 1) * s.cfg.columnGap}px) / ${sectionColumns(section)} - 11px)`,
                }}
              >
                {section.questions.map((v, i) => (
                  <div data-measure-question key={v.q.id}>
                    {question(v, i, section.type)}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
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
          </>
        )}
      </div>
      {s.cfg.autoFit && mode === "questions" && (
        <p data-noprint role="status" className="mb-2 text-xs text-emerald-700">
          Auto-fit: {fittedFont}pt — প্রয়োজনে সর্বনিম্ন ৭pt; না ধরলে পরের পাতায়
          যাবে।
        </p>
      )}
      {oversized && (
        <p
          data-noprint
          role="status"
          className="mb-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          কিছু প্রশ্ন এক পাতার চেয়ে বড়। ফন্ট বা ছবির আকার ছোট করুন; প্রিন্টে বড় প্রশ্ন
          একাধিক পাতায় ভাগ হতে পারে।
        </p>
      )}
      {sections &&
        s.cfg.format !== "ans" &&
        flowPages.map((segments, page) => (
          <div
            className="paper-page-viewport"
            style={{ zoom: previewScale }}
            key={page}
          >
            <div className="paper-sheet" style={style}>
              {s.show.watermark && (
                <div className="paper-watermark" aria-hidden="true">
                  {s.info.watermark || s.info.inst || "খসড়া"}
                </div>
              )}
              <div className="relative z-[1]">
                {page === 0 && header}
                <div
                  className="paper-flow-body"
                  style={{
                    position: "relative",
                    height: Math.max(
                      ...segments.map(
                        (segment) => segment.top + segment.height,
                      ),
                    ),
                  }}
                >
                  {segments.map((segment, segmentIndex) => {
                    const section = sections[segment.section];
                    return (
                      <div
                        data-paper-section={section.type}
                        data-flow-lane={segment.lane}
                        key={segmentIndex}
                        style={{
                          position: "absolute",
                          top: segment.top,
                          left: `calc(${segment.lane} * (100% + ${s.cfg.columnGap}px) / ${segment.laneCount})`,
                          width: `calc((100% - ${(segment.laneCount - 1) * s.cfg.columnGap}px) / ${segment.laneCount})`,
                          boxSizing: "border-box",
                          borderLeft:
                            s.show.divider && segment.lane > 0
                              ? "1px solid #888"
                              : undefined,
                          paddingLeft: segment.lane > 0 ? 10 : 0,
                        }}
                      >
                        {segment.heading &&
                          sectionHeading(
                            section,
                            sections.findIndex(
                              (part) => part.type === section.type,
                            ) === segment.section &&
                              setName === (s.show.autoSet ? "ক" : s.setName)
                              ? `paper-section-${section.type}`
                              : undefined,
                          )}
                        {segment.columns.flat().map((i) => (
                          <div key={section.questions[i].q.id}>
                            {question(section.questions[i], i, section.type)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {s.show.brandFooter && (
                  <p className="mt-3 border-t pt-1 text-center text-[0.75em]">
                    <RichPaperText text={s.info.brandFooter} />
                  </p>
                )}
                {s.show.pageNumbers && (
                  <p className="mt-3 text-center text-[0.7em]">
                    {bn(page + 1)} / {bn(flowPages.length)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      {!sections &&
        !auxiliaryOnly &&
        (mode !== "questions" || s.cfg.format !== "ans") &&
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
      {sections &&
        (s.show.omr || s.cfg.ansKey || s.cfg.format === "ans") &&
        sections.map((section, index) => (
          <PaperPreview
            key={index}
            s={s}
            questions={section.questions}
            type={section.type}
            title={section.title}
            setName={setName}
            duplicate={duplicate}
            onImageSize={onImageSize}
            previewScale={previewScale}
            auxiliaryOnly
          />
        ))}
      {!sections && mode === "questions" && s.show.omr && type === "MCQ" && (
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
      {!sections &&
        mode === "questions" &&
        (s.cfg.ansKey || s.cfg.format === "ans") && (
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
