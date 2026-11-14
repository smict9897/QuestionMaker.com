"use client";
import { inspectRefundReadiness } from "@/app/actions/refund-readiness";
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
    <>
      <RefundReadinessForm recordKey={recordKey} />
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
    </>
  );
}

function RefundReadinessForm({ recordKey }: { recordKey: string }) {
  const [state, action, pending] = useActionState(inspectRefundReadiness, {
    ok: false,
    message: "",
  } as import("@/app/actions/refund-readiness").RefundReadiness);
  const money = (n: number) => "৳" + (n / 100).toFixed(2);
  return (
    <form action={action} className="border rounded p-3 space-y-2">
      <input type="hidden" name="key" value={recordKey} />
      <button disabled={pending} className="border rounded p-2">
        {pending ? "যাচাই হচ্ছে…" : "রিফান্ডের প্রস্তুতি / ঘাটতি দেখুন"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
      {state.ok && (
        <p>
          বিক্রেতার ফেরতযোগ্য অংশ: {money(state.required!)} · অবশিষ্ট earnings:{" "}
          {money(state.available!)} · ঘাটতি: {money(state.shortfall!)}
        </p>
      )}
      <p>শুধু বর্তমান অবস্থা দেখা; কোনো টাকা hold/ফেরত বা অনুমোদন করা হয় না।</p>
    </form>
  );
}
