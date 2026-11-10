export type PaymentValidation = { status: string; tran_id: string; amount: string; currency: string };

export function isVerifiedPayment(value: PaymentValidation | null, transactionId: string, amount: number): boolean {
  return !!value && (value.status === "VALID" || value.status === "VALIDATED") &&
    value.tran_id === transactionId && value.currency === "BDT" &&
    value.amount.trim() !== "" && Number.isFinite(Number(value.amount)) && Number(value.amount) === amount;
}
