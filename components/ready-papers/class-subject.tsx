"use client";
import { useState } from "react";
export type ReadyCatalog = { grade: string; subjects: string[] }[];
export default function ReadyClassSubject({
  catalog,
  grade = "",
  subject = "",
  required = false,
}: {
  catalog: ReadyCatalog;
  grade?: string;
  subject?: string;
  required?: boolean;
}) {
  const [selected, setSelected] = useState(grade);
  const [chosenSubject, setChosenSubject] = useState(subject);
  const subjects = [
    ...new Set(
      catalog
        .filter((c) => !selected || c.grade === selected)
        .flatMap((c) => c.subjects),
    ),
  ];
  return (
    <>
      <label>
        শ্রেণি / পরীক্ষা
        <select
          name="grade"
          required={required}
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setChosenSubject("");
          }}
        >
          <option value="">
            {required ? "শ্রেণি নির্বাচন করুন" : "সব পরীক্ষা"}
          </option>
          {catalog.map((c) => (
            <option key={c.grade} value={c.grade}>
              {c.grade}
            </option>
          ))}
        </select>
      </label>
      <label>
        বিষয় ও পত্র
        <select
          name="subject"
          required={required}
          disabled={required && !selected}
          value={subjects.includes(chosenSubject) ? chosenSubject : ""}
          onChange={(e) => setChosenSubject(e.target.value)}
        >
          <option value="">{required ? "বিষয় নির্বাচন করুন" : "সব বিষয়"}</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
