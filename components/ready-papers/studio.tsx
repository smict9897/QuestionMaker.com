"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
}: {
  paper: ReadyPaper;
  userId: string;
  adminPreset: boolean;
}) {
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
  const canvas = useRef<HTMLCanvasElement>(null),
    undo = useRef<Record<number, PageEdit[]>>({}),
    redo = useRef<Record<number, PageEdit[]>>({}),
    drag = useRef<{ x: number; y: number } | null>(null),
    key = `${userId}:${paper.id}`,
    edit = edits[String(active)] || freshEdit();
  useEffect(() => {
    let live = true;
    setBusy(true);
    loadPdfImages(paper.url, (n, total) => {
      if (live) setMessage(`Page ${n} / ${total} প্রস্তুত হচ্ছে…`);
    })
      .then((p) => {
        if (live) {
          setPages(p);
          setMessage("Page বেছে সেটআপে যান।");
          setBusy(false);
        }
      })
      .catch((e) => {
        if (live) {
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
    (async () => {
      try {
        await document.fonts.ready;
        const result = await renderEdited(
          pages[active - 1],
          original ? { ...freshEdit(), rotation: edit.rotation } : edit,
        );
        if (live && canvas.current) {
          canvas.current.width = result.width;
          canvas.current.height = result.height;
          canvas.current.getContext("2d")!.drawImage(result, 0, 0);
        }
        result.width = result.height = 0;
      } catch {
        if (live) setMessage("Preview তৈরি হয়নি।");
      }
    })();
    return () => {
      live = false;
    };
  }, [pages, active, edits, step, original]);
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
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x:
        edit.left +
        Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) *
          (1 - edit.left - edit.right),
      y:
        edit.top +
        Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) *
          (1 - edit.top - edit.bottom),
    };
  }
  async function preview() {
    if (busy) return;
    setBusy(true);
    setMessage("Print preview প্রস্তুত হচ্ছে…");
    try {
      await document.fonts.ready;
      const out = [];
      for (const n of selected) {
        const c = await renderEdited(pages[n - 1], edits[n] || freshEdit());
        out.push(c.toDataURL("image/png"));
        c.width = c.height = 0;
      }
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
        await saveLocal(key, { selected, edits, header });
        setMessage(
          "এই browser-এ draft save হয়েছে। অন্য device-এ পাওয়া যাবে না।",
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
      <p role="status" className="rp-status" data-noprint>
        {message}
      </p>
      {pages.length > 0 && (
        <div className="rp-toolbar" data-noprint>
          <button onClick={() => setStep("select")}>
            Page নির্বাচন ({selected.length})
          </button>
          {selected.length > 0 && (
            <button
              disabled={busy}
              onClick={() => {
                setActive(selected[0]);
                setStep("edit");
              }}
            >
              সেটআপে যান
            </button>
          )}
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
      {step === "select" && (
        <section data-noprint>
          <div className="rp-page-grid">
            {pages.map((src, i) => (
              <label
                className={`rp-page-card${selected.includes(i + 1) ? " selected" : ""}`}
                key={i}
              >
                <img src={src} alt={`মূল PDF page ${i + 1}`} loading="lazy" />
                <span>
                  <input
                    type="checkbox"
                    checked={selected.includes(i + 1)}
                    onChange={() => {
                      if (selected.includes(i + 1))
                        setSelected((v) => v.filter((n) => n !== i + 1));
                      else if (selected.length < 10)
                        setSelected((v) => [...v, i + 1]);
                      else setMessage("একবারে সর্বোচ্চ ১০ page নির্বাচন করুন।");
                    }}
                  />
                  Page {(i + 1).toLocaleString("bn-BD")}
                </span>
              </label>
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
          <aside className="rp-panel rp-controls">
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
              {(["school", "exam", "subject", "time", "marks"] as const).map(
                (field, i) => (
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
                ),
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
            <button disabled={busy} onClick={preview}>
              <Printer size={16} />
              Print preview
            </button>
          </aside>
          <section className="rp-canvas-panel">
            <div className="rp-toolbar">
              <strong>Page {active}</strong>
              <button onClick={() => setOriginal((v) => !v)}>
                {original ? "Edited দেখুন" : "Original দেখুন"}
              </button>
            </div>
            <canvas
              ref={canvas}
              aria-label={`Page ${active} সম্পাদনা preview`}
              style={{
                touchAction: tool === "view" ? "auto" : "none",
                cursor: tool === "view" ? "default" : "crosshair",
              }}
              onPointerDown={(e) => {
                if (original || tool === "view") return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = point(e);
              }}
              onPointerUp={(e) => {
                const start = drag.current;
                drag.current = null;
                if (!start || original) return;
                const end = point(e);
                if (tool === "erase") {
                  const box = {
                    x: Math.min(start.x, end.x),
                    y: Math.min(start.y, end.y),
                    w: Math.abs(end.x - start.x),
                    h: Math.abs(end.y - start.y),
                  };
                  if (box.w > 0.003 && box.h > 0.003 && edit.masks.length < 40)
                    update({ masks: [...edit.masks, box] });
                } else if (
                  tool === "text" &&
                  text.trim() &&
                  edit.texts.length < 30
                )
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
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            />
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
            <button onClick={() => setStep("edit")}>Edit-এ ফিরুন</button>
            <button
              disabled={busy || printPages.length !== selected.length}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
          </div>
          <section id="ready-print">
            {printPages.map((src, i) => (
              <article className="rp-print-sheet" key={selected[i]}>
                {i === 0 && Object.values(header).some(Boolean) && (
                  <header className="rp-print-header">
                    <h2>{header.school}</h2>
                    <h3>{header.exam}</h3>
                    <p>{header.subject}</p>
                    <div>
                      <span>{header.time && `সময়: ${header.time}`}</span>
                      <span>{header.marks && `পূর্ণমান: ${header.marks}`}</span>
                    </div>
                  </header>
                )}
                <div className="rp-print-content">
                  <img src={src} alt={`সম্পাদিত page ${selected[i]}`} />
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
