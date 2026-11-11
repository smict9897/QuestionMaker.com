import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { decideEnglishRecovery } from "./actions";
import { validateEnglishDraft } from "@/lib/english/draft";

export const dynamic = "force-dynamic";
export default async function EnglishReview() {
  if ((await auth())?.user?.role !== "ADMIN") redirect("/login");
  const rows = await db.setting.findMany({
    where: { key: { startsWith: "english-review:" } },
    orderBy: { key: "desc" },
    take: 100,
  });
  return (
    <main className="space-y-5 p-5">
      <h1 className="text-2xl font-bold">English — উদ্ধার করা অংশের অনুমোদন</h1>
      <p>
        সর্বোচ্চ ১০০টি সংরক্ষিত snapshot। অনুমোদিত অংশ অন্য English paper তৈরিতে
        database থেকে ব্যবহার করা যাবে। Live test-এ স্বয়ংক্রিয় প্রকাশ হবে না।
        মালিকের private draft আলাদা থাকে।
      </p>
      {rows.map((row) => {
        try {
          const record = JSON.parse(row.value),
            draft = validateEnglishDraft(record.draft);
          return (
            <article key={row.key} className="rounded border p-4 space-y-3">
              <h2>
                {draft.name} — {record.status}
              </h2>
              {draft.output.passages.map((p) => (
                <pre className="whitespace-pre-wrap" key={p.key}>
                  {p.text}
                </pre>
              ))}
              {draft.output.tasks.map((task) => (
                <section key={task.id}>
                  <h3>{task.id}</h3>
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(task, null, 2)}
                  </pre>
                </section>
              ))}
              {record.status === "PENDING" && (
                <form action={decideEnglishRecovery} className="flex gap-4">
                  <input type="hidden" name="key" value={row.key} />
                  <button name="status" value="APPROVED">
                    অনুমোদন
                  </button>
                  <button name="status" value="REJECTED">
                    বাতিল
                  </button>
                </form>
              )}
            </article>
          );
        } catch {
          return null;
        }
      })}
    </main>
  );
}
