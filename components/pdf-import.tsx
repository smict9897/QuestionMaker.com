"use client";

import React, { useMemo, useState } from "react";
import { FileUp, Loader2, Trash2, CheckSquare, Square, ChevronDown, ChevronUp, Save } from "lucide-react";
import type { OptionKey, ParsedMcq, ParsedShort, ParsedCQ } from "@/lib/pdf-mcq/parse";
import { saveExtracted } from "@/app/admin/questions/actions";
import { NCTB_CLASSES, type NctbClass } from "@/lib/nctb-data";
import MathText from "@/components/MathText";
import { extractCleanTwoColumnPdf } from "@/lib/pdf-mcq/browser-extract";

interface PdfImportProps { categories: string[]; }
const BN_LABEL: Record<OptionKey, string> = { A: "ক", B: "খ", C: "গ", D: "ঘ" };
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];
const OTHER = "__other__";
const CLASS_MAP: Record<string, string> = { "1": "Class 1", "2": "Class 2", "3": "Class 3", "4": "Class 4", "5": "Class 5", "6": "Class 6", "7": "Class 7", "8": "Class 8", SSC: "Class 9-10", HSC: "Class 11-12" };

export default function PdfImport({ categories }: PdfImportProps) {
  const [open, setOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [parseMode, setParseMode] = useState<"AUTO" | "MCQ" | "SHORT" | "CQ">("AUTO");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [category, setCategory] = useState(categories[0] ?? "SSC");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [lang, setLang] = useState("Bangla");
  const [source, setSource] = useState("বোর্ড বই");
  const [approved, setApproved] = useState(false);
  const [activeTab, setActiveTab] = useState<"mcq" | "short" | "cq">("mcq");
  const [mcqs, setMcqs] = useState<ParsedMcq[]>([]);
  const [shorts, setShorts] = useState<ParsedShort[]>([]);
  const [cqs, setCqs] = useState<ParsedCQ[]>([]);
  const [selectedMcqNums, setSelectedMcqNums] = useState<number[]>([]);
  const [selectedShortNums, setSelectedShortNums] = useState<number[]>([]);
  const [selectedCqNums, setSelectedCqNums] = useState<number[]>([]);

  const subjectList = useMemo(() => {
    const key = CLASS_MAP[category];
    const cls = (NCTB_CLASSES as NctbClass[]).find((c) => c.class === key);
    return cls ? cls.subjects : [];
  }, [category]);

  const chapterList = useMemo(() => subjectList.find((s) => s.name === subject)?.chapters ?? [], [subjectList, subject]);
  const finalSubject = subject === OTHER ? customSubject.trim() : subject.trim();
  const finalTopic = topic === OTHER ? customTopic.trim() : topic.trim();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === "file" && !file) { setError("PDF ফাইল নির্বাচন করুন।"); return; }
    if (inputMode === "text" && !pastedText.trim()) { setError("টেক্সট পেস্ট করুন।"); return; }
    setBusy(true); setError(null); setNotice(null);

    try {
      const textToSend = inputMode === "file" && file ? await extractCleanTwoColumnPdf(file) : pastedText;
      const res = await fetch("/api/admin/pdf-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSend, mode: parseMode }),
      });
      const data = await res.json();
      if (data.ok) {
        setMcqs(data.mcqs || []);
        setShorts(data.shortQuestions || []);
        setCqs(data.cqs || []);
        setSelectedMcqNums((data.mcqs || []).map((q: ParsedMcq) => q.number));
        setSelectedShortNums((data.shortQuestions || []).map((s: ParsedShort) => s.number));
        setSelectedCqNums((data.cqs || []).map((c: ParsedCQ) => c.number));
        
        if (parseMode === "SHORT" || ((data.shortQuestions || []).length > 0 && (data.mcqs || []).length === 0)) setActiveTab("short");
        else if (parseMode === "CQ" || ((data.cqs || []).length > 0 && (data.mcqs || []).length === 0)) setActiveTab("cq");
        else setActiveTab("mcq");

        setNotice(`🎉 ${(data.mcqs || []).length}টি MCQ, ${(data.shortQuestions || []).length}টি সংক্ষিপ্ত, ${(data.cqs || []).length}টি সৃজনশীল পাওয়া গেছে!`);
      } else {
        setError(data.error || "পিডিএফ পড়তে ব্যর্থ হয়েছে।");
      }
    } catch (err: any) { setError(err?.message || "নেটওয়ার্ক সমস্যা।"); } finally { setBusy(false); }
  };

  const handleBulkSave = async () => {
    if (!finalSubject) { alert("দয়া করে বিষয় নির্বাচন করুন।"); return; }
    const itemsToSave: any[] = [];
    mcqs.forEach((q) => { if (selectedMcqNums.includes(q.number)) itemsToSave.push({ text: q.text, options: q.options, correct: q.correct || "", explanation: "", sourceType: "MCQ" }); });
    shorts.forEach((s) => { if (selectedShortNums.includes(s.number)) itemsToSave.push({ text: `${s.text} [মান: ${s.marks}]`, options: {}, correct: "", explanation: "", sourceType: "SHORT" }); });
    cqs.forEach((c) => {
      if (selectedCqNums.includes(c.number)) {
        itemsToSave.push({ text: `${c.stimulus}\n\n(ক) ${c.subQuestions.k}\n(খ) ${c.subQuestions.kh}\n(গ) ${c.subQuestions.g}\n(ঘ) ${c.subQuestions.gh}`, options: { ক: c.subQuestions.k, খ: c.subQuestions.kh, গ: c.subQuestions.g, ঘ: c.subQuestions.gh }, correct: "", explanation: "", sourceType: "CQ" });
      }
    });
    if (!itemsToSave.length) { alert("কোনো প্রশ্ন নির্বাচন করা হয়নি।"); return; }
    setSaving(true);
    const fd = new FormData();
    fd.set("category", category); fd.set("subject", finalSubject); fd.set("topic", finalTopic || "সাধারণ"); fd.set("difficulty", difficulty); fd.set("lang", lang); fd.set("source", source.trim() || "PDF_IMPORT"); fd.set("approved", approved ? "true" : "false"); fd.set("items", JSON.stringify(itemsToSave));
    await saveExtracted(fd);
    setSaving(false);
  };

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:bg-slate-950 dark:border-slate-800";
  const labelCls = "mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300";

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div onClick={() => setOpen(!open)} className="flex cursor-pointer select-none items-center justify-between text-base font-bold text-slate-900 dark:text-slate-100">
        <span className="flex items-center gap-2"><FileUp size={20} className="text-blue-600" /> PDF থেকে প্রশ্ন তুলুন</span>
        <button type="button" className="p-1 text-slate-500">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="bg-blue-50/60 dark:bg-slate-800/60 p-3 rounded-2xl border border-blue-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">প্রশ্নের ধরন বেছে নিন:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[{ id: "AUTO", label: "🤖 অটো" }, { id: "MCQ", label: "📝 MCQ" }, { id: "SHORT", label: "✍️ সংক্ষিপ্ত" }, { id: "CQ", label: "🧠 সৃজনশীল" }].map((m) => (
                  <button key={m.id} type="button" onClick={() => setParseMode(m.id as any)} className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center ${parseMode === m.id ? "bg-blue-600 text-white shadow-xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"}`}>{m.label}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>শ্রেণি</label>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setSubject(""); setTopic(""); }} className={inputCls}>{categories.map((c) => (<option key={c} value={c}>{c === "SSC" ? "SSC (নবম-দশম)" : c === "HSC" ? "HSC (একাদশ-দ্বাদশ)" : c}</option>))}</select>
              </div>
              <div>
                <label className={labelCls}>বিষয় *</label>
                <select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }} className={inputCls}><option value="">বিষয় বাছুন</option>{subjectList.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}<option value={OTHER}>অন্য (নিজে লিখুন)</option></select>
                {subject === OTHER && <input type="text" placeholder="বিষয়ের নাম" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} className={inputCls + " mt-2"} />}
              </div>
              <div>
                <label className={labelCls}>অধ্যায়</label>
                {chapterList.length > 0 ? (<select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls}><option value="">অধ্যায় বাছুন</option>{chapterList.map((c) => <option key={c} value={c}>{c}</option>)}<option value={OTHER}>অন্য (নিজে লিখুন)</option></select>) : (<input type="text" placeholder="অধ্যায়" value={topic === OTHER ? customTopic : topic} onChange={(e) => { setTopic(OTHER); setCustomTopic(e.target.value); }} className={inputCls} />)}
                {chapterList.length > 0 && topic === OTHER && <input type="text" placeholder="অধ্যায় নাম" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} className={inputCls + " mt-2"} />}
              </div>
              <div>
                <label className={labelCls}>উৎস / বোর্ড-সাল</label>
                <input type="text" value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="যেমন: বোর্ড বই" />
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setInputMode("file")} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${inputMode === "file" ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>PDF ফাইল</button>
                <button type="button" onClick={() => setInputMode("text")} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${inputMode === "text" ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>টেক্সট পেস্ট</button>
              </div>
              {inputMode === "file" ? (<input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls + " file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"} />) : (<textarea rows={5} value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="টেক্সট পেস্ট করুন..." className={inputCls + " font-mono text-xs"} />)}
            </div>
            <div className="flex items-center"><label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="rounded" />সরাসরি অনুমোদন দিন (Approved)</label></div>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 sm:text-sm">{busy ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}<span>{busy ? "প্রশ্ন পড়া হচ্ছে…" : "প্রশ্ন বের করুন"}</span></button>
          </form>
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">{error}</div>}
          {notice && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-bold border border-green-200">{notice}</div>}
          {(mcqs.length > 0 || shorts.length > 0 || cqs.length > 0) && (
            <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 sm:items-center">
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => setActiveTab("mcq")} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === "mcq" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border"}`}>বহুনির্বাচনি ({mcqs.length})</button>
                  <button type="button" onClick={() => setActiveTab("short")} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === "short" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border"}`}>সংক্ষিপ্ত ({shorts.length})</button>
                  <button type="button" onClick={() => setActiveTab("cq")} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === "cq" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border"}`}>সৃজনশীল ({cqs.length})</button>
                </div>
                <button type="button" disabled={saving} onClick={handleBulkSave} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}<span>সংরক্ষণ করুন</span></button>
              </div>
              {activeTab === "mcq" && (<div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">{mcqs.map((q) => (<div key={q.number} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:bg-slate-900"><div className="flex items-start gap-2"><button type="button" onClick={() => setSelectedMcqNums((p) => p.includes(q.number) ? p.filter(n => n !== q.number) : [...p, q.number])} className="mt-0.5 text-blue-600">{selectedMcqNums.includes(q.number) ? <CheckSquare size={16} /> : <Square size={16} />}</button><div className="flex-1 text-xs font-semibold"><span className="font-bold text-blue-700 mr-1">{q.number}.</span><MathText text={q.text} /></div></div><div className="mt-2.5 grid grid-cols-2 gap-2 pl-5 text-xs">{OPTION_KEYS.map((k) => (<div key={k} className={`flex items-center gap-1.5 p-1.5 rounded-lg border ${q.correct === k ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 dark:bg-slate-800"}`}><span className="font-bold text-slate-500">({BN_LABEL[k]})</span><span className="truncate"><MathText text={q.options[k] || ""} /></span></div>))}</div></div>))}</div>)}
              {activeTab === "short" && (<div className="max-h-[500px] space-y-2.5 overflow-y-auto pr-1">{shorts.map((s) => (<div key={s.number} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-2 dark:bg-slate-900 text-xs"><button type="button" onClick={() => setSelectedShortNums((p) => p.includes(s.number) ? p.filter(n => n !== s.number) : [...p, s.number])} className="text-blue-600">{selectedShortNums.includes(s.number) ? <CheckSquare size={16} /> : <Square size={16} />}</button><div className="flex-1 font-semibold">{s.number}. <MathText text={s.text} /></div></div>))}</div>)}
              {activeTab === "cq" && (<div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">{cqs.map((c) => (<div key={c.number} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2 dark:bg-slate-900 text-xs"><div className="flex items-start gap-2"><button type="button" onClick={() => setSelectedCqNums((p) => p.includes(c.number) ? p.filter(n => n !== c.number) : [...p, c.number])} className="text-blue-600">{selectedCqNums.includes(c.number) ? <CheckSquare size={16} /> : <Square size={16} />}</button><div className="flex-1"><span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">সৃজনশীল {c.number}</span><div className="mt-1 bg-slate-50 p-2 rounded-lg leading-relaxed"><MathText text={c.stimulus} /></div><div className="mt-2 space-y-1 pl-1"><p><strong>(ক)</strong> <MathText text={c.subQuestions.k} /></p><p><strong>(খ)</strong> <MathText text={c.subQuestions.kh} /></p><p><strong>(গ)</strong> <MathText text={c.subQuestions.g} /></p><p><strong>(ঘ)</strong> <MathText text={c.subQuestions.gh} /></p></div></div></div></div>))}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
