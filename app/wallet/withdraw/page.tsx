import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureWallet, formatMoney } from "@/lib/wallet";
import { WithdrawalRequest } from "@/components/wallet-withdrawal";
import type { Withdrawal } from "@/app/actions/wallet-withdrawal";
export const dynamic = "force-dynamic";
export const metadata = { title: "বিক্রির আয় উত্তোলন", robots: { index: false } };
export default async function WithdrawPage() {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/wallet/withdraw");
  const wallet = await ensureWallet(id);
  if (wallet.admin) redirect("/wallet");
  const rows = await db.setting.findMany({
    where: { key: { startsWith: `wallet:withdrawal:v1:${id}:` } },
    orderBy: { key: "desc" },
    take: 100,
  });
  const records = rows
    .map((row) => JSON.parse(row.value) as Withdrawal)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = await db.setting.findUnique({
    where: { key: `wallet:withdrawal-active:v1:${id}` },
  });
  return (
    <main className="mx-auto max-w-2xl p-5 space-y-5">
      <Link href="/wallet">← ওয়ালেট</Link>
      <h1 className="text-2xl font-bold">বিক্রির আয় উত্তোলন</h1>
      <p>
        অবশিষ্ট নিজের বিক্রির আয়:{" "}
        <strong>{formatMoney(wallet.funds.earnings)}</strong>। ন্যূনতম ৳১০০।
        বোনাস, রিচার্জ ও Send Money-তে পাওয়া টাকা উত্তোলনযোগ্য নয়।
      </p>
      <p>
        অনুরোধে টাকা ব্যবহারযোগ্য ব্যালেন্স থেকে হোল্ড হবে। অ্যাডমিন ম্যানুয়ালি bKash-এ
        পাঠিয়ে TrxID লিখবেন, অথবা বাতিল করলে সম্পূর্ণ আয় ফেরত আসবে। সিস্টেম ফি ৳০;
        bKash-এর cash-out চার্জ এখানে অন্তর্ভুক্ত নয়। নির্দিষ্ট সময়ের মধ্যে পেমেন্টের
        নিশ্চয়তা নয়। মার্কেটপ্লেসে কেনাকাটা ও বিক্রির আয় তৈরি এখনও চালু হয়নি।
      </p>
      {active?.value ? (
        <p role="status">আপনার একটি অনুরোধ নিষ্পত্তির অপেক্ষায় আছে।</p>
      ) : wallet.funds.earnings >= 10000 ? (
        <WithdrawalRequest requestId={randomUUID()} />
      ) : (
        <p>অনুরোধ করতে অন্তত ৳১০০ নিজের অবশিষ্ট বিক্রির আয় প্রয়োজন।</p>
      )}
      <h2 className="text-xl font-bold">সর্বোচ্চ ১০০টি সংরক্ষিত অনুরোধ</h2>
      {records.map((r) => (
        <article key={r.id} className="border rounded p-4 space-y-2">
          <p>
            {formatMoney(r.amount)} — {r.number}
          </p>
          <p>
            {r.status === "HELD"
              ? "সংরক্ষিত / অপেক্ষমাণ"
              : r.status === "PAID"
                ? "ম্যানুয়াল পেমেন্ট নথিভুক্ত"
                : "বাতিল / আয় ফেরত"}
          </p>
          <p>{r.createdAt}</p>
          {r.trx && <p>TrxID: {r.trx}</p>}
          {r.note && <p>{r.note}</p>}
        </article>
      ))}
    </main>
  );
}
