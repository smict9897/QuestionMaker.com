"use client";
import { useRef, useState } from "react";
import { submitRecharge } from "@/app/actions/wallet";
export default function RechargeForm() {
  const amountRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  return (
    <form
      className="mt-5 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const r = await submitRecharge(form);
          setMsg(r.ok ? r.message || "জমা হয়েছে" : r.error || "হয়নি");
        } catch {
          setMsg("অনুরোধ জমা হয়নি। আবার চেষ্টা করুন।");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        টাকা (কমপক্ষে ৳২০)
        <input
          className="block rounded border p-2"
          ref={amountRef}
          name="amount"
          type="number"
          min="20"
          max="50000"
          step="1"
          required
        />
      </label>
      <div className="tw-amounts">
        {[20, 50, 100, 200, 500].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              if (amountRef.current) amountRef.current.value = String(n);
            }}
          >
            ৳{n}
          </button>
        ))}
      </div>
      <label>
        Payment method
        <select name="method" className="block rounded border p-2">
          <option>bKash</option>
          <option>Nagad</option>
        </select>
      </label>
      <label>
        যে নম্বর থেকে পাঠিয়েছেন
        <input
          className="block rounded border p-2"
          name="phone"
          pattern="01[3-9][0-9]{8}"
          required
        />
      </label>
      <label>
        Transaction ID
        <input
          className="block rounded border p-2"
          name="transactionId"
          minLength={6}
          maxLength={30}
          required
        />
      </label>
      <button
        disabled={busy}
        className="rounded bg-blue-700 p-3 text-white disabled:opacity-50"
      >
        {busy ? "জমা হচ্ছে…" : "যাচাইয়ের অনুরোধ পাঠান"}
      </button>
      <p role="status">{msg}</p>
    </form>
  );
}
