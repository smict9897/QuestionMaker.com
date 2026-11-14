import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { purchaseKey, validatePurchase } from "@/lib/marketplace-purchase";
import MarketplacePaperPreview from "@/components/marketplace-paper-preview";
import { PurchasedInstitution } from "@/components/marketplace-purchase";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "আমার কেনা স্থির কপি",
  robots: { index: false, follow: false },
};
export default async function PurchasedPaper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) notFound();
  const buyerId = (await auth())?.user?.id;
  if (!buyerId) redirect(`/login?next=/dashboard/library/${id}`);
  if (
    !(await db.user.findUnique({
      where: { id: buyerId },
      select: { id: true },
    }))
  )
    notFound();
  const row = await db.setting.findUnique({
    where: { key: purchaseKey(buyerId, id) },
  });
  if (!row) notFound();
  let r;
  try {
    r = validatePurchase(row.value, buyerId, id);
  } catch {
    notFound();
  }
  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4">
      <div data-noprint className="space-y-3">
        <Link href="/dashboard/library">← কেনা প্রশ্নপত্র</Link>
        <Link
          className="block underline"
          href={`/dashboard/library/${id}/report`}
        >
          সমস্যা জানান / অভিযোগের অবস্থা →
        </Link>
        <h1 className="text-2xl font-bold">{r.title}</h1>
        <p>
          আপনার কেনা অপরিবর্তনীয় কপি · সংস্করণ {r.revision}। বর্তমান বিক্রির তালিকা
          বদলালেও এই কপি থাকবে।
        </p>
      </div>
      <PurchasedInstitution id={id} institution={r.institution} />
      <MarketplacePaperPreview
        snapshot={r.snapshot}
        institution={r.institution}
      />
    </main>
  );
}
