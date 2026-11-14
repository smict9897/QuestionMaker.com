"use client";
import { useActionState } from "react";
import {
  requestWithdrawal,
  reviewWithdrawal,
} from "@/app/actions/wallet-withdrawal";
const initial = { ok: false, message: "" };
export function WithdrawalRequest({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(requestWithdrawal, initial);
  return (
    <form action={action} className="space-y-4 rounded-xl border p-5">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="block">
        পরিমাণ (৳)
        <input
          className="block border rounded p-3 w-full"
          name="amount"
          type="number"
          min="100"
          max="50000"
          step="0.01"
          required
        />
      </label>
      <label className="block">
        নিজের bKash নম্বর
        <input
          className="block border rounded p-3 w-full"
          name="number"
          type="tel"
          inputMode="numeric"
          pattern="01[3-9][0-9]{8}"
          maxLength={11}
          required
        />
      </label>
      <label className="flex gap-2">
        <input name="confirmed" type="checkbox" required />
        নম্বর ও পরিমাণ যাচাই করেছি। শুধু নিজের বিক্রির আয় হোল্ড হবে এবং অ্যাডমিন
        ম্যানুয়ালি নিষ্পত্তি করবেন।
      </label>
      <button
        disabled={pending || state.ok}
        className="rounded bg-slate-900 text-white p-3"
      >
        {pending ? "অপেক্ষা করুন…" : "উত্তোলন অনুরোধ করুন"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
export function WithdrawalReview({ recordKey }: { recordKey: string }) {
  const [state, action, pending] = useActionState(reviewWithdrawal, initial);
  return (
    <form action={action} className="space-y-3">
      <input name="key" value={recordKey} type="hidden" />
      <label className="block">
        সিদ্ধান্ত
        <select name="decision" className="block border p-2">
          <option value="REJECTED">বাতিল ও আয় ফেরত</option>
          <option value="PAID">ম্যানুয়ালি পাঠানো হয়েছে</option>
        </select>
      </label>
      <label className="block">
        bKash TrxID
        <input className="block border p-2 w-full" name="trx" maxLength={30} />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" name="paidConfirmed" />
        টাকা বাস্তবে পাঠিয়েছি; নম্বর ও পরিমাণ মিলিয়েছি (PAID-এর জন্য আবশ্যক)
      </label>
      <label className="block">
        নোট / বাতিলের কারণ
        <textarea
          className="block border p-2 w-full"
          name="note"
          maxLength={500}
        />
      </label>
      <button
        disabled={pending || state.ok}
        className="rounded bg-slate-900 text-white p-3"
      >
        নিষ্পত্তি সংরক্ষণ করুন
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
