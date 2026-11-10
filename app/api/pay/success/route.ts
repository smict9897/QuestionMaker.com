import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isVerifiedPayment } from "@/lib/payment-validation";
import { validate } from "@/lib/ssl";
export async function POST(req: Request) {
  const fd = await req.formData(), base = process.env.SITE_URL!;
  const tran = String(fd.get("tran_id") ?? ""), p = await db.purchase.findUnique({ where: { id: tran } });
  if (!p) return NextResponse.redirect(`${base}/`, 303);
  if (p.status === "PAID") return NextResponse.redirect(`${base}/api/download/${p.resourceId}`, 303);
  const v = await validate(String(fd.get("val_id") ?? ""));
  const ok = isVerifiedPayment(v, tran, p.amount);
  // Invalid callbacks cannot change payment state. A verified callback may recover a failed/cancelled payment.
  if (ok) await db.purchase.updateMany({ where: { id: tran, status: { not: "PAID" } }, data: { status: "PAID" } });
  return NextResponse.redirect(ok ? `${base}/api/download/${p.resourceId}` : `${base}/library?error=payment`, 303);
}
