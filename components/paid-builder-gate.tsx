"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Wallet, X } from "lucide-react";
import {
  quoteQuestions,
  purchaseQuestions,
  checkQuestionAccess,
} from "@/app/actions/wallet";
import "./paid-builder-gate.css";
const money = (n: number) => `৳${(n / 100).toFixed(2)}`;
export default function PaidBuilderGate({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]),
    [allowed, setAllowed] = useState(false),
    [quote, setQuote] = useState<Awaited<
      ReturnType<typeof quoteQuestions>
    > | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const raw = JSON.parse(localStorage.getItem("qb:selected") || "[]");
        if (!Array.isArray(raw) || !raw.length)
          throw Error("আগে প্রশ্ন নির্বাচন করুন।");
        setIds(raw);
        const q = await quoteQuestions(raw);
        if (!live) return;
        setQuote(q);
        // Even covered selections show the review/continue dialog. Nothing is charged on page load.
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "মূল্য যাচাই হয়নি।");
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (allowed) return;
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = old;
    };
  }, [allowed]);
  async function proceed() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!quote?.ok) throw Error("মূল্য যাচাই হয়নি। পৃষ্ঠাটি রিফ্রেশ করুন।");
      const result = await purchaseQuestions(ids, quote.total);
      if (!result.ok) {
        setQuote(await quoteQuestions(ids));
        throw Error(result.error);
      }
      const access = await checkQuestionAccess(ids);
      if (!access.ok) throw Error(access.error);
      setAllowed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }
  if (allowed) return children;
  return (
    <div className="payment-gate-background">
      <p>আপনার নির্বাচিত প্রশ্নপত্র প্রস্তুত হচ্ছে…</p>
      <dialog
        ref={dialog}
        className="payment-dialog"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              "a[href],button:not(:disabled)",
            ),
          ).filter((el) => el.getClientRects().length);
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        aria-labelledby="payment-title"
        aria-describedby="payment-description"
        onCancel={(e) => {
          e.preventDefault();
          window.location.assign("/question-builder");
        }}
      >
        <Link
          href="/question-builder"
          aria-label="প্রশ্ন নির্বাচনে ফিরুন"
          className="payment-close"
        >
          <X size={20} />
        </Link>
        <div className="payment-emblem">
          <ShieldCheck size={48} />
          <Wallet size={25} />
        </div>
        <h1 id="payment-title">প্রশ্নপত্র তৈরি করতে প্রস্তুত!</h1>
        <p id="payment-description">
          নির্বাচিত প্রশ্নের মূল্য দেখে নিশ্চিত করুন। Checkout-এর পর সেটআপ ও সম্পাদনা
          করতে পারবেন।
        </p>
        {quote?.ok ? (
          <>
            <div className="payment-balance">
              আপনার balance{" "}
              <strong>
                {quote.admin ? "ADMIN — চার্জ নেই" : money(quote.balance)}
              </strong>
            </div>
            <div className="payment-breakdown">
              <div>
                <span>
                  MCQ {quote.counts.MCQ} · SQ {quote.counts.SHORT} · CQ{" "}
                  {quote.counts.CQ}
                </span>
                <span>{ids.length}টি প্রশ্ন</span>
              </div>
              <div>
                <span>MCQ ২০ · SQ ৩০ · CQ ৫০ পয়সা</span>
              </div>
              <div className="payment-total">
                <strong>এখন প্রদেয়</strong>
                <strong>{money(quote.total)}</strong>
              </div>
            </div>
            <p>
              {quote.admin
                ? "ADMIN সুবিধায় চার্জ প্রযোজ্য নয়।"
                : quote.packageCovered
                  ? "আপনার সক্রিয় প্যাকেজে অন্তর্ভুক্ত।"
                  : quote.total === 0
                    ? "এই প্রশ্নগুলো আগেই কেনা হয়েছে—আবার চার্জ নেই।"
                    : quote.canAfford
                      ? "সম্মতি দিলে balance থেকে মূল্য কেটে ব্যবহারাধিকার দেওয়া হবে।"
                      : "আপনার balance পর্যাপ্ত নয়। Recharge অনুমোদিত হলে আবার এখানে এসে চালিয়ে যান।"}
            </p>
            <div className="payment-buttons">
              <Link href="/wallet">ওয়ালেটে টাকা যোগ করুন</Link>
              {quote.canAfford && (
                <button type="button" disabled={busy} onClick={proceed}>
                  {busy
                    ? "যাচাই হচ্ছে…"
                    : quote.total > 0
                      ? `${money(quote.total)} দিয়ে সেটআপে যান`
                      : "সেটআপে যান"}
                </button>
              )}
            </div>
            <Link className="payment-package" href="/packages">
              প্যাকেজ দেখুন
            </Link>
          </>
        ) : (
          <p role="status">
            {quote && !quote.ok ? quote.error : "মূল্য ও balance যাচাই হচ্ছে…"}
          </p>
        )}
        <p role="alert">{error}</p>
        <small>
          পূর্বে কেনা একই প্রশ্নে পুনরায় চার্জ নেই। Checkout-এর পর print বাতিল করলেও
          টাকা ফেরত নয়। Recharge ন্যূনতম ৳২০; যাচাইয়ের পরে balance যোগ হয়।
        </small>
      </dialog>
    </div>
  );
}
