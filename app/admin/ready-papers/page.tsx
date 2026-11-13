import Submissions from "@/components/ready-papers/submissions";
import { submissionPage } from "@/lib/ready-submissions";
import { readyAIConfigured } from "@/lib/ready-ai-config";
import { admin } from "@/lib/guard";
import { readyLibrary } from "@/lib/ready-paper-data";
import ReadyUpload from "@/components/ready-papers/admin-upload";
import "@/components/ready-papers/ready.css";
import { readyPaperCatalog } from "@/lib/ready-paper-catalog";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export default async function ReadyAdmin({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  await admin();
  const cursor = (await searchParams).cursor;
  const [papers, submitted] = await Promise.all([
    readyLibrary(true, true),
    submissionPage(undefined, cursor),
  ]);
  return (
    <main className="rp-root">
      <h1>রেডি প্রশ্নপত্র · Admin</h1>
      <p>
        মূল PDF অপরিবর্তিত থাকে। Preset save করার আগে প্রতিটি page preview দেখুন।
      </p>
      {!readyAIConfigured() && (
        <section className="rp-panel" role="alert">
          <h2>DeepSeek সংযোগ বাকি</h2>
          <p>
            Vercel-এ DEEPSEEK_API_KEY যুক্ত করে redeploy করুন। OCR ব্রাউজারে চলে;
            Gemini বা আলাদা OCR hosting লাগে না। Key চ্যাটে দেবেন না।
          </p>
        </section>
      )}
      <Submissions
        papers={submitted.papers}
        catalog={readyPaperCatalog}
        admin
      />
      <nav className="rp-toolbar" aria-label="জমার তালিকার পৃষ্ঠা">
        {cursor && <a href="/admin/ready-papers">প্রথম পৃষ্ঠায় ফিরুন</a>}
        {submitted.nextCursor && (
          <a
            href={`/admin/ready-papers?cursor=${encodeURIComponent(submitted.nextCursor)}`}
          >
            আরও জমা দেখুন →
          </a>
        )}
      </nav>
      <ReadyUpload
        papers={papers.filter((p) => !p.ownerId)}
        catalog={readyPaperCatalog}
        storageReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())}
      />
    </main>
  );
}
