"use client";
import { MARKET_EXAM_TYPES } from "@/lib/marketplace-exam-types";
import {
  MARKET_GRADES,
  MARKET_GRADE_NAMES,
  marketSubjects,
  marketChapters,
} from "@/lib/marketplace-school-catalog";
import { useActionState, useState } from "react";
import {
  submitMarketPaper,
  reviewMarketPaper,
} from "@/app/actions/marketplace";

const field = "block w-full rounded border p-2 mt-1";
export function MarketplaceSubmission({
  papers,
}: {
  papers: { key: string; name: string }[];
}) {
  const [grade, setGrade] = useState("6"),
    [subject, setSubject] = useState("");
  const chapters = marketChapters(grade, subject);
  const [state, action, pending] = useActionState(submitMarketPaper, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="grid gap-4 rounded-xl border p-5">
      <label>
        নিজের সংরক্ষিত প্রশ্নপত্র
        <select name="sourceKey" className={field} required>
          <option value="">নির্বাচন করুন</option>
          {papers.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        পরীক্ষার ধরন
        <select name="examType" className={field} required defaultValue="">
          <option value="" disabled>
            পরীক্ষার ধরন নির্বাচন করুন
          </option>
          {MARKET_EXAM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        বিক্রির শিরোনাম
        <input
          name="title"
          className={field}
          minLength={3}
          maxLength={120}
          required
        />
      </label>
      <label>
        শ্রেণি
        <select
          name="grade"
          className={field}
          required
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setSubject("");
          }}
        >
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
          className={field}
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">বিষয় নির্বাচন করুন</option>
          {marketSubjects(grade).map((book) => (
            <option key={book.name}>{book.name}</option>
          ))}
        </select>
      </label>
      <fieldset key={`${grade}:${subject}`} className="rounded border p-3">
        <legend>অধ্যায় নির্বাচন করুন</legend>
        <div className="max-h-48 overflow-auto space-y-2">
          {["সম্পূর্ণ সিলেবাস", ...chapters].map((chapter) => (
            <label className="block text-sm" key={chapter}>
              <input name="chapters" type="checkbox" value={chapter} />{" "}
              {chapter}
            </label>
          ))}
        </div>
        <p className="text-xs mt-2">
          অন্তত একটি অধ্যায় বা সম্পূর্ণ সিলেবাস নির্বাচন করুন।
        </p>
      </fieldset>
      <label>
        বিবরণ
        <textarea
          name="description"
          className={field}
          minLength={10}
          maxLength={2000}
          required
        />
      </label>
      <label>
        মূল্য (টাকা)
        <input
          name="price"
          className={field}
          type="number"
          min="1"
          max="50000"
          step="0.01"
          required
        />
      </label>
      <label>
        <input name="rights" type="checkbox" required /> কনটেন্ট বিক্রি করার
        অধিকার আমার আছে। অন্যের কেনা প্রশ্নপত্র পুনর্বিক্রি করছি না।
      </label>
      <button
        disabled={pending}
        className="rounded bg-indigo-700 p-3 font-bold text-white disabled:opacity-50"
      >
        {pending ? "জমা হচ্ছে…" : "অ্যাডমিন যাচাইয়ের জন্য জমা দিন"}
      </button>
      <p role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
export function MarketplaceReview({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [state, action, pending] = useActionState(reviewMarketPaper, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="grid gap-3 mt-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <label>
        সিদ্ধান্ত
        <select name="decision" className={field}>
          <option value="CHANGES">সংশোধন চাই</option>
          <option value="APPROVED">অনুমোদন</option>
          <option value="REJECTED">বাতিল</option>
        </select>
      </label>
      <label>
        কারণ / যাচাইয়ের নোট
        <textarea name="note" maxLength={1000} className={field} />
      </label>
      <label>
        <input type="checkbox" name="reviewed" required /> সম্পূর্ণ প্রশ্ন ও সেটিংস
        যাচাই করেছি।
      </label>
      <button
        disabled={pending || state.ok}
        className="rounded bg-indigo-700 p-3 text-white disabled:opacity-50"
      >
        সিদ্ধান্ত সংরক্ষণ
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
