import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { submissionPage } from "@/lib/ready-submissions";
import { readyPaperCatalog } from "@/lib/ready-paper-catalog";
import ReadyUpload from "@/components/ready-papers/admin-upload";
import Submissions from "@/components/ready-papers/submissions";
import "@/components/ready-papers/ready.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "নিজের PDF থেকে প্রশ্নপত্র বানান",
  robots: { index: false },
};
export default async function OwnPDF({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/ready-papers/upload");
  const cursor = (await searchParams).cursor;
  const { papers, nextCursor } = await submissionPage(session.user.id, cursor);
  return (
    <main className="rp-root">
      <section className="rp-hero">
        <span>YOUR PDF · READY PAPER STUDIO</span>
        <h1>নিজের PDF থেকে প্রশ্নপত্র বানান</h1>
        <p>Upload → পৃষ্ঠা বাছুন → মূল্য নিশ্চিত করুন → Setup ও Print</p>
        <p>
          প্রতি ১–৩ পৃষ্ঠা ৳৫ · মাসিক ৳৯৯-এ ৩০ ইউনিট। বর্তমান balance ও package
          একইভাবে প্রযোজ্য।
        </p>
        <div className="rp-tabs">
          <Link href="/ready-papers">← সবার লাইব্রেরি</Link>
          <Link href="/ready-papers/saved">আমার কেনা প্রশ্নপত্র</Link>
        </div>
      </section>
      <p className="rp-upload-notice">
        অনুমোদনের আগে সাইটে শুধু আপনি ও অ্যাডমিন PDF দেখতে পারবেন। বর্তমান storage
        public-link ভিত্তিক—মূল ফাইলের সরাসরি লিংক জানলে সেটি খোলা যায়; গোপন বা
        ব্যক্তিগত তথ্যের নথি আপলোড করবেন না।
      </p>
      <ReadyUpload
        papers={[]}
        catalog={readyPaperCatalog}
        storageReady={!!process.env.BLOB_READ_WRITE_TOKEN?.trim()}
        userMode
      />
      <Submissions papers={papers} catalog={readyPaperCatalog} />
      <nav className="rp-toolbar" aria-label="আমার আপলোডের পৃষ্ঠা">
        {cursor && <Link href="/ready-papers/upload">প্রথম পৃষ্ঠায় ফিরুন</Link>}
        {nextCursor && (
          <Link
            href={`/ready-papers/upload?cursor=${encodeURIComponent(nextCursor)}`}
          >
            আরও আপলোড দেখুন →
          </Link>
        )}
      </nav>
    </main>
  );
}
