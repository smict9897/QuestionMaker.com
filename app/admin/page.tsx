import AdminAIGenerator from "@/components/admin-ai-generator";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-white/70 bg-white p-4 shadow-sm";

type PanelLink = { href: string; label: string; badge?: number };
type PanelGroup = {
  title: string;
  icon: string;
  open?: boolean;
  links: PanelLink[];
};

export default async function Admin() {
  const pendingPayments = await db.packagePurchase.count({
    where: { status: "PENDING" },
  });

  const groups: PanelGroup[] = [
    {
      title: "মডেল টেস্ট",
      icon: "🎯",
      open: true,
      links: [
        {
          href: "/admin/model-test",
          label: "মডেল টেস্ট ম্যানেজ (তৈরি/এডিট/ডিলিট)",
        },
        { href: "/model-test", label: "পাবলিক ফিড দেখুন" },
        { href: "/model-test/leaderboard", label: "Global Leaderboard" },
      ],
    },
    {
      title: "প্যাকেজ ও পেমেন্ট",
      icon: "👑",
      open: pendingPayments > 0,
      links: [
        {
          href: "/admin/package-requests",
          label: "পেমেন্ট অনুরোধ (Approve/Reject)",
          badge: pendingPayments,
        },
        { href: "/admin/packages", label: "প্যাকেজ ম্যানেজ" },
        { href: "/packages", label: "ছাত্রের প্যাকেজ পেজ দেখুন" },
      ],
    },
    {
      title: "শিক্ষামূলক কনটেন্ট",
      icon: "📚",
      links: [{ href: "/admin/pdf", label: "ম্যাটেরিয়াল / PDF যোগ করুন" }],
    },
    {
      title: "সাইট ঘুরে দেখুন",
      icon: "🌐",
      links: [
        { href: "/", label: "হোম পেজ" },
        { href: "/exam", label: "Instant Exam (/exam)" },
        { href: "/tests", label: "Practice Test (/tests)" },
        { href: "/profile", label: "প্রোফাইল ড্যাশবোর্ড" },
      ],
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">অ্যাডমিন ড্যাশবোর্ড</h1>
        <Link
          href="/admin/overview"
          className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700"
        >
          পরিসংখ্যান / Overview →
        </Link>
      </div>
      {/* 🔔 পেন্ডিং পেমেন্ট সতর্কতা */}
      {pendingPayments > 0 && (
        <Link
          href="/admin/package-requests"
          className="flex items-center justify-between rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          <span>⏳ {pendingPayments} টি পেমেন্ট অনুরোধ যাচাইয়ের অপেক্ষায়</span>
          <span className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white">
            দেখুন →
          </span>
        </Link>
      )}

      {/* 🎛 কন্ট্রোল প্যানেল */}
      <section className={card}>
        <h2 className="mb-3 text-lg font-bold">🎛 কন্ট্রোল প্যানেল</h2>
        <div className="grid gap-2">
          {groups.map((g) => {
            const groupBadge = g.links.reduce((s, l) => s + (l.badge ?? 0), 0);
            return (
              <details
                key={g.title}
                open={g.open}
                className="group rounded-xl border border-slate-200 bg-slate-50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{g.icon}</span>
                    {g.title}
                    {groupBadge > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                        {groupBadge}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={18}
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2">
                  {g.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800"
                    >
                      <span>{l.label}</span>
                      {l.badge ? (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                          {l.badge}
                        </span>
                      ) : (
                        <span className="text-slate-400">→</span>
                      )}
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* 🎯 এআই জেনারেটর */}
      <AdminAIGenerator />
    </div>
  );
}

// ===== ফাইল শেষ =====
