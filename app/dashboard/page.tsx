import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatMoney, teacherTid } from "@/lib/wallet";
import { workspaceSummary } from "@/lib/workspace-summary";
import TeacherOnboarding from "@/components/teacher-onboarding";
import TeacherWorkspace, {
  WorkspaceCards,
} from "@/components/teacher-workspace";
import { Plus, ShoppingBag, ArrowUpRight } from "lucide-react";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "আমার ড্যাশবোর্ড",
  robots: { index: false },
};
function greeting() {
  const h =
    Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Dhaka",
      }).format(new Date()),
    ) % 24;
  return h >= 5 && h < 12
    ? "সুপ্রভাত"
    : h < 17 && h >= 12
      ? "শুভ দুপুর"
      : h < 20 && h >= 17
        ? "শুভ সন্ধ্যা"
        : "শুভ রাত্রি";
}
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; skip?: string }>;
}) {
  const s = await auth();
  if (!s?.user?.id) redirect("/login?next=/dashboard");
  const user = await db.user.findUnique({ where: { id: s.user.id } });
  if (!user) redirect("/login?next=/dashboard");
  const sp = await searchParams;
  const profile = await db.teacherProfile
    .findUnique({ where: { userId: user.id } })
    .catch(() => null);
  if (sp.edit === "1" && (user.role === "TEACHER" || user.role === "ADMIN"))
    return (
      <TeacherOnboarding
        canSkip={!profile}
        defaults={{
          institution: profile?.institution ?? "",
          division: profile?.division ?? "",
          district: profile?.district ?? "",
          upazila: profile?.upazila ?? "",
          phone: profile?.phone ?? "",
          address: profile?.address ?? "",
        }}
      />
    );
  const data = await workspaceSummary(user.id),
    w = data.wallet;
  const balance = w
    ? w.admin
      ? "চার্জমুক্ত"
      : formatMoney(w.balance)
    : "লোড হয়নি";
  const packageLabel =
    data.packagePurchase === undefined
      ? "যাচাই হয়নি"
      : (data.packagePurchase?.package.title ?? "সক্রিয় প্যাকেজ নেই");
  return (
    <TeacherWorkspace
      name={user.name || "আপনি"}
      email={user.email || ""}
      balance={balance}
      admin={!!w?.admin}
    >
      <main className="tw-main">
        <Link
          href="/ready-papers/saved"
          className="inline-flex rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white mb-4"
        >
          আমার Ready প্রশ্নপত্র ও উত্তরপত্র · প্যাকেজ
        </Link>
        <section className="tw-hero">
          <span className="tw-eyebrow">আপনার প্রশ্ন তৈরির কর্মক্ষেত্র</span>
          <p>{greeting()},</p>
          <h1>{user.name || "স্বাগতম"}</h1>
          <p className="tw-muted">
            আপনার TID: <strong>{teacherTid(user.id)}</strong>
          </p>
          <p>{profile?.institution || "শিক্ষাদান ও প্রস্তুতি—সবকিছু এক জায়গায়।"}</p>
          <div className="tw-actions">
            <Link href="/question-builder" className="tw-primary">
              <Plus size={20} />
              প্রশ্ন তৈরি করুন
            </Link>
            <Link href="/packages" className="tw-secondary">
              <ShoppingBag size={19} />
              প্যাকেজ দেখুন
            </Link>
          </div>
          <div className="tw-stats">
            <div className="tw-stat">
              <small>বর্তমান balance</small>
              <strong>{balance}</strong>
              <span>
                {w?.admin ? "ADMIN সুবিধা" : "প্রশ্ন কেনার জন্য ব্যবহারযোগ্য"}
              </span>
            </div>
            <div className="tw-stat">
              <small>সংরক্ষিত প্রশ্নপত্র</small>
              <strong>
                {data.saved === null ? "—" : data.saved.toLocaleString("bn-BD")}
              </strong>
              <span>
                English draft{" "}
                {data.english === null
                  ? "—"
                  : data.english.toLocaleString("bn-BD")}
                টি আলাদা
              </span>
            </div>
            <div className="tw-stat">
              <small>আমার সাবস্ক্রিপশন</small>
              <strong style={{ fontSize: "1.15rem" }}>{packageLabel}</strong>
              <span>
                {data.packagePurchase
                  ? `মেয়াদ: ${data.packagePurchase.expiresAt?.toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka" })}`
                  : "Balance দিয়েও প্রশ্ন কেনা যায়"}
              </span>
            </div>
          </div>
        </section>
        {!w && (
          <p role="alert" className="tw-warning">
            Balance লোড করা যায়নি। রিফ্রেশ করে আবার চেষ্টা করুন; শূন্য balance ধরে
            নেওয়া হয়নি।
          </p>
        )}
        <div className="tw-section-title">
          <h2>কী করতে চান?</h2>
          <Link href="/">
            হোম <ArrowUpRight size={15} style={{ display: "inline" }} />
          </Link>
        </div>
        <section className="tw-cards" aria-label="প্রশ্নপত্র তৈরির দুটি মাধ্যম">
          <Link className="tw-feature tw-green" href="/question-builder">
            <h3>ডাটাবেজ থেকে প্রশ্নপত্র তৈরি করুন</h3>
            <p>বিষয় ও অধ্যায় অনুযায়ী প্রশ্ন বেছে সাজান।</p>
          </Link>
          <Link className="tw-feature tw-purple" href="/ready-papers">
            <h3>পিডিএফ থেকে প্রশ্নপত্র তৈরি করুন</h3>
            <p>বোর্ড ও স্কুলের PDF থেকে প্রশ্ন বেছে সাজান।</p>
          </Link>
        </section>
        <Link
          href="/dashboard/sell"
          className="block rounded-xl border border-indigo-200 bg-indigo-50 p-4 font-bold text-indigo-900 mb-4"
        >
          নিজের তৈরি প্রশ্নপত্র বিক্রির জন্য জমা দিন · প্রস্তুতি পর্যায় →
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/admin/marketplace" className="block mb-4 underline">
            বিক্রির আবেদন যাচাই করুন →
          </Link>
        )}
        <Link href="/marketplace" className="block mb-4 underline">
          শিক্ষকদের প্রশ্নপত্র ক্যাটালগ দেখুন →
        </Link>
        <WorkspaceCards />
        <section className="tw-panel">
          <h2>আপনার অ্যাকাউন্ট, এক নজরে</h2>
          <p>
            আগে কেনা প্রশ্ন:{" "}
            <strong>
              {data.purchased === null
                ? "লোড হয়নি"
                : data.purchased.toLocaleString("bn-BD")}
            </strong>{" "}
            · একই প্রশ্নে পুনরায় চার্জ নেই।
          </p>
          <p className="tw-muted">
            MCQ ২০ পয়সা · সংক্ষিপ্ত ৩০ পয়সা · সৃজনশীল ৫০ পয়সা। সক্রিয় প্যাকেজে
            অন্তর্ভুক্ত প্রশ্নে balance কাটে না। প্রথম লগইনের ৳২০ credit নগদ উত্তোলনযোগ্য
            নয়।
          </p>
          <Link className="tw-link" href="/wallet">
            ওয়ালেট ও লেনদেন দেখুন →
          </Link>
          {(user.role === "TEACHER" || user.role === "ADMIN") && (
            <>
              {" "}
              ·{" "}
              <Link className="tw-link" href="/dashboard?edit=1">
                প্রতিষ্ঠানের তথ্য সম্পাদনা
              </Link>
            </>
          )}
          {user.role === "ADMIN" && (
            <>
              {" "}
              ·{" "}
              <Link className="tw-link" href="/admin">
                অ্যাডমিন প্যানেল
              </Link>
            </>
          )}
        </section>
      </main>
    </TeacherWorkspace>
  );
}
