import { db } from "@/lib/db";
import { ensureWallet } from "@/lib/wallet";
import { englishOwnerPrefix } from "@/lib/english/draft";
export async function workspaceSummary(userId: string) {
  const [wallet, packagePurchase, saved, english, purchased] =
    await Promise.all([
      ensureWallet(userId).catch(() => null),
      db.packagePurchase
        .findFirst({
          where: { userId, status: "APPROVED", expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "desc" },
          include: { package: true },
        })
        .catch(() => undefined),
      db.setting
        .count({ where: { key: { startsWith: `qbpaper:${userId}:` } } })
        .catch(() => null),
      db.setting
        .count({ where: { key: { startsWith: englishOwnerPrefix(userId) } } })
        .catch(() => null),
      db.setting
        .count({ where: { key: { startsWith: `wallet:question:${userId}:` } } })
        .catch(() => null),
    ]);
  return { wallet, packagePurchase, saved, english, purchased };
}
export function safeWalletRecord(value: string) {
  try {
    const r = JSON.parse(value);
    return r && typeof r === "object" && !Array.isArray(r) ? r : null;
  } catch {
    return null;
  }
}
export function displayDate(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    return "—";
  return new Intl.DateTimeFormat("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}
