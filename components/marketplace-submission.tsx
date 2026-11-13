"use client";
import { MARKET_EXAM_TYPES } from "@/lib/marketplace-exam-types";
import { useActionState } from "react";
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
        <select name="grade" className={field} required>
          {[6, 7, 8, 9, 10, 11].map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString("bn-BD")} শ্রেণি
            </option>
          ))}
        </select>
      </label>
      <label>
        বিষয়
        <input
          name="subject"
          className={field}
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      <label>
        অধ্যায় (কমা দিয়ে আলাদা করুন; অথবা সম্পূর্ণ সিলেবাস)
        <textarea name="chapters" className={field} maxLength={4500} required />
      </label>
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
