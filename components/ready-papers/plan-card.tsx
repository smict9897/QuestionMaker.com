"use client";
import { useState } from "react";
import { buyReadyPlan } from "@/app/actions/ready-commerce";
import { useRouter } from "next/navigation";
export default function ReadyPlanCard({
  balance,
  remaining,
  expiresAt,
  admin,
}: {
  balance: number;
  remaining?: number;
  expiresAt?: string;
  admin: boolean;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function buy() {
    setBusy(true);
    try {
      const r = await buyReadyPlan();
      if (r.ok) {
        setMessage("প্যাকেজ চালু হয়েছে।");
        setConfirm(false);
        router.refresh();
      } else setMessage(r.error);
    } catch {
      setMessage("সংযোগ সমস্যা। রিফ্রেশ করে প্যাকেজের অবস্থা দেখুন।");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rp-panel">
      <h2>Ready Paper মাসিক প্যাকেজ · ৳৯৯</h2>
      <p>
        ৩০ দিন মেয়াদে ৩০ প্রশ্নপত্র ইউনিট। প্রতি ১–৩ নির্বাচিত পৃষ্ঠা = ১ ইউনিট। ৪–৬
        পৃষ্ঠা = ২ ইউনিট। সংশ্লিষ্ট অনুমোদিত উত্তরপত্র অন্তর্ভুক্ত।
      </p>
      <p>
        প্যাকেজের বাইরে প্রতি ইউনিট ৳৫। নতুন অ্যাকাউন্টের একবারের ৳২০ বোনাসে ৪ ইউনিট;
        নতুন বোনাস আবার যোগ হবে না।
      </p>
      <p>বর্তমান ব্যালেন্স: ৳{balance / 100}</p>
      {admin ? (
        <p>Admin-এর জন্য বিনামূল্যে।</p>
      ) : expiresAt ? (
        <p>
          প্যাকেজ অবশিষ্ট {remaining} ইউনিট · মেয়াদ{" "}
          {new Date(expiresAt).toLocaleDateString("bn-BD", {
            timeZone: "Asia/Dhaka",
          })}
          । মেয়াদ শেষে অব্যবহৃত ইউনিট শেষ হবে; স্বয়ংক্রিয় নবায়ন নেই।
        </p>
      ) : confirm ? (
        <div role="group" aria-label="প্যাকেজ কেনার সম্মতি">
          <p>
            ব্যালেন্স থেকে ৳৯৯ কেটে ৩০ দিনের ৩০ ইউনিট চালু করবেন? অন্য প্রশ্ন তৈরির
            প্যাকেজ এতে অন্তর্ভুক্ত নয়।
          </p>
          <button disabled={busy || balance < 9900} onClick={buy}>
            {busy ? "চালু হচ্ছে…" : "হ্যাঁ, ৳৯৯ দিয়ে প্যাকেজ নিন"}
          </button>
          <button disabled={busy} onClick={() => setConfirm(false)}>
            এখন নয়
          </button>
          {balance < 9900 && (
            <p>ব্যালেন্স পর্যাপ্ত নয়। Wallet থেকে recharge করুন।</p>
          )}
        </div>
      ) : (
        <button onClick={() => setConfirm(true)}>প্যাকেজ নিন · ৳৯৯</button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
