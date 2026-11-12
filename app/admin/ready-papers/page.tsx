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
      {!process.env.GEMINI_API_KEY?.trim() && (
        <section className="rp-panel" role="alert">
          <h2>স্বয়ংক্রিয় AI উত্তরের vision সংযোগ বাকি</h2>
          <p>
            এই প্রজেক্টের Vercel Environment Variables-এ GEMINI_API_KEY
            (Production/Preview) যুক্ত করে redeploy করুন। Key চ্যাটে বা source
            code-এ দেবেন না। DeepSeek text key স্ক্যান/PDF পড়তে পারে না।
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
