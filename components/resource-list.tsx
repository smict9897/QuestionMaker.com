import { FileDown, ShoppingCart } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resourceCheckoutAvailable } from "@/lib/resource-checkout";
import { buy } from "@/app/actions/pay";
import { catPath } from "@/lib/cat-paths";
import SaveButton from "@/components/save-button";

export default async function ResourceList({
  title,
  category,
}: {
  title: string;
  category: string;
}) {
  const uid = (await auth())?.user?.id;
  const items = await db.resource
    .findMany({ where: { category }, orderBy: { createdAt: "desc" } })
    .catch(() => []);
  const paid = new Set(
    (uid
      ? await db.purchase.findMany({ where: { userId: uid, status: "PAID" } })
      : []
    ).map((p) => p.resourceId),
  );
  const btn =
    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-white";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      {items.length === 0 && (
        <p className="mt-6 text-slate-600">
          No materials yet. Check back soon.
        </p>
      )}
      <ul className="mt-6 grid gap-3">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{r.title}</h2>
              <p className="text-sm text-slate-600">
                {r.priceBdt > 0 ? `৳${r.priceBdt}` : "Free"} · {r.downloads}{" "}
                downloads
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SaveButton
                item={{
                  id: r.id,
                  type: "resource",
                  title: r.title,
                  href: catPath[r.category] ?? "/",
                }}
              />
              {r.priceBdt > 0 && !paid.has(r.id) ? (
                !resourceCheckoutAvailable(r) ? (
                  <span className="text-sm text-slate-600">
                    সুরক্ষিত ক্রয় আপাতত প্রস্তুত নয়
                  </span>
                ) : (
                  <form action={buy.bind(null, r.id)}>
                    <button className={`${btn} bg-hire`}>
                      <ShoppingCart size={16} />
                      Buy ৳{r.priceBdt}
                    </button>
                  </form>
                )
              ) : (
                <a href={`/api/download/${r.id}`} className={`${btn} bg-royal`}>
                  <FileDown size={16} />
                  Download
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
