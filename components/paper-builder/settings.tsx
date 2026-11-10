"use client";
import LayoutControls from "./layout-controls";
import { useEffect, useRef } from "react";
import { Download, X } from "lucide-react";
import type { PaperSettings } from "@/lib/paper-builder";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="relative flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {hint && (
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer absolute right-0 top-1/2 z-10 h-7 w-12 -translate-y-1/2 cursor-pointer opacity-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className="relative h-7 w-12 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600 peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5"
        aria-hidden="true"
      />
    </label>
  );
}
function Choices<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="my-3">
      <legend className="mb-2 text-xs text-slate-500">{label}</legend>
      <div className="flex gap-1.5">
        {options.map(([v, l]) => (
          <button
            type="button"
            key={v}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`min-w-0 flex-1 rounded-xl border px-2 py-2 text-sm transition ${value === v ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export default function PaperSettingsPanel({
  settings: s,
  update,
  edit,
  setEdit,
  open,
  onClose,
  counts,
  supportHref,
  tutorialHref,
  onPrint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  settings: PaperSettings;
  update: (s: PaperSettings) => void;
  edit: boolean;
  setEdit: (v: boolean) => void;
  open: boolean;
  onClose: () => void;
  counts: { MCQ: number; CQ: number; SHORT: number };
  supportHref?: string;
  tutorialHref?: string;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    if (panel.current) panel.current.scrollTop = 0;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, onClose]);
  const cfg = <K extends keyof PaperSettings["cfg"]>(
    key: K,
    v: PaperSettings["cfg"][K],
  ) => update({ ...s, cfg: { ...s.cfg, [key]: v } });
  const toggle = (
    key: keyof PaperSettings["show"],
    label: string,
    hint?: string,
  ) => (
    <Toggle
      key={key}
      label={label}
      hint={hint}
      checked={s.show[key]}
      onChange={(v) => update({ ...s, show: { ...s.show, [key]: v } })}
    />
  );
  const heading = (title: string) => (
    <h3 className="studio-section-title mb-2 text-base font-bold text-slate-900">
      {title}
    </h3>
  );
  const quantity = (
    key: "cqAnswer" | "shortAnswer" | "mcqAnswer",
    title: string,
    total: number,
  ) => (
    <div className="my-3">
      {heading(title)}
      <label className="text-xs text-slate-500">
        কতটি প্রশ্নের উত্তর দিতে হবে?
        <span className="mt-2 flex items-center gap-2">
          <input
            aria-label={`${title}: উত্তর দিতে হবে`}
            type="number"
            min={0}
            max={total}
            value={Math.min(s.cfg[key] || total, total)}
            onChange={(e) =>
              cfg(key, Math.max(0, Math.min(total, Number(e.target.value))))
            }
            className={`${field} max-w-24`}
          />
          <span>/ {total}টি</span>
        </span>
      </label>
    </div>
  );
  return (
    <>
      {open && (
        <button
          data-noprint
          aria-label="সেটিংস বন্ধ করুন"
          onClick={onClose}
          className="fixed inset-0 z-[70] bg-slate-950/50 lg:hidden"
        />
      )}
      <aside
        ref={panel}
        tabIndex={-1}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-labelledby="paper-settings-title"
        data-noprint
        className={`${open ? "fixed left-0 top-0 bottom-0 z-[80] w-[min(88vw,390px)] h-[100dvh]" : "hidden"} overflow-y-auto border border-slate-200 bg-slate-50 p-5 shadow-lg lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:rounded-2xl lg:shadow-sm`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="paper-settings-title"
            className="text-xl font-bold text-slate-900"
          >
            ⚙ সেটিংস
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="সেটিংস বন্ধ করুন"
            className="rounded-lg p-2 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <button
          type="button"
          onClick={onPrint}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white"
        >
          <Download size={18} /> ডাউনলোড / প্রিন্ট
        </button>
        <button
          className="mb-3 w-full rounded-xl bg-blue-600 p-3 font-bold text-white"
          onClick={() => {
            onClose();
            document.getElementById("paper-save-name")?.focus();
            document
              .getElementById("paper-save-name")
              ?.scrollIntoView({ block: "center", behavior: "smooth" });
          }}
        >
          সংরক্ষণ করুন
        </button>
        <details className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
          <summary className="cursor-pointer text-center font-bold text-red-700">
            শিখুন — ব্যবহার নির্দেশিকা
          </summary>
          <p className="mt-2">
            এডিটিং মোডে প্রশ্নের লেখা ও অপশন বদলান। Page Setup থেকে মার্জিন,
            পেপার ও কলাম সাজান। সেভ করতে উপরের নামের ঘরে নাম লিখুন। PDF পেতে
            প্রিন্ট ডায়ালগে Save as PDF বাছুন।
          </p>
        </details>
        {tutorialHref && (
          <a
            href={tutorialHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700"
          >
            ভিডিও টিউটোরিয়াল ↗
          </a>
        )}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            className="studio-choice disabled:opacity-40"
          >
            ↶ আনডু
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            className="studio-choice disabled:opacity-40"
          >
            ↷ রিডু
          </button>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3">
          <Toggle
            label="এডিটিং মোড"
            checked={edit}
            onChange={setEdit}
            hint="প্রশ্নের লেখা, অপশন ও সংযুক্তি সম্পাদনা করুন"
          />
        </div>
        {toggle(
          "divisions",
          "বিভাগ অনুযায়ী",
          "CQ বিভাগ শিরোনাম ও ফিল্টার দেখাবে।",
        )}
        <section className="my-4 border-t pt-4">
          {heading("প্রশ্নে সংযুক্তি")}
          <Toggle
            label="উত্তরপত্র"
            checked={s.cfg.ansKey}
            onChange={(v) => cfg("ansKey", v)}
          />
          {toggle("important", "গুরুত্বপূর্ণ প্রশ্ন")}
          {toggle("tags", "প্রশ্নের তথ্য")}
          {toggle("examinee", "শিক্ষার্থীর তথ্য")}
          {toggle("instructor", "ইন্সট্রাক্টরের তথ্য")}
          {toggle("obtained", "প্রাপ্ত নম্বর ঘর")}
          {toggle("subjCode", "বিষয় কোড")}
          {toggle("marks", "প্রশ্নের মার্ক")}
          {toggle("omr", "OMR যুক্ত")}
        </section>
        <section className="border-t pt-4">
          {quantity("cqAnswer", "সৃজনশীল প্রশ্ন", counts.CQ)}
          <label className="text-xs text-slate-500">
            ছবির ডিফল্ট আকার — {s.cfg.imageSize}px
          </label>
          <Choices
            label="ছবির আকার"
            value={s.cfg.imageSize}
            options={[
              [160, "ছোট"],
              [280, "স্বাভাবিক"],
              [400, "বড়"],
            ]}
            onChange={(v) => cfg("imageSize", v)}
          />
          <input
            aria-label="ছবির ডিফল্ট আকার"
            className="w-full accent-emerald-500"
            type="range"
            min={80}
            max={600}
            step={10}
            value={s.cfg.imageSize}
            onChange={(e) => cfg("imageSize", +e.target.value)}
          />
          <Choices
            label="ছবির পজিশন"
            value={s.cfg.imagePosition}
            options={[
              ["left", "বামে (Left)"],
              ["center", "মাঝে (Center)"],
            ]}
            onChange={(v) => cfg("imagePosition", v)}
          />
          <p className="mb-4 rounded-lg bg-slate-100 p-3 text-xs leading-relaxed text-slate-500">
            এডিটিং মোডে প্রতিটি প্রশ্নে HTTPS ছবির URL যোগ করুন। প্রিভিউতে ছবির
            + / − / রিসেট দিয়ে আলাদা আকার বদলানো যাবে।
          </p>
          {quantity("shortAnswer", "সংক্ষিপ্ত প্রশ্ন", counts.SHORT)}
          {quantity("mcqAnswer", "বহুনির্বাচনি প্রশ্ন", counts.MCQ)}
        </section>
        <section className="my-4 border-t pt-4">
          {heading("প্রশ্নের মেটাডাটা (হেডার)")}
          {toggle("title", "প্রতিষ্ঠানের নাম")}
          {toggle("cls", "শ্রেণির নাম")}
          {toggle("subject", "বিষয়ের নাম")}
          {toggle("chapter", "অধ্যায়ের নাম")}
          {toggle("exam", "প্রোগ্রাম/পরীক্ষার নাম")}
          {toggle("instr", "নির্দেশনা")}
          {toggle("setCode", "সেট কোড")}
        </section>
        <section className="my-4 border-t pt-4">
          {heading("ডকুমেন্ট কাস্টমাইজেশন")}
          <Choices
            label="টেক্সট এলাইনমেন্ট"
            value={s.cfg.align}
            options={[
              ["left", "বামে"],
              ["center", "মাঝে"],
              ["right", "ডানে"],
              ["justify", "উভয়"],
            ]}
            onChange={(v) => cfg("align", v)}
          />
          <Choices
            label="পেপার সাইজ"
            value={s.cfg.paper}
            options={[
              ["A4", "A4"],
              ["Letter", "Letter"],
              ["Legal", "Legal"],
              ["A5", "A5"],
            ]}
            onChange={(v) => cfg("paper", v)}
          />
          <Choices
            label="অপশন স্টাইল"
            value={s.cfg.style}
            options={[
              ["circle", "◦"],
              ["paren", "(ক)"],
              ["dot", "ক."],
              ["close", "ক)"],
            ]}
            onChange={(v) => cfg("style", v)}
          />
          <label className="my-3 block text-xs text-slate-500">
            ফন্ট পরিবর্তন
            <select
              className={`${field} mt-2`}
              value={s.cfg.font}
              onChange={(e) =>
                cfg("font", e.target.value as PaperSettings["cfg"]["font"])
              }
            >
              <option value="adorsho">আদর্শলিপি</option>
              <option value="hind">Hind Siliguri</option>
              <option value="anek">Anek Bangla</option>
              <option value="serif">Tinos + আদর্শলিপি</option>
            </select>
          </label>
          <fieldset>
            <legend className="text-xs text-slate-500">ফন্ট সাইজ (pt)</legend>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                aria-label="ফন্ট ছোট করুন"
                className="rounded-xl border px-4"
                onClick={() =>
                  cfg("fontSize", Math.max(7, s.cfg.fontSize - 1))
                }
              >
                −
              </button>
              <input
                aria-label="ফন্ট সাইজ"
                type="number"
                min={7}
                max={28}
                className={`${field} text-center`}
                value={s.cfg.fontSize}
                onChange={(e) =>
                  cfg(
                    "fontSize",
                    Math.max(7, Math.min(28, +e.target.value || 14)),
                  )
                }
              />
              <button
                type="button"
                aria-label="ফন্ট বড় করুন"
                className="rounded-xl border px-4"
                onClick={() =>
                  cfg("fontSize", Math.min(28, s.cfg.fontSize + 1))
                }
              >
                +
              </button>
            </div>
          </fieldset>
          <Choices
            label="কলাম (MCQ)"
            value={s.cfg.cols}
            options={[
              [1, "▮"],
              [2, "▮▮"],
              [3, "▮▮▮"],
            ]}
            onChange={(v) => cfg("cols", v)}
          />
          {toggle("divider", "কলাম ডিভাইডার")}
          <Choices
            label="অপশন কলাম"
            value={s.cfg.optCols}
            options={[
              [1, "১"],
              [2, "২"],
              [3, "৩"],
              [4, "৪"],
            ]}
            onChange={(v) => cfg("optCols", v)}
          />
          <Choices
            label="অপশন লেবেল"
            value={s.cfg.label}
            options={[
              ["bn", "ক খ"],
              ["abc", "a b"],
              ["num", "১ ২"],
              ["roman", "i ii"],
            ]}
            onChange={(v) => cfg("label", v)}
          />
          <Choices
            label="ফাইল ফরম্যাট"
            value={s.cfg.format}
            options={[
              ["q", "প্রশ্ন"],
              ["qa", "প্রশ্নোত্তর"],
              ["ans", "উত্তরপত্র"],
              ["sug", "সাজেশন"],
            ]}
            onChange={(v) => cfg("format", v)}
          />
        </section>
        <section className="my-4 border-t pt-4">
          {heading("সহায়ক টুলস")}
          {toggle(
            "duplicates",
            "পুনরাবৃত্ত প্রশ্ন শনাক্ত",
            "একই প্রশ্ন প্রিভিউতে হলুদ রঙে চিহ্নিত হবে।",
          )}
          {toggle(
            "autoSet",
            "অটো সেট তৈরি",
            "ক ও খ সেট আলাদা প্রশ্ন ও অপশন ক্রমে একসঙ্গে প্রিন্ট হবে।",
          )}
        </section>
        <LayoutControls s={s} update={update} counts={counts} />
        <section className="border-t pt-4">
          {heading("ব্র্যান্ডিং")}
          {toggle("address", "ঠিকানা")}
          {toggle("watermark", "জলছাপ")}
          {s.show.watermark && (
            <label className="mt-2 block text-sm text-slate-700">
              <span className="mb-2 block font-medium">জলছাপের নাম / লেখা</span>
              <input
                type="text"
                className={field}
                value={s.info.watermark}
                placeholder="যেমন: আপনার প্রতিষ্ঠান বা নিজের নাম"
                maxLength={10000}
                onChange={(e) =>
                  update({
                    ...s,
                    info: { ...s.info, watermark: e.target.value },
                  })
                }
              />
              <span className="mt-2 block text-xs leading-relaxed text-slate-500">
                এখানে নাম লিখলে প্রিভিউ ও প্রিন্টের জলছাপে সঙ্গে সঙ্গে দেখা
                যাবে।
              </span>
            </label>
          )}
        </section>
        <a
          href={supportHref || "/contact-us"}
          target={supportHref?.startsWith("https://") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="sticky bottom-0 mt-5 block rounded-2xl bg-emerald-600 p-3 text-center text-sm font-bold text-white shadow-lg"
        >
          যেকোনো সমস্যা অথবা প্রশ্ন থাকলে যোগাযোগ করুন
        </a>
      </aside>
    </>
  );
}
