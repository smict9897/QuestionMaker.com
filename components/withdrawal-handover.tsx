"use client";
import { useActionState } from "react";
import { manageWithdrawalHandover } from "@/app/actions/withdrawal-handover";
import type { WithdrawalHandover } from "@/lib/withdrawal-handover";
export default function HandoverForm({
  recordKey,
  claimedAt,
  claimHandoverId,
  admins,
  proposal,
  actor,
}: {
  recordKey: string;
  claimedAt: string;
  claimHandoverId?: string;
  admins: { id: string; name: string | null }[];
  proposal?: WithdrawalHandover;
  actor: string;
}) {
  const [state, action, busy] = useActionState(manageWithdrawalHandover, {
    ok: false,
    message: "",
  });
  const pending = proposal?.status === "PENDING";
  const mode = pending
    ? proposal.from === actor
      ? "CANCEL"
      : proposal.to === actor
        ? "ACCEPT"
        : null
    : "OFFER";
  return (
    <section className="border rounded p-3 space-y-3">
      <h3 className="font-bold">দায়িত্ব হস্তান্তর</h3>
      <p>
        এটি টাকা পাঠায় না। প্রস্তাবের আগে চলমান পেমেন্ট থামিয়ে বাইরে আগে টাকা গেছে
        কি না যাচাই করুন। অপেক্ষমাণ প্রস্তাবে নিষ্পত্তি বন্ধ থাকে। অনুপস্থিত
        দায়িত্বপ্রাপ্তকে পাশ কাটিয়ে নেওয়ার ব্যবস্থা নয়।
      </p>
      {pending && (
        <p role="status">
          হস্তান্তর অপেক্ষমাণ। টাকা পাঠাবেন না। কারণ: {proposal.note}
        </p>
      )}
      {mode && (
        <form action={action} className="space-y-3">
          <input type="hidden" name="key" value={recordKey} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="claimedAt" value={claimedAt} />
          <input
            type="hidden"
            name="claimHandoverId"
            value={claimHandoverId || ""}
          />
          {proposal && (
            <input type="hidden" name="handoverId" value={proposal.id} />
          )}{" "}
          {mode === "OFFER" && (
            <>
              <label className="block">
                দায়িত্ব গ্রহণ করবেন
                <select
                  name="to"
                  required
                  className="block border rounded p-2 w-full"
                >
                  <option value="">অ্যাডমিন বাছুন</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                হস্তান্তরের কারণ
                <textarea
                  name="note"
                  required
                  minLength={10}
                  maxLength={1000}
                  className="block border rounded p-2 w-full"
                />
              </label>
            </>
          )}
          <label className="flex gap-2">
            <input type="checkbox" name="confirmed" required />
            বাইরের পেমেন্ট ও সর্বশেষ দায়িত্ব যাচাই করেছি; এই কাজ নিজে টাকা পাঠায়
            না।
          </label>
          <button disabled={busy} className="border rounded p-2">
            {busy
              ? "সংরক্ষণ হচ্ছে…"
              : mode === "OFFER"
                ? "হস্তান্তরের প্রস্তাব দিন"
                : mode === "ACCEPT"
                  ? "দায়িত্ব গ্রহণ করুন"
                  : "প্রস্তাব বাতিল করুন"}
          </button>
        </form>
      )}
      {state.message && <p role="status">{state.message}</p>}
    </section>
  );
}
