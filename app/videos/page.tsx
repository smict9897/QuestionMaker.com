import { auth } from "@/auth";
import Link from "next/link";
import { resourceCheckoutAvailable } from "@/lib/resource-checkout";
import { buy } from "@/app/actions/pay";
import { resourceDestination } from "@/lib/resource-access";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Videos() {
  const items = await db.resource
    .findMany({ where: { category: "Video" }, orderBy: { createdAt: "desc" } })
    .catch(() => []);
  const uid = (await auth())?.user?.id;
  const paid = new Set(
    uid
      ? (
          await db.purchase.findMany({
            where: {
              userId: uid,
              status: "PAID",
              resourceId: {
                in: items.filter((v) => v.priceBdt > 0).map((v) => v.id),
              },
            },
            select: { resourceId: true },
          })
        ).map((p) => p.resourceId)
      : [],
  );
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">Video lessons</h1>
      {items.length === 0 && (
        <p className="mt-6 text-slate-600">No videos yet.</p>
      )}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {items.map((v) => {
          if (!Number.isSafeInteger(v.priceBdt) || v.priceBdt < 0)
            return (
              <div key={v.id}>
                <h2>{v.title}</h2>
                <p>উপকরণটি আপাতত পাওয়া যাচ্ছে না।</p>
              </div>
            );
          if (v.priceBdt > 0)
            return (
              <div key={v.id}>
                <h2 className="mb-2 font-semibold">{v.title}</h2>
                <p>৳{v.priceBdt} · পেইড ভিডিও</p>
                {!paid.has(v.id) && resourceCheckoutAvailable(v) && (
                  <form action={buy.bind(null, v.id)}>
                    <button className="underline">কিনুন</button>
                  </form>
                )}
                <Link className="underline" href={`/api/download/${v.id}`}>
                  কেনা থাকলে অনুমতি যাচাই করে খুলুন
                </Link>
              </div>
            );
          let destination: string;
          try {
            destination = resourceDestination(v.fileUrl);
          } catch {
            return (
              <div key={v.id}>
                <h2>{v.title}</h2>
                <p>লিংকটি আপাতত পাওয়া যাচ্ছে না।</p>
              </div>
            );
          }
          const id = destination.match(
            /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/,
          )?.[1];
          return (
            <div key={v.id}>
              <h2 className="mb-2 font-semibold">{v.title}</h2>
              {id ? (
                <iframe
                  className="aspect-video w-full rounded-lg"
                  src={`https://www.youtube.com/embed/${id}`}
                  title={v.title}
                  allowFullScreen
                />
              ) : (
                <a className="text-royal underline" href={destination}>
                  Open video
                </a>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
