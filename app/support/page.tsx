import Link from "next/link";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supportTicketPage } from "@/lib/support-ticket-data";
import { supportKinds } from "@/lib/support-tickets";
import { NewSupportTicket } from "@/components/support-ticket-forms";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "নিজের সহায়তার অনুরোধ",
  robots: { index: false, follow: false },
};
export default async function Support({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  if (!(await auth())?.user?.id) redirect("/login?next=/support");
  const { tickets, next, invalid } = await supportTicketPage(
    (await searchParams).after,
  );
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-5">
      <Link href="/contact-us">← যোগাযোগ</Link>
      <h1 className="text-2xl font-bold">সহায়তা ও ব্যক্তিগত অনুরোধ</h1>
      <p>
        এখানকার অনুরোধ প্রকাশ্য পোস্ট নয়; আপনি ও দায়িত্বপ্রাপ্ত অ্যাডমিন দেখতে পারেন।
        উত্তর এই পাতায় দেখুন—ইমেইল/SMS notification নেই, নির্দিষ্ট সময়ে উত্তরের
        নিশ্চয়তাও নেই। দিনে সর্বোচ্চ ৫টি নতুন অনুরোধ করা যায়।
      </p>
      <p>
        কেনা প্রশ্নপত্রের অভিযোগ/রিফান্ডের জন্য{" "}
        <Link className="underline" href="/dashboard/library">
          কেনা কপির লাইব্রেরি
        </Link>{" "}
        ব্যবহার করুন। এখানে অনুরোধ দিলেই টাকা ফেরত, account deletion বা copyright
        takedown হয় না। Password/PIN/OTP বা অপ্রয়োজনীয় পরিচয়পত্র দেবেন না।
      </p>
      <NewSupportTicket id={randomUUID()} />
      <h2 className="text-xl font-bold">নিজের অনুরোধ ও উত্তর</h2>
      <p>
        অনুরোধ নম্বর অনুযায়ী তালিকা। আরও ব্যাখ্যা দরকার হলে নতুন অনুরোধে আগের নম্বর
        উল্লেখ করুন।
      </p>
      {invalid > 0 && <p role="alert">কিছু রেকর্ড যাচাই হয়নি।</p>}
      {!tickets.length && <p>এই পাতায় কোনো অনুরোধ নেই।</p>}
      {tickets.map((t) => (
        <article
          key={t.id}
          className="border rounded-xl p-4 space-y-2 break-words"
        >
          <h3 className="font-bold">{t.title}</h3>
          <p>
            {supportKinds[t.kind]} ·{" "}
            {t.status === "OPEN" ? "যাচাই অপেক্ষমাণ / চলছে" : "উত্তর দিয়ে বন্ধ"}
          </p>
          <p className="text-sm">
            নম্বর: {t.id} · {t.updatedAt}
          </p>
          <p className="whitespace-pre-wrap">{t.message}</p>
          {t.reply && (
            <div className="border-t pt-3">
              <h4 className="font-bold">অ্যাডমিনের উত্তর</h4>
              <p className="whitespace-pre-wrap">{t.reply}</p>
            </div>
          )}
        </article>
      ))}
      {next && (
        <Link className="underline" href={`/support?after=${next}`}>
          আরও অনুরোধ →
        </Link>
      )}
    </main>
  );
}
