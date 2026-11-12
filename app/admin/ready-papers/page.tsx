import { readyAIConfigured } from "@/lib/ready-ai-config";
import { admin } from "@/lib/guard";
import { readyLibrary } from "@/lib/ready-paper-data";
import ReadyUpload from "@/components/ready-papers/admin-upload";
import "@/components/ready-papers/ready.css";
import { readyPaperCatalog } from "@/lib/ready-paper-catalog";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export default async function ReadyAdmin() {
  await admin();
  const papers = await readyLibrary(true);
  return (
    <main className="rp-root">
      <h1>রেডি প্রশ্নপত্র · Admin</h1>
      <p>
        মূল PDF অপরিবর্তিত থাকে। Preset save করার আগে প্রতিটি page preview দেখুন।
      </p>
      {!readyAIConfigured() && (
        <section className="rp-panel" role="alert">
          <h2>স্বয়ংক্রিয় AI উত্তরের OCR সংযোগ বাকি</h2>
          <p>
            এই প্রজেক্টের Vercel Environment Variables-এ READY_OCR_URL ও
            READY_OCR_TOKEN (Production/Preview) যুক্ত করে redeploy করুন। Key চ্যাটে
            বা source code-এ দেবেন না। DeepSeek উত্তর তৈরি করবে; আলাদা OCR সার্ভিস
            PDF-এর লেখা পড়বে। DEEPSEEK_API_KEY-ও প্রয়োজন।
          </p>
        </section>
      )}
      <ReadyUpload
        papers={papers}
        catalog={readyPaperCatalog}
        storageReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())}
      />
    </main>
  );
}
