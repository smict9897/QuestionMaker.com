"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Pencil, RefreshCw } from "lucide-react";
import {
  listPaperHeaders,
  savePaperHeader,
  type SavedHeader,
} from "@/app/actions/paper-headers";
import {
  applyHeader,
  currentHeader,
  headerFieldDefinitions,
  newHeader,
  type HeaderKey,
  type PaperHeaderConfig,
} from "@/lib/paper-header";
import type { PaperSettings } from "@/lib/paper-builder";
import HeaderPreview from "./header-preview";
const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500";
export default function HeaderManager({
  settings: s,
  update,
  repository,
}: {
  settings: PaperSettings;
  update: (s: PaperSettings) => void;
  repository?: { list: typeof listPaperHeaders; save: typeof savePaperHeader };
}) {
  const [templates, setTemplates] = useState<SavedHeader[]>([]),
    [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<"smart" | "dynamic">(s.header.mode);
  const [modal, setModal] = useState<"layout" | "editor" | null>(null),
    [draft, setDraft] = useState<PaperHeaderConfig>(newHeader),
    [editId, setEditId] = useState<string | undefined>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null),
    saving = useRef(false);
  const store = repository ?? { list: listPaperHeaders, save: savePaperHeader };
  async function load() {
    setLoadError("");
    try {
      const result = await store.list();
      if (result.ok) setTemplates(result.items);
      else setLoadError(result.error);
    } catch {
      setLoadError("হেডার তালিকা লোড হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => setTab(s.header.mode), [s.header.mode]);
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving.current) setModal(null);
      if (e.key === "Tab") {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])",
        );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
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
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [modal]);
  function create() {
    const h = s.header.enabled ? currentHeader(s) : newHeader();
    if (!s.header.enabled) {
      const mappings = {
        institute: s.info.inst,
        program: s.info.exam,
        class: s.info.cls,
        subject: s.info.subject,
        subjectCode: s.info.code,
        time: s.info.minutes,
        fullMarks: s.info.marks,
        questionType: s.info.section,
        extraInfo: s.info.instr,
      };
      for (const [key, value] of Object.entries(mappings))
        if (value) h.fields[key as HeaderKey].value = value;
    }
    setDraft({
      ...h,
      enabled: true,
      mode: tab,
      name: "",
      templateId: "",
      layout: tab === "smart" ? "header" : h.layout,
    });
    setEditId(undefined);
    setError("");
    setModal(tab === "dynamic" ? "layout" : "editor");
  }
  function edit() {
    if (!s.header.enabled || s.header.mode !== tab) return;
    setDraft(currentHeader(s));
    setEditId(
      templates.some((t) => t.id === s.header.templateId)
        ? s.header.templateId
        : undefined,
    );
    setError("");
    setModal("editor");
  }
  function patch(
    key: HeaderKey,
    change: Partial<PaperHeaderConfig["fields"][HeaderKey]>,
  ) {
    setDraft((old) => ({
      ...old,
      fields: { ...old.fields, [key]: { ...old.fields[key], ...change } },
    }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    if (!draft.name.trim()) {
      setError("হেডারের একটি নাম দিন।");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await store.save(draft, editId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setTemplates((old) => [...old.filter((t) => t.id !== r.item.id), r.item]);
      update(applyHeader(s, r.item.header));
      setModal(null);
    } catch {
      setError("হেডার সেভ হয়নি। আবার চেষ্টা করুন।");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const options = templates.filter((t) => t.header.mode === tab);
  const selected =
    s.header.enabled && s.header.mode === tab ? s.header.templateId : "";
  return (
    <section
      data-noprint
      className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-white p-3 sm:p-4"
    >
      <h2 className="rounded-t-lg bg-[#eef1ee] py-2 text-center text-base font-bold text-slate-900">
        প্রশ্নের হেডার
      </h2>
      <div
        role="tablist"
        aria-label="হেডারের ধরন"
        className="mb-3 grid grid-cols-2 gap-1 rounded-b-lg bg-slate-100 p-1"
      >
        {(["smart", "dynamic"] as const).map((mode) => (
          <button
            key={mode}
            role="tab"
            tabIndex={tab === mode ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? "smart"
                    : e.key === "End"
                      ? "dynamic"
                      : tab === "smart"
                        ? "dynamic"
                        : "smart";
                setTab(next);
                document.getElementById(`header-tab-${next}`)?.focus();
              }
            }}
            id={`header-tab-${mode}`}
            aria-controls="header-template-panel"
            aria-selected={tab === mode}
            onClick={() => setTab(mode)}
            className={`rounded-md px-3 py-2 text-sm font-bold ${tab === mode ? "bg-[#3fbd59] text-white" : "text-slate-600"}`}
          >
            {mode === "smart" ? "Smart Header" : "Dynamic Header"}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="header-template-panel"
        aria-labelledby={`header-tab-${tab}`}
      >
        {options.length > 0 || selected ? (
          <div className="flex flex-wrap gap-2">
            <select
              aria-label={`${tab === "smart" ? "Smart" : "Dynamic"} Header নির্বাচন`}
              className={`${input} min-w-0 flex-1 basis-48`}
              value={selected}
              onChange={(e) => {
                const template = templates.find((t) => t.id === e.target.value);
                if (template) update(applyHeader(s, template.header));
              }}
            >
              <option value="" disabled>
                হেডার নির্বাচন করুন
              </option>
              {selected && !options.some((t) => t.id === selected) && (
                <option value={selected}>
                  {s.header.name} (বর্তমান প্রশ্নপত্র)
                </option>
              )}
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.header.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={create}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Create
            </button>
            <button
              type="button"
              onClick={edit}
              disabled={!selected}
              className="inline-flex items-center gap-1 rounded-lg bg-lime-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={create}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white"
          >
            <Plus size={16} /> Create your first{" "}
            {tab === "smart" ? "Smart" : "Dynamic"} Header
          </button>
        )}
        {!loaded && (
          <p className="mt-2 text-xs text-slate-500">হেডার তালিকা লোড হচ্ছে…</p>
        )}
        {loadError && (
          <div
            role="alert"
            className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800"
          >
            {loadError}
            <button
              type="button"
              onClick={load}
              className="ml-2 inline-flex items-center gap-1 underline"
            >
              <RefreshCw size={12} /> আবার চেষ্টা করুন
            </button>
          </div>
        )}
        {s.header.enabled && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              প্রয়োগ করা আছে: {s.header.name} ·{" "}
              {s.header.mode === "smart" ? "Smart" : "Dynamic"}
            </span>
            <button
              onClick={() =>
                update({ ...s, header: { ...s.header, enabled: false } })
              }
              className="underline"
            >
              আগের সাধারণ হেডারে ফিরুন
            </button>
          </div>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          হেডার আপনার অ্যাকাউন্টে সেভ হবে। নির্বাচিত হেডারের তথ্য প্রশ্নপত্রের
          সঙ্গেও সংরক্ষিত থাকে।
        </p>
      </div>
      {modal && (
        <div
          data-noprint
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <div
            ref={dialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-modal-title"
            className={`max-h-[92dvh] w-full overflow-y-auto rounded-xl bg-white p-4 text-slate-900 shadow-2xl sm:p-6 ${modal === "layout" ? "max-w-xl" : "max-w-3xl"}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="header-modal-title" className="font-bold">
                {modal === "layout"
                  ? "Create Dynamic Header"
                  : editId
                    ? "হেডার সেটিংস — Edit"
                    : "হেডার সেটিংস"}
              </h3>
              <button
                type="button"
                disabled={busy}
                aria-label="হেডার সেটিংস বন্ধ করুন"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={
                modal === "layout"
                  ? (e) => {
                      e.preventDefault();
                      if (draft.name.trim()) {
                        setError("");
                        setModal("editor");
                      } else setError("হেডারের একটি নাম দিন।");
                    }
                  : save
              }
            >
              <label className="mb-4 block text-sm font-medium">
                {modal === "layout" ? "Header Name *" : "Your header name *"}
                <input
                  autoFocus
                  required
                  maxLength={120}
                  className={`${input} mt-1`}
                  placeholder="e.g. SSC 2026 Math Suggestion"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              {(modal === "layout" || draft.mode === "dynamic") && (
                <fieldset className="mb-4">
                  <legend className="mb-2 text-sm font-medium">
                    Choose Layout
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["header", "branded"] as const).map((layout) => (
                      <button
                        type="button"
                        key={layout}
                        aria-pressed={draft.layout === layout}
                        onClick={() => setDraft({ ...draft, layout })}
                        className={`min-w-0 rounded-lg border-2 p-3 text-left ${draft.layout === layout ? "border-green-600 bg-lime-50" : "border-slate-200 bg-white"}`}
                      >
                        <div
                          aria-hidden="true"
                          className="header-layout-thumbnail mb-2 overflow-hidden border bg-white p-2"
                        >
                          <div style={{ fontSize: 6, lineHeight: 1.4 }}>
                            <HeaderPreview header={{ ...draft, layout }} />
                          </div>
                        </div>
                        <strong className="block text-sm">
                          {layout === "header" ? "Header" : "Branding+Header"}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-500">
                          {layout === "header"
                            ? "Institute name, exam info, marks, time, student details"
                            : "Dark title banner, institute name, exam rows, note box"}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-green-700">
                          {draft.layout === layout
                            ? "✓ Selected"
                            : "নির্বাচন করুন"}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {modal === "editor" && (
                <>
                  <div
                    className="mb-5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3"
                    aria-label="হেডারের লাইভ প্রিভিউ"
                  >
                    <div className="min-w-[300px] text-[12px] leading-relaxed">
                      <HeaderPreview header={draft} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {headerFieldDefinitions.map(([key, label, hint]) => (
                      <div
                        key={key}
                        className={
                          [
                            "institute",
                            "subject",
                            "extraInfo",
                            "addNew",
                            "studentName",
                            "studentRoll",
                          ].includes(key)
                            ? "sm:col-span-2"
                            : ""
                        }
                      >
                        <label className="mb-1 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="accent-blue-600"
                            checked={draft.fields[key].enabled}
                            onChange={(e) =>
                              patch(key, { enabled: e.target.checked })
                            }
                          />
                          {label}
                        </label>
                        <input
                          aria-label={`${label} text`}
                          disabled={!draft.fields[key].enabled}
                          maxLength={2000}
                          className={`${input} disabled:bg-slate-50 disabled:text-slate-400`}
                          value={draft.fields[key].value}
                          placeholder={hint}
                          onChange={(e) =>
                            patch(key, { value: e.target.value })
                          }
                        />
                      </div>
                    ))}
                    {draft.mode === "dynamic" && draft.layout === "branded" && (
                      <label className="sm:col-span-2 text-sm">
                        Branding banner text
                        <input
                          maxLength={300}
                          className={`${input} mt-1`}
                          value={draft.branding}
                          onChange={(e) =>
                            setDraft({ ...draft, branding: e.target.value })
                          }
                        />
                      </label>
                    )}
                  </div>
                </>
              )}
              {error && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {error}
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModal(null)}
                  className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${modal === "layout" ? "bg-green-600" : "bg-blue-600"}`}
                >
                  {busy
                    ? "সেভ হচ্ছে…"
                    : modal === "layout"
                      ? "Create Header"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
