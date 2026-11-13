import { admin } from "@/lib/guard";
import { db } from "@/lib/db";
import AdminRechargeReview from "@/components/admin-recharge-review";
import { formatMoney, teacherTid } from "@/lib/wallet";
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
  const userIds = [
    ...new Set(
      rows.flatMap((row) => {
        try {
          const r = JSON.parse(row.value);
          return typeof r.userId === "string" ? [r.userId as string] : [];
        } catch {
          return [];
        }
      }),
    ),
  ];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Recharge যাচাই</h1>
      <p>
        Provider-এর transaction statement-এ amount, TrxID ও sender মেলানোর পর
        অনুমোদন করুন। Screenshot একা payment proof নয়।
      </p>
      {rows.map((row) => {
        let r;
        try {
          r = JSON.parse(row.value);
        } catch {
          return null;
        }
        const user = byId.get(r.userId);
        if (!user || !Number.isSafeInteger(r.amount)) return null;
        return (
          <section className="my-4 rounded border p-4" key={row.key}>
            <p>
              {user.name || user.email} · TID:{" "}
              <strong>{teacherTid(user.id)}</strong> · আবেদন: {row.key} ·{" "}
              {formatMoney(r.amount)} · {r.method} · {r.phone} · {r.trx} ·{" "}
              {r.status}
            </p>
            {r.status === "PENDING" && (
              <AdminRechargeReview
                requestKey={row.key}
                amount={r.amount}
                name={user.name || user.email}
                tid={teacherTid(user.id)}
              />
            )}
          </section>
        );
      })}
    </main>
  );
}
