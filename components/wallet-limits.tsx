"use client";
import { useActionState } from "react";
import { updateWalletLimits } from "@/app/actions/wallet-limits";
import type { WalletLimits } from "@/lib/wallet-limits";
export default function WalletLimitsForm({ limits }: { limits: WalletLimits }) {
  const [state, action, pending] = useActionState(updateWalletLimits, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="border rounded-xl p-5 space-y-4">
      <input name="revision" value={limits.revision} type="hidden" />
      <label className="block">
        দৈনিক Send Money সর্বোচ্চ (৳১–৳৫০,০০০)
        <input
          className="block border rounded p-3 w-full"
          type="number"
          name="transferDaily"
          min="1"
          max="50000"
          step="0.01"
          defaultValue={(limits.transferDaily / 100).toFixed(2)}
          required
        />
      </label>
      <label className="block">
        দৈনিক প্রাপক যাচাই সংখ্যা (১–১০০)
        <input
          className="block border rounded p-3 w-full"
          type="number"
          name="recipientLookups"
          min="1"
          max="100"
          step="1"
          defaultValue={limits.recipientLookups}
          required
        />
      </label>
      <label className="block">
        প্রতি উত্তোলন অনুরোধে সর্বোচ্চ (৳১০০–৳৫০,০০০)
        <input
          className="block border rounded p-3 w-full"
          type="number"
          name="withdrawalMax"
          min="100"
          max="50000"
          step="0.01"
          defaultValue={(limits.withdrawalMax / 100).toFixed(2)}
          required
        />
      </label>
      <label className="block">
        পরিবর্তনের কারণ
        <textarea
          className="block border rounded p-3 w-full"
          name="note"
          minLength={10}
          maxLength={500}
          required
        />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" required />
        অপেক্ষমাণ Send Money নিশ্চিত করার সময়ও নতুন সীমা প্রযোজ্য হবে। আগের
        খরচ/lookup counter reset হবে না; পুরোনো হোল্ড বাতিল হবে না। বুঝে পরিবর্তন
        করছি।
      </label>
      <button
        className="rounded bg-slate-900 text-white p-3"
        disabled={pending || state.ok}
      >
        সীমা সংরক্ষণ
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
