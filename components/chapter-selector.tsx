"use client";
import { useState } from "react";

export default function ChapterSelector({ topics, value, onChange, defaultValue = [], disabled = false }: {
  topics: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
  defaultValue?: string[];
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const update = (next: string[]) => { setInternal(next); onChange?.(next); };
  return <fieldset disabled={disabled} className="chapter-selector">
    <legend>অধ্যায় নির্বাচন করুন</legend>
    <p className="chapter-hint">একাধিক অধ্যায়ে টিক দিন। কোনোটি বাছাই না করলে সকল অধ্যায়ের প্রশ্ন আসবে।</p>
    <label className="chapter-choice"><input type="checkbox" checked={selected.length === 0} onChange={() => update([])}/><span>সকল অধ্যায়</span></label>
    <div className="chapter-options">{Array.from(new Set([...topics, ...selected])).map(topic => <label className="chapter-choice" key={topic}><input type="checkbox" name="topic" value={topic} checked={selected.includes(topic)} onChange={e => update(e.target.checked ? [...selected, topic] : selected.filter(t => t !== topic))}/><span>{topic}</span></label>)}</div>
    <p className="chapter-hint" role="status">{selected.length ? `${selected.length.toLocaleString("bn-BD")}টি অধ্যায় নির্বাচিত` : "সকল অধ্যায় নির্বাচিত"}</p>
  </fieldset>;
}
