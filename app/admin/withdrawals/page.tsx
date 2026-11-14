import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatMoney, teacherTid } from "@/lib/wallet";
import type { Withdrawal } from "@/app/actions/wallet-withdrawal";
import { WithdrawalReview } from "@/components/wallet-withdrawal";
export const dynamic = "force-dynamic";
export const metadata = { title: "উত্তোলন নিষ্পত্তি", robots: { index: false } };
export default async function WithdrawalsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const requested = (await searchParams).status;
  const status =
    requested === "PAID" || requested === "REJECTED" ? requested : "HELD";
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/withdrawals");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const rows = await db.setting.findMany({
    where: {
      key: { startsWith: "wallet:withdrawal:v1:" },
      value: { contains: `"status":"${status}"` },
    },
    orderBy: { key: "asc" },
    take: 100,
  });
  return (
    <main className="mx-auto max-w-3xl p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">উত্তোলন নিষ্পত্তি</h1>
      <p>
        সর্বোচ্চ ১০০ অপেক্ষমাণ অনুরোধ। এই বাটন টাকা পাঠায় না। বাইরে bKash-এ পাঠানোর
        আগে আগের পেমেন্ট/TrxID ও নম্বর যাচাই করুন। একাধিক অ্যাডমিন একই অনুরোধে একসঙ্গে
        টাকা পাঠাবেন না।
      </p>
      <nav className="flex gap-4">
        <Link href="?status=HELD">অপেক্ষমাণ</Link>
        <Link href="?status=PAID">পেমেন্ট নথিভুক্ত</Link>
        <Link href="?status=REJECTED">বাতিল</Link>
      </nav>
      {rows.map((row) => {
        const r = JSON.parse(row.value) as Withdrawal;
        return (
          <article key={row.key} className="border rounded-xl p-5 space-y-3">
            <p className="break-all">TID: {teacherTid(r.userId)}</p>
            <p>
              {formatMoney(r.amount)} → {r.number}
            </p>
            <p>{r.createdAt}</p>
            {r.status === "HELD" ? (
              <WithdrawalReview recordKey={row.key} />
            ) : (
              <>
                <p>TrxID: {r.trx || "—"}</p>
                <p>{r.note}</p>
                <p>{r.reviewedAt}</p>
              </>
            )}
          </article>
        );
      })}
    </main>
  );
}
