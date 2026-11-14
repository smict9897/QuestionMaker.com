import Link from "next/link";
import { db } from "@/lib/db";
import { readWalletLimits } from "@/lib/wallet-limits";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureWallet, formatMoney, teacherTid } from "@/lib/wallet";
import WalletTransfer from "@/components/wallet-transfer";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "TID দিয়ে Send Money",
  robots: { index: false },
};
export default async function SendMoney() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login?next=/wallet/send");
  const wallet = await ensureWallet(user.id);
  if (wallet.admin) redirect("/wallet");
  const limits = await readWalletLimits(db);
  return (
    <main className="mx-auto max-w-2xl p-5 space-y-5">
      <Link href="/wallet">← ওয়ালেট</Link>
      <h1 className="text-2xl font-bold">শিক্ষককে Send Money</h1>
      <p className="break-all">আপনার TID: {teacherTid(user.id)}</p>
      <section className="rounded-xl bg-slate-50 p-4">
        <p>
          মোট ব্যবহারযোগ্য: <strong>{formatMoney(wallet.balance)}</strong>
        </p>
        <p>
          পাঠানোর যোগ্য:{" "}
          <strong>{formatMoney(wallet.balance - wallet.funds.bonus)}</strong>
        </p>
        <p className="text-sm mt-2">
          বোনাস পাঠানো যায় না। ন্যূনতম ৳১, প্রতি দিন সর্বোচ্চ{" "}
          {formatMoney(limits.transferDaily)}। ফি ৳০। প্রাপক এই টাকা দিয়ে
          তৈরি/কেনা করতে পারবেন, উত্তোলন করতে পারবেন না। দিনে সর্বোচ্চ{" "}
          {limits.recipientLookups}
          বার প্রাপক যাচাই করা যাবে।
        </p>
      </section>
      <WalletTransfer maximum={limits.transferDaily} />
    </main>
  );
}
