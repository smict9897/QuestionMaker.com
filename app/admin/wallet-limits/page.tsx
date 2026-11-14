import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readWalletLimits, parseWalletLimits } from "@/lib/wallet-limits";
import { formatMoney, teacherTid } from "@/lib/wallet";
import WalletLimitsForm from "@/components/wallet-limits";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "ওয়ালেটের আর্থিক সীমা",
  robots: { index: false, follow: false },
};
export default async function LimitsPage() {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/wallet-limits");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const limits = await readWalletLimits(db),
    rows = await db.setting.findMany({
      where: { key: { startsWith: "wallet:limits-audit:v1:" } },
      orderBy: { key: "desc" },
      take: 50,
    });
  return (
    <main className="max-w-3xl mx-auto p-5 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">ওয়ালেটের আর্থিক সীমা</h1>
      <p>
        সংস্করণ {limits.revision}। ন্যূনতম Send Money ৳১, ন্যূনতম উত্তোলন ৳১০০ ও ফি ৳০
        অপরিবর্তিত। সীমা কমালে ইতিমধ্যে তৈরি Send Money confirmation আটকে যেতে
        পারে। ইতিমধ্যে সম্পন্ন লেনদেন, দৈনিক counter বা হোল্ড বদলাবে না। নতুন
        withdrawal-এ নতুন maximum প্রযোজ্য; আগে হোল্ড হওয়া অনুরোধ নিষ্পত্তি করা যাবে।
      </p>
      <WalletLimitsForm limits={limits} />
      <h2 className="text-xl font-bold">সর্বশেষ সর্বোচ্চ ৫০ পরিবর্তন</h2>
      {rows.map((row) => {
        try {
          const r = JSON.parse(row.value),
            after = parseWalletLimits(JSON.stringify(r.after));
          if (typeof r.note !== "string") throw Error();
          return (
            <article
              className="border rounded p-4 space-y-2 break-words"
              key={row.key}
            >
              <p>
                সংস্করণ {after.revision} · {after.updatedAt} ·{" "}
                {teacherTid(after.updatedBy!)}
              </p>
              <p>
                Send Money {formatMoney(after.transferDaily)} / দিন · যাচাই{" "}
                {after.recipientLookups} / দিন · উত্তোলন সর্বোচ্চ{" "}
                {formatMoney(after.withdrawalMax)}
              </p>
              <p>{r.note}</p>
            </article>
          );
        } catch {
          return (
            <p role="alert" key={row.key}>
              একটি অডিট রেকর্ড যাচাই হয়নি।
            </p>
          );
        }
      })}
    </main>
  );
}
