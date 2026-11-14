import SourceCheckpoint from "@/components/ready-papers/source-checkpoint";
import { vaultConfigured } from "@/lib/pdf-vault";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  listReadyPurchases,
  readyPlanSummary,
} from "@/app/actions/ready-commerce";
import ReadyPlanCard from "@/components/ready-papers/plan-card";
import "@/components/ready-papers/ready.css";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = {
  title: "আমার প্রশ্নপত্র ও উত্তরপত্র",
  robots: { index: false },
};
export default async function SavedReady() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login?next=/ready-papers/saved");
  const [papers, summary] = await Promise.all([
    listReadyPurchases(),
    readyPlanSummary(),
  ]);
  const secureStorageReady = vaultConfigured();
  return (
    <main className="rp-root">
      <section className="rp-hero">
        <h1>আমার প্রশ্নপত্র ও উত্তরপত্র</h1>
        <p>
          কেনা প্রশ্নপত্র আবার খুলুন, edit করুন ও print করুন—একই নির্বাচনে নতুন খরচ নেই।
        </p>
        <Link href="/ready-papers/upload">আমার আপলোড / নিজের PDF →</Link> ·{" "}
        <Link href="/ready-papers">নতুন প্রশ্নপত্র বাছুন →</Link> ·{" "}
        <Link href="/wallet">ব্যালেন্স / Recharge →</Link>
      </section>
      {summary.ok ? (
        <ReadyPlanCard
          balance={summary.wallet.balance}
          admin={summary.wallet.admin}
          remaining={summary.plan?.remaining}
          expiresAt={summary.plan?.expiresAt}
        />
      ) : (
        <p role="alert">{summary.error}</p>
      )}
      <section className="rp-panel">
        <h2>সংরক্ষিত প্রশ্নপত্র</h2>
        {!papers.length && (
          <p>
            এখনো কোনো কেনা প্রশ্নপত্র নেই। Library থেকে পৃষ্ঠা বেছে সেটআপের আগে মূল্য
            নিশ্চিত করুন।
          </p>
        )}
        {papers.map((p) => (
          <article key={p.id} className="rp-saved-item">
            <h3>{p.title}</h3>
            <p>
              মূল পৃষ্ঠা {p.selected.join(", ")} · {p.units} ইউনিট · ৳
              {p.amount / 100} · প্যাকেজ {p.packageUnits} ইউনিট
            </p>
            <p>
              প্রশ্নপত্র + {p.answers.length}/{p.selected.length} পৃষ্ঠার অনুমোদিত
              উত্তরমালা সংরক্ষিত। বাকি পৃষ্ঠার উত্তর অনুমোদিত নেই।
            </p>
            <p>
              AI উত্তরপত্রের চেষ্টা ও ফলও এই অ্যাকাউন্টে থাকে। নিচের লিংক খুলে AI উত্তর
              দেখুন; অনিশ্চিত উত্তর ফাঁকা থাকবে।
            </p>
            <p>
              {new Date(p.updatedAt).toLocaleString("bn-BD", {
                timeZone: "Asia/Dhaka",
              })}
            </p>
            <p>
              {p.originHash
                ? "Checkout-এর অপরিবর্তনীয় উৎস-রেকর্ড সংরক্ষিত আছে। এটি কপিরাইট বা পুনর্বিক্রির অনুমতি নয়।"
                : "পুরোনো কপি: অপরিবর্তনীয় উৎস-রেকর্ড নেই; পুনর্বিক্রির যোগ্যতা যাচাই হয়নি।"}
            </p>
            {secureStorageReady && p.originHash && (
              <SourceCheckpoint receiptId={p.id} />
            )}
            <Link href={`/ready-papers/${p.paperId}?saved=${p.id}`}>
              প্রশ্নপত্র ও উত্তরপত্র খুলুন →
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
