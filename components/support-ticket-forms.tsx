"use client";
import { useActionState } from "react";
import {
  createSupportTicket,
  reviewSupportTicket,
} from "@/app/actions/support-tickets";
import { supportKinds } from "@/lib/support-tickets";
const initial = { ok: false, message: "" };
export function NewSupportTicket({ id }: { id: string }) {
  const [state, action, pending] = useActionState(createSupportTicket, initial);
  return (
    <form action={action} className="space-y-4 border rounded-xl p-4">
      <h2 className="text-xl font-bold">নতুন অনুরোধ</h2>
      <input type="hidden" name="id" value={id} />
      <label className="block">
        ধরন
        <select required name="kind" className="block border p-2 w-full">
          {Object.entries(supportKinds).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        বিষয়
        <input
          required
          name="title"
          minLength={5}
          maxLength={160}
          className="block border p-2 w-full"
        />
      </label>
      <label className="block">
        বিস্তারিত
        <textarea
          required
          name="message"
          minLength={20}
          maxLength={4000}
          className="block border p-2 w-full"
          rows={5}
        />
      </label>
      <label className="flex gap-2">
        <input required type="checkbox" name="consent" />
        বর্ণনা সঠিক; যাচাইয়ের জন্য দায়িত্বপ্রাপ্ত অ্যাডমিন এটি পড়তে পারবেন।
        Password/PIN/OTP দিইনি।
      </label>
      <button disabled={pending || state.ok} className="rounded border p-3">
        {pending ? "সংরক্ষণ হচ্ছে…" : "অনুরোধ পাঠান"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function SupportReview({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [state, action, pending] = useActionState(reviewSupportTicket, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <label className="block">
        উত্তর
        <textarea
          required
          name="reply"
          minLength={10}
          maxLength={3000}
          className="block border p-2 w-full"
        />
      </label>
      <label className="block">
        অবস্থা
        <select name="status" className="block border p-2">
          <option value="OPEN">যাচাই চলছে</option>
          <option value="RESOLVED">উত্তর দিয়ে বন্ধ</option>
        </select>
      </label>
      <label className="flex gap-2">
        <input required name="confirmed" type="checkbox" />
        পরিচয়/বিষয় ও সর্বশেষ অবস্থা যাচাই করেছি; এই form অর্থ, তথ্য মুছে ফেলা বা
        প্রকাশনা পরিবর্তন করে না।
      </label>
      <button disabled={pending || state.ok} className="border rounded p-2">
        উত্তর সংরক্ষণ
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
