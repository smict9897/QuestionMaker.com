"use client";
import Link from "next/link";
import { useState } from "react";
import { MARKET_EXAM_TYPES } from "@/lib/marketplace-exam-types";
import {
  MARKET_GRADES,
  MARKET_GRADE_NAMES,
  marketSubjects,
  marketChapters,
} from "@/lib/marketplace-school-catalog";
export default function MarketplaceFilters({
  initial,
}: {
  initial: {
    grade: string;
    subject: string;
    chapter: string;
    examType: string;
  };
}) {
  const [grade, setGrade] = useState(initial.grade),
    [subject, setSubject] = useState(initial.subject),
    [chapter, setChapter] = useState(initial.chapter);
  const subjects = [
    ...new Set(
      (grade
        ? marketSubjects(grade)
        : MARKET_GRADES.flatMap((n) => marketSubjects(n))
      ).map((s) => s.name),
    ),
  ];
  if (subject && !subjects.includes(subject)) subjects.push(subject);
  const chapters = [
    ...new Set([
      "সম্পূর্ণ সিলেবাস",
      ...(grade
        ? marketChapters(grade, subject)
        : MARKET_GRADES.flatMap((n) => marketChapters(n, subject))),
      ...(chapter ? [chapter] : []),
    ]),
  ];
  return (
    <form className="pb-filters" method="get">
      <label>
        শ্রেণি
        <select
          name="grade"
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setSubject("");
            setChapter("");
          }}
        >
          <option value="">সব শ্রেণি</option>
          {MARKET_GRADES.map((n) => (
            <option key={n} value={n}>
              {MARKET_GRADE_NAMES[n]} শ্রেণি
            </option>
          ))}
        </select>
      </label>
      <label>
        বিষয়
        <select
          name="subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setChapter("");
          }}
        >
          <option value="">সব বিষয়</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        অধ্যায়
        <select
          name="chapter"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
        >
          <option value="">সব অধ্যায়</option>
          {chapters.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        পরীক্ষার ধরন
        <select name="examType" defaultValue={initial.examType}>
          <option value="">সব পরীক্ষা</option>
          {MARKET_EXAM_TYPES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <button>প্রশ্নপত্র খুঁজুন</button>
      <Link
        className="pb-reset"
        href={grade ? `/marketplace?grade=${grade}` : "/marketplace"}
      >
        ফিল্টার মুছুন
      </Link>
    </form>
  );
}
