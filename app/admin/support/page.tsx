import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { supportTicketPage } from "@/lib/support-ticket-data";
import { supportKinds } from "@/lib/support-tickets";
import { SupportReview } from "@/components/support-ticket-forms";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "সহায়তার অনুরোধ যাচাই",
  robots: { index: false, follow: false },
};
export default async function AdminSupport({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/support");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const { tickets, next, invalid } = await supportTicketPage(
    (await searchParams).after,
    true,
  );
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">সহায়তা / গোপনীয়তা / কপিরাইট অনুরোধ</h1>
      <p>
        ব্যক্তিগত তথ্য প্রকাশ করবেন না। উত্তর/বন্ধ করা নিজে কোনো রিফান্ড, account
        deletion বা takedown ঘটায় না। প্রয়োজনীয় কাজ সংশ্লিষ্ট যাচাইকৃত ব্যবস্থায়
        আলাদাভাবে করুন। এখানে email/SMS notification পাঠানো হয় না। তালিকা অনুরোধ
        নম্বর অনুযায়ী।
      </p>
      {invalid > 0 && <p role="alert">কিছু রেকর্ড যাচাই হয়নি।</p>}
      {!tickets.length && <p>এই পাতায় অনুরোধ নেই।</p>}
      {tickets.map((t) => (
        <article
          key={t.id}
          className="border rounded-xl p-4 space-y-3 break-words"
        >
          <h2 className="font-bold">{t.title}</h2>
          <p>
            {supportKinds[t.kind]} · {t.status} · revision {t.revision}
          </p>
          <p>
            নম্বর: {t.id} · ব্যবহারকারী: {t.ownerId}
          </p>
          <p className="whitespace-pre-wrap">{t.message}</p>
          {t.reply && (
            <p className="whitespace-pre-wrap">আগের উত্তর: {t.reply}</p>
          )}
          <SupportReview key={t.revision} id={t.id} revision={t.revision} />
        </article>
      ))}
      {next && <Link href={`/admin/support?after=${next}`}>আরও অনুরোধ →</Link>}
    </main>
  );
}
