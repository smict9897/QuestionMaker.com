import { admin } from "@/lib/guard";
import { readyLibrary } from "@/lib/ready-paper-data";
import ReadyUpload from "@/components/ready-papers/admin-upload";
import "@/components/ready-papers/ready.css";
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
      <ReadyUpload papers={papers} />
    </main>
  );
}
