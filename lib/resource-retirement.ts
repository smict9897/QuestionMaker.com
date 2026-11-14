import "server-only";
import { randomUUID } from "node:crypto";
import { del } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { pdfDigest, trustedBlobUrl } from "@/lib/pdf-vault";
import {
  readPrivateResource,
  parseResourceVault,
  resourceVaultKey,
  privateResourceMarker,
} from "@/lib/resource-vault";
import { lockResourceSource } from "@/lib/resource-source";
export const retirementKey = (id: string) => `resource-retirement:v1:${id}`;
export const retirementSchema = z
  .object({
    version: z.literal(1),
    resourceId: z.string().min(1).max(100),
    sourceUrl: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    operationId: z.string().uuid(),
    actorId: z.string().min(1),
    status: z.enum(["PENDING", "REMOVED", "UNKNOWN"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
/** Two-phase external operation: persist intent/tombstone first; never roll back a deletion into a false 'not attempted' state. */
export async function retireResourceOriginal(actorId: string, id: string) {
  if (!id || id.length > 100) throw Error("Invalid identity");
  // Existing delivery proves decryptable archived bytes, but still require a fresh ADMIN before destructive work.
  const admin = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") throw Error("Forbidden");
  const archived = await readPrivateResource(actorId, id),
    sha256 = pdfDigest(archived),
    key = retirementKey(id),
    migrationKey = `resource-vault:migration:v1:${id}`;
  const prepared = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${resourceVaultKey(id)}))`;
    if (
      (
        await tx.user.findUnique({
          where: { id: actorId },
          select: { role: true },
        })
      )?.role !== "ADMIN"
    )
      throw Error("Forbidden");
    const resource = await tx.resource.findUnique({ where: { id } }),
      manifest = await tx.setting.findUnique({
        where: { key: resourceVaultKey(id) },
      }),
      migration = await tx.setting.findUnique({ where: { key: migrationKey } });
    if (
      !resource ||
      resource.fileUrl !== privateResourceMarker(id) ||
      !manifest ||
      !migration
    )
      throw Error("Unverified migration");
    const m = parseResourceVault(manifest.value, id),
      audit = JSON.parse(migration.value);
    if (
      audit.version !== 1 ||
      audit.sourceSha256 !== sha256 ||
      m.sha256 !== sha256 ||
      typeof audit.sourceUrl !== "string"
    )
      throw Error("Source mismatch");
    const sourceUrl = trustedBlobUrl(audit.sourceUrl);
    if (
      sourceUrl !== audit.sourceUrl ||
      !new URL(sourceUrl).pathname.startsWith("/notes/")
    )
      throw Error("Only canonical legacy notes uploads supported");
    const tombstone = await lockResourceSource(tx, sourceUrl),
      previous = await tx.setting.findUnique({ where: { key } }),
      old = previous
        ? retirementSchema.parse(JSON.parse(previous.value))
        : null;
    if (
      old &&
      (old.resourceId !== id ||
        old.sourceUrl !== sourceUrl ||
        old.sha256 !== sha256)
    )
      throw Error("Retirement mismatch");
    if (old?.status === "REMOVED") return { record: old, done: true };
    if (
      old?.status === "PENDING" &&
      Date.now() - Date.parse(old.updatedAt) < 300000
    )
      throw Error("Operation in progress; inspect after five minutes");
    const shared = await tx.resource.findFirst({
      where: {
        fileUrl: { equals: sourceUrl, mode: "insensitive" },
        id: { not: id },
      },
      select: { id: true },
    });
    const setting = await tx.setting.findFirst({
      where: {
        value: { contains: sourceUrl, mode: "insensitive" },
        NOT: { key: { in: [key, migrationKey] } },
      },
      select: { key: true },
    });
    if (shared || setting)
      throw Error("Shared reference; manual investigation required");
    const marker = await tx.setting.findUnique({ where: { key: tombstone } });
    if (marker && JSON.parse(marker.value).resourceId !== id)
      throw Error("Another resource owns retirement");
    const now = new Date().toISOString(),
      record = retirementSchema.parse({
        version: 1,
        resourceId: id,
        sourceUrl,
        sha256,
        operationId: randomUUID(),
        actorId,
        status: "PENDING",
        createdAt: old?.createdAt || now,
        updatedAt: now,
      });
    if (!marker)
      await tx.setting.create({
        data: {
          key: tombstone,
          value: JSON.stringify({ version: 1, resourceId: id, at: now }),
        },
      });
    if (previous)
      await tx.setting.update({
        where: { key },
        data: { value: JSON.stringify(record) },
      });
    else
      await tx.setting.create({ data: { key, value: JSON.stringify(record) } });
    await tx.setting.create({
      data: {
        key: `resource-retirement-attempt:v1:${id}:${record.operationId}:START`,
        value: JSON.stringify({ actorId, sha256, at: now, status: "PENDING" }),
      },
    });
    return { record, done: false };
  });
  if (prepared.done) return "REMOVED" as const;
  let status: "REMOVED" | "UNKNOWN" = "UNKNOWN";
  try {
    await del(prepared.record.sourceUrl);
    status = "REMOVED";
  } catch {
    /* Provider failure may be ambiguous; keep intent and tombstone. */
  }
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${resourceVaultKey(id)}))`;
    const row = await tx.setting.findUnique({ where: { key } }),
      current = row && retirementSchema.parse(JSON.parse(row.value));
    if (
      !current ||
      current.operationId !== prepared.record.operationId ||
      current.status !== "PENDING"
    )
      throw Error("Operation changed; investigate provider state");
    const now = new Date().toISOString();
    await tx.setting.update({
      where: { key },
      data: { value: JSON.stringify({ ...current, status, updatedAt: now }) },
    });
    await tx.setting.create({
      data: {
        key: `resource-retirement-attempt:v1:${id}:${current.operationId}:RESULT`,
        value: JSON.stringify({ actorId, sha256, status, at: now }),
      },
    });
    if (status === "REMOVED") {
      const migration = await tx.setting.findUnique({
        where: { key: migrationKey },
      });
      if (!migration) throw Error("Missing audit");
      const audit = JSON.parse(migration.value);
      if (
        audit.sourceUrl !== current.sourceUrl ||
        audit.sourceSha256 !== sha256
      )
        throw Error("Audit changed");
      await tx.setting.update({
        where: { key: migrationKey },
        data: {
          value: JSON.stringify({
            ...audit,
            originalRetired: true,
            retiredBy: actorId,
            retiredAt: now,
          }),
        },
      });
    }
  });
  return status;
}
