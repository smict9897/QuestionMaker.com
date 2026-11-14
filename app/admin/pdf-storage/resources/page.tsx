import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { retirementKey, retirementSchema } from "@/lib/resource-retirement";
import { privateResourceMarker } from "@/lib/resource-vault";
import ResourceVaultMigration, {
  RetireResourceOriginal,
} from "@/components/resource-vault-migration";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = {
  title: "পেইড PDF migration",
  robots: { index: false, follow: false },
};
export default async function Resources({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const actor = (await auth())?.user?.id;
  if (!actor) redirect("/login?next=/admin/pdf-storage/resources");
  if (
    (await db.user.findUnique({ where: { id: actor }, select: { role: true } }))
      ?.role !== "ADMIN"
  )
    redirect("/dashboard");
  const raw = (await searchParams).after,
    after = raw && /^[a-zA-Z0-9_-]{1,100}$/.test(raw) ? raw : undefined;
  const source = await db.resource.findMany({
      where: {
        priceBdt: { gt: 0 },
        category: { not: "Video" },
        ...(after ? { id: { gt: after } } : {}),
      },
      orderBy: { id: "asc" },
      take: 26,
    }),
    rows = source.slice(0, 25);
  const auditRows = rows.length
    ? await db.setting.findMany({
        where: {
          key: {
            in: rows.flatMap((r) => [
              retirementKey(r.id),
              `resource-vault:migration:v1:${r.id}`,
            ]),
          },
        },
        take: 50,
      })
    : [];
  const audits = new Map(auditRows.map((r) => [r.key, r.value]));
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-5">
      <Link href="/admin/pdf-storage">← Storage পরীক্ষা</Link>
      <h1 className="text-2xl font-bold">পেইড resource PDF migration</h1>
      <p>
        আগে key backup ও storage diagnostic যাচাই করুন। সর্বোচ্চ ৩ MB/১০০ পৃষ্ঠা; শুধু
        Vercel public Blob PDF। Migration পুরোনো URL revoke করে না। বাহ্যিক
        ভিডিও/লিংক এখানে private হয় না।
      </p>
      {!rows.length && <p>এই পাতায় পেইড PDF নেই।</p>}
      {rows.map((r) => (
        <article key={r.id} className="border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">{r.title}</h2>
          <p>
            ৳{r.priceBdt} · {r.id}
          </p>
          {r.fileUrl === privateResourceMarker(r.id) ? (
            <>
              <p>Download route encrypted কপি ব্যবহার করে।</p>
              {audits.has(`resource-vault:migration:v1:${r.id}`) ? (
                <>
                  <RetirementStatus raw={audits.get(retirementKey(r.id))} />
                  <RetireResourceOriginal id={r.id} />
                </>
              ) : (
                <p>
                  Legacy migration audit নেই; এখানে কোনো পুরোনো object মুছবে না।
                </p>
              )}
            </>
          ) : (
            <ResourceVaultMigration id={r.id} />
          )}
        </article>
      ))}
      {source.length > 25 && (
        <Link
          href={`/admin/pdf-storage/resources?after=${encodeURIComponent(rows[24].id)}`}
        >
          পরের পাতা →
        </Link>
      )}
    </main>
  );
}

function RetirementStatus({ raw }: { raw?: string }) {
  if (!raw) return <p>পুরোনো public object এখনও retirement নথিভুক্ত হয়নি।</p>;
  try {
    const record = retirementSchema.parse(JSON.parse(raw));
    return (
      <p role="status">
        Retirement: {record.status} · {record.updatedAt}। REMOVED মানে provider
        deletion সফল হিসেবে নথিভুক্ত; cache/আগের কপি প্রত্যাহার নয়।
      </p>
    );
  } catch {
    return (
      <p role="alert">Retirement record যাচাই হয়নি; provider অবস্থা তদন্ত করুন।</p>
    );
  }
}
