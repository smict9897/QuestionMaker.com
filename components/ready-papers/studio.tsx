"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReadyCheckout from "./checkout";
import {
  getReadyPurchase,
  saveReadyPurchase,
  type ReadyPurchase,
} from "@/app/actions/ready-commerce";
import {
  readySelectionIdentity,
  type ReadySnapshot,
} from "@/lib/ready-commerce";
import PageLoader from "./page-loader";
import RasterTools from "./raster-tools";
import { rasterEditKey, type RasterPoint } from "@/lib/ready-raster";
import PlacedQuestion from "./placed-question";
import { defaultPlacement, type Placement } from "@/lib/ready-placement";
import HeaderManager from "@/components/paper-builder/header-manager";
import HeaderPreview from "@/components/paper-builder/header-preview";
import { settingsSchema } from "@/lib/paper-builder";
import { currentHeader } from "@/lib/paper-header";
import "@/components/paper-builder/header.css";
import { PageViewer, PrintFrame } from "./page-viewer";
import {
  ArrowLeft,
  Check,
  FileText,
  RotateCw,
  Undo2,
  Redo2,
  Printer,
  Save,
  Crop,
  Eraser,
  Type,
  Sparkles,
} from "lucide-react";
import {
  freshEdit,
  pageEditSchema,
  type PageEdit,
  type ReadyPaper,
} from "@/lib/ready-papers";
import {
  loadPdfImages,
  renderEdited,
  suggestMargins,
  saveLocal,
  loadLocal,
} from "@/lib/ready-paper-browser";
import { updateReadyPaper } from "@/app/actions/ready-papers";
import "./ready.css";
import AIAnswers, { AIAnswerSheets } from "./ai-answers";
import type { ReadyAIJob } from "@/lib/ready-ai";
import AnswerAssistant, { AnswerSheets } from "./answer-assistant";
import type { ReadyAnswer } from "@/lib/ready-answers";
type Header = {
  school: string;
  exam: string;
  subject: string;
  time: string;
  marks: string;
};
export default function ReadyStudio({
  paper,
  userId,
  adminPreset,
  answerEntries = [],
  initialPurchase,
}: {
  paper: ReadyPaper;
  userId: string;
  adminPreset: boolean;
  answerEntries?: ReadyAnswer[];
  initialPurchase?: ReadyPurchase;
}) {
  const [aiJob, setAIJob] = useState<ReadyAIJob | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [receipt, setReceipt] = useState(initialPurchase?.id ?? "");
  const [paidSelection, setPaidSelection] = useState(
    initialPurchase ? readySelectionIdentity(initialPurchase.selected) : "",
  );
  const [pageLoading, setPageLoading] = useState(true);
  const [pageProgress, setPageProgress] = useState({ completed: 0, total: 0 });
  const [liveReviewPage, setLiveReviewPage] = useState(0);
  const [liveReview, setLiveReview] = useState("");
  const [reviewPending, setReviewPending] = useState(false);
  const [headerLine, setHeaderLine] = useState(true);
  const [headerGap, setHeaderGap] = useState(2);
  const [placementMode, setPlacementMode] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<"simple" | "custom" | "none">(
    "simple",
  );
  const [headerSettings, setHeaderSettings] = useState(() =>
    settingsSchema.parse({
      info: { subject: paper.subject, cls: paper.grade },
    }),
  );
  const [viewer, setViewer] = useState<{
    src: string;
    page: number;
    selectable: boolean;
  } | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [entries, setEntries] = useState(answerEntries);
  const [printKind, setPrintKind] = useState<
    "questions" | "blank" | "answers" | "ai"
  >("questions");
  const [pages, setPages] = useState<string[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [edits, setEdits] = useState<Record<string, PageEdit>>(paper.presets),
    [step, setStep] = useState<"select" | "edit" | "preview">("select"),
    [active, setActive] = useState(1),
    [message, setMessage] = useState("PDF খোলা হচ্ছে…"),
    [busy, setBusy] = useState(true),
    [tool, setTool] = useState<"view" | "erase" | "text">("view"),
    [text, setText] = useState(""),
    [size, setSize] = useState(20),
    [original, setOriginal] = useState(false),
    [printPages, setPrintPages] = useState<string[]>([]),
    [header, setHeader] = useState<Header>({
      school: "",
      exam: "",
      subject: paper.subject,
      time: "",
      marks: "",
    });
  const undo = useRef<Record<number, PageEdit[]>>({}),
    redo = useRef<Record<number, PageEdit[]>>({}),
    key = `${userId}:${paper.id}`,
    edit = edits[String(active)] || freshEdit();
  const rasterKey = rasterEditKey(edit);
  const qualityCache = useRef(new Map<number, Promise<string>>());
  function qualityPage(n: number) {
    let promise = qualityCache.current.get(n);
    if (!promise) {
      promise = loadPdfImages(paper.url, () => {}, [n])
        .then((p) => p[0])
        .catch((e) => {
          qualityCache.current.delete(n);
          throw e;
        });
      qualityCache.current.set(n, promise);
      if (qualityCache.current.size > 10) {
        const oldest = qualityCache.current.keys().next().value;
        if (oldest !== undefined) qualityCache.current.delete(oldest);
      }
    }
    return promise;
  }
  function snapshot(): ReadySnapshot {
    return {
      edits,
      header,
      headerStyle,
      headerSettings,
      headerLine,
      headerGap,
    };
  }
  const paid =
    adminPreset ||
    (!!receipt && paidSelection === readySelectionIdentity(selected));
  function startSetup() {
    if (!selected.length) return;
    if (paid) {
      setActive(selected[0]);
      setStep("edit");
    } else setCheckout(true);
  }
  useEffect(() => {
    if (!initialPurchase) return;
    const p = initialPurchase;
    setSelected(p.selected);
    setActive(p.selected[0]);
    setEdits(p.snapshot.edits);
    setHeader(p.snapshot.header);
    setHeaderStyle(p.snapshot.headerStyle);
    setHeaderSettings(p.snapshot.headerSettings);
    setHeaderLine(p.snapshot.headerLine);
    setHeaderGap(p.snapshot.headerGap);
    setStep("edit");
  }, [initialPurchase]);
  useEffect(() => {
    let live = true;
    setBusy(true);
    qualityCache.current.clear();
    setPageLoading(true);
    setPages([]);
    setPageProgress({ completed: 0, total: 0 });
    loadPdfImages(paper.url, (n, total) => {
      if (live) setPageProgress({ completed: n, total });
    })
      .then((p) => {
        if (live) {
          setPageLoading(false);
          setPages(p);
          setMessage("Page বেছে সেটআপে যান।");
          setBusy(false);
        }
      })
      .catch((e) => {
        if (live) {
          setPageLoading(false);
          setMessage(e.message || "PDF খোলা যায়নি। আবার চেষ্টা করুন।");
          setBusy(false);
        }
      });
    return () => {
      live = false;
    };
  }, [paper.url]);
  useEffect(() => {
    if (step !== "edit" || !pages[active - 1]) return;
    let live = true;
    setReviewPending(true);
    const timer = setTimeout(async () => {
      try {
        await document.fonts.ready;
        const rasterEdit = JSON.parse(rasterKey) as PageEdit;
        const result = await renderEdited(
          await qualityPage(active),
          original
            ? { ...freshEdit(), rotation: rasterEdit.rotation }
            : rasterEdit,
        );
        if (live) {
          setLiveReview(result.toDataURL("image/png"));
          setLiveReviewPage(active);
        }
        result.width = result.height = 0;
      } catch {
        if (live) setLiveReview("");
      } finally {
        if (live) setReviewPending(false);
      }
    }, 120);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [pages, active, rasterKey, step, original]);
  function renderPageHeader(first: boolean) {
    return (
      <>
        {first && headerStyle === "custom" && headerSettings.header.enabled && (
          <header
            className={`rp-custom-print-header rp-adjustable-header ${headerLine ? "" : "rp-header-line-off"}`}
            style={{ marginBottom: `${headerGap}mm` }}
          >
            <HeaderPreview header={currentHeader(headerSettings)} />
          </header>
        )}
        {first &&
          headerStyle === "simple" &&
          Object.values(header).some(Boolean) && (
            <header
              className={`rp-print-header rp-adjustable-header ${headerLine ? "" : "rp-header-line-off"}`}
              style={{ marginBottom: `${headerGap}mm` }}
            >
              <h2>{header.school}</h2>
              <h3>{header.exam}</h3>
              <p>{header.subject}</p>
              <div>
                <span>{header.time && `সময়: ${header.time}`}</span>
                <span>{header.marks && `পূর্ণমান: ${header.marks}`}</span>
              </div>
            </header>
          )}
      </>
    );
  }
  useEffect(() => {
    if (!paid || adminPreset || !receipt || step === "select") return;
    let live = true;
    const timer = setTimeout(() => {
      saveReadyPurchase(receipt, snapshot(), selected)
        .then((r) => {
          if (live && !r.ok) setMessage("Account auto-save হয়নি: " + r.error);
        })
        .catch(() => {
          if (live) setMessage("Account auto-save হয়নি। Draft save চাপুন।");
        });
    }, 1200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [
    paid,
    selected,
    receipt,
    step,
    edits,
    header,
    headerStyle,
    headerSettings,
    headerLine,
    headerGap,
    adminPreset,
  ]);
  function togglePage(n: number) {
    setSelected((old) => {
      if (old.includes(n)) return old.filter((v) => v !== n);
      if (old.length >= 10) return old;
      return [...old, n];
    });
    if (!selected.includes(n) && selected.length >= 10)
      setMessage("একবারে সর্বোচ্চ ১০ page নির্বাচন করুন।");
  }
  function placePage(page: number, placement: Placement) {
    setEdits((old) => ({
      ...old,
      [page]: pageEditSchema.parse({
        ...freshEdit(),
        ...old[page],
        ...placement,
      }),
    }));
  }
  function update(patch: Partial<PageEdit>) {
    const checked = pageEditSchema.safeParse({ ...edit, ...patch });
    if (!checked.success) {
      setMessage(
        "এই page-এর edit সীমা পূর্ণ অথবা crop অবৈধ। Undo/Reset করে চেষ্টা করুন।",
      );
      return;
    }
    const next = checked.data;
    undo.current[active] = [
      ...(undo.current[active] || []).slice(-19),
      structuredClone(edit),
    ];
    redo.current[active] = [];
    setEdits((old) => ({ ...old, [active]: next }));
    setPrintPages([]);
  }
  function history(back: boolean) {
    const from = back ? undo : redo,
      to = back ? redo : undo,
      old = from.current[active]?.pop();
    if (old) {
      to.current[active] = [
        ...(to.current[active] || []),
        structuredClone(edit),
      ];
      setEdits((v) => ({ ...v, [active]: old }));
      setPrintPages([]);
    }
  }
  function commitRaster(start: RasterPoint, end: RasterPoint) {
    if (original || reviewPending) return;
    if (tool === "erase") {
      const box = {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        w: Math.abs(end.x - start.x),
        h: Math.abs(end.y - start.y),
      };
      if (box.w > 0.003 && box.h > 0.003 && edit.masks.length < 40)
        update({ masks: [...edit.masks, box] });
    } else if (tool === "text" && text.trim() && edit.texts.length < 30)
      update({
        texts: [
          ...edit.texts,
          {
            x: Math.min(0.95, start.x),
            y: Math.min(0.98, start.y),
            text: text.trim(),
            size,
          },
        ],
      });
  }
  async function preview() {
    if (busy) return;
    if (!paid) {
      setCheckout(true);
      return;
    }
    setBusy(true);
    setMessage("Print preview প্রস্তুত হচ্ছে…");
    try {
      await document.fonts.ready;
      const out = [];
      for (const n of selected) {
        const c = await renderEdited(
          await qualityPage(n),
          edits[n] || freshEdit(),
        );
        out.push(c.toDataURL("image/png"));
        c.width = c.height = 0;
      }
      if (!adminPreset) {
        const saved = await saveReadyPurchase(receipt, snapshot(), selected);
        if (!saved.ok) throw new Error(saved.error);
      }
      setPrintKind("questions");
      setPrintPages(out);
      setStep("preview");
      setMessage("Preview দেখে print করুন।");
    } catch {
      setMessage("Preview হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      if (adminPreset) {
        const r = await updateReadyPaper(paper.id, paper, edits);
        setMessage(r.ok ? "Admin preset save হয়েছে। মূল PDF বদলায়নি।" : r.error);
      } else {
        if (paid) {
          const r = await saveReadyPurchase(receipt, snapshot(), selected);
          if (!r.ok) {
            setMessage(r.error);
            return;
          }
        }
        await saveLocal(key, {
          selected,
          edits,
          header,
          headerStyle,
          headerSettings,
          headerLine,
          headerGap,
        });
        setMessage(
          paid
            ? "প্রশ্নপত্র ও উত্তরপত্র অ্যাকাউন্টে save হয়েছে।"
            : "এই browser-এ draft save হয়েছে। কেনার পর account-এ save হবে।",
        );
      }
    } catch {
      setMessage("Save হয়নি। Browser storage/সংযোগ পরীক্ষা করুন।");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    try {
      const data = await loadLocal(key);
      if (!data) {
        setMessage("এই browser-এ draft নেই।");
        return;
      }
      const valid: Record<string, PageEdit> = {};
      for (const [k, v] of Object.entries(data.edits || {})) {
        if (+k >= 1 && +k <= pages.length) valid[k] = pageEditSchema.parse(v);
      }
      const selection = Array.isArray(data.selected)
        ? data.selected
            .filter(
              (n: unknown) =>
                Number.isInteger(n) &&
                Number(n) > 0 &&
                Number(n) <= pages.length,
            )
            .slice(0, 10)
        : [];
      setEdits(valid);
      setSelected([...new Set<number>(selection)]);
      if (
        data.header &&
        Object.values(data.header).every(
          (v) => typeof v === "string" && v.length <= 160,
        )
      )
        setHeader({
          school: "",
          exam: "",
          subject: paper.subject,
          time: "",
          marks: "",
          ...data.header,
        });
      setHeaderLine(
        typeof data.headerLine === "boolean" ? data.headerLine : true,
      );
      setHeaderGap(
        typeof data.headerGap === "number" && Number.isFinite(data.headerGap)
          ? Math.min(15, Math.max(0, data.headerGap))
          : 2,
      );
      setHeaderStyle(
        ["simple", "custom", "none"].includes(data.headerStyle)
          ? data.headerStyle
          : "simple",
      );
      setHeaderSettings(
        settingsSchema.parse(
          data.headerSettings || {
            info: { subject: paper.subject, cls: paper.grade },
          },
        ),
      );
      undo.current = {};
      redo.current = {};
      setPrintPages([]);
      setMessage("Draft খোলা হয়েছে।");
    } catch {
      setMessage("Draft খোলা যায়নি। মূল PDF ব্যবহার করুন।");
    }
  }
  return (
    <main className="rp-root rp-studio">
      <div className="rp-studio-head" data-noprint>
        <Link href={adminPreset ? "/admin/ready-papers" : "/ready-papers"}>
          <ArrowLeft size={18} />
          Library
        </Link>
        <span className="rp-tag">
          {adminPreset ? "ADMIN PRESET" : "READY PAPER STUDIO"}
        </span>
      </div>
      <section className="rp-hero" data-noprint>
        <h1>{paper.title}</h1>
        <p>
          {paper.grade} · {paper.subject} · {paper.year} · {paper.source}
        </p>
        <div className="rp-steps">
          <span className={step === "select" ? "active" : ""}>
            ১. Page নির্বাচন
          </span>
          <span className={step === "edit" ? "active" : ""}>
            ২. সেটআপ ও Edit
          </span>
          <span className={step === "preview" ? "active" : ""}>
            ৩. Preview ও Print
          </span>
        </div>
      </section>
      {pageLoading ? (
        <PageLoader
          completed={pageProgress.completed}
          total={pageProgress.total}
        />
      ) : (
        <p role="status" className="rp-status" data-noprint>
          {message}
        </p>
      )}
      {pages.length > 0 && (
        <div className="rp-toolbar" data-noprint>
          <button onClick={() => setStep("select")}>
            Page নির্বাচন ({selected.length})
          </button>
          {selected.length > 0 && (
            <button
              className="rp-action-setup"
              disabled={busy}
              onClick={startSetup}
            >
              সেটআপে যান
            </button>
          )}
          <Link href="/ready-papers/saved">আমার প্রশ্নপত্র ও প্যাকেজ</Link>
          <button disabled={busy} onClick={save}>
            <Save size={16} />
            {adminPreset ? "Admin preset save" : "Draft save"}
          </button>
          {!adminPreset && (
            <button disabled={busy} onClick={restore}>
              Saved draft খুলুন
            </button>
          )}
        </div>
      )}
      {paid && receipt && !adminPreset && (
        <AIAnswers
          receiptId={receipt}
          onJob={setAIJob}
          onPrint={() => {
            setPrintKind("ai");
            setStep("preview");
          }}
        />
      )}
      {pages.length > 0 && (
        <AnswerAssistant
          id={paper.id}
          url={paper.url}
          pages={pages}
          selected={selected}
          admin={adminPreset}
          entries={entries}
          onSaved={(entry) =>
            setEntries((old) => [
              ...old.filter((v) => v.questionPage !== entry.questionPage),
              entry,
            ])
          }
          onPrint={(kind) => {
            if (!paid) {
              setCheckout(true);
              return;
            }
            setPrintKind(kind);
            setStep("preview");
          }}
        />
      )}
      {step === "select" && (
        <section data-noprint>
          <div className="rp-page-grid">
            {pages.map((src, i) => (
              <div
                className={`rp-page-card${selected.includes(i + 1) ? " selected" : ""}`}
                key={i}
              >
                <button
                  type="button"
                  className="rp-page-open"
                  aria-label={`Page ${i + 1} বড় করে দেখতে এখানে ক্লিক করুন`}
                  onClick={() => {
                    setViewer({ src, page: i + 1, selectable: true });
                    qualityPage(i + 1)
                      .then((high) =>
                        setViewer((old) =>
                          old?.page === i + 1 && old.selectable
                            ? { ...old, src: high }
                            : old,
                        ),
                      )
                      .catch(() =>
                        setMessage("বড় ছবি প্রস্তুত হয়নি। আবার খুলে চেষ্টা করুন।"),
                      );
                  }}
                >
                  <img src={src} alt={`মূল PDF page ${i + 1}`} loading="lazy" />
                  <span className="rp-page-open-rail">
                    <span className="rp-page-open-caption">
                      বড় করে দেখতে এখানে ক্লিক করুন
                    </span>
                  </span>
                </button>
                <label className="rp-page-choice">
                  <input
                    type="checkbox"
                    checked={selected.includes(i + 1)}
                    onChange={() => togglePage(i + 1)}
                  />
                  Page {(i + 1).toLocaleString("bn-BD")}
                </label>
              </div>
            ))}
          </div>
          {pages.length > 0 && (
            <p className="rp-muted">
              নির্বাচনের ক্রমেই page সাজবে; সেটআপে ক্রম বদলাতে পারবেন। Original
              scan অপরিবর্তিত থাকে।
            </p>
          )}
        </section>
      )}
      {step === "edit" && (
        <div className="rp-editor" data-noprint>
          <aside
            id="rp-edit-controls"
            className={`rp-panel rp-controls${controlsOpen ? " rp-controls-open" : ""}`}
          >
            <h2>Page ও Header</h2>
            <div className="rp-order">
              {selected.map((n, i) => (
                <div key={n}>
                  <button
                    className={active === n ? "active" : ""}
                    onClick={() => {
                      setActive(n);
                      setOriginal(false);
                    }}
                  >
                    Page {n}
                  </button>
                  <button
                    aria-label={`Page ${n} আগে নিন`}
                    disabled={i === 0}
                    onClick={() =>
                      setSelected((v) => {
                        const a = [...v];
                        [a[i - 1], a[i]] = [a[i], a[i - 1]];
                        return a;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Page ${n} পরে নিন`}
                    disabled={i === selected.length - 1}
                    onClick={() =>
                      setSelected((v) => {
                        const a = [...v];
                        [a[i], a[i + 1]] = [a[i + 1], a[i]];
                        return a;
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
            <details open>
              <summary>প্রথম selected page-এর Header</summary>
              {adminPreset && (
                <p className="rp-muted">
                  Admin preset save শুধু page-এর image edits সংরক্ষণ করে। নিজের
                  header account-এ রাখতে Header Manager-এর Save ব্যবহার করুন; এটি
                  সবার PDF preset-এ যুক্ত হবে না।
                </p>
              )}
              <label>
                হেডারের ধরন
                <select
                  value={headerStyle}
                  onChange={(e) => {
                    setHeaderStyle(e.target.value as typeof headerStyle);
                    setPrintPages([]);
                  }}
                >
                  <option value="simple">সাধারণ হেডার</option>
                  <option value="custom">Smart Header / Dynamic Header</option>
                  <option value="none">হেডার ছাড়া</option>
                </select>
              </label>
              {headerStyle !== "none" && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={headerLine}
                      onChange={(e) => setHeaderLine(e.target.checked)}
                    />
                    হেডারের নিচের লাইন দেখান
                  </label>
                  <label>
                    হেডার–প্রশ্নের gap · {headerGap} mm
                    <input
                      aria-label="হেডার প্রশ্নের gap"
                      type="range"
                      min="0"
                      max="15"
                      step=".5"
                      value={headerGap}
                      onChange={(e) => setHeaderGap(+e.target.value)}
                    />
                  </label>
                </>
              )}
              {headerStyle === "custom" && (
                <>
                  <HeaderManager
                    settings={headerSettings}
                    update={(value) => {
                      setHeaderSettings(value);
                      setPrintPages([]);
                    }}
                  />
                  <p className="rp-muted">
                    আপনার আগে save করা Smart/Dynamic header-ও এখানে পাবেন। একটি
                    header নির্বাচন করুন; header শুধু প্রথম selected page-এ।
                  </p>
                  {headerSettings.header.enabled && (
                    <div className="rp-custom-header-preview">
                      <HeaderPreview header={currentHeader(headerSettings)} />
                    </div>
                  )}
                </>
              )}
              {headerStyle === "simple" && (
                <>
                  {(
                    ["school", "exam", "subject", "time", "marks"] as const
                  ).map((field, i) => (
                    <label key={field}>
                      {
                        [
                          "প্রতিষ্ঠানের নাম",
                          "পরীক্ষার নাম",
                          "বিষয়",
                          "সময়",
                          "পূর্ণমান",
                        ][i]
                      }
                      <input
                        value={header[field]}
                        maxLength={160}
                        onChange={(e) => {
                          setHeader((v) => ({ ...v, [field]: e.target.value }));
                          setPrintPages([]);
                        }}
                      />
                    </label>
                  ))}
                </>
              )}
              <p className="rp-muted">
                Header শুধু প্রথম selected page-এ; প্রশ্নের ওপর বসবে না।
              </p>
            </details>
            <h3>Page {active} · Clean ও Crop</h3>
            <label>
              Mode
              <select
                value={edit.mode}
                onChange={(e) =>
                  update({ mode: e.target.value as PageEdit["mode"] })
                }
              >
                <option value="original">Original</option>
                <option value="clean">Auto-clean · Grayscale</option>
                <option value="bw">Black & White</option>
              </select>
            </label>
            <fieldset>
              <legend>হালকা নীল watermark কমান</legend>
              <label>
                মাত্রা · {Math.round(edit.blueWatermark * 100)}%
                <input
                  aria-label="নীল watermark কমানোর মাত্রা"
                  type="range"
                  min="0"
                  max="1"
                  step=".1"
                  value={edit.blueWatermark}
                  onChange={(e) => update({ blueWatermark: +e.target.value })}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  update({ blueWatermark: edit.blueWatermark ? 0 : 1 })
                }
              >
                {edit.blueWatermark
                  ? "Watermark filter বন্ধ করুন"
                  : "নীল watermark কমিয়ে দেখুন"}
              </button>
              <p className="rp-muted">
                শুধু অনুমতিপ্রাপ্ত PDF-এ ব্যবহার করুন। নীল diagram/লেখাও হালকা হতে
                পারে; Original-এর সঙ্গে মিলিয়ে প্রশ্ন, অপশন ও টেবিল যাচাই করুন।
                কালো/ধূসর watermark বা হারানো লেখা উদ্ধার করে না।
              </p>
            </fieldset>
            <label>
              পরিষ্কারের মাত্রা
              <input
                type="range"
                min="0"
                max="1"
                step=".1"
                value={edit.strength}
                onChange={(e) => update({ strength: +e.target.value })}
              />
            </label>
            <label>
              বাঁকা scan সোজা করুন ({edit.deskew}°)
              <input
                type="range"
                min="-10"
                max="10"
                step=".5"
                value={edit.deskew}
                onChange={(e) => update({ deskew: +e.target.value })}
              />
            </label>
            <div className="rp-toolbar">
              <button
                onClick={() =>
                  update({
                    rotation: ((edit.rotation + 90) %
                      360) as PageEdit["rotation"],
                    masks: [],
                    texts: [],
                  })
                }
              >
                <RotateCw size={15} />
                ঘোরান
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const suggestion = await suggestMargins(pages[active - 1]);
                    update(suggestion);
                    setMessage(
                      "শুধু বাইরের সাদা margin-এর প্রস্তাব। লেখা/marks অক্ষত আছে কি না দেখে নিন।",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Crop size={15} />
                Auto margin
              </button>
            </div>
            {(["top", "bottom", "left", "right"] as const).map((side, i) => (
              <label key={side}>
                {["ওপর", "নিচ", "বাম", "ডান"][i]} crop ·{" "}
                {Math.round(edit[side] * 100)}%
                <input
                  type="range"
                  min="0"
                  max={i < 2 ? ".35" : ".2"}
                  step=".005"
                  value={edit[side]}
                  onChange={(e) => update({ [side]: +e.target.value })}
                />
              </label>
            ))}
            <label>
              নতুন লেখা
              <input
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label>
              Font size
              <input
                type="number"
                min={10}
                max={60}
                value={size}
                onChange={(e) =>
                  setSize(Math.min(60, Math.max(10, +e.target.value)))
                }
              />
            </label>
            <div className="rp-toolbar">
              <button
                className={tool === "view" ? "active" : ""}
                onClick={() => setTool("view")}
              >
                দেখুন
              </button>
              <button
                className={tool === "erase" ? "active" : ""}
                onClick={() => {
                  setTool("erase");
                  setOriginal(false);
                }}
              >
                <Eraser size={15} />
                ঢেকে দিন
              </button>
              <button
                className={tool === "text" ? "active" : ""}
                onClick={() => {
                  setTool("text");
                  setOriginal(false);
                }}
              >
                <Type size={15} />
                লেখা বসান
              </button>
            </div>
            <p className="rp-muted">
              ঢাকতে page-এ box টানুন; লেখা বসাতে tap করুন। এটি image edit—মূল PDF
              থেকে তথ্য স্থায়ীভাবে মুছে যায় না।
            </p>
            <div className="rp-toolbar">
              <button onClick={() => history(true)}>
                <Undo2 size={15} />
                Undo
              </button>
              <button onClick={() => history(false)}>
                <Redo2 size={15} />
                Redo
              </button>
              <button
                onClick={() => {
                  if (confirm("এই page-এর edit reset করবেন?"))
                    update(freshEdit());
                }}
              >
                Reset page
              </button>
            </div>
            <button
              className="rp-action-print"
              disabled={busy}
              onClick={preview}
            >
              <Printer size={16} />
              Print preview
            </button>
          </aside>
          <section className="rp-canvas-panel">
            <div className="rp-toolbar">
              <strong>Page {active}</strong>
              <button
                className="rp-mobile-controls"
                aria-expanded={controlsOpen}
                aria-controls="rp-edit-controls"
                onClick={() => setControlsOpen((v) => !v)}
              >
                {controlsOpen ? "Edit controls বন্ধ" : "Header ও Edit controls"}
              </button>
              <button
                onClick={() => {
                  if (liveReview && liveReviewPage === active)
                    setViewer({
                      src: liveReview,
                      page: active,
                      selectable: false,
                    });
                }}
              >
                বড় করে দেখুন ⤢
              </button>
              <button
                className="rp-action-print"
                disabled={busy}
                onClick={preview}
              >
                Print preview
              </button>
              <button onClick={() => setOriginal((v) => !v)}>
                {original ? "Edited দেখুন" : "Original দেখুন"}
              </button>
            </div>
            <div className="rp-toolbar">
              <button
                aria-pressed={placementMode}
                onClick={() => {
                  setPlacementMode((v) => !v);
                  setTool("view");
                  setOriginal(false);
                }}
              >
                প্রশ্নের আকার ও অবস্থান {placementMode ? "বন্ধ" : "ঠিক করুন"}
              </button>
              <span className="rp-muted">
                ঢেকে দিন / লেখা বসান বেছে এই A4 পাতাতেই কাজ করুন।
              </span>
            </div>
            <section
              className="rp-live-review"
              aria-label="সেটআপের সরাসরি A4 রিভিউ"
              aria-busy={reviewPending}
            >
              <h3>সরাসরি A4 রিভিউ ও Edit</h3>
              <p className="rp-muted" role="status">
                {reviewPending
                  ? "রিভিউ আপডেট হচ্ছে…"
                  : "হেডার ও Edit-এর ফল এখানেই দেখুন।"}
              </p>
              {active !== selected[0] && (
                <p className="rp-muted">
                  হেডার শুধু প্রথম নির্বাচিত পৃষ্ঠায় থাকবে।{" "}
                  <button onClick={() => setActive(selected[0])}>
                    হেডারসহ প্রথম পৃষ্ঠা দেখুন
                  </button>
                </p>
              )}
              <PrintFrame>
                <article className="rp-print-sheet">
                  {renderPageHeader(active === selected[0])}
                  {liveReview && liveReviewPage === active ? (
                    <PlacedQuestion
                      src={liveReview}
                      page={active}
                      value={edit}
                      movable={
                        !original &&
                        !reviewPending &&
                        tool === "view" &&
                        placementMode
                      }
                      onChange={(value) => placePage(active, value)}
                    >
                      {!original && !reviewPending && tool !== "view" && (
                        <RasterTools
                          key={`${active}:${tool}:${liveReview}`}
                          tool={tool}
                          edit={edit}
                          onCommit={commitRaster}
                        />
                      )}
                    </PlacedQuestion>
                  ) : (
                    <div className="rp-print-content">
                      <p role="status">প্রশ্নের ছবি প্রস্তুত হচ্ছে…</p>
                    </div>
                  )}
                </article>
              </PrintFrame>
            </section>
            <p className="rp-muted">
              মূল scan-এর resolution-ই print-এর সীমা। ক্ষুদ্র punctuation ও table
              line দেখে clean mode বাছুন। Rotation করলে overlay reset হয়।
            </p>
          </section>
        </div>
      )}
      {step === "preview" && (
        <>
          <div className="rp-toolbar" data-noprint>
            <button className="rp-action-setup" onClick={() => setStep("edit")}>
              Edit-এ ফিরুন
            </button>
            <button
              disabled={
                busy ||
                !paid ||
                !selected.length ||
                (printKind === "questions" &&
                  printPages.length !== selected.length)
              }
              className="rp-action-print"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
          </div>
          {printKind === "questions" && selected.length > 0 && (
            <section className="rp-panel" data-noprint>
              <h3>প্রশ্নপত্র Auto Fit ও অবস্থান</h3>
              <label>
                যে page ঠিক করবেন
                <select
                  value={selected.includes(active) ? active : selected[0]}
                  onChange={(e) => setActive(+e.target.value)}
                >
                  {selected.map((n) => (
                    <option key={n} value={n}>
                      মূল page {n}
                    </option>
                  ))}
                </select>
              </label>
              {(() => {
                const n = selected.includes(active) ? active : selected[0];
                const value = edits[n] || freshEdit();
                return (
                  <>
                    <div className="rp-toolbar">
                      <button onClick={() => placePage(n, defaultPlacement)}>
                        প্রশ্নপত্র Auto Fit / Reset
                      </button>
                      <button
                        onClick={() =>
                          placePage(n, { ...value, printScale: 0.85 })
                        }
                      >
                        ছোট করে সরানোর জায়গা করুন
                      </button>
                      <button
                        aria-pressed={placementMode}
                        onClick={() => setPlacementMode((v) => !v)}
                      >
                        {placementMode
                          ? "অবস্থান সম্পাদনা বন্ধ"
                          : "প্রশ্নের অবস্থান ঠিক করুন"}
                      </button>
                    </div>
                    <label>
                      আকার · {Math.round(value.printScale * 100)}% (সর্বোচ্চ
                      নিরাপদ fit)
                      <input
                        aria-label="প্রশ্নপত্রের আকার"
                        type="range"
                        min=".4"
                        max="1"
                        step=".01"
                        value={value.printScale}
                        onChange={(e) =>
                          placePage(n, {
                            ...value,
                            printScale: +e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      ওপর–নিচ অবস্থান
                      <input
                        aria-label="প্রশ্নপত্রের ওপর নিচ অবস্থান"
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        value={value.printY}
                        onChange={(e) =>
                          placePage(n, { ...value, printY: +e.target.value })
                        }
                      />
                    </label>
                    <label>
                      বাম–ডান অবস্থান
                      <input
                        aria-label="প্রশ্নপত্রের বাম ডান অবস্থান"
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        value={value.printX}
                        onChange={(e) =>
                          placePage(n, { ...value, printX: +e.target.value })
                        }
                      />
                    </label>
                  </>
                );
              })()}
              <p className="rp-muted">
                Border-এর ভেতরে ধরে সরান; চার কোণা বা পাশের handle ধরে টেনে আকার
                ঠিক করুন। পুরো fit-এ সরানোর জায়গা না থাকলে “ছোট করে সরানোর জায়গা
                করুন” চাপুন। অবস্থান সম্পাদনা চালু থাকলে মোবাইলে দুই আঙুলে pinch করে
                আকার, এক আঙুলে অবস্থান; কম্পিউটারে mouse wheel-এ আকার ও বাম
                click-drag-এ অবস্থান ঠিক করুন। Ctrl/⌘ + wheel ব্রাউজারের zoom-এর
                জন্য। সর্বোচ্চ fit-এ পৌঁছালে আর বড় হবে না। Auto Fit হেডারের নিচের
                জায়গায় অনুপাত ঠিক রেখে সর্বোচ্চ আকারে বসায়। ছবির ভেতরের সাদা জায়গা
                আগে Crop করুন। অবস্থান বদলাতে ফাঁকা জায়গা থাকতে হবে; পুরো জায়গা ভরে
                গেলে সেই দিকে সরবে না। Margin ও header অপরিবর্তিত; লেখা কাটা হবে
                না। Preview zoom শুধু স্ক্রিনে দেখার জন্য।
              </p>
            </section>
          )}
          <PrintFrame>
            <section id="ready-print">
              {printKind === "ai" ? (
                <AIAnswerSheets job={aiJob} selected={selected} />
              ) : printKind !== "questions" ? (
                <AnswerSheets
                  selected={selected}
                  entries={entries}
                  blank={printKind === "blank"}
                />
              ) : (
                printPages.map((src, i) => (
                  <article className="rp-print-sheet" key={selected[i]}>
                    {renderPageHeader(i === 0)}
                    <PlacedQuestion
                      src={src}
                      page={selected[i]}
                      value={edits[selected[i]] || freshEdit()}
                      movable={placementMode}
                      onChange={(value) => placePage(selected[i], value)}
                    />
                  </article>
                ))
              )}
            </section>
          </PrintFrame>
        </>
      )}
      {checkout && (
        <ReadyCheckout
          paperId={paper.id}
          selected={selected}
          snapshot={snapshot()}
          beforePurchase={async () => {
            await document.fonts.ready;
            for (const n of selected) {
              if (!pages[n - 1]) throw new Error("Page unavailable");
              const c = await renderEdited(
                await qualityPage(n),
                edits[n] || freshEdit(),
              );
              c.width = c.height = 0;
            }
          }}
          onClose={() => setCheckout(false)}
          onPaid={async (id) => {
            const saved = await getReadyPurchase(id);
            if (saved) {
              setEdits(saved.snapshot.edits);
              setHeader(saved.snapshot.header);
              setHeaderStyle(saved.snapshot.headerStyle);
              setHeaderSettings(saved.snapshot.headerSettings);
              setHeaderLine(saved.snapshot.headerLine);
              setHeaderGap(saved.snapshot.headerGap);
              setEntries(saved.answers);
            }
            setReceipt(id);
            setPaidSelection(readySelectionIdentity(selected));
            setCheckout(false);
            setActive(selected[0]);
            setStep("edit");
            setMessage("প্রশ্নপত্র ও সংশ্লিষ্ট উত্তরপত্র অ্যাকাউন্টে সংরক্ষিত।");
          }}
        />
      )}
      {viewer && (
        <PageViewer
          {...viewer}
          selected={selected.includes(viewer.page)}
          onToggle={
            viewer.selectable ? () => togglePage(viewer.page) : undefined
          }
          onClose={() => setViewer(null)}
        />
      )}
    </main>
  );
}
