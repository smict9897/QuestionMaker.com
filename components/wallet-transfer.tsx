"use client";
import { useActionState } from "react";
import Link from "next/link";
import {
  prepareWalletTransfer,
  confirmWalletTransfer,
} from "@/app/actions/wallet-transfer";
import type { TransferState } from "@/app/actions/wallet-transfer";
const initial: TransferState = { ok: false, message: "" };
export default function WalletTransfer({
  maximum = 500000,
}: {
  maximum?: number;
}) {
  const [quote, prepare, preparing] = useActionState(
    prepareWalletTransfer,
    initial,
  );
  const [result, confirm, confirming] = useActionState(
    confirmWalletTransfer,
    initial,
  );
  return (
    <div className="space-y-5">
      <form action={prepare} className="rounded-xl border p-5 space-y-4">
        <label className="block">
          প্রাপকের ইউনিক TID
          <input
            className="block w-full rounded border p-3 mt-1"
            name="tid"
            placeholder="QB-…"
            maxLength={23}
            autoComplete="off"
            required
          />
        </label>
        <label className="block">
          টাকার পরিমাণ
          <input
            className="block w-full rounded border p-3 mt-1"
            name="amount"
            type="number"
            min="1"
            max={maximum / 100}
            step="0.01"
            required
          />
        </label>
        <button
          disabled={preparing || confirming || result.ok}
          className="rounded bg-indigo-700 px-5 py-3 text-white disabled:opacity-50"
        >
          {preparing ? "যাচাই হচ্ছে…" : "প্রাপকের নাম যাচাই করুন"}
        </button>
        <p role="status">{quote.message}</p>
      </form>
      {quote.ok && quote.quoteId && !result.ok && (
        <form
          key={quote.quoteId}
          action={confirm}
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4"
        >
          <h2 className="text-xl font-bold">পাঠানোর আগে নিশ্চিত করুন</h2>
          <p>
            প্রাপক: <strong>{quote.recipient}</strong>
          </p>
          <p className="break-all">TID: {quote.tid}</p>
          <p>
            পরিমাণ: <strong>৳{((quote.amount || 0) / 100).toFixed(2)}</strong> ·
            ফি ৳০
          </p>
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <label className="block">
            <input type="checkbox" name="confirmed" required /> নাম ও TID
            মিলিয়েছি। এই পরিমাণ টাকা পাঠাতে সম্মত।
          </label>
          <p className="text-sm">
            এই নিশ্চিতকরণ ১০ মিনিট কার্যকর। ভুল প্রাপকে পাঠানোর আগে ভালোভাবে যাচাই
            করুন।
          </p>
          <button
            disabled={confirming || preparing}
            className="rounded bg-indigo-700 px-5 py-3 text-white disabled:opacity-50"
          >
            {confirming ? "পাঠানো হচ্ছে…" : "নিশ্চিত করে টাকা পাঠান"}
          </button>
        </form>
      )}
      <p role="status" aria-live="polite">
        {result.message}
      </p>
      {result.ok && (
        <Link href="/wallet" className="inline-block rounded border p-3">
          আপডেট করা ওয়ালেট দেখুন →
        </Link>
      )}
    </div>
  );
}
