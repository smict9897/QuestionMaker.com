"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePaper, type SavedPaper } from "@/app/actions/qb-papers";

export default function QbSavedList({ papers }: { papers: SavedPaper[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function open(p: SavedPaper) {
    try {
      localStorage.setItem("qb:selected", JSON.stringify(p.ids));
      localStorage.setItem("qb:settings", JSON.stringify(p.settings ?? {}));
    } catch {}
    router.push("/question-builder/build");
  }

  function remove(p: SavedPaper) {
    if (!confirm(`"${p.name}" মুছে ফেলবেন?`)) return;
    start(async () => {
      await deletePaper(p.key);
      router.refresh();
    });
  }

  if (!papers.length)
    return <p className="mt-6 text-center text-slate-600">এখনও কোনো প্রশ্নপত্র সেভ করা হয়নি।</p>;

  return (
    <ul className="mt-4 space-y-3">
      {papers.map((p) => (
        <li key={p.key} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="font-semibold">{p.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {p.count}টি প্রশ্ন{p.createdAt ? ` · ${new Date(p.createdAt).toLocaleDateString("bn-BD")}` : ""}
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => open(p)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">
              খুলুন
            </button>
            <button
              onClick={() => remove(p)}
              disabled={pending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-60"
            >
              মুছুন
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
