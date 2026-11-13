"use client";
import { useActionState } from "react";
import { reviewRechargeForm } from "@/app/actions/wallet";

export default function AdminRechargeReview({
  requestKey,
  amount,
  name,
  tid,
}: {
  requestKey: string;
  amount: number;
  name: string;
  tid: string;
}) {
  const [state, action, pending] = useActionState(reviewRechargeForm, {
    ok: false,
    message: "",
  });
  return (
    <form
      action={action}
      className="mt-3 flex flex-col gap-3"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        if (submitter?.value === "approve") {
          const form = new FormData(event.currentTarget);
          if (
            !window.confirm(
              `${name}\nTID: ${tid}\n৳${form.get("amount")} যোগ করার আগে পেমেন্ট যাচাই করেছেন?`,
            )
          )
            event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="requestKey" value={requestKey} />
      <label>
        অনুমোদিত পরিমাণ (টাকা)
        <input
          className="ml-2 rounded border p-2"
          name="amount"
          type="number"
          min="20"
          max="50000"
          step="0.01"
          defaultValue={(amount / 100).toFixed(2)}
          required
        />
      </label>
      <label>
        পরিমাণ বদলালে কারণ লিখুন
        <input
          className="ml-2 rounded border p-2"
          name="reason"
          maxLength={500}
          placeholder="যাচাইয়ের নোট"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          name="decision"
          value="approve"
          disabled={pending || state.ok}
          className="rounded bg-green-700 p-2 text-white disabled:opacity-50"
        >
          যাচাই হয়েছে — টাকা যোগ করুন
        </button>
        <button
          name="decision"
          value="reject"
          formNoValidate
          disabled={pending || state.ok}
          className="rounded bg-red-700 p-2 text-white disabled:opacity-50"
        >
          প্রত্যাখ্যান
        </button>
      </div>
      <p role="status" aria-live="polite">
        {pending ? "প্রক্রিয়াধীন…" : state.message}
      </p>
    </form>
  );
}
