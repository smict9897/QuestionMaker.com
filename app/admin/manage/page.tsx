import { db } from "@/lib/db";
import { remove, updateResource, updateQuestion } from "@/app/actions/manage";
export const dynamic = "force-dynamic";
const f = "rounded-md border border-slate-300 px-2 py-1 text-sm";
const save = "rounded-md bg-royal px-3 py-1 text-sm text-white";
const del = "rounded-md border border-red-300 px-3 py-1 text-sm text-red-700";
const row =
  "flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3";
export default async function Manage() {
  const [res, posts, qs] = await Promise.all([
    db.resource.findMany({ orderBy: { createdAt: "desc" } }),
    db.post.findMany({ orderBy: { createdAt: "desc" } }),
    db.question.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-10">
      <h1 className="text-2xl font-bold">Edit or delete content</h1>
      <section className="grid gap-2">
        <h2 className="font-semibold">Materials and videos</h2>
        {res.map((r) => (
          <div key={r.id} className={row}>
            <form
              action={updateResource.bind(null, r.id)}
              className="flex flex-1 flex-wrap gap-2"
            >
              <input
                name="title"
                defaultValue={r.title}
                className={`${f} flex-1`}
                aria-label="Title"
              />
              <input
                name="price"
                type="number"
                min={0}
                defaultValue={r.priceBdt}
                className={`${f} w-24`}
                aria-label="Price"
              />
              <button className={save}>Save</button>
            </form>
            <form action={remove.bind(null, "resource", r.id)}>
              <button className={del}>Delete</button>
            </form>
          </div>
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="font-semibold">Questions (latest 30)</h2>
        {qs.map((q) => (
          <div key={q.id} className={row}>
            <form
              action={updateQuestion.bind(null, q.id)}
              className="grid flex-1 gap-2"
            >
              <textarea
                name="text"
                defaultValue={q.text}
                className={f}
                aria-label="Question"
              />
              <textarea
                name="explanation"
                defaultValue={q.explanation}
                className={f}
                aria-label="Explanation"
              />
              <div>
                <button className={save}>Save</button>
              </div>
            </form>
            <form action={remove.bind(null, "question", q.id)}>
              <button className={del}>Delete</button>
            </form>
          </div>
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="font-semibold">Blog posts</h2>
        {posts.map((p) => (
          <div key={p.id} className={row}>
            <span className="flex-1">{p.title}</span>
            <form action={remove.bind(null, "post", p.id)}>
              <button className={del}>Delete</button>
            </form>
          </div>
        ))}
      </section>
    </main>
  );
}
