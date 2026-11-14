export type Withdrawal = {
  version: 1;
  id: string;
  userId: string;
  amount: number;
  number: string;
  status: "HELD" | "PAID" | "REJECTED";
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  trx?: string;
  note?: string;
  claimedBy?: string;
  claimedAt?: string;
};
/** Legacy pending records without a claim remain valid, but must be claimed before review. */
export function parseWithdrawal(key: string, raw: string): Withdrawal {
  const r = JSON.parse(raw) as Withdrawal;
  if (
    !r ||
    r.version !== 1 ||
    typeof r.userId !== "string" ||
    !r.userId ||
    typeof r.id !== "string" ||
    !/^[a-f0-9-]{36}$/.test(r.id) ||
    key !== `wallet:withdrawal:v1:${r.userId}:${r.id}` ||
    !Number.isSafeInteger(r.amount) ||
    r.amount < 10000 ||
    r.amount > 5000000 ||
    !/^01[3-9]\d{8}$/.test(r.number) ||
    !["HELD", "PAID", "REJECTED"].includes(r.status) ||
    typeof r.createdAt !== "string" ||
    !Number.isFinite(Date.parse(r.createdAt)) ||
    ((r.claimedBy !== undefined || r.claimedAt !== undefined) &&
      (typeof r.claimedBy !== "string" ||
        !r.claimedBy ||
        typeof r.claimedAt !== "string" ||
        !Number.isFinite(Date.parse(r.claimedAt))))
  )
    throw Error("Invalid withdrawal record");
  return r;
}

export function assertWithdrawalClaim(
  raw: string | undefined,
  key: string,
  r: Withdrawal,
) {
  const c = JSON.parse(raw || "null");
  if (
    !c ||
    c.version !== 1 ||
    c.requestKey !== key ||
    c.reviewerId !== r.claimedBy ||
    c.claimedAt !== r.claimedAt ||
    c.amount !== r.amount ||
    c.number !== r.number
  )
    throw Error("Withdrawal claim audit mismatch");
}
