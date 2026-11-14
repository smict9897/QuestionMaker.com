import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
export function resourceSourceKey(url: string) {
  return `resource-source-retired:v1:${createHash("sha256").update(new URL(url).href).digest("hex")}`;
}
export async function lockResourceSource(
  tx: Prisma.TransactionClient,
  url: string,
) {
  const key = resourceSourceKey(url);
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${key}))`;
  return key;
}
/** All application-created external resource references share the retirement lock. */
export async function assertResourceSourceAvailable(
  tx: Prisma.TransactionClient,
  url: string,
) {
  const key = await lockResourceSource(tx, url);
  if (await tx.setting.findUnique({ where: { key } }))
    throw Error("Source is retired or retirement is pending; use a new file");
}
