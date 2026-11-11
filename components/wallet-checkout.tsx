"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { quoteQuestions, purchaseQuestions } from "@/app/actions/wallet";
const money = (n: number) => `৳${(n / 100).toFixed(2)}`;
export default function WalletCheckout({ ids }: { ids: string[] }) {
  const key = JSON.stringify(ids);
  const [quote, setQuote] = useState<Awaited<
      ReturnType<typeof quoteQuestions>
    > | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setQuote(null);
    setMessage("");
    if (ids.length)
      quoteQuestions(ids)
        .then((q) => {
          if (active) setQuote(q);
        })
        .catch(() => {
          if (active) setMessage("Balance লোড হয়নি। আবার চেষ্টা করুন।");
        });
    return () => {
      active = false;
    };
  }, [key]);
  async function checkout() {
    setBusy(true);
    setMessage("");
    try {
      const q = await quoteQuestions(ids);
      setQuote(q);
      if (!q.ok) return;
      if (!q.canAfford) {
        setMessage("Balance পর্যাপ্ত নয়। Recharge করুন।");
        return;
      }
      if (
        q.total > 0 &&
        !window.confirm(
          `${money(q.total)} balance থেকে কাটবে। এই প্রশ্নগুলো আবার নিলে চার্জ কাটবে না। নিশ্চিত?`,
        )
      )
        return;
      const r = await purchaseQuestions(ids, q.total);
      setMessage(
        r.ok ? `Checkout সম্পন্ন। কেটেছে ${money(r.charged)}।` : r.error,
      );
      setQuote(await quoteQuestions(ids));
    } catch {
      setMessage("Checkout সম্পন্ন হয়নি। আবার মূল্য যাচাই করুন।");
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      data-noprint
      className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-slate-800"
    >
      <strong>প্রশ্নের মূল্য ও account balance</strong>
      <p>MCQ ২০ পয়সা · SQ ৩০ পয়সা · CQ ৫০ পয়সা</p>
      {quote?.ok ? (
        <>
          {quote.counts && (
            <p className="mt-2">
              নির্বাচিত: MCQ {quote.counts.MCQ} · SQ {quote.counts.SHORT} · CQ{" "}
              {quote.counts.CQ}
            </p>
          )}
          <p className="my-2">
            {quote.admin
              ? "ADMIN — চার্জ প্রযোজ্য নয়"
              : quote.packageCovered
                ? "সক্রিয় প্যাকেজে অন্তর্ভুক্ত"
                : `Balance ${money(quote.balance)} · এখন প্রদেয় ${money(quote.total)}`}
          </p>
          {quote.total > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={checkout}
              className="rounded-lg bg-teal-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? "যাচাই হচ্ছে…" : "মূল্য নিশ্চিত করে Checkout"}
            </button>
          )}
        </>
      ) : (
        <p role="status">
          {quote && !quote.ok ? quote.error : "মূল্য যাচাই হচ্ছে…"}
        </p>
      )}
      <Link href="/wallet" className="ml-3 underline">
        Balance / Recharge করুন
      </Link>
      <Link href="/packages" className="ml-3 underline">
        প্যাকেজ
      </Link>
      <p role="status" className="mt-2">
        {message}
      </p>
      <small>
        পূর্বে কেনা একই প্রশ্নে পুনরায় চার্জ নেই। Print/PDF dialog বাতিল করলেও
        checkout ফেরত হয় না; প্রশ্নের ব্যবহারাধিকার account-এ থাকে।
      </small>
    </aside>
  );
}
