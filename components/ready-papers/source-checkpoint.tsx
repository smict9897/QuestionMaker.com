"use client";
import { useState } from "react";
import { saveReadySourceCheckpoint } from "@/app/actions/ready-vault";
export default function SourceCheckpoint({ receiptId }: { receiptId: string }) {
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="space-y-2 mt-3">
      <p>
        সুরক্ষিত উৎস কপি শুধু checkout-এ বাছা মূল পৃষ্ঠাগুলো রাখে; আপনার header,
        crop/পরবর্তী edit বা উত্তরপত্র নয়। এটি চূড়ান্ত assembled প্রশ্নপত্র বা বিক্রির
        অনুমতি নয়।
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await saveReadySourceCheckpoint(receiptId);
            if (r.ok) setReady(true);
            else setError(r.error);
          } catch {
            setError("কাজটি হয়নি। পরে আবার চেষ্টা করুন।");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "উৎস কপি সংরক্ষণ হচ্ছে…" : "সুরক্ষিত উৎস কপি সংরক্ষণ / খুলুন"}
      </button>
      {ready && (
        <p>
          <a className="underline" href={`/api/ready-vault/${receiptId}`}>
            নির্বাচিত মূল পৃষ্ঠার কপি ডাউনলোড করুন
          </a>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
