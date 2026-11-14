import type { Prisma } from "@prisma/client";
export const WALLET_LIMITS_KEY = "wallet:limits:v1";
export type WalletLimits = {
  version: 1;
  revision: number;
  transferDaily: number;
  recipientLookups: number;
  withdrawalMax: number;
  updatedBy?: string;
  updatedAt?: string;
};
export const DEFAULT_WALLET_LIMITS: WalletLimits = {
  version: 1,
  revision: 0,
  transferDaily: 500000,
  recipientLookups: 30,
  withdrawalMax: 5000000,
};
export function parseWalletLimits(raw: string | null): WalletLimits {
  if (raw === null) return { ...DEFAULT_WALLET_LIMITS };
  const r = JSON.parse(raw);
  if (
    !r ||
    r.version !== 1 ||
    !Number.isSafeInteger(r.revision) ||
    r.revision < 1 ||
    !Number.isSafeInteger(r.transferDaily) ||
    r.transferDaily < 100 ||
    r.transferDaily > 5000000 ||
    !Number.isSafeInteger(r.recipientLookups) ||
    r.recipientLookups < 1 ||
    r.recipientLookups > 100 ||
    !Number.isSafeInteger(r.withdrawalMax) ||
    r.withdrawalMax < 10000 ||
    r.withdrawalMax > 5000000 ||
    typeof r.updatedBy !== "string" ||
    !r.updatedBy ||
    typeof r.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(r.updatedAt))
  )
    throw Error("Invalid wallet limits; financial requests blocked");
  return {
    version: 1,
    revision: r.revision,
    transferDaily: r.transferDaily,
    recipientLookups: r.recipientLookups,
    withdrawalMax: r.withdrawalMax,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt,
  };
}
export async function readWalletLimits(
  tx: Pick<Prisma.TransactionClient, "setting">,
) {
  const row = await tx.setting.findUnique({
    where: { key: WALLET_LIMITS_KEY },
  });
  return parseWalletLimits(row ? row.value : null);
}
export function limitMoney(raw: unknown, min: number, max: number) {
  if (typeof raw !== "string" || !/^\d{1,5}(\.\d{1,2})?$/.test(raw.trim()))
    throw Error("Invalid limit amount");
  const [whole, fraction = ""] = raw.trim().split("."),
    n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (n < min || n > max) throw Error("Limit out of range");
  return n;
}
