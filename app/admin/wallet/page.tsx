import { admin } from "@/lib/guard";
import { db } from "@/lib/db";
import { reviewRecharge } from "@/app/actions/wallet";
import { formatMoney } from "@/lib/wallet";
export const dynamic = "force-dynamic";
export default async function WalletAdmin() {
  await admin();
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: "wallet:recharge:" },
      value: { contains: '"status":"PENDING"' },
    },
    take: 200,
    orderBy: { key: "asc" },
  });
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Recharge যাচাই</h1>
      <p>
        Provider-এর transaction statement-এ amount, TrxID ও sender মেলানোর পর
        অনুমোদন করুন। Screenshot একা payment proof নয়।
      </p>
      {rows.map((row) => {
        const r = JSON.parse(row.value);
        return (
          <section className="my-4 rounded border p-4" key={row.key}>
            <p>
              {r.userId} · {formatMoney(r.amount)} · {r.method} · {r.phone} ·{" "}
              {r.trx} · {r.status}
            </p>
            {r.status === "PENDING" && (
              <div className="flex gap-4">
                <form
                  action={async () => {
                    "use server";
                    await reviewRecharge(row.key, true);
                  }}
                >
                  <button className="rounded bg-green-700 p-2 text-white">
                    যাচাই হয়েছে — অনুমোদন
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await reviewRecharge(row.key, false);
                  }}
                >
                  <button className="rounded bg-red-700 p-2 text-white">
                    প্রত্যাখ্যান
                  </button>
                </form>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
