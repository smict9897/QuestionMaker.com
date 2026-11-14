"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  buyMarketPaper,
  savePurchasedInstitution,
} from "@/app/actions/marketplace-purchase";
const initial = { ok: false, message: "" };
export function MarketplaceBuy({
  id,
  terms,
  price,
}: {
  id: string;
  terms: string;
  price: string;
}) {
  const [state, action, pending] = useActionState(buyMarketPaper, initial);
  return (
    <form action={action} className="border rounded-xl p-4 space-y-3">
      <input name="paperId" value={id} type="hidden" />
      <input name="terms" value={terms} type="hidden" />
      <p>
        মূল্য {price}। ওয়ালেট থেকে একবার কাটা হবে। বিক্রেতা ৬০%, প্ল্যাটফর্ম ৪০% পাবে
        (পয়সার ভগ্নাংশ প্ল্যাটফর্মে)। কেনা কপি আবার খোলা/প্রিন্টে নতুন চার্জ নেই।
      </p>
      <p>
        শুধু প্রতিষ্ঠানের নাম বদলাতে পারবেন; প্রশ্ন বা অন্য সেটিংস নয়। কেনা কপি
        পুনর্বিক্রি করা যাবে না। সমস্যায় কেনা কপির অভিযোগ ফর্ম ব্যবহার করুন; অ্যাডমিন
        যাচাই ছাড়া রিফান্ড নয়। রিফান্ড হলে অনলাইন কপি বন্ধ হবে এবং আগের
        ডাউনলোড/প্রিন্ট ব্যবহার বা বিতরণ করা যাবে না। ডিজিটাল কপির পুনর্বিতরণ
        প্রযুক্তিগতভাবে পুরোপুরি ঠেকানো সম্ভব নয়।
      </p>
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" required />
        মূল্য ও কেনার সীমাবদ্ধতা বুঝে কিনছি।
      </label>
      <button
        disabled={pending || state.ok}
        className="bg-slate-900 text-white rounded p-3"
      >
        {pending ? "অপেক্ষা করুন…" : `${price} দিয়ে কিনুন`}
      </button>
      <p role="status">{state.message}</p>
      {state.ok && (
        <Link href={`/dashboard/library/${id}`} className="block underline">
          কেনা কপি খুলুন →
        </Link>
      )}
    </form>
  );
}
export function PurchasedInstitution({
  id,
  institution,
}: {
  id: string;
  institution: string;
}) {
  const [state, action, pending] = useActionState(
    savePurchasedInstitution,
    initial,
  );
  return (
    <div data-noprint className="space-y-4">
      <form action={action} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="paperId" value={id} />
        <label>
          শুধু প্রতিষ্ঠানের নাম
          <input
            className="block border rounded p-3"
            name="institution"
            defaultValue={institution}
            minLength={2}
            maxLength={200}
            required
          />
        </label>
        <button disabled={pending} className="rounded border p-3">
          নাম সংরক্ষণ
        </button>
        <p role="status">{state.message}</p>
      </form>
      <button
        className="bg-slate-900 text-white rounded p-3"
        onClick={async () => {
          await document.fonts.ready;
          window.print();
        }}
      >
        সংরক্ষিত কপি প্রিন্ট করুন
      </button>
      <p>
        নাম সংরক্ষণের পর প্রিন্ট করুন। প্রশ্ন, ফন্ট, বিন্যাস ও অন্য সেটিংস স্থির রাখা
        হয়েছে।
      </p>
    </div>
  );
}
