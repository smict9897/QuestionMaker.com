// প্রশ্নোদয় — ড্যাশবোর্ড পেজ (রোল অনুযায়ী শিক্ষক / শিক্ষার্থীর আলাদা দৃশ্য)
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { getSite } from "@/lib/site";
import TeacherOnboarding from "@/components/teacher-onboarding";
import DashShell from "@/components/proshnoday/dashboard/dash-shell";
import DashHome, { type DashPost } from "@/components/proshnoday/dashboard/dash-home";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ড্যাশবোর্ড", robots: { index: false } };

async function logout() {
  "use server";
  await signOut({ redirectTo: "/" });
}

function greeting() {
  const h =
    Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(new Date())
    ) % 24;
  if (h >= 5 && h < 12) return "সুপ্রভাত,";
  if (h >= 12 && h < 16) return "শুভ দুপুর,";
  if (h >= 16 && h < 18) return "শুভ অপরাহ্ন,";
  if (h >= 18 && h < 20) return "শুভ সন্ধ্যা,";
  return "শুভ রাত্রি,";
}

async function loadPosts(): Promise<DashPost[]> {
  try {
    const rows = await db.post.findMany({
      where: { published: true, NOT: { category: { slug: "news" } } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { category: true },
    });
    return rows.map((p) => ({
      id: String(p.id),
      slug: p.slug ?? null,
      title: p.title,
      category: p.category?.name ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ skip?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login?next=/dashboard");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "64px 16px", textAlign: "center" }}>
        <p>অ্যাকাউন্ট পাওয়া যায়নি। লগআউট করে আবার ঢুকুন।</p>
        <form action={logout} style={{ marginTop: 16 }}>
          <button
            type="submit"
            style={{ background: "#1e293b", color: "#fff", borderRadius: 12, padding: "8px 16px" }}
          >
            লগআউট
          </button>
        </form>
      </main>
    );
  }

  // রোল: আগে ডাটাবেস, না পেলে সেশন, না পেলে শিক্ষার্থী
  const dbRole = (user as unknown as { role?: unknown }).role;
  const sessionRole = (session?.user as unknown as { role?: string } | undefined)?.role;
  const raw = String(dbRole ?? sessionRole ?? "STUDENT").toUpperCase();
  const role = raw === "ADMIN" || raw === "TEACHER" ? raw : "STUDENT";
  const teacherLike = role === "TEACHER" || role === "ADMIN";

  const [profile, bankCount, posts] = await Promise.all([
    db.teacherProfile.findUnique({ where: { userId: user.id } }).catch(() => null),
    db.question.count({ where: { approved: true } }).catch(() => 0),
    role === "STUDENT" ? loadPosts() : Promise.resolve<DashPost[]>([]),
  ]);

  // প্রোফাইল ফর্ম: শিক্ষকের জন্য প্রথমবার নিজে থেকে, শিক্ষক/অ্যাডমিনের জন্য সেটিংস থেকে (?edit=1)
  const autoForm = role === "TEACHER" && !profile && sp.skip !== "1";
  const editForm = teacherLike && sp.edit === "1";
  if (autoForm || editForm) {
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
  }

  const site = await getSite();
  const name = user.name ?? session?.user?.name ?? "";

  return (
    <DashShell role={role} name={name} siteName={site.siteName} active="home">
      <DashHome role={role} greet={greeting()} questionCount={bankCount} posts={posts} />
    </DashShell>
  );
}

// ===== ফাইল শেষ =====
