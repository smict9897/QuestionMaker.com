import HandoverForm from "@/components/withdrawal-handover";
import { handoverKey, parseHandover } from "@/lib/withdrawal-handover";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatMoney, teacherTid } from "@/lib/wallet";
import { parseWithdrawal } from "@/lib/wallet-withdrawal";
import {
  WithdrawalReview,
  WithdrawalClaim,
} from "@/components/wallet-withdrawal";
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
  const [handoverRows, admins] = await Promise.all([
    db.setting.findMany({
      where: { key: { in: rows.map((r) => handoverKey(r.key)) } },
      take: 100,
    }),
    db.user.findMany({
      where: { role: "ADMIN", id: { not: id } },
      select: { id: true, name: true },
      take: 100,
    }),
  ]);
  const handovers = new Map(handoverRows.map((r) => [r.key, r.value]));
  return (
    <main className="mx-auto max-w-3xl p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">উত্তোলন নিষ্পত্তি</h1>
      <p>
        সর্বোচ্চ ১০০টি নির্বাচিত অবস্থার অনুরোধ। এই বাটন টাকা পাঠায় না। বাইরে bKash-এ
        পাঠানোর আগে নিজের দায়িত্বে নিন, আগের পেমেন্ট/TrxID, নম্বর ও পরিমাণ যাচাই
        করুন। দায়িত্বের মেয়াদ শেষ হয় না, অন্য অ্যাডমিন নিতে পারেন না। একই অ্যাডমিন
        একাধিক ট্যাব থেকেও একবারই টাকা পাঠাবেন। বাইরের পেমেন্ট সফটওয়্যার দিয়ে
        আটকানো যায় না। দায়িত্বপ্রাপ্ত অ্যাডমিন অনুপস্থিত হলে হিসাব যাচাই ছাড়া আবার
        টাকা পাঠাবেন না; দায়িত্বপ্রাপ্ত চাইলে নির্দিষ্ট অ্যাডমিনকে প্রস্তাব দিতে পারেন।
        প্রাপক গ্রহণের আগে দায়িত্ব বদলাবে না; অপেক্ষমাণ অবস্থায় নিষ্পত্তি বন্ধ থাকবে।
      </p>
      <nav className="flex gap-4">
        <Link href="?status=HELD">অপেক্ষমাণ</Link>
        <Link href="?status=PAID">পেমেন্ট নথিভুক্ত</Link>
        <Link href="?status=REJECTED">বাতিল</Link>
      </nav>
      {rows.map((row) => {
        let r, proposal;
        try {
          r = parseWithdrawal(row.key, row.value);
          const raw = handovers.get(handoverKey(row.key));
          if (raw) proposal = parseHandover(raw, row.key);
        } catch {
          return (
            <p role="alert" key={row.key}>
              একটি অনুরোধ যাচাই হয়নি; টাকা পাঠাবেন না।
            </p>
          );
        }
        return (
          <article key={row.key} className="border rounded-xl p-5 space-y-3">
            <p className="break-all">TID: {teacherTid(r.userId)}</p>
            <p>
              {formatMoney(r.amount)} → {r.number}
            </p>
            <p>{r.createdAt}</p>
            {r.claimedBy && (
              <p className="break-all">
                দায়িত্বপ্রাপ্ত:{" "}
                {r.claimedBy === id ? "আপনি" : teacherTid(r.claimedBy)} ·{" "}
                {r.claimedAt}
              </p>
            )}
            {r.status === "HELD" &&
              r.claimedBy &&
              (r.claimedBy === id || proposal?.status === "PENDING") && (
                <HandoverForm
                  recordKey={row.key}
                  claimedAt={r.claimedAt!}
                  claimHandoverId={r.handoverId}
                  admins={admins.filter((a) => a.id !== r.userId)}
                  proposal={proposal}
                  actor={id}
                />
              )}
            {r.status === "HELD" ? (
              proposal?.status === "PENDING" ? (
                <p role="status">
                  হস্তান্তর অপেক্ষমাণ; এখন টাকা পাঠানো বা নিষ্পত্তি করা যাবে না।
                </p>
              ) : !r.claimedBy ? (
                <WithdrawalClaim recordKey={row.key} />
              ) : r.claimedBy === id ? (
                <WithdrawalReview
                  recordKey={row.key}
                  handoverId={r.handoverId}
                />
              ) : (
                <p role="status">
                  অন্য অ্যাডমিনের দায়িত্বে আছে। টাকা পাঠাবেন না; নিষ্পত্তি করা যাবে
                  না।
                </p>
              )
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
