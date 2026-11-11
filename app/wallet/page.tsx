import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ensureWallet, formatMoney } from "@/lib/wallet";
import { db } from "@/lib/db";
import { PAYMENT_NUMBER, PAYMENT_TYPE } from "@/lib/payment-info";
import RechargeForm from "@/components/recharge-form";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function WalletPage() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login?next=/wallet");
  const a = await ensureWallet(s.user.id);
  const rows = await db.setting.findMany({
    where: { key: { startsWith: `wallet:recharge:${s.user.id}:` } },
    orderBy: { key: "desc" },
    take: 50,
  });
  const receipts = await db.setting.findMany({
    where: { key: { startsWith: `wallet:question:${s.user.id}:` } },
    take: 50,
  });
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Account balance</h1>
      <p className="my-4 text-xl">
        {a.admin
          ? "ADMIN — চার্জ প্রযোজ্য নয়"
          : `বর্তমান balance: ${formatMoney(a.balance)}`}
      </p>
      <p>
        প্রথম লগইনে একবার ৳২০ trial bonus। এটি প্রশ্ন কেনার credit; নগদ
        উত্তোলনযোগ্য নয়। MCQ ৳০.২০, SQ ৳০.৩০, CQ ৳০.৫০।
      </p>
      <p className="mt-3">
        সক্রিয় অনুমোদিত প্যাকেজ থাকলে balance কাটবে না। পূর্বে কেনা একই প্রশ্নে
        পুনরায় চার্জ নেই।
      </p>
      <Link className="underline" href="/packages">
        প্যাকেজ দেখুন
      </Link>
      {!a.admin && (
        <section className="mt-6 rounded-xl border p-5">
          <h2 className="text-xl font-bold">Recharge করুন — ন্যূনতম ৳২০</h2>
          <p>
            {PAYMENT_TYPE}: {PAYMENT_NUMBER} (bKash / Nagad)। টাকা পাঠিয়ে TrxID
            দিন। অ্যাডমিন যাচাই করলে তবেই balance যোগ হবে।
          </p>
          <RechargeForm />
        </section>
      )}
      <h2 className="mt-6 text-xl">সর্বশেষ প্রশ্ন কেনার রসিদ (সর্বোচ্চ ৫০)</h2>
      {receipts.map((row) => {
        const r = JSON.parse(row.value);
        return (
          <p key={row.key} className="border-b py-2">
            {r.questionId} · −{formatMoney(r.amount)} · {r.at}
          </p>
        );
      })}
      <h2 className="mt-6 text-xl">Recharge history (সর্বোচ্চ ৫০)</h2>
      {rows.map((row) => {
        const r = JSON.parse(row.value);
        return (
          <p key={row.key} className="border-b py-3">
            {formatMoney(r.amount)} · {r.method} · {r.trx} · {r.status}
          </p>
        );
      })}
    </main>
  );
}
