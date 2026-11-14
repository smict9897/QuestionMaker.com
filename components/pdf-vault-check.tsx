"use client";
import { useActionState } from "react";
import { checkPdfVault } from "@/app/actions/pdf-vault-check";
export default function PdfVaultCheck() {
  const [state, action, pending] = useActionState(checkPdfVault, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="space-y-3 border rounded-xl p-4">
      <label className="flex gap-2">
        <input type="checkbox" required name="confirmed" />
        একটি ছোট, ব্যক্তিগত তথ্যবিহীন test PDF encrypt করে storage-এ লেখা, পড়া ও
        মুছে ফেলার অনুমতি দিচ্ছি। Provider usage charge হতে পারে; এটি ব্যবহারকারীর
        ফাইল বা ওয়ালেট বদলাবে না।
      </label>
      <button disabled={pending} className="border rounded p-3">
        {pending
          ? "Storage পরীক্ষা চলছে…"
          : "এই deployment-এর storage পরীক্ষা করুন"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
