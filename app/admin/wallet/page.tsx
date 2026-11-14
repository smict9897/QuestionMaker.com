import Link from "next/link";
import { redirect } from "next/navigation";
import { rechargeListOptions, rechargeListPage } from "@/lib/recharge-list";
import { admin } from "@/lib/guard";
import { db } from "@/lib/db";
import AdminRechargeReview from "@/components/admin-recharge-review";
import { formatMoney, teacherTid } from "@/lib/wallet";
export const dynamic = "force-dynamic";
export default async function WalletAdmin({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const actor = await admin();
  if (
    !actor.id ||
    (
      await db.user.findUnique({
        where: { id: actor.id },
        select: { role: true },
      })
    )?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const { cursor, query } = rechargeListOptions((await searchParams).after);
  const { rows, next } = rechargeListPage(await db.setting.findMany(query));
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
      <p>
        প্রতি পাতায় সর্বোচ্চ ২০০টি অপেক্ষমাণ রিচার্জ। বাকি অনুরোধ নিচের পরের পাতায়
        দেখুন।
      </p>
      {!rows.length && <p role="status">এই পাতায় অপেক্ষমাণ রিচার্জ নেই।</p>}
      {cursor && (
        <Link className="underline" href="/admin/wallet">
          প্রথম পাতায় ফিরুন
        </Link>
      )}
      {rows.map((row) => {
        let r;
        try {
          r = JSON.parse(row.value);
        } catch {
          return null;
        }
        const user = byId.get(r.userId);
        if (
          !user ||
          !Number.isSafeInteger(r.amount) ||
          r.amount < 2000 ||
          r.amount > 5000000 ||
          r.status !== "PENDING" ||
          row.key !== `wallet:recharge:${r.userId}:${r.trx}`
        )
          return (
            <p role="alert" key={row.key}>
              একটি অনুরোধ যাচাই হয়নি। তথ্য মিলিয়ে না দেখে অনুমোদন করবেন না।
            </p>
          );
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
      {next && (
        <Link className="underline" href={next}>
          পরের রিচার্জ অনুরোধগুলো দেখুন →
        </Link>
      )}
    </main>
  );
}
