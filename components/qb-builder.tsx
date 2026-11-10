"use client";
import { PAPER_SECTION_ORDER, paperSectionTitle } from "@/lib/paper-sections";
import RichTextField from "@/components/paper-builder/rich-text-field";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Download, Settings2, Shuffle, Plus, AlertCircle } from "lucide-react";
import HeaderManager from "@/components/paper-builder/header-manager";
import { currentHeader } from "@/lib/paper-header";
import PaperSettingsPanel from "@/components/paper-builder/settings";
import PaperPreview, {
  type PreviewQuestion,
} from "@/components/paper-builder/preview";
import {
  defaults,
  restoreSettings,
  paperDimensions,
  bookletOrder,
  duplicateIds,
  questionType,
  shuffled,
  safeImage,
  type PaperSettings,
  type PaperItem,
} from "@/lib/paper-builder";
import "katex/dist/katex.min.css";
import "./paper-builder/paper.css";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";
export default function QbBuilder({
  supportHref = "/contact-us",
  tutorialHref,
}: {
  supportHref?: string;
  tutorialHref?: string;
}) {
  const [items, setItems] = useState<PaperItem[]>([]),
    [s, setSettings] = useState<PaperSettings>(defaults),
    [loading, setLoading] = useState(true),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [edit, setEdit] = useState(false),
    [open, setOpen] = useState(false),
    [division, setDivision] = useState(""),
    [storageError, setStorageError] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [newDivision, setNewDivision] = useState("");
  const [divisionQuestion, setDivisionQuestion] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [exchanging, setExchanging] = useState(false);
  async function questionAction(
    id: string,
    action: "remove" | "reset" | "exchange",
  ) {
    setActionMessage("");
    if (action === "reset") {
      const edits = { ...s.edits };
      delete edits[id];
      update({ ...s, edits });
      return;
    }
    if (action === "remove") {
      if (!window.confirm("এই প্রশ্নপত্র থেকে প্রশ্নটি সরাবেন?")) return;
      update({ ...s, excludedIds: [...s.excludedIds, id] });
      return;
    }
    if (exchanging) return;
    setExchanging(true);
    try {
      const res = await fetch("/api/qb/replacement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, exclude: items.map((q) => q.id) }),
      });
      const result = await res.json();
      if (!res.ok || !result.items?.[0])
        throw Error(result.error || "বিকল্প পাওয়া যায়নি।");
      const replacement = result.items[0] as PaperItem;
      const next = items.map((q) => (q.id === id ? replacement : q));
      localStorage.setItem(
        "qb:selected",
        JSON.stringify(next.map((q) => q.id)),
      );
      update({ ...s });
      setItems(next);
      setActionMessage("একই অধ্যায় ও ধরনের বিকল্প প্রশ্ন বসানো হয়েছে।");
    } catch (e) {
      setActionMessage(
        e instanceof Error ? e.message : "প্রশ্ন বদলানো যায়নি।",
      );
    } finally {
      setExchanging(false);
    }
  }
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const controller = new AbortController();
    try {
      const restored = restoreSettings(
        JSON.parse(localStorage.getItem("qb:settings") || "{}"),
      );
      setSettings(restored);
      setDivision(restored.cfg.divisionFilter);
    } catch {}
    setReady(true);
    let ids: unknown = [];
    try {
      ids = JSON.parse(localStorage.getItem("qb:selected") || "[]");
    } catch {}
    if (!Array.isArray(ids) || !ids.length) {
      setLoading(false);
      return;
    }
    fetch("/api/qb/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const d = await r.json();
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("প্রশ্ন লোড হয়নি। ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করুন।");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("qb:settings", JSON.stringify(s));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [s, ready]);
  const history = useRef<{
    past: { settings: PaperSettings; items: PaperItem[] }[];
    future: { settings: PaperSettings; items: PaperItem[] }[];
  }>({ past: [], future: [] });
  const liveItems = useRef(items);
  liveItems.current = items;
  const liveSettings = useRef(s);
  liveSettings.current = s;
  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    if (ready && !loading && items.length) {
      try {
        localStorage.setItem(
          "qb:selected",
          JSON.stringify(items.map((q) => q.id)),
        );
      } catch {
        setStorageError(true);
      }
    }
  }, [items, ready, loading]);
  const undo = () => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push({ settings: s, items });
    setSettings(prev.settings);
    setItems(prev.items);
    setHistoryTick((v) => v + 1);
  };
  const redo = () => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push({ settings: s, items });
    setSettings(next.settings);
    setItems(next.items);
    setHistoryTick((v) => v + 1);
  };
  const update = useCallback((next: PaperSettings) => {
    history.current.past.push({
      settings: liveSettings.current,
      items: liveItems.current,
    });
    if (history.current.past.length > 60) history.current.past.shift();
    history.current.future = [];
    liveSettings.current = next;
    setHistoryTick((v) => v + 1);
    setSettings(next);
    try {
      localStorage.setItem("qb:settings", JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);
  const data = useMemo(
    () =>
      items
        .filter((q) => !s.excludedIds.includes(q.id))
        .map((q) => ({ ...q, ...s.edits[q.id] })),
    [items, s.edits, s.excludedIds],
  );
  const counts = useMemo(
    () => ({
      MCQ: data.filter((q) => questionType(q) === "MCQ").length,
      CQ: data.filter((q) => questionType(q) === "CQ").length,
      SHORT: data.filter((q) => questionType(q) === "SHORT").length,
    }),
    [data],
  );
  const duplicates = useMemo(() => duplicateIds(data), [data]);
  const divisions = Array.from(
    new Set(
      data
        .filter((q) => questionType(q) === "CQ")
        .map((q) => s.attachments[q.id]?.division || q.topic || "সাধারণ বিভাগ"),
    ),
  );
  function info(key: keyof PaperSettings["info"], value: string) {
    update({ ...s, info: { ...s.info, [key]: value } });
  }
  function attachment(
    id: string,
    patch: Partial<PaperSettings["attachments"][string]>,
  ) {
    const old = s.attachments[id] || {
      image: "",
      division: "",
      important: false,
    };
    update({
      ...s,
      attachments: { ...s.attachments, [id]: { ...old, ...patch } },
    });
  }
  function questionEdit(q: PaperItem, patch: Partial<PaperItem>) {
    update({
      ...s,
      edits: {
        ...s.edits,
        [q.id]: {
          ...{
            text: q.text,
            options: q.options,
            stimulus: q.stimulus,
            subQuestions: q.subQuestions,
          },
          ...patch,
        },
      },
    });
  }
  async function print() {
    setOpen(false);
    await document.fonts.ready;
    await Promise.all(
      Array.from(
        document.querySelectorAll<HTMLImageElement>(".paper-sheet img"),
      ).map((img) => img.decode().catch(() => {})),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (!s.cfg.booklet) {
      window.print();
      return;
    }
    const sheets = Array.from(
      document.querySelectorAll<HTMLElement>("#paper .paper-sheet"),
    );
    if (!sheets.length) return;
    const output = document.createElement("div");
    output.className = "booklet-output";
    const [w, h] = paperDimensions(s),
      sw = Math.max(w, h),
      sh = Math.min(w, h),
      scale = Math.min(sw / 2 / w, sh / h);
    for (const side of bookletOrder(sheets.length)) {
      const row = document.createElement("div");
      row.className = "booklet-imposed";
      row.style.cssText = `width:${sw}mm;height:${sh}mm;display:flex;overflow:hidden;`;
      for (const index of side) {
        const cell = document.createElement("div");
        cell.style.cssText = `width:${sw / 2}mm;height:${sh}mm;overflow:hidden;display:flex;justify-content:center;align-items:center;`;
        if (index !== null) {
          const clone = sheets[index].cloneNode(true) as HTMLElement;
          clone
            .querySelectorAll("[data-noprint]")
            .forEach((node) => node.remove());
          clone.style.zoom = String(scale);
          clone.style.flexShrink = "0";
          cell.append(clone);
        }
        row.append(cell);
      }
      output.append(row);
    }
    const printStyle = document.createElement("style");
    printStyle.textContent = `@media print { @page {size:${sw}mm ${sh}mm;margin:0} body.booklet-print main,body.booklet-print header,body.booklet-print footer,body.booklet-print nav,body.booklet-print [data-noprint]{display:none!important} body.booklet-print .booklet-output{display:block!important} .booklet-imposed{break-after:page!important}.booklet-imposed:last-child{break-after:auto!important}.booklet-imposed .paper-sheet{break-after:auto!important;page-break-after:auto!important;} }`;
    const cleanup = () => {
      output.remove();
      printStyle.remove();
      document.body.classList.remove("booklet-print");
      window.removeEventListener("afterprint", cleanup);
    };
    document.body.append(output, printStyle);
    document.body.classList.add("booklet-print");
    window.addEventListener("afterprint", cleanup);
    window.print();
  }
  const enriched = {
    ...s,
    info: s.header.enabled
      ? s.info
      : {
          ...s.info,
          cls:
            s.info.cls ||
            Array.from(
              new Set(data.map((q) => q.category).filter(Boolean)),
            ).join(", "),
          subject:
            s.info.subject ||
            Array.from(
              new Set(data.map((q) => q.subject).filter(Boolean)),
            ).join(", "),
          chapter:
            s.info.chapter ||
            Array.from(new Set(data.map((q) => q.topic).filter(Boolean))).join(
              ", ",
            ),
        },
  };
  const [pw, ph] = paperDimensions(s);
  const style = `@page { size: ${pw}mm ${ph}mm; margin: 0; }`;
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setPreviewScale(
        Math.min(1, Math.max(0.1, (el.clientWidth - 8) / ((pw * 96) / 25.4))),
      ),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pw, loading, items.length]);
  const field = (
    key: keyof PaperSettings["info"],
    label: string,
    placeholder: string,
    large = false,
  ) => (
    <label key={key} className={large ? "block sm:col-span-2" : "block"}>
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      <input
        aria-label={label}
        className={`${input} ${large ? "text-center !text-xl font-bold" : ""}`}
        value={s.info[key]}
        placeholder={placeholder}
        onChange={(e) => info(key, e.target.value)}
      />
    </label>
  );
  function sections(setName: string) {
    const base = s.seed + (setName === "খ" ? 7919 : 0);
    const types = PAPER_SECTION_ORDER;
    return types.flatMap((type) => {
      const selected = shuffled(
        data.filter((q) => questionType(q) === type),
        base,
      );
      const groups =
        type === "CQ" && s.show.divisions
          ? division
            ? [division]
            : divisions
          : [""];
      return groups.map((group) => {
        const qs = selected.filter(
          (q) =>
            !group ||
            (s.attachments[q.id]?.division || q.topic || "সাধারণ বিভাগ") ===
              group,
        );
        if (!qs.length) return null;
        const views: PreviewQuestion[] = qs.map((q, i) => {
          const opts = shuffled(
            Object.entries(q.options || {}).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
            base ? base + i + 1 : 0,
          );
          return { q, opts, ci: opts.findIndex(([key]) => key === q.correct) };
        });
        return (
          <PaperPreview
            key={`${setName}-${type}-${group}`}
            onQuestionAction={edit ? questionAction : undefined}
            previewScale={previewScale}
            s={enriched}
            questions={views}
            type={type}
            setName={setName}
            duplicate={duplicates}
            title={paperSectionTitle(type, s.info.section, group)}
            onImageSize={(id, size) => attachment(id, { size })}
          />
        );
      });
    });
  }
  if (loading)
    return <p className="py-12 text-center">প্রশ্নপত্র প্রস্তুত হচ্ছে…</p>;
  if (error)
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-6 text-red-800">
        {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-3 underline"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  if (!items.length)
    return (
      <div className="rounded-2xl border bg-white px-6 py-16 text-center">
        <h2 className="text-xl font-bold">আপনার প্রশ্নপত্র তৈরি করুন</h2>
        <p className="my-3 text-slate-500">
          প্রথমে প্রশ্ন নির্বাচন করুন, তারপর হেডার ও পেজ সাজান।
        </p>
        <Link
          href="/question-builder"
          className="inline-flex rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white"
        >
          + প্রশ্ন বাছাই করুন
        </Link>
      </div>
    );
  return (
    <div className="paper-builder-root">
      <style>{style}</style>
      <div
        data-noprint
        className="mb-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Question paper studio
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            আপনার প্রশ্নপত্র, আপনার মতো
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length}টি প্রশ্ন · {s.cfg.paper} · প্রিন্ট-রেডি প্রিভিউ
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-semibold lg:hidden"
          >
            <Settings2 size={18} /> সেটিংস
          </button>
          <button
            onClick={print}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white"
          >
            <Download size={18} /> ডাউনলোড
          </button>
        </div>
      </div>
      {storageError && (
        <p
          data-noprint
          role="alert"
          className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          ব্রাউজারের স্টোরেজে সেটিংস রাখা যায়নি। সেভ করার আগে স্টোরেজের
          অনুমতি/খালি জায়গা পরীক্ষা করুন।
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
        <PaperSettingsPanel
          settings={s}
          update={update}
          edit={edit}
          setEdit={setEdit}
          open={open}
          onClose={close}
          counts={counts}
          supportHref={supportHref}
          tutorialHref={tutorialHref}
          onPrint={print}
          onUndo={undo}
          onRedo={redo}
          canUndo={history.current.past.length > 0}
          canRedo={history.current.future.length > 0}
        />
        <div className="min-w-0">
          <div
            data-noprint
            className="studio-toolbar mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2"
          >
            <span className="text-xs font-bold">সম্পূর্ণ প্রশ্নপত্র:</span>
            {(
              [
                ["bold", "B"],
                ["italic", "I"],
                ["underline", "U"],
                ["strike", "S"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-label={`${key} প্রশ্নপত্র`}
                aria-pressed={s.cfg[key]}
                className="studio-choice"
                onClick={() =>
                  update({ ...s, cfg: { ...s.cfg, [key]: !s.cfg[key] } })
                }
              >
                {label}
              </button>
            ))}
            <label className="text-xs">
              রং{" "}
              <input
                aria-label="প্রশ্নের রং"
                type="color"
                value={s.cfg.ink}
                onChange={(e) =>
                  update({ ...s, cfg: { ...s.cfg, ink: e.target.value } })
                }
              />
            </label>
            <button
              className="studio-choice"
              disabled={!history.current.past.length}
              onClick={undo}
            >
              ↶
            </button>
            <button
              className="studio-choice"
              disabled={!history.current.future.length}
              onClick={redo}
            >
              ↷
            </button>
          </div>
          {(actionMessage || exchanging) && (
            <p
              data-noprint
              role="status"
              className="mb-3 rounded-xl bg-blue-50 p-3 text-sm"
            >
              {exchanging ? "বিকল্প প্রশ্ন খোঁজা হচ্ছে…" : actionMessage}
            </p>
          )}
          <HeaderManager settings={s} update={update} />
          <details
            data-noprint
            className="mb-5 rounded-xl border border-slate-200 bg-white p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              Page Setup ও অতিরিক্ত সেটিংস
            </summary>
            <section
              data-noprint
              className="mb-5 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Page Setup ও হেডার</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  স্বয়ংক্রিয় সংরক্ষণ
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field(
                  "inst",
                  "স্কুল / প্রতিষ্ঠানের নাম",
                  "আপনার প্রতিষ্ঠানের নাম",
                  true,
                )}
                {field(
                  "exam",
                  "পরীক্ষা / প্রোগ্রামের নাম",
                  "যেমন: অর্ধবার্ষিক পরীক্ষা",
                )}
                {field("cls", "শ্রেণি", "নবম/দশম")}
                {field("subject", "বিষয়", "গণিত")}
                {field(
                  "chapter",
                  "অধ্যায় / টপিক",
                  "অধ্যায় ১ – বাস্তব সংখ্যা",
                )}
                {field(
                  "minutes",
                  "সময় (মিনিট বা পূর্ণ বিবরণ)",
                  "যেমন: ৩০ মিনিট / ১ ঘণ্টা ১৫ মিনিট",
                )}
                {field("marks", "পূর্ণমান", "১০০")}
                {field("section", "MCQ অংশের শিরোনাম", "বহুনির্বাচনি অংশ")}
                {field("code", "বিষয় কোড", "১০৯")}
                {s.show.address &&
                  field("address", "প্রতিষ্ঠানের ঠিকানা", "আপনার ঠিকানা")}
                {s.show.watermark &&
                  field("watermark", "জলছাপের লেখা", "খসড়া")}
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">
                    নির্দেশনা
                  </span>
                  <textarea
                    className={input}
                    aria-label="নির্দেশনা"
                    rows={2}
                    value={s.info.instr}
                    onChange={(e) => info("instr", e.target.value)}
                  />
                </label>
              </div>
            </section>
          </details>
          <div data-noprint className="mb-4 flex flex-wrap items-center gap-2">
            <Link
              href="/question-builder?append=1"
              className="inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <Plus size={16} /> আরও প্রশ্ন যুক্ত করুন
            </Link>
            {(["ক", "খ"] as const).map((name) => (
              <button
                key={name}
                aria-pressed={s.setName === name}
                onClick={() => {
                  const header = currentHeader(s);
                  header.fields.setCode.value = `সেট ${name}`;
                  update({ ...s, setName: name, header });
                }}
                className={`rounded-xl border px-4 py-2 text-sm ${s.setName === name ? "bg-slate-900 text-white" : "bg-white"}`}
              >
                সেট {name}
              </button>
            ))}
            <button
              onClick={() =>
                update({ ...s, seed: Math.floor(Math.random() * 999999) + 1 })
              }
              className="inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <Shuffle size={15} /> এলোমেলো
            </button>
            {s.seed > 0 && (
              <button
                onClick={() => update({ ...s, seed: 0 })}
                className="text-sm underline"
              >
                ক্রম রিসেট
              </button>
            )}
          </div>
          {edit && (
            <section
              data-noprint
              className="mb-4 rounded-xl border border-emerald-200 bg-white p-4"
            >
              <h3 className="mb-2 font-bold">বিভাগ পরিচালনা (CQ)</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  className={input}
                  aria-label="নতুন বিভাগের নাম"
                  placeholder="নতুন বিভাগের নাম"
                  value={newDivision}
                  onChange={(e) => setNewDivision(e.target.value)}
                  maxLength={100}
                />
                <select
                  aria-label="বিভাগে যোগ করার প্রশ্ন"
                  className={input}
                  value={divisionQuestion}
                  onChange={(e) => setDivisionQuestion(e.target.value)}
                >
                  <option value="">প্রশ্ন বাছুন</option>
                  {data
                    .filter((q) => questionType(q) === "CQ")
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.text.slice(0, 70)}
                      </option>
                    ))}
                </select>
                <button
                  className="studio-choice"
                  disabled={!newDivision.trim() || !divisionQuestion}
                  onClick={() => {
                    setNewDivision("");
                    update({
                      ...s,
                      show: { ...s.show, divisions: true },
                      attachments: {
                        ...s.attachments,
                        [divisionQuestion]: {
                          ...(s.attachments[divisionQuestion] || {
                            image: "",
                            division: "",
                            important: false,
                          }),
                          division: newDivision.trim(),
                        },
                      },
                    });
                  }}
                >
                  বিভাগে যোগ / সরান
                </button>
              </div>
              {divisions.map((name) => (
                <div
                  key={name}
                  className="mb-2 flex items-center justify-between gap-2 rounded bg-slate-50 p-2 text-sm"
                >
                  <span>{name}</span>
                  <div className="flex gap-2">
                    <button
                      className="studio-choice"
                      onClick={() => {
                        const renamed = window
                          .prompt("বিভাগের নতুন নাম", name)
                          ?.trim();
                        if (!renamed) return;
                        const attachments = { ...s.attachments };
                        data
                          .filter(
                            (q) =>
                              questionType(q) === "CQ" &&
                              (s.attachments[q.id]?.division ||
                                q.topic ||
                                "সাধারণ বিভাগ") === name,
                          )
                          .forEach((q) => {
                            attachments[q.id] = {
                              ...(attachments[q.id] || {
                                image: "",
                                division: "",
                                important: false,
                              }),
                              division: renamed,
                            };
                          });
                        update({ ...s, attachments });
                      }}
                    >
                      নাম বদল
                    </button>
                    <button
                      className="studio-choice"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `“${name}” বিভাগের সব প্রশ্ন এই পত্র থেকে সরাবেন?`,
                          )
                        )
                          return;
                        const ids = data
                          .filter(
                            (q) =>
                              questionType(q) === "CQ" &&
                              (s.attachments[q.id]?.division ||
                                q.topic ||
                                "সাধারণ বিভাগ") === name,
                          )
                          .map((q) => q.id);
                        setDivision("");
                        update({
                          ...s,
                          cfg: { ...s.cfg, divisionFilter: "" },
                          excludedIds: [...new Set([...s.excludedIds, ...ids])],
                        });
                      }}
                    >
                      বিভাগ মুছুন
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
          {s.show.divisions && (
            <label data-noprint className="mb-4 block text-sm">
              CQ বিভাগ ফিল্টার
              <select
                className={`${input} mt-1`}
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value);
                  update({
                    ...s,
                    cfg: { ...s.cfg, divisionFilter: e.target.value },
                  });
                }}
              >
                <option value="">সব বিভাগ</option>
                {divisions.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          )}
          {edit && (
            <section
              data-noprint
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <h2 className="font-bold">প্রশ্ন সম্পাদনা ও সংযুক্তি</h2>
              <p className="mb-3 text-xs text-slate-500">
                পরিবর্তন এই প্রশ্নপত্রেই থাকবে; মূল প্রশ্নব্যাংক বদলাবে না।
              </p>
              <div className="max-h-[500px] space-y-3 overflow-y-auto">
                {data.map((q, i) => (
                  <details
                    key={q.id}
                    className="rounded-xl border bg-white p-3"
                  >
                    <summary className="cursor-pointer text-sm font-semibold">
                      {i + 1}। {q.text.slice(0, 70)}…
                    </summary>
                    <div className="mt-3 space-y-2">
                      <label className="block text-xs">
                        প্রশ্নের লেখা
                        <RichTextField
                          label={`প্রশ্ন ${i + 1}`}
                          value={q.text}
                          onChange={(text) => questionEdit(q, { text })}
                        />
                      </label>
                      {questionType(q) === "CQ" && (
                        <>
                          <label className="block text-xs">
                            উদ্দীপক
                            <RichTextField
                              label={`উদ্দীপক ${i + 1}`}
                              value={q.stimulus || q.text}
                              onChange={(stimulus) =>
                                questionEdit(q, { stimulus })
                              }
                            />
                          </label>
                          {Object.entries(q.subQuestions || {}).map(
                            ([key, val]) => (
                              <label key={key} className="block text-xs">
                                উপপ্রশ্ন {key}
                                <RichTextField
                                  label={`উপপ্রশ্ন ${i + 1} ${key}`}
                                  value={val}
                                  onChange={(text) =>
                                    questionEdit(q, {
                                      subQuestions: {
                                        ...q.subQuestions!,
                                        [key]: text,
                                      },
                                    })
                                  }
                                />
                              </label>
                            ),
                          )}
                        </>
                      )}
                      {questionType(q) === "MCQ" &&
                        Object.entries(q.options || {}).map(([key, val]) => (
                          <label key={key} className="block text-xs">
                            অপশন {key}
                            <RichTextField
                              label={`অপশন ${i + 1} ${key}`}
                              value={val}
                              onChange={(text) =>
                                questionEdit(q, {
                                  options: { ...q.options, [key]: text },
                                })
                              }
                            />
                          </label>
                        ))}
                      <label className="block text-xs">
                        ছবির HTTPS URL
                        <input
                          className={input}
                          type="url"
                          value={s.attachments[q.id]?.image || ""}
                          onChange={(e) =>
                            attachment(q.id, { image: e.target.value })
                          }
                        />
                      </label>
                      {s.attachments[q.id]?.image &&
                        !safeImage(s.attachments[q.id].image) && (
                          <p className="text-xs text-red-600">
                            সঠিক HTTPS ছবির URL দিন।
                          </p>
                        )}
                      {questionType(q) === "CQ" && (
                        <label className="block text-xs">
                          বিভাগের নাম
                          <input
                            className={input}
                            value={s.attachments[q.id]?.division || ""}
                            placeholder={q.topic || "সাধারণ বিভাগ"}
                            onChange={(e) =>
                              attachment(q.id, { division: e.target.value })
                            }
                          />
                        </label>
                      )}
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={s.attachments[q.id]?.important || false}
                          onChange={(e) =>
                            attachment(q.id, { important: e.target.checked })
                          }
                        />{" "}
                        গুরুত্বপূর্ণ প্রশ্ন
                      </label>
                      <button
                        onClick={() => {
                          const edits = { ...s.edits };
                          delete edits[q.id];
                          update({ ...s, edits });
                        }}
                        className="text-xs text-emerald-700 underline"
                      >
                        প্রশ্নের মূল লেখা ফিরিয়ে আনুন
                      </button>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
          {s.show.duplicates && duplicates.size > 0 && (
            <p
              data-noprint
              className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
            >
              <AlertCircle size={16} />
              {duplicates.size}টি পুনরাবৃত্ত প্রশ্ন চিহ্নিত হয়েছে।
            </p>
          )}
          <div
            className={`paper-preview-scroll ${s.cfg.format === "ans" ? "paper-answer-only" : ""}`}
            ref={previewRef}
            id="paper"
          >
            {s.show.answerSheet && (
              <div
                className="paper-page-viewport"
                style={{ zoom: previewScale }}
              >
                <div
                  className="paper-sheet"
                  style={{
                    width: `${pw}mm`,
                    minHeight: `${ph}mm`,
                    padding: `${s.cfg.marginTop}px ${s.cfg.marginRight}px ${s.cfg.marginBottom}px ${s.cfg.marginLeft}px`,
                  }}
                >
                  <h2 className="mb-5 text-center text-xl font-bold">
                    উত্তরপত্র
                  </h2>
                  <p>
                    নাম: ..................................... রোল:
                    ..................
                  </p>
                  <div
                    style={{
                      height: `${Math.max(100, (ph * 96) / 25.4 - s.cfg.marginTop - s.cfg.marginBottom - 100)}px`,
                      backgroundImage:
                        "repeating-linear-gradient(transparent,transparent 29px,#ccc 29px,#ccc 30px)",
                    }}
                  />
                </div>
              </div>
            )}
            {(s.show.autoSet ? ["ক", "খ"] : [s.setName]).map((name) => (
              <div key={name}>{sections(name)}</div>
            ))}
          </div>
          <p
            data-noprint
            className="mt-4 text-xs leading-relaxed text-slate-500"
          >
            PDF পেতে Print → Save as PDF বেছে নিন। Paper size: {s.cfg.paper},
            scale: 100%, margins: None, browser headers/footers: Off।
          </p>
        </div>
      </div>
    </div>
  );
}
