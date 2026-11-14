import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { vaultConfigured } from "@/lib/pdf-vault";
import PdfVaultCheck from "@/components/pdf-vault-check";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = {
  title: "PDF storage প্রস্তুতি",
  robots: { index: false, follow: false },
};
export default async function PdfStorage() {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/login?next=/admin/pdf-storage");
  if (
    (await db.user.findUnique({ where: { id }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const configured = vaultConfigured();
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-5">
      <Link href="/admin">← অ্যাডমিন</Link>
      <h1 className="text-2xl font-bold">PDF storage প্রস্তুতি ও পরীক্ষা</h1>
      <p role="status">
        {configured
          ? "এই deployment-এ keyring ও Blob token-এর বিন্যাস পাওয়া গেছে। সংযোগ এখনও এই তথ্য দিয়ে প্রমাণিত নয়।"
          : "এই deployment-এ প্রয়োজনীয় keyring/Blob configuration অনুপস্থিত বা অবৈধ। সুরক্ষিত উৎস-কপির সুবিধা প্রস্তুত নয়।"}
      </p>
      <p>
        Server-only PDF_VAULT_KEYS ও PDF_VAULT_ACTIVE_KEY এবং সংশ্লিষ্ট Blob token
        নিরাপদে provision করতে হবে। এখানে secret লেখা, দেখানো বা পরিবর্তন করা হয়
        না। পুরোনো decrypt key সরাবেন না; নিরাপদ key backup ছাড়া production চালু
        করবেন না।
      </p>
      {configured && <PdfVaultCheck />}
      <p>
        পরীক্ষা সফল হলেও এটি selected-source checkpoint-এর storage roundtrip
        মাত্র। চূড়ান্ত edited PDF export, marketplace বিক্রি, ক্রেতার সীমিত edit,
        refund, key backup/rotation ও বাস্তব mobile/print প্রবাহ আলাদাভাবে পরীক্ষা
        করতে হবে। আগের public PDF লিংকগুলো private হয়ে যায় না।
      </p>
      <p>
        পরীক্ষায় ব্যক্তিগত তথ্যবিহীন ছোট PDF ব্যবহার হয়; সর্বোচ্চ প্রতি ৬০ সেকেন্ডে
        একবার। ফলের audit private database-এ থাকে। Cleanup ব্যর্থ হলে সেখানে
        নথিভুক্ত test ciphertext অবস্থান ধরে operator-কে মুছতে হবে।
      </p>
    </main>
  );
}
