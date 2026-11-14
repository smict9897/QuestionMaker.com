export type FundSource = "bonus" | "recharge" | "earnings" | "received";
export type WalletFunds = Record<FundSource, number>;
export type FundWallet = {
  version: 2;
  balance: number;
  bonus: number;
  funds: WalletFunds;
};
const sources: FundSource[] = ["bonus", "recharge", "earnings", "received"];
const valid = (n: unknown): n is number =>
  Number.isSafeInteger(n) && Number(n) >= 0;
export function normalizeWallet(raw: unknown): FundWallet {
  if (!raw || typeof raw !== "object") throw new Error("Invalid wallet");
  const w = raw as Partial<FundWallet>;
  if (!valid(w.balance) || !valid(w.bonus)) throw new Error("Invalid balance");
  if (w.version !== undefined && w.version !== 2)
    throw new Error("Unknown wallet version");
  if (w.version === 2) {
    if (
      !w.funds ||
      !sources.every((s) => valid(w.funds![s])) ||
      sources.reduce((sum, s) => sum + w.funds![s], 0) !== w.balance
    )
      throw new Error("Wallet source mismatch");
    return {
      version: 2,
      balance: w.balance,
      bonus: w.bonus,
      funds: { ...w.funds },
    };
  }
  // Old bonus is the historical grant, not its remaining amount. Reserve up to that
  // grant conservatively; never invent withdrawable earnings from legacy balances.
  const bonus = Math.min(w.balance, w.bonus);
  return {
    version: 2,
    balance: w.balance,
    bonus: w.bonus,
    funds: { bonus, recharge: w.balance - bonus, earnings: 0, received: 0 },
  };
}
export function creditFunds(
  raw: FundWallet,
  source: FundSource,
  amount: number,
): FundWallet {
  const wallet = normalizeWallet(raw);
  if (
    !sources.includes(source) ||
    !valid(amount) ||
    amount === 0 ||
    !Number.isSafeInteger(wallet.balance + amount)
  )
    throw new Error("Invalid credit");
  return {
    ...wallet,
    balance: wallet.balance + amount,
    funds: { ...wallet.funds, [source]: wallet.funds[source] + amount },
  };
}
export function debitFunds(
  raw: FundWallet,
  amount: number,
  transfer = false,
  earningsOnly = false,
): { wallet: FundWallet; used: WalletFunds } {
  const wallet = normalizeWallet(raw);
  if (!valid(amount) || amount === 0) throw new Error("Invalid debit");
  const order: FundSource[] = earningsOnly
    ? ["earnings"]
    : transfer
      ? ["recharge", "received", "earnings"]
      : ["bonus", "recharge", "received", "earnings"];
  if (order.reduce((sum, s) => sum + wallet.funds[s], 0) < amount)
    throw new Error("Insufficient eligible balance");
  const funds = { ...wallet.funds },
    used: WalletFunds = { bonus: 0, recharge: 0, earnings: 0, received: 0 };
  let remaining = amount;
  for (const source of order) {
    const part = Math.min(funds[source], remaining);
    funds[source] -= part;
    used[source] = part;
    remaining -= part;
  }
  return {
    wallet: { ...wallet, balance: wallet.balance - amount, funds },
    used,
  };
}
