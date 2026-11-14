"use client";
import { useActionState } from "react";
import {
  migratePaidResource,
  retirePaidResourceOriginal,
} from "@/app/actions/resource-vault";
export default function ResourceVaultMigration({ id }: { id: string }) {
  const [state, action, busy] = useActionState(migratePaidResource, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="resourceId" value={id} />
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" required />
        Encrypted কপি যাচাইয়ের পর download route পরিবর্তন হবে। পুরোনো public URL
        নিজে থেকে বন্ধ হবে না; provider usage হতে পারে।
      </label>
      <button disabled={busy || state.ok} className="border rounded p-2">
        {busy ? "Migration চলছে…" : "এই PDF migrate করুন"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}

export function RetireResourceOriginal({ id }: { id: string }) {
  const [state, action, busy] = useActionState(retirePaidResourceOriginal, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="space-y-3 border-t pt-3">
      <input type="hidden" name="resourceId" value={id} />
      <label className="flex gap-2">
        <input type="checkbox" name="backupConfirmed" required />
        Encrypted copy, key backup/restore এবং shared/external references নিজে
        যাচাই করেছি।
      </label>
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" required />
        পুরোনো notes/ object storage থেকে মুছতে বলছি। এটি destructive কাজ; আগে
        download/print/cache ফিরিয়ে নেওয়া যায় না।
      </label>
      <button className="border rounded p-2" disabled={busy || state.ok}>
        {busy ? "Retirement চলছে…" : "যাচাইকৃত পুরোনো public object retire করুন"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
