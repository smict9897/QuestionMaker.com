import { createHash } from "node:crypto";
import type { WalletFunds } from "@/lib/wallet-funds";
export const DISPUTE_PREFIX = "market:dispute:v1:";
export type MarketDispute = {
  version: 1;
  buyerId: string;
  paperId: string;
  reason: string;
  status: "OPEN" | "REJECTED" | "REFUNDED";
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  note?: string;
};
export function disputeKey(buyerId: string, paperId: string) {
  return `${DISPUTE_PREFIX}${buyerId}:${paperId}`;
}
export function marketDebitKey(buyerId: string, paperId: string) {
  const operationId = `market-buy:${buyerId}:${paperId}`;
  return `wallet:ledger:v1:${buyerId}:${createHash("sha256").update(operationId).digest("hex")}`;
}
/** Refund never upgrades bonus/recharge/received into withdrawable earnings. */
export function refundSources(
  raw: string,
  buyerId: string,
  paperId: string,
  amount: number,
): WalletFunds {
  const r = JSON.parse(raw),
    sources = ["bonus", "recharge", "received", "earnings"] as const;
  if (
    r.userId !== buyerId ||
    r.operationId !== `market-buy:${buyerId}:${paperId}` ||
    r.direction !== "DEBIT" ||
    r.amount !== amount ||
    !r.used ||
    !sources.every((s) => Number.isSafeInteger(r.used[s]) && r.used[s] >= 0) ||
    sources.reduce((n, s) => n + r.used[s], 0) !== amount
  )
    throw Error("Invalid original debit sources");
  return {
    bonus: r.used.bonus,
    recharge: r.used.recharge,
    received: r.used.received,
    earnings: r.used.earnings,
  };
}
export function parseDispute(key: string, raw: string): MarketDispute {
  const r = JSON.parse(raw) as MarketDispute;
  if (
    !r ||
    r.version !== 1 ||
    typeof r.buyerId !== "string" ||
    !r.buyerId ||
    !/^[a-f0-9]{64}$/.test(r.paperId) ||
    key !== disputeKey(r.buyerId, r.paperId) ||
    typeof r.reason !== "string" ||
    r.reason.length < 10 ||
    r.reason.length > 2000 ||
    !["OPEN", "REJECTED", "REFUNDED"].includes(r.status) ||
    !Number.isFinite(Date.parse(r.createdAt))
  )
    throw Error("Invalid dispute");
  return r;
}
