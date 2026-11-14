"use client";
import { useActionState } from "react";
import {
  reportMarketPurchase,
  reviewMarketDispute,
} from "@/app/actions/marketplace-refund";
const initial = { ok: false, message: "" };
export function MarketComplaint({ paperId }: { paperId: string }) {
  const [state, action, pending] = useActionState(
    reportMarketPurchase,
    initial,
  );
  return (
    <form action={action} className="space-y-4 rounded-xl border p-4">
      <input type="hidden" name="paperId" value={paperId} />
      <label className="block">
        সমস্যা বিস্তারিত লিখুন
        <textarea
          className="w-full block border rounded p-3"
          name="reason"
          minLength={10}
          maxLength={2000}
          required
          rows={5}
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" required />
        তথ্য সঠিক। রিফান্ড স্বয়ংক্রিয় নয়; অনুমোদিত রিফান্ডে অনলাইন কপি বন্ধ হবে এবং
        ডাউনলোড/প্রিন্ট ব্যবহার বা বিতরণ করব না।
      </label>
      <button
        className="bg-slate-900 text-white rounded p-3"
        disabled={pending || state.ok}
      >
        অভিযোগ জমা দিন
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
export function MarketComplaintReview({ recordKey }: { recordKey: string }) {
  const [state, action, pending] = useActionState(reviewMarketDispute, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="key" value={recordKey} />
      <label className="block">
        সিদ্ধান্ত
        <select name="decision" className="border rounded p-3 block">
          <option value="REJECTED">রিফান্ড নয় / নোটসহ নিষ্পত্তি</option>
          <option value="REFUNDED">পূর্ণ মূল্য মূল উৎসে রিফান্ড</option>
        </select>
      </label>
      <label className="block">
        যাচাইয়ের নোট
        <textarea
          className="border rounded p-3 w-full block"
          name="note"
          minLength={10}
          maxLength={1000}
          required
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" />
        রিফান্ডের কারণ যাচাই করেছি। বিক্রেতার earnings ফেরত কেটে ক্রেতার মূল উৎসে
        পুরো মূল্য ফেরত ও অনলাইন কপি বন্ধ হবে।
      </label>
      <button
        className="bg-slate-900 text-white rounded p-3"
        disabled={pending || state.ok}
      >
        সিদ্ধান্ত সংরক্ষণ
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
