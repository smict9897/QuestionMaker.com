"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { savePaper } from "@/app/actions/qb-papers";

export default function QbSavePaper() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function onSave() {
    setMsg("");
    let ids: string[] = [];
    let settings: unknown = null;
    try {
      ids = JSON.parse(localStorage.getItem("qb:selected") || "[]");
    } catch {}
    try {
      settings = JSON.parse(localStorage.getItem("qb:settings") || "null");
    } catch {}
    if (
      settings &&
      typeof settings === "object" &&
      "excludedIds" in settings &&
      Array.isArray(settings.excludedIds)
    ) {
      ids = ids.filter(
        (id) => !(settings.excludedIds as unknown[]).includes(id),
      );
    }
    if (!name.trim()) {
      setMsg("প্রশ্নপত্রের একটা নাম দিন");
      return;
    }
    if (!ids.length) {
      setMsg("কোনো প্রশ্ন নির্বাচন করা নেই");
      return;
    }
    start(async () => {
      const r = await savePaper({ name, ids, settings });
      if (r.ok) {
        setMsg("সেভ হয়েছে ✓");
        setName("");
      } else setMsg(r.error);
    });
  }

  return (
    <div className="rounded-xl border bg-white p-3 text-sm">
      <div className="flex gap-2">
        <input
          id="paper-save-name"
          aria-label="সেভ করার প্রশ্নপত্রের নাম"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="প্রশ্নপত্রের নাম (যেমন: গণিত ক্লাস টেস্ট ১)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          onClick={onSave}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-60"
        >
          <Save size={16} /> {pending ? "..." : "সেভ"}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-600">{msg}</span>
        <Link
          href="/question-builder/saved"
          className="text-xs font-semibold text-blue-600"
        >
          সেভ করা প্রশ্নপত্র দেখুন →
        </Link>
      </div>
    </div>
  );
}
